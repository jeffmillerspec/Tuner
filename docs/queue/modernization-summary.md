# Queue UI Modernization Summary

## Overview

The playback queue was restyled to use theme tokens, clear hover/selected/active states, optional album-art thumbnails, drag-to-reorder handles, and theme-aware scrollbars.

## Before / after

![Queue before modernization](img/before.png)

![Queue after modernization](img/after.png)

Additional reference shots: `docs/queue/images/queue-default.png`, `queue-hover.png`, `queue-drag.png`.

## Files changed

| Path | Role |
|------|------|
| `src/main.js` | `renderQueue()`, `setupQueueKeyboard()`, drag-drop; `#queue-list` gets `tuner-scrollbars`; optional `.queue-thumb` |
| `src/styles.css` | Queue item layout/states; `.tuner-scrollbars` scrollbar tokens (reusable on other lists) |
| `src/theme/themeInternal.js` | `deriveScrollbar()`, `generateShades()`, `buildTokens()`, `applyCssVars()` |
| `src/theme/shades.js` | `computeColorShades()`, `getShadesForTheme()` |
| `src/theme/themeManager.js` | Applies CSS vars on theme switch via `buildTokens` + `applyCssVars` |
| `tests/smoke.mjs` | Static checks for queue markup, CSS, scrollbar token exports |

## Queue interaction states

- **Default**: `--tuner-bg-surface`, `--tuner-text`
- **Hover**: `--tuner-bg-hover`
- **Selected** (keyboard): `.selected` + `--tuner-focus-ring`
- **Active** (now playing): `.active` accent tint
- **Dragging**: reduced opacity + accent border

## Scrollbars

Apply class `.tuner-scrollbars` to any scroll region (queue uses it on `#queue-list`).

Tokens: `--tuner-scrollbar-size`, `--tuner-scrollbar-radius`, track/thumb/hover/active.

WebKit + Firefox rules in `src/styles.css`. Theme switch updates vars via `applyCssVars` — no re-render required.

## Optional thumbnails

When `track.artwork` exists, `.queue-thumb` renders; no API/model changes.

## Manual test steps

1. `npm run dev` — add tracks to queue
2. Verify hover/selected/active visuals and spacing
3. Keyboard: ArrowUp/Down, Home/End, Delete, Alt+Arrow reorder
4. Drag handle reorder; refresh confirms order
5. Switch themes — queue + scrollbar thumb update immediately
6. `node tests/smoke.mjs` — expect `TOTAL_FAILURES:0`

## Enable modern scrollbars elsewhere

Add class `tuner-scrollbars` to any overflow container (e.g. library list). No extra JS.

## Verification

**2026-09-19:** Automated smoke (`node tests/smoke.mjs`) passes with `TOTAL_FAILURES:0`. Manual smoke: queue renders with modern visuals; scrollbars respond to hover/pressed shades; add/remove/reorder unchanged; theme switch updates queue and scrollbar colors immediately.

## Limitations

- Scrollbar styling: WebKit/Firefox only
- No virtualization; very large queues (1000+) may need future virtual list
- Tauri native chrome not CSS-themed
