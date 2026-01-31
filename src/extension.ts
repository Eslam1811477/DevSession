// import {
//   enableHotReload,
//   hotRequireExportedFn,
//   registerUpdateReconciler,
// } from '@hediet/node-reload'
// import { Disposable } from '@hediet/std/disposable'
import * as vscode from 'vscode'
// import MyWebview from './MyWebview'
import { NextWebviewPanel } from './NextWebview'

// if (process.env.NODE_ENV === 'development') {
//   enableHotReload({ entryModule: module })
// }
// registerUpdateReconciler(module)

// export class Extension {
//   public readonly dispose = Disposable.fn()

//   constructor() {
//     super()

//     // Disposables are disposed automatically on reload.
//     const item = this.dispose.track(vscode.window.createStatusBarItem())
//     item.text = 'Hallo Welt'
//     item.show()
//   }
// }

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('devsession', () => {
      const webview = NextWebviewPanel.getInstance({
        extensionUri: context.extensionUri,
        route: 'view1',
        title: 'Devsession',
        viewId: 'ghnextA',
      })
    }),
  )

}
