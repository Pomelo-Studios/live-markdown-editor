// src/formatToolbar.js

let _onInput = null
let _savedStart = 0
let _savedEnd = 0

// ── Build toolbar DOM ──────────────────────────────────────────────────────────

const toolbar = document.createElement('div')
toolbar.className = 'format-toolbar'
toolbar.innerHTML = `
  <button class="fmt-btn fmt-btn--bold"   data-action="bold"       title="Bold"><b>B</b></button>
  <button class="fmt-btn fmt-btn--italic" data-action="italic"     title="Italic"><i>I</i></button>
  <button class="fmt-btn fmt-btn--strike" data-action="strike"     title="Strikethrough">S</button>
  <button class="fmt-btn fmt-btn--mono"   data-action="inlinecode" title="Inline code">&lt;/&gt;</button>
  <div class="fmt-sep"></div>
  <button class="fmt-btn" data-action="h1" title="Heading 1">H1</button>
  <button class="fmt-btn" data-action="h2" title="Heading 2">H2</button>
  <button class="fmt-btn" data-action="h3" title="Heading 3">H3</button>
  <button class="fmt-btn" data-action="h4" title="Heading 4">H4</button>
  <button class="fmt-btn" data-action="h5" title="Heading 5">H5</button>
  <button class="fmt-btn" data-action="h6" title="Heading 6">H6</button>
  <div class="fmt-sep"></div>
  <button class="fmt-btn" data-action="blockquote" title="Blockquote">❝</button>
  <button class="fmt-btn" data-action="bullet"     title="Bullet list">•</button>
  <button class="fmt-btn" data-action="checklist"  title="Checklist">☑</button>
  <button class="fmt-btn" data-action="codeblock"  title="Code block">{ }</button>
  <div class="fmt-sep"></div>
  <button class="fmt-btn" data-action="link"  title="Insert link">⛓</button>
  <button class="fmt-btn" data-action="table" title="Insert table">⊞</button>
  <div class="fmt-link-group">
    <input type="text" class="fmt-url-input" placeholder="https://..." />
    <button class="fmt-url-ok"     title="Apply">✓</button>
    <button class="fmt-url-cancel" title="Cancel">✕</button>
  </div>
`
document.body.appendChild(toolbar)

const linkGroup  = toolbar.querySelector('.fmt-link-group')
const urlInput   = toolbar.querySelector('.fmt-url-input')
const urlOk      = toolbar.querySelector('.fmt-url-ok')
const urlCancel  = toolbar.querySelector('.fmt-url-cancel')

// ── Show / Hide ────────────────────────────────────────────────────────────────

function showToolbar(anchorX, anchorY) {
  toolbar.style.display = 'flex'
  // Let browser lay it out so we can read dimensions
  const tw = toolbar.offsetWidth
  const th = toolbar.offsetHeight

  const margin = 8
  const vw = window.innerWidth
  let x = anchorX - tw / 2
  x = Math.max(margin, Math.min(x, vw - tw - margin))

  const spaceAbove = anchorY - th - 14
  const below = spaceAbove < margin
  let y = below ? anchorY + 14 : anchorY - th - 14

  toolbar.classList.toggle('fmt-below', below)
  toolbar.style.left = x + 'px'
  toolbar.style.top  = y + 'px'
  // Position arrow relative to toolbar left edge
  toolbar.style.setProperty('--fmt-arrow-x', (anchorX - x) + 'px')
}

function hideToolbar() {
  toolbar.style.display = 'none'
  toolbar.classList.remove('fmt-below')
  closeLinkInput()
}

// ── Link input panel ───────────────────────────────────────────────────────────

function openLinkInput() {
  linkGroup.classList.add('active')
  urlInput.value = ''
  urlInput.focus()
}

function closeLinkInput() {
  linkGroup.classList.remove('active')
  urlInput.value = ''
}

// ── Text manipulation helpers ──────────────────────────────────────────────────

function applyChange(textarea, newValue, newStart, newEnd) {
  textarea.value = newValue
  textarea.selectionStart = newStart
  textarea.selectionEnd   = newEnd
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  textarea.focus()
}

