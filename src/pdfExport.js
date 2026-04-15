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

// ── Prepare html2canvas's internal clone before capture ──────────────────────
function prepareClone(clonedDoc) {
  // 1. Force light theme so PDFs are always readable
  clonedDoc.documentElement.setAttribute('data-theme', 'light')
  const root = clonedDoc.documentElement
  const lightVars = {
    '--body-color':          '#333333',
    '--h1-color':            '#111111',
    '--h2-color':            '#222222',
    '--h3-color':            '#333333',
    '--h4-color':            '#444444',
    '--h5-color':            '#555555',
    '--h6-color':            '#666666',
    '--code-bg':             '#f4f4f4',
    '--code-color':          '#333333',
    '--inline-code-bg':      '#eeeeee',
    '--inline-code-color':   '#d63e6b',
    '--border-color':        '#e1e4e8',
    '--blockquote-border':   '#6d28d9',
    '--blockquote-bg':       'transparent',
    '--link-color':          '#6d28d9',
    '--checkbox-color':      '#6d28d9',
    '--bg-preview':          '#ffffff',
  }
  Object.entries(lightVars).forEach(([k, v]) => root.style.setProperty(k, v))

  // 2. Strip preview padding — html2pdf margin covers per-page spacing
  const clonedPreview = clonedDoc.getElementById('preview')
  if (clonedPreview) {
    clonedPreview.style.padding = '0'
    clonedPreview.style.background = '#ffffff'
  }

  // 3. Inject page-break rules so headings/code/table never split across pages
  const style = clonedDoc.createElement('style')
  style.textContent = `
    h1,h2,h3,h4,h5,h6,pre,blockquote,table,figure {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    h1,h2,h3,h4,h5,h6 {
      page-break-after: avoid !important;
      break-after: avoid !important;
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

  // 4. Replace custom CSS checkboxes with plain spans — appearance:none + calc()
  //    vars on ::after pseudo-elements crash html2canvas
  clonedDoc.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    const checked = cb.checked
    const box = clonedDoc.createElement('span')
    box.style.cssText = [
      'display:inline-block',
      'width:12px', 'height:12px',
      `border:2px solid ${checked ? '#6d28d9' : '#888888'}`,
      'border-radius:3px',
      'vertical-align:middle',
      'margin-right:6px',
      `background:${checked ? '#6d28d9' : 'transparent'}`,
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

  // 5. Remove hover artefacts
  clonedDoc.querySelectorAll('.preview-goto-btn').forEach((b) => b.remove())
  clonedDoc.querySelectorAll('.preview-line-hl').forEach((el) => el.classList.remove('preview-line-hl'))
}

// ── PDF mode UI ───────────────────────────────────────────────────────────────
function enterPdfMode() {
  exportBtn.textContent = '⬇ İndir'
  exportBtn.removeEventListener('click', startExport)
  exportBtn.addEventListener('click', downloadPdf, { once: true })

  const closeBtn = document.createElement('button')
  closeBtn.id = 'pdf-close-btn'
  closeBtn.textContent = '✕ Kapat'
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
  link.download = 'document.pdf'
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

    const opt = {
      margin: margins,
      filename: 'document.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => prepareClone(clonedDoc),
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      // Prevent headings, code blocks, and tables from being sliced across pages
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
