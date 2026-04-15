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

// Called by html2canvas on its internal clone — safe to mutate
function prepareClone(clonedDoc) {
  // Strip preview padding — html2pdf margin handles per-page spacing
  const clonedPreview = clonedDoc.getElementById('preview')
  if (clonedPreview) {
    clonedPreview.style.padding = '0'
    clonedPreview.style.background = '#ffffff'
    clonedPreview.style.color = '#333333'
  }

  // Replace custom CSS checkboxes with simple spans html2canvas can render.
  // appearance:none + calc() vars on ::after pseudo-elements crash html2canvas.
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
        'display:block',
        'position:absolute',
        'left:2px', 'top:-1px',
        'width:4px', 'height:7px',
        'border-right:2px solid #ffffff',
        'border-bottom:2px solid #ffffff',
        'transform:rotate(45deg)',
      ].join(';')
      box.appendChild(tick)
    }
    cb.parentNode.replaceChild(box, cb)
  })

  // Strip hover artefacts
  clonedDoc.querySelectorAll('.preview-goto-btn').forEach((b) => b.remove())
  clonedDoc.querySelectorAll('.preview-line-hl').forEach((el) => el.classList.remove('preview-line-hl'))
}

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

async function startExport() {
  exportBtn.textContent = '...'
  exportBtn.disabled = true

  try {
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2000))])

    const html2pdfLib = await getHtml2Pdf()

    // Read page margins from live CSS vars, convert px → mm
    const cs = getComputedStyle(document.documentElement)
    const mm = (varName, fallback) => (parseFloat(cs.getPropertyValue(varName)) || fallback) * 0.2646
    const margins = [
      mm('--preview-margin-top', 24),
      mm('--preview-margin-right', 32),
      mm('--preview-margin-bottom', 24),
      mm('--preview-margin-left', 32),
    ]

    const opt = {
      margin: margins,
      filename: 'document.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (_doc, _el) => prepareClone(_doc),
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }

    // Export directly from the live preview element — no manual DOM clone needed.
    // html2canvas makes its own internal clone; prepareClone() modifies that.
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
