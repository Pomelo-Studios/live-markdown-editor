// src/pdf/inlineRenderer.js

/**
 * Apply a style as default to all items (item's own properties take priority).
 * Recurses into array `text` so nested formatting also gets the style.
 * Returns a flat array — pdfmake renders each item individually.
 */
function applyStyle(items, style) {
  return items.map(item => {
    const merged = { ...style, ...item }
    if (Array.isArray(merged.text)) {
      merged.text = applyStyle(merged.text, style)
    }
    return merged
  })
}

export function renderInline(tokens, styles) {
  if (!tokens || tokens.length === 0) return []

  return tokens.flatMap((token) => {
    switch (token.type) {
      case 'text':
      case 'escape':
        return { text: token.text || '' }

      // pdfmake doesn't cascade defaultStyle.font to inline items in text arrays,
      // so bold/italic nodes must carry an explicit font name or pdfmake can't
      // locate the correct font variant. 'Roboto' is the body font for all non-code text.
      case 'strong':
        return applyStyle(renderInline(token.tokens, styles), { bold: true, font: 'Roboto' })

      case 'em':
        return applyStyle(renderInline(token.tokens, styles), { italics: true, font: 'Roboto' })

      case 'del':
        return applyStyle(renderInline(token.tokens, styles), { decoration: 'lineThrough', font: 'Roboto' })

      case 'codespan':
        return {
          text:       `\u00A0${token.text}\u00A0`,
          fontSize:   styles.inlineCode ? (styles.body.fontSize * 0.85) : 10,
          background: styles.inlineCode.background,
          color:      styles.inlineCode.color,
          ...(styles.hasFiraCode ? { font: 'FiraCode' } : {}),
        }

      case 'link': {
        // Apply link destination + color to every leaf so pdfmake renders them clickable.
        const isAnchor = token.href.startsWith('#')
        const dest = isAnchor
          ? { linkToDestination: token.href.slice(1) }
          : { link: token.href }
        return applyStyle(renderInline(token.tokens, styles), {
          color:      styles.link.color,
          decoration: styles.link.decoration,
          ...dest,
        })
      }

      case 'highlight':
        return { text: `\u00A0${token.text}\u00A0`, background: '#fef08a', color: '#713f12' }

      case 'softbreak':
      case 'br':
        return { text: '\n' }

      case 'image':
        return { text: `[image: ${token.text || token.href}]`, color: '#888888', italics: true }

      default:
        return { text: token.raw || '' }
    }
  })
}
