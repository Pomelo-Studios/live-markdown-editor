// src/tabManager.js
import { storageGet, storageSet } from './utils/storage.js'
import { debounce } from './utils/debounce.js'
import { autoTitle } from './utils/autoTitle.js'

const STORAGE_KEY = 'tabs-state'
const LEGACY_KEY = 'editor-content'

// DEFAULT_CONTENT is the welcome document shown on first run.
export const DEFAULT_CONTENT = `# 📝 Welcome to Live Markdown Editor

A **live** markdown editor with _style customization_, *syntax highlighting*, and PDF export. Select any text to reveal the **format toolbar** — bold, italic, ==highlight==, headings, links, tables and more. Use the **Style Panel** on the left to customize every element.

## Table of Contents

- [Features](#features)
- [Blockquote](#blockquote)
- [Links](#links)
- [Code Block](#code-block)
- [Table](#table)
- [Headings Demo](#headings-demo)
- [Checklist](#checklist)

---

## 🚀 Features

- 🖊 Split pane editor
  - Edit on the left, live preview updates on the right
  - Drag the divider to resize each panel
- 🎨 Style customization
  - Per-element font sizes and colors (H1–H6, body, links, code)
  - Blockquote, inline code, and margin controls in the Style Panel
- 🌙 Dark / light theme with system preference detection
- 📄 PDF export with inline preview before download
- 😊 Emoji picker — click the toolbar button to insert emojis

## Blockquote

> 💡 This is a blockquote. Its border color and background are fully customizable in the Style Panel.

## Links

Visit the [Pomelo Studios GitHub](https://github.com/Pomelo-Studios) for more projects.

---

## Code Block

\`\`\`js
function greet(name) {
  return \`Hello, \${name}!\`
}

const users = ['Alice', 'Bob', 'Carol']
users.forEach(user => console.log(greet(user)))
\`\`\`

### Inline Code

Use \`const\` instead of \`var\` for block-scoped variables. The \`--code-bg\` CSS variable controls this background.

---

## Table

| Feature         | Status | Notes                   |
|-----------------|--------|-------------------------|
| Live preview    | [x]    | Debounced at 150ms      |
| Style panel     | [x]    | Per-element + global    |
| PDF export      | [x]    | Blob URL inline preview |
| Dark theme      | [x]    | System preference aware |
| Emoji picker    | [x]    | 6 categories, 180+ emoji|

## Headings Demo

### H3 Heading

#### H4 Heading

##### H5 Heading

###### H6 Heading

## ✅ Checklist

- [x] Markdown rendering
- [x] Syntax highlighting ✨
- [x] Blockquotes, tables, inline code
- [x] Emoji picker 😊
- [ ] Your next document starts here 🚀
`

function _newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return 't_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12)
  }
  return 't_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

let _state = null
let _onActiveTabChange = null
let _menuAbortController = null

const _persistNow = () => storageSet(STORAGE_KEY, _state)
const _persist = debounce(_persistNow, 500)

function _freshState() {
  const id = _newId()
  return {
    version: 1,
    activeTabId: id,
    tabs: [{ id, title: autoTitle(DEFAULT_CONTENT), customTitle: false, content: DEFAULT_CONTENT, updatedAt: Date.now() }],
  }
}

function _loadState() {
  try {
    const saved = storageGet(STORAGE_KEY)
    if (saved && Array.isArray(saved.tabs) && saved.tabs.length > 0) {
      const ids = new Set(saved.tabs.map((t) => t.id))
      if (!ids.has(saved.activeTabId)) saved.activeTabId = saved.tabs[0].id
      return saved
    }
  } catch (_) { /* fall through */ }

  const legacy = storageGet(LEGACY_KEY)
  if (legacy !== null) {
    const id = _newId()
    const content = typeof legacy === 'string' ? legacy : String(legacy)
    const state = {
      version: 1,
      activeTabId: id,
      tabs: [{ id, title: autoTitle(content), customTitle: false, content, updatedAt: Date.now() }],
    }
    try { localStorage.removeItem(LEGACY_KEY) } catch (_) { /* ignore */ }
    return state
  }

  return _freshState()
}

// ── Public API ────────────────────────────────────────────────────────────

export function initTabManager({ onActiveTabChange }) {
  _onActiveTabChange = onActiveTabChange
  _state = _loadState()
  _render()
  _setupTabEvents()
  _setupNewTabButton()
  _setupMenuButton()
  _setupResizeObserver()
}

export function getActiveTab() {
  return _state.tabs.find((t) => t.id === _state.activeTabId) || _state.tabs[0]
}

export function updateActiveContent(newContent) {
  const tab = getActiveTab()
  if (!tab) return
  tab.content = newContent
  tab.updatedAt = Date.now()
  if (!tab.customTitle) {
    tab.title = autoTitle(newContent)
    _updateTabTitleInDom(tab.id, tab.title)
  }
  _persist()
}

