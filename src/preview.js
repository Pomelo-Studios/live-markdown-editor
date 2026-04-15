// src/preview.js
import { marked } from 'marked'
import hljs from 'highlight.js'
import { debounce } from './utils/debounce.js'

function slugify(text) {
  return text
    .replace(/<[^>]+>/g, '')   // strip HTML tags
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')  // remove special chars
    .trim()
    .replace(/\s+/g, '-')
}

marked.use({
  breaks: true,
  gfm: true,
  extensions: [
    {
      name: 'highlight',
      level: 'inline',
      start(src) { return src.indexOf('==') },
      tokenizer(src) {
        const match = /^==([^=\n]+)==/.exec(src)
        if (match) return { type: 'highlight', raw: match[0], text: match[1] }
      },
      renderer(token) {
        return `<mark>${token.text}</mark>`
      },
    },
  ],
  renderer: {
    heading({ text, depth }) {
      const id = slugify(text)
      return `<h${depth} id="${id}">${text}</h${depth}>\n`
    },
  },
})

const previewEl = document.getElementById('preview')
let _scrollToLine = null
let _activeHoverBlock = null

export function setScrollToLineCallback(fn) {
  _scrollToLine = fn
}

// ── Code grid ─────────────────────────────────────────────

function applyCodeGrid() {
  const isOn = document.documentElement.style.getPropertyValue('--code-grid') === 'block'
  previewEl.querySelectorAll('pre').forEach((block) => {
    block.classList.toggle('code-grid-on', isOn)
  })
}

// ── Source line mapping ───────────────────────────────────

const BLOCK_TYPES = new Set([
  'heading', 'paragraph', 'code', 'blockquote', 'list', 'table', 'hr',
])

function buildLineMap(markdown) {
  const tokens = marked.lexer(markdown)
  const entries = []
  let lineNum = 1
  for (const token of tokens) {
    if (BLOCK_TYPES.has(token.type)) {
      entries.push({ lineNum, type: token.type, ordered: token.ordered })
    }
    lineNum += (token.raw.match(/\n/g) || []).length
  }
  return entries
}

function annotateElements(container, lineMap) {
  const blocks = container.querySelectorAll(
    'h1,h2,h3,h4,h5,h6,p,pre,blockquote,table,ul,ol,hr'
  )
  let mapIdx = 0
  blocks.forEach((el) => {
    if (mapIdx >= lineMap.length) return
    const tag = el.tagName.toLowerCase()
    const entry = lineMap[mapIdx]
    const matches =
      (tag.match(/^h\d$/) && entry.type === 'heading') ||
      (tag === 'p' && entry.type === 'paragraph') ||
      (tag === 'pre' && entry.type === 'code') ||
      (tag === 'blockquote' && entry.type === 'blockquote') ||
      (tag === 'ul' && entry.type === 'list' && !entry.ordered) ||
      (tag === 'ol' && entry.type === 'list' && entry.ordered) ||
      (tag === 'table' && entry.type === 'table') ||
      (tag === 'hr' && entry.type === 'hr')
    if (matches) {
      el.dataset.srcLine = entry.lineNum
      mapIdx++
    }
  })
}

// ── Hover: highlight + goto button ────────────────────────

function clearHover() {
  if (!_activeHoverBlock) return
  _activeHoverBlock.classList.remove('preview-line-hl')
  _activeHoverBlock.querySelector('.preview-goto-btn')?.remove()
  _activeHoverBlock = null
}

function initHover() {
  previewEl.addEventListener('mouseover', (e) => {
    if (!_scrollToLine) return
    const block = e.target.closest('[data-src-line]')
    if (!block || block === previewEl) return
    if (block === _activeHoverBlock) return

    clearHover()
    block.classList.add('preview-line-hl')

    const btn = document.createElement('button')
    btn.className = 'preview-goto-btn'
    btn.textContent = '← Edit'
    btn.dataset.line = block.dataset.srcLine
    block.appendChild(btn)
    _activeHoverBlock = block
  })

  previewEl.addEventListener('mouseout', (e) => {
    const block = e.target.closest('[data-src-line]')
    if (!block || block !== _activeHoverBlock) return
    if (block.contains(e.relatedTarget)) return
    clearHover()
  })

  previewEl.addEventListener('click', (e) => {
    // Goto-edit button
    const btn = e.target.closest('.preview-goto-btn')
    if (btn) {
      e.stopPropagation()
      const line = parseInt(btn.dataset.line)
      if (line > 0 && _scrollToLine) _scrollToLine(line)
      return
    }

    // Anchor links: scroll within preview pane
    const link = e.target.closest('a[href^="#"]')
    if (link) {
      const id = decodeURIComponent(link.getAttribute('href').slice(1))
      const target = previewEl.querySelector(`[id="${id}"]`)
      if (target) {
        e.preventDefault()
        const pane = document.getElementById('preview-pane')
        const top = target.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop
        pane.scrollTo({ top: top - 16, behavior: 'smooth' })
      }
    }
  })
}

// ── Render ────────────────────────────────────────────────

export function renderPreview(markdown) {
  _activeHoverBlock = null
  const lineMap = buildLineMap(markdown)
  const html = marked.parse(markdown)
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  annotateElements(tmp, lineMap)
  tmp.querySelectorAll('pre code').forEach((block) => hljs.highlightElement(block))
  previewEl.innerHTML = tmp.innerHTML
  applyCodeGrid()
}

export const renderPreviewDebounced = debounce(renderPreview, 150)

export function refreshCodeGrid() {
  applyCodeGrid()
}

initHover()
