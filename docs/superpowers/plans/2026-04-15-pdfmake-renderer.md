# pdfmake PDF Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace html2canvas + html2pdf.js with a pdfmake-based renderer that converts the marked.js token AST directly into a real PDF — selectable text, working internal links, proper TOC anchors, syntax-highlighted code blocks.

**Architecture:** The marked.js lexer already produces a typed token tree; we walk that tree in two passes (block tokens → pdfmake content objects, inline tokens → pdfmake text arrays). A styleReader reads the current CSS custom properties at export time so the PDF matches the preview exactly. pdfmake is loaded lazily from CDN (same pattern as the old html2pdf loader).

**Tech Stack:** pdfmake 0.2.7 (CDN), marked.js lexer (already bundled), highlight.js (already bundled), Vitest for unit tests.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/preview.js` | Modify | Export `slugify` so blockRenderer can reuse it |
| `src/pdf/loader.js` | Create | Lazy CDN loader for pdfmake + vfs_fonts |
| `src/pdf/styleReader.js` | Create | CSS var → pdfmake style config object |
| `src/pdf/inlineRenderer.js` | Create | Inline tokens → pdfmake text array |
| `src/pdf/blockRenderer.js` | Create | Block tokens → pdfmake content array |
| `src/pdf/syntaxHighlight.js` | Create | hljs HTML → pdfmake colored text array |
| `src/pdf/inlineRenderer.test.js` | Create | Unit tests for inline rendering |
| `src/pdf/blockRenderer.test.js` | Create | Unit tests for block rendering |
| `src/pdfExport.js` | Modify | Replace html2pdf with pdfmake, remove prepareClone |

---

### Task 1: Export `slugify` from preview.js

`slugify` is currently a private function in `src/preview.js`. `blockRenderer.js` needs it to set heading `id`s that match the preview's anchor hrefs.

**Files:**
- Modify: `src/preview.js:6-13`

- [ ] **Step 1: Change `function slugify` to `export function slugify`**

In `src/preview.js`, line 6, change:
```javascript
function slugify(text) {
```
to:
```javascript
export function slugify(text) {
```

- [ ] **Step 2: Run tests to confirm nothing broke**

```bash
npm test
```
Expected: 5 tests pass, 0 failures.

- [ ] **Step 3: Commit**

```bash
git add src/preview.js
git commit -m "refactor: export slugify from preview.js"
```

---

### Task 2: Create `src/pdf/loader.js`

Lazy-loads pdfmake and its bundled fonts from CDN. Follows the same pattern as the old `getHtml2Pdf()`.

**Files:**
- Create: `src/pdf/loader.js`

- [ ] **Step 1: Create the file**

```javascript
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
```

- [ ] **Step 2: Run tests**

```bash
npm test
```
Expected: 5 pass (no new tests yet — loader requires a browser DOM, unit-tested implicitly via Task 7).

- [ ] **Step 3: Commit**

```bash
git add src/pdf/loader.js
git commit -m "feat: add pdfmake CDN lazy loader"
```

---

### Task 3: Create `src/pdf/styleReader.js`

Reads all relevant CSS custom properties at export time and converts them into a single config object that both `blockRenderer` and `pdfExport` consume. Units are converted from px to pt (1px = 0.75pt at 96 dpi).

**Files:**
- Create: `src/pdf/styleReader.js`

- [ ] **Step 1: Create the file**

```javascript
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
  }
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```
Expected: 5 pass.

- [ ] **Step 3: Commit**

```bash
git add src/pdf/styleReader.js
git commit -m "feat: add pdfmake style reader from CSS vars"
```

---

### Task 4: Create `src/pdf/inlineRenderer.js` + tests

Converts an array of marked.js inline tokens into a pdfmake text-content array. All inline formatting (bold, italic, strikethrough, code, links, highlight) is handled here.

**Files:**
- Create: `src/pdf/inlineRenderer.js`
- Create: `src/pdf/inlineRenderer.test.js`

- [ ] **Step 1: Write the failing tests**

```javascript
// src/pdf/inlineRenderer.test.js
import { describe, test, expect } from 'vitest'
import { renderInline } from './inlineRenderer.js'

const S = {
  body:       { fontSize: 12, color: '#333333' },
  link:       { color: '#6d28d9', decoration: 'underline' },
  code:       { fontSize: 10, background: '#f4f4f4', color: '#333333' },
  inlineCode: { background: '#eeeeee', color: '#d63e6b' },
}

describe('renderInline', () => {
  test('plain text node', () => {
    const out = renderInline([{ type: 'text', text: 'Hello' }], S)
    expect(out).toEqual([{ text: 'Hello' }])
  })

  test('strong wraps children with bold', () => {
    const out = renderInline([{ type: 'strong', tokens: [{ type: 'text', text: 'Bold' }] }], S)
    expect(out[0].bold).toBe(true)
    expect(out[0].text[0].text).toBe('Bold')
  })

  test('em wraps children with italics', () => {
    const out = renderInline([{ type: 'em', tokens: [{ type: 'text', text: 'It' }] }], S)
    expect(out[0].italics).toBe(true)
  })

  test('del adds lineThrough decoration', () => {
    const out = renderInline([{ type: 'del', tokens: [{ type: 'text', text: 'del' }] }], S)
    expect(out[0].decoration).toBe('lineThrough')
  })

  test('codespan uses monospace font', () => {
    const out = renderInline([{ type: 'codespan', text: 'x++' }], S)
    expect(out[0].font).toBe('Courier')
    expect(out[0].text).toBe('x++')
  })

  test('external link sets link href', () => {
    const out = renderInline([{ type: 'link', href: 'https://example.com', tokens: [{ type: 'text', text: 'Ex' }] }], S)
    expect(out[0].link).toBe('https://example.com')
    expect(out[0].linkToDestination).toBeUndefined()
  })

  test('internal anchor link uses linkToDestination', () => {
    const out = renderInline([{ type: 'link', href: '#my-section', tokens: [{ type: 'text', text: 'Go' }] }], S)
    expect(out[0].linkToDestination).toBe('my-section')
    expect(out[0].link).toBeUndefined()
  })

  test('highlight token gets amber background', () => {
    const out = renderInline([{ type: 'highlight', text: 'mark' }], S)
    expect(out[0].background).toBe('#fef08a')
  })

  test('empty array returns empty array', () => {
    expect(renderInline([], S)).toEqual([])
  })
})
```

- [ ] **Step 2: Run — confirm all 9 tests fail**

```bash
npm test -- src/pdf/inlineRenderer.test.js
```
Expected: FAIL with "Cannot find module './inlineRenderer.js'"

- [ ] **Step 3: Implement `inlineRenderer.js`**

```javascript
// src/pdf/inlineRenderer.js

export function renderInline(tokens, styles) {
  if (!tokens || tokens.length === 0) return []

  return tokens.flatMap((token) => {
    switch (token.type) {
      case 'text':
      case 'escape':
        return { text: token.text || '' }

      case 'strong':
        return { text: renderInline(token.tokens, styles), bold: true }

      case 'em':
        return { text: renderInline(token.tokens, styles), italics: true }

      case 'del':
        return { text: renderInline(token.tokens, styles), decoration: 'lineThrough' }

      case 'codespan':
        return {
          text:       token.text,
          font:       'Courier',
          fontSize:   styles.inlineCode ? (styles.body.fontSize * 0.85) : 10,
          background: styles.inlineCode.background,
          color:      styles.inlineCode.color,
        }

      case 'link': {
        const isAnchor = token.href.startsWith('#')
        return {
          text:              renderInline(token.tokens, styles),
          color:             styles.link.color,
          decoration:        styles.link.decoration,
          ...(isAnchor
            ? { linkToDestination: token.href.slice(1) }
            : { link: token.href }),
        }
      }

      case 'highlight':
        return { text: token.text, background: '#fef08a', color: '#713f12' }

      case 'softbreak':
      case 'br':
        return { text: '\n' }

      case 'image':
        // Images in inline context (e.g. inside a paragraph)
        return { text: `[image: ${token.text || token.href}]`, color: '#888888', italics: true }

      default:
        return { text: token.raw || '' }
    }
  })
}
```

- [ ] **Step 4: Run tests — confirm all 9 pass**

```bash
npm test -- src/pdf/inlineRenderer.test.js
```
Expected: 9 pass, 0 failures.

- [ ] **Step 5: Run full suite**

```bash
npm test
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/pdf/inlineRenderer.js src/pdf/inlineRenderer.test.js
git commit -m "feat: inline token → pdfmake renderer with tests"
```

---

### Task 5: Create `src/pdf/syntaxHighlight.js`

Parses the HTML string that `hljs.highlight()` returns and converts `<span class="hljs-*">` elements into pdfmake colored text objects. The color map matches the GitHub Light / GitHub Dark themes already used in the preview.

**Files:**
- Create: `src/pdf/syntaxHighlight.js`

- [ ] **Step 1: Create the file**

```javascript
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
```

- [ ] **Step 2: Run tests**

```bash
npm test
```
Expected: all pass (no unit tests for this file — it depends on `DOMParser` which is browser-only; covered by visual smoke-test in Task 7).

- [ ] **Step 3: Commit**

```bash
git add src/pdf/syntaxHighlight.js
git commit -m "feat: hljs HTML → pdfmake colored text for code blocks"
```

---

### Task 6: Create `src/pdf/blockRenderer.js` + tests

Walks marked.js block tokens and returns a flat pdfmake content array. Imports `renderInline` and `highlightCode`. Every content object either renders directly or contains a pdfmake `stack` / `table` for multi-block elements.

**Files:**
- Create: `src/pdf/blockRenderer.js`
- Create: `src/pdf/blockRenderer.test.js`

- [ ] **Step 1: Write the failing tests**

```javascript
// src/pdf/blockRenderer.test.js
import { describe, test, expect } from 'vitest'
import { renderTokens } from './blockRenderer.js'

const S = {
  body:       { fontSize: 12, color: '#333333' },
  headings:   {
    1: { fontSize: 27, color: '#111111', bold: true, marginTop: 14, marginBottom: 4 },
    2: { fontSize: 21, color: '#222222', bold: true, marginTop: 12, marginBottom: 4 },
  },
  link:       { color: '#6d28d9', decoration: 'underline' },
  code:       { background: '#f4f4f4', color: '#333333', fontSize: 10 },
  inlineCode: { background: '#eeeeee', color: '#d63e6b' },
  blockquote: { border: '#6d28d9', background: '#f5f0ff' },
  checkbox:   { color: '#6d28d9' },
  contentWidth: 460,
  bgColor:    '#ffffff',
}

describe('renderTokens', () => {
  test('heading gets id from slugified text', () => {
    const tokens = [{ type: 'heading', depth: 1, text: 'Hello World', tokens: [{ type: 'text', text: 'Hello World' }] }]
    const out = renderTokens(tokens, S)
    expect(out[0].id).toBe('hello-world')
  })

  test('heading depth 2 uses h2 style', () => {
    const tokens = [{ type: 'heading', depth: 2, text: 'Sub', tokens: [{ type: 'text', text: 'Sub' }] }]
    const out = renderTokens(tokens, S)
    expect(out[0].fontSize).toBe(S.headings[2].fontSize)
    expect(out[0].bold).toBe(true)
  })

  test('hr produces a canvas line', () => {
    const out = renderTokens([{ type: 'hr' }], S)
    expect(out[0].canvas).toBeDefined()
    expect(out[0].canvas[0].type).toBe('line')
  })

  test('space produces nothing', () => {
    const out = renderTokens([{ type: 'space' }], S)
    expect(out).toHaveLength(0)
  })

  test('unordered list uses ul key', () => {
    const tokens = [{
      type: 'list', ordered: false,
      items: [{ tokens: [{ type: 'text', text: 'A', tokens: [{ type: 'text', text: 'A' }] }], task: false }],
    }]
    const out = renderTokens(tokens, S)
    expect(out[0].ul).toBeDefined()
  })

  test('ordered list uses ol key', () => {
    const tokens = [{
      type: 'list', ordered: true, start: 1,
      items: [{ tokens: [{ type: 'text', text: 'A', tokens: [{ type: 'text', text: 'A' }] }], task: false }],
    }]
    const out = renderTokens(tokens, S)
    expect(out[0].ol).toBeDefined()
  })

  test('code block is wrapped in a table for background', () => {
    const out = renderTokens([{ type: 'code', text: 'x = 1', lang: '' }], S)
    expect(out[0].table).toBeDefined()
  })

  test('empty input returns empty array', () => {
    expect(renderTokens([], S)).toEqual([])
  })
})
```

- [ ] **Step 2: Run — confirm all 8 tests fail**

```bash
npm test -- src/pdf/blockRenderer.test.js
```
Expected: FAIL with "Cannot find module './blockRenderer.js'"

- [ ] **Step 3: Implement `blockRenderer.js`**

```javascript
// src/pdf/blockRenderer.js
import { slugify }      from '../preview.js'
import { renderInline } from './inlineRenderer.js'
import { highlightCode } from './syntaxHighlight.js'

/** Recursively render any token array (block-level). */
export function renderTokens(tokens, styles, isDark = false) {
  if (!tokens || tokens.length === 0) return []
  return tokens.flatMap((token) => renderBlock(token, styles, isDark)).filter(Boolean)
}

function renderBlock(token, styles, isDark) {
  switch (token.type) {

    case 'heading': {
      const hs = styles.headings[token.depth] || styles.headings[6]
      return {
        text:         renderInline(token.tokens, styles),
        fontSize:     hs.fontSize,
        color:        hs.color,
        bold:         hs.bold,
        id:           slugify(token.text),
        marginTop:    hs.marginTop,
        marginBottom: hs.marginBottom,
      }
    }

    case 'paragraph':
      return {
        text:         renderInline(token.tokens, styles),
        fontSize:     styles.body.fontSize,
        color:        styles.body.color,
        marginBottom: 6,
      }

    case 'code': {
      const textItems = token.text
        ? highlightCode(token.text, token.lang || '', styles.code.color, isDark)
        : [{ text: '' }]
      return {
        table: {
          widths: ['*'],
          body: [[{
            stack: [{ text: textItems, font: 'Courier', fontSize: styles.code.fontSize, preserveLeadingSpaces: true }],
            fillColor: styles.code.background,
            border:    [false, false, false, false],
            margin:    [10, 8, 10, 8],
          }]],
        },
        margin: [0, 6, 0, 6],
      }
    }

    case 'blockquote': {
      const inner = renderTokens(token.tokens, styles, isDark)
      return {
        table: {
          widths: [3, '*'],
          body: [[
            { border: [false, false, false, false], fillColor: styles.blockquote.border, text: ' ' },
            { border: [false, false, false, false], stack: inner, margin: [10, 4, 0, 4],
              fillColor: styles.blockquote.background },
          ]],
        },
        layout: 'noBorders',
        margin: [0, 6, 0, 6],
      }
    }

    case 'list': {
      const items = token.items.map((item) => renderListItem(item, styles, isDark))
      return token.ordered
        ? { ol: items, fontSize: styles.body.fontSize, color: styles.body.color, marginBottom: 6 }
        : { ul: items, fontSize: styles.body.fontSize, color: styles.body.color, marginBottom: 6 }
    }

    case 'table': {
      const headerRow = token.header.map((cell) => ({
        text:      renderInline(cell.tokens, styles),
        bold:      true,
        fillColor: styles.code.background,
        fontSize:  styles.body.fontSize,
        margin:    [4, 3, 4, 3],
      }))
      const dataRows = token.rows.map((row) =>
        row.map((cell) => ({
          text:     renderInline(cell.tokens, styles),
          fontSize: styles.body.fontSize,
          margin:   [4, 3, 4, 3],
        }))
      )
      return {
        table: {
          headerRows: 1,
          widths:     token.header.map(() => '*'),
          body:       [headerRow, ...dataRows],
        },
        margin: [0, 6, 0, 6],
      }
    }

    case 'hr':
      return {
        canvas: [{
          type:      'line',
          x1:        0, y1: 0,
          x2:        styles.contentWidth, y2: 0,
          lineWidth: 1,
          lineColor: '#cccccc',
        }],
        margin: [0, 10, 0, 10],
      }

    case 'space':
      return null  // filtered out in renderTokens

    default:
      // Passthrough for unknown tokens — render raw text if available
      return token.text
        ? { text: token.text, fontSize: styles.body.fontSize, color: styles.body.color }
        : null
  }
}

function renderListItem(item, styles, isDark) {
  // GFM task list item
  if (item.task) {
    const mark = item.checked ? '☑ ' : '☐ '
    const color = item.checked ? styles.checkbox.color : '#888888'
    const inlineTokens = item.tokens?.[0]?.tokens || []
    return {
      text: [
        { text: mark, color, bold: true },
        ...renderInline(inlineTokens, styles),
      ],
      fontSize: styles.body.fontSize,
    }
  }

  // Regular list item — may have sub-lists
  const paragraphTokens = item.tokens.filter((t) => t.type !== 'list')
  const subListTokens   = item.tokens.filter((t) => t.type === 'list')

  const inlineContent = paragraphTokens.flatMap((t) =>
    t.tokens ? renderInline(t.tokens, styles) : [{ text: t.text || '' }]
  )

  if (subListTokens.length === 0) {
    return { text: inlineContent, fontSize: styles.body.fontSize }
  }

  return {
    stack: [
      { text: inlineContent, fontSize: styles.body.fontSize },
      ...renderTokens(subListTokens, styles, isDark),
    ],
  }
}
```

- [ ] **Step 4: Run tests — confirm all 8 pass**

```bash
npm test -- src/pdf/blockRenderer.test.js
```
Expected: 8 pass, 0 failures.

- [ ] **Step 5: Run full suite**

```bash
npm test
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/pdf/blockRenderer.js src/pdf/blockRenderer.test.js
git commit -m "feat: block token → pdfmake renderer with tests"
```

---

### Task 7: Update `src/pdfExport.js` — wire pdfmake, remove html2pdf

Replace the html2canvas/html2pdf pipeline with the new renderer. The UI (iframe preview, download button, close button) stays identical; only `startExport()` changes. `prepareClone` is deleted entirely.

**Files:**
- Modify: `src/pdfExport.js` (full rewrite of the export logic)

- [ ] **Step 1: Rewrite `src/pdfExport.js`**

```javascript
// src/pdfExport.js
import { marked }           from 'marked'
import { getPdfMake }       from './pdf/loader.js'
import { readPdfStyles }    from './pdf/styleReader.js'
import { renderTokens }     from './pdf/blockRenderer.js'

const exportBtn  = document.getElementById('pdf-export-btn')
const previewPane = document.getElementById('preview-pane')
const preview    = document.getElementById('preview')

let pdfBlobUrl = null
let pdfIframe  = null

// ── Filename from first H1 ─────────────────────────────────────────────────
function getPdfFilename() {
  const val   = document.getElementById('editor')?.value || ''
  const match = val.match(/^#\s+(.+)/m)
  if (!match) return 'document.pdf'
  return match[1]
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60) + '.pdf'
}

// ── Build pdfmake docDefinition ────────────────────────────────────────────
function buildDocDefinition(markdown, styles) {
  const isDark  = document.documentElement.getAttribute('data-theme') === 'dark'
  const tokens  = marked.lexer(markdown)
  const content = renderTokens(tokens, styles, isDark)

  const docDef = {
    content,
    pageSize:    'A4',
    pageMargins: styles.pageMargins,
    defaultStyle: {
      font:     'Roboto',
      fontSize: styles.body.fontSize,
      color:    styles.body.color,
      lineHeight: 1.4,
    },
  }

  // Background color (only set if non-white to keep file size smaller)
  if (styles.bgColor && styles.bgColor !== '#ffffff') {
    docDef.background = () => ({
      canvas: [{
        type:      'rect',
        x: 0, y: 0,
        w: 595.28, h: 841.89,
        color:     styles.bgColor,
      }],
    })
  }

  return docDef
}

// ── PDF mode UI ────────────────────────────────────────────────────────────
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
  link.href     = pdfBlobUrl
  link.download = getPdfFilename()
  link.click()
}

