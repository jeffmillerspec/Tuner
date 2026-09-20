# Changelog

## 0.5.0 - 2026-09-20

- Live Radio: stations from the Radio Browser directory (local and US-national selections) with curated stream fallbacks.
- Spotify connection: guest browsing of curated playlists and embeds; optional PKCE sign-in with a user-supplied Spotify Client ID for personal playlists.
- Branding: new application icon and NSIS installer header/sidebar imagery.
- Focus mode: compact always-on-top window; layout polish and window scaling fixes.
- Installer staged to `Releases/Tuner-Setup-0.5.0.exe` (NSIS, Windows x64, unsigned).

## 0.4.0 - 2026-09-20

- Theme-engine loads 31 bundled JSON themes from `Bundled themes json/`.
- `themeManager.js`: `getToken` fallback and color-key aliases; `applyTheme` accepts id strings and `{ id, name }` objects.
- Queue UI uses theme-derived scrollbar tokens (`.tuner-scrollbars`).
- Smoke and unit tests cover theme-engine + bundled JSON integration (zero failures required).
- Release installer staged to `Releases/Tuner-Setup-0.4.0.exe`.
