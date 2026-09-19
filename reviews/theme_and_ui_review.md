# Theme and UI Code Review

**Date:** 2026-09-19  
**Scope:** Theme engine (T2), UI integration (T3), queue modernization + scrollbars (T4), polish (T5)  
**Reference plan:** `docs/assessment/theme_integration_plan.md`  
**Decision:** **BLOCK** — do not package until critical issues below are resolved.

---

## Executive summary

Theme engine modules (`src/theme/validate.js`, `shades.js`, `constants.js`, `themeManager.js`, `themeInternal.js`) are structurally sound: safe JSON parsing, relative Vite glob loading, WCAG-aware shade generation, and synchronous CSS-variable application without full-app re-render on theme switch.

However, **deliverable source files are corrupted/truncated** on disk (`src/main.js`, `src/styles.css`, `scripts/repair-queue-ui.mjs`), and `src/store.js` contains duplicate `getState`/`updateSettings` exports. The app entrypoint and global styles are incomplete, so runtime behavior cannot match documentation or pass packaging gates.

---

## Decision

| Outcome | **BLOCK packaging** |
|---------|---------------------|
| Re-review | Required after all Critical action items are fixed and `npm run dev` + `npm test` pass |

---

## ThemeManager API (T2)

### Strengths

- Public API is clear: `initTheme`, `applyTheme`, `getToken`, `subscribe`, `listThemes`, `reloadThemes`.
- `validateTheme` / `parseThemeJson` use try/catch around `JSON.parse`; invalid input returns `{ valid: false }` without throwing.
- Colors validated with `HEX_RE`; missing keys fall back to `FALLBACK_COLORS` deterministically.
- Bundled themes loaded via `import.meta.glob` with relative `BUNDLED_THEME_GLOB` — no hard-coded `F:\` paths.
- `applyTheme` updates `document.documentElement.style.setProperty` synchronously and notifies subscribers — low jank risk.
- Shade module: `ensureContrast`, `deriveShades`, cache — tested in `tests/theme-shades.test.mjs`.

### Issues

| Severity | Issue | Action |
|----------|-------|--------|
| Medium | Token alias duplication (`--tuner-bg` / `--tuner-bg-app`, `--tuner-fg` / `--tuner-text`) | Consolidate canonical names in `constants.js` (deferred OK post-fix) |
| Low | `applyTheme` persistence wrapped in empty catch | Log or surface persistence failures in dev |

---

## UI integration (T3)

### Strengths

- `index.html`: `#theme-select` with `aria-label=Theme`; inline `<style>` default tokens prevent first-paint flicker.
- Intended boot flow: `await initTheme({ getThemeId, setThemeId })` before first `render()`, `dataset.themeReady = 'true'`.
- Partial `src/styles.css`: body/header/panels/inputs/buttons bind to `--tuner-*` tokens; buttons use `--tuner-accent-500/600/700`; `:focus-visible` uses `--tuner-focus`.

### Issues

| Severity | Issue | Action |
|----------|-------|--------|
| **Critical** | `src/main.js` truncated mid-render at `$('playlist-empty').` — syntax error; boot/queue/theme handlers missing | Restore complete `main.js` (repair script or git) |
| **Critical** | `src/styles.css` truncated mid-rule (`button:active{background:var(--tuner-accent-7`) | Restore CSS tail: queue, scrollbars, lists, `@media (prefers-contrast: more)` |
| **Critical** | `src/store.js` duplicate `getState()` and `updateSettings()` export blocks | Keep single canonical implementation |
| Medium | Theme `<select>` populates after async init — brief empty dropdown on cold start | Documented limitation; optional loading placeholder |

---

## Queue modernization and scrollbars (T4)

### Intended design (from docs + partial code)

- Queue rows: `.queue-item`, `.queue-index`, `.queue-title`; `setupQueueKeyboard`; ARIA `listbox`/`option`.
- Scrollbars: `--tuner-scrollbar-size`, `--tuner-scrollbar-radius`, thumb/track/hover/active on `.layout`, `ul`, `#queue-list`.

