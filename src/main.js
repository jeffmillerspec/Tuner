import { load, save, uid, addTracks, createPlaylist, deletePlaylist, renamePlaylist, addToPlaylist, removeFromPlaylist, reorderPlaylist, loadPlaylistQueue, setCurrent, trackById, getThemeId, setThemeId } from './store.js';
import { mediaType, playTrack } from './player.js';
import './playback-test.js';
import { initTheme, applyTheme, listThemes, subscribe } from './theme/themeManager.js';

let state = load();
if (!state.settings) state = { ...state, settings: { themeId: null } };
const $ = (id) => document.getElementById(id);
const player = $('player');
let dragFromIndex = null;
let queueHandlersBound = false;

function persist() { save(state); render(); }
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function announceQueue(msg) { const live = $('queue-live'); if (live) live.textContent = msg; }
function addToQueue(id) { if (!state.queue.includes(id)) { state.queue.push(id); persist(); } }
function removeFromQueue(id) { state.queue = state.queue.filter((x) => x !== id); persist(); }
function moveQueue(from, to) { if (from === to || from < 0 || from >= state.queue.length || to < 0 || to >= state.queue.length) return; const [item] = state.queue.splice(from, 1); state.queue.splice(to, 0, item); persist(); }

function ensureQueueLiveRegion() { if ($('queue-live')) return; const live = document.createElement('div'); live.id = 'queue-live'; live.setAttribute('aria-live','polite'); live.setAttribute('aria-atomic','true'); $('queue-list')?.parentElement?.insertBefore(live, $('queue-list')); }

function setupQueueKeyboard() {
  const q = $('queue-list'); if (!q || q.dataset.kbBound) return; q.dataset.kbBound = '1';
  const syncQueueSelection = () => {
    q.querySelectorAll('.queue-item').forEach((el) => {
      const sel = el === document.activeElement;
      el.classList.toggle('selected', sel);
      el.setAttribute('aria-selected', sel ? 'true' : 'false');
    });
  };
  q.addEventListener('focusin', syncQueueSelection);
  q.addEventListener('keydown', (e) => {
    const items = [...q.querySelectorAll('.queue-item')];
    const active = document.activeElement.closest?.('.queue-item') || document.activeElement;
    let idx = items.indexOf(active); if (idx < 0 && items.length) { idx = 0; items[0].focus(); }
    const id = active?.dataset?.id;
    if (e.key === 'ArrowDown') { e.preventDefault(); if (idx < items.length - 1) items[idx + 1].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (idx > 0) items[idx - 1].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0]?.focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1]?.focus(); }
    else if (e.key === 'Delete' && id) { e.preventDefault(); removeFromQueue(id); }
    else if (e.altKey && e.key === 'ArrowUp' && idx > 0) { e.preventDefault(); moveQueue(idx, idx - 1); requestAnimationFrame(() => q.querySelectorAll('.queue-item')[idx - 1]?.focus()); }
    else if (e.altKey && e.key === 'ArrowDown' && idx >= 0 && idx < items.length - 1) { e.preventDefault(); moveQueue(idx, idx + 1); requestAnimationFrame(() => q.querySelectorAll('.queue-item')[idx + 1]?.focus()); }
  });
}

function setupQueueDragDrop() {
  const q = $('queue-list');
  if (!q || q.dataset.dndBound) return;
  q.dataset.dndBound = '1';
  q.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.queue-item');
    const handle = e.target.closest('.queue-drag-handle');
    if (!item || (!handle && e.target !== item)) { e.preventDefault(); return; }
    dragFromIndex = Number(item.dataset.index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(dragFromIndex));
    item.classList.add('dragging');
  });
  q.addEventListener('dragend', (e) => {
    e.target.closest('.queue-item')?.classList.remove('dragging');
    q.querySelectorAll('.queue-item.drag-over').forEach((el) => el.classList.remove('drag-over'));
    dragFromIndex = null;
  });
  q.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const item = e.target.closest('.queue-item');
    q.querySelectorAll('.queue-item.drag-over').forEach((el) => { if (el !== item) el.classList.remove('drag-over'); });
    item?.classList.add('drag-over');
  });
  q.addEventListener('dragleave', (e) => {
    const item = e.target.closest('.queue-item');
    if (item && !item.contains(e.relatedTarget)) item.classList.remove('drag-over');
  });
  q.addEventListener('drop', (e) => {
    e.preventDefault();
    const item = e.target.closest('.queue-item');
    if (!item) return;
    item.classList.remove('drag-over');
    const from = dragFromIndex ?? Number(e.dataTransfer.getData('text/plain'));
    const to = Number(item.dataset.index);
    if (Number.isFinite(from) && Number.isFinite(to) && from !== to) {
      moveQueue(from, to);
      const tr = trackById(state, state.queue[to]);
      announceQueue(tr ? `Moved ${tr.name} to position ${to + 1}` : `Moved to position ${to + 1}`);
    }
    dragFromIndex = null;
  });
}

