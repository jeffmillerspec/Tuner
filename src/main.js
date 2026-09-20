import {
  load, save, uid, addTracks, createPlaylist, deletePlaylist, renamePlaylist,
  addToPlaylist, removeFromPlaylist, reorderPlaylist, loadPlaylistQueue,
  setCurrent, trackById, getThemeId, setThemeId,
} from './store.js';
import { mediaType, playTrack } from './player.js';
import { initTheme, applyTheme, listThemes, subscribe } from './theme/themeManager.js';
import { bindThemeSelectOnce } from './ui/themeSelect.js';
import { open as openFileDialog } from '@tauri-apps/plugin-dialog';

const basename = (p) => String(p).replace(/\\/g, '/').split('/').pop();

const $ = (id) => document.getElementById(id);
const player = $('player');
let state = load();
if (!state.settings) state = { ...state, settings: { themeId: null } };
let dragFromIndex = null;
let queueHandlersBound = false;

function persist() {
  save(state);
  render();
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function announceQueue(msg) {
  const live = $('queue-live');
  if (live) live.textContent = msg;
}

function addToQueue(id) {
  if (!state.queue.includes(id)) {
    state.queue.push(id);
    persist();
  }
}

function removeFromQueue(id) {
  state.queue = state.queue.filter((x) => x !== id);
  persist();
}

function moveQueue(from, to) {
  if (from === to || from < 0 || from >= state.queue.length || to < 0 || to >= state.queue.length) return;
  const [item] = state.queue.splice(from, 1);
  state.queue.splice(to, 0, item);
  persist();
}

function ensureQueueLiveRegion() {
  if ($('queue-live')) return;
  const live = document.createElement('div');
  live.id = 'queue-live';
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  $('queue-list')?.parentElement?.insertBefore(live, $('queue-list'));
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
    const li = document.createElement('li');
    const hasThumb = Boolean(tr.artwork);
    li.className = 'queue-item' + (state.currentId === tid ? ' active' : '') + (hasThumb ? ' has-thumb' : '');
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', state.currentId === tid ? 'true' : 'false');
    li.tabIndex = state.currentId === tid ? 0 : -1;
    li.dataset.id = tid;
    li.dataset.index = String(i);
    li.draggable = true;
    const thumb = hasThumb
      ? `<img class="queue-thumb" src="${esc(tr.artwork)}" alt="" loading="lazy" decoding="async" />`
      : '';
    li.innerHTML =
      `<button type="button" class="queue-drag-handle" draggable="true" aria-label="Drag to reorder" data-index="${i}">&#8942;&#8942;</button>` +
      `${thumb}<span class="queue-index">${i + 1}</span>` +
      `<span class="queue-title">${esc(tr.name)}</span>` +
      `<span class="actions">` +
      `<button type="button" data-a="play" data-id="${esc(tid)}">Play</button>` +
      `<button type="button" data-a="rmq" data-id="${esc(tid)}">X</button>` +
      `</span>`;
    q.appendChild(li);
  });
  const empty = $('queue-empty');
  if (empty) empty.style.display = state.queue.length ? 'none' : 'block';
}

function setupQueueKeyboard() {
  const q = $('queue-list');
  if (!q || q.dataset.kbBound) return;
  q.dataset.kbBound = '1';
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
    let idx = items.indexOf(active);
    if (idx < 0 && items.length) {
      idx = 0;
      items[0].focus();
    }
    const id = active?.dataset?.id;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (idx < items.length - 1) items[idx + 1].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (idx > 0) items[idx - 1].focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === 'Delete' && id) {
      e.preventDefault();
      removeFromQueue(id);
    } else if (e.altKey && e.key === 'ArrowUp' && idx > 0) {
      e.preventDefault();
      moveQueue(idx, idx - 1);
      requestAnimationFrame(() => q.querySelectorAll('.queue-item')[idx - 1]?.focus());
    } else if (e.altKey && e.key === 'ArrowDown' && idx >= 0 && idx < items.length - 1) {
      e.preventDefault();
      moveQueue(idx, idx + 1);
      requestAnimationFrame(() => q.querySelectorAll('.queue-item')[idx + 1]?.focus());
    }
  });
}

function setupQueueDragDrop() {
  const q = $('queue-list');
  if (!q || q.dataset.dndBound) return;
  q.dataset.dndBound = '1';

  q.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.queue-item');
    const handle = e.target.closest('.queue-drag-handle');
    if (!item || (!handle && e.target !== item)) {
      e.preventDefault();
      return;
    }
    dragFromIndex = Number(item.dataset.index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(dragFromIndex));
    item.classList.add('dragging');
  });

  q.addEventListener('dragend', () => {
    q.querySelectorAll('.queue-item.dragging, .queue-item.drag-over').forEach((el) => {
      el.classList.remove('dragging', 'drag-over');
    });
    dragFromIndex = null;
  });

  q.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const item = e.target.closest('.queue-item');
    q.querySelectorAll('.queue-item.drag-over').forEach((el) => {
      if (el !== item) el.classList.remove('drag-over');
    });
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

