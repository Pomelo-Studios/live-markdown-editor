// src/main.js
import { initTheme } from './theme.js'
import { initEditor } from './editor.js'
import { renderPreview, renderPreviewDebounced } from './preview.js'
import { initResizer } from './resizer.js'
import { initStylePanel } from './stylePanel.js'
import { initPdfExport } from './pdfExport.js'
import { initMobileNav } from './mobileNav.js'

initTheme()
initResizer()
initStylePanel()
initPdfExport()
initMobileNav()
const initialContent = initEditor((markdown) => renderPreviewDebounced(markdown))
renderPreview(initialContent)
