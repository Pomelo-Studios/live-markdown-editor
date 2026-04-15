// src/pdfExport.js
const exportBtn = document.getElementById('pdf-export-btn')
const previewPane = document.getElementById('preview-pane')
const preview = document.getElementById('preview')

let pdfBlobUrl = null
let pdfIframe = null

function getHtml2Pdf() {
  return new Promise((resolve) => {
    if (window.html2pdf) { resolve(window.html2pdf); return }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
    script.onload = () => resolve(window.html2pdf)
    document.head.appendChild(script)
  })
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

  const closeBtn = document.getElementById('pdf-close-btn')
  if (closeBtn) closeBtn.remove()

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

function pxToMm(px) {
  return px * 0.2646
}

function readMargins() {
  const cs = getComputedStyle(document.documentElement)
  return {
    top:    pxToMm(parseFloat(cs.getPropertyValue('--preview-margin-top'))    || 24),
    right:  pxToMm(parseFloat(cs.getPropertyValue('--preview-margin-right'))  || 32),
    bottom: pxToMm(parseFloat(cs.getPropertyValue('--preview-margin-bottom')) || 24),
    left:   pxToMm(parseFloat(cs.getPropertyValue('--preview-margin-left'))   || 32),
  }
}

async function startExport() {
  exportBtn.textContent = '...'
  exportBtn.disabled = true

  try {
    // Ensure web fonts (Fira Code, etc.) are loaded before capturing
    await document.fonts.ready

    const html2pdfLib = await getHtml2Pdf()
    const margins = readMargins()

    // Clone preview and strip its padding — html2pdf margin handles page spacing
    const clone = preview.cloneNode(true)
    clone.style.cssText = 'padding:0;margin:0;box-shadow:none;background:transparent;'
    clone.style.width = preview.clientWidth + 'px'
    clone.style.position = 'absolute'
    clone.style.top = '-99999px'
    clone.style.left = '0'
    // Remove hover artifacts before cloning
    clone.querySelectorAll('.preview-goto-btn').forEach((b) => b.remove())
    clone.querySelectorAll('.preview-line-hl').forEach((el) => el.classList.remove('preview-line-hl'))
    document.body.appendChild(clone)

    const opt = {
      margin: [margins.top, margins.right, margins.bottom, margins.left],
      filename: 'document.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }

    const pdfBlob = await html2pdfLib().set(opt).from(clone).outputPdf('blob')
    document.body.removeChild(clone)

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