function syncPlaylistSelect() {
  const sel = $('playlist-select');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = state.playlists
    .map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`)
    .join('');
  if (cur && [...sel.options].some((o) => o.value === cur)) sel.value = cur;
}

function render() {
  const np = $('now-playing');
  if (np) {
    np.textContent = state.currentId
      ? (trackById(state, state.currentId)?.name || 'Unknown')
      : 'Nothing playing';
  }

  const lib = $('library-list');
  if (lib) {
    lib.innerHTML = '';
    state.library.forEach((t) => {
      const li = document.createElement('li');
      li.className = state.currentId === t.id ? 'active' : '';
      li.innerHTML =
        `<span>${esc(t.name)}</span>` +
        `<span class="actions">` +
        `<button type="button" data-a="play" data-id="${esc(t.id)}">Play</button>` +
        `<button type="button" data-a="q" data-id="${esc(t.id)}">+Q</button>` +
        `<button type="button" data-a="addpl" data-id="${esc(t.id)}">+PL</button>` +
        `</span>`;
      lib.appendChild(li);
    });
    const le = $('library-empty');
    if (le) le.style.display = state.library.length ? 'none' : 'block';
  }

  const pl = $('playlist-list');
  if (pl) {
    pl.innerHTML = '';
    let missingTotal = 0;
    state.playlists.forEach((p) => {
      const li = document.createElement('li');
      li.innerHTML =
        `<span>${esc(p.name)} (${p.trackIds.length})</span>` +
        `<span class="actions">` +
        `<button type="button" data-a="loadpl" data-id="${esc(p.id)}">Load</button>` +
        `<button type="button" data-a="delpl" data-id="${esc(p.id)}">Del</button>` +
        `</span>`;
      pl.appendChild(li);
      const sub = document.createElement('ul');
      p.trackIds.forEach((tid, i) => {
        const tr = trackById(state, tid);
        if (!tr) { missingTotal += 1; return; }
        const s = document.createElement('li');
        s.innerHTML =
          `<span>${i + 1}. ${esc(tr.name)}</span>` +
          `<span class="actions">` +
          `<button type="button" data-a="play" data-id="${esc(tid)}">Play</button>` +
          `<button type="button" data-a="up" data-pid="${esc(p.id)}" data-i="${i}">Up</button>` +
          `<button type="button" data-a="down" data-pid="${esc(p.id)}" data-i="${i}">Dn</button>` +
          `<button type="button" data-a="rmpl" data-pid="${esc(p.id)}" data-id="${esc(tid)}">X</button>` +
          `</span>`;
        sub.appendChild(s);
      });
      pl.appendChild(sub);
    });
    const pe = $('playlist-error');
    if (pe) {
      if (missingTotal) {
        pe.hidden = false;
        pe.textContent = `${missingTotal} missing track(s) in library`;
      } else {
        pe.hidden = true;
        pe.textContent = '';
      }
    }
    const ple = $('playlist-empty');
    if (ple) ple.style.display = state.playlists.length ? 'none' : 'block';
  }

  renderQueue();
  syncPlaylistSelect();
}

function bindStaticControls() {
  $('btn-import')?.addEventListener('click', async () => {
    const selected = await openFileDialog({
      multiple: true,
      filters: [{
        name: 'Media',
        extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'mp4', 'webm'],
      }],
    });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    if (!paths.length) return;
    state = addTracks(state, paths.map((p) => ({ id: uid(), name: basename(p), path: p })));
    persist();
  });

  $('btn-create-playlist')?.addEventListener('click', () => {
    const name = $('playlist-name')?.value?.trim();
    if (!name) return;
    state = createPlaylist(state, name);
    const pn = $('playlist-name');
    if (pn) pn.value = '';
    persist();
  });

  $('btn-rename-playlist')?.addEventListener('click', () => {
    const pid = $('playlist-select')?.value;
    const name = $('playlist-name')?.value?.trim();
    if (!pid || !name) return;
    state = renamePlaylist(state, pid, name);
    persist();
  });
}

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
  } else if (a === 'q') {
    addToQueue(id);
  } else if (a === 'rmq') {
    removeFromQueue(id);
  } else if (a === 'addpl') {
    const pid = $('playlist-select')?.value;
    if (pid) { state = addToPlaylist(state, pid, id); persist(); }
  } else if (a === 'loadpl') {
    state = loadPlaylistQueue(state, id);
    persist();
  } else if (a === 'delpl') {
    state = deletePlaylist(state, id);
    persist();
  } else if (a === 'rmpl') {
    state = removeFromPlaylist(state, btn.dataset.pid, id);
    persist();
  } else if (a === 'up') {
    state = reorderPlaylist(state, btn.dataset.pid, Number(btn.dataset.i), Number(btn.dataset.i) - 1);
    persist();
  } else if (a === 'down') {
    state = reorderPlaylist(state, btn.dataset.pid, Number(btn.dataset.i), Number(btn.dataset.i) + 1);
    persist();
  }
});

async function boot() {
  state = load();
  if (!state.settings) state = { ...state, settings: { themeId: null } };
  await initTheme({
    getThemeId,
    setThemeId: (id) => { state = setThemeId(id); },
  });
  document.documentElement.dataset.themeReady = 'true';
  ensureQueueLiveRegion();
  bindThemeSelectOnce({ listThemes, applyTheme, subscribe, getThemeId });
  if (!queueHandlersBound) {
    setupQueueKeyboard();
    setupQueueDragDrop();
    queueHandlersBound = true;
  }
  bindStaticControls();
  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { void boot(); });
} else {
  void boot();
}
