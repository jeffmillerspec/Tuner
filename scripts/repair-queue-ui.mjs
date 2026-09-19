import fs from 'fs';
const root = process.cwd();
const cssPath = 'src/styles.css';
const mainPath = 'src/main.js';
const CSS_TAIL = `
#queue-list {
  --q-item-h: 44px;
  --q-gap: 8px;
  --q-pad-x: 10px;
  --q-radius: var(--tuner-radius-sm, 4px);
  --q-index-w: 2.25rem;
  max-height: 160px;
  scrollbar-width: thin;
  scrollbar-color: var(--tuner-scrollbar-thumb) var(--tuner-scrollbar-track);
}
#queue-list .queue-item {
  display: flex;
  align-items: center;
  gap: var(--q-gap);
  min-height: var(--q-item-h);
  padding: 0 var(--q-pad-x);
  border-bottom: 1px solid var(--tuner-border);
  color: var(--tuner-text);
  background: transparent;
  cursor: default;
  transition: background 0.12s ease;
}
#queue-list .queue-item:last-child { border-bottom: none; }
#queue-list .queue-item:hover {
  background: var(--tuner-bg-surface-alt, var(--tuner-bg-surface));
}
#queue-list .queue-item.active {
  background: var(--tuner-accent);
  color: var(--tuner-accent-contrast);
}
#queue-list .queue-item.active:hover {
  background: var(--tuner-accent-hover, var(--tuner-accent));
}
#queue-list .queue-item:focus-visible {
  outline: 2px solid var(--tuner-focus);
  outline-offset: -2px;
  z-index: 1;
}
#queue-list .queue-index {
  flex: 0 0 var(--q-index-w);
  font-size: var(--tuner-font-sm);
  color: var(--tuner-text-muted);
  text-align: right;
  font-variant-numeric: tabular-nums;
}
#queue-list .queue-item.active .queue-index {
  color: var(--tuner-accent-contrast);
  opacity: 0.85;
}
#queue-list .queue-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
li {
  padding: var(--tuner-space-xs, 4px) var(--tuner-space-sm, 6px);
  border-radius: var(--tuner-radius-sm, 4px);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  gap: var(--tuner-space-sm, 6px);
  align-items: center;
}
li:hover, li.active {
  background: var(--tuner-bg-surface-alt, var(--tuner-bg-surface));
}
li.active {
  border-left: 3px solid var(--tuner-accent);
  padding-left: calc(var(--tuner-space-sm, 6px) - 3px);
}
li:focus-visible {
  outline: 2px solid var(--tuner-focus);
  outline-offset: 1px;
}
.empty {
  color: var(--tuner-text-muted);
  font-size: var(--tuner-font-sm, 12px);
  margin: var(--tuner-space-sm, 6px) 0;
}
.error {
  color: var(--tuner-danger);
  font-size: var(--tuner-font-sm, 12px);
}
.actions {
  display: flex;
  gap: var(--tuner-space-xs, 4px);
  flex-shrink: 0;
  margin-left: auto;
}
.layout, ul {
  scrollbar-width: thin;
  scrollbar-color: var(--tuner-scrollbar-thumb) var(--tuner-scrollbar-track);
}
.layout::-webkit-scrollbar, ul::-webkit-scrollbar, #queue-list::-webkit-scrollbar {
  width: var(--tuner-scrollbar-size, 10px);
  height: var(--tuner-scrollbar-size, 10px);
}
.layout::-webkit-scrollbar-track, ul::-webkit-scrollbar-track, #queue-list::-webkit-scrollbar-track {
  background: var(--tuner-scrollbar-track);
  border-radius: var(--tuner-scrollbar-radius, var(--tuner-radius-sm, 4px));
}
.layout::-webkit-scrollbar-thumb, ul::-webkit-scrollbar-thumb, #queue-list::-webkit-scrollbar-thumb {
  background: var(--tuner-scrollbar-thumb);
  border-radius: var(--tuner-scrollbar-radius, var(--tuner-radius-sm, 4px));
  border: 2px solid var(--tuner-scrollbar-track);
}
.layout::-webkit-scrollbar-thumb:hover, ul::-webkit-scrollbar-thumb:hover, #queue-list::-webkit-scrollbar-thumb:hover {
  background: var(--tuner-scrollbar-thumb-hover);
}
.layout::-webkit-scrollbar-thumb:active, ul::-webkit-scrollbar-thumb:active, #queue-list::-webkit-scrollbar-thumb:active {
  background: var(--tuner-scrollbar-thumb-active, var(--tuner-accent-active, var(--tuner-accent)));
}
html, body {
  background: var(--tuner-bg, var(--tuner-bg-app));
  color: var(--tuner-fg, var(--tuner-text));
}
button:focus-visible, input:focus-visible, select:focus-visible {
  outline: 2px solid var(--tuner-focus);
  outline-offset: 1px;
}
button:disabled {
  background: var(--tuner-disabled-bg, var(--tuner-bg-surface-alt));
  color: var(--tuner-disabled-fg, var(--tuner-text-muted));
  cursor: not-allowed;
  opacity: 0.75;
}
button.primary {
  background: var(--tuner-accent-500, var(--tuner-accent));
  color: var(--tuner-on-accent, var(--tuner-accent-contrast));
  border-color: var(--tuner-accent);
}
button.primary:hover {
  background: var(--tuner-accent-600, var(--tuner-accent-hover, var(--tuner-accent)));
}
button.primary:active {
  background: var(--tuner-accent-700, var(--tuner-accent-active, var(--tuner-accent)));
}
#player { background: var(--tuner-bg-app); }
@media (prefers-contrast: more) {
  :root {
    --tuner-border: #c8d0dc;
    --tuner-text-muted: #b0b8c4;
  }
  button, input, select, .panel, ul {
    border-width: 2px;
  }
  :focus-visible {
    outline-width: 3px;
  }
}
`;
const MAIN_TAIL = `
  $('playlist-empty').style.display = state.playlists.length ? 'none' : 'block';

  const q = $('queue-list');
  q.setAttribute('role', 'listbox');
  q.setAttribute('aria-label', 'Playback queue');
  q.innerHTML = '';
  state.queue.forEach((tid, i) => {
    const tr = trackById(state, tid);
    if (!tr) return;
    const li = document.createElement('li');
    li.className = 'queue-item' + (state.currentId === tid ? ' active' : '');
    li.setAttribute('role', 'option');
    li.tabIndex = -1;
    if (state.currentId === tid) li.setAttribute('aria-selected', 'true');
    li.innerHTML = '<span class="queue-index">' + (i + 1) + '</span><span class="queue-title">' + tr.name + '</span><span class="actions"><button type="button" data-a="play" data-id="' + tid + '">Play</button><button type="button" data-a="rmq" data-id="' + tid + '">X</button></span>';
    q.appendChild(li);
  });
  $('queue-empty').style.display = state.queue.length ? 'none' : 'block';

  const cur = trackById(state, state.currentId);
  $('now-playing').textContent = cur ? 'Playing: ' + cur.name : 'Select a track to play';
}

async function importPaths(paths) {
  if (!paths?.length) return;
  state = addTracks(state, paths.map((p) => ({ id: uid(), name: p.split(/[\\/]/).pop(), path: p, type: mediaType(p) })));
  persist();
}

async function pickImport() {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const sel = await open({ multiple: true, filters: [{ name: 'Media', extensions: ['mp4', 'mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'webm'] }] });
    if (sel) await importPaths(Array.isArray(sel) ? sel : [sel]);
  } catch {
    $('file-input').click();
  }
}

async function play(id) {
  state = setCurrent(state, id);
  const track = trackById(state, id);
  await playTrack(player, track);
  persist();
}

function queueAdd(id) {
  if (!state.queue.includes(id)) {
    state = { ...state, queue: [...state.queue, id] };
    persist();
  }
}

function queueRemove(id) {
  state = { ...state, queue: state.queue.filter((x) => x !== id) };
  if (state.currentId === id) state = setCurrent(state, state.queue[0] || null);
  persist();
}

function nextTrack() {
  const idx = state.queue.indexOf(state.currentId);
  const next = state.queue[idx + 1];
  if (next) play(next);
}

function prevTrack() {
  const idx = state.queue.indexOf(state.currentId);
  const prev = state.queue[idx - 1];
  if (prev) play(prev);
}

function setupQueueKeyboard() {
  const q = $('queue-list');
  if (!q) return;
  q.addEventListener('keydown', (e) => {
    const items = [...q.querySelectorAll('.queue-item')];
    const idx = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(idx + 1, items.length - 1)]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[Math.max(idx - 1, 0)]?.focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0]?.focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1]?.focus(); }
    else if (e.key === 'Enter' || e.key === ' ') {
      const el = document.activeElement;
      if (el?.classList.contains('queue-item')) { e.preventDefault(); play(el.querySelector('[data-a=play]')?.dataset.id); }
    }
  });
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-a]');
  if (!btn) return;
  const a = btn.dataset.a;
  const id = btn.dataset.id;
  const pid = btn.dataset.pid;
  const i = Number(btn.dataset.i);
  switch (a) {
    case 'play': play(id); break;
    case 'q': queueAdd(id); break;
    case 'rmq': queueRemove(id); break;
    case 'addpl': { const plId = $('playlist-select').value; if (plId) { state = addToPlaylist(state, plId, id); persist(); } break; }
    case 'loadpl': state = loadPlaylistQueue(state, id); persist(); break;
    case 'delpl': state = deletePlaylist(state, id); persist(); break;
    case 'up': if (i > 0) { state = reorderPlaylist(state, pid, i, i - 1); persist(); } break;
    case 'down': { const p = state.playlists.find((x) => x.id === pid); if (p && i < p.trackIds.length - 1) { state = reorderPlaylist(state, pid, i, i + 1); persist(); } break; }
    case 'rmpl': state = removeFromPlaylist(state, pid, id); persist(); break;
  }
});

async function boot() {
  state = load();
  if (!state.settings) state = { ...state, settings: { themeId: null } };
  const getThemeId = () => getState().settings?.themeId ?? null;
  const setThemeId = (id) => { state = updateSettings({ themeId: id }); save(state); };
  await initTheme({ getThemeId, setThemeId });
  document.documentElement.dataset.themeReady = 'true';
  subscribe(() => renderThemeSelect());
  $('theme-select')?.addEventListener('change', (e) => {
    const id = applyTheme(e.target.value);
    state = updateSettings({ themeId: id });
    save(state);
  });
  $('btn-import')?.addEventListener('click', pickImport);
  $('file-input')?.addEventListener('change', (e) => importPaths([...e.target.files].map((f) => f.path || f.name)));
  $('btn-create-playlist')?.addEventListener('click', () => { state = createPlaylist(state, $('playlist-name').value); persist(); });
  $('btn-rename-playlist')?.addEventListener('click', () => { const pid = $('playlist-select').value; if (pid) { state = renamePlaylist(state, pid, $('playlist-name').value); persist(); } });
  $('btn-prev')?.addEventListener('click', prevTrack);
  $('btn-next')?.addEventListener('click', nextTrack);
  setupQueueKeyboard();
  render();
}

boot();
`;
function repairCss() {
  let css = fs.readFileSync(cssPath, 'utf8');
  const marker = '#queue-list {';
  const idx = css.indexOf(marker);
  if (idx < 0) throw new Error('queue-list marker missing in styles.css');
  fs.writeFileSync(cssPath, css.slice(0, idx) + CSS_TAIL.trimStart());
  console.log('repaired styles.css');
}
function repairMain() {
  let main = fs.readFileSync(mainPath, 'utf8');
  const marker = "\n  $('playlist-empty'";
  const idx = main.indexOf(marker);
  if (idx < 0) throw new Error('main.js tail marker missing');
  if (!main.includes('getState')) {
    main = main.replace("from './store.js';", "from './store.js';\n").replace(
      /import \{([^}]+)\} from '\.\/store\.js';/,
      (m, imports) => {
        const names = imports.split(',').map((s) => s.trim());
        if (!names.includes('getState')) names.push('getState');
        if (!names.includes('updateSettings')) names.push('updateSettings');
        return "import {" + names.join(', ') + "} from './store.js';";
      }
    );
  }
  main = main.slice(0, idx) + MAIN_TAIL;
  fs.writeFileSync(mainPath, main);
  console.log('repaired main.js');
}
repairCss();
repairMain();
