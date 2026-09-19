# Theme System Summary (v0.3.0)

## Files
- src/theme/constants.js, validate.js, shades.js, themeManager.js
- Bundled themes json/*.json (31 themes, Vite eager glob)
- src/store.js settings.themeId via localStorage tuner-data
- src/main.js boot() + #theme-select
- src/styles.css (--tuner-* CSS variables, queue/scrollbars)
- tests/theme-validate.test.mjs, tests/theme-shades.test.mjs

## Public API
initTheme({getThemeId,setThemeId}), applyTheme(id), getToken(name), subscribe(fn), listThemes(), reloadThemes()

## Integration
1. await initTheme(...) in boot() before render()
2. theme-select change calls applyTheme
3. CSS uses var(--tuner-bg-app) etc.

## Release
npm run release:build stages Releases/Tuner-Setup-latest.exe

## Tests
npm test
