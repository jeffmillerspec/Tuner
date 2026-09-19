import fs from 'fs';

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
  transition: background 0.12s ease, color 0.12s ease;
}

#queue-list .queue-item:last-child {
  border-bottom: none;
}

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

li:hover,
li.active {
  background: var(--tuner-bg-surface-alt, var(--tuner-bg-surface));
}

li.active {
  border-left: 3px solid var(--tuner-accent);
  padding-left: calc(var(--tuner-space-sm, 6px) - 3px);
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

.layout,
ul {
  scrollbar-width: thin;
  scrollbar-color: var(--tuner-scrollbar-thumb) var(--tuner-scrollbar-track);
}

.layout::-webkit-scrollbar,
ul::-webkit-scrollbar,
#queue-list::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.layout::-webkit-scrollbar-track,
ul::-webkit-scrollbar-track,
#queue-list::-webkit-scrollbar-track {
  background: var(--tuner-scrollbar-track);
  border-radius: var(--tuner-radius-sm, 4px);
}

.layout::-webkit-scrollbar-thumb,
ul::-webkit-scrollbar-thumb,
#queue-list::-webkit-scrollbar-thumb {
  background: var(--tuner-scrollbar-thumb);
  border-radius: var(--tuner-radius-sm, 4px);
  border: 2px solid var(--tuner-scrollbar-track);
}

.layout::-webkit-scrollbar-thumb:hover,
ul::-webkit-scrollbar-thumb:hover,
#queue-list::-webkit-scrollbar-thumb:hover {
  background: var(--tuner-scrollbar-thumb-hover);
}

.layout::-webkit-scrollbar-thumb:active,
ul::-webkit-scrollbar-thumb:active,
#queue-list::-webkit-scrollbar-thumb:active {
  background: var(--tuner-accent-active, var(--tuner-scrollbar-thumb-hover));
}

#theme-select {
  flex: 0 1 auto;
  min-width: 140px;
  max-width: 220px;
}

@media (prefers-contrast: more) {
  :root {
    --tuner-border: var(--tuner-text);
  }
  button:focus,
  input:focus,
  select:focus {
    outline-width: 3px;
  }
}
`;

const MAIN_TAIL = `
  $('playlist-empty').style.display = state.playlists.length ? 'none' : 'block';

  const q = $('queue-list');
  q.innerHTML = '';
  state.queue.forEach((tid, i) => {
    const tr = trackById(state, tid);
    if (!tr) return;
    const li = document.createElement('li');
    li.className = 'queue-item' + (state.currentId === tid ? ' active' : '');
    li.innerHTML = '<span class="queue-index">' + (i + 1) + '</span><span class="queue-title">' + tr.name + '</span><span class="actions"><button type="button" data-a="play" data-id="' + tid + '">Play</button><button type="button" data-a="rmq" data-i="' + i + '">X</button></span>';
    q.appendChild(li);
  });
  $('queue-empty').style.display = state.queue.length ? 'none' : 'block';

  const cur = trackById(state, state.currentId);
  $('now-playing').textContent = cur ? cur.name : 'Select a track';
}

async function play(id) {
  const tr = trackById(state, id);
  if (!tr) return;
  state = setCurrent(state, id);
  await playTrack(player, tr);
  persist();
}

function queueAdd(id) {
  if (!trackById(state, id)) return;
  if (!state.queue.includes(id)) state = { ...state, queue: [...state.queue, id] };
  if (!state.currentId) state = setCurrent(state, id);
  persist();
}

function queueRemove(i) {
  const q = [...state.queue];
  q.splice(i, 1);
  state = { ...state, queue: q };
  if (state.currentId && !q.includes(state.currentId)) {
    state = setCurrent(state, q[0] || null);
  }
  persist();
}

function nextTrack() {
  if (!state.queue.length) return;
  const idx = state.queue.indexOf(state.currentId);
  const next = state.queue[(idx + 1) % state.queue.length];
  play(next);
}

function prevTrack() {
  if (!state.queue.length) return;
  const idx = state.queue.indexOf(state.currentId);
  const prev = state.queue[(idx - 1 + state.queue.length) % state.queue.length];
  play(prev);
}

