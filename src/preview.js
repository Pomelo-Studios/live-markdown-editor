// src/preview.js
import { marked } from 'marked'
import hljs from 'highlight.js'
import { debounce } from './utils/debounce.js'

marked.use({
  breaks: true,
  gfm: true,
})

const previewEl = document.getElementById('preview')

function applyCodeGrid() {
  const codeBlocks = previewEl.querySelectorAll('pre')
  const isOn = document.documentElement.style.getPropertyValue('--code-grid') === 'block'
  codeBlocks.forEach((block) => {
    block.classList.toggle('code-grid-on', isOn)
  })
}

export function renderPreview(markdown) {
  const html = marked.parse(markdown)
  const el = document.createElement('div')
  el.innerHTML = html
  el.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightElement(block)
  })
  previewEl.innerHTML = el.innerHTML
  applyCodeGrid()
}

export const renderPreviewDebounced = debounce(renderPreview, 150)

export function refreshCodeGrid() {
  applyCodeGrid()
}
