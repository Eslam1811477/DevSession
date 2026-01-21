import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {

  const provider: vscode.WebviewViewProvider = {
    resolveWebviewView(webviewView) {

      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'webview', 'dist')
        ]
      };

      const htmlPath = vscode.Uri.joinPath(
        context.extensionUri,
        'assets',
        'index.html'
      );

      webviewView.webview.html = getHtml(webviewView.webview, htmlPath);
    }

    
  };

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'devsession.view',
      provider
    )
  );
}



function getHtml(webview: vscode.Webview, htmlPath: vscode.Uri): string {
  const fs = require('fs');
  let html = fs.readFileSync(htmlPath.fsPath, 'utf8');

  return html.replace(
    /(<head>)/,
    `$1
    <meta http-equiv="Content-Security-Policy"
      content="default-src 'none';
      img-src ${webview.cspSource} https:;
      script-src ${webview.cspSource};
      style-src ${webview.cspSource} 'unsafe-inline';">
    `
  );





  
}

export function deactivate() {}
