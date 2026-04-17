// src/formatToolbar.js
import { debounce } from './utils/debounce.js'
import { slugify } from './utils/slugify.js'

// ── Undo / Redo stack ──────────────────────────────────────────────────────────

const MAX_UNDO = 15
let _undo = []   // [{v, s, e}]
let _redo = []

function snapshotState(textarea) {
  return { v: textarea.value, s: textarea.selectionStart, e: textarea.selectionEnd }
}

function pushUndo(textarea) {
  const state = snapshotState(textarea)
  const last = _undo[_undo.length - 1]
  if (last && last.v === state.v) return
  _undo.push(state)
  _redo = []
  if (_undo.length > MAX_UNDO) _undo.shift()
}

function doUndo(textarea) {
  if (_undo.length <= 1) return
  const cur = _undo.pop()
  _redo.push(cur)
  const prev = _undo[_undo.length - 1]
  applyStateRaw(textarea, prev)
}

function doRedo(textarea) {
  const next = _redo.pop()
  if (!next) return
  _undo.push(next)
  applyStateRaw(textarea, next)
}

function applyStateRaw(textarea, state) {
  textarea.value = state.v
  textarea.selectionStart = state.s
  textarea.selectionEnd   = state.e
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  textarea.focus()
}

// ── Button config ──────────────────────────────────────────────────────────────

const BUTTONS = [
  { action: 'bold',       label: '<b>B</b>',                      title: 'Bold',          cls: 'fmt-btn--bold'      },
  { action: 'italic',     label: '<i>I</i>',                      title: 'Italic',        cls: 'fmt-btn--italic'    },
  { action: 'strike',     label: 'S',                              title: 'Strikethrough', cls: 'fmt-btn--strike'    },
  { action: 'highlight',  label: '<mark class="fmt-hl">H</mark>', title: 'Highlight',     cls: 'fmt-btn--highlight' },
  { action: 'inlinecode', label: '&lt;/&gt;',                    title: 'Inline code',   cls: 'fmt-btn--mono'      },
  null, // separator
  { action: 'h1', label: 'H1', title: 'Heading 1' },
  { action: 'h2', label: 'H2', title: 'Heading 2' },
  { action: 'h3', label: 'H3', title: 'Heading 3' },
  { action: 'h4', label: 'H4', title: 'Heading 4' },
  { action: 'h5', label: 'H5', title: 'Heading 5' },
  { action: 'h6', label: 'H6', title: 'Heading 6' },
  null, // separator
  { action: 'blockquote', label: '❝',   title: 'Blockquote'  },
  { action: 'bullet',     label: '•',   title: 'Bullet list' },
  { action: 'checklist',  label: '☑',   title: 'Checklist'   },
  { action: 'codeblock',  label: '{ }', title: 'Code block'  },
  null, // separator
  { action: 'link',  label: '⛓', title: 'Insert link'  },
  { action: 'table', label: '⊞', title: 'Insert table' },
]

const TOC_BUTTON   = { action: 'toc',   label: '☰',  title: 'Insert Table of Contents' }
const EMOJI_BUTTON = { action: 'emoji', label: '😊', title: 'Insert emoji' }

function buildToolbarHTML(withToc) {
  const extra = withToc ? [null, TOC_BUTTON, null, EMOJI_BUTTON] : []
  const parts = [...BUTTONS, ...extra].map((b) =>
    b === null
      ? '<div class="fmt-sep"></div>'
      : `<button class="fmt-btn${b.cls ? ' ' + b.cls : ''}" data-action="${b.action}" title="${b.title}">${b.label}</button>`
  )
  parts.push(`
    <div class="fmt-link-group">
      <input type="text" class="fmt-url-input" placeholder="https://..." />
      <button class="fmt-url-ok" title="Apply">✓</button>
      <button class="fmt-url-cancel" title="Cancel">✕</button>
    </div>
  `)
  return parts.join('')
}

// ── Emoji picker ───────────────────────────────────────────────────────────────

