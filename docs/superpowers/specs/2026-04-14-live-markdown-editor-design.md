# Live Markdown Editor — Design Spec

**Date:** 2026-04-14  
**Status:** Approved

---

## Overview

A free, open-source, browser-based live markdown editor. Split-pane layout with a collapsible style panel. Supports typography customization, dark/light theme, PDF export with preview, and a mobile-friendly tab-based navigation. Hosted statically (GitHub Pages).

---

## Tech Stack

- **Bundler:** Vite
- **Language:** Vanilla JavaScript (ES modules, no framework)
- **Markdown parsing:** marked.js (npm)
- **Syntax highlighting:** highlight.js (npm)
- **PDF export:** html2pdf.js (npm)
- **Hosting:** GitHub Pages (static `dist/` output)

---

## File Structure

```
live-markdown-editor/
├── index.html
├── vite.config.js
├── package.json
├── CLAUDE.md
├── README.md
├── .gitignore
├── src/
│   ├── main.js              # Bootstrap, event wiring
│   ├── editor.js            # Textarea management, tab key handling
│   ├── preview.js           # marked.js render + highlight.js integration
│   ├── stylePanel.js        # Left sidebar state & DOM updates
│   ├── resizer.js           # Drag-to-resize divider logic
│   ├── pdfExport.js         # Panel swap, html2pdf.js, download trigger
│   ├── theme.js             # Dark/light toggle, prefers-color-scheme
│   └── mobileNav.js         # Bottom tab bar, breakpoint detection
├── styles/
│   ├── main.css             # Layout, CSS custom properties
│   ├── preview.css          # Preview typography styles
│   ├── sidebar.css          # Left style panel
│   └── mobile.css           # Media queries (≤768px)
└── public/
    └── favicon.svg
```

---

## Layout (Desktop)

```
┌─────────────┬──────────────────┬───┬──────────────────┐
│ Style Panel │  Markdown Editor │ ║ │     Preview      │
│  (220px)    │                  │   │                  │
│  ◀ toggle   │  <textarea>      │ ↔ │  rendered HTML   │
│             │                  │   │                  │
│  [sections] │                  │   │                  │
└─────────────┴──────────────────┴───┴──────────────────┘
                        footer bar
```

- **Left sidebar:** 220px open, 36px collapsed. CSS transition. Toggle button top-left.
- **Resizable divider:** drag left/right to adjust editor/preview width ratio. Min 20%, max 80% each. Implemented via `mousedown`/`mousemove` updating flex-basis percentages.
- **Theme toggle:** top-right corner, 🌙/☀ button.
- **PDF Export button:** in the toolbar/header area.

---

## Style Panel Sections

All values are applied as CSS custom properties on `:root` and reflected immediately in the preview.

| Section | Controls |
|---------|----------|
| **Headings** | H1, H2, H3, H4 — font-size (px) + color (color picker) |
| **Body** | font-size (px) + color (color picker) |
| **Margins** | top, right, bottom, left (px) — applies to preview content area |
| **Code Block** | background color + indent grid toggle (vertical guide lines) |

CSS variables: `--h1-size`, `--h1-color`, `--h2-size`, `--h2-color`, `--h3-size`, `--h3-color`, `--h4-size`, `--h4-color`, `--body-size`, `--body-color`, `--preview-margin-top`, `--preview-margin-right`, `--preview-margin-bottom`, `--preview-margin-left`, `--code-bg`, `--code-grid`.

---

## Editor Behavior

- Native `<textarea>` — no external editor library.
- Tab key inserts 2 spaces (preventDefault on Tab keydown).
- Markdown re-renders on every `input` event, debounced at 150ms.
- No scroll sync between editor and preview.

---

## Preview Rendering

- `marked.js` parses markdown to HTML.
- `highlight.js` applied to `<code>` blocks after render.
- Preview HTML injected into a dedicated `<div id="preview">`.
- All typography and spacing controlled via CSS custom properties.

---

## Theme System

- On first load: read `prefers-color-scheme` media query.
- Theme stored in `localStorage` as `theme: "dark" | "light"` — subsequent loads use stored value.
- Applied via `<body data-theme="dark|light">` attribute.
- All colors defined as CSS custom properties scoped to `[data-theme="dark"]` and `[data-theme="light"]`.
- Toggle button: top-right corner of the header.

---

## PDF Export Flow

1. User clicks "PDF Export" button in toolbar.
2. Preview pane enters PDF preview mode: toolbar updates to show "⬇ İndir" + "✕ Kapat" buttons.
3. `html2pdf.js` generates the PDF as a Blob from the preview content area (editor and sidebar excluded).
4. A Blob URL is created (`URL.createObjectURL`) and loaded into an `<iframe>` that fills the preview pane — this is the inline PDF preview.
5. "⬇ İndir" triggers a programmatic `<a download>` click using the same Blob URL.
6. "✕ Kapat" revokes the Blob URL, removes the iframe, and restores the markdown preview.

---

## Data Persistence (localStorage)

| Key | Value | Saved when |
|-----|-------|------------|
| `editor-content` | markdown string | on input, debounced 1s |
| `style-settings` | JSON of all CSS variable values | on any style change |
| `theme` | `"dark"` or `"light"` | on toggle |

On load: restore all three. If `editor-content` is empty, populate with default sample content (demonstrates headings, code block, list, bold/italic).

---

## Mobile Layout (≤768px)

- Left sidebar hidden entirely.
- Resizer disabled.
- Bottom fixed tab bar with 3 tabs: **✏ Düzenle** / **👁 Önizle** / **⚙ Stil**
- Active tab determines which pane is visible (full screen).
- Stil tab shows sidebar content as a full-screen sheet.
- Default active tab: Düzenle (editor).

---

## Footer

Thin bar at the bottom of the page:

```
Powered by Pomelo Studios  •  GitHub ↗
```

- GitHub link: `https://github.com/Pomelo-Studios/live-markdown-editor`
- Styled to match dark/light theme.
- Always visible (not inside panes).

---

## Project Files

### .gitignore
```
node_modules/
dist/
.env
.env.local
.env.*.local
.DS_Store
package-lock.json
.next/
build/
.superpowers/
```

### CLAUDE.md
Project-level Claude Code instructions covering stack, file roles, and conventions.

### README.md
Project description, feature list, installation (`npm install`, `npm run dev`), build (`npm run build`), and deploy instructions (GitHub Pages via `dist/`).
