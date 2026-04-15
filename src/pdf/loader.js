// src/pdf/loader.js

const PDFMAKE_CDN   = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js'
const VFS_FONTS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.min.js'
const FIRA_CODE_CDN = 'https://cdn.jsdelivr.net/npm/firacode@6.2.0/distr/ttf/FiraCode-Regular.ttf'

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

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const CHUNK = 8192
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

export async function getPdfMake() {
  if (window.pdfMake?._mdEditorReady) return window.pdfMake
  if (!window.pdfMake) {
    await loadScript(PDFMAKE_CDN)
    await loadScript(VFS_FONTS_CDN)
    if (!window.pdfMake) throw new Error('pdfMake not available after load')
  }

  window.pdfMake._firaCodeLoaded = false
  try {
    const res = await fetch(FIRA_CODE_CDN)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    window.pdfMake.vfs['FiraCode-Regular.ttf'] = arrayBufferToBase64(await res.arrayBuffer())
    window.pdfMake._firaCodeLoaded = true
  } catch (err) {
    console.warn('FiraCode font unavailable, code blocks will use Roboto:', err.message)
  }

  window.pdfMake._mdEditorReady = true
  return window.pdfMake
}
