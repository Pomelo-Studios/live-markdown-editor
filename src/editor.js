// src/editor.js
import { storageGet, storageSet } from './utils/storage.js'
import { debounce } from './utils/debounce.js'

const STORAGE_KEY = 'editor-content'

const DEFAULT_CONTENT = `# Welcome to Live Markdown Editor

A **live** markdown editor with _style customization_, code highlighting, and PDF export.

## Features

- Split pane: edit on the left, preview on the right
- Drag the divider to resize panes
- Customize heading sizes, colors, and margins in the left panel
- Dark and light theme support

## Code Example

\`\`\`js
function greet(name) {
  return \`Hello, \${name}!\`
}
console.log(greet('World'))
\`\`\`

## Checklist

- [x] Markdown rendering
- [x] Syntax highlighting
- [ ] Your next document
`

export function initEditor(onInput) {
  const textarea = document.getElementById('editor')

  const saved = storageGet(STORAGE_KEY)
  textarea.value = saved ?? DEFAULT_CONTENT

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      textarea.value = textarea.value.slice(0, start) + '  ' + textarea.value.slice(end)
      textarea.selectionStart = textarea.selectionEnd = start + 2
    }
  })

  const saveDebounced = debounce((val) => storageSet(STORAGE_KEY, val), 1000)

  textarea.addEventListener('input', () => {
    saveDebounced(textarea.value)
    onInput(textarea.value)
  })

  return textarea.value
}
