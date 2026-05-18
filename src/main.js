// src/main.js
import { initTheme } from './theme.js'
import { initEditor, scrollToLine, setEditorContent } from './editor.js'
import { renderPreview, renderPreviewDebounced, setScrollToLineCallback } from './preview.js'
import { initResizer } from './resizer.js'
import { initStylePanel } from './stylePanel.js'
import { initPdfExport } from './pdfExport.js'
import { initMobileNav } from './mobileNav.js'
import { initFormatToolbar } from './formatToolbar.js'
import { initTabManager, getActiveTab, updateActiveContent } from './tabManager.js'

initTheme()
initResizer()
initStylePanel()
initPdfExport()
initMobileNav()
setScrollToLineCallback(scrollToLine)

// initTabManager does NOT fire onActiveTabChange during init.
// Initial content is read synchronously via getActiveTab() below.
initTabManager({
  onActiveTabChange: (content) => {
    setEditorContent(content)
    renderPreview(content)
  },
})

const initial = getActiveTab().content
initEditor(initial, (value) => {
  updateActiveContent(value)
  renderPreviewDebounced(value)
})
renderPreview(initial)
initFormatToolbar()
