import {
  load,
  save,
  uid,
  addTracks,
  createPlaylist,
  deletePlaylist,
  renamePlaylist,
  addToPlaylist,
  removeFromPlaylist,
  reorderPlaylist,
  loadPlaylistQueue,
  setCurrent,
  trackById,
} from './store.js';
import { mediaType, playTrack } from './player.js';

let state = load();
const $ = (id) => document.getElementById(id);
const player = $('player');

function persist() {
  save(state);
  render();
}

function render() {
  document.querySelector('#app').dataset.ready = 'true';

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
  }
  $('playlist-empty').style.display = state.playlists.length ? 'none' : 'block';

  const q = $('queue-list');
  q.innerHTML = '';
  state.queue.forEach((tid, i) => {
    const tr = trackById(state, tid);
    if (!tr) return;
    const li = document.createElement('li');
    li.className = state.currentId === tid ? 'active' : '';
    li.innerHTML = `<span>${i + 1}. ${tr.name}</span><button data-a="play" data-id="${tid}">Play</button>`;
    q.appendChild(li);
  });
  $('queue-empty').style.display = state.queue.length ? 'none' : 'block';

  const cur = trackById(state, state.currentId);
  $('now-playing').textContent = cur ? `Playing: ${cur.name}` : 'Select a track to play';
}

async function importPaths(paths) {
  if (!paths?.length) return;
  state = addTracks(
    state,
    paths.map((p) => ({
      id: uid(),
      name: p.split(/[\\/]/).pop(),
      path: p,
      type: mediaType(p),
    })),
  );
  persist();
}

async function pickImport() {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const sel = await open({
      multiple: true,
      filters: [
        {
          name: 'Media',
          extensions: ['mp4', 'mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'webm'],
        },
      ],
    });
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

document.addEventListener('click', (e) => {
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
      const p = state.playlists.find((x) => x.id === pid);
      if (p && i < p.trackIds.length - 1) {
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

$('btn-import').addEventListener('click', pickImport);

$('file-input').addEventListener('change', (e) => {
  const files = [...e.target.files];
  if (!files.length) return;
  const paths = files.map((f) => f.path || f.name);
  importPaths(paths);
  e.target.value = '';
});

$('btn-create-playlist').addEventListener('click', () => {
  state = createPlaylist(state, $('playlist-name').value);
  $('playlist-name').value = '';
  persist();
});

$('btn-rename-playlist').addEventListener('click', () => {
  const pid = $('playlist-select').value;
  if (pid) {
    state = renamePlaylist(state, pid, $('playlist-name').value);
    persist();
  }
});

$('btn-prev').addEventListener('click', prevTrack);
$('btn-next').addEventListener('click', nextTrack);

player.addEventListener('ended', nextTrack);

document.body.addEventListener('dragover', (e) => e.preventDefault());
document.body.addEventListener('drop', async (e) => {
  e.preventDefault();
  const paths = [];
  if (e.dataTransfer?.files) {
    for (const f of e.dataTransfer.files) {
      if (f.path) paths.push(f.path);
    }
  }
  await importPaths(paths);
});

render();
