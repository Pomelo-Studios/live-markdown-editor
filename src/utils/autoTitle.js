// src/utils/autoTitle.js

/**
 * Derive a display title from markdown content.
 * Rules (in priority order):
 *  1. First line starting with exactly one '#' followed by space (H1 only) → text after the hash
 *  2. First non-empty line (after trim)
 *  3. "Untitled"
 * Then: strip markdown punctuation, truncate to 40 chars.
 * @param {string} content
 * @returns {string}
 */
export function autoTitle(content) {
  if (!content || !content.trim()) return 'Untitled'

  const lines = content.split('\n')

  // Priority 1: first line starting with exactly one '#' followed by space (H1 only, not ##)
  const h1Match = lines.reduce((found, l) => {
    if (found !== null) return found
    const m = l.match(/^#(?!#)\s+(.*)$/)
    return m ? m[1] : null
  }, null)
  let raw = h1Match !== null ? h1Match : null

  // Priority 2: first non-empty non-heading line (skip ##-###### lines)
  if (!raw) {
    raw = lines.find((l) => {
      const t = l.trim()
      if (!t) return false
      // Skip non-H1 heading lines (##, ###, etc.) — look for plain text
      if (/^#{2,}\s/.test(t)) return false
      return true
    }) || null

    // If no plain-text line found, fall back to first non-empty line (strip leading #s)
    if (!raw) {
      const firstNonEmpty = lines.find((l) => l.trim() !== '') || null
      raw = firstNonEmpty ? firstNonEmpty.replace(/^#+\s*/, '') : null
    }
  }

  if (!raw || !raw.trim()) return 'Untitled'

  // Strip [text](url) -> text
  raw = raw.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')

  // Strip ==highlight== markers
  raw = raw.replace(/==([^=]*)==/g, '$1')

  // Strip inline backtick code spans: `code` -> code
  raw = raw.replace(/`([^`]*)`/g, '$1')

  // Strip leading/trailing markdown punctuation: *, _
  raw = raw.replace(/^[*_\s]+/, '').replace(/[*_\s]+$/, '')

  raw = raw.trim()
  if (!raw) return 'Untitled'

  if (raw.length > 40) return raw.slice(0, 40) + '…'
  return raw
}
