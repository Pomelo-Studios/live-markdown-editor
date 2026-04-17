// src/stylePanel.js
import { storageGet, storageSet } from './utils/storage.js'
import { refreshCodeGrid } from './preview.js'

const STORAGE_KEY        = 'style-settings'
const STORAGE_KEY_CUSTOM = 'style-customized'

const sidebar   = document.getElementById('sidebar')
const toggleBtn = document.getElementById('sidebar-toggle')

// ── Customized-vars tracking ──────────────────────────────────────────────────
// Only vars the user has EXPLICITLY changed are tracked here.
// Non-customized vars rely on the CSS cascade (theme defaults) — no inline style.

let customizedVars = new Set()

function loadCustomized() {
  const saved = storageGet(STORAGE_KEY_CUSTOM)
  if (saved !== null) {
    customizedVars = new Set(saved)
  } else {
    // Backward compat: old saves had all vars; treat them all as customized
    const settings = storageGet(STORAGE_KEY)
    customizedVars = settings
      ? new Set(Object.keys(settings).filter((k) => k !== '--code-grid-on'))
      : new Set()
  }
}

function saveCustomized() {
  storageSet(STORAGE_KEY_CUSTOM, [...customizedVars])
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCSSVarInputs() {
  return document.querySelectorAll('[data-var]')
}

function applyVar(name, value) {
  const isSizeLike = name.includes('-size') || name.includes('-margin')
  document.documentElement.style.setProperty(name, isSizeLike ? `${value}px` : value)
}

function removeVar(name) {
  document.documentElement.style.removeProperty(name)
}

/** Read current computed value of a CSS var. Strips px for number inputs. */
function computedVar(name, forNumberInput = false) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  if (forNumberInput) return parseFloat(raw).toString()
  return raw
}

function isValidHex(str) {
  return /^#[0-9a-fA-F]{6}$/.test(str)
}

// ── Sync non-customized inputs from cascade (theme defaults) ──────────────────

function syncInputsFromCascade() {
  getCSSVarInputs().forEach((input) => {
    if (customizedVars.has(input.dataset.var)) return  // user set this — don't touch
    const val = computedVar(input.dataset.var, input.type === 'number')
    if (!val) return
    if (input.type === 'color' && !isValidHex(val)) return  // skip rgba values
    if (input.value === val) return                          // already correct
    input.value = val
    if (input.type === 'color') {
      const hexInput = document.querySelector(`[data-hex-for="${input.dataset.var}"]`)
      if (hexInput) hexInput.value = val
    }
  })
}

// ── Hex input sync ────────────────────────────────────────────────────────────

function wireHexInput(colorInput, hexInput) {
  colorInput.addEventListener('input', () => {
    hexInput.value = colorInput.value
    applyVar(colorInput.dataset.var, colorInput.value)
    customizedVars.add(colorInput.dataset.var)
    saveSettings()
    refreshCodeGrid()
  })

  hexInput.addEventListener('input', () => {
    const val = hexInput.value.startsWith('#') ? hexInput.value : '#' + hexInput.value
    if (isValidHex(val)) {
      colorInput.value = val
      hexInput.value = val
      applyVar(colorInput.dataset.var, val)
      customizedVars.add(colorInput.dataset.var)
      saveSettings()
      refreshCodeGrid()
    }
  })

  hexInput.addEventListener('blur', () => {
    if (!isValidHex(hexInput.value)) hexInput.value = colorInput.value
  })
}

// ── Persistence ───────────────────────────────────────────────────────────────

function saveSettings() {
  const settings = {}
  getCSSVarInputs().forEach((input) => {
    const name = input.dataset.var
    // Save customized color vars + all size/margin vars (theme-independent)
    if (customizedVars.has(name) || name.includes('-size') || name.includes('-margin')) {
      settings[name] = input.value
    }
  })
  const gridToggle = document.getElementById('code-grid-toggle')
  settings['--code-grid-on'] = gridToggle.checked
  const underlineToggle = document.getElementById('link-underline-toggle')
  settings['--link-underline-on'] = underlineToggle.checked
  storageSet(STORAGE_KEY, settings)
  saveCustomized()
}

function loadSettings() {
  loadCustomized()
  const settings = storageGet(STORAGE_KEY)

  if (settings) {
    getCSSVarInputs().forEach((input) => {
      const name = input.dataset.var
      // Only apply values that are either customized or theme-independent (size/margin)
      if (!customizedVars.has(name) && !name.includes('-size') && !name.includes('-margin')) return
      const saved = settings[name]
      if (saved === undefined) return
      input.value = saved
      applyVar(name, saved)
      if (input.type === 'color') {
        const hexInput = document.querySelector(`[data-hex-for="${name}"]`)
        if (hexInput) hexInput.value = saved
      }
    })

    const gridToggle = document.getElementById('code-grid-toggle')
    if (settings['--code-grid-on'] !== undefined) {
      gridToggle.checked = settings['--code-grid-on']
      document.documentElement.style.setProperty('--code-grid', settings['--code-grid-on'] ? 'block' : 'none')
    }
    const underlineToggle = document.getElementById('link-underline-toggle')
    if (settings['--link-underline-on'] !== undefined) {
      underlineToggle.checked = settings['--link-underline-on']
      document.documentElement.style.setProperty('--link-underline', settings['--link-underline-on'] ? 'underline' : 'none')
    }
  }

  // Update all non-customized inputs to reflect the current theme's defaults
  syncInputsFromCascade()
}

