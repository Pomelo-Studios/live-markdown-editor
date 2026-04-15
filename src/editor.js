// src/editor.js
import { storageGet, storageSet } from './utils/storage.js'
import { debounce } from './utils/debounce.js'

const STORAGE_KEY = 'editor-content'

const DEFAULT_CONTENT = `# Welcome to Live Markdown Editor

A **live** markdown editor with _style customization_, syntax highlighting, and PDF export. Use the **Style Panel** on the left to customize every element.

## Features

- Split pane: edit left, preview right — drag the divider to resize
- Per-element font sizes and colors (H1–H4, body, links, code blocks)
- Blockquote, inline code, and margin customization
- Dark / light theme with system preference detection
- PDF export with inline preview before download

## Blockquote

> This is a blockquote. Its border color and background are fully customizable in the Style Panel.

## Links

Visit the [Pomelo Studios GitHub](https://github.com/Pomelo-Studios) for more projects.

---

## Code Block

\`\`\`js
function greet(name) {
  return \`Hello, \${name}!\`
}

const users = ['Alice', 'Bob', 'Carol']
users.forEach(user => console.log(greet(user)))
\`\`\`

### Inline Code

Use \`const\` instead of \`var\` for block-scoped variables. The \`--code-bg\` CSS variable controls this background.

---

## Table

| Feature         | Status  | Notes                  |
|-----------------|---------|------------------------|
| Live preview    | ✅ Done  | Debounced at 150ms     |
| Style panel     | ✅ Done  | Per-element + global   |
| PDF export      | ✅ Done  | Blob URL inline preview|
| Dark theme      | ✅ Done  | System preference aware|
| Mobile nav      | ✅ Done  | Bottom tab bar         |

## Headings Demo

### H3 Heading

#### H4 Heading

## Checklist

- [x] Markdown rendering
- [x] Syntax highlighting
- [x] Blockquotes, tables, inline code
- [ ] Your next document starts here
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

export function scrollToLine(lineNumber) {
  const textarea = document.getElementById('editor')
  const lines = textarea.value.split('\n')
  const target = Math.max(0, Math.min(lineNumber - 1, lines.length - 1))

  let charPos = 0
  for (let i = 0; i < target; i++) charPos += lines[i].length + 1

  const lineHeight = textarea.scrollHeight / Math.max(lines.length, 1)
  textarea.scrollTop = Math.max(0, target * lineHeight - textarea.clientHeight / 3)
  textarea.focus()
  textarea.setSelectionRange(charPos, charPos + (lines[target]?.length || 0))
}
