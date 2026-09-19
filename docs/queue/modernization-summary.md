# Queue UI Modernization Summary

## Files changed

- src/main.js: queue-item template with queue-index, queue-title, optional queue-thumb (has-thumb, lazy load), ARIA listbox, setupQueueKeyboard, setupQueueDragDrop with queue-drag-handle and data-index
- src/styles.css: tokenized queue states, scrollbars on .layout, ul, #queue-list, opt-in tuner-scrollbars class
- tests/smoke.mjs, tests/queue/theme-hooks.vitest.mjs, tests/queue/queue-dnd.vitest.mjs, tests/theme-queue-scrollbar.vitest.mjs
- scripts/repair-queue-ui.mjs

## Theme tokens

Runtime on :root via ThemeManager (src/theme/themeManager.js): tuner-bg-app, tuner-bg-surface, tuner-bg-surface-alt, tuner-text, tuner-text-muted, tuner-border, tuner-accent, tuner-accent-contrast, tuner-accent-600/700, tuner-focus, q-item-h, queue-thumb-size, tuner-scrollbar-track/thumb/thumb-hover/thumb-active/size/radius. Aliases: scrollbar-track, scrollbar-thumb, scrollbar-thumb-hover, scrollbar-thumb-active, scrollbar-thickness, scrollbar-radius.

## Scrollbar opt-in

Default selectors: .layout, ul, #queue-list. Opt-in elsewhere: add class tuner-scrollbars. WebKit supports hover/active thumb variants; Firefox uses scrollbar-color only.

## Behaviors preserved

Add/remove (+Q, Delete), reorder (drag handle + Alt+Arrow), keyboard nav, mouse wheel scroll, thumbnails when track.artwork exists. store.js APIs unchanged. No virtualization.

## Limitations

Firefox lacks scrollbar hover/active pseudo-elements. DnD uses drag handle. Thumbnails need track.artwork. OS scrollbars outside webview not themed.

## Verification results (2026-09-19)

- `node tests/smoke.mjs`: TOTAL_FAILURES=0 (queue-modern, theme-switch-runtime pass)
- Vitest queue suite: 7/7 pass (theme-hooks, queue-dnd, theme-queue-scrollbar)
- Git: f3ae39d feat(queue): theme-aware scrollbars and drag-state CSS

## Large-queue performance

No list virtualization. Queue renders one DOM node per track via `renderQueue()`. Styles use `background`/`outline` transitions on `.queue-item` (no width/height animation) to avoid layout thrash; DnD/keyboard handlers call `moveQueue` then a single `persist()` re-render. Expect linear cost ~O(n) for n items; 1000+ tracks may feel slower on low-end hardware—acceptable without virtualization per scope.

## Test steps

1. node tests/smoke.mjs (expect TOTAL_FAILURES:0)
2. npm run test:node
3. node scripts/run-vitest.mjs tests/queue/theme-hooks.vitest.mjs tests/queue/queue-dnd.vitest.mjs tests/theme-queue-scrollbar.vitest.mjs
4. npm run dev for manual queue, keyboard, DnD, and theme switch check
