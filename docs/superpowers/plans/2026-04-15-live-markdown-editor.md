# Live Markdown Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based live markdown editor with a collapsible style panel, resizable split panes, dark/light theme, PDF export with inline preview, and a mobile-friendly bottom tab bar.

**Architecture:** Vanilla JS ES modules bundled with Vite. Each concern lives in its own `src/*.js` module wired together in `main.js`. Styles are CSS custom properties on `:root`, updated at runtime by the style panel, persisted to localStorage.

**Tech Stack:** Vite, marked.js, highlight.js, html2pdf.js, Vitest (unit tests), GitHub Pages (deploy target)

---

## File Map

| File | Responsibility |
|------|---------------|
| `index.html` | Shell HTML, script/style entry points |
| `src/main.js` | Bootstrap — imports and wires all modules |
| `src/editor.js` | Textarea management, Tab-key handling, input events |
| `src/preview.js` | marked.js render + highlight.js, injects into `#preview` |
| `src/stylePanel.js` | Sidebar open/close, reads inputs, writes CSS vars |
| `src/resizer.js` | Drag-to-resize divider, updates flex-basis |
| `src/pdfExport.js` | Panel swap, blob URL, iframe, download trigger |
| `src/theme.js` | Dark/light toggle, `prefers-color-scheme` on first load |
| `src/mobileNav.js` | Bottom tab bar, breakpoint detection, pane switching |
| `src/utils/debounce.js` | Reusable debounce utility |
| `src/utils/storage.js` | localStorage get/set helpers with JSON support |
| `styles/main.css` | Layout grid, CSS custom properties, root variables |
| `styles/preview.css` | Preview typography — consumes CSS vars |
| `styles/sidebar.css` | Left panel open/collapsed states |
| `styles/mobile.css` | Media queries ≤768px, tab bar, full-screen panes |

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`

- [ ] **Step 1: Initialise npm and install dependencies**

```bash
cd /path/to/live-markdown-editor
npm init -y
npm install --save-dev vite vitest
npm install marked highlight.js html2pdf.js
```

- [ ] **Step 2: Write `vite.config.js`**

```js
// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'jsdom',
  },
})
```

- [ ] **Step 3: Update `package.json` scripts**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  }
}
```

- [ ] **Step 4: Write `index.html`**

```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Live Markdown Editor</title>
  <link rel="stylesheet" href="/styles/main.css" />
  <link rel="stylesheet" href="/styles/preview.css" />
  <link rel="stylesheet" href="/styles/sidebar.css" />
  <link rel="stylesheet" href="/styles/mobile.css" />
</head>
<body>
  <div id="app">

    <!-- Left sidebar: style panel -->
    <aside id="sidebar" class="sidebar sidebar--open">
      <div class="sidebar__header">
        <span class="sidebar__title">Style</span>
        <button id="sidebar-toggle" class="sidebar__toggle" aria-label="Toggle sidebar">◀</button>
      </div>
      <div class="sidebar__content" id="sidebar-content">

        <section class="panel-section">
          <h3 class="panel-section__title">Headings</h3>
          <label>H1 size <input type="number" data-var="--h1-size" value="36" min="12" max="72" />px</label>
          <label>H1 color <input type="color" data-var="--h1-color" value="#111111" /></label>
          <label>H2 size <input type="number" data-var="--h2-size" value="28" min="12" max="72" />px</label>
          <label>H2 color <input type="color" data-var="--h2-color" value="#222222" /></label>
          <label>H3 size <input type="number" data-var="--h3-size" value="22" min="12" max="72" />px</label>
          <label>H3 color <input type="color" data-var="--h3-color" value="#333333" /></label>
          <label>H4 size <input type="number" data-var="--h4-size" value="18" min="12" max="72" />px</label>
          <label>H4 color <input type="color" data-var="--h4-color" value="#444444" /></label>
        </section>

        <section class="panel-section">
          <h3 class="panel-section__title">Body</h3>
          <label>Size <input type="number" data-var="--body-size" value="16" min="10" max="32" />px</label>
          <label>Color <input type="color" data-var="--body-color" value="#333333" /></label>
        </section>

        <section class="panel-section">
          <h3 class="panel-section__title">Margins</h3>
          <label>Top <input type="number" data-var="--preview-margin-top" value="24" min="0" max="120" />px</label>
          <label>Right <input type="number" data-var="--preview-margin-right" value="32" min="0" max="120" />px</label>
          <label>Bottom <input type="number" data-var="--preview-margin-bottom" value="24" min="0" max="120" />px</label>
          <label>Left <input type="number" data-var="--preview-margin-left" value="32" min="0" max="120" />px</label>
        </section>

        <section class="panel-section">
          <h3 class="panel-section__title">Code Block</h3>
          <label>Background <input type="color" data-var="--code-bg" value="#f4f4f4" /></label>
          <label class="label--row">
            <input type="checkbox" id="code-grid-toggle" />
            Indent grid
          </label>
        </section>

      </div>
    </aside>

    <!-- Main content area -->
    <main id="main">

      <!-- Toolbar -->
      <header id="toolbar">
        <span class="toolbar__brand">Live Markdown Editor</span>
        <div class="toolbar__actions">
          <button id="pdf-export-btn">PDF Export</button>
          <button id="theme-toggle" aria-label="Toggle theme">🌙</button>
        </div>
      </header>

      <!-- Editor / Preview split -->
      <div id="split">
        <div id="editor-pane">
          <textarea id="editor" spellcheck="false" placeholder="Write markdown here..."></textarea>
        </div>
        <div id="resizer"></div>
        <div id="preview-pane">
          <div id="preview"></div>
        </div>
      </div>

    </main>

  </div>

  <!-- Footer -->
  <footer id="footer">
    <span>Powered by <strong>Pomelo Studios</strong></span>
    <a href="https://github.com/Pomelo-Studios/live-markdown-editor" target="_blank" rel="noopener">GitHub ↗</a>
  </footer>

  <!-- Mobile bottom tab bar -->
  <nav id="mobile-tabs" class="mobile-tabs" aria-label="Mobile navigation">
    <button class="mobile-tab mobile-tab--active" data-pane="editor">✏ Düzenle</button>
    <button class="mobile-tab" data-pane="preview">👁 Önizle</button>
    <button class="mobile-tab" data-pane="style">⚙ Stil</button>
  </nav>

  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 5: Verify dev server starts**

```bash
npm run dev
```
Expected: Vite dev server running at `http://localhost:5173`. Browser shows blank page with no console errors.

