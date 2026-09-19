# ThemeManager UI Integration Notes

## Integration points

| Location | Role |
|----------|------|
| `src/main.js` | `boot()` loads store, awaits `initTheme({ getThemeId, setThemeId })`, binds `#theme-select`, sets `dataset.themeReady`, then first `render()` |
| `src/ui/themeSelect.js` | `bindThemeSelectOnce({ listThemes, applyTheme, subscribe, getThemeId })` wires `#theme-select` |
| `src/store.js` | Persists `settings.themeId` via `getThemeId()` / `setThemeId()` |
| `src/theme/themeManager.js` | `initTheme`, `applyTheme`, `getToken`, `subscribe`, `listThemes`, `reloadThemes` |
| `src/theme/themeInternal.js` | Loads `Bundled themes json/`; built-in light/dark fallbacks; applies CSS vars on `:root` |
| `src/styles.css` | Token-bound body, header, panel, input, button, list items; dialog/tooltip/menu hooks |
| `index.html` | `#theme-select` (`aria-label="Theme"`); inline `:root` anti-flicker defaults |

## Token mapping

| Token | Purpose |
|-------|--------|
| `--tuner-bg` | App background |
| `--tuner-fg` | Primary text |
| `--tuner-surface` | Header/panel surface |
| `--tuner-on-accent` | Text on accent buttons |
| `--tuner-accent-hover` | Button hover (`--tuner-accent-600`) |
| `--tuner-accent-pressed` | Button active (`--tuner-accent-700`) |
| `--tuner-focus-ring` | Focus outline |
| `--tuner-border-strong` | Emphasized borders |
| `--bg`, `--fg`, `--surface`, `--border`, `--accent` | Generic aliases from `themeInternal.js` |

Shade variants `--tuner-accent-50`…`900` derived by `shades.js`.

## Modified style files

- **`src/styles.css`**: body/header/panel/input/button/list tokens; hover/active/disabled shades; dialog/tooltip/menu hooks; `@media (prefers-contrast: more)` with `color-mix`; `@media (forced-colors: active)` Canvas/CanvasText outlines.

## Startup flow

1. Inline `:root` defaults in `index.html` prevent FOUC.
2. `load()` restores `settings.themeId`.
3. `await initTheme({ getThemeId, setThemeId })` applies persisted or default theme CSS vars.
4. `dataset.themeReady = 'true'` (tests/diagnostics only).
5. `bindThemeSelectOnce()` populates `#theme-select` from `listThemes()`.
6. First `render()` after tokens applied.

## Runtime switching

- `#theme-select` change → `applyTheme(id, { persist: true })` updates CSS vars synchronously.
- `subscribe()` keeps dropdown in sync.

## Testing steps

1. `node tests/smoke.mjs` — expect `TOTAL_FAILURES:0` (theme-ready-marker, theme-switch-runtime, theme-persist).
2. `npm test` — theme unit tests.
3. `npm run dev` — switch themes in header; verify immediate update on body, buttons, inputs, queue list.
4. Reload — theme persists, no flash.
5. Tab through controls — `:focus-visible` visible (`--tuner-focus-ring`).
6. Light/Dark bundled themes — readable text on surfaces and accents.
7. OS high contrast — thicker borders (`prefers-contrast: more`); forced-colors uses CanvasText outlines.

## Limitations and follow-ups

- Tauri native dialogs not CSS-themed.
- Secondary controls (video chrome) use platform defaults.
- Planned: transition polish on theme switch; error/toast token coverage.
- Perf: theme switch is synchronous CSS-var update only — no full re-render.
- Tooltips/menus unused; CSS hooks present.
- Dropdown populates after async `initTheme`.
