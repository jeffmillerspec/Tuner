# Tuner Theme System - Implementation Plan

Repo: F:/Dev/Tuner | Date: 2026-09-19 | Assessment only (no source changes)

## 1. Tech stack and UI layer

| Layer | Technology | Verified paths |
|-------|------------|----------------|
| Desktop | Tauri 2 (Rust) | src-tauri/Cargo.toml, src-tauri/src/main.rs, src-tauri/tauri.conf.json |
| Bundler | Vite 6 | vite.config.js, package.json |
| UI | Vanilla JS ES modules | index.html, src/main.js, src/store.js, src/player.js |
| Styles | CSS custom properties | index.html inline tokens, src/styles.css |
| Theme | ThemeManager | src/theme/themeManager.js, themeInternal.js, validate.js, shades.js, constants.js |
| Tests | node:test + Vitest + happy-dom | tests/*.test.mjs, tests/*.vitest.mjs, vitest.config.mjs |
| CI | GitHub Actions | .github/workflows/tests.yml |

Rationale: CSS vars on :root enable sync theme switch without re-mount. CSS-in-JS rejected for vanilla + Tauri webview.

## 2. Theme JSON schema

From Bundled themes json/clitiles-theme-synthwave-94.json and src/theme/validate.js.

Required (flat root): id, name, appBackground, surface, surfaceAlt, border, text, textMuted, accent, accentContrast, focus, danger, warning, success, scrollbarTrack, scrollbarThumb, scrollbarThumbHover (#RRGGBB each).

Optional: terminal object (ANSI palette keys).

Token map: src/theme/constants.js COLOR_TO_CSS_VAR maps camelCase to --tuner-* vars. DESIGN_DEFAULTS adds radius/space/font tokens. shades.js derives --tuner-accent-500/600/700.

Loader: BUNDLED_THEME_GLOB = '../../Bundled themes json/*.json' via import.meta.glob in themeInternal.js.

## 3. JSON parse validation

Artifact: docs/theme-system/json-parse-results.json
Validated: 2026-09-19T12:45:00Z | total=31 | ok=31 | fail=0 (see docs/theme-system/json-parse-results.json for per-file path, size, valid)

All files parse OK. No invalid files.

Files: New Theme Bundle 1-6.json; clitiles-theme-abyssal-console through clitiles-theme-xeno-signal (22); frost volt.json; matte obsidian.json; warm clay.json.

## 4. ThemeManager insertion points

| Role | Path |
|------|------|
| Public API | src/theme/themeManager.js |
| Load/apply CSS | src/theme/themeInternal.js |
| Parse/validate | src/theme/validate.js |
| Shade generation | src/theme/shades.js |
| Constants | src/theme/constants.js |
| Bootstrap | src/main.js boot() calls initTheme before render |
| UI control | index.html #theme-select |
| Change handler | src/main.js applyTheme on select change |
| Persistence | src/store.js settings.themeId |
| First paint | index.html head style block |

## 5. Shared style resources

- src/styles.css (global layout, panels, inputs, buttons, queue, scrollbars)
- index.html inline --tuner-* defaults
- src/theme/constants.js DESIGN_DEFAULTS

## 6. Queue and scrollbar hooks

Queue: index.html #queue-list; src/main.js .queue-item/.queue-index/.queue-title; src/styles.css --q-item-h, --q-gap, --q-pad-x, --q-radius, --q-index-w.

Scrollbars on .layout, ul, #queue-list:
- Firefox: scrollbar-color with --tuner-scrollbar-thumb/track
- WebKit: ::webkit-scrollbar, ::webkit-scrollbar-track, ::webkit-scrollbar-thumb (:hover, :active)
- Tokens: --tuner-scrollbar-size, --tuner-scrollbar-radius, --tuner-scrollbar-track, --tuner-scrollbar-thumb, --tuner-scrollbar-thumb-hover

Tests: tests/theme-queue-scrollbar.vitest.mjs, tests/smoke/harness.mjs

## 7. Build, run, package

Verified configs: package.json, vite.config.js, src-tauri/Cargo.toml, src-tauri/tauri.conf.json (bundle.targets all). No *.sln, *.csproj, electron-builder.yml, or standalone WiX configs.

Non-destructive toolchain check: npx tauri --version, npx vite --version.

Exact package.json scripts block (verified 2026-09-19):
- dev: vite
- build: vite build
- tauri: tauri
- smoke: node scripts/smoke.mjs
- smoke:static: node tests/smoke.mjs
- smoke:full: powershell -ExecutionPolicy Bypass -File scripts/smoke-test.ps1
- test: node scripts/npm-test-wrapper.mjs
- test:node: node --test tests/theme-validate.test.mjs tests/theme-shades.test.mjs tests/theme-persist.test.mjs
- test:vitest: node scripts/run-vitest.mjs
- test:unit: npm run test:node && npm run test:vitest
- test:all: npm run test:unit && npm run smoke
- test:smoke: node scripts/smoke.mjs
- tauri:build: tauri build
- release:stage: node scripts/stage-release-installer.mjs
- release:build: npm test && npm run tauri:build && npm run release:stage

## 8. Test and smoke

docs/TESTING.md documents commands. Prerequisites: Node 18+, npm install; Rust for tauri:build.

| Command | Script / notes |
|---------|----------------|
| npm test | scripts/npm-test-wrapper.mjs writes tests/reports/test-results.txt |
| npm run test:all | test:unit then smoke |
| node scripts/smoke.mjs --quick | Quick smoke (no npm alias) |
| npm run smoke | Full smoke: optional ci, build, preview :4173, theme harness |
| npm run smoke:static | tests/smoke.mjs wiring checks |
| npm run smoke:full | scripts/smoke-test.ps1 |

Existing tests (pre-implemented, verified on disk):
- tests/theme-shades.test.mjs, tests/theme-persist.test.mjs, tests/theme-validate.test.mjs
- tests/theme-queue-scrollbar.vitest.mjs, tests/smoke.vitest.mjs
- scripts/smoke.mjs, tests/smoke/harness.mjs

Artifacts: tests/reports/test-results.txt, tests/reports/vitest.txt, tests/reports/smoke.log, docs/theme-system/json-parse-results.json

## 9. Aesthetic polish plan

1. Typography: --tuner-font-base/sm/lg on headings and queue titles
2. Spacing: --tuner-space-* on panels and queue rows
3. Elevation: --tuner-shadow-sm/md on panels and active queue-item
4. Contrast: prefers-contrast media query; ensureContrast for accent shades

## 10. Gaps and risks

- npm test may exceed 90s host timeout (~93s vitest nested smoke)
- Full npm run smoke not re-run every session; --quick path verified SMOKE_OK
- src/main.js boot/render tail may be truncated on some reads; verify syntax before release

## 11. Verification log (2026-09-19)

Repo root contains package.json, vite.config.js, index.html, src/, src-tauri/, Bundled themes json/ (31 JSON files).

JSON parse: docs/theme-system/json-parse-results.json total=31 ok=31 fail=0 with per-file size and valid flag.

ThemeManager insertion: src/main.js initTheme/applyTheme; src/store.js settings.themeId; index.html #theme-select; src/theme/* modules.

Queue hooks: index.html #queue-list; src/main.js .queue-item/.queue-index/.queue-title; src/styles.css scrollbar rules on .layout, ul, #queue-list.

Smoke: node scripts/smoke.mjs --quick exit 0 SMOKE_OK TOTAL_FAILURES:0.

Application: Tuner desktop app already present (not greenfield). Analyst scope: docs only, no source changes., track, thumb (:hover, :active)
- Tokens: --tuner-scrollbar-size, --tuner-scrollbar-radius, --tuner-scrollbar-track, --tuner-scrollbar-thumb, --tuner-scrollbar-thumb-hover

Tests: tests/theme-queue-scrollbar.vitest.mjs, tests/smoke/harness.mjs

## 7. Build, run, package

| Command | Maps to |
|---------|--------|
| npm install / npm ci | package-lock.json |
| npm run dev | vite.config.js port 1420 |
| npm run tauri dev | tauri.conf.json beforeDevCommand |
| npm run build | vite build to dist/ |
| npm run tauri:build | Tauri bundle targets all |
| npm run release:stage | scripts/stage-release-installer.mjs |
| npm run release:build | npm test && tauri:build && release:stage |
| npm run smoke | scripts/smoke.mjs (preview port 4173) |

No Electron, .NET, or standalone WiX configs. Packaging via Tauri 2 only.

## 8. Test and smoke

docs/TESTING.md documents commands.

| Command | Script |
|---------|--------|
| npm test | scripts/npm-test-wrapper.mjs (writes tests/reports/test-results.txt) |
| npm run test:all | test:unit && smoke |
| npm run test:node | theme-validate, theme-shades, theme-persist |
| npm run test:vitest | run-vitest.mjs |
| npm run smoke | scripts/smoke.mjs |
| node scripts/smoke.mjs --quick | Quick smoke via --quick flag (no separate npm script) |
| npm run smoke:static | tests/smoke.mjs |
| npm run smoke:full | scripts/smoke-test.ps1 |

Prerequisites: Node 18+, npm install; Tauri desktop builds need Rust toolchain.

Existing test files (verified on disk):
- tests/theme-shades.test.mjs (shade generation, contrast, determinism)
- tests/theme-persist.test.mjs (initTheme, persistence)
- tests/theme-validate.test.mjs (JSON parse/validate)
- tests/theme-queue-scrollbar.vitest.mjs (queue scrollbar CSS + runtime tokens)
- tests/smoke.vitest.mjs (runtime theme switch + smoke delivery)
- scripts/smoke.mjs (build/preview/harness/static checks)

Artifacts: tests/reports/test-results.txt, tests/reports/vitest.txt, tests/reports/smoke.log, docs/theme-system/json-parse-results.json.

## 9. Aesthetic polish plan

1. Typography: bind headings/queue to --tuner-font-base/sm/lg
2. Spacing: normalize panels to --tuner-space-* scale
3. Elevation: add --tuner-shadow-sm/md on panels and active queue rows
4. Contrast: expand prefers-contrast rules; verify --tuner-focus on all controls

## 10. Gaps and risks

- src/main.js and src/styles.css may be truncated on some host reads; verify syntax before release
- npm test duration ~93s (vitest nested smoke)
- src-tauri/Cargo.toml version 0.2.0 vs app 0.3.0
- Tauri native dialogs not CSS-themed

## 11. On-disk verification log (2026-09-19)

stat_path exists=true for: src-tauri/Cargo.toml (435B), src-tauri/src/main.rs (103B), src-tauri/tauri.conf.json (1040B), vite.config.js (362B), package.json (1130B), index.html (1829B), src/main.js (8470B), src/store.js (2198B), src/player.js (469B), src/styles.css (8058B), src/theme/themeManager.js (2709B), src/theme/themeInternal.js (3663B).

JSON parse: docs/theme-system/json-parse-results.json total=31 ok=31 fail=0.

npm run listing verified scripts: dev, build, tauri, smoke, smoke:static, smoke:full, test, test:node, test:vitest, test:unit, test:all, test:smoke, tauri:build, release:stage, release:build. Note: smoke:quick is NOT an npm script; use node scripts/smoke.mjs --quick or npm run smoke -- --quick.

Schema cross-check: validate.js REQUIRED_COLOR_KEYS matches flat hex keys in clitiles-theme-synthwave-94.json; terminal optional.

Application exists: Tauri 2 + Vite entry index.html, src/main.js (not a greenfield scaffold)., track, thumb (:hover, :active)
- Tokens: --tuner-scrollbar-size, --tuner-scrollbar-radius, --tuner-scrollbar-track, --tuner-scrollbar-thumb, --tuner-scrollbar-thumb-hover

Tests: tests/theme-queue-scrollbar.vitest.mjs, tests/smoke/harness.mjs

## 7. Build, run, package

| Command | Maps to |
|---------|--------|
| npm install / npm ci | package-lock.json |
| npm run dev | vite.config.js port 1420 |
| npm run tauri dev | tauri.conf.json beforeDevCommand |
| npm run build | vite build to dist/ |
| npm run tauri:build | Tauri bundle targets all |
| npm run release:stage | scripts/stage-release-installer.mjs |
| npm run release:build | npm test && tauri:build && release:stage |
| npm run smoke | scripts/smoke.mjs (preview port 4173) |

No Electron, .NET, or standalone WiX configs. Packaging via Tauri 2 only.

## 8. Test and smoke

docs/TESTING.md documents commands.

- npm test -> scripts/npm-test-wrapper.mjs
- npm run test:all -> test:unit && smoke
- npm run smoke:quick -> scripts/smoke.mjs --quick

Latest tests/reports/test-results.txt: exit_code=0, node_test=0, vitest=0, smoke=0 (17+5 tests, TOTAL_FAILURES:0).

## 9. Aesthetic polish plan

1. Typography: bind headings/queue to --tuner-font-base/sm/lg
2. Spacing: normalize panels to --tuner-space-* scale
3. Elevation: add --tuner-shadow-sm/md on panels and active queue rows
4. Contrast: expand prefers-contrast rules; verify --tuner-focus on all controls

## 10. Gaps and risks

- src/main.js truncated at render tail on host read
- src/styles.css truncated at button:active on host read
- npm test duration ~93s (vitest nested smoke)
- src-tauri/Cargo.toml version 0.2.0 vs app 0.3.0
- Tauri native dialogs not CSS-themed

Verified via host reads, list_tree, json-parse-results (31/31), test-results.txt (0 failures).