- [ ] **Step 6: Commit**

```bash
git add index.html vite.config.js package.json
git commit -m "feat: scaffold Vite project with HTML shell"
```

---

### Task 2: Utility Modules (debounce + storage)

**Files:**
- Create: `src/utils/debounce.js`
- Create: `src/utils/storage.js`
- Create: `src/utils/debounce.test.js`
- Create: `src/utils/storage.test.js`

- [ ] **Step 1: Write failing test for debounce**

```js
// src/utils/debounce.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { debounce } from './debounce.js'

describe('debounce', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('calls the function after the delay', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 200)
    debounced('a')
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(200)
    expect(fn).toHaveBeenCalledWith('a')
  })

  it('only calls once when invoked rapidly', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 200)
    debounced('a')
    debounced('b')
    debounced('c')
    vi.advanceTimersByTime(200)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('c')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```
Expected: FAIL — "debounce is not a function"

- [ ] **Step 3: Write `debounce.js`**

```js
// src/utils/debounce.js
export function debounce(fn, delay) {
  let timer
  return function (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}
```

- [ ] **Step 4: Write failing test for storage**

```js
// src/utils/storage.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { storageGet, storageSet } from './storage.js'

describe('storage', () => {
  beforeEach(() => localStorage.clear())

  it('returns null for missing keys', () => {
    expect(storageGet('missing')).toBeNull()
  })

  it('saves and retrieves a string', () => {
    storageSet('key', 'hello')
    expect(storageGet('key')).toBe('hello')
  })

  it('saves and retrieves a plain object', () => {
    storageSet('obj', { a: 1 })
    expect(storageGet('obj')).toEqual({ a: 1 })
  })
})
```

- [ ] **Step 5: Write `storage.js`**

```js
// src/utils/storage.js
export function storageGet(key) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota exceeded or private mode — silently ignore
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test
```
Expected: 5 tests PASS — debounce (2) + storage (3)

- [ ] **Step 7: Commit**

```bash
git add src/utils/
git commit -m "feat: add debounce and storage utilities"
```

---

### Task 2b: Create `src/main.js` stub

**Files:**
- Create: `src/main.js`

- [ ] **Step 1: Write stub `main.js`**

```js
// src/main.js
// Full wiring happens in Task 12. This stub lets Vite compile cleanly.
console.log('Live Markdown Editor — booting')
```

- [ ] **Step 2: Verify dev server compiles**

```bash
npm run dev
```
Expected: No "Failed to resolve entry" errors.

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "chore: add main.js stub"
```

---

### Task 3: CSS Foundation

**Files:**
- Create: `styles/main.css`
- Create: `styles/preview.css`
- Create: `styles/sidebar.css`
- Create: `styles/mobile.css`

- [ ] **Step 1: Write `styles/main.css`**

```css
/* styles/main.css */