function renderQueue() {
  const q = $('queue-list');
  if (!q) return;
  q.classList.add('tuner-scrollbars');
  q.setAttribute('role', 'listbox');
  q.setAttribute('aria-label', 'Playback queue');
  q.innerHTML = '';
  state.queue.forEach((tid, i) => {
    const tr = trackById(state, tid);
    if (!tr) return;
    const hasThumb = Boolean(tr.artwork);
    const li = document.createElement('li');
    li.className = 'queue-item' + (state.currentId === tid ? ' active' : '') + (hasThumb ? ' has-thumb' : '');
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', 'false');
    li.tabIndex = -1;
    li.dataset.id = tid;
    li.dataset.index = String(i);
    const thumb = hasThumb ? `<img class="queue-thumb" src="${esc(tr.artwork)}" alt="" loading="lazy" decoding="async" />` : '';
    li.innerHTML = `<button type="button" class="queue-drag-handle" draggable="true" aria-label="Drag to reorder" data-index="${i}">&#8942;&#8942;</button>${thumb}<span class="queue-index">${i + 1}</span><span class="queue-title">${esc(tr.name)}</span><span class="actions"><button type="button" data-a="play" data-id="${esc(tid)}">Play</button><button type="button" data-a="rmq" data-id="${esc(tid)}">X</button></span>`;
    q.appendChild(li);
  });
  $('queue-empty').style.display = state.queue.length ? 'none' : 'block';
}

function syncPlaylistSelect() {
  const sel = $('playlist-select');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = state.playlists.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  if (cur && [...sel.options].some((o) => o.value === cur)) sel.value = cur;
}

function render() {
  $('now-playing').textContent = state.currentId ? (trackById(state, state.currentId)?.name || 'Unknown') : 'Select a track';
  const lib = $('library-list');
  if (lib) {
    lib.innerHTML = '';
    state.library.forEach((t) => {
      const li = document.createElement('li');
      li.className = state.currentId === t.id ? 'active' : '';
      li.innerHTML = `<span>${esc(t.name)}</span><span class="actions"><button type="button" data-a="play" data-id="${esc(t.id)}">Play</button><button type="button" data-a="q" data-id="${esc(t.id)}">+Q</button></span>`;
      lib.appendChild(li);
    });
    $('library-empty').style.display = state.library.length ? 'none' : 'block';
  }
  const pl = $('playlist-list');
  if (pl) {
    pl.innerHTML = '';
    state.playlists.forEach((p) => {
      const li = document.createElement('li');
      li.textContent = `${p.name} (${p.trackIds.length})`;
      pl.appendChild(li);
    });
    $('playlist-empty').style.display = state.playlists.length ? 'none' : 'block';
  }
  syncPlaylistSelect();
  renderQueue();
}

function bindThemeSelect() {
  const sel = $('theme-select');
  if (!sel || sel.dataset.bound) return;
  sel.dataset.bound = '1';
  const syncOptions = () => {
    const themes = listThemes();
    const cur = getThemeId();
    sel.innerHTML = themes.map((t) => `<option value="${esc(t.id)}">${esc(t.name || t.id)}</option>`).join('');
    if (cur && [...sel.options].some((o) => o.value === cur)) sel.value = cur;
  };
  syncOptions();
  subscribe(() => {
    const cur = getThemeId();
    if (cur && sel.value !== cur && [...sel.options].some((o) => o.value === cur)) sel.value = cur;
    else syncOptions();
  });
  sel.addEventListener('change', () => applyTheme(sel.value, { persist: true }));
}

function bindControls() {
  if (queueHandlersBound) return;
  queueHandlersBound = true;
  $('btn-import')?.addEventListener('click', () => $('file-input')?.click());
  $('file-input')?.addEventListener('change', (e) => {
    const files = [...e.target.files || []];
    if (!files.length) return;
    state = addTracks(state, files.map((f) => ({ id: uid(), name: f.name, path: f.name })));
    persist();
    e.target.value = '';
  });
  $('btn-create-playlist')?.addEventListener('click', () => {
    const name = $('playlist-name')?.value?.trim();
    if (!name) return;
    state = createPlaylist(state, name);
    $('playlist-name').value = '';
    persist();
  });
  $('btn-rename-playlist')?.addEventListener('click', () => {
    const pid = $('playlist-select')?.value;
    const name = $('playlist-name')?.value?.trim();
    if (!pid || !name) return;
    state = renamePlaylist(state, pid, name);
    persist();
  });
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-a]');
    if (!btn) return;
    const a = btn.dataset.a;
    const id = btn.dataset.id;
    if (a === 'play') {
      state = setCurrent(state, id);
      const tr = trackById(state, id);
      if (tr && player) playTrack(player, tr);
      persist();
    } else if (a === 'q') addToQueue(id);
    else if (a === 'rmq') removeFromQueue(id);
  });
}

