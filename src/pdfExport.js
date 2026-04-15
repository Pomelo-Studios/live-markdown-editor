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

async function startExport() {
  exportBtn.textContent = '...'
  exportBtn.disabled = true

  const html2pdfLib = await getHtml2Pdf()
  const opt = {
    margin: 0,
    filename: 'document.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }

  const pdfBlob = await html2pdfLib().set(opt).from(preview).outputPdf('blob')
  pdfBlobUrl = URL.createObjectURL(pdfBlob)

  exportBtn.disabled = false
  enterPdfMode()
}

export function initPdfExport() {
  exportBtn.addEventListener('click', startExport)
}
