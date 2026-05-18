# Changelog

All notable changes to this project are documented here.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [v1.2.0] - 2026-05-18

### Added
- Multi-tab editor — open multiple markdown documents simultaneously and switch between them via a tab bar above the editor (#1).
- Tab bar with create (`+`), close (`✕`), double-click to rename, drag-to-reorder, and an overflow dropdown (`▾`) listing all open tabs when the strip overflows.
- Auto-derive tab title from the first H1 heading; falls back to the first non-empty line or `"Untitled"`. Users can override with a custom name.
- New versioned `tabs-state` localStorage key persists tab list, content, and active tab across reloads.
- Automatic migration: existing single-document state under the legacy `editor-content` key is wrapped into a single tab on first run; the legacy key is then removed.
- `src/utils/storage.js` gained a `storageRemove(key)` helper so all localStorage access stays funneled through one module.

### Changed
- `editor.js` is now a pure textarea controller; it no longer owns persistence. The tab manager is the single source of truth for content.
- MD download filename now uses the active tab's title (sanitized) instead of regex-matching the first `# H1` in the textarea.
- README features list updated to describe multi-tab editing.

### Notes
- Tab bar is hidden on mobile (`<768px`) in this release. A mobile-specific tab UX is planned for a later phase.
- HTML5 drag-to-reorder is desktop-only by design.
