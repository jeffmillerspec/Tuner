import {load, save, uid, addTracks, createPlaylist, deletePlaylist, renamePlaylist, addToPlaylist, removeFromPlaylist, reorderPlaylist, loadPlaylistQueue, setCurrent, trackById, getState, updateSettings} from './store.js';

import { mediaType, playTrack } from './player.js';
import './playback-test.js';
import { initTheme, applyTheme, listThemes, subscribe } from './theme/themeManager.js';

let state = load();
if (!state.settings) state = { ...state, settings: { themeId: null } };
const $ = (id) => document.getElementById(id);
const player = $('player');

function persist() {
  save(state);
  render();
}

function renderThemeSelect() {
  const ts = $('theme-select');
  if (!ts) return;
  const current = state.settings?.themeId;
  ts.innerHTML = listThemes()
    .map((t) => `<option value="${t.id}"${t.id === current ? ' selected' : ''}>${t.name}</option>`)
    .join('');
}

function render() {
  document.querySelector('#app').dataset.ready = 'true';
  renderThemeSelect();

  const sel = $('playlist-select');
  sel.innerHTML =
    '<option value="">Add to...</option>' +
    state.playlists.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');

  const lib = $('library-list');
  lib.innerHTML = '';
  state.library.forEach((t) => {
    const li = document.createElement('li');
    li.className = state.currentId === t.id ? 'active' : '';
    li.innerHTML = `<span>${t.name}</span><span class="actions"><button data-a="play" data-id="${t.id}">Play</button><button data-a="q" data-id="${t.id}">+Q</button><button data-a="addpl" data-id="${t.id}">+PL</button></span>`;
    lib.appendChild(li);
  });
  $('library-empty').style.display = state.library.length ? 'none' : 'block';

  const pl = $('playlist-list');
  pl.innerHTML = '';
  let missingTotal = 0;
  state.playlists.forEach((p) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${p.name} (${p.trackIds.length})</span><span class="actions"><button data-a="loadpl" data-id="${p.id}">Load</button><button data-a="delpl" data-id="${p.id}">Del</button></span>`;
    pl.appendChild(li);

    const sub = document.createElement('ul');
    p.trackIds.forEach((tid, i) => {
      const tr = trackById(state, tid);
      if (!tr) {
        missingTotal += 1;
        return;
      }
      const s = document.createElement('li');
      s.innerHTML = `<span>${i + 1}. ${tr.name}</span><span class="actions"><button data-a="play" data-id="${tid}">Play</button><button data-a="up" data-pid="${p.id}" data-i="${i}">Up</button><button data-a="down" data-pid="${p.id}" data-i="${i}">Dn</button><button data-a="rmpl" data-pid="${p.id}" data-id="${tid}">X</button></span>`;
      sub.appendChild(s);
    });
    pl.appendChild(sub);
  });

  if (missingTotal) {
    $('playlist-error').hidden = false;
    $('playlist-error').textContent = `${missingTotal} missing track(s) in library`;
  } else {
    $('playlist-error').hidden = true;
    $('playlist-error').textContent = '';
  }
  
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
  state = addTracks(state, paths.map((p) => ({ id: uid(), name: p.split(/[\/]/).pop(), path: p, type: mediaType(p) })));
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