/** Wrap selected text with a prefix and suffix. Toggles off if already wrapped. */
function wrapInline(textarea, pre, suf) {
  const { selectionStart: s, selectionEnd: e, value } = textarea
  const sel = value.slice(s, e)
  if (sel.startsWith(pre) && sel.endsWith(suf)) {
    // Toggle off
    const inner = sel.slice(pre.length, sel.length - suf.length)
    applyChange(textarea, value.slice(0, s) + inner + value.slice(e), s, s + inner.length)
  } else {
    const replacement = pre + sel + suf
    applyChange(textarea, value.slice(0, s) + replacement + value.slice(e), s + pre.length, s + pre.length + sel.length)
  }
}

/** Prefix each selected line with a string. Toggles off if all lines already have it. */
function prefixLines(textarea, prefix) {
  const { selectionStart: s, selectionEnd: e, value } = textarea
  const before = value.slice(0, s)
  const after  = value.slice(e)
  const lineStart = before.lastIndexOf('\n') + 1
  const chunk = value.slice(lineStart, e)
  const lines = chunk.split('\n')
  const allPrefixed = lines.every((l) => l.startsWith(prefix))
  const newLines = allPrefixed
    ? lines.map((l) => l.slice(prefix.length))
    : lines.map((l) => prefix + l)
  const newChunk = newLines.join('\n')
  const delta = newChunk.length - chunk.length
  applyChange(
    textarea,
    value.slice(0, lineStart) + newChunk + after,
    s + (allPrefixed ? -Math.min(prefix.length, s - lineStart) : prefix.length),
    e + delta
  )
}