### Issues

| Severity | Issue | Action |
|----------|-------|--------|
| **Critical** | Truncated `main.js` — queue render, `rmq`, keyboard handlers not present in delivered file | Repair `main.js` tail from `$('playlist-empty'` marker |
| **Critical** | Truncated `styles.css` — queue + scrollbar rules may be absent | Run complete `scripts/repair-queue-ui.mjs` or manual restore |
| **Critical** | `scripts/repair-queue-ui.mjs` itself truncated at scrollbar rules — recovery path unreliable | Rewrite complete repair script |
| Medium | No list virtualization; large queues re-render full DOM on `persist()` | Document benchmark; windowing if regressions observed |
| Info | Album art correctly omitted (no artwork field) | None |

---

## Security

| Check | Status | Notes |
|-------|--------|-------|
| Unsafe deserialization | **Pass** | Theme JSON parsed with validation; no `eval` |
| Path traversal | **Pass** | Bundled themes via Vite glob; no user-supplied paths |
| Absolute asset paths | **Pass** | Relative glob; unit test guards theme modules |
| XSS via UI | **Concern** | `innerHTML` used with track/playlist names — escape or use `textContent` |

---

## Accessibility

| Check | Status | Notes |
|-------|--------|-------|
| Theme control | **Pass** | `#theme-select` has `aria-label=Theme` |
| Focus visible | **Partial** | `:focus-visible` on inputs/buttons in partial CSS; queue/library parity unverified |
| High contrast | **Partial** | `@media (prefers-contrast: more)` intended in CSS tail — unverified due to truncation |
| Queue keyboard | **Blocked** | Cannot verify until `main.js` restored |

---

## Performance

| Check | Status | Notes |
|-------|--------|-------|
| Theme switch jank | **Pass (design)** | CSS vars only; dropdown refresh via `subscribe` |
| Full re-render | **Acceptable** | `persist()` calls `render()` — OK for small/medium queues |
| Large queue | **Unverified** | Docs cite ~190ms for 5000 items — re-measure after repair |

---

## T1 plan adherence

| Plan item | Status |
|-----------|--------|
| ThemeManager + shade module | Met in `src/theme/*` |
| CSS token mapping | Partial — truncation |
| Boot before first render | Intended — blocked by truncated `main.js` |
| Theme switch in header | Met in `index.html` |
| Queue token styles + scrollbars | Intended — blocked by truncation |
| Tests + smoke | Partial — unit tests exist; integration depends on intact source files |

---

## Action items (must fix before APPROVE)

1. **Restore `src/main.js`** — complete render tail, queue markup, `setupQueueKeyboard`, event handlers, `async function boot()`, `boot()` invocation.
2. **Restore `src/styles.css`** — complete button disabled/active, queue item states, scrollbar pseudo-elements, high-contrast block.
3. **Fix `src/store.js`** — remove duplicate `getState` / `updateSettings`; single implementation using `load`/`save`.
4. **Fix `scripts/repair-queue-ui.mjs`** — full `CSS_TAIL` and `MAIN_TAIL` so repair is repeatable.
5. **Verify** — `npm run dev`, `npm test`, manual theme switch + queue keyboard smoke.
6. **Security (should)** — replace `innerHTML` track name insertion with safe DOM APIs or escaping.

---

## Deferred (non-blocking)

- Consolidate `--tuner-bg` / `--tuner-fg` alias tokens.
- Tauri native dialog theming (documented limitation).
- Theme dropdown loading placeholder.
- Queue virtualization if performance regresses.

---

## Re-review criteria for APPROVE

- [ ] `src/main.js` and `src/styles.css` complete and syntactically valid
- [ ] `src/store.js` has no duplicate exports
- [ ] `npm test` exit 0; `tests/reports/test-results.txt` shows zero failures
- [ ] `npm run dev` — theme switch updates UI; queue keyboard works; focus visible on Tab
- [ ] Repair script runs cleanly on truncated-marker fixtures

---

*Reviewer: NetworkMesh code review worker. Evidence: host file reads 2026-09-19.*