async function boot() {
  state = load();
  if (!state.settings) state = { ...state, settings: { themeId: null } };
  await initTheme({ getThemeId, setThemeId: (id) => { state = setThemeId(id); } });
  document.documentElement.dataset.themeReady = 'true';
  ensureQueueLiveRegion();
  bindThemeSelect();
  bindControls();
  setupQueueKeyboard();
  setupQueueDragDrop();
  render();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void boot(); });
else void boot();
if (e.altKey && e.key === 'ArrowDown' && idx >= 0 && idx < items.length - 1) { e.preventDefault(); moveQueue(idx, idx + 1); requestAnimationFrame(() => q.querySelectorAll('.queue-item')[idx + 1]?.focus()); }
  });
}

function setupQueueDragDrop() {
  const q = $('queue-list'); if (!q || q.dataset.dndBound) return; q.dataset.dndBound = '1';
  q.addEventListener('dragstart', (e) => { const item = e.target.closest('.queue-item'); const handle = e.target.closest('.queue-drag-handle'); if (!item || (!handle && e.target !== item)) { e.preventDefault(); return; } dragFromIndex = Number(item.dataset.index); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(dragFromIndex)); item.classList.add('dragging'); });
  q.addEventListener('dragend', () => { q.querySelectorAll('.queue-item.dragging,.queue-item.drag-over').forEach((el) => el.classList.remove('dragging','drag-over')); dragFromIndex = null; });
  q.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; const item = e.target.closest('.queue-item'); q.querySelectorAll('.queue-item.drag-over').forEach((el) => { if (el !== item) el.classList.remove('drag-over'); }); item?.classList.add('drag-over'); });
  q.addEventListener('dragleave', (e) => { const item = e.target.closest('.queue-item'); if (item && !item.contains(e.relatedTarget)) item.classList.remove('drag-over'); });
  q.addEventListener('drop', (e) => { e.preventDefault(); const item = e.target.closest('.queue-item'); if (!item) return; item.classList.remove('drag-over'); const from = dragFromIndex ?? Number(e.dataTransfer.getData('text/plain')); const to = Number(item.dataset.index); if (Number.isFinite(from) && Number.isFinite(to) && from !== to) { moveQueue(from, to); const tr = trackById(state, state.queue[to]); announceQueue(tr ? `Moved ${tr.name} to position ${to + 1}` : `Moved to position ${to + 1}`); } dragFromIndex = null; });
}

function bindQueueHandlersOnce() { if (queueHandlersBound) return; queueHandlersBound = true; ensureQueueLiveRegion(); setupQueueKeyboard(); setupQueueDragDrop(); }

function bindThemeSelectOnce() {
  const ts = $('theme-select'); if (!ts || ts.dataset.bound) return; ts.dataset.bound = '1';
  const fill = () => { const cur = getThemeId(); const themes = listThemes(); const ids = themes.map((t) => t.id); const existing = [...ts.options].map((o) => o.value); if (ids.length !== existing.length || ids.some((id, i) => id !== existing[i])) { const focused = document.activeElement === ts; ts.innerHTML = themes.map((t) => `<option value="${esc(t.id)}"${t.id === cur ? ' selected' : ''}>${esc(t.name || t.id)}</option>`).join(''); if (focused) ts.focus(); } else if (cur) ts.value = cur; };
  fill(); subscribe(() => { const cur = getThemeId(); if (cur && ts.value !== cur && [...ts.options].some((o) => o.value === cur)) ts.value = cur; });
  ts.addEventListener('change', () => applyTheme(ts.value, { persist: true }));
}

function renderQueue() {
  const q = $('queue-list'); if (!q) return;
  q.setAttribute('role','listbox'); q.setAttribute('aria-label','Playback queue'); q.classList.add('tuner-scrollbars'); q.innerHTML = '';
  state.queue.forEach((tid, i) => { const tr = trackById(state, tid); if (!tr) return; const hasThumb = Boolean(tr.artwork); const li = document.createElement('li'); li.className = 'queue-item' + (state.currentId === tid ? ' active' : '') + (hasThumb ? ' has-thumb' : ''); li.setAttribute('role','option'); li.setAttribute('aria-selected', state.currentId === tid ? 'true' : 'false'); li.tabIndex = state.currentId === tid ? 0 : -1; li.dataset.id = tid; li.dataset.index = String(i); li.draggable = true; const thumb = hasThumb ? `<img class="queue-thumb" src="${esc(tr.artwork)}" alt="" loading="lazy" decoding="async" />` : ''; li.innerHTML = `<button type="button" class="queue-drag-handle" draggable="true" aria-label="Drag to reorder" data-index="${i}">&#8942;&#8942;</button>${thumb}<span class="queue-index">${i + 1}</span><span class="queue-title">${esc(tr.name)}</span><span class="actions"><button type="button" data-a="play" data-id="${esc(tid)}">Play</button><button type="button" data-a="rmq" data-id="${esc(tid)}">X</button></span>`; q.appendChild(li); });
  $('queue-empty').style.display = state.queue.length ? 'none' : 'block';
  bindQueueHandlersOnce();
}

