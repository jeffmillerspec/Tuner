# Queue UI Modernization Summary

## Changes

| File | Change |
|------|--------|
| `src/styles.css` | Queue items (`.queue-item`), hover/active states, theme-token scrollbars on `.layout` and `ul` |
| `src/main.js` | Queue rows use `.queue-item`, `.queue-index`, `.queue-title`; boot restores theme before first render |
| `index.html` | `#queue-list` panel unchanged (no data model changes) |

## Theme tokens used

- Surfaces: `--tuner-bg-app`, `--tuner-bg-surface`, `--tuner-bg-surface-alt`
- Text: `--tuner-text`, `--tuner-text-muted`, `--tuner-accent-contrast`
- Accent states: `--tuner-accent`, `--tuner-accent-hover`, `--tuner-accent-active`
- Scrollbars: `--tuner-scrollbar-track`, `--tuner-scrollbar-thumb`, `--tuner-scrollbar-thumb-hover`

Scrollbars apply globally to scrollable lists (library, playlists, queue) and the main `.layout` grid.

## Album art

Not added — track model has `id`, `name`, `path`, `type` only; no artwork field without API changes.

## Limitations

- WebKit scrollbar pseudo-elements only (Chromium/Tauri WebView2); Firefox uses `scrollbar-color`.
- No list virtualization (unchanged); large queues render all DOM nodes as before.
- Drag-to-reorder not implemented; playlist reorder uses Up/Dn buttons only.

## Manual test steps

1. `npm run dev` or launch packaged app.
2. Import tracks, add to queue (+Q), verify row hover and active (now playing) highlight.
3. Scroll queue with mouse wheel; confirm thumb/track match theme.
4. Change theme in header `#theme-select`; queue and scrollbars update without restart.
5. Restart app; persisted theme and queue state reload correctly.

## Automated smoke

`node tests/smoke.mjs` checks `queue-item` class in `src/main.js` and scrollbar tokens in `src/styles.css`.
