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
  let _rafId = null
  let _pendingPercent = null

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
    _pendingPercent = Math.max(MIN_PERCENT, Math.min(MAX_PERCENT, ((startEditorWidth + delta) / splitWidth) * 100))
    if (!_rafId) {
      _rafId = requestAnimationFrame(() => {
        editorPane.style.flexBasis  = `${_pendingPercent}%`
        previewPane.style.flexBasis = `${100 - _pendingPercent}%`
        _rafId = null
      })
    }
  })

  document.addEventListener('mouseup', () => {
    if (!dragging) return
    dragging = false
    if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null }
    resizer.classList.remove('resizing')
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
  })
}
