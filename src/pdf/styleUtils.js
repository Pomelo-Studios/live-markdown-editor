// src/pdf/styleUtils.js

/**
 * Apply style as defaults to all leaf text items (item's own props take priority).
 * Recurses into array `text` so nested formatting also receives the style.
 * Used to push block-level props (bold, color, font) down to inline nodes because
 * pdfmake doesn't cascade block-level styles through text arrays reliably.
 */
export function applyStyleToLeaves(items, style) {
  return items.map((item) => {
    const merged = { ...style, ...item }
    if (Array.isArray(merged.text)) {
      merged.text = applyStyleToLeaves(merged.text, style)
    }
    return merged
  })
}
