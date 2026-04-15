// src/theme.js
import { storageGet, storageSet } from './utils/storage.js'

const STORAGE_KEY = 'theme'
const TOGGLE_BTN = document.getElementById('theme-toggle')

const HLJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles'

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  TOGGLE_BTN.textContent = theme === 'dark' ? '☀' : '🌙'
  storageSet(STORAGE_KEY, theme)

  // Switch highlight.js stylesheet for light/dark syntax colors
  const hljsLink = document.getElementById('hljs-theme')
  if (hljsLink) {
    hljsLink.href = theme === 'dark'
      ? `${HLJS_CDN}/github-dark.min.css`
      : `${HLJS_CDN}/github.min.css`
  }
}

export function initTheme() {
  const saved = storageGet(STORAGE_KEY)
  const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  applyTheme(saved ?? preferred)

  TOGGLE_BTN.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme')
    applyTheme(current === 'dark' ? 'light' : 'dark')
  })
}
