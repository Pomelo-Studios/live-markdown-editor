// src/pdf/syntaxHighlight.js
import hljs from 'highlight.js'

// Colors matching hljs github.min.css (light)
const COLORS_LIGHT = {
  'hljs-keyword':           '#d73a49',
  'hljs-built_in':          '#005cc5',
  'hljs-type':              '#005cc5',
  'hljs-literal':           '#005cc5',
  'hljs-number':            '#005cc5',
  'hljs-string':            '#032f62',
  'hljs-comment':           '#6a737d',
  'hljs-doctag':            '#d73a49',
  'hljs-attr':              '#005cc5',
  'hljs-attribute':         '#6f42c1',
  'hljs-template-variable': '#e36209',
  'hljs-variable':          '#e36209',
  'hljs-regexp':            '#032f62',
  'hljs-function':          '#6f42c1',
  'hljs-title':             '#6f42c1',
  'hljs-name':              '#22863a',
  'hljs-tag':               '#22863a',
  'hljs-selector-tag':      '#22863a',
  'hljs-selector-id':       '#6f42c1',
  'hljs-selector-class':    '#6f42c1',
  'hljs-meta':              '#5a5a5a',
  'hljs-operator':          '#d73a49',
  'hljs-punctuation':       '#24292e',
}

// Colors matching hljs github-dark.min.css
const COLORS_DARK = {
  'hljs-keyword':           '#f97583',
  'hljs-built_in':          '#79b8ff',
  'hljs-type':              '#79b8ff',
  'hljs-literal':           '#79b8ff',
  'hljs-number':            '#79b8ff',
  'hljs-string':            '#9ecbff',
  'hljs-comment':           '#6a737d',
  'hljs-doctag':            '#f97583',
  'hljs-attr':              '#79b8ff',
  'hljs-attribute':         '#b392f0',
  'hljs-template-variable': '#ffab70',
  'hljs-variable':          '#ffab70',
  'hljs-regexp':            '#9ecbff',
  'hljs-function':          '#b392f0',
  'hljs-title':             '#b392f0',
  'hljs-name':              '#85e89d',
  'hljs-tag':               '#85e89d',
  'hljs-selector-tag':      '#85e89d',
  'hljs-selector-id':       '#b392f0',
  'hljs-selector-class':    '#b392f0',
  'hljs-meta':              '#a0a0a0',
  'hljs-operator':          '#f97583',
  'hljs-punctuation':       '#e1e4e8',
}

/** Walk DOM nodes produced by DOMParser and return pdfmake text items. */
function domToTextItems(node, defaultColor, colorMap) {
  if (node.nodeType === Node.TEXT_NODE) {
    return [{ text: node.textContent }]
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return []

  const cls   = [...node.classList].find((c) => colorMap[c])
  const color = cls ? colorMap[cls] : defaultColor
  const isComment = [...node.classList].some((c) => c === 'hljs-comment')

  const children = [...node.childNodes].flatMap((child) =>
    domToTextItems(child, color, colorMap)
  )

  if (cls || isComment) {
    return children.map((item) => ({ ...item, color, ...(isComment ? { italics: true } : {}) }))
  }
  return children
}

/**
 * Highlight `code` in `lang` and return a pdfmake text array with colors.
 * Falls back to plain unstyled text if highlighting fails.
 *
 * @param {string} code  - raw code string
 * @param {string} lang  - language identifier (may be empty)
 * @param {string} defaultColor - fallback text color from styles.code.color
 * @param {boolean} isDark - whether the current theme is dark
 * @returns {Array} pdfmake text items
 */
export function highlightCode(code, lang, defaultColor, isDark) {
  const colorMap = isDark ? COLORS_DARK : COLORS_LIGHT
  let html
  try {
    html = lang
      ? hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
      : hljs.highlightAuto(code).value
  } catch {
    return [{ text: code, color: defaultColor }]
  }

  const doc  = new DOMParser().parseFromString(`<pre>${html}</pre>`, 'text/html')
  const pre  = doc.querySelector('pre')
  const items = [...pre.childNodes].flatMap((n) => domToTextItems(n, defaultColor, colorMap))
  return items.length > 0 ? items : [{ text: code, color: defaultColor }]
}
