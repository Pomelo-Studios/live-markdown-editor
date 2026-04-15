// src/pdf/blockRenderer.js
import { slugify }        from '../preview.js'
import { renderInline }   from './inlineRenderer.js'
import { highlightCode }  from './syntaxHighlight.js'

/**
 * Apply a style as defaults to all items (item's own props take priority).
 * Recurses into array `text` to handle nested inline nodes.
 * Used to push heading bold/color down to leaf nodes because pdfmake
 * doesn't cascade block-level styles through text arrays reliably.
 */
function propagateToLeaves(items, style) {
  return items.map(item => {
    const merged = { ...style, ...item }
    if (Array.isArray(merged.text)) {
      merged.text = propagateToLeaves(merged.text, style)
    }
    return merged
  })
}

/** Recursively render any token array (block-level). */
export function renderTokens(tokens, styles, isDark = false) {
  if (!tokens || tokens.length === 0) return []
  return tokens.flatMap((token) => renderBlock(token, styles, isDark)).filter(Boolean)
}

function renderBlock(token, styles, isDark) {
  switch (token.type) {

    case 'heading': {
      const hs = styles.headings[token.depth] || styles.headings[6]
      // Push heading color + bold down to every leaf so pdfmake renders them correctly
      const headingStyle = { bold: hs.bold, color: hs.color }
      const items = propagateToLeaves(renderInline(token.tokens, styles), headingStyle)
      return [
        { text: '', id: slugify(token.text), fontSize: 0.01, margin: [0, 0, 0, 0] },
        {
          text:         items,
          fontSize:     hs.fontSize,
          bold:         hs.bold,
          marginTop:    hs.marginTop,
          marginBottom: hs.marginBottom,
        },
      ]
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
      return {
        table: {
          widths: [3, '*'],
          body: [[
            {
              border:    [false, false, false, false],
              fillColor: styles.blockquote.border,
              text:      '',
              margin:    [0, 0, 0, 0],
            },
            {
              border:    [false, false, false, false],
              stack:     inner,
              margin:    [10, 4, 6, 4],
              fillColor: styles.blockquote.background || null,
            },
          ]],
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
      const headerRow = token.header.map((cell) => ({
        text:      renderInline(cell.tokens, styles),
        bold:      true,
        color:     styles.headings[3]?.color || styles.body.color,
        fillColor: headerBg,
        fontSize:  styles.body.fontSize,
        margin:    [6, 5, 6, 5],
      }))
      const dataRows = token.rows.map((row) =>
        row.map((cell) => ({
          text:     renderInline(cell.tokens, styles),
          fontSize: styles.body.fontSize,
          color:    styles.body.color,
          margin:   [6, 4, 6, 4],
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

function renderListItem(item, styles, isDark) {
  if (item.task) {
    const mark  = item.checked ? '[x] ' : '[ ] '
    const color = item.checked ? styles.checkbox.color : '#888888'
    const firstToken    = item.tokens?.[0]
    const inlineTokens  = firstToken?.tokens || []
    const textFallback  = firstToken?.text || ''
    const inlineContent = inlineTokens.length > 0
      ? renderInline(inlineTokens, styles)
      : [{ text: textFallback }]
    return {
      text: [
        { text: mark, color, bold: true },
        ...inlineContent,
      ],
      fontSize:     styles.body.fontSize,
      marginBottom: 3,
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