export function createTab() {
  const id = _newId()
  const tab = { id, title: 'Untitled', customTitle: false, content: '', updatedAt: Date.now() }
  _state.tabs.push(tab)
  _state.activeTabId = id
  _render()
  _persist()
  _onActiveTabChange?.(tab.content)
  _focusEditor()
}

export function closeTab(id) {
  const idx = _state.tabs.findIndex((t) => t.id === id)
  if (idx === -1) return

  const wasActive = _state.activeTabId === id

  if (_state.tabs.length === 1) {
    const newId = _newId()
    _state.tabs = [{ id: newId, title: 'Untitled', customTitle: false, content: '', updatedAt: Date.now() }]
    _state.activeTabId = newId
    _render()
    _persist()
    _onActiveTabChange?.('')
    return
  }

  _state.tabs.splice(idx, 1)

  if (wasActive) {
    const newActive = _state.tabs[idx] || _state.tabs[idx - 1]
    _state.activeTabId = newActive.id
    _render()
    _persist()
    _onActiveTabChange?.(newActive.content)
  } else {
    _render()
    _persist()
  }
}

export function switchTab(id) {
  if (_state.activeTabId === id) return
  _state.activeTabId = id
  const tab = getActiveTab()
  _render()
  _persist()
  _onActiveTabChange?.(tab.content)
}

export function renameTab(id, newTitle) {
  const tab = _state.tabs.find((t) => t.id === id)
  if (!tab) return
  const trimmed = (newTitle || '').trim()
  if (trimmed === '') {
    tab.customTitle = false
    tab.title = autoTitle(tab.content)
  } else {
    tab.customTitle = true
    tab.title = trimmed
  }
  _updateTabTitleInDom(id, tab.title)
  _persist()
}

export function reorderTabs(fromId, toId, position) {
  if (fromId === toId) return
  const fromIdx = _state.tabs.findIndex((t) => t.id === fromId)
  const toIdx = _state.tabs.findIndex((t) => t.id === toId)
  if (fromIdx === -1 || toIdx === -1) return
  const [moved] = _state.tabs.splice(fromIdx, 1)
  const newToIdx = _state.tabs.findIndex((t) => t.id === toId)
  const insertAt = position === 'before' ? newToIdx : newToIdx + 1
  _state.tabs.splice(insertAt, 0, moved)
  _render()
  _persist()
}

// ── DOM ───────────────────────────────────────────────────────────────────

function _render() {
  const container = document.getElementById('tab-bar-tabs')
  if (!container) return

  container.innerHTML = ''
  for (const tab of _state.tabs) {
    const btn = document.createElement('button')
    btn.className = 'tab' + (tab.id === _state.activeTabId ? ' tab--active' : '')
    btn.setAttribute('role', 'tab')
    btn.setAttribute('data-tab-id', tab.id)
    btn.setAttribute('draggable', 'true')
    btn.setAttribute('aria-selected', tab.id === _state.activeTabId ? 'true' : 'false')

    const titleSpan = document.createElement('span')
    titleSpan.className = 'tab__title'
    titleSpan.textContent = tab.title

    const closeSpan = document.createElement('span')
    closeSpan.className = 'tab__close'
    closeSpan.setAttribute('aria-label', 'Close tab')
    closeSpan.textContent = '✕'

    btn.appendChild(titleSpan)
    btn.appendChild(closeSpan)
    container.appendChild(btn)
  }

  _updateOverflowChevron()
}

function _updateTabTitleInDom(id, title) {
  const span = document.querySelector('[data-tab-id="' + id + '"] .tab__title')
  if (span) span.textContent = title
}

function _updateOverflowChevron() {
  const tabs = document.getElementById('tab-bar-tabs')
  const menuBtn = document.getElementById('tab-menu-btn')
  if (!tabs || !menuBtn) return
  menuBtn.classList.toggle('tab-bar__btn--hidden', !(tabs.scrollWidth > tabs.clientWidth))
}

function _setupTabEvents() {
  const container = document.getElementById('tab-bar-tabs')
  if (!container) return

  container.addEventListener('click', (e) => {
    const closeBtn = e.target.closest('.tab__close')
    if (closeBtn) {
      const tabBtn = closeBtn.closest('.tab')
      if (tabBtn) closeTab(tabBtn.dataset.tabId)
      return
    }
    const tabBtn = e.target.closest('.tab')
    if (tabBtn && !e.target.closest('.tab__title[contenteditable="true"]')) {
      switchTab(tabBtn.dataset.tabId)
    }
  })

  container.addEventListener('dblclick', (e) => {
    const titleSpan = e.target.closest('.tab__title')
    if (!titleSpan) return
    const tabBtn = titleSpan.closest('.tab')
    if (!tabBtn) return
    _startRename(tabBtn, titleSpan)
  })

  _setupDragHandlers(container)
}

