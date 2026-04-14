// src/main.js
import { initTheme } from './theme.js'
import { initEditor } from './editor.js'
import { renderPreview, renderPreviewDebounced } from './preview.js'
import { initResizer } from './resizer.js'
import { initStylePanel } from './stylePanel.js'

initTheme()
initResizer()
initStylePanel()
const initialContent = initEditor((markdown) => renderPreviewDebounced(markdown))
renderPreview(initialContent)
