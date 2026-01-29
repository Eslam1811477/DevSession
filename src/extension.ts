import * as vscode from 'vscode';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {

  const provider = new DevSessionViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'devsession.view',
      provider
    )
  );
}

class DevSessionViewProvider implements vscode.WebviewViewProvider {

  constructor(
    private readonly context: vscode.ExtensionContext
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'assets')
      ]
    };

    const htmlPath = vscode.Uri.joinPath(
      this.context.extensionUri,
      'assets',
      'index.html'
    );

    webviewView.webview.html = this.getHtml(
      webviewView.webview,
      htmlPath
    );
  }

  private getHtml(
    webview: vscode.Webview,
    htmlPath: vscode.Uri
  ): string {

    let html = fs.readFileSync(htmlPath.fsPath, 'utf8');

    const assetsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'assets')
    );

    html = html.replace(/(src|href)="(.+?)"/g, (_, attr, value) => {
      return `${attr}="${assetsUri}/${value}"`;
    });

    html = html.replace(
      /<head>/,
      `<head>
        <meta http-equiv="Content-Security-Policy"
          content="
            default-src 'none';
            img-src ${webview.cspSource};
            script-src ${webview.cspSource};
            style-src ${webview.cspSource} 'unsafe-inline';
          ">
      `
    );

    return html;
  }
}

export function deactivate() {}
