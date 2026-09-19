# Tuner 0.4.0 Theme System

## Build steps

1. npm install --no-fund --no-audit
2. node --test tests/theme-validate.test.mjs tests/theme-shades.test.mjs tests/theme-persist.test.mjs tests/theme-api.test.mjs tests/theme/shades.test.mjs tests/theme/persistence.test.mjs
3. node tests/smoke.mjs
4. npm run build
5. npm run tauri:build
6. npm run release:stage

Or: npm run release:build

## Output paths

- dist/
- dist/Bundled themes json/
- src-tauri/target/release/bundle/nsis/*-setup.exe
- Releases/Tuner-Setup-0.4.0.exe
- Releases/Tuner-Setup-latest.exe
- Releases/installer-meta.json

## ThemeManager

Modules: src/theme/themeManager.js, themeInternal.js, shades.js, constants.js
Themes: Bundled themes json/ (31 files via Vite glob)
API: getToken(key,fallback?), subscribe, applyTheme(name|object)
Default: abyssal-console
Version: 0.4.0 in package.json, tauri.conf.json, Cargo.toml, index.html
Git baseline: fb6dbc3
