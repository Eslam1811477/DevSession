import React, { useEffect, useState } from 'react'

declare const acquireVsCodeApi: any
const vscode = acquireVsCodeApi()

export default function App() {
  const [note, setNote] = useState('')
  const [autoRestore, setAutoRestore] = useState(false)
  const [status, setStatus] = useState('Idle')

  useEffect(() => {
    window.addEventListener('message', event => {
      const message = event.data
      if (message.type === 'STATUS') {
        setStatus(message.payload)
      }
    })
  }, [])

  const saveSession = () => {
    vscode.postMessage({ type: 'SAVE_SESSION' })
    setStatus('Saving session...')
  }

  const restoreSession = () => {
    vscode.postMessage({ type: 'RESTORE_SESSION' })
    setStatus('Restoring session...')
  }

  return (
    <div className="h-screen text-[#d4d4d4] p-6 font-sans">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-[#ffffff]">
            Devsession
          </h1>
          <p className="text-sm text-[#9da3a6]">
            Restore your exact coding state across machines.
          </p>
        </div>

        {/* Note */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-[#c8c8c8]">
            Session note
          </label>
          <input
            className="w-full px-3 py-2 bg-[#252526] border border-[#3c3c3c] rounded-md
                       focus:outline-none focus:border-[#c8c8c8]"
            placeholder="Optional note for this session"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        {/* Toggle */}
        <label className="flex items-center gap-2 text-sm text-[#c8c8c8]">
          <input
            type="checkbox"
            className="accent-[#c8c8c8]"
            checked={autoRestore}
            onChange={e => setAutoRestore(e.target.checked)}
          />
          Restore automatically on startup
        </label>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={saveSession}
            className="px-4 py-2 border border-[#c8c8c8] rounded-md
                       hover:bg-[#c8c8c8] hover:text-[#1e1e1e]
                       transition"
          >
            Save session
          </button>

          <button
            onClick={restoreSession}
            className="px-4 py-2 border border-[#3c3c3c] rounded-md
                       hover:bg-[#2d2d2d]
                       transition"
          >
            Restore session
          </button>
        </div>

        {/* Status */}
        <div className="text-sm text-[#9da3a6]">
          Status: {status}
        </div>

        {/* Debug */}
        <div className="border border-[#3c3c3c] rounded-md p-3 text-xs bg-[#252526]">
          <div className="font-medium mb-1 text-[#c8c8c8]">
            Local state
          </div>
          <pre>{JSON.stringify({ note, autoRestore }, null, 2)}</pre>
        </div>

      </div>
    </div>
  )
}
