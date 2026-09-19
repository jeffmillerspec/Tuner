# Queue UI Modernization Summary

## Files changed

| File | Changes |
|------|---------|
| `src/main.js` | Modern `#queue-list` items use `.queue-item`, `.queue-index`, `.queue-title`; ARIA `role=listbox` / `option`; `setupQueueKeyboard()` for arrow/Home/End/Delete; queue reorder via `rmq`; `boot()` unchanged for ThemeManager |
| `src/styles.css` | Tokenized queue layout vars; hover/active/focus-visible states; reusable scrollbar rules on `.layout`, `ul`, `#queue-list` with hover/pressed thumb variants |
| `scripts/repair-queue-ui.mjs` | Idempotent repair for truncated CSS/JS during development |
| `tests/smoke.mjs` | `queue-modern` static check for queue JS/CSS markers |
| `tests/theme-queue-scrollbar.vitest.mjs` | Runtime theme switch updates `--tuner-scrollbar-thumb` |
| `tests/queue/theme-hooks.vitest.mjs` | CSS token references and theme hook smoke |

## Theme tokens used

- Surfaces/text: `--tuner-bg-surface-alt`, `--tuner-border`, `--tuner-text`, `--tuner-text-muted`, `--tuner-accent`, `--tuner-accent-contrast`, `--tuner-accent-hover`
- Focus: `--tuner-focus`
- Scrollbars: `--tuner-scrollbar-track`, `--tuner-scrollbar-thumb`, `--tuner-scrollbar-thumb-hover`, `--tuner-scrollbar-thumb-active`, `--tuner-scrollbar-size`, `--tuner-scrollbar-radius`
- Spacing/type: `--tuner-space-*`, `--tuner-font-sm`, `--tuner-radius-sm`

## Scrollbar styling scope

Modern scrollbars apply to **`.layout`**, all **`ul`**, and **`#queue-list`** so library/playlist/queue lists share the same token-driven chrome. Firefox uses `scrollbar-width` + `scrollbar-color`; WebKit uses `::-webkit-scrollbar*` with `:hover` and `:active` thumb states.

**App-wide flag:** add class `tuner-scrollbars` to any scroll container and copy the shared block from `src/styles.css` (or extend the existing `.layout, ul` selector).

**Limitations:** native OS overlay scrollbars may ignore custom styling; Tauri/WebView2 requires WebKit pseudo-elements; no drag-to-reorder (keyboard/mouse only); album thumbnails omitted (no artwork field on tracks).

## Performance

No list virtualization; full DOM render. Documented ~190ms for 5000-item stress in `docs/queue/smoke-report.md`. Re-render on queue mutation only; theme switches update CSS variables without rebuilding queue nodes.

## Test steps

1. `node tests/smoke.mjs` — expect `PASS:queue-modern`, `PASS:theme-switch-runtime`, `TOTAL_FAILURES:0`
2. `npx vitest run tests/theme-queue-scrollbar.vitest.mjs tests/queue/theme-hooks.vitest.mjs` — 4 tests pass
3. Manual: `npm run dev` → add tracks to queue → verify spacing, active row, focus ring (Tab/arrow keys), scrollbar colors
4. Switch theme in header `#theme-select` → queue row and scrollbar colors update immediately without reload

## Behaviors preserved

Add (`+Q`), remove (`rmq`/Delete key), reorder (keyboard), play from queue, playlist load — no changes to `store.js` data model or public APIs.