// ── Export ─────────────────────────────────────────────────────────────────
async function startExport() {
  exportBtn.textContent = '...'
  exportBtn.disabled    = true

  try {
    const pdfMakeLib = await getPdfMake()
    const markdown   = document.getElementById('editor').value
    const styles     = readPdfStyles()
    const docDef     = buildDocDefinition(markdown, styles)

    pdfMakeLib.createPdf(docDef).getBlob((blob) => {
      pdfBlobUrl            = URL.createObjectURL(blob)
      exportBtn.disabled    = false
      enterPdfMode()
    })
  } catch (err) {
    console.error('PDF export failed:', err)
    exportBtn.textContent = 'PDF Export'
    exportBtn.disabled    = false
  }
}

export function initPdfExport() {
  exportBtn.addEventListener('click', startExport)
}
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
```
Expected: all tests pass.

- [ ] **Step 3: Start dev server and do a smoke test**

```bash
npm run dev
```

Open `http://localhost:5173`. Click **PDF Export**. Verify:
- PDF loads in the iframe (no blank page)
- Headings are visible with correct font size
- Body text is readable
- Code blocks have a background
- TOC links (if present) are clickable and scroll to the correct heading in the PDF viewer

- [ ] **Step 4: Commit**

```bash
git add src/pdfExport.js
git commit -m "feat: replace html2pdf with pdfmake AST renderer"
```

- [ ] **Step 5: Remove the html2pdf CDN fallback from `index.html` (if it was added as a script tag)**

Check `index.html` for any `<script src="...html2pdf...">` tags and remove them. The new loader handles CDN fetching on demand.

```bash
grep -n "html2pdf" index.html
```
Expected: no matches (it was loaded dynamically, not as a static tag).

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: remove html2pdf remnants, pdfmake migration complete"
```