/** Replace the selected lines with a heading (or remove heading if same level). */
function applyHeading(textarea, level) {
  const { selectionStart: s, selectionEnd: e, value } = textarea
  const before    = value.slice(0, s)
  const lineStart = before.lastIndexOf('\n') + 1
  const lineEnd   = value.indexOf('\n', e) === -1 ? value.length : value.indexOf('\n', e)
  const line      = value.slice(lineStart, lineEnd)

  const prefix  = '#'.repeat(level) + ' '
  const stripped = line.replace(/^#{1,6} /, '')
  const sameLevel = line.startsWith(prefix)
  const newLine  = sameLevel ? stripped : prefix + stripped
  const newValue = value.slice(0, lineStart) + newLine + value.slice(lineEnd)
  const offset   = newLine.length - line.length
  applyChange(textarea, newValue, s + offset, e + offset)
}

/** Wrap selected text (or current line) in a fenced code block. */
function applyCodeBlock(textarea) {
  const { selectionStart: s, selectionEnd: e, value } = textarea
  const sel = value.slice(s, e).trim()
  // Detect if already a code block
  if (sel.startsWith('```') && sel.endsWith('```')) {
    const inner = sel.slice(3, sel.lastIndexOf('```')).replace(/^\n/, '').replace(/\n$/, '')
    applyChange(textarea, value.slice(0, s) + inner + value.slice(e), s, s + inner.length)
    return
  }
  const block = '```\n' + (sel || 'code here') + '\n```'
  applyChange(textarea, value.slice(0, s) + block + value.slice(e), s + 4, s + 4 + (sel || 'code here').length)
}

/** Insert a table. Selected text → first column header. */
function applyTable(textarea) {
  const { selectionStart: s, selectionEnd: e, value } = textarea
  const sel = value.slice(s, e).trim() || 'Column 1'
  const table = [
    `| ${sel} | Column 2 | Column 3 |`,
    `|----------|----------|----------|`,
    `| Cell     | Cell     | Cell     |`,
    `| Cell     | Cell     | Cell     |`,
  ].join('\n')
  // Ensure blank line before and after
  const before = value.slice(0, s)
  const needBefore = before.length > 0 && !before.endsWith('\n\n')
  const prefix = needBefore ? (before.endsWith('\n') ? '\n' : '\n\n') : ''
  const insertion = prefix + table + '\n\n'
  applyChange(
    textarea,
    value.slice(0, s) + insertion + value.slice(e),
    s + insertion.length,
    s + insertion.length
  )
}

/** Apply a link: [selected text](url) */
function applyLink(textarea, url) {
  const { selectionStart: s, selectionEnd: e, value } = textarea
  const sel = value.slice(s, e) || 'link text'
  const replacement = `[${sel}](${url})`
  applyChange(textarea, value.slice(0, s) + replacement + value.slice(e), s, s + replacement.length)
}

// ── Action dispatcher ──────────────────────────────────────────────────────────

function handleAction(action, textarea) {
  // Restore selection (it may have been lost when clicking toolbar)
  textarea.selectionStart = _savedStart
  textarea.selectionEnd   = _savedEnd

  switch (action) {
    case 'bold':       wrapInline(textarea, '**', '**'); break
    case 'italic':     wrapInline(textarea, '_', '_'); break
    case 'strike':     wrapInline(textarea, '~~', '~~'); break
    case 'inlinecode': wrapInline(textarea, '`', '`'); break
    case 'h1': applyHeading(textarea, 1); break
    case 'h2': applyHeading(textarea, 2); break
    case 'h3': applyHeading(textarea, 3); break
    case 'h4': applyHeading(textarea, 4); break
    case 'h5': applyHeading(textarea, 5); break
    case 'h6': applyHeading(textarea, 6); break
    case 'blockquote': prefixLines(textarea, '> '); break
    case 'bullet':     prefixLines(textarea, '- '); break
    case 'checklist':  prefixLines(textarea, '- [ ] '); break
    case 'codeblock':  applyCodeBlock(textarea); break
    case 'table':      applyTable(textarea); hideToolbar(); return
    case 'link':
      openLinkInput()
      return // Don't hide toolbar
    default: break
  }
  hideToolbar()
}

// ── Init ───────────────────────────────────────────────────────────────────────

export function initFormatToolbar(onInput) {
  _onInput = onInput
  const textarea = document.getElementById('editor')

  // Show toolbar on mouse selection
  textarea.addEventListener('mouseup', (e) => {
    const { selectionStart: s, selectionEnd: e2 } = textarea
    if (s === e2) { hideToolbar(); return }
    _savedStart = s
    _savedEnd   = e2
    showToolbar(e.clientX, e.clientY)
  })

  // Show toolbar on keyboard selection
  textarea.addEventListener('keyup', (e) => {
    const { selectionStart: s, selectionEnd: e2 } = textarea
    if (s === e2) { hideToolbar(); return }
    if (!['Shift', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key) && !e.shiftKey) return
    _savedStart = s
    _savedEnd   = e2
    // Position near caret — use textarea bounding rect as fallback
    const rect = textarea.getBoundingClientRect()
    showToolbar(rect.left + rect.width / 2, rect.top + 40)
  })

  // Hide on click outside toolbar + textarea
  document.addEventListener('mousedown', (e) => {
    if (!toolbar.contains(e.target) && e.target !== textarea) {
      hideToolbar()
    }
  })

  // Toolbar button clicks
  toolbar.addEventListener('mousedown', (e) => {
    e.preventDefault() // Prevent textarea losing focus/selection
    const btn = e.target.closest('[data-action]')
    if (!btn) return
    handleAction(btn.dataset.action, textarea)
  })

  // Link URL confirm
  urlOk.addEventListener('mousedown', (e) => {
    e.preventDefault()
    const url = urlInput.value.trim()
    if (!url) return
    textarea.selectionStart = _savedStart
    textarea.selectionEnd   = _savedEnd
    applyLink(textarea, url)
    hideToolbar()
  })

  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const url = urlInput.value.trim()
      if (!url) return
      textarea.selectionStart = _savedStart
      textarea.selectionEnd   = _savedEnd
      applyLink(textarea, url)
      hideToolbar()
    }
    if (e.key === 'Escape') {
      closeLinkInput()
      hideToolbar()
    }
  })

  // Link cancel
  urlCancel.addEventListener('mousedown', (e) => {
    e.preventDefault()
    closeLinkInput()
    hideToolbar()
  })
}
