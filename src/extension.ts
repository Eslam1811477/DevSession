import * as vscode from 'vscode';
import { NextWebviewPanel } from './NextWebview';

let panel: NextWebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {

  vscode.commands.registerCommand('devsession', () => {
    panel = NextWebviewPanel.getInstance({
      extensionUri: context.extensionUri,
      route: 'view1',
      title: 'Devsession',
      viewId: 'ghnextA',
    });
  });

  vscode.commands.executeCommand('devsession').then(() => {
    panel?.initSessionIfExists(context);
  });

  const workspace = vscode.workspace.workspaceFolders?.[0];
  if (workspace) {
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspace, '.devsession/session.json')
    );

    watcher.onDidChange(() => panel?.initSessionIfExists(context));
    watcher.onDidCreate(() => panel?.initSessionIfExists(context));

    context.subscriptions.push(watcher);
  }

  vscode.workspace.onDidOpenTextDocument(() => panel?.autoSave(context));
  vscode.workspace.onDidCloseTextDocument(() => panel?.autoSave(context));
}

export function deactivate() {}
