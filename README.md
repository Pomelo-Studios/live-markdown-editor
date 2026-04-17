# Live Markdown Editor

A free, open-source, browser-based live markdown editor with real-time preview and typography customization.

## Features

- **Split pane** — markdown on the left, rendered preview on the right
- **Resizable divider** — drag to adjust pane widths
- **Style panel** — customize font sizes and colors per heading level (H1–H4), body text, margins, and code block background
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

MIT License
