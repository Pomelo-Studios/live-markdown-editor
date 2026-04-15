// src/pdfExport.js
const exportBtn = document.getElementById('pdf-export-btn')
const previewPane = document.getElementById('preview-pane')
const preview = document.getElementById('preview')

let pdfBlobUrl = null
let pdfIframe = null

function getHtml2Pdf() {
  return new Promise((resolve, reject) => {
    if (window.html2pdf) { resolve(window.html2pdf); return }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
    const timer = setTimeout(() => reject(new Error('html2pdf CDN timed out')), 12000)
    script.onload = () => {
      clearTimeout(timer)
      window.html2pdf ? resolve(window.html2pdf) : reject(new Error('html2pdf not available after load'))
    }
    script.onerror = () => { clearTimeout(timer); reject(new Error('Failed to load html2pdf CDN')) }
    document.head.appendChild(script)
  })
}

// ── Derive a filename from the first H1 in the document ──────────────────────
function getPdfFilename() {
  const editor = document.getElementById('editor')
  const match = editor?.value.match(/^#\s+(.+)/m)
  if (!match) return 'document.pdf'
  return match[1]
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60) + '.pdf'
}

// ── Prepare html2canvas's internal clone before capture ──────────────────────
function prepareClone(clonedDoc) {
  const cs = getComputedStyle(document.documentElement)
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light'
  const root = clonedDoc.documentElement

  // 1. Apply current theme so default CSS vars cascade correctly
  root.setAttribute('data-theme', currentTheme)

  // 2. Copy all current computed CSS var values (includes style panel customizations)
  const varsToCopy = [
    '--bg-preview',
    '--body-color', '--body-size',
    '--h1-size', '--h1-color', '--h2-size', '--h2-color',
    '--h3-size', '--h3-color', '--h4-size', '--h4-color',
    '--h5-size', '--h5-color', '--h6-size', '--h6-color',
    '--code-bg', '--code-color', '--inline-code-bg', '--inline-code-color',
    '--border-color', '--blockquote-border', '--blockquote-bg',
    '--link-color', '--checkbox-color',
    '--preview-margin-top', '--preview-margin-right',
    '--preview-margin-bottom', '--preview-margin-left',
  ]
  varsToCopy.forEach((v) => {
    const val = cs.getPropertyValue(v).trim()
    if (val) root.style.setProperty(v, val)
  })

  // 3. Strip preview padding — html2pdf margin covers per-page spacing
  const clonedPreview = clonedDoc.getElementById('preview')
  if (clonedPreview) {
    clonedPreview.style.padding = '0'
    clonedPreview.style.background = cs.getPropertyValue('--bg-preview').trim() || '#ffffff'
  }

  // 4. Page-break rules, word-spacing fix for headings
  const style = clonedDoc.createElement('style')
  style.textContent = `
    h1,h2,h3,h4,h5,h6,pre,blockquote,table,figure {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    h1,h2,h3,h4,h5,h6 {
      page-break-after: avoid !important;
      break-after: avoid !important;
      word-spacing: normal !important;
      letter-spacing: normal !important;
    }
    p, li {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      orphans: 3;
      widows: 3;
    }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  `
  clonedDoc.head.appendChild(style)

  // 5. Replace custom CSS checkboxes with plain spans — appearance:none + calc()
  //    vars on ::after pseudo-elements crash html2canvas
  const cbColor = cs.getPropertyValue('--checkbox-color').trim() || '#6d28d9'
  clonedDoc.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    const checked = cb.checked
    const box = clonedDoc.createElement('span')
    box.style.cssText = [
      'display:inline-block',
      'width:12px', 'height:12px',
      `border:2px solid ${checked ? cbColor : '#888888'}`,
      'border-radius:3px',
      'vertical-align:middle',
      'margin-right:6px',
      `background:${checked ? cbColor : 'transparent'}`,
      'position:relative',
    ].join(';')
    if (checked) {
      const tick = clonedDoc.createElement('span')
      tick.style.cssText = [
        'display:block', 'position:absolute',
        'left:2px', 'top:-1px',
        'width:4px', 'height:7px',
        'border-right:2px solid #fff',
        'border-bottom:2px solid #fff',
        'transform:rotate(45deg)',
      ].join(';')
      box.appendChild(tick)
    }
    cb.parentNode.replaceChild(box, cb)
  })

  // 6. Remove hover artefacts
  clonedDoc.querySelectorAll('.preview-goto-btn').forEach((b) => b.remove())
  clonedDoc.querySelectorAll('.preview-line-hl').forEach((el) => el.classList.remove('preview-line-hl'))
}

// ── PDF mode UI ───────────────────────────────────────────────────────────────
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
  link.href = pdfBlobUrl
  link.download = getPdfFilename()
  link.click()
}

// ── Export ────────────────────────────────────────────────────────────────────
async function startExport() {
  exportBtn.textContent = '...'
  exportBtn.disabled = true

  try {
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2000))])

    const html2pdfLib = await getHtml2Pdf()

    // Read margin CSS vars and convert px → mm (1px = 0.2646mm)
    const cs = getComputedStyle(document.documentElement)
    const mm = (v, fb) => (parseFloat(cs.getPropertyValue(v)) || fb) * 0.2646
    const margins = [
      mm('--preview-margin-top',    24),
      mm('--preview-margin-right',  32),
      mm('--preview-margin-bottom', 24),
      mm('--preview-margin-left',   32),
    ]

    const bgColor = cs.getPropertyValue('--bg-preview').trim() || '#ffffff'

    const opt = {
      margin: margins,
      filename: getPdfFilename(),
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: bgColor,
        onclone: (clonedDoc) => prepareClone(clonedDoc),
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: {
        mode: ['css', 'legacy'],
        avoid: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'blockquote', 'table', 'tr', 'img'],
      },
    }

    const pdfBlob = await html2pdfLib().set(opt).from(preview).outputPdf('blob')
    pdfBlobUrl = URL.createObjectURL(pdfBlob)
    exportBtn.disabled = false
    enterPdfMode()
  } catch (err) {
    console.error('PDF export failed:', err)
    exportBtn.textContent = 'PDF Export'
    exportBtn.disabled = false
  }
}

export function initPdfExport() {
  exportBtn.addEventListener('click', startExport)
}