function _startRename(tabBtn, titleSpan) {
  if (titleSpan.contentEditable === 'true') return
  const id = tabBtn.dataset.tabId
  const original = titleSpan.textContent
  titleSpan.contentEditable = 'true'
  titleSpan.focus()

  const range = document.createRange()
  range.selectNodeContents(titleSpan)
  const sel = window.getSelection()
  if (sel) { sel.removeAllRanges(); sel.addRange(range) }

  let committed = false

  const commit = () => {
    if (committed) return
    committed = true
    titleSpan.contentEditable = 'false'
    renameTab(id, titleSpan.textContent)
    const tab = _state.tabs.find((t) => t.id === id)
    titleSpan.textContent = tab ? tab.title : original
  }

  const cancel = () => {
    committed = true
    titleSpan.contentEditable = 'false'
    titleSpan.textContent = original
  }

  titleSpan.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit() }
    if (e.key === 'Escape') { cancel() }
  })

  titleSpan.addEventListener('blur', commit, { once: true })
}

function _setupDragHandlers(container) {
  let dragId = null

  container.addEventListener('dragstart', (e) => {
    const tab = e.target.closest('.tab')
    if (!tab) return
    dragId = tab.dataset.tabId
    e.dataTransfer.setData('text/plain', dragId)
    tab.classList.add('tab--dragging')
  })

  container.addEventListener('dragover', (e) => {
    e.preventDefault()
    const tab = e.target.closest('.tab')
    if (!tab || tab.dataset.tabId === dragId) return
    container.querySelectorAll('.tab').forEach((t) => {
      t.classList.remove('tab--drop-before', 'tab--drop-after')
    })
    const rect = tab.getBoundingClientRect()
    tab.classList.add(e.clientX < rect.left + rect.width / 2 ? 'tab--drop-before' : 'tab--drop-after')
  })

  container.addEventListener('dragleave', (e) => {
    const tab = e.target.closest('.tab')
    if (tab) tab.classList.remove('tab--drop-before', 'tab--drop-after')
  })

  container.addEventListener('drop', (e) => {
    e.preventDefault()
    const fromId = e.dataTransfer.getData('text/plain')
    const toTab = e.target.closest('.tab')
    if (!toTab || toTab.dataset.tabId === fromId) return
    const position = toTab.classList.contains('tab--drop-before') ? 'before' : 'after'
    reorderTabs(fromId, toTab.dataset.tabId, position)
  })

  container.addEventListener('dragend', () => {
    dragId = null
    container.querySelectorAll('.tab').forEach((t) => {
      t.classList.remove('tab--dragging', 'tab--drop-before', 'tab--drop-after')
    })
  })
}

function _setupNewTabButton() {
  const btn = document.getElementById('tab-new-btn')
  if (!btn) return
  btn.addEventListener('click', () => createTab())
}

function _setupMenuButton() {
  const menuBtn = document.getElementById('tab-menu-btn')
  const menu = document.getElementById('tab-menu')
  if (!menuBtn || !menu) return

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    menu.hidden = !menu.hidden
    if (!menu.hidden) _renderMenu()
  })

  if (_menuAbortController) _menuAbortController.abort()
  _menuAbortController = new AbortController()
  const { signal } = _menuAbortController

  document.addEventListener('click', () => { if (menu) menu.hidden = true }, { signal })
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu) menu.hidden = true }, { signal })
}

function _renderMenu() {
  const menu = document.getElementById('tab-menu')
  if (!menu) return
  menu.innerHTML = ''
  for (const tab of _state.tabs) {
    const item = document.createElement('div')
    item.className = 'tab-menu__item' + (tab.id === _state.activeTabId ? ' tab-menu__item--active' : '')
    item.setAttribute('role', 'menuitem')
    item.dataset.tabId = tab.id
    item.textContent = tab.title

    const closeSpan = document.createElement('span')
    closeSpan.className = 'tab-menu__close'
    closeSpan.textContent = '✕'
    closeSpan.addEventListener('click', (e) => {
      e.stopPropagation()
      closeTab(tab.id)
      const m = document.getElementById('tab-menu')
      if (m) m.hidden = true
    })

    item.appendChild(closeSpan)
    item.addEventListener('click', () => {
      switchTab(tab.id)
      const m = document.getElementById('tab-menu')
      if (m) m.hidden = true
    })
    menu.appendChild(item)
  }
}

function _setupResizeObserver() {
  const tabs = document.getElementById('tab-bar-tabs')
  if (!tabs || typeof ResizeObserver === 'undefined') return
  const observer = new ResizeObserver(() => _updateOverflowChevron())
  observer.observe(tabs)
}

function _focusEditor() {
  const ta = document.getElementById('editor')
  if (ta) ta.focus()
}
