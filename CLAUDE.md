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
- `src/editor.js` — textarea, Tab key, input debounce
- `src/preview.js` — marked parse, hljs highlight, code grid toggle
- `src/stylePanel.js` — sidebar open/close, CSS var inputs, code grid toggle
- `src/resizer.js` — drag-to-resize divider
- `src/pdfExport.js` — CDN html2pdf, blob URL, iframe preview, download
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