async function importPaths(paths) {
  if (!paths?.length) return;
  const tracks = paths.map((p) => ({
    id: uid(),
    name: p.split(/[\\/]/).pop(),
    path: p,
    type: mediaType(p.split(/[\\/]/).pop()),
  }));
  state = addTracks(state, tracks);
  persist();
}

async function pickImport() {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const sel = await open({
      multiple: true,
      filters: [{ name: 'Media', extensions: ['mp4', 'mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'webm'] }],
    });
    if (sel) await importPaths(Array.isArray(sel) ? sel : [sel]);
  } catch {
    $('file-input').click();
  }
}

document.getElementById('app').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-a]');
  if (!btn) return;
  const a = btn.dataset.a;
  const id = btn.dataset.id;
  const pid = btn.dataset.pid;
  const i = Number(btn.dataset.i);
  switch (a) {
    case 'play':
      play(id);
      break;
    case 'q':
      queueAdd(id);
      break;
    case 'rmq':
      queueRemove(i);
      break;
    case 'addpl': {
      const plId = $('playlist-select').value;
      if (plId) {
        state = addToPlaylist(state, plId, id);
        persist();
      }
      break;
    }
    case 'loadpl':
      state = loadPlaylistQueue(state, id);
      persist();
      break;
    case 'delpl':
      state = deletePlaylist(state, id);
      persist();
      break;
    case 'up':
      if (i > 0) {
        state = reorderPlaylist(state, pid, i, i - 1);
        persist();
      }
      break;
    case 'down': {
      const pl = state.playlists.find((p) => p.id === pid);
      if (pl && i < pl.trackIds.length - 1) {
        state = reorderPlaylist(state, pid, i, i + 1);
        persist();
      }
      break;
    }
    case 'rmpl':
      state = removeFromPlaylist(state, pid, id);
      persist();
      break;
    default:
      break;
  }
});

$('btn-import').addEventListener('click', () => pickImport());
$('file-input').addEventListener('change', (e) => {
  const files = [...e.target.files];
  if (!files.length) return;
  importPaths(files.map((f) => f.path || f.name));
  e.target.value = '';
});
$('btn-create-playlist').addEventListener('click', () => {
  state = createPlaylist(state, $('playlist-name').value);
  persist();
});
$('btn-rename-playlist').addEventListener('click', () => {
  const plId = $('playlist-select').value;
  if (plId) {
    state = renamePlaylist(state, plId, $('playlist-name').value);
    persist();
  }
});
$('btn-prev').addEventListener('click', () => prevTrack());
$('btn-next').addEventListener('click', () => nextTrack());
player.addEventListener('ended', () => nextTrack());

async function boot() {
  await initTheme({
    getThemeId: () => state.settings?.themeId ?? null,
    setThemeId: (themeId) => {
      state.settings = { ...(state.settings || {}), themeId };
      save(state);
    },
  });
  document.documentElement.dataset.themeReady = 'true';
  subscribe(() => renderThemeSelect());
  $('theme-select')?.addEventListener('change', (ev) => {
    const themeId = ev.target.value;
    applyTheme(themeId);
    state.settings = { ...(state.settings || {}), themeId };
    save(state);
  });
  render();
}

boot();
`;

function repairCss() {
  const cssPath = 'src/styles.css';
  const css = fs.readFileSync(cssPath, 'utf8');
  const marker = '#queue-list{';
  const idx = css.indexOf(marker);
  if (idx < 0) throw new Error('queue-list marker missing in styles.css');
  fs.writeFileSync(cssPath, css.slice(0, idx) + CSS_TAIL.trimStart() + '\n');
}

function repairMain() {
  const mainPath = 'src/main.js';
  let main = fs.readFileSync(mainPath, 'utf8');
  const cut = main.search(/\$\('playlist-empty'\)\.s/);
  if (cut < 0) {
    const dup = main.indexOf('function queueAdd(id)', main.indexOf('function queueAdd(id)') + 1);
    if (dup > 0) main = main.slice(0, dup);
  } else {
    main = main.slice(0, cut);
  }
  fs.writeFileSync(mainPath, main + MAIN_TAIL);
}

repairCss();
repairMain();
console.log('repair-queue-ui: ok');