/* ── CSS Custom Properties ── */
:root {
  /* Heading sizes */
  --h1-size: 36px;
  --h2-size: 28px;
  --h3-size: 22px;
  --h4-size: 18px;

  /* Heading colors */
  --h1-color: #111111;
  --h2-color: #222222;
  --h3-color: #333333;
  --h4-color: #444444;

  /* Body */
  --body-size: 16px;
  --body-color: #333333;

  /* Preview margins */
  --preview-margin-top: 24px;
  --preview-margin-right: 32px;
  --preview-margin-bottom: 24px;
  --preview-margin-left: 32px;

  /* Code block */
  --code-bg: #f4f4f4;
  --code-grid: none; /* set to 'block' when grid enabled */

  /* Layout */
  --sidebar-width: 220px;
  --sidebar-collapsed-width: 36px;
  --resizer-width: 6px;
  --toolbar-height: 44px;
  --footer-height: 36px;
  --mobile-tabs-height: 52px;

  /* Light theme */
  --bg-app: #f0f0f0;
  --bg-editor: #1e1e1e;
  --bg-preview: #ffffff;
  --bg-toolbar: #ffffff;
  --bg-sidebar: #1e1e2e;
  --bg-resizer: #dddddd;
  --color-editor-text: #d4d4d4;
  --color-toolbar-text: #333333;
  --color-sidebar-text: #cccccc;
  --color-accent: #6d28d9;
  --color-footer-bg: #f8f8f8;
  --color-footer-text: #666666;
  --border-color: #e0e0e0;
}

[data-theme="dark"] {
  --bg-app: #0d0d14;
  --bg-editor: #12121c;
  --bg-preview: #1a1a28;
  --bg-toolbar: #1e1e2e;
  --bg-sidebar: #16162a;
  --bg-resizer: #2a2a3e;
  --color-editor-text: #cdd6f4;
  --color-toolbar-text: #e0e0e0;
  --color-sidebar-text: #cccccc;
  --color-accent: #9b7fff;
  --color-footer-bg: #12121c;
  --color-footer-text: #888888;
  --border-color: #2a2a3e;
  /* Override default heading/body colors for dark theme preview */
  --h1-color: #f0f0f0;
  --h2-color: #e0e0e0;
  --h3-color: #d0d0d0;
  --h4-color: #c0c0c0;
  --body-color: #cccccc;
  --code-bg: #2a2a3e;
}

/* ── Reset ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; overflow: hidden; font-family: system-ui, sans-serif; }

body {
  background: var(--bg-app);
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* ── App shell ── */
#app {
  display: flex;
  flex: 1;
  overflow: hidden;
  height: calc(100vh - var(--footer-height));
}

/* ── Main (right of sidebar) ── */
#main {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

/* ── Toolbar ── */
#toolbar {
  height: var(--toolbar-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: var(--bg-toolbar);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.toolbar__brand { font-weight: 600; font-size: 14px; color: var(--color-toolbar-text); }
.toolbar__actions { display: flex; gap: 8px; align-items: center; }
.toolbar__actions button {
  padding: 5px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: transparent;
  color: var(--color-toolbar-text);
  cursor: pointer;
  font-size: 13px;
}
.toolbar__actions button:hover { background: var(--color-accent); color: #fff; border-color: transparent; }

/* ── Split pane ── */
#split {
  display: flex;
  flex: 1;
  overflow: hidden;
}

#editor-pane {
  flex: 1 1 50%;
  min-width: 20%;
  overflow: hidden;
  display: flex;
}

#editor {
  flex: 1;
  width: 100%;
  height: 100%;
  padding: 16px;
  resize: none;
  border: none;
  outline: none;
  font-family: 'Fira Code', 'Cascadia Code', monospace;
  font-size: 14px;
  line-height: 1.7;
  background: var(--bg-editor);
  color: var(--color-editor-text);
  tab-size: 2;
}

/* ── Resizer ── */
#resizer {
  width: var(--resizer-width);
  background: var(--bg-resizer);
  cursor: col-resize;
  flex-shrink: 0;
  position: relative;
  border-left: 1px solid var(--border-color);
  border-right: 1px solid var(--border-color);
}

#resizer::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 40px;
  background: var(--border-color);
  border-radius: 2px;
}

#resizer:hover, #resizer.resizing { background: var(--color-accent); }

/* ── Preview pane ── */
#preview-pane {
  flex: 1 1 50%;
  min-width: 20%;
  overflow-y: auto;
  background: var(--bg-preview);
}

/* ── Footer ── */
#footer {
  height: var(--footer-height);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  background: var(--color-footer-bg);
  border-top: 1px solid var(--border-color);
  font-size: 12px;
  color: var(--color-footer-text);
  flex-shrink: 0;
}

#footer a { color: var(--color-accent); text-decoration: none; }
#footer a:hover { text-decoration: underline; }
```

- [ ] **Step 2: Write `styles/preview.css`**

```css
/* styles/preview.css */

#preview {
  padding: var(--preview-margin-top) var(--preview-margin-right)
           var(--preview-margin-bottom) var(--preview-margin-left);
  color: var(--body-color);
  font-size: var(--body-size);
  line-height: 1.7;
}

