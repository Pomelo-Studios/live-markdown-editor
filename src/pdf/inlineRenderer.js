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
          text:       `\u00A0${token.text}\u00A0`,
          fontSize:   styles.inlineCode ? (styles.body.fontSize * 0.85) : 10,
          background: styles.inlineCode.background,
          color:      styles.inlineCode.color,
          ...(styles.hasFiraCode ? { font: 'FiraCode' } : {}),
        }

      case 'link': {
        const isAnchor = token.href.startsWith('#')
        const linkColor = styles.link.color
        const children = renderInline(token.tokens, styles).map((child) => ({
          ...child,
          color: linkColor,
        }))
        return {
          text:       children,
          decoration: styles.link.decoration,
          ...(isAnchor
            ? { linkToDestination: token.href.slice(1) }
            : { link: token.href }),
        }
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
