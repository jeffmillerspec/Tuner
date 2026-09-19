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

## Test steps

1. node tests/smoke.mjs (expect TOTAL_FAILURES:0)
2. npm run test:node
3. node scripts/run-vitest.mjs tests/queue/theme-hooks.vitest.mjs tests/queue/queue-dnd.vitest.mjs tests/theme-queue-scrollbar.vitest.mjs
4. npm run dev for manual queue, keyboard, DnD, and theme switch check
