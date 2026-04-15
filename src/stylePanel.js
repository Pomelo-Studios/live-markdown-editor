// src/stylePanel.js
import { storageGet, storageSet } from './utils/storage.js'
import { refreshCodeGrid } from './preview.js'

const STORAGE_KEY = 'style-settings'

const sidebar = document.getElementById('sidebar')
const toggleBtn = document.getElementById('sidebar-toggle')

// ── Helpers ──────────────────────────────────────────────

function getCSSVarInputs() {
  return document.querySelectorAll('[data-var]')
}

function applyVar(name, value) {
  const isSizeLike = name.includes('-size') || name.includes('-margin')
  document.documentElement.style.setProperty(name, isSizeLike ? `${value}px` : value)
}

function isValidHex(str) {
  return /^#[0-9a-fA-F]{6}$/.test(str)
}

// ── Hex input sync ────────────────────────────────────────

function wireHexInput(colorInput, hexInput) {
  // Color picker → hex text
  colorInput.addEventListener('input', () => {
    hexInput.value = colorInput.value
    applyVar(colorInput.dataset.var, colorInput.value)
    saveSettings()
    refreshCodeGrid()
  })

  // Hex text → color picker
  hexInput.addEventListener('input', () => {
    const val = hexInput.value.startsWith('#') ? hexInput.value : '#' + hexInput.value
    if (isValidHex(val)) {
      colorInput.value = val
      hexInput.value = val
      applyVar(colorInput.dataset.var, val)
      saveSettings()
      refreshCodeGrid()
    }
  })

  hexInput.addEventListener('blur', () => {
    // Snap back to current color value if invalid
    if (!isValidHex(hexInput.value)) {
      hexInput.value = colorInput.value
    }
  })
}

// ── Persistence ───────────────────────────────────────────

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
      // Sync paired hex input if this is a color picker
      if (input.type === 'color') {
        const hexInput = document.querySelector(`[data-hex-for="${input.dataset.var}"]`)
        if (hexInput) hexInput.value = saved
      }
    }
  })

  const gridToggle = document.getElementById('code-grid-toggle')
  if (settings['--code-grid-on'] !== undefined) {
    gridToggle.checked = settings['--code-grid-on']
    document.documentElement.style.setProperty('--code-grid', settings['--code-grid-on'] ? 'block' : 'none')
  }
}

// ── Reset ─────────────────────────────────────────────────

function resetInput(input) {
  const def = input.dataset.default
  if (def === undefined) return
  input.value = def
  applyVar(input.dataset.var, def)
  // Sync hex input
  if (input.type === 'color') {
    const hexInput = document.querySelector(`[data-hex-for="${input.dataset.var}"]`)
    if (hexInput) hexInput.value = def
  }
}

function resetSection(sectionName) {
  const sectionMap = {
    headings: ['--h1-size','--h1-color','--h2-size','--h2-color','--h3-size','--h3-color','--h4-size','--h4-color'],
    body: ['--body-size','--body-color'],
    links: ['--link-color'],
    checklist: ['--checkbox-color'],
    blockquote: ['--blockquote-border','--blockquote-bg'],
    code: ['--code-bg','--code-color'],
    'inline-code': ['--inline-code-bg','--inline-code-color'],
    margins: ['--preview-margin-top','--preview-margin-right','--preview-margin-bottom','--preview-margin-left'],
  }
  const vars = sectionMap[sectionName] || []
  vars.forEach((varName) => {
    const input = document.querySelector(`[data-var="${varName}"]`)
    if (input) resetInput(input)
  })

  // Reset code grid if resetting code section
  if (sectionName === 'code') {
    const gridToggle = document.getElementById('code-grid-toggle')
    gridToggle.checked = false
    document.documentElement.style.setProperty('--code-grid', 'none')
  }

  saveSettings()
  refreshCodeGrid()
}

function resetAll() {
  getCSSVarInputs().forEach(resetInput)
  const gridToggle = document.getElementById('code-grid-toggle')
  gridToggle.checked = false
  document.documentElement.style.setProperty('--code-grid', 'none')
  saveSettings()
  refreshCodeGrid()
}

// ── Init ──────────────────────────────────────────────────

export function initStylePanel() {
  loadSettings()

  // Wire number inputs (non-color [data-var] inputs)
  getCSSVarInputs().forEach((input) => {
    if (input.type === 'number') {
      input.addEventListener('input', () => {
        applyVar(input.dataset.var, input.value)
        saveSettings()
      })
    }
  })

  // Wire color pickers with hex inputs
  document.querySelectorAll('input[type="color"][data-var]').forEach((colorInput) => {
    const hexInput = document.querySelector(`[data-hex-for="${colorInput.dataset.var}"]`)
    if (hexInput) wireHexInput(colorInput, hexInput)
  })

  // Code grid toggle
  const gridToggle = document.getElementById('code-grid-toggle')
  gridToggle.addEventListener('change', () => {
    document.documentElement.style.setProperty('--code-grid', gridToggle.checked ? 'block' : 'none')
    saveSettings()
    refreshCodeGrid()
  })

  // Per-section reset buttons
  document.querySelectorAll('[data-reset-section]').forEach((btn) => {
    btn.addEventListener('click', () => resetSection(btn.dataset.resetSection))
  })

  // Global reset button
  document.getElementById('reset-all-btn').addEventListener('click', resetAll)

  // Sidebar toggle
  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('sidebar--collapsed')
  })
}