#preview h1 { font-size: var(--h1-size); color: var(--h1-color); margin: 0.5em 0; }
#preview h2 { font-size: var(--h2-size); color: var(--h2-color); margin: 0.5em 0; }
#preview h3 { font-size: var(--h3-size); color: var(--h3-color); margin: 0.5em 0; }
#preview h4 { font-size: var(--h4-size); color: var(--h4-color); margin: 0.5em 0; }

#preview p { margin: 0.75em 0; }
#preview ul, #preview ol { margin: 0.75em 0; padding-left: 1.5em; }
#preview li { margin: 0.25em 0; }

#preview a { color: var(--color-accent); }

#preview hr { border: none; border-top: 1px solid var(--border-color); margin: 1.5em 0; }

#preview blockquote {
  border-left: 4px solid var(--color-accent);
  padding: 0.5em 1em;
  margin: 1em 0;
  opacity: 0.8;
}

#preview table { border-collapse: collapse; width: 100%; margin: 1em 0; }
#preview th, #preview td {
  border: 1px solid var(--border-color);
  padding: 8px 12px;
  text-align: left;
}
#preview th { background: var(--code-bg); }

/* ── Code blocks ── */
#preview pre {
  background: var(--code-bg);
  border-radius: 6px;
  padding: 16px;
  overflow-x: auto;
  margin: 1em 0;
  position: relative;
}

/* Indent grid — vertical guide lines */
#preview pre.code-grid-on {
  background-image: repeating-linear-gradient(
    to right,
    transparent,
    transparent calc(2ch - 1px),
    var(--border-color) calc(2ch - 1px),
    var(--border-color) calc(2ch)
  );
  background-size: 2ch 100%;
}

#preview code {
  font-family: 'Fira Code', 'Cascadia Code', monospace;
  font-size: 0.9em;
}

#preview p code {
  background: var(--code-bg);
  padding: 2px 6px;
  border-radius: 4px;
}
```

- [ ] **Step 3: Write `styles/sidebar.css`**

```css
/* styles/sidebar.css */

.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-sidebar);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 0.2s ease;
  overflow: hidden;
  border-right: 1px solid var(--border-color);
}

.sidebar--collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 10px;
  background: var(--color-accent);
  flex-shrink: 0;
  min-height: var(--toolbar-height);
}

.sidebar__title {
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  opacity: 1;
  transition: opacity 0.15s;
}

.sidebar--collapsed .sidebar__title { opacity: 0; }

.sidebar__toggle {
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 4px;
  flex-shrink: 0;
  transition: transform 0.2s;
}

.sidebar--collapsed .sidebar__toggle { transform: rotate(180deg); }

.sidebar__content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  opacity: 1;
  transition: opacity 0.15s;
}

.sidebar--collapsed .sidebar__content { opacity: 0; pointer-events: none; }

/* Panel sections */
.panel-section { margin-bottom: 20px; }

.panel-section__title {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-accent);
  margin-bottom: 8px;
}

.panel-section label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--color-sidebar-text);
  margin-bottom: 6px;
  gap: 8px;
}

.label--row { gap: 8px; justify-content: flex-start; }

.panel-section input[type="number"] {
  width: 56px;
  padding: 3px 6px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-app);
  color: var(--color-sidebar-text);
  font-size: 12px;
}

.panel-section input[type="color"] {
  width: 32px;
  height: 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  background: none;
}
```

- [ ] **Step 4: Write `styles/mobile.css`**

```css
/* styles/mobile.css */

.mobile-tabs {
  display: none;
}

@media (max-width: 768px) {
  /* Hide desktop elements */
  #sidebar { display: none !important; }
  #resizer { display: none !important; }

  body { overflow: hidden; }

  #app {
    height: calc(100vh - var(--footer-height) - var(--mobile-tabs-height));
  }

  #split {
    flex-direction: column;
  }

  /* Only the active pane is visible */
  #editor-pane, #preview-pane {
    flex: 1 1 100%;
    min-width: 100%;
    display: none;
  }

  #editor-pane.pane--active,
  #preview-pane.pane--active {
    display: flex;
  }

  /* Mobile style sheet — full screen overlay */
  #sidebar.mobile-style-open {
    display: flex !important;
    position: fixed;
    inset: 0;
    bottom: var(--mobile-tabs-height);
    width: 100% !important;
    z-index: 100;
    overflow-y: auto;
  }

  /* Mobile tab bar */
  .mobile-tabs {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: var(--mobile-tabs-height);
    background: var(--bg-toolbar);
    border-top: 1px solid var(--border-color);
    z-index: 200;
  }

  .mobile-tab {
    flex: 1;
    border: none;
    background: transparent;
    color: var(--color-toolbar-text);
    font-size: 12px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    opacity: 0.6;
    transition: opacity 0.15s;
  }

  .mobile-tab--active {
    opacity: 1;
    color: var(--color-accent);
    border-top: 2px solid var(--color-accent);
  }

  /* Adjust footer for mobile */
  #footer { display: none; }
}
```

- [ ] **Step 5: Verify dev server shows layout**

```bash
npm run dev
```
Expected: Three-pane layout visible (sidebar left, editor dark, preview white). No console errors.

- [ ] **Step 6: Commit**

```bash
git add styles/
git commit -m "feat: add CSS foundation with layout, theme vars, and mobile styles"
```

---

### Task 4: Theme Module

**Files:**
- Create: `src/theme.js`

- [ ] **Step 1: Write `src/theme.js`**

```js
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
```

- [ ] **Step 2: Import and call in `main.js`**

```js
// src/main.js
import { initTheme } from './theme.js'

