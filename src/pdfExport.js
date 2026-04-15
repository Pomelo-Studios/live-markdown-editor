// src/pdfExport.js
import { marked }           from 'marked'
import { getPdfMake }       from './pdf/loader.js'
import { readPdfStyles }    from './pdf/styleReader.js'
import { renderTokens }     from './pdf/blockRenderer.js'

const exportBtn   = document.getElementById('pdf-export-btn')
const previewPane = document.getElementById('preview-pane')
const preview     = document.getElementById('preview')

let pdfBlobUrl = null
let pdfIframe  = null

// ── Filename from first H1 ─────────────────────────────────────────────────
function getPdfFilename() {
  const val   = document.getElementById('editor')?.value || ''
  const match = val.match(/^#\s+(.+)/m)
  if (!match) return 'document.pdf'
  return match[1]
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60) + '.pdf'
}

// ── Build pdfmake docDefinition ────────────────────────────────────────────
function buildDocDefinition(markdown, styles) {
  const isDark  = document.documentElement.getAttribute('data-theme') === 'dark'
  const tokens  = marked.lexer(markdown)
  const content = renderTokens(tokens, styles, isDark)

  const docDef = {
    content,
    pageSize:    'A4',
    pageMargins: styles.pageMargins,
    defaultStyle: {
      font:     'Roboto',
      fontSize: styles.body.fontSize,
      color:    styles.body.color,
      lineHeight: 1.4,
    },
    fonts: {
      Roboto: {
        normal:      'Roboto-Regular.ttf',
        bold:        'Roboto-Medium.ttf',
        italics:     'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf',
      },
      Courier: {
        normal:      'Courier',
        bold:        'Courier-Bold',
        italics:     'Courier-Oblique',
        bolditalics: 'Courier-BoldOblique',
      },
    },
  }

  // Background color (only set if non-white to keep file size smaller)
  if (styles.bgColor && styles.bgColor !== '#ffffff') {
    docDef.background = () => ({
      canvas: [{
        type:      'rect',
        x: 0, y: 0,
        w: 595.28, h: 841.89,
        color:     styles.bgColor,
      }],
    })
  }

  return docDef
}

// ── PDF mode UI ────────────────────────────────────────────────────────────
function enterPdfMode() {
  exportBtn.textContent = '⬇ Download'
  exportBtn.removeEventListener('click', startExport)
  exportBtn.addEventListener('click', downloadPdf, { once: true })

  const closeBtn = document.createElement('button')
  closeBtn.id = 'pdf-close-btn'
  closeBtn.textContent = '✕ Close'
  exportBtn.insertAdjacentElement('afterend', closeBtn)
  closeBtn.addEventListener('click', exitPdfMode, { once: true })

  preview.style.display = 'none'
  pdfIframe = document.createElement('iframe')
  pdfIframe.style.cssText = 'width:100%;height:100%;border:none;'
  pdfIframe.src = pdfBlobUrl
  previewPane.appendChild(pdfIframe)
}

function exitPdfMode() {
  exportBtn.textContent = 'PDF Export'
  exportBtn.removeEventListener('click', downloadPdf)
  exportBtn.addEventListener('click', startExport)
  document.getElementById('pdf-close-btn')?.remove()
  if (pdfIframe) { pdfIframe.remove(); pdfIframe = null }
  if (pdfBlobUrl) { URL.revokeObjectURL(pdfBlobUrl); pdfBlobUrl = null }
  preview.style.display = ''
}

async function downloadPdf() {
  const link = document.createElement('a')
  link.href     = pdfBlobUrl
  link.download = getPdfFilename()
  link.click()
}

// ── Export ─────────────────────────────────────────────────────────────────
async function startExport() {
  exportBtn.textContent = '...'
  exportBtn.disabled    = true

  try {
    const pdfMakeLib = await getPdfMake()
    const markdown   = document.getElementById('editor').value
    const styles     = readPdfStyles()
    const docDef     = buildDocDefinition(markdown, styles)

    pdfMakeLib.createPdf(docDef).getBlob((blob) => {
      pdfBlobUrl            = URL.createObjectURL(blob)
      exportBtn.disabled    = false
      enterPdfMode()
    })
  } catch (err) {
    console.error('PDF export failed:', err)
    exportBtn.textContent = 'PDF Export'
    exportBtn.disabled    = false
  }
}

export function initPdfExport() {
  exportBtn.addEventListener('click', startExport)
}
