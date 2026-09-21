# Tuner

Compact Windows media player with playlists, a play queue, live radio, an optional Spotify connection, and 31 bundled themes. Built with Tauri 2 (Rust) and a Vite front end.

Part of [Nexus Applications](https://nexus-applications.com). Product page and release notes: <https://nexus-applications.com/applications/tuner>.

## Features

- Local library import for audio and video (MP4 and WebM via the built-in HTML5 player)
- Playlists (create, rename, add, remove, reorder) and a queue panel with previous/next transport
- Now Playing stage with native media controls
- Focus mode: compact always-on-top window; standard 1180x720 layout otherwise
- Live Radio from the Radio Browser directory (local and US-national selections) with curated fallbacks
- Spotify: browse curated playlists as a guest; optional PKCE sign-in with your own Spotify Client ID for personal playlists
- 31 bundled JSON themes with theme-aware scrollbars; selection persists between sessions

## Install

Releases are published on the [GitHub Releases](https://github.com/jeffmillerspec/Tuner/releases) page and, for verified Nexus accounts, at <https://nexus-applications.com/downloads>.

- Windows 10/11, x64. The NSIS installer installs per user and bootstraps Microsoft Edge WebView2 if it is missing.
- Installers are not code-signed. Windows SmartScreen will warn. Verify the SHA-256 published with the release before running:

```powershell
Get-FileHash .\Tuner-Setup-0.5.4.exe -Algorithm SHA256
```

## Develop

```sh
npm install
npm run tauri dev
```

Requires Node.js 20+, Rust (stable), and the Tauri 2 prerequisites for Windows.

## Test

```sh
npm test          # node tests + vitest + smoke via the wrapper
npm run test:all  # unit + smoke
```

## Build a release

```sh
npm run release:build   # tests, tauri build, stage installer to Releases/
```

Staged installers (`Releases/*.exe`) are ignored by git and attached to GitHub Releases with their SHA-256.

## License

MIT. See [LICENSE](LICENSE).