initTheme()
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```
Expected: Theme matches system preference on load. Toggle button switches dark/light. Refresh preserves selection.

- [ ] **Step 4: Commit**

```bash
git add src/theme.js src/main.js
git commit -m "feat: add dark/light theme system with localStorage persistence"
```

---

### Task 5: Editor Module

**Files:**
- Create: `src/editor.js`

- [ ] **Step 1: Write `src/editor.js`**

```js
// src/editor.js
import { storageGet, storageSet } from './utils/storage.js'
import { debounce } from './utils/debounce.js'

const STORAGE_KEY = 'editor-content'

const DEFAULT_CONTENT = `# Welcome to Live Markdown Editor

A **live** markdown editor with _style customization_, code highlighting, and PDF export.

## Features

- Split pane: edit on the left, preview on the right
- Drag the divider to resize panes
- Customize heading sizes, colors, and margins in the left panel
- Dark and light theme support

## Code Example

\`\`\`js
function greet(name) {
  return \`Hello, \${name}!\`
}
console.log(greet('World'))
\`\`\`

## Checklist

- [x] Markdown rendering
- [x] Syntax highlighting
- [ ] Your next document
`

export function initEditor(onInput) {
  const textarea = document.getElementById('editor')

  // Restore or set default
  const saved = storageGet(STORAGE_KEY)
  textarea.value = saved ?? DEFAULT_CONTENT

  // Tab key → 2 spaces
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      textarea.value = textarea.value.slice(0, start) + '  ' + textarea.value.slice(end)
      textarea.selectionStart = textarea.selectionEnd = start + 2
    }
  })

  const saveDebounced = debounce((val) => storageSet(STORAGE_KEY, val), 1000)

  textarea.addEventListener('input', () => {
    saveDebounced(textarea.value)
    onInput(textarea.value)
  })

  // Return current value so preview can render on first load
  return textarea.value
}
```

- [ ] **Step 2: Import in `main.js`**

```js
// src/main.js
import { initTheme } from './theme.js'
import { initEditor } from './editor.js'

initTheme()
const initialContent = initEditor(() => {})
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```
Expected: Editor textarea shows default markdown content. Tab key inserts 2 spaces. Content is saved to localStorage on input.

- [ ] **Step 4: Commit**

```bash
git add src/editor.js src/main.js
git commit -m "feat: add editor module with Tab handling and localStorage persistence"
```

---

### Task 6: Preview Rendering

**Files:**
- Create: `src/preview.js`

- [ ] **Step 1: Write `src/preview.js`**

```js
// src/preview.js
import { marked } from 'marked'
import hljs from 'highlight.js'
import { debounce } from './utils/debounce.js'

marked.setOptions({
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value
    }
    return hljs.highlightAuto(code).value
  },
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
  previewEl.innerHTML = marked.parse(markdown)
  applyCodeGrid()
}

export const renderPreviewDebounced = debounce(renderPreview, 150)

export function refreshCodeGrid() {
  applyCodeGrid()
}
```

- [ ] **Step 2: Add `highlight.js` theme link to `index.html`**

Add inside `<head>`, after existing stylesheets:

```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css" id="hljs-theme" />
```

- [ ] **Step 3: Update `main.js` to wire preview**

```js
// src/main.js
import { initTheme } from './theme.js'
import { initEditor } from './editor.js'
import { renderPreview, renderPreviewDebounced } from './preview.js'

initTheme()
const initialContent = initEditor((markdown) => renderPreviewDebounced(markdown))
renderPreview(initialContent)
```

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```
Expected: Right pane shows rendered HTML from default markdown. Code block shows syntax highlighting. Editing the textarea updates preview within 150ms.

- [ ] **Step 5: Commit**

```bash
git add src/preview.js index.html src/main.js
git commit -m "feat: add live markdown preview with syntax highlighting"
```

---

### Task 7: Resizable Divider

