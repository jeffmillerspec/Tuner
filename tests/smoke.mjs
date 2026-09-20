import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportsDir = path.join(root, 'tests', 'reports');
const log = [];
let failures = 0;
function check(name, fn) {
  try { fn(); log.push('PASS:' + name); }
  catch (e) { failures++; log.push('FAIL:' + name + ':' + e.message); }
}

check('queue-css', () => {
  const css = fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8');
  assert.match(css, /\.tuner-scrollbars\b/, 'missing .tuner-scrollbars');
  assert.match(css, /--tuner-scrollbar-size/, 'missing scrollbar size');
  assert.match(css, /scrollbar-color/, 'missing Firefox fallback');
  assert.match(css, /queue-item\.selected/, 'missing selected state');
  assert.match(css, /--tuner-queue-item-gap/, 'missing queue spacing tokens');
  assert.match(css, /scrollbar-gutter/, 'missing scrollbar-gutter');
});

check('queue-main', () => {
  const js = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
  assert.match(js, /tuner-scrollbars/, 'missing tuner-scrollbars');
  assert.match(js, /queue-thumb/, 'missing queue-thumb');
  assert.match(js, /syncQueueSelection|toggle\('selected'/, 'missing keyboard selected');
  assert.match(js, /setupQueueKeyboard/, 'missing keyboard handler');
  assert.match(js, /dragstart/, 'missing drag handler');
});

check('theme-scrollbars', () => {
  const ti = fs.readFileSync(path.join(root, 'src/theme/themeInternal.js'), 'utf8');
  assert.match(ti, /deriveScrollbar/, 'deriveScrollbar missing');
  assert.match(ti, /generateShades/, 'generateShades missing');
  assert.match(ti, /applyCssVars/, 'applyCssVars missing');
  assert.match(ti, /--tuner-scrollbar-track/, 'scrollbar tokens missing');
});

check('theme-bundled-json', () => {
  const dir = path.join(root, 'Bundled themes json');
  assert.ok(fs.existsSync(dir), 'Bundled themes json directory missing');
  const jsons = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.json'));
  assert.ok(jsons.length >= 1, 'no bundled theme JSON files');
});

check('theme-engine-exports', () => {
  const mgr = fs.readFileSync(path.join(root, 'src/theme/themeManager.js'), 'utf8');
  const internal = fs.readFileSync(path.join(root, 'src/theme/themeInternal.js'), 'utf8');
  for (const sym of ['initTheme', 'applyTheme', 'listThemes', 'getToken', 'subscribe', 'reloadThemes']) {
    assert.match(mgr, new RegExp('export (async )?function ' + sym + '\\b'), sym + ' missing in themeManager');
  }
  for (const sym of ['loadBundledThemes', 'buildTokens', 'applyCssVars', 'deriveScrollbar']) {
    assert.match(internal, new RegExp('export (async )?function ' + sym + '\\b|' + sym + '\\s*='), sym + ' missing in themeInternal');
  }
  assert.match(internal, /Bundled themes json/, 'themeInternal must reference bundled JSON dir');
});

check('media-import-uses-real-paths', () => {
  const js = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
  assert.match(js, /@tauri-apps\/plugin-dialog/, 'must import the Tauri dialog plugin for file selection');
  assert.doesNotMatch(
    js,
    /path:\s*f\.name/,
    '<input type=file> only exposes a bare filename (f.name), never a real filesystem ' +
      'path — using it as track.path makes convertFileSrc unresolvable and playback fails'
  );
});

check('docs', () => {
  const doc = fs.readFileSync(path.join(root, 'docs/queue/modernization-summary.md'), 'utf8');
  assert.match(doc, /queue|theme|scrollbar/i, 'docs must mention queue/theme integration');
});

check('radio-ui', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
  const radio = fs.readFileSync(path.join(root, 'src/radio/stations.js'), 'utf8');
  assert.match(html, /id="tab-radio"/, 'Library|Radio switch missing');
  assert.match(html, /id="radio-panel"/, 'radio panel missing');
  assert.match(html, /id="radio-local-list"/, 'local stations list missing');
  assert.match(html, /id="radio-national-list"/, 'national stations list missing');
  assert.match(js, /setMediaSource\('radio'\)|data-source="radio"/, 'radio source wiring missing');
  assert.match(js, /listenStation|fetchTopNational/, 'radio playback wiring missing');
  assert.match(radio, /FALLBACK_STATIONS/, 'radio fallbacks missing');
  assert.match(radio, /api\.radio-browser\.info/, 'radio browser API missing');
});

check('spotify-connections', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
  const spotify = fs.readFileSync(path.join(root, 'src/connections/spotify.js'), 'utf8');
  const registry = fs.readFileSync(path.join(root, 'src/connections/registry.js'), 'utf8');
  const rust = fs.readFileSync(path.join(root, 'src-tauri/src/lib.rs'), 'utf8');
  assert.match(html, /id="btn-connections"/, 'Connect button missing');
  assert.match(html, /id="connections-panel"/, 'connections panel missing');
  assert.match(registry, /registerConnection/, 'connection registry missing');
  assert.match(spotify, /connectGuest/, 'spotify guest mode missing');
  assert.match(spotify, /connectUser/, 'spotify user login missing');
  assert.match(spotify, /GUEST_PLAYLISTS/, 'guest catalog missing');
  assert.match(spotify, /parseSpotifyLink/, 'spotify link parser missing');
  assert.match(js, /startSpotifyLoginFlow|spotify-guest/, 'spotify UI wiring missing');
  assert.match(js, /await_oauth_redirect/, 'oauth loopback wiring missing');
  assert.match(rust, /await_oauth_redirect/, 'rust oauth listener missing');
});

check('layout-rail-not-overlapped', () => {
  const css = fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8');
  assert.match(css, /grid-template-areas:\s*"rail player queue"/, 'explicit grid areas required');
  assert.match(css, /\.rail\s*\{[^}]*z-index:\s*2/s, 'rail must stack above player');
  assert.match(css, /\.media-list\s*>\s*li\s*\{[^}]*grid-template-columns/s, 'library rows must stack controls');
});

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, 'smoke-static.log'), log.join('\n') + '\n', 'utf8');
console.log(log.join('\n'));
console.log('TOTAL_FAILURES:' + failures);
if (failures === 0) console.log('SMOKE_OK');
process.exit(failures ? 1 : 0);
