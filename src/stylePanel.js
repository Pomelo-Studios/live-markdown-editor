// src/stylePanel.js
import { storageGet, storageSet } from './utils/storage.js'
import { refreshCodeGrid } from './preview.js'

const STORAGE_KEY = 'style-settings'

const sidebar = document.getElementById('sidebar')
const toggleBtn = document.getElementById('sidebar-toggle')

function getCSSVarInputs() {
  return document.querySelectorAll('[data-var]')
}

function applyVar(name, value) {
  const isSizeLike = name.includes('-size') || name.includes('-margin')
  document.documentElement.style.setProperty(name, isSizeLike ? `${value}px` : value)
}

function saveSettings() {
  const settings = {}
  getCSSVarInputs().forEach((input) => {
    settings[input.dataset.var] = input.value
  })
  const gridToggle = document.getElementById('code-grid-toggle')
  settings['--code-grid-on'] = gridToggle.checked
  storageSet(STORAGE_KEY, settings)
}

function loadSettings() {
  const settings = storageGet(STORAGE_KEY)
  if (!settings) return

  getCSSVarInputs().forEach((input) => {
    const saved = settings[input.dataset.var]
    if (saved !== undefined) {
      input.value = saved
      applyVar(input.dataset.var, saved)
    }
  })

  const gridToggle = document.getElementById('code-grid-toggle')
  if (settings['--code-grid-on'] !== undefined) {
    gridToggle.checked = settings['--code-grid-on']
    document.documentElement.style.setProperty('--code-grid', settings['--code-grid-on'] ? 'block' : 'none')
  }
}

export function initStylePanel() {
  loadSettings()

  getCSSVarInputs().forEach((input) => {
    input.addEventListener('input', () => {
      applyVar(input.dataset.var, input.value)
      saveSettings()
      refreshCodeGrid()
    })
  })

  const gridToggle = document.getElementById('code-grid-toggle')
  gridToggle.addEventListener('change', () => {
    document.documentElement.style.setProperty('--code-grid', gridToggle.checked ? 'block' : 'none')
    saveSettings()
    refreshCodeGrid()
  })

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('sidebar--collapsed')
  })
}