function render() {
  document.querySelector('#app').dataset.ready = 'true';
  const sel = $('playlist-select'); sel.innerHTML = '<option value="">Add to...</option>' + state.playlists.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  const lib = $('library-list'); lib.innerHTML = '';
  state.library.forEach((t) => { const li = document.createElement('li'); li.className = state.currentId === t.id ? 'active' : ''; li.innerHTML = `<span>${esc(t.name)}</span><span class="actions"><button data-a="play" data-id="${esc(t.id)}">Play</button><button data-a="q" data-id="${esc(t.id)}">+Q</button><button data-a="addpl" data-id="${esc(t.id)}">+PL</button></span>`; lib.appendChild(li); });
  $('library-empty').style.display = state.library.length ? 'none' : 'block';
  const pl = $('playlist-list'); pl.innerHTML = ''; let miss = 0;
  state.playlists.forEach((p) => { const li = document.createElement('li'); li.innerHTML = `<span>${esc(p.name)} (${p.trackIds.length})</span><span class="actions"><button data-a="loadpl" data-id="${esc(p.id)}">Load</button><button data-a="delpl" data-id="${esc(p.id)}">Del</button></span>`; pl.appendChild(li); const sub = document.createElement('ul'); p.trackIds.forEach((tid, i) => { const tr = trackById(state, tid); if (!tr) { miss++; return; } const s = document.createElement('li'); s.innerHTML = `<span>${i + 1}. ${esc(tr.name)}</span><span class="actions"><button data-a="play" data-id="${esc(tid)}">Play</button><button data-a="up" data-pid="${esc(p.id)}" data-i="${i}">Up</button><button data-a="down" data-pid="${esc(p.id)}" data-i="${i}">Dn</button><button data-a="rmpl" data-pid="${esc(p.id)}" data-id="${esc(tid)}">X</button></span>`; sub.appendChild(s); }); pl.appendChild(sub); });
  $('playlist-error').hidden = !miss; $('playlist-error').textContent = miss ? `${miss} missing track(s) in library` : ''; $('playlist-empty').style.display = state.playlists.length ? 'none' : 'block';
  renderQueue();
  $('now-playing').textContent = state.currentId ? (trackById(state, state.currentId)?.name || 'Unknown') : 'Select a track';
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-a]'); if (!btn) return; const a = btn.dataset.a; const id = btn.dataset.id;
  if (a === 'play') { const tr = trackById(state, id); if (tr && player) playTrack(player, tr); state = setCurrent(state, id); persist(); }
  else if (a === 'q') addToQueue(id);
  else if (a === 'rmq') removeFromQueue(id);
  else if (a === 'addpl') { const pid = $('playlist-select')?.value; if (pid) { state = addToPlaylist(state, pid, id); persist(); } }
  else if (a === 'loadpl') { state = loadPlaylistQueue(state, id); persist(); }
  else if (a === 'delpl') { state = deletePlaylist(state, id); persist(); }
  else if (a === 'rmpl') { state = removeFromPlaylist(state, btn.dataset.pid, id); persist(); }
  else if (a === 'up') { state = reorderPlaylist(state, btn.dataset.pid, Number(btn.dataset.i), Number(btn.dataset.i) - 1); persist(); }
  else if (a === 'down') { state = reorderPlaylist(state, btn.dataset.pid, Number(btn.dataset.i), Number(btn.dataset.i) + 1); persist(); }
});

async function boot() {
  state = load();
  await initTheme({ getThemeId, setThemeId: (id) => { state = setThemeId(id); } });
  bindThemeSelectOnce();
  $('btn-import')?.addEventListener('click', () => $('file-input')?.click());
  $('file-input')?.addEventListener('change', (e) => { const files = [...e.target.files || []]; if (!files.length) return; state = addTracks(state, files.map((f) => ({ id: uid(), name: f.name, path: f.name, type: mediaType(f.name) }))); persist(); e.target.value = ''; });
  $('btn-create-playlist')?.addEventListener('click', () => { const name = $('playlist-name')?.value?.trim(); if (!name) return; state = createPlaylist(state, name); persist(); });
  $('btn-rename-playlist')?.addEventListener('click', () => { const pid = $('playlist-select')?.value; const name = $('playlist-name')?.value?.trim(); if (!pid || !name) return; state = renamePlaylist(state, pid, name); persist(); });
  render();
}

boot();
