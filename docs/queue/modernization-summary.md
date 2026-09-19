# Queue UI Modernization Summary

## Overview

The playback queue was restyled to use theme tokens, clear hover/selected/active states, optional album-art thumbnails, drag-to-reorder handles, and theme-aware scrollbars.

## Files changed

| Path | Role |
|------|------|
| `src/main.js` | `renderQueue()`, keyboard nav, drag-drop, `tuner-scrollbars` class |
| `src/styles.css` | Queue item layout, states, scrollbar tokens (`--tuner-scrollbar-*`) |
| `src/theme/themeInternal.js` | Scrollbar thumb/track derived from theme shades |
| `src/theme/themeManager.js` | Applies CSS vars on theme switch |

## Queue interaction states

- **Default**: `--tuner-bg-surface`, `--tuner-text`
- **Hover**: `--tuner-bg-hover`
- **Selected** (keyboard focus): `.selected` + focus ring via `--tuner-focus`
- **Active** (now playing): `--tuner-accent` tint
- **Dragging / drag-over**: reduced opacity + accent border

## Scrollbars

- Class `.tuner-scrollbars` on `#queue-list` (reusable on other scroll regions)
- Tokens: `--tuner-scrollbar-size`, `--tuner-scrollbar-radius`, track/thumb/hover/active
- WebKit (`::-webkit-scrollbar*`) + Firefox (`scrollbar-color`) rules in `src/styles.css`
- Theme switch updates thumb/track via `applyCssVars` — no queue re-render required

## Optional thumbnails

When `track.artwork` is present on a library item, a `.queue-thumb` image is rendered; no API changes.

## Manual test steps

1. `npm run dev` — open app, add tracks to queue
2. Verify hover/selected/active visuals and spacing
3. Keyboard: ArrowUp/Down, Home/End, Delete, Alt+Arrow reorder
4. Drag handle reorder; confirm order persists after refresh
5. Switch themes — queue colors and scrollbar thumb update immediately
6. `node tests/smoke.mjs` — static + runtime theme switch checks

## Limitations

- Scrollbar styling is WebKit/Firefox only; no native styling on all platforms
- Apply `.tuner-scrollbars` to additional lists for global modern scrollbars
- No virtualization today; very large queues (1000+) may need a future virtual list