// ── Reset ─────────────────────────────────────────────────────────────────────

function resetInput(input) {
  const name = input.dataset.var
  // Remove inline style → CSS cascade (theme default) takes over immediately
  removeVar(name)
  customizedVars.delete(name)
  // Read the theme default that just became active and update the input
  const val = computedVar(name, input.type === 'number')
  if (!val) return
  if (input.type === 'color' && !isValidHex(val)) return
  input.value = val
  if (input.type === 'color') {
    const hexInput = document.querySelector(`[data-hex-for="${name}"]`)
    if (hexInput) hexInput.value = val
  }
}

function resetSection(sectionName) {
  const sectionMap = {
    headings:      ['--h1-size','--h1-color','--h2-size','--h2-color','--h3-size','--h3-color','--h4-size','--h4-color','--h5-size','--h5-color','--h6-size','--h6-color'],
    body:          ['--body-size','--body-color'],
    links:         ['--link-color', '--link-underline'],
    checklist:     ['--checkbox-color'],
    blockquote:    ['--blockquote-border','--blockquote-bg'],
    code:          ['--code-bg','--code-color'],
    'inline-code': ['--inline-code-bg','--inline-code-color'],
    margins:       ['--preview-margin-top','--preview-margin-right','--preview-margin-bottom','--preview-margin-left'],
    background:    ['--bg-preview'],
  }
  ;(sectionMap[sectionName] || []).forEach((varName) => {
    const input = document.querySelector(`[data-var="${varName}"]`)
    if (input) resetInput(input)
  })
  if (sectionName === 'code') {
    const gridToggle = document.getElementById('code-grid-toggle')
    gridToggle.checked = false
    document.documentElement.style.setProperty('--code-grid', 'none')
  }
  if (sectionName === 'links') {
    const underlineToggle = document.getElementById('link-underline-toggle')
    underlineToggle.checked = true
    document.documentElement.style.removeProperty('--link-underline')
  }
  saveSettings()
  refreshCodeGrid()
}

function resetAll() {
  getCSSVarInputs().forEach(resetInput)
  const gridToggle = document.getElementById('code-grid-toggle')
  gridToggle.checked = false
  document.documentElement.style.setProperty('--code-grid', 'none')
  const underlineToggle = document.getElementById('link-underline-toggle')
  underlineToggle.checked = true
  document.documentElement.style.removeProperty('--link-underline')
  saveSettings()
  refreshCodeGrid()
}

// ── Theme change observer ─────────────────────────────────────────────────────

function initThemeObserver() {
  new MutationObserver(() => {
    // CSS cascade just updated for the new theme —
    // sync all non-customized inputs to show the new defaults
    syncInputsFromCascade()
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function initStylePanel() {
  loadSettings()
  initThemeObserver()

  // Number inputs
  getCSSVarInputs().forEach((input) => {
    if (input.type === 'number') {
      input.addEventListener('input', () => {
        applyVar(input.dataset.var, input.value)
        customizedVars.add(input.dataset.var)
        saveSettings()
      })
    }
  })

  // Color pickers
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

  // Link underline toggle
  const underlineToggle = document.getElementById('link-underline-toggle')
  underlineToggle.addEventListener('change', () => {
    document.documentElement.style.setProperty('--link-underline', underlineToggle.checked ? 'underline' : 'none')
    saveSettings()
  })

  // Section reset buttons
  document.querySelectorAll('[data-reset-section]').forEach((btn) => {
    btn.addEventListener('click', () => resetSection(btn.dataset.resetSection))
  })

  // Global reset
  document.getElementById('reset-all-btn').addEventListener('click', resetAll)

  // Sidebar toggle
  toggleBtn.addEventListener('click', () => sidebar.classList.toggle('sidebar--collapsed'))

  // ── Export settings ──
  document.getElementById('export-settings-btn')?.addEventListener('click', () => {
    const settings = {}
    getCSSVarInputs().forEach((input) => { settings[input.dataset.var] = input.value })
    settings['--code-grid-on'] = document.getElementById('code-grid-toggle').checked
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'markdown-editor-styles.json'; a.click()
    URL.revokeObjectURL(url)
  })

  // ── Import settings ──
  const importFile = document.getElementById('import-settings-file')
  document.getElementById('import-settings-btn')?.addEventListener('click', () => importFile?.click())
  importFile?.addEventListener('change', () => {
    const file = importFile.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target.result)
        getCSSVarInputs().forEach((input) => {
          const saved = settings[input.dataset.var]
          if (saved === undefined) return
          input.value = saved
          applyVar(input.dataset.var, saved)
          customizedVars.add(input.dataset.var)
          if (input.type === 'color') {
            const hexInput = document.querySelector(`[data-hex-for="${input.dataset.var}"]`)
            if (hexInput) hexInput.value = saved
          }
        })
        const gt = document.getElementById('code-grid-toggle')
        if (settings['--code-grid-on'] !== undefined) {
          gt.checked = settings['--code-grid-on']
          document.documentElement.style.setProperty('--code-grid', gt.checked ? 'block' : 'none')
        }
        saveSettings()
        refreshCodeGrid()
      } catch { console.error('Invalid settings file') }
      importFile.value = ''
    }
    reader.readAsText(file)
  })
}
