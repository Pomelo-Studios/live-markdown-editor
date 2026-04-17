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

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}

function getAlphaValue(varName) {
  const slider = document.querySelector(`.alpha-slider[data-alpha-for="${varName}"]`)
  return slider ? parseInt(slider.value) : 100
}

function applyColorVar(name, hex, alpha) {
  if (!isValidHex(hex)) return
  if (alpha >= 100) {
    document.documentElement.style.setProperty(name, hex)
  } else {
    const { r, g, b } = hexToRgb(hex)
    document.documentElement.style.setProperty(name, `rgba(${r},${g},${b},${(alpha / 100).toFixed(2)})`)
  }
}

function updateSliderBg(varName, hex) {
  const slider = document.querySelector(`.alpha-slider[data-alpha-for="${varName}"]`)
  if (!slider || !isValidHex(hex)) return
  const { r, g, b } = hexToRgb(hex)
  slider.style.backgroundImage = [
    `linear-gradient(to right, rgba(${r},${g},${b},0), rgba(${r},${g},${b},1))`,
    'linear-gradient(45deg, #bbb 25%, transparent 25%)',
    'linear-gradient(-45deg, #bbb 25%, transparent 25%)',
    'linear-gradient(45deg, transparent 75%, #bbb 75%)',
    'linear-gradient(-45deg, transparent 75%, #bbb 75%)',
  ].join(',')
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
  const name = colorInput.dataset.var

  colorInput.addEventListener('input', () => {
    hexInput.value = colorInput.value
    updateSliderBg(name, colorInput.value)
    applyColorVar(name, colorInput.value, getAlphaValue(name))
    customizedVars.add(name)
    saveSettings()
    refreshCodeGrid()
  })

  hexInput.addEventListener('input', () => {
    const val = hexInput.value.startsWith('#') ? hexInput.value : '#' + hexInput.value
    if (isValidHex(val)) {
      colorInput.value = val
      hexInput.value = val
      updateSliderBg(name, val)
      applyColorVar(name, val, getAlphaValue(name))
      customizedVars.add(name)
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
    // Always save alpha so it survives page reload
    if (input.type === 'color') {
      settings[name + '--alpha'] = getAlphaValue(name)
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
    // Reset alpha to 100%
    const alphaSlider = document.querySelector(`.alpha-slider[data-alpha-for="${name}"]`)
    if (alphaSlider) {
      alphaSlider.value = 100
      const display = alphaSlider.nextElementSibling
      if (display) display.textContent = '100%'
      updateSliderBg(name, val)
    }
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

  // Alpha sliders — injected dynamically so HTML stays clean
  const savedForAlpha = storageGet(STORAGE_KEY) || {}
  document.querySelectorAll('input[type="color"][data-var]').forEach((colorInput) => {
    const name    = colorInput.dataset.var
    const row     = colorInput.closest('.color-row')
    if (!row) return

    const wrap    = document.createElement('div')
    wrap.className = 'alpha-wrap'

    const slider  = document.createElement('input')
    slider.type   = 'range'
    slider.className = 'alpha-slider'
    slider.setAttribute('data-alpha-for', name)
    slider.min    = '0'
    slider.max    = '100'
    slider.step   = '1'

    const display = document.createElement('span')
    display.className = 'alpha-display'

    // Restore saved alpha (default 100)
    const savedAlpha = savedForAlpha[name + '--alpha'] ?? 100
    slider.value     = savedAlpha
    display.textContent = savedAlpha + '%'

    wrap.appendChild(slider)
    wrap.appendChild(display)
    row.appendChild(wrap)

    // Init gradient background
    updateSliderBg(name, colorInput.value)

    // Apply saved alpha immediately
    if (savedAlpha < 100) applyColorVar(name, colorInput.value, savedAlpha)

    slider.addEventListener('input', () => {
      display.textContent = slider.value + '%'
      updateSliderBg(name, colorInput.value)
      applyColorVar(name, colorInput.value, parseInt(slider.value))
      customizedVars.add(name)
      saveSettings()
    })
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
    document.querySelectorAll('.alpha-slider').forEach((s) => {
      settings[s.dataset.alphaFor + '--alpha'] = parseInt(s.value)
    })
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
        // Apply imported alpha values
        document.querySelectorAll('.alpha-slider').forEach((slider) => {
          const name  = slider.dataset.alphaFor
          const alpha = settings[name + '--alpha'] ?? 100
          slider.value = alpha
          const display = slider.nextElementSibling
          if (display) display.textContent = alpha + '%'
          const colorInput = document.querySelector(`input[type="color"][data-var="${name}"]`)
          if (colorInput) {
            updateSliderBg(name, colorInput.value)
            applyColorVar(name, colorInput.value, alpha)
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