const EMOJI_CATS = [
  { icon: '😊', name: 'Smileys', list: ['😀','😃','😄','😁','😂','🤣','😊','😇','🥰','😍','😘','😎','🤩','😋','😜','🤔','😔','😢','😭','😱','🥳','🤗','😴','🥺','😡','😈','🫠','🫡','🥸','🤯','🤭','🤫','🥹','😶‍🌫️'] },
  { icon: '👋', name: 'Hands',   list: ['👋','✋','👌','✌️','🤞','👍','👎','👏','🙏','🤝','💪','☝️','👆','👇','👈','👉','🙌','✍️','🫂','🤜','🤛','🫶','🫵','🤲'] },
  { icon: '❤️', name: 'Hearts',  list: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💗','💖','💘','💝','🫀','♥️','💟','❤️‍🔥','❤️‍🩹'] },
  { icon: '✅', name: 'Symbols', list: ['✅','❌','⭕','❓','❗','⚠️','💯','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🔔','📢','💬','💭','🎯','⭐','🌟','✨','🔥','💥','🌈','🎊','🎉','🆕','🔝','🔜','🔛','🔚','🔙'] },
  { icon: '📝', name: 'Work',    list: ['📝','✏️','📊','📈','📉','💡','🔧','⚙️','🛠','📌','📍','🗂','📁','📂','📚','📖','📜','🗒','🗓','📅','📆','⏰','⏱','🔍','🔎','📋','🏆','🥇','🎖','🏅','💼','🖥','📑','🗃','🗄','📮'] },
  { icon: '🚀', name: 'Tech',    list: ['🚀','💻','🖥','📱','💾','📷','🎥','📺','🔋','🧪','🔬','🧬','🤖','👾','🎮','🕹','⌨️','🖱','📡','🔌','🧲','⚡','🌐','🔐','🔑','🛡','🔒','☁️','🌍','🛰','🔭','🧫'] },
]

let _emojiPicker   = null
let _emojiActiveCat = 0
let _emojiTextarea = null

function buildEmojiPicker() {
  const el = document.createElement('div')
  el.className = 'emoji-picker'
  el.setAttribute('aria-label', 'Emoji picker')

  const tabs = document.createElement('div')
  tabs.className = 'emoji-picker__tabs'
  EMOJI_CATS.forEach((cat, i) => {
    const btn = document.createElement('button')
    btn.className = 'emoji-tab' + (i === 0 ? ' active' : '')
    btn.dataset.cat = String(i)
    btn.title = cat.name
    btn.textContent = cat.icon
    tabs.appendChild(btn)
  })

  const grid = document.createElement('div')
  grid.className = 'emoji-picker__grid'

  el.appendChild(tabs)
  el.appendChild(grid)
  document.body.appendChild(el)

  el.addEventListener('mousedown', (e) => {
    e.preventDefault() // keep textarea focus

    const tab = e.target.closest('.emoji-tab')
    if (tab) {
      _emojiActiveCat = parseInt(tab.dataset.cat)
      el.querySelectorAll('.emoji-tab').forEach((t) => t.classList.toggle('active', t === tab))
      renderEmojiGrid(el, _emojiActiveCat)
      return
    }

    const emojiBtn = e.target.closest('.emoji-btn')
    if (emojiBtn && _emojiTextarea) {
      insertEmoji(_emojiTextarea, emojiBtn.textContent)
      closeEmojiPicker()
    }
  })

  return el
}

function renderEmojiGrid(picker, catIdx) {
  const grid = picker.querySelector('.emoji-picker__grid')
  grid.innerHTML = EMOJI_CATS[catIdx].list
    .map((e) => `<button class="emoji-btn" title="${e}">${e}</button>`)
    .join('')
}

function openEmojiPicker(anchorBtn) {
  if (!_emojiPicker) _emojiPicker = buildEmojiPicker()
  renderEmojiGrid(_emojiPicker, _emojiActiveCat)

  const rect   = anchorBtn.getBoundingClientRect()
  const w      = 280
  const margin = 6
  let left = rect.left + rect.width / 2 - w / 2
  left = Math.max(margin, Math.min(left, window.innerWidth - w - margin))
  _emojiPicker.style.left = left + 'px'
  _emojiPicker.style.top  = (rect.bottom + 6) + 'px'
  _emojiPicker.classList.add('active')
}

function closeEmojiPicker() {
  _emojiPicker?.classList.remove('active')
}

function toggleEmojiPicker(anchorBtn) {
  if (_emojiPicker?.classList.contains('active')) {
    closeEmojiPicker()
  } else {
    openEmojiPicker(anchorBtn)
  }
}

function insertEmoji(textarea, emoji) {
  const { selectionStart: s, selectionEnd: e, value: v } = textarea
  pushUndo(textarea)
  applyChange(textarea, v.slice(0, s) + emoji + v.slice(e), s + [...emoji].length, s + [...emoji].length)
}

// ── Text manipulation ──────────────────────────────────────────────────────────

function applyChange(textarea, newValue, newStart, newEnd) {
  textarea.value = newValue
  textarea.selectionStart = newStart
  textarea.selectionEnd   = newEnd
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  textarea.focus()
}

function wrapInline(textarea, pre, suf) {
  const { selectionStart: s, selectionEnd: e, value: v } = textarea
  const sel = v.slice(s, e)
  if (sel.startsWith(pre) && sel.endsWith(suf)) {
    const inner = sel.slice(pre.length, sel.length - suf.length)
    applyChange(textarea, v.slice(0, s) + inner + v.slice(e), s, s + inner.length)
  } else {
    const rep = pre + sel + suf
    applyChange(textarea, v.slice(0, s) + rep + v.slice(e), s + pre.length, s + pre.length + sel.length)
  }
}

function prefixLines(textarea, prefix) {
  const { selectionStart: s, selectionEnd: e, value: v } = textarea
  const lineStart = v.lastIndexOf('\n', s - 1) + 1
  const chunk = v.slice(lineStart, e)
  const lines = chunk.split('\n')
  const allPrefixed = lines.every((l) => l.startsWith(prefix))
  const newLines = allPrefixed ? lines.map((l) => l.slice(prefix.length)) : lines.map((l) => prefix + l)
  const newChunk = newLines.join('\n')
  const delta = newChunk.length - chunk.length
  const newS = allPrefixed ? Math.max(lineStart, s - prefix.length) : s + prefix.length
  applyChange(textarea, v.slice(0, lineStart) + newChunk + v.slice(e), newS, e + delta)
}

function applyHeading(textarea, level) {
  const { selectionStart: s, selectionEnd: e, value: v } = textarea
  const lineStart = v.lastIndexOf('\n', s - 1) + 1
  const lineEnd = v.indexOf('\n', e) === -1 ? v.length : v.indexOf('\n', e)
  const line = v.slice(lineStart, lineEnd)
  const prefix = '#'.repeat(level) + ' '
  const stripped = line.replace(/^#{1,6} /, '')
  const sameLevel = line.startsWith(prefix)
  const newLine = sameLevel ? stripped : prefix + stripped
  const delta = newLine.length - line.length
  applyChange(textarea, v.slice(0, lineStart) + newLine + v.slice(lineEnd), s + delta, e + delta)
}

function applyCodeBlock(textarea) {
  const { selectionStart: s, selectionEnd: e, value: v } = textarea
  const sel = v.slice(s, e).trim()
  if (sel.startsWith('```') && sel.endsWith('```')) {
    const inner = sel.slice(3, sel.lastIndexOf('```')).replace(/^\n/, '').replace(/\n$/, '')
    applyChange(textarea, v.slice(0, s) + inner + v.slice(e), s, s + inner.length)
    return
  }
  const placeholder = sel || 'code here'
  const block = '```\n' + placeholder + '\n```'
  applyChange(textarea, v.slice(0, s) + block + v.slice(e), s + 4, s + 4 + placeholder.length)
}

function applyTable(textarea) {
  const { selectionStart: s, selectionEnd: e, value: v } = textarea
  const sel = v.slice(s, e).trim() || 'Column 1'
  const tbl = [
    `| ${sel} | Column 2 | Column 3 |`,
    `|----------|----------|----------|`,
    `| Cell     | Cell     | Cell     |`,
    `| Cell     | Cell     | Cell     |`,
  ].join('\n')
  const before = v.slice(0, s)
  const pad = before.length > 0 && !before.endsWith('\n\n')
    ? (before.endsWith('\n') ? '\n' : '\n\n')
    : ''
  const insertion = pad + tbl + '\n\n'
  applyChange(textarea, v.slice(0, s) + insertion + v.slice(e), s + insertion.length, s + insertion.length)
}

function applyLink(textarea, url) {
  const { selectionStart: s, selectionEnd: e, value: v } = textarea
  const sel = v.slice(s, e) || 'link text'
  const rep = `[${sel}](${url})`
  applyChange(textarea, v.slice(0, s) + rep + v.slice(e), s, s + rep.length)
}

function applyToc(textarea) {
  const { value: v, selectionStart: s } = textarea
  const headings = []
  for (const line of v.split('\n')) {
    const m = line.match(/^(#{1,6})\s+(.+)/)
    if (m) headings.push({ level: m[1].length, text: m[2].trim() })
  }
  if (!headings.length) return
  const minLevel = Math.min(...headings.map((h) => h.level))
  const tocLines = ['## Table of Contents', '']
  for (const h of headings) {
    const indent = '  '.repeat(h.level - minLevel)
    const slug = slugify(h.text)
    tocLines.push(`${indent}- [${h.text}](#${slug})`)
  }
  tocLines.push('', '')
  const toc = tocLines.join('\n')
  // Insert at current cursor, ensuring blank line before
  const before = v.slice(0, s)
  const pad = before.length > 0 && !before.endsWith('\n\n')
    ? (before.endsWith('\n') ? '\n' : '\n\n')
    : ''
  const insertion = pad + toc
  applyChange(textarea, v.slice(0, s) + insertion + v.slice(s), s + insertion.length, s + insertion.length)
}

// ── Link input state ───────────────────────────────────────────────────────────

function openLinkInput(container, textarea) {
  const lg = container.querySelector('.fmt-link-group')
  const inp = container.querySelector('.fmt-url-input')
  lg.classList.add('active')
  inp.value = ''
  // Save selection to apply later
  container._linkSel = { s: textarea.selectionStart, e: textarea.selectionEnd }
  inp.focus()
}

function closeLinkInput(container) {
  const lg = container.querySelector('.fmt-link-group')
  if (lg) lg.classList.remove('active')
}

function confirmLink(container, textarea) {
  const inp = container.querySelector('.fmt-url-input')
  const url = inp ? inp.value.trim() : ''
  if (!url) { closeLinkInput(container); return }
  const { s, e } = container._linkSel || { s: 0, e: 0 }
  textarea.selectionStart = s
  textarea.selectionEnd   = e
  applyLink(textarea, url)
  closeLinkInput(container)
}

// ── Action dispatcher ──────────────────────────────────────────────────────────

function handleAction(action, textarea, container) {
  if (action === 'link') {
    openLinkInput(container, textarea)
    return
  }
  // Push undo state before every format action
  pushUndo(textarea)

  switch (action) {
    case 'bold':       wrapInline(textarea, '**', '**'); break
    case 'italic':     wrapInline(textarea, '_', '_'); break
    case 'strike':     wrapInline(textarea, '~~', '~~'); break
    case 'highlight':  wrapInline(textarea, '==', '=='); break
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
    case 'table':      applyTable(textarea); break
    case 'toc':        applyToc(textarea); break
    default: break
  }
}

// ── Wire a toolbar container ───────────────────────────────────────────────────

function wireToolbar(container, textarea, { hideOnAction = false } = {}) {
  container.addEventListener('mousedown', (e) => {
    e.preventDefault() // Keep textarea focus + selection

    const btn = e.target.closest('[data-action]')
    if (btn) {
      if (btn.dataset.action === 'emoji') {
        toggleEmojiPicker(btn)
        return
      }
      handleAction(btn.dataset.action, textarea, container)
      if (hideOnAction && btn.dataset.action !== 'link') {
        hideFloating()
      }
      return
    }

    const okBtn = e.target.closest('.fmt-url-ok')
    if (okBtn) {
      pushUndo(textarea)
      confirmLink(container, textarea)
      if (hideOnAction) hideFloating()
      return
    }

    const cancelBtn = e.target.closest('.fmt-url-cancel')
    if (cancelBtn) {
      closeLinkInput(container)
      if (hideOnAction) hideFloating()
    }
  })

  // Enter / Escape in URL input
  container.querySelector('.fmt-url-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      pushUndo(textarea)
      confirmLink(container, textarea)
      if (hideOnAction) hideFloating()
    }
    if (e.key === 'Escape') {
      closeLinkInput(container)
      if (hideOnAction) hideFloating()
    }
  })
}

// ── Floating toolbar ───────────────────────────────────────────────────────────

const floatingEl = document.createElement('div')
floatingEl.className = 'format-toolbar'
floatingEl.innerHTML = buildToolbarHTML(false)
document.body.appendChild(floatingEl)

function showFloating(anchorX, anchorY) {
  floatingEl.style.display = 'flex'
  const tw = floatingEl.offsetWidth
  const th = floatingEl.offsetHeight
  const margin = 8
  const vw = window.innerWidth
  let x = anchorX - tw / 2
  x = Math.max(margin, Math.min(x, vw - tw - margin))
  const below = anchorY - th - 14 < margin
  const y = below ? anchorY + 14 : anchorY - th - 14
  floatingEl.classList.toggle('fmt-below', below)
  floatingEl.style.left = x + 'px'
  floatingEl.style.top  = y + 'px'
  floatingEl.style.setProperty('--fmt-arrow-x', (anchorX - x) + 'px')
}

function hideFloating() {
  floatingEl.style.display = 'none'
  floatingEl.classList.remove('fmt-below')
  closeLinkInput(floatingEl)
}

// ── Init ───────────────────────────────────────────────────────────────────────

export function initFormatToolbar() {
  const textarea = document.getElementById('editor')
  _emojiTextarea = textarea

  // Seed undo stack with initial content
  _undo = [snapshotState(textarea)]

  // ── Fixed toolbar ──
  const fixedEl = document.getElementById('fmt-toolbar-fixed')
  fixedEl.innerHTML = buildToolbarHTML(true)
  wireToolbar(fixedEl, textarea, { hideOnAction: false })

  // ── Floating toolbar ──
  wireToolbar(floatingEl, textarea, { hideOnAction: true })

  // Show floating on mouse selection
  textarea.addEventListener('mouseup', (e) => {
    if (textarea.selectionStart === textarea.selectionEnd) { hideFloating(); return }
    showFloating(e.clientX, e.clientY)
  })

  // Show floating on keyboard selection
  textarea.addEventListener('keyup', (e) => {
    if (!e.shiftKey && e.key !== 'End' && e.key !== 'Home') return
    if (textarea.selectionStart === textarea.selectionEnd) { hideFloating(); return }
    const rect = textarea.getBoundingClientRect()
    showFloating(rect.left + rect.width / 2, rect.top + 36)
  })

  // Hide floating / emoji picker on outside click
  document.addEventListener('mousedown', (e) => {
    if (!floatingEl.contains(e.target) && e.target !== textarea) {
      hideFloating()
    }
    if (_emojiPicker?.classList.contains('active')
        && !_emojiPicker.contains(e.target)
        && e.target.dataset?.action !== 'emoji') {
      closeEmojiPicker()
    }
  })

  // Also hide floating when selection collapses
  textarea.addEventListener('keydown', (e) => {
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape'].includes(e.key) && !e.shiftKey) {
      hideFloating()
    }
  })

  // ── Undo / Redo keyboard shortcuts ──
  textarea.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey
    if (ctrl && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      doUndo(textarea)
    }
    if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault()
      doRedo(textarea)
    }
  })

  // Debounced snapshot on typing (creates undo checkpoint every ~800ms while typing)
  const saveTyping = debounce(() => pushUndo(textarea), 800)
  textarea.addEventListener('input', saveTyping)

  // ── Download MD ──
  document.getElementById('md-download-btn')?.addEventListener('click', () => {
    const match = textarea.value.match(/^#\s+(.+)/m)
    const base = match
      ? match[1].replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase().slice(0, 60)
      : 'document'
    const blob = new Blob([textarea.value], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = base + '.md'
    a.click()
    URL.revokeObjectURL(url)
  })
}
