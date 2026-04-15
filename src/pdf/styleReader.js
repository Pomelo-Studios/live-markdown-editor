// src/pdf/styleReader.js

const PX_TO_PT = 0.75         // 96 dpi → points
const MM_TO_PT = 2.8346       // 1 mm = 2.8346 pt
const A4_WIDTH_PT = 595.28

function get(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function pt(cssVar, fallbackPx) {
  return (parseFloat(get(cssVar)) || fallbackPx) * PX_TO_PT
}

function mmPt(cssVar, fallbackPx) {
  // CSS var is stored in px, convert px → mm → pt
  return (parseFloat(get(cssVar)) || fallbackPx) * 0.2646 * MM_TO_PT
}

export function readPdfStyles() {
  const marginLeft   = mmPt('--preview-margin-left',   32)
  const marginTop    = mmPt('--preview-margin-top',    24)
  const marginRight  = mmPt('--preview-margin-right',  32)
  const marginBottom = mmPt('--preview-margin-bottom', 24)

  return {
    pageMargins:  [marginLeft, marginTop, marginRight, marginBottom],
    contentWidth: A4_WIDTH_PT - marginLeft - marginRight,
    bgColor:      get('--bg-preview') || '#ffffff',

    body: {
      fontSize: pt('--body-size', 16),
      color:    get('--body-color') || '#333333',
    },

    headings: {
      1: { fontSize: pt('--h1-size', 36), color: get('--h1-color') || '#111111', bold: true,  marginTop: 14, marginBottom: 4 },
      2: { fontSize: pt('--h2-size', 28), color: get('--h2-color') || '#222222', bold: true,  marginTop: 12, marginBottom: 4 },
      3: { fontSize: pt('--h3-size', 22), color: get('--h3-color') || '#333333', bold: true,  marginTop: 10, marginBottom: 3 },
      4: { fontSize: pt('--h4-size', 18), color: get('--h4-color') || '#444444', bold: true,  marginTop:  8, marginBottom: 3 },
      5: { fontSize: pt('--h5-size', 16), color: get('--h5-color') || '#555555', bold: false, marginTop:  6, marginBottom: 2 },
      6: { fontSize: pt('--h6-size', 14), color: get('--h6-color') || '#666666', bold: false, marginTop:  6, marginBottom: 2 },
    },

    link: {
      color:      get('--link-color') || '#6d28d9',
      decoration: 'underline',
    },

    code: {
      background: get('--code-bg')    || '#f4f4f4',
      color:      get('--code-color') || '#333333',
      fontSize:   pt('--body-size', 16) * 0.85,
    },

    inlineCode: {
      background: get('--inline-code-bg')    || '#eeeeee',
      color:      get('--inline-code-color') || '#d63e6b',
    },

    blockquote: {
      border:     get('--blockquote-border') || '#6d28d9',
      background: get('--blockquote-bg')     || '#f5f0ff',
    },

    checkbox: {
      color: get('--checkbox-color') || '#6d28d9',
    },

    tableHeader: {
      background: get('--table-header-bg') || '#efefef',
    },

    tableBorder: get('--border-color') || '#e1e4e8',
  }
}
