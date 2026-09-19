import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runThemeSwitchSmoke } from './smoke/harness.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportsDir = path.join(root, 'tests', 'reports');
let failures = 0;
const logLines = [];
function log(m) { logLines.push(m); console.log(m); }
function check(n, fn) {
  try { fn(); log('PASS:' + n); }
  catch (e) { failures++; log('FAIL:' + n + ':' + e.message); }
}
async function checkAsync(n, fn) {
  try { await fn(); log('PASS:' + n); }
  catch (e) { failures++; log('FAIL:' + n + ':' + e.message); }
}

check('smoke-script', () => {
  const p = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (!p.scripts?.smoke && !p.scripts?.test) throw new Error('missing smoke/test script');
});

check('theme-ui', () => {
  const h = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  if (!h.includes('theme-select') || !h.includes('aria-label=Theme')) throw new Error('theme select');
  if (!h.includes('--tuner-bg')) throw new Error('anti-flicker inline tokens');
});

check('theme-ready-boot', () => {
  const s = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
  const start = s.indexOf('async function boot()');
  if (start < 0) throw new Error('boot function missing');
  const tail = s.slice(start);
  const initIdx = tail.indexOf('await initTheme');
  const renderIdx = tail.indexOf('render();');
  if (initIdx < 0 || renderIdx < 0 || initIdx > renderIdx) throw new Error('initTheme must precede render in boot');
  if (!s.includes('bindThemeSelectOnce') || !s.includes('dataset.themeReady')) throw new Error('theme wiring');
});

check('theme-manager-api', () => {
  const s = fs.readFileSync(path.join(root, 'src/theme/themeManager.js'), 'utf8');
  for (const sym of ['initTheme', 'applyTheme', 'subscribe', 'listThemes', 'getToken']) {
    if (!s.includes(sym)) throw new Error(sym);
  }
  if (!s.includes('persist')) throw new Error('applyTheme persist option');
});

check('store-theme-persist', () => {
  const s = fs.readFileSync(path.join(root, 'src/store.js'), 'utf8');
  if (!s.includes('getThemeId') || !s.includes('setThemeId')) throw new Error('store theme API');
});

check('theme-tokens-css', () => {
  const c = fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8');
  if (!c.includes('button:disabled') || !c.includes('button:hover')) throw new Error('button shades');
  if (!c.includes('prefers-contrast') || !c.includes('forced-colors')) throw new Error('a11y media');
  if (!c.includes(':focus-visible')) throw new Error('focus-visible');
});

await checkAsync('theme-switch-runtime', async () => {
  const result = await runThemeSwitchSmoke();
  if (!result.saved || result.saved !== result.appliedId) throw new Error('theme id not persisted');
});

log('TOTAL_FAILURES:' + failures);
fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, 'smoke.log'), logLines.join('\n'), 'utf8');
process.exit(failures ? 1 : 0);
