# CLAUDE.md

## Project
Live Markdown Editor — browser-based markdown editor with live preview, style customization, dark/light theme, and PDF export. Vanilla JS + Vite, no framework.

## Stack
- **Bundler:** Vite (`npm run dev`, `npm run build`)
- **Markdown:** marked.js
- **Syntax highlighting:** highlight.js
- **PDF:** html2pdf.js (loaded via CDN script tag at runtime)
- **Tests:** Vitest (`npm test`) — unit tests in `src/**/*.test.js`

## File Roles
- `src/main.js` — bootstrap and module wiring only; no logic here
- `src/editor.js` — pure textarea controller: Tab key, input debounce, `setEditorContent` helper. Does NOT own persistence.
- `src/tabManager.js` — single source of truth for tab list, active tab, persistence (`tabs-state`), tab bar DOM, drag-reorder, rename, overflow menu
- `src/utils/autoTitle.js` — pure helper that derives a tab title from markdown content
- `src/preview.js` — marked parse, hljs highlight, code grid toggle
- `src/stylePanel.js` — sidebar open/close, CSS var inputs, code grid toggle
- `src/resizer.js` — drag-to-resize divider
- `src/pdfExport.js` — CDN html2pdf, blob URL, iframe preview, download
- `src/theme.js` — dark/light toggle, prefers-color-scheme
- `src/mobileNav.js` — bottom tab bar, breakpoint guard
- `src/formatToolbar.js` — toolbar buttons, MD download (filename derived from active tab title)
- `src/utils/storage.js` — localStorage helpers (`storageGet`, `storageSet`, `storageRemove`)
- `src/utils/debounce.js` — debounce utility

## CSS Custom Properties
All typography/spacing is controlled via CSS custom properties on `:root` (see `styles/main.css`). `stylePanel.js` writes to them at runtime via `document.documentElement.style.setProperty`.

## Conventions
- No framework — vanilla ES modules
- Each module exports an `init*()` function called once from `main.js`
- All localStorage access goes through `src/utils/storage.js` helpers — never call `localStorage` directly
- localStorage keys: `tabs-state` (versioned tab list + content), `style-settings`, `theme`. Legacy: `editor-content` (auto-migrated on first run, then removed)
- DOM event listeners: attach once during init via event delegation; do not re-attach inside render loops. For listeners that may need to be torn down on re-init, use `AbortController`.
- Commits: `type: what and why` (feat/fix/refactor/chore)
- Run `npm test` before committing logic changes
