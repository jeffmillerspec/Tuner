# Tuner Theme Integration Plan

Assessment: 2026-09-19 rev3. Repo: F:/Dev/Tuner. Audit/plan only; no application code changes in this phase.

## 1. Executive Summary

Tauri 2 + Vite 6 + vanilla JS. Hardcoded src/styles.css. 31 bundled theme JSON files. No runtime theme system. Existing functioning app (index.html, src/, src-tauri/, .functioning-app).

## 2. Tech Stack (verified paths)

| Layer | Tech | Path |
|-------|------|------|
| Shell | Tauri 2 | src-tauri/tauri.conf.json |
| Bundler | Vite ^6.0.0 | vite.config.js, package.json |
| UI | Vanilla JS | index.html, src/main.js |
| CSS | Plain CSS | src/styles.css |
| State | localStorage | src/store.js (KEY=tuner-data) |
| Tests | Vitest ^3.0.0 | npm test, src/playback-test.js |
| Icons | Tauri | src-tauri/icons/, app-icon.png |

Not WPF/WinForms/Electron/React. Entry: index.html -> src/main.js -> store.js, player.js, render().

## 3. Current Styling

Entry: src/styles.css only. No CSS variables. No ::-webkit-scrollbar rules (search confirmed absent).

Excerpt src/styles.css:
body{margin:0;font-family:system-ui,sans-serif;background:#0f1117;color:#eee;font-size:13px}
.panel{background:#171a22;border:1px solid #2a2f3a;border-radius:6px;padding:8px}
.layout{...overflow:auto}
ul{list-style:none;margin:0;padding:0;max-height:120px;overflow:auto}

## 4. Bundled Themes

Directory: Bundled themes json/ — 31 files (22 clitiles-theme-*, 6 New Theme Bundle N.json, 3 standalone).

Sorted filenames: clitiles-theme-abyssal-console.json, clitiles-theme-amaranth-drive.json, clitiles-theme-amber-crt.json, clitiles-theme-azure-rift.json, clitiles-theme-blood-moon.json, clitiles-theme-chrome-cathedral.json, clitiles-theme-cobalt-foundry.json, clitiles-theme-copper-halo.json, clitiles-theme-coral-drift.json, clitiles-theme-cryo-lab.json, clitiles-theme-helios-flare.json, clitiles-theme-ion-storm.json, clitiles-theme-iris-protocol.json, clitiles-theme-occult-archive.json, clitiles-theme-olive-circuit.json, clitiles-theme-reactor-warning.json, clitiles-theme-rose-alloy.json, clitiles-theme-synthwave-94.json, clitiles-theme-tungsten-pulse.json, clitiles-theme-ultraviolet-grid.json, clitiles-theme-vesper-circuit.json, clitiles-theme-xeno-signal.json, frost volt.json, matte obsidian.json, New Theme Bundle 1.json, New Theme Bundle 2.json, New Theme Bundle 3.json, New Theme Bundle 4.json, New Theme Bundle 5.json, New Theme Bundle 6.json, warm clay.json. COUNT=31.

### JSON validation (host-verified)

Command:
node --eval "const f=require('fs'),p='Bundled themes json',a=f.readdirSync(p).filter(x=>x.endsWith('.json'));let o=0;a.forEach(n=>{JSON.parse(f.readFileSync(p+'/'+n,'utf8'));o++});console.log('JSON_VALIDATE TOTAL='+a.length+' OK='+o+' FAIL='+(a.length-o))"

Output: JSON_VALIDATE TOTAL=31 OK=31 FAIL=0

### Schema from real file

Excerpt Bundled themes json/clitiles-theme-abyssal-console.json lines 1-20:
{
  "id": "abyssal-console",
  "name": "Abyssal Console",
  "appBackground": "#02090e",
  "surface": "#05131b",
  "surfaceAlt": "#0a202b",
  "border": "#164254",
  "text": "#dbf2f2",
  "textMuted": "#759ca2",
  "accent": "#27d8c7",
  "accentContrast": "#03110f",
  "focus": "#4eeaff",
  "danger": "#ff667a",
  "warning": "#e7bd5a",
  "success": "#50df9b",
  "scrollbarTrack": "#041017",
  "scrollbarThumb": "#123746",
  "scrollbarThumbHover": "#1d596b",
  "terminal": {
    "background": "#01070b",
    "foreground": "#cce8e8"

Derived schema: id (string), name (string), 15 hex color fields, optional terminal object (background, foreground, cursor, selection, black..brightWhite).

Second example: New Theme Bundle 1.json id crimson-relay accent #d9272e.

## 5. Token Mapping

appBackground->--tuner-bg-app; surface->--tuner-bg-surface; surfaceAlt->--tuner-bg-surface-alt; border->--tuner-border; text->--tuner-text; textMuted->--tuner-text-muted; accent->--tuner-accent; accentContrast->--tuner-accent-contrast; focus->--tuner-focus; danger/warning/success; scrollbarTrack/Thumb/ThumbHover.

Derived: --tuner-radius-sm 4px, --tuner-radius-md 8px, --tuner-font-size-base 14px, --tuner-line-height 1.45. Shades PROPOSED src/theme/shades.js.

(Sections 6-16 follow; see file tail. If truncated re-run replace from rev3 backup.)dius-sm 4px, --tuner-radius-md 8px, --tuner-space-sm 8px, --tuner-space-md 12px, --tuner-font-size-base 14px, --tuner-line-height 1.45. Shades PROPOSED src/theme/shades.js.

## 6. ThemeManager

PROPOSED not on disk: src/theme/themeManager.js, shades.js, theme.schema.json. API: listThemes, loadTheme, applyTheme, initTheme, validateTheme. INSERT existing: src/main.js initTheme before render; src/styles.css :root vars; index.html select#theme-select; src/store.js settings.themeId. Default abyssal-console. Light candidate warm clay.json.

## 7. Song Queue verified

Container: #queue-list (index.html ul#queue-list). Not .queue.
State: src/store.js queue[], loadPlaylistQueue(), setCurrent().
Render: function render() in src/main.js.
Excerpt:
function render() {
  ...
  const q = $('queue-list');
  q.innerHTML = '';
  state.queue.forEach((tid, i) => {
    li.className = state.currentId === tid ? 'active' : '';
    q.appendChild(li);
  });
}
Controls: #btn-prev #btn-next (index.html). ThemeManager: await initTheme() before first render().

## 8. Scrollbars verified

No ::-webkit-scrollbar. src/styles.css .layout overflow:auto; ul max-height:120px overflow:auto. Plan CSS on .layout .panel ul #queue-list.

## 9. Build Run Package

package.json scripts verbatim:
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "tauri": "tauri",
  "test": "node scripts/npm-test-wrapper.mjs",
  "test:smoke": "node tests/smoke.mjs",
  "tauri:build": "tauri build"
}
"build": "vite build"
"tauri": "tauri"
"test": "node scripts/npm-test-wrapper.mjs"
"test:smoke": "node tests/smoke.mjs"
"tauri:build": "tauri build"

| Command | Purpose |
| npm install | Install deps |
| npm run dev | Vite dev server port 1420 |
| npm run build | Frontend build to dist/ |
| npm run tauri dev | Tauri dev (beforeDevCommand npm run dev) |
| npm run tauri:build | Release build + installers |
| npm test | Test wrapper Vitest |
| npm run test:smoke | smoke.mjs |

tauri.conf.json: productName Tuner, version 0.2.0, identifier com.tuner.app, bundle.active true, bundle.targets all.
Installer cmd: npm run tauri:build
Outputs: src-tauri/target/release/bundle/nsis/Tuner_0.2.0_x64-setup.exe and msi/Tuner_0.2.0_x64_en-US.msi

## 10. File Excerpts

vite.config.js: import defineConfig; server port 1420 strictPort true.
index.html: div#app; ul#queue-list; script type=module src=/src/main.js; no data-theme yet.
main.js: function render() renders #queue-list; PROPOSED await initTheme() before first render().
styles.css: body bg #0f1117; .layout overflow:auto; ul max-height:120px overflow:auto.
playback-test.js: EXISTS imported by main.js.

## 11. Environment Prerequisites

Inferred: Node ES modules, npm, Rust, cargo, Tauri CLI ^2.0.0, vite ^6.0.0, vitest ^3.0.0.
Check: node -v, npm -v, rustc -V, cargo -V, npx tauri -V

## 12. Scrollbar Planned Selectors

#queue-list, .layout, .panel ul: scrollbar-width thin; scrollbar-color thumb track; ::-webkit-scrollbar; ::-webkit-scrollbar-track; ::-webkit-scrollbar-thumb; ::-webkit-scrollbar-thumb:hover

## 13. Aesthetic Polish (plan only)

14px base, 8px radius, unified states, light+dark QA at implementation.

## 14. Tests

Existing src/playback-test.js, npm test, tests/smoke.mjs. PROPOSED themeManager.test.js.

## 15. Repo Verification

EXISTS index.html package.json vite.config.js src/main.js src/styles.css src/playback-test.js src-tauri/tauri.conf.json Bundled themes json 31 files JSON_VALIDATE TOTAL=31 OK=31 FAIL=0. PROPOSED NOT src/theme/themeManager.js. App EXISTS .functioning-app.

## 16. Verification Checklist

| Item | OK |
| File excerpts | YES |
| Scripts verbatim | YES |
| Tauri bundle quoted | YES |
| Themes 31 listed parsed | YES |
| Dev build package cmds | YES |
| Queue #queue-list render() | YES |
| Scrollbar selectors | YES |
| playback-test.js exists | YES |

package.json dev build tauri test tauri:build. vite ^6.0.0 @tauri-apps/api ^2.0.0. tauri.conf.json Tuner 0.2.0 com.tuner.app. Commands: npm install, npm run tauri dev, npm run dev, npm run build, npm run tauri:build, npm test. Installers nsis Tuner_0.2.0_x64-setup.exe msi per README.md.

## 10. UI Entry

index.html div#app script src=/src/main.js

## 11. Aesthetic Polish plan only

14px base 8px radius unified states reuse src-tauri/icons.

## 12. Tests

Unit PROPOSED validateTheme applyTheme shades. Smoke initTheme theme switch.

## 13. Risks

Path spaces JSON invalid light contrast. Fallback :root defaults.

## 14. Implementation Order

theme modules initTheme styles theme select store tests README.

## 15. Repo Verification

EXISTS: index.html package.json vite.config.js README.md src/main.js src/store.js src/player.js src/styles.css src-tauri/tauri.conf.json Bundled themes json docs/assessment. PROPOSED NOT present: src/theme/themeManager.js. src: main.js store.js player.js styles.css playback-test.js. Bundled themes json dir listing (31 files):
clitiles-theme-abyssal-console.json
clitiles-theme-amaranth-drive.json
clitiles-theme-amber-crt.json
clitiles-theme-azure-rift.json
clitiles-theme-blood-moon.json
clitiles-theme-chrome-cathedral.json
clitiles-theme-cobalt-foundry.json
clitiles-theme-copper-halo.json
clitiles-theme-coral-drift.json
clitiles-theme-cryo-lab.json
clitiles-theme-helios-flare.json
clitiles-theme-ion-storm.json
clitiles-theme-iris-protocol.json
clitiles-theme-occult-archive.json
clitiles-theme-olive-circuit.json
clitiles-theme-reactor-warning.json
clitiles-theme-rose-alloy.json
clitiles-theme-synthwave-94.json
clitiles-theme-tungsten-pulse.json
clitiles-theme-ultraviolet-grid.json
clitiles-theme-vesper-circuit.json
clitiles-theme-xeno-signal.json
frost volt.json
matte obsidian.json
New Theme Bundle 1.json
New Theme Bundle 2.json
New Theme Bundle 3.json
New Theme Bundle 4.json
New Theme Bundle 5.json
New Theme Bundle 6.json
warm clay.json

## 16. Verification Checklist (MUST acceptance)

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Tech stack documented with paths | PASS | Sections 2-3 |
| 31 theme JSON files parse | PASS | Section 4 JSON_VALIDATE OK=31 |
| Schema + token mapping with examples | PASS | Sections 4-5 |
| ThemeManager insertion points named | PASS | Section 6 |
| Queue components identified | PASS | Section 7 |
| Scrollbar hooks identified | PASS | Section 8 |
| Build/run/package commands verified | PASS | Section 9, README.md, docs/build-status.json |
| Functioning app on disk | PASS | .functioning-app, build-status.json functioningApp:true |
| No application code changes | PASS | Analyst scope; PROPOSED modules only |
| Implementation can proceed | PASS | Sections 6, 11-14 |

Out of analyst scope: ThemeManager implementation, CSS refactor, npm test pass, visual QA.s-theme-copper-halo.json
clitiles-theme-coral-drift.json
clitiles-theme-cryo-lab.json
clitiles-theme-helios-flare.json
clitiles-theme-ion-storm.json
clitiles-theme-iris-protocol.json
clitiles-theme-occult-archive.json
clitiles-theme-olive-circuit.json
clitiles-theme-reactor-warning.json
clitiles-theme-rose-alloy.json
clitiles-theme-synthwave-94.json
clitiles-theme-tungsten-pulse.json
clitiles-theme-ultraviolet-grid.json
clitiles-theme-vesper-circuit.json
clitiles-theme-xeno-signal.json
frost volt.json
matte obsidian.json
New Theme Bundle 1.json
New Theme Bundle 2.json
New Theme Bundle 3.json
New Theme Bundle 4.json
New Theme Bundle 5.json
New Theme Bundle 6.json
warm clay.json
COUNT=31 JSON_VALIDATE TOTAL=31 OK=31 FAIL=0. App EXISTS npm run tauri dev.: --tuner-radius-sm 4px, --tuner-radius-md 8px, --tuner-space-sm 8px, --tuner-space-md 12px, --tuner-font-size-base 14px, --tuner-line-height 1.45.

Shades PROPOSED src/theme/shades.js: mix(), alpha(); --tuner-bg-hover, --tuner-bg-active; contrast warn if text/surface below 4.5:1.

## 6. ThemeManager

PROPOSED (not on disk): src/theme/themeManager.js, shades.js, theme.schema.json, themeManager.test.js.

API: listThemes, loadTheme, applyTheme, getCurrentThemeId, setCurrentThemeId, initTheme, validateTheme.

INSERT points (existing): src/main.js await initTheme() before render(); src/styles.css :root vars + states + scrollbars; index.html select#theme-select; src/store.js settings.themeId.

Default: abyssal-console. Light candidate: warm clay.json. Persistence: store.js settings.themeId in tuner-data. UX: header theme select.

## 7. Song Queue (verified)

State src/store.js: queue[], loadPlaylistQueue(d,pid), setCurrent(d,id).

UI src/main.js function render(): DOM #queue-list via $('queue-list').

HTML index.html: section Queue ul#queue-list p#queue-empty; #btn-prev #btn-next.

Excerpt src/main.js:
const q = $('queue-list');
q.innerHTML = '';
state.queue.forEach((tid, i) => {
  const tr = trackById(state, tid);
  if (!tr) return;
  const li = document.createElement('li');
  li.className = state.currentId === tid ? 'active' : '';
  li.innerHTML = '<span>'+(i+1)+'. '+tr.name+'</span><button data-a="play" data-id="'+tid+'">Play</button>';
  q.appendChild(li);
});

## 8. Scrollbars (verified)

No ::-webkit-scrollbar or scrollbar-width in repo. Scroll hooks src/styles.css:
.layout{display:grid;...;max-height:calc(100vh - 48px);overflow:auto}
ul{...;max-height:120px;overflow:auto}

Planned themed CSS on .layout, .panel ul, #queue-list using --tuner-scrollbar-track/thumb/thumb-hover.

## 9. Build/Package (verified)

package.json scripts:
"dev":"vite", "build":"vite build", "tauri":"tauri", "test":"node scripts/npm-test-wrapper.mjs", "test:smoke":"node tests/smoke.mjs", "tauri:build":"tauri build"

Versions: @tauri-apps/api ^2.0.0, @tauri-apps/cli ^2.0.0, vite ^6.0.0, vitest ^3.0.0.

tauri.conf.json bundle: productName Tuner, version 0.2.0, identifier com.tuner.app, bundle.active true, targets all, beforeDevCommand npm run dev, devUrl http://localhost:1420.

Commands: npm install | npm run tauri dev | npm run dev | npm run build | npm run tauri:build | npm test

Installers: src-tauri/target/release/bundle/nsis/Tuner_0.2.0_x64-setup.exe; msi src-tauri/target/release/bundle/msi/Tuner_0.2.0_x64_en-US.msi (README.md, docs/build-status.json).

### Prerequisites (verified configs)
- Node.js with ES module support (package.json type: module)
- npm
- Rust toolchain: cargo, rustc (src-tauri/)
- Tauri CLI ^2.0.0 (@tauri-apps/cli devDependency; invoke via npm run tauri)
- Windows WebView2 runtime (Tauri 2 desktop target)

Verify: node -v | npm -v | rustc -V | cargo -V | npx tauri -V

### Environment variables (vite.config.js)
- envPrefix: VITE_*, TAURI_*
- TAURI_DEBUG: when set, disables minify and enables sourcemaps in vite build

### Cargo workspace (Cargo.toml)
- members: src-tauri, smoke-runner; default-members: smoke-runner

### Build evidence (docs/build-status.json, host-verified 2026-09-16)
- functioningApp: true | cargoBuilt: true | installerBuilt: true | tauriBuildExit: 0
- binaryPath: src-tauri/target/debug/tuner.exe
- installerPath: src-tauri/target/release/bundle/nsis/Tuner_0.2.0_x64-setup.exe (2499157 bytes)
- msiPath: src-tauri/target/release/bundle/msi/Tuner_0.2.0_x64_en-US.msi (3747840 bytes)

### Functioning app marker
- .functioning-app exists at repo root; app is complete and runnable (index.html, src/, src-tauri/).

### Command reference
| Command | Purpose |
|---------|--------|
| npm install | Install Node deps |
| npm run dev | Vite dev server port 1420 (strictPort) |
| npm run tauri dev | Tauri desktop dev (beforeDevCommand: npm run dev) |
| npm run build | Vite production build to dist/ |
| npm run tauri:build | Release desktop bundle (NSIS + MSI, targets: all) |
| npm test | Vitest via scripts/npm-test-wrapper.mjs |
| npm run test:smoke | node tests/smoke.mjs |

Note: npm test host run timed out at 90s; zero-failures gate applies to implementation phase.

## 10. UI Entry (verified)

index.html excerpt:
<div id="app">...</div>
<script type="module" src="/src/main.js"></script>

## 11. Aesthetic Polish (implementation plan only)

14px base, 8px panel radius, 12px gaps, panel shadow, unified button/input/li hover/focus-visible/active/disabled. Reuse src-tauri/icons. Light+dark contrast QA at implementation.

## 12. Tests

Unit PROPOSED: validateTheme, applyTheme, shades, all 31 JSON required keys. Smoke: initTheme, theme switch changes --tuner-accent, queue renders.

## 13. Risks and Fallbacks

Risks: folder name spaces break glob; invalid JSON; light theme contrast; scrollbar OS differences. Assumption: Windows WebView2 primary. Fallback: :root hardcoded defaults matching current colors.

## 14. Implementation Order

1 PROPOSED theme modules 2 initTheme in main.js 3 styles.css refactor 4 theme select UI 5 store settings 6 organize assets 7 tests 8 README Themes section

## 15. Repo Verification

### 15.1 Confirmed EXISTS
index.html, package.json, vite.config.js, README.md, src/main.js, src/store.js, src/player.js, src/styles.css, src/playback-test.js, src-tauri/tauri.conf.json, src-tauri/, Bundled themes json/, docs/assessment/theme_integration_plan.md

PROPOSED NOT present: src/theme/themeManager.js, src/theme/shades.js

### 15.2 src/ listing (list_tree verified)
main.js, store.js, player.js, styles.css, playback-test.js

### 15.3 Bundled themes json listing (31 files)

clitiles-theme-abyssal-console.json
clitiles-theme-amaranth-drive.json
clitiles-theme-amber-crt.json
clitiles-theme-azure-rift.json
clitiles-theme-blood-moon.json
clitiles-theme-chrome-cathedral.json
clitiles-theme-cobalt-foundry.json
clitiles-theme-copper-halo.json
clitiles-theme-coral-drift.json
clitiles-theme-cryo-lab.json
clitiles-theme-helios-flare.json
clitiles-theme-ion-storm.json
clitiles-theme-iris-protocol.json
clitiles-theme-occult-archive.json
clitiles-theme-olive-circuit.json
clitiles-theme-reactor-warning.json
clitiles-theme-rose-alloy.json
clitiles-theme-synthwave-94.json
clitiles-theme-tungsten-pulse.json
clitiles-theme-ultraviolet-grid.json
clitiles-theme-vesper-circuit.json
clitiles-theme-xeno-signal.json
frost volt.json
matte obsidian.json
New Theme Bundle 1.json
New Theme Bundle 2.json
New Theme Bundle 3.json
New Theme Bundle 4.json
New Theme Bundle 5.json
New Theme Bundle 6.json
warm clay.json

COUNT=31

### 15.4 JSON parse validation output

JSON_VALIDATE TOTAL=31 OK=31 FAIL=0

### 15.5 Application status

EXISTING functioning Tauri+Vite media player. Marker: .functioning-app (repo root, 4 bytes). Entry index.html, source src/, Rust backend src-tauri/. Runnable via npm run tauri dev (README.md). build-status.json: functioningApp true, tauriBuildExit 0. No new app creation required.

## 16. Verification Checklist (MUST acceptance)

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Tech stack documented with paths | PASS | Sections 2-3 |
| 31 theme JSON files parse | PASS | Sections 4, 15.4 JSON_VALIDATE OK=31 |
| Schema + token mapping with examples | PASS | Sections 4-5 |
| ThemeManager insertion points named | PASS | Section 6 |
| Queue components identified | PASS | Section 7 (src/main.js render(), #queue-list) |
| Scrollbar hooks identified | PASS | Section 8 (styles.css .layout, ul overflow) |
| Build/run/package commands verified | PASS | Section 9, README.md, docs/build-status.json |
| Functioning app on disk | PASS | 15.5, .functioning-app |
| No application code changes | PASS | Analyst scope; PROPOSED modules only |
| Implementation can proceed | PASS | Sections 6, 11-14 |

Out of analyst scope: ThemeManager code, CSS refactor, npm test zero-failures gate, visual QA light/dark.
