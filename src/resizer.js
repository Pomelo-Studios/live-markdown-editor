// src/resizer.js
const MIN_PERCENT = 20
const MAX_PERCENT = 80

export function initResizer() {
  const resizer = document.getElementById('resizer')
  const editorPane = document.getElementById('editor-pane')
  const previewPane = document.getElementById('preview-pane')
  const split = document.getElementById('split')

  let dragging = false
  let startX = 0
  let startEditorWidth = 0
  let splitWidth = 0

  resizer.addEventListener('mousedown', (e) => {
    dragging = true
    startX = e.clientX
    startEditorWidth = editorPane.getBoundingClientRect().width
    splitWidth = split.getBoundingClientRect().width
    resizer.classList.add('resizing')
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
  })

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return
    const delta = e.clientX - startX
    let newEditorPercent = ((startEditorWidth + delta) / splitWidth) * 100
    newEditorPercent = Math.max(MIN_PERCENT, Math.min(MAX_PERCENT, newEditorPercent))
    editorPane.style.flexBasis = `${newEditorPercent}%`
    previewPane.style.flexBasis = `${100 - newEditorPercent}%`
  })

  document.addEventListener('mouseup', () => {
    if (!dragging) return
    dragging = false
    resizer.classList.remove('resizing')
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
  })
}
