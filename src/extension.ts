import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { NextWebviewPanel } from './NextWebview'

type SessionFile = {
  path: string
  line: number
  character: number
}

type DevSession = {
  createdAt: string
  files: SessionFile[]
}






export function activate(context: vscode.ExtensionContext) {
  let panel: NextWebviewPanel | undefined

  context.subscriptions.push(
    vscode.commands.registerCommand('devsession', () => {
      panel = NextWebviewPanel.getInstance({
        extensionUri: context.extensionUri,
        route: 'view1',
        title: 'Devsession',
        viewId: 'ghnextA',
      })
    })
  )

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(() => panel?.autoSave()),
    vscode.workspace.onDidCloseTextDocument(() => panel?.autoSave())
  )
}

export function deactivate() {}