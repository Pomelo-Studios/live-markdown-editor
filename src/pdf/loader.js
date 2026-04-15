// src/pdf/loader.js

const PDFMAKE_CDN  = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js'
const VFS_FONTS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.min.js'

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    const timer = setTimeout(() => reject(new Error(`CDN timeout: ${src}`)), 15000)
    s.onload  = () => { clearTimeout(timer); resolve() }
    s.onerror = () => { clearTimeout(timer); reject(new Error(`Failed to load: ${src}`)) }
    document.head.appendChild(s)
  })
}

export async function getPdfMake() {
  if (window.pdfMake) return window.pdfMake
  await loadScript(PDFMAKE_CDN)
  await loadScript(VFS_FONTS_CDN)
  if (!window.pdfMake) throw new Error('pdfMake not available after load')
  return window.pdfMake
}
