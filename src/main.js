// src/main.js
import { initTheme } from './theme.js'
import { initEditor, scrollToLine } from './editor.js'
import { renderPreview, renderPreviewDebounced, setScrollToLineCallback } from './preview.js'
import { initResizer } from './resizer.js'
import { initStylePanel } from './stylePanel.js'
import { initPdfExport } from './pdfExport.js'
import { initMobileNav } from './mobileNav.js'
import { initFormatToolbar } from './formatToolbar.js'

initTheme()
initResizer()
initStylePanel()
initPdfExport()
initMobileNav()
setScrollToLineCallback(scrollToLine)
const initialContent = initEditor((markdown) => renderPreviewDebounced(markdown))
renderPreview(initialContent)
initFormatToolbar()
