// src/main.js
import { initTheme } from './theme.js'
import { initEditor } from './editor.js'
import { renderPreview, renderPreviewDebounced } from './preview.js'

initTheme()
const initialContent = initEditor((markdown) => renderPreviewDebounced(markdown))
renderPreview(initialContent)
