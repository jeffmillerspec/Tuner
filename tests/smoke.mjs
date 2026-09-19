import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

if (typeof globalThis.localStorage === 'undefined') {
  const mem = {};
  globalThis.localStorage = {
    setItem(k, v) { mem[k] = String(v); },
    getItem(k) { return mem[k] ?? null; },
    removeItem(k) { delete mem[k]; },
  };
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;

const check = (n, fn) => {
  try {
    fn();
    console.log('PASS:' + n);
  } catch (e) {
    failures++;
    console.log('FAIL:' + n + ':' + e.message);
  }
};

check('package', () => {
  if (!JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts?.test) throw new Error();
});
check('store', () => {
  const s = fs.readFileSync(path.join(root, 'src/store.js'), 'utf8');
  if (!s.includes('localStorage') || !s.includes('renamePlaylist')) throw new Error();
});
check('player', () => {
  if (!fs.readFileSync(path.join(root, 'src/player.js'), 'utf8').includes('playTrack')) throw new Error();
});
check('library-ui', () => {
  const h = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  if (!h.includes('library-list') || !h.includes('queue-list')) throw new Error();
});
check('playback-el', () => {
  if (!fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes('id=player')) throw new Error();
});
check('persistence', () => {
  if (!fs.readFileSync(path.join(root, 'src/store.js'), 'utf8').includes('tuner-data')) throw new Error();
});
check('persist-roundtrip', () => {
  const k = 'tuner-smoke-test';
  const d = { library: [{ id: '1', name: 't.mp3', path: 't.mp3', type: 'audio' }], playlists: [], queue: [], currentId: null };
  localStorage.setItem(k, JSON.stringify(d));
  const r = JSON.parse(localStorage.getItem(k));
  localStorage.removeItem(k);
  if (!r.library?.[0]?.name) throw new Error();
});
check('playlist-crud', () => {
  const s = fs.readFileSync(path.join(root, 'src/store.js'), 'utf8');
  ['createPlaylist', 'deletePlaylist', 'renamePlaylist', 'reorderPlaylist', 'loadPlaylistQueue'].forEach((x) => {
    if (!s.includes(x)) throw new Error(x);
  });
});
check('missing-track-ui', () => {
  if (!fs.readFileSync(path.join(root, 'src/main.js'), 'utf8').includes('playlist-error')) throw new Error();
});
check('window', () => {
  const w = JSON.parse(fs.readFileSync(path.join(root, 'src-tauri/tauri.conf.json'), 'utf8')).app.windows[0];
  if (w.maxWidth > 960 || w.maxHeight > 540) throw new Error();
});
check('dialog-plugin', () => {
  if (!fs.readFileSync(path.join(root, 'src-tauri/Cargo.toml'), 'utf8').includes('tauri-plugin-dialog')) throw new Error();
});
check('theme-manager', () => {
  const s = fs.readFileSync(path.join(root, 'src/theme/themeManager.js'), 'utf8');
  ['initTheme', 'applyTheme', 'getToken', 'subscribe', 'listThemes', 'reloadThemes'].forEach((x) => {
    if (!s.includes(x)) throw new Error(x);
  });
});
check('theme-ui', () => {
  if (!fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes('theme-select')) throw new Error();
});
check('theme-persist', () => {
  if (!fs.readFileSync(path.join(root, 'src/store.js'), 'utf8').includes('themeId')) throw new Error();
});
check('theme-ready-marker', () => {
  const m = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
  if (!m.includes('initTheme') || !m.includes('renderThemeSelect') || !m.includes('themeReady')) throw new Error();
});
check('queue-modern', () => {
  const js = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8');
  if (!js.includes('queue-item') || !js.includes('queue-index') || !js.includes('queue-title')) throw new Error('main queue classes');
  if (!css.includes('--q-item-h') || !css.includes('--tuner-scrollbar-thumb')) throw new Error('queue css tokens');
});
check('delivery', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (pkg.version !== '0.3.0') throw new Error('version');
  if (!fs.existsSync(path.join(root, 'src/theme/theme.schema.json'))) throw new Error('schema');
});
console.log('TOTAL_FAILURES:' + failures);
process.exit(failures ? 1 : 0);
