// ⚡ JS للتعامل مع زر حفظ الجلسة
(function () {
  const vscode = acquireVsCodeApi(); // VS Code API للـ Webview

  const saveBtn = document.getElementById('save-btn');
  saveBtn.addEventListener('click', () => {
    // نرسل رسالة للـ extension
    vscode.postMessage({
      command: 'saveSession',
      payload: {
        message: 'Save button clicked'
      }
    });
  });

  // استقبال رسائل من الـ extension
  window.addEventListener('message', (event) => {
    const msg = event.data; // الرسالة من الـ extension
    console.log('Message from extension:', msg);
  });
})();