**Files:**
- Create: `src/resizer.js`

- [ ] **Step 1: Write `src/resizer.js`**

```js
// src/resizer.js
const MIN_PERCENT = 20
const MAX_PERCENT = 80

export function initResizer() {
  const resizer = document.getElementById('resizer')
  const editorPane = document.getElementById('editor-pane')
  const previewPane = document.getElementById('preview-pane')
  const split = document.getElementById('split')

  let dragging = false
  let startX = 0
  let startEditorWidth = 0
  let splitWidth = 0

  resizer.addEventListener('mousedown', (e) => {
    dragging = true
    startX = e.clientX
    startEditorWidth = editorPane.getBoundingClientRect().width
    splitWidth = split.getBoundingClientRect().width
    resizer.classList.add('resizing')
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
  })

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return
    const delta = e.clientX - startX
    let newEditorPercent = ((startEditorWidth + delta) / splitWidth) * 100
    newEditorPercent = Math.max(MIN_PERCENT, Math.min(MAX_PERCENT, newEditorPercent))
    editorPane.style.flexBasis = `${newEditorPercent}%`
    previewPane.style.flexBasis = `${100 - newEditorPercent}%`
  })

  document.addEventListener('mouseup', () => {
    if (!dragging) return
    dragging = false
    resizer.classList.remove('resizing')
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
  })
}
```

- [ ] **Step 2: Wire in `main.js`**

```js
// src/main.js
import { initTheme } from './theme.js'
import { initEditor } from './editor.js'
import { renderPreview, renderPreviewDebounced } from './preview.js'
import { initResizer } from './resizer.js'

initTheme()
initResizer()
const initialContent = initEditor((markdown) => renderPreviewDebounced(markdown))
renderPreview(initialContent)
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```
Expected: Dragging the divider resizes editor and preview panes. Neither pane goes below 20% width.

- [ ] **Step 4: Commit**

```bash
git add src/resizer.js src/main.js
git commit -m "feat: add resizable divider between editor and preview panes"
```

---

### Task 8: Style Panel

**Files:**
- Create: `src/stylePanel.js`

- [ ] **Step 1: Write `src/stylePanel.js`**

```js
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
  // number inputs store px values
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

  // Wire CSS-var inputs
  getCSSVarInputs().forEach((input) => {
    input.addEventListener('input', () => {
      applyVar(input.dataset.var, input.value)
      saveSettings()
      refreshCodeGrid()
    })
  })

  // Wire code grid toggle
  const gridToggle = document.getElementById('code-grid-toggle')
  gridToggle.addEventListener('change', () => {
    document.documentElement.style.setProperty('--code-grid', gridToggle.checked ? 'block' : 'none')
    saveSettings()
    refreshCodeGrid()
  })

  // Sidebar toggle
  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('sidebar--collapsed')
  })
}
```

- [ ] **Step 2: Wire in `main.js`**

```js
// src/main.js
import { initTheme } from './theme.js'
import { initEditor } from './editor.js'
import { renderPreview, renderPreviewDebounced } from './preview.js'
import { initResizer } from './resizer.js'
import { initStylePanel } from './stylePanel.js'

initTheme()
initResizer()
initStylePanel()
const initialContent = initEditor((markdown) => renderPreviewDebounced(markdown))
renderPreview(initialContent)
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```
Expected: Changing H1 size updates preview immediately. Color pickers update heading colors. Margin inputs update preview padding. Sidebar collapses/expands with toggle. Settings persist on refresh.

- [ ] **Step 4: Commit**

```bash
git add src/stylePanel.js src/main.js
git commit -m "feat: add style panel with live CSS variable updates and persistence"
```

---

### Task 9: PDF Export

**Files:**
- Create: `src/pdfExport.js`

- [ ] **Step 1: Write `src/pdfExport.js`**

