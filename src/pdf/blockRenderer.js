// src/pdf/blockRenderer.js
import { slugify }             from '../utils/slugify.js'
import { renderInline }        from './inlineRenderer.js'
import { highlightCode }       from './syntaxHighlight.js'
import { applyStyleToLeaves }  from './styleUtils.js'

/** Recursively render any token array (block-level). */
export function renderTokens(tokens, styles, isDark = false) {
  if (!tokens || tokens.length === 0) return []
  return tokens.flatMap((token) => renderBlock(token, styles, isDark)).filter(Boolean)
}

function renderBlock(token, styles, isDark) {
  switch (token.type) {

    case 'heading': {
      const hs = styles.headings[token.depth] || styles.headings[6]
      // font: 'Roboto' is required so pdfmake can look up the bold variant —
      // it doesn't cascade defaultStyle.font into inline text-array items.
      const items = applyStyleToLeaves(renderInline(token.tokens, styles), {
        bold:  hs.bold,
        color: hs.color,
        font:  'Roboto',
      })
      return {
        text:         items,
        fontSize:     hs.fontSize,
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
      const codeBlock = {
        text:                  textItems,
        fontSize:              styles.code.fontSize,
        preserveLeadingSpaces: true,
      }
      if (styles.hasFiraCode) codeBlock.font = 'FiraCode'
      return {
        table: {
          widths: ['*'],
          body: [[{
            stack:     [codeBlock],
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
      // Strip first and last child margins so the background fills cleanly.
      if (inner.length > 0) {
        inner[0] = { ...inner[0], marginTop: 0 }
        inner[inner.length - 1] = { ...inner[inner.length - 1], marginBottom: 0 }
      }
      // Single-column layout with a left vLine for a thin CSS-like border-left.
      // Note: do NOT set `border` on the cell — it overrides the layout's line
      // functions and would suppress the left vLine we want.
      const cell = {
        stack:  inner,
        margin: [12, 6, 8, 6],
      }
      if (styles.blockquote.background) cell.fillColor = styles.blockquote.background
      return {
        table: {
          widths: ['*'],
          body:   [[cell]],
        },
        layout: {
          vLineWidth: (i) => (i === 0 ? 3 : 0),
          hLineWidth: () => 0,
          vLineColor: () => styles.blockquote.border,
          paddingLeft:  () => 0,
          paddingRight: () => 0,
          paddingTop:   () => 0,
          paddingBottom:() => 0,
        },
        margin: [0, 6, 0, 6],
      }
    }

    case 'list': {
      const allTasks = token.items.every((item) => item.task)
      if (allTasks) {
        return {
          stack:        token.items.map((item) => renderListItem(item, styles, isDark)),
          marginBottom: 6,
        }
      }
      const items = token.items.map((item) => renderListItem(item, styles, isDark))
      return token.ordered
        ? { ol: items, fontSize: styles.body.fontSize, color: styles.body.color, margin: [15, 0, 0, 6] }
        : { ul: items, fontSize: styles.body.fontSize, color: styles.body.color, margin: [15, 0, 0, 6] }
    }

    case 'table': {
      const borderColor = styles.tableBorder || '#e1e4e8'
      const headerBg    = styles.tableHeader?.background || '#efefef'
      const headerRow = token.header.map((cell) => {
        const base = renderTableCell(cell.tokens, styles)
        return {
          ...base,
          bold:              true,
          color:             styles.headings[3]?.color || styles.body.color,
          fillColor:         headerBg,
          fontSize:          styles.body.fontSize,
          margin:            [6, 5, 6, 5],
          verticalAlignment: 'middle',
        }
      })
      const dataRows = token.rows.map((row) =>
        row.map((cell) => ({
          ...renderTableCell(cell.tokens, styles),
          fontSize:          styles.body.fontSize,
          color:             styles.body.color,
          margin:            [6, 4, 6, 4],
          verticalAlignment: 'middle',
        }))
      )
      return {
        table: {
          headerRows: 1,
          widths:     token.header.map(() => '*'),
          body:       [headerRow, ...dataRows],
        },
        layout: {
          hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 0.5 : 0.3,
          vLineWidth: () => 0.3,
          hLineColor: () => borderColor,
          vLineColor: () => borderColor,
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
      return null

    default:
      return token.text
        ? { text: token.text, fontSize: styles.body.fontSize, color: styles.body.color }
        : null
  }
}

/**
 * Canvas-drawn checkbox sized to match the body font.
 * checked=true  → filled rect with a white ✓ stroke
 * checked=false → outline rect only
 */
function checkboxCanvas(checked, color, fontSize) {
  const size  = Math.round(fontSize * 0.75)
  const x     = 0
  const y     = 0
  const r     = 1.5   // corner radius feel (square — pdfmake canvas has no rounding)
  const shapes = [
    {
      type:      'rect',
      x, y,
      w: size, h: size,
      r:         0,
      lineWidth: 1,
      lineColor: checked ? color : '#aaaaaa',
      color:     checked ? color : null,
    },
  ]
  if (checked) {
    // Simple ✓ tick: two line segments
    const p = size * 0.18
    const mx = x + size * 0.22
    const my = y + size * 0.52
    shapes.push(
      { type: 'line', x1: mx,            y1: my,            x2: mx + size * 0.22, y2: my + size * 0.26, lineWidth: 1.5, lineColor: '#ffffff' },
      { type: 'line', x1: mx + size * 0.22, y1: my + size * 0.26, x2: mx + size * 0.52, y2: my - size * 0.2,  lineWidth: 1.5, lineColor: '#ffffff' },
    )
  }
  return { canvas: shapes, width: size + 4, height: size }
}

/**
 * Detects single-cell checkbox patterns like "[x]" or "[ ]" so table cells
 * can render a canvas checkbox instead of literal bracket text.
 */
function renderTableCell(tokens, styles) {
  if (tokens.length === 1 && tokens[0].type === 'text') {
    const raw = (tokens[0].text || '').trim()
    if (/^\[x\]$/i.test(raw) || /^\[✓\]$/.test(raw)) {
      const box = checkboxCanvas(true, styles.checkbox.color, styles.body.fontSize)
      return { stack: [{ canvas: box.canvas, width: box.width, height: box.height }], alignment: 'center' }
    }
    if (/^\[ \]$/.test(raw) || /^\[_\]$/.test(raw)) {
      const box = checkboxCanvas(false, styles.checkbox.color, styles.body.fontSize)
      return { stack: [{ canvas: box.canvas, width: box.width, height: box.height }], alignment: 'center' }
    }
  }
  return { text: renderInline(tokens, styles) }
}

function renderListItem(item, styles, isDark) {
  if (item.task) {
    // marked emits a leading {type:'checkbox'} token before the text token
    const textToken     = item.tokens.find((t) => t.type === 'text' || t.type === 'paragraph')
    const inlineTokens  = textToken?.tokens || []
    const textFallback  = textToken?.text || item.text || ''
    const inlineContent = inlineTokens.length > 0
      ? renderInline(inlineTokens, styles)
      : [{ text: textFallback }]
    const box = checkboxCanvas(item.checked, styles.checkbox.color, styles.body.fontSize)
    return {
      columns: [
        { canvas: box.canvas, width: box.width, height: box.height, margin: [0, 2, 4, 0] },
        { text: inlineContent, fontSize: styles.body.fontSize, color: styles.body.color, width: '*' },
      ],
      columnGap:    0,
      marginBottom: 5,
    }
  }

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
