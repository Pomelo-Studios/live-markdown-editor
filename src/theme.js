// src/theme.js
import { storageGet, storageSet } from './utils/storage.js'

const STORAGE_KEY = 'theme'
const TOGGLE_BTN = document.getElementById('theme-toggle')

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  TOGGLE_BTN.textContent = theme === 'dark' ? '☀' : '🌙'
  storageSet(STORAGE_KEY, theme)
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