```js
// src/pdfExport.js
import html2pdf from 'html2pdf.js'

const exportBtn = document.getElementById('pdf-export-btn')
const previewPane = document.getElementById('preview-pane')
const preview = document.getElementById('preview')

let pdfBlobUrl = null
let pdfIframe = null

function enterPdfMode() {
  exportBtn.textContent = '⬇ İndir'
  exportBtn.removeEventListener('click', startExport)
  exportBtn.addEventListener('click', downloadPdf, { once: true })

  // Add close button to toolbar
  const closeBtn = document.createElement('button')
  closeBtn.id = 'pdf-close-btn'
  closeBtn.textContent = '✕ Kapat'
  exportBtn.insertAdjacentElement('afterend', closeBtn)
  closeBtn.addEventListener('click', exitPdfMode, { once: true })

  // Hide live preview, show iframe
  preview.style.display = 'none'
  pdfIframe = document.createElement('iframe')
  pdfIframe.style.cssText = 'width:100%;height:100%;border:none;'
  pdfIframe.src = pdfBlobUrl
  previewPane.appendChild(pdfIframe)
}

function exitPdfMode() {
  exportBtn.textContent = 'PDF Export'
  exportBtn.addEventListener('click', startExport)

  const closeBtn = document.getElementById('pdf-close-btn')
  if (closeBtn) closeBtn.remove()

  if (pdfIframe) { pdfIframe.remove(); pdfIframe = null }
  if (pdfBlobUrl) { URL.revokeObjectURL(pdfBlobUrl); pdfBlobUrl = null }

  preview.style.display = ''
}

async function startExport() {
  exportBtn.textContent = '...'
  exportBtn.disabled = true

  const opt = {
    margin: 0,
    filename: 'document.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    output: 'blob',
  }

  const blob = await html2pdf().set(opt).from(preview).outputPdf('blob')
  pdfBlobUrl = URL.createObjectURL(blob)

  exportBtn.disabled = false
  enterPdfMode()
}

export function initPdfExport() {
  exportBtn.addEventListener('click', startExport)
}

// Named alias so exitPdfMode can be called from mobileNav if needed
export { startExport }
```

- [ ] **Step 2: Wire in `main.js`**

```js
// src/main.js
import { initTheme } from './theme.js'
import { initEditor } from './editor.js'
import { renderPreview, renderPreviewDebounced } from './preview.js'
import { initResizer } from './resizer.js'
import { initStylePanel } from './stylePanel.js'
import { initPdfExport } from './pdfExport.js'

initTheme()
initResizer()
initStylePanel()
initPdfExport()
const initialContent = initEditor((markdown) => renderPreviewDebounced(markdown))
renderPreview(initialContent)
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```
Expected: Clicking "PDF Export" shows a loading state, then the preview pane switches to an iframe showing the PDF. "⬇ İndir" downloads the file. "✕ Kapat" restores the markdown preview.

- [ ] **Step 4: Commit**

```bash
git add src/pdfExport.js src/main.js
git commit -m "feat: add PDF export with inline blob preview and download"
```

---

### Task 10: Mobile Navigation

**Files:**
- Create: `src/mobileNav.js`

- [ ] **Step 1: Write `src/mobileNav.js`**

```js
// src/mobileNav.js
const BREAKPOINT = 768

const tabs = document.querySelectorAll('.mobile-tab')
const editorPane = document.getElementById('editor-pane')
const previewPane = document.getElementById('preview-pane')
const sidebar = document.getElementById('sidebar')

function showPane(pane) {
  editorPane.classList.remove('pane--active')
  previewPane.classList.remove('pane--active')
  sidebar.classList.remove('mobile-style-open')

  if (pane === 'editor') editorPane.classList.add('pane--active')
  else if (pane === 'preview') previewPane.classList.add('pane--active')
  else if (pane === 'style') sidebar.classList.add('mobile-style-open')

  tabs.forEach((tab) => {
    tab.classList.toggle('mobile-tab--active', tab.dataset.pane === pane)
  })
}

export function initMobileNav() {
  if (window.innerWidth > BREAKPOINT) return

  // Set initial active pane
  showPane('editor')

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => showPane(tab.dataset.pane))
  })
}
```

- [ ] **Step 2: Wire in `main.js`**

```js
// src/main.js
import { initTheme } from './theme.js'
import { initEditor } from './editor.js'
import { renderPreview, renderPreviewDebounced } from './preview.js'
import { initResizer } from './resizer.js'
import { initStylePanel } from './stylePanel.js'
import { initPdfExport } from './pdfExport.js'
import { initMobileNav } from './mobileNav.js'

initTheme()
initResizer()
initStylePanel()
initPdfExport()
initMobileNav()
const initialContent = initEditor((markdown) => renderPreviewDebounced(markdown))
renderPreview(initialContent)
```

- [ ] **Step 3: Verify on mobile viewport**

Open DevTools → toggle device toolbar → select a phone viewport (e.g. iPhone 12, 390px wide).

Expected:
- Sidebar hidden, resizer hidden.
- Editor tab active by default — only editor is visible.
- "👁 Önizle" tab shows rendered preview full screen.
- "⚙ Stil" tab opens sidebar as full-screen overlay.
- Active tab highlighted with accent color border.

- [ ] **Step 4: Commit**

```bash
git add src/mobileNav.js src/main.js
git commit -m "feat: add mobile bottom tab navigation"
```

---

### Task 11: CLAUDE.md + README

**Files:**
- Create: `CLAUDE.md`
- Modify: `README.md`

- [ ] **Step 1: Write `CLAUDE.md`**

