// src/pdf/blockRenderer.js
import { slugify }        from '../preview.js'
import { renderInline }   from './inlineRenderer.js'
import { highlightCode }  from './syntaxHighlight.js'

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
            stack: [{ text: textItems, fontSize: styles.code.fontSize, preserveLeadingSpaces: true }],
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
