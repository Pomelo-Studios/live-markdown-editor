// src/editor.js
let _textarea = null

/**
 * Initialize the editor textarea.
 * @param {string} initialContent - content to display immediately
 * @param {(value: string) => void} onInput - called on every input event
 */
export function initEditor(initialContent, onInput) {
  _textarea = document.getElementById('editor')
  const textarea = _textarea

  textarea.value = initialContent

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      textarea.value = textarea.value.slice(0, start) + '  ' + textarea.value.slice(end)
      textarea.selectionStart = textarea.selectionEnd = start + 2
    }
  })

  textarea.addEventListener('input', () => {
    onInput(textarea.value)
  })
}

/**
 * Programmatically update textarea content without firing onInput.
 * Resets cursor and scroll to top.
 * @param {string} content
 */
export function setEditorContent(content) {
  if (!_textarea) return
  _textarea.value = content
  _textarea.selectionStart = 0
  _textarea.selectionEnd = 0
  _textarea.scrollTop = 0
}

export function scrollToLine(lineNumber) {
  const textarea = _textarea
  if (!textarea) return
  const lines = textarea.value.split('\n')
  const target = Math.max(0, Math.min(lineNumber - 1, lines.length - 1))

  let charPos = 0
  for (let i = 0; i < target; i++) charPos += lines[i].length + 1

  const lineHeight = textarea.scrollHeight / Math.max(lines.length, 1)
  textarea.scrollTop = Math.max(0, target * lineHeight - textarea.clientHeight / 3)
  textarea.focus()
  textarea.setSelectionRange(charPos, charPos + (lines[target]?.length || 0))
}
