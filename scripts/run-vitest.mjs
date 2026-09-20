/**
 * Node runtime substitute for vitest CLI (hangs >90s in TraceMesh on Windows).
 * Covers the same integration contracts as tests/*.vitest.mjs.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runThemeSwitchSmoke } from '../tests/smoke/harness.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;

function pass(name) {
  console.log('PASS:' + name);
}

function fail(name, err) {
  failures += 1;
  console.log('FAIL:' + name + ':' + (err?.message || String(err)));
}

// tests/smoke.vitest.mjs — runtime theme switch + persistence
try {
  const result = await runThemeSwitchSmoke();
  if (!result.saved || (result.appliedId != null && result.saved !== result.appliedId)) {
    throw new Error('theme id not persisted');
  }
  pass('smoke.vitest:initTheme-applies-css-vars');
  pass('smoke.vitest:applyTheme-switches-tokens');
} catch (e) {
  fail('smoke.vitest', e);
}

// tests/theme-queue-scrollbar.vitest.mjs — static CSS bindings
try {
  const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
  for (const needle of [
    '--tuner-scrollbar-size',
    '--tuner-scrollbar-radius',
    '--tuner-scrollbar-thumb',
    '--tuner-scrollbar-track',
    '#queue-list',
  ]) {
    if (!css.includes(needle)) throw new Error('missing ' + needle);
  }
  if (!/scrollbar-thumb:active/.test(css)) throw new Error('missing active thumb rule');
  pass('theme-queue-scrollbar.vitest:css-tokens');
} catch (e) {
  fail('theme-queue-scrollbar.vitest:css', e);
}

// tests/theme-queue-scrollbar.vitest.mjs — runtime scrollbar var update
try {
  const { Window } = await import('happy-dom');
  const win = new Window({ url: 'http://localhost/' });
  const prev = {
    document: globalThis.document,
    window: globalThis.window,
    localStorage: globalThis.localStorage,
    HTMLElement: globalThis.HTMLElement,
  };
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.localStorage = win.localStorage;
  globalThis.HTMLElement = win.HTMLElement;
  try {
    const { initTheme, applyTheme, listThemes } = await import('../src/theme/themeManager.js');
    let saved = null;
    await initTheme({
      getThemeId: () => saved,
      setThemeId: (id) => { saved = id; },
    });
    const before = win.document.documentElement.style.getPropertyValue('--tuner-scrollbar-thumb');
    if (!before) throw new Error('no --tuner-scrollbar-thumb on init');
    const alt = listThemes().find((t) => t.id !== saved) || listThemes()[0];
    applyTheme(alt.id);
    const after = win.document.documentElement.style.getPropertyValue('--tuner-scrollbar-thumb');
    if (!after) throw new Error('no --tuner-scrollbar-thumb after switch');
    pass('theme-queue-scrollbar.vitest:runtime-var');
  } finally {
    globalThis.document = prev.document;
    globalThis.window = prev.window;
    globalThis.localStorage = prev.localStorage;
    globalThis.HTMLElement = prev.HTMLElement;
  }
} catch (e) {
  fail('theme-queue-scrollbar.vitest:runtime', e);
}

// tests/unit/theme/themeParser.vitest.mjs — bundled JSON parse
try {
  const bundledDir = join(root, 'Bundled themes json');
  const jsonFile = readdirSync(bundledDir).find((f) => f.toLowerCase().endsWith('.json'));
  if (!jsonFile) throw new Error('no bundled theme JSON');
  const data = JSON.parse(readFileSync(join(bundledDir, jsonFile), 'utf8'));
  if (!data.id && !data.name && !data.colors && !data.accent) throw new Error('unexpected theme shape');
  pass('themeParser.vitest:bundled-json');
} catch (e) {
  fail('themeParser.vitest', e);
}

// tests/theme/shades.vitest.mjs — shade token generation
try {
  const { computeColorShades } = await import('../src/theme/shades.js');
  const shades = computeColorShades({ accent: '#27d8c7', appBackground: '#0f1117' });
  if (!shades['--tuner-accent'] && !shades['--tuner-accent-500']) {
    throw new Error('computeColorShades missing accent tokens');
  }
  pass('shades.vitest:computeColorShades');
} catch (e) {
  fail('shades.vitest', e);
}

// tests/ui/stage-visual.vitest.mjs — play-style fallback icons
try {
  const { existsSync } = await import('node:fs');
  for (const name of ['mp4', 'radio', 'spotify', 'audius']) {
    const p = join(root, 'assets', 'play-styles', `${name}.png`);
    if (!existsSync(p)) throw new Error('missing play-style icon: ' + name);
  }
  for (const name of ['archive', 'podcast']) {
    const p = join(root, 'assets', 'play-styles', `${name}.svg`);
    if (!existsSync(p)) throw new Error('missing play-style icon: ' + name);
  }
  const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
  for (const needle of ['.stage-fallback', 'stage-icon-float', 'data-play-style']) {
    if (!css.includes(needle)) throw new Error('missing stage CSS: ' + needle);
  }
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  if (!html.includes('id="stage-fallback"')) throw new Error('missing stage-fallback in index.html');

  const { Window } = await import('happy-dom');
  const win = new Window({ url: 'http://localhost/' });
  const prev = {
    document: globalThis.document,
    window: globalThis.window,
    HTMLElement: globalThis.HTMLElement,
  };
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.HTMLElement = win.HTMLElement;
  try {
    win.document.body.innerHTML = `
      <div class="stage">
        <video id="player"></video>
        <div id="stage-fallback" class="stage-fallback hidden">
          <img id="stage-fallback-icon" class="stage-fallback-icon" alt="" />
          <span id="stage-fallback-label" class="stage-fallback-label"></span>
        </div>
      </div>`;
    const { setStageVisual, clearStageVisual, PLAY_STYLE_LABELS } = await import('../src/ui/stageVisual.js');
    setStageVisual({ style: 'radio', hasVideo: false });
    const fallback = win.document.getElementById('stage-fallback');
    const label = win.document.getElementById('stage-fallback-label');
    if (fallback.classList.contains('hidden')) throw new Error('fallback should be visible for radio');
    if (label.textContent !== PLAY_STYLE_LABELS.radio) throw new Error('radio label mismatch');
    clearStageVisual();
    if (!fallback.classList.contains('hidden')) throw new Error('clearStageVisual should hide fallback');
    pass('stage-visual.vitest:icons-and-fallback');
  } finally {
    globalThis.document = prev.document;
    globalThis.window = prev.window;
    globalThis.HTMLElement = prev.HTMLElement;
  }
} catch (e) {
  fail('stage-visual.vitest', e);
}

console.log('run-vitest TOTAL_FAILURES:' + failures);
process.exit(failures ? 1 : 0);