```markdown
# CLAUDE.md

## Project
Live Markdown Editor — browser-based markdown editor with live preview, style customization, dark/light theme, and PDF export. Vanilla JS + Vite, no framework.

## Stack
- **Bundler:** Vite (`npm run dev`, `npm run build`)
- **Markdown:** marked.js
- **Syntax highlighting:** highlight.js
- **PDF:** html2pdf.js
- **Tests:** Vitest (`npm test`) — unit tests in `src/**/*.test.js`

## File Roles
- `src/main.js` — bootstrap and module wiring only; no logic here
- `src/editor.js` — textarea, Tab key, input debounce
- `src/preview.js` — marked parse, hljs highlight, code grid toggle
- `src/stylePanel.js` — sidebar open/close, CSS var inputs, code grid toggle
- `src/resizer.js` — drag-to-resize divider
- `src/pdfExport.js` — blob URL, iframe preview, download
- `src/theme.js` — dark/light toggle, prefers-color-scheme
- `src/mobileNav.js` — bottom tab bar, breakpoint guard
- `src/utils/storage.js` — localStorage helpers
- `src/utils/debounce.js` — debounce utility

## CSS Custom Properties
All typography/spacing is controlled via CSS custom properties on `:root` (see `styles/main.css`). `stylePanel.js` writes to them at runtime via `document.documentElement.style.setProperty`.

## Conventions
- No framework — vanilla ES modules
- Each module exports an `init*()` function called once from `main.js`
- localStorage keys: `editor-content`, `style-settings`, `theme`
- Commits: `type: what and why` (feat/fix/refactor/chore)
- Run `npm test` before committing logic changes
```

- [ ] **Step 2: Write `README.md`**

```markdown
# Live Markdown Editor

A free, open-source, browser-based live markdown editor with real-time preview and typography customization.

## Features

- **Split pane** — markdown on the left, rendered preview on the right
- **Resizable divider** — drag to adjust pane widths
- **Style panel** — customize font sizes and colors per heading level, body text, margins, and code block background
- **Code block indent grid** — toggle vertical guide lines in code blocks
- **Syntax highlighting** — powered by highlight.js
- **Dark / Light theme** — follows system preference, manually toggleable
- **PDF export** — inline preview before downloading
- **localStorage persistence** — content and settings survive page refresh
- **Mobile friendly** — bottom tab bar for Edit / Preview / Style on small screens

## Getting Started

```bash
npm install
npm run dev      # http://localhost:5173
```

## Build & Deploy

```bash
npm run build    # outputs to dist/
```

Deploy the `dist/` folder to any static host (GitHub Pages, Netlify, Vercel).

**GitHub Pages:** Push `dist/` to the `gh-pages` branch, or configure Pages to serve from `dist/` on `main`.

## Tech Stack

- [Vite](https://vitejs.dev/) — build tool
- [marked.js](https://marked.js.org/) — markdown parsing
- [highlight.js](https://highlightjs.org/) — syntax highlighting
- [html2pdf.js](https://ekoopmans.github.io/html2pdf.js/) — PDF generation

## License

MIT
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: add CLAUDE.md and update README"
```

---

### Task 12: Final Wiring & Smoke Test

**Files:**
- Modify: `src/main.js` (already complete from previous tasks)

- [ ] **Step 1: Verify `main.js` is complete**

`src/main.js` should look exactly like this after all previous tasks:

```js
// src/main.js
import { initTheme } from './theme.js'
import { initEditor } from './editor.js'
import { renderPreview, renderPreviewDebounced } from './preview.js'
import { initResizer } from './resizer.js'
import { initStylePanel } from './stylePanel.js'
import { initPdfExport } from './pdfExport.js'
import { initMobileNav } from './mobileNav.js'

initTheme()
initResizer()
initStylePanel()
initPdfExport()
initMobileNav()
const initialContent = initEditor((markdown) => renderPreviewDebounced(markdown))
renderPreview(initialContent)
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
```
Expected: All 5 tests PASS (debounce × 2, storage × 3).

- [ ] **Step 3: Production build**

```bash
npm run build
npm run preview
```
Expected: `dist/` generated. Preview server serves the app at `http://localhost:4173`. Full functionality works from built output.

- [ ] **Step 4: Manual checklist**

Open `http://localhost:4173` and verify:

- [ ] Editor shows default markdown content
- [ ] Preview updates as you type
- [ ] Tab key inserts 2 spaces in editor
- [ ] Resizer drag adjusts pane widths
- [ ] Sidebar collapses and expands
- [ ] H1 size input changes H1 in preview
- [ ] H1 color picker changes H1 color
- [ ] Margin inputs update preview padding
- [ ] Code grid toggle shows/hides indent lines
- [ ] Theme toggle switches dark/light
- [ ] Refresh: content, settings, and theme all restored
- [ ] PDF Export: preview switches to iframe PDF; ⬇ İndir downloads; ✕ Kapat restores preview
- [ ] Mobile (resize browser to <768px): tab bar appears, each tab works

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final smoke test passed — editor ready for deploy"
```
