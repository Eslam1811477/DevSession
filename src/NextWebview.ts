import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { nanoid } from 'nanoid';

type NextWebviewOptions = {
  extensionUri: vscode.Uri;
  route: string;
  title: string;
  viewId: string;
  scriptUri?: vscode.Uri;
  styleUri?: vscode.Uri;
  nonce?: string;
};

type SessionFile = {
  path: string;
  line: number;
  character: number;
};

type DevSession = {
  createdAt: string;
  deviceId: string;
  files: SessionFile[];
};

const SESSION_DIR = '.devsession';
const SESSION_FILE = 'session.json';

export class NextWebviewPanel {
  private static instances: { [id: string]: NextWebviewPanel } = {};
  private readonly panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _autoSaveTimer?: NodeJS.Timeout;
  private extensionContext?: vscode.ExtensionContext;

  public static getInstance(
    opts: NextWebviewOptions & { column?: vscode.ViewColumn },
    context?: vscode.ExtensionContext
  ) {
    let instance = NextWebviewPanel.instances[opts.viewId];
    if (instance) {
      instance.panel.reveal(opts.column);
    } else {
      instance = new NextWebviewPanel(opts);
      instance.extensionContext = context;
      NextWebviewPanel.instances[opts.viewId] = instance;
    }
    return instance;
  }

  private constructor(private opts: NextWebviewOptions & { column?: vscode.ViewColumn }) {
    this.panel = vscode.window.createWebviewPanel(
      opts.route,
      opts.title,
      opts.column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(opts.extensionUri, 'out')],
      }
    );

    this.update();

    this.panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this.panel.webview.onDidReceiveMessage(this.handleMessage.bind(this), this, this._disposables);
  }

  private async handleMessage(message: any) {
    switch (message.type) {
      case 'SAVE_SESSION':
        if (this.extensionContext) await this.saveSession(this.extensionContext);
        break;
      case 'RESTORE_SESSION':
        await this.restoreSession();
        break;
    }
  }

  private async isSessionFileExists(workspace: vscode.WorkspaceFolder): Promise<boolean> {
    const fileUri = vscode.Uri.joinPath(workspace.uri, SESSION_DIR, SESSION_FILE);
    try {
      await vscode.workspace.fs.stat(fileUri);
      return true;
    } catch {
      return false;
    }
  }

  private getDeviceId(context: vscode.ExtensionContext) {
    let id = context.globalState.get<string>('deviceId');
    if (!id) {
      id = nanoid();
      context.globalState.update('deviceId', id);
    }
    return id;
  }

  public async saveSession(context: vscode.ExtensionContext) {
    const workspace = vscode.workspace.workspaceFolders?.[0];
    if (!workspace) return;

    const sessionDir = path.join(workspace.uri.fsPath, SESSION_DIR);
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir);

    const sessionFile = path.join(sessionDir, SESSION_FILE);

    const tabs = vscode.window.tabGroups.all
      .flatMap(group => group.tabs)
      .filter(tab => tab.input instanceof vscode.TabInputText);

    const visibleEditorsMap = new Map(
      vscode.window.visibleTextEditors.map(editor => [editor.document.uri.fsPath, editor])
    );

    const files: SessionFile[] = tabs.map(tab => {
      const input = tab.input as vscode.TabInputText;
      const filePath = input.uri.fsPath;
      const editor = visibleEditorsMap.get(filePath);
      return {
        path: filePath,
        line: editor?.selection.active.line ?? 0,
        character: editor?.selection.active.character ?? 0,
      };
    });

    const deviceId = this.getDeviceId(context);

    const session: DevSession = {
      createdAt: new Date().toISOString(),
      deviceId,
      files,
    };

    fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2));
    this.postStatus(`Session saved (${files.length} files)`);
  }

  public async restoreSession() {
    const workspace = vscode.workspace.workspaceFolders?.[0];
    if (!workspace) return;

    const sessionFile = path.join(workspace.uri.fsPath, SESSION_DIR, SESSION_FILE);
    if (!fs.existsSync(sessionFile)) return;

    const raw = fs.readFileSync(sessionFile, 'utf-8');
    const session: DevSession = JSON.parse(raw);

    for (const file of session.files) {
      try {
        const doc = await vscode.workspace.openTextDocument(file.path);
        const editor = await vscode.window.showTextDocument(doc, { preview: false });
        const pos = new vscode.Position(file.line, file.character);
        editor.selection = new vscode.Selection(pos, pos);
        editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
      } catch {}
    }

    this.postStatus(`Session restored (${session.files.length} files)`);
  }

  private postStatus(status: string) {
    this.panel.webview.postMessage({ type: 'STATUS', payload: status });
  }

  private _getContent(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.opts.extensionUri, 'out/webviews/index.es.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.opts.extensionUri, 'out/webviews/style.css'));
    const nonce = nanoid();

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link href="${styleUri}" rel="stylesheet" />
<title>${this.opts.title}</title>
<script nonce="${nonce}">window.acquireVsCodeApi = acquireVsCodeApi;</script>
</head>
<body>
<div id="root" data-route="${this.opts.route}"></div>
<script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  public update() {
    this.panel.title = this.opts.title;
    this.panel.webview.html = this._getContent(this.panel.webview);
  }

  public dispose() {
    delete NextWebviewPanel.instances[this.opts.viewId];
    this.panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) x.dispose();
    }
  }

  public async autoSave(context: vscode.ExtensionContext) {
    clearTimeout(this._autoSaveTimer);

    this._autoSaveTimer = setTimeout(async () => {
      const workspace = vscode.workspace.workspaceFolders?.[0];
      if (!workspace) return;

      if (await this.isSessionFileExists(workspace)) {
        this.saveSession(context);
      }
    }, 300);
  }

  public async initSessionIfExists(context: vscode.ExtensionContext) {
    const workspace = vscode.workspace.workspaceFolders?.[0];
    if (!workspace) return;

    const sessionFile = path.join(workspace.uri.fsPath, SESSION_DIR, SESSION_FILE);
    if (!fs.existsSync(sessionFile)) return;

    const raw = fs.readFileSync(sessionFile, 'utf-8');
    const session: DevSession = JSON.parse(raw);

    const deviceId = this.getDeviceId(context);

    if (session.deviceId !== deviceId) {
      console.log('Session from another device, restoring...');
      this.restoreSession();
    } else {
      console.log('Session from same device, no action.');
    }
  }
}
