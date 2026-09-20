# Changelog

## 0.4.0 — 2026-09-20

- Theme-engine loads 31 bundled JSON themes from `Bundled themes json/`.
- `themeManager.js`: `getToken` fallback and color-key aliases; `applyTheme` accepts id strings and `{ id, name }` objects.
- Queue UI uses theme-derived scrollbar tokens (`.tuner-scrollbars`).
- Smoke and unit tests cover theme-engine + bundled JSON integration (zero failures required).
- Release installer staged to `Releases/Tuner-Setup-0.4.0.exe`.
