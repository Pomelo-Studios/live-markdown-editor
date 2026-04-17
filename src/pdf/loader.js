// src/pdf/loader.js

const PDFMAKE_CDN    = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js'
const VFS_FONTS_CDN  = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.min.js'
const FIRA_CODE_CDN  = 'https://cdn.jsdelivr.net/npm/firacode@6.2.0/distr/ttf/FiraCode-Regular.ttf'
// vfs_fonts only ships Roboto-Medium (500). Fetch the real 700-weight WOFF for
// proper bold rendering. pdfkit reads magic bytes so .woff works fine in VFS.
const ROBOTO_BOLD_CDN = 'https://cdn.jsdelivr.net/npm/roboto-fontface@0.10.0/fonts/roboto/Roboto-Bold.woff'

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

  // pdfmake browser API uses pdfMake.fonts global; initialising it (even to {})
  // causes it to ignore docDef.fonts, so Roboto must be registered here too.
  // Start with Medium as bold fallback; upgraded below if Roboto-Bold loads.
  window.pdfMake.fonts = {
    Roboto: {
      normal:      'Roboto-Regular.ttf',
      bold:        'Roboto-Medium.ttf',
      italics:     'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf',
    },
  }

  // Load Roboto Bold (700) — vfs_fonts only ships Medium (500).
  try {
    const res = await fetch(ROBOTO_BOLD_CDN)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    window.pdfMake.vfs['Roboto-Bold.woff'] = arrayBufferToBase64(await res.arrayBuffer())
    window.pdfMake.fonts.Roboto.bold        = 'Roboto-Bold.woff'
    window.pdfMake.fonts.Roboto.bolditalics = 'Roboto-Bold.woff'
  } catch (err) {
    console.warn('Roboto-Bold unavailable, falling back to Medium (500):', err.message)
  }

  window.pdfMake._firaCodeLoaded = false
  try {
    const res = await fetch(FIRA_CODE_CDN)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    window.pdfMake.vfs['FiraCode-Regular.ttf'] = arrayBufferToBase64(await res.arrayBuffer())
    window.pdfMake.fonts.FiraCode = {
      normal:      'FiraCode-Regular.ttf',
      bold:        'FiraCode-Regular.ttf',
      italics:     'FiraCode-Regular.ttf',
      bolditalics: 'FiraCode-Regular.ttf',
    }
    window.pdfMake._firaCodeLoaded = true
  } catch (err) {
    console.warn('FiraCode font unavailable, code blocks will use Roboto:', err.message)
  }

  window.pdfMake._mdEditorReady = true
  return window.pdfMake
}
