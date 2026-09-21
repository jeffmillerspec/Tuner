# Changelog

## 0.5.4 - 2026-09-21

- Apple Music Connect (above Spotify): zero-setup catalog search via iTunes Search.
- Play song previews in Tuner; Apple Music embeds for longer listening; open full tracks in Apple Music.
- Optional MusicKit developer token for Apple Music catalog API search.
- Full DRM streaming inside WebView2 is not supported on Windows; use embed or the Apple Music app.
- Installer staged to `Releases/Tuner-Setup-0.5.4.exe` (NSIS, Windows x64, unsigned).

## 0.5.3 - 2026-09-21

- Fix Podcasts Connect fetch failures in the desktop WebView (iTunes `text/javascript` + nosniff).
- Use Tauri HTTP, then JSONP, then browser fetch; RSS enclosure fallback for episodes.
- Installer staged to `Releases/Tuner-Setup-0.5.3.exe` (NSIS, Windows x64, unsigned).

## 0.5.2 - 2026-09-20

- Stage visuals: custom play-style icons when audio has no video frames (local, radio, Spotify, Audius, Archive, Podcasts).
- Connections panel stays open while browsing/playing Audius, Internet Archive, and Podcasts.
- Internet Archive Connect: free music, LibriVox audiobooks, and public-domain films (zero setup).
- Podcasts Connect: search and play episodes via Apple's public iTunes Search API (zero setup).
- Installer staged to `Releases/Tuner-Setup-0.5.2.exe` (NSIS, Windows x64, unsigned).

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
