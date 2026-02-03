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

const SESSION_DIR = '.devsession'
const SESSION_FILE = 'session.json'

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('devsession', () => {
      const panel = NextWebviewPanel.getInstance({
        extensionUri: context.extensionUri,
        route: 'view1',
        title: 'Devsession',
        viewId: 'ghnextA',
      })

      // 🔌 Receive messages from React Webview
      panel.webview.onDidReceiveMessage(message => {
        if (message.type === 'SAVE_SESSION') {
          saveSession(panel)
        }

        if (message.type === 'RESTORE_SESSION') {
          restoreSession(panel)
        }
      })
    })
  )
}

/* =========================
   SAVE SESSION
========================= */
async function saveSession(panel: vscode.WebviewPanel) {
  const workspace = vscode.workspace.workspaceFolders?.[0]
  if (!workspace) {
    panel.webview.postMessage({
      type: 'STATUS',
      payload: 'No workspace open',
    })
    return
  }

  const sessionDir = path.join(
    workspace.uri.fsPath,
    SESSION_DIR
  )

  const sessionFile = path.join(
    sessionDir,
    SESSION_FILE
  )

  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir)
  }

  const files: SessionFile[] = vscode.window.visibleTextEditors.map(
    editor => ({
      path: editor.document.uri.fsPath,
      line: editor.selection.active.line,
      character: editor.selection.active.character,
    })
  )

  const session: DevSession = {
    createdAt: new Date().toISOString(),
    files,
  }

  fs.writeFileSync(
    sessionFile,
    JSON.stringify(session, null, 2)
  )

  panel.webview.postMessage({
    type: 'STATUS',
    payload: `Session saved (${files.length} files)`,
  })
}

/* =========================
   RESTORE SESSION
========================= */
async function restoreSession(panel: vscode.WebviewPanel) {
  const workspace = vscode.workspace.workspaceFolders?.[0]
  if (!workspace) {
    panel.webview.postMessage({
      type: 'STATUS',
      payload: 'No workspace open',
    })
    return
  }

  const sessionFile = path.join(
    workspace.uri.fsPath,
    SESSION_DIR,
    SESSION_FILE
  )

  if (!fs.existsSync(sessionFile)) {
    panel.webview.postMessage({
      type: 'STATUS',
      payload: 'No session found',
    })
    return
  }

  const raw = fs.readFileSync(sessionFile, 'utf-8')
  const session: DevSession = JSON.parse(raw)

  for (const file of session.files) {
    try {
      const doc = await vscode.workspace.openTextDocument(file.path)
      const editor = await vscode.window.showTextDocument(doc, {
        preview: false,
      })

      const pos = new vscode.Position(
        file.line,
        file.character
      )

      editor.selection = new vscode.Selection(pos, pos)
      editor.revealRange(
        new vscode.Range(pos, pos),
        vscode.TextEditorRevealType.InCenter
      )
    } catch {
      // ignore missing files
    }
  }

  panel.webview.postMessage({
    type: 'STATUS',
    payload: `Session restored (${session.files.length} files)`,
  })
}

export function deactivate() {}
