# ThemeManager UI Integration Notes

## Integration points

| Location | Role |
|----------|------|
| `src/main.js` | `boot()` calls `initTheme()` before first `render()`; `#theme-select` calls `applyTheme()`; `subscribe()` refreshes theme dropdown |
| `src/store.js` | Persists `settings.themeId` in `localStorage` key `tuner-data` |
| `src/styles.css` | Static fallbacks on `:root`; runtime tokens set on `document.documentElement` by ThemeManager |
| `index.html` | Header `#theme-select` control; version `0.3.0` |
| `src/theme/themeManager.js` | Public API: `initTheme`, `applyTheme`, `getToken`, `subscribe`, `listThemes`, `reloadThemes` |

## Modified style files

- **`src/styles.css`**: `body`, `header`, `.panel`, `input`/`select`, `button` (hover/active use `--tuner-accent-*` shades), list items, scrollbars, `@media (prefers-contrast: more)` focus/border boost.

## Startup flow

1. `load()` restores store including `settings.themeId`.
2. `await initTheme({ getThemeId, setThemeId })` loads bundled JSON, applies persisted or default theme, sets CSS variables on `:root`.
3. `document.documentElement.dataset.themeReady = 'true'` marks readiness for smoke/tests.
4. First `render()` runs after tokens are applied (no flicker from empty defaults).

## Runtime switching

- User changes `#theme-select` → `applyTheme(id)` updates CSS vars and notifies subscribers synchronously.
- `setThemeId` persists to localStorage via store `save()`.
- No app restart required; lists/buttons pick up new vars immediately.

## Testing steps

1. `node tests/smoke.mjs` — static checks for theme-manager, theme-ui, theme-persist, theme-ready-marker.
2. `npm run dev` — open app, confirm default theme colors on body/buttons/lists.
3. Switch theme in header dropdown; verify immediate color change and persistence after reload.
4. Tab through controls; confirm `:focus` outline remains visible (`--tuner-focus`).
5. Enable OS high-contrast mode; confirm thicker focus outlines and stronger borders.

## Limitations / follow-ups

- Tauri native dialogs (`@tauri-apps/plugin-dialog`) are not themed by CSS tokens.
- Tooltips/menus not used in current UI; add token hooks when introduced.
- Theme list populated after async `initTheme`; brief moment before options appear on cold start.
