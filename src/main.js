import {
  load, save, uid, addTracks, createPlaylist, deletePlaylist, renamePlaylist,
  addToPlaylist, removeFromPlaylist, reorderPlaylist, loadPlaylistQueue,
  setCurrent, trackById, getThemeId, setThemeId, updateSettings,
} from './store.js';
import { playTrack, playStream } from './player.js';
import { initTheme, applyTheme, listThemes, subscribe } from './theme/themeManager.js';
import { bindThemeSelectOnce } from './ui/themeSelect.js';
import { applyWindowMode, getSavedWindowMode, WINDOW_MODE } from './ui/windowMode.js';
import { clearStageVisual, syncStageVisualFromPlayer, setStageVisual } from './ui/stageVisual.js';
import { fetchTopLocal, fetchTopNational, US_STATES } from './radio/stations.js';
import './connections/spotify.js';
import './connections/audius.js';
import './connections/archive.js';
import './connections/podcasts.js';
import { getConnection } from './connections/registry.js';
import {
  completeSpotifyLogin, getSpotifyClientId, setSpotifyClientId, getSpotifyRedirectUri,
  parseSpotifyLink, SPOTIFY_DASHBOARD_URL, OAUTH_PORT, getSpotifyDisplayName,
} from './connections/spotify.js';
import { playSpotifyFull, spotifyUriFromOpenUrl, disconnectSpotifyPlayer } from './connections/spotifyPlayback.js';
import { searchAudiusTracks, getCachedAudiusTrack } from './connections/audius.js';
import {
  browseArchive, searchArchive, fetchArchiveMetadata, getCachedArchiveDoc, archiveDownloadUrl,
} from './connections/archive.js';
import {
  searchPodcastShows, fetchPodcastEpisodes, browseFeaturedPodcasts,
  getCachedPodcastShow, getCachedPodcastEpisode,
} from './connections/podcasts.js';
import { open as openFileDialog } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

const basename = (p) => String(p).replace(/\\/g, '/').split('/').pop();

const $ = (id) => document.getElementById(id);
const player = $('player');
let state = load();
if (!state.settings) state = { ...state, settings: { themeId: null } };
let dragFromIndex = null;
let queueHandlersBound = false;
let radioCache = { local: [], national: [], loaded: false };
let activeStationId = null;
let connectionsOpen = false;
/** @type {'mp4' | 'radio' | 'spotify' | 'audius' | 'archive' | 'podcast'} */
let activePlayStyle = 'mp4';
let activeArtworkUrl = '';
/** @type {'music' | 'audiobooks' | 'films'} */
let archiveCategory = 'music';
let podcastFocusShowId = null;

function applyPlayStyleVisual({ style = 'mp4', artworkUrl = '', hasVideo = false } = {}) {
  activePlayStyle = style;
  activeArtworkUrl = artworkUrl || '';
  setStageVisual({ style, artworkUrl, hasVideo });
}

async function openExternal(url) {
  if (!url) return;
  try {
    const { open } = await import('@tauri-apps/plugin-shell');
    await Promise.race([
      open(url),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('open-timeout')), 4000);
      }),
    ]);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

let spotifyLoginInFlight = false;

async function startSpotifyLoginFlow() {
  if (spotifyLoginInFlight) {
    setConnStatusMsg('Spotify login already in progress — finish in the browser, or wait for timeout.');
    return;
  }
  const clientId = $('spotify-client-id')?.value?.trim() || getSpotifyClientId();
  if (clientId) setSpotifyClientId(clientId);
  const spotify = getConnection('spotify');
  const res = await spotify?.connectUser({ clientId });
  if (!res?.ok) {
    setConnStatusMsg(res?.message || 'Could not start Spotify login.', true);
    return;
  }
  state = load();
  spotifyLoginInFlight = true;
  setConnStatusMsg('Opening Spotify… approve access in your browser. Tuner will stay responsive.');

  // Start loopback listener on a worker thread (async command) BEFORE opening the browser.
  const waitPromise = invoke('await_oauth_redirect', { port: OAUTH_PORT, timeoutMs: 120_000 });
  await new Promise((r) => setTimeout(r, 250));

  if (res.authUrl) {
    void openExternal(res.authUrl);
  }

  // Do not block the UI click path on the full wait — settle in the background.
  void waitPromise
    .then(async (redirectUrl) => {
      const done = await completeSpotifyLogin(redirectUrl);
      setConnStatusMsg(done.message, !done.ok);
      state = load();
      await renderConnections();
    })
    .catch((err) => {
      const msg = String(err?.message || err || 'Login wait failed');
      setConnStatusMsg(
        `${msg} Tip: copy the address bar URL from the browser after approve, paste under Fallback, then Finish login.`,
        true,
      );
    })
    .finally(() => {
      spotifyLoginInFlight = false;
    });
}

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

function currentSource() {
  return state.settings?.mediaSource === 'radio' ? 'radio' : 'library';
}

function setMediaSource(source) {
  const next = source === 'radio' ? 'radio' : 'library';
  state = updateSettings({ mediaSource: next });
  document.body.classList.toggle('source-radio', next === 'radio');
  document.body.classList.toggle('source-library', next === 'library');
  $('tab-library')?.setAttribute('aria-selected', next === 'library' ? 'true' : 'false');
  $('tab-radio')?.setAttribute('aria-selected', next === 'radio' ? 'true' : 'false');
  if (next === 'radio') void loadRadio();
  render();
}

function hideSpotifyEmbed() {
  const wrap = $('spotify-embed-wrap');
  const frame = $('spotify-embed');
  if (wrap) wrap.classList.add('hidden');
  if (frame) frame.removeAttribute('src');
}

function showSpotifyEmbed(url) {
  const wrap = $('spotify-embed-wrap');
  const frame = $('spotify-embed');
  const full = $('spotify-full-wrap');
  if (full) full.classList.add('hidden');
  if (!wrap || !frame || !url) return;
  // theme=0 keeps dark chrome; embeds are preview-limited unless Spotify Premium is logged into the iframe.
  frame.src = url.includes('?') ? `${url}&utm_source=tuner` : `${url}?utm_source=tuner`;
  wrap.classList.remove('hidden');
}

function showSpotifyFullStage(label) {
  hideSpotifyEmbed();
  if (player) { player.pause(); player.removeAttribute('src'); }
  const full = $('spotify-full-wrap');
  const text = $('spotify-full-label');
  if (text) text.textContent = label || 'Playing full track via Spotify Premium…';
  if (full) full.classList.remove('hidden');
  setLiveBadge(false);
}

async function playSpotifyFullOrOpen(externalUrl, { preferExternal = false } = {}) {
  const uri = spotifyUriFromOpenUrl(externalUrl) || externalUrl;
  const contextUri = uri?.startsWith('spotify:') ? uri : spotifyUriFromOpenUrl(externalUrl);

  if (!preferExternal && getConnection('spotify')?.getStatus() === 'user' && contextUri) {
    try {
      const body = contextUri.includes(':track:')
        ? { uris: [contextUri] }
        : { contextUri };
      await playSpotifyFull(body);
      showSpotifyFullStage(`Full playback · ${contextUri}`);
      const np = $('now-playing');
      if (np) np.textContent = 'Spotify Premium · full length';
      setConnStatusMsg('Playing full length in Tuner (Spotify Premium).');
      return true;
    } catch (e) {
      setConnStatusMsg(e?.message || String(e), true);
      // Fall through to open Spotify app/web for full tracks.
    }
  }
  if (externalUrl) await openExternal(externalUrl);
  return false;
}

function setLiveBadge(on) {
  const badge = $('play-mode-badge');
  if (!badge) return;
  badge.classList.toggle('hidden', !on);
  badge.classList.toggle('live', on);
  badge.textContent = on ? 'LIVE' : '';
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

function playById(id) {
  if (!id) return;
  activeStationId = null;
  hideSpotifyEmbed();
  setLiveBadge(false);
  state = setCurrent(state, id);
  const tr = trackById(state, id);
  if (tr && player) {
    player.muted = false;
    const looksVideo = /\.(mp4|webm)$/i.test(tr.path || '');
    applyPlayStyleVisual({ style: 'mp4', artworkUrl: tr.artwork || '', hasVideo: looksVideo });
    playTrack(player, tr);
  }
  persist();
}

async function listenStation(station) {
  if (!station?.url || !player) return;
  activeStationId = station.id;
  hideSpotifyEmbed();
  setLiveBadge(true);
  state = setCurrent(state, null);
  applyPlayStyleVisual({ style: 'radio', artworkUrl: station.favicon || station.image || '', hasVideo: false });
  const np = $('now-playing');
  if (np) np.textContent = `${station.name} · LIVE`;
  save(state);
  const ok = await playStream(player, station.url, { muted: false });
  if (!ok) {
    const st = $('radio-status');
    if (st) st.textContent = 'Could not start stream — try another station.';
  }
  renderRadioLists();
}

function queueNeighbor(delta) {
  if (!state.queue.length) return;
  const idx = state.queue.indexOf(state.currentId);
  const nextIdx = idx < 0
    ? (delta > 0 ? 0 : state.queue.length - 1)
    : (idx + delta + state.queue.length) % state.queue.length;
  playById(state.queue[nextIdx]);
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
  const qc = $('queue-count');
  if (qc) qc.textContent = state.queue.length ? `${state.queue.length}` : '';
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
    } else if ((e.key === 'Enter' || e.key === ' ') && id) {
      e.preventDefault();
      playById(id);
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

function fillRadioRegionSelect() {
  const sel = $('radio-region');
  if (!sel || sel.dataset.ready) return;
  sel.dataset.ready = '1';
  const saved = state.settings?.radioRegion || '';
  sel.innerHTML = US_STATES.map((s) =>
    `<option value="${esc(s)}">${esc(s || 'All US (popular)')}</option>`).join('');
  sel.value = saved;
}

function renderStationList(el, stations) {
  if (!el) return;
  el.innerHTML = '';
  stations.forEach((st) => {
    const li = document.createElement('li');
    if (activeStationId === st.id) li.classList.add('active');
    li.dataset.sid = st.id;
    const meta = [st.state, st.tags, st.bitrate ? `${st.bitrate}kbps` : '']
      .filter(Boolean).join(' · ');
    li.innerHTML =
      `<span class="item-title" title="${esc(st.name)}">${esc(st.name)}` +
      `${meta ? `<span class="station-meta">${esc(meta)}</span>` : ''}</span>` +
      `<span class="actions">` +
      `<button type="button" data-a="listen" data-sid="${esc(st.id)}">Listen</button>` +
      `</span>`;
    li.addEventListener('dblclick', () => {
      const station = findStation(st.id);
      if (station) void listenStation(station);
    });
    el.appendChild(li);
  });
}

function renderRadioLists() {
  renderStationList($('radio-local-list'), radioCache.local);
  renderStationList($('radio-national-list'), radioCache.national);
}

async function loadRadio(force = false) {
  fillRadioRegionSelect();
  const status = $('radio-status');
  if (!force && radioCache.loaded) {
    renderRadioLists();
    return;
  }
  if (status) status.textContent = 'Tuning stations…';
  const region = $('radio-region')?.value || state.settings?.radioRegion || '';
  const [local, national] = await Promise.all([
    fetchTopLocal(18, region),
    fetchTopNational(24),
  ]);
  radioCache = { local, national, loaded: true };
  if (status) {
    status.textContent = local.length || national.length
      ? `${local.length} local · ${national.length} national`
      : 'No stations found.';
  }
  renderRadioLists();
}

function setConnectionsOpen(open) {
  connectionsOpen = open;
  document.querySelector('.layout')?.classList.toggle('show-connections', open);
  const panel = $('connections-panel');
  if (panel) panel.classList.toggle('hidden', !open);
  if (open) {
    // Zero-setup catalogs load immediately.
    const jobs = [];
    for (const id of ['spotify', 'audius', 'archive', 'podcasts']) {
      const conn = getConnection(id);
      if (conn && conn.getStatus() === 'disconnected') jobs.push(conn.connectGuest());
    }
    void Promise.all(jobs).then(() => {
      state = load();
      void renderConnections();
    });
  }
}

function setConnStatusMsg(msg, isError = false) {
  const el = $('conn-status-msg');
  if (!el) return;
  el.textContent = msg || '';
  el.classList.toggle('error', Boolean(isError && msg));
}

async function playAudiusTrack(track) {
  if (!track?.streamUrl || !player) return false;
  activeStationId = null;
  hideSpotifyEmbed();
  $('spotify-full-wrap')?.classList.add('hidden');
  setLiveBadge(false);
  state = setCurrent(state, null);
  save(state);
  applyPlayStyleVisual({ style: 'audius', artworkUrl: track.image || '', hasVideo: false });
  const np = $('now-playing');
  if (np) np.textContent = `${track.name}${track.artists ? ` · ${track.artists}` : ''} · Audius`;
  const ok = await playStream(player, track.streamUrl, { muted: false });
  if (!ok) setConnStatusMsg('Could not start Audius stream — try another track.', true);
  else setConnStatusMsg('Playing full-length Audius track. Connections stays open for more browsing.');
  return ok;
}


async function playArchiveItem(docOrId, fileName = '') {
  const id = typeof docOrId === 'string' ? docOrId : docOrId?.id;
  if (!id || !player) return false;
  const doc = typeof docOrId === 'object' ? docOrId : getCachedArchiveDoc(id);
  let item;
  try {
    item = await fetchArchiveMetadata(id);
  } catch (e) {
    setConnStatusMsg(e?.message || 'Could not load Archive item.', true);
    return false;
  }
  const streamUrl = fileName ? archiveDownloadUrl(id, fileName) : item.streamUrl;
  if (!streamUrl) {
    setConnStatusMsg('No playable file found for this Archive item.', true);
    return false;
  }
  activeStationId = null;
  hideSpotifyEmbed();
  $('spotify-full-wrap')?.classList.add('hidden');
  setLiveBadge(false);
  state = setCurrent(state, null);
  save(state);
  const hasVideo = Boolean(item.hasVideo) && !fileName;
  applyPlayStyleVisual({
    style: 'archive',
    artworkUrl: hasVideo ? '' : (item.image || doc?.image || ''),
    hasVideo,
  });
  const np = $('now-playing');
  const label = fileName || item.streamName || '';
  if (np) {
    np.textContent = `${item.title}${item.creator ? ` · ${item.creator}` : ''}${label ? ` · ${label}` : ''} · Archive`;
  }
  if (!fileName && item.audioFiles?.length > 1) {
    fillArchiveFileList(item);
  }
  const ok = await playStream(player, streamUrl, { muted: false });
  if (!ok) setConnStatusMsg('Could not start Archive stream — try another item.', true);
  else setConnStatusMsg('Playing from Internet Archive. Panel stays open so you can keep browsing.');
  return ok;
}

async function playPodcastEpisode(episode) {
  if (!episode?.streamUrl || !player) return false;
  activeStationId = null;
  hideSpotifyEmbed();
  $('spotify-full-wrap')?.classList.add('hidden');
  setLiveBadge(false);
  state = setCurrent(state, null);
  save(state);
  applyPlayStyleVisual({ style: 'podcast', artworkUrl: episode.image || '', hasVideo: false });
  const np = $('now-playing');
  if (np) np.textContent = `${episode.name}${episode.subtitle ? ` · ${episode.subtitle}` : ''} · Podcast`;
  const ok = await playStream(player, episode.streamUrl, { muted: false });
  if (!ok) setConnStatusMsg('Could not start podcast episode — try another.', true);
  else setConnStatusMsg('Playing podcast episode. Connections stays open for more browsing.');
  return ok;
}

async function renderConnections() {
  const host = $('connections-list');
  if (!host) return;
  const spotify = getConnection('spotify');
  const audius = getConnection('audius');
  const archive = getConnection('archive');
  const podcasts = getConnection('podcasts');
  const status = spotify?.getStatus?.() || 'disconnected';
  const who = getSpotifyDisplayName();
  const audiusStatus = audius?.getStatus?.() || 'disconnected';
  const archiveStatus = archive?.getStatus?.() || 'disconnected';
  const podcastStatus = podcasts?.getStatus?.() || 'disconnected';
  const cat = archiveCategory;

  host.innerHTML = `
    <article class="conn-card" data-provider="audius">
      <h3>Audius</h3>
      <p><strong>Recommended for free full songs.</strong> Open catalog — no account, no API keys, no Premium. Playing a track keeps this panel open.</p>
      <span class="conn-status">${esc(audiusStatus === 'disconnected' ? 'ready' : audiusStatus)}</span>
      <p id="audius-status-msg" class="conn-hint" aria-live="polite"></p>
      <div class="conn-field">
        <label class="field-label" for="audius-search">Search Audius</label>
        <div class="row">
          <input id="audius-search" placeholder="Artist, song, mood…" />
          <button type="button" class="btn-primary" data-conn="audius-search">Search</button>
          <button type="button" class="btn-secondary" data-conn="audius-trending">Trending</button>
        </div>
      </div>
      <h4 class="section-label">Audius tracks</h4>
      <ul class="conn-playlists tuner-scrollbars" id="audius-track-list"></ul>
    </article>


    <article class="conn-card" data-provider="archive">
      <h3>Internet Archive</h3>
      <p>Free music, LibriVox audiobooks, and public-domain films — no setup. Playing keeps this panel open.</p>
      <span class="conn-status">${esc(archiveStatus === 'disconnected' ? 'ready' : archiveStatus)}</span>
      <p id="archive-status-msg" class="conn-hint" aria-live="polite"></p>
      <div class="conn-actions conn-cats">
        <button type="button" class="btn-secondary${cat === 'music' ? ' is-active' : ''}" data-conn="archive-cat" data-cat="music">Music</button>
        <button type="button" class="btn-secondary${cat === 'audiobooks' ? ' is-active' : ''}" data-conn="archive-cat" data-cat="audiobooks">Audiobooks</button>
        <button type="button" class="btn-secondary${cat === 'films' ? ' is-active' : ''}" data-conn="archive-cat" data-cat="films">Films</button>
      </div>
      <div class="conn-field">
        <label class="field-label" for="archive-search">Search Archive.org</label>
        <div class="row">
          <input id="archive-search" placeholder="Title, creator, topic…" />
          <button type="button" class="btn-primary" data-conn="archive-search">Search</button>
          <button type="button" class="btn-secondary" data-conn="archive-browse">Browse</button>
        </div>
      </div>
      <h4 class="section-label">Archive results</h4>
      <ul class="conn-playlists tuner-scrollbars" id="archive-item-list"></ul>
      <h4 class="section-label">Chapters / files</h4>
      <ul class="conn-playlists tuner-scrollbars" id="archive-file-list"></ul>
    </article>

    <article class="conn-card" data-provider="podcasts">
      <h3>Podcasts</h3>
      <p>Search free podcasts and play episodes — no account or API key. Playing keeps this panel open.</p>
      <span class="conn-status">${esc(podcastStatus === 'disconnected' ? 'ready' : podcastStatus)}</span>
      <p id="podcast-status-msg" class="conn-hint" aria-live="polite"></p>
      <div class="conn-field">
        <label class="field-label" for="podcast-search">Search podcasts</label>
        <div class="row">
          <input id="podcast-search" placeholder="Science, history, music…" />
          <button type="button" class="btn-primary" data-conn="podcast-search">Search</button>
          <button type="button" class="btn-secondary" data-conn="podcast-featured">Featured</button>
        </div>
      </div>
      <h4 class="section-label">Shows</h4>
      <ul class="conn-playlists tuner-scrollbars" id="podcast-show-list"></ul>
      <h4 class="section-label">Episodes</h4>
      <ul class="conn-playlists tuner-scrollbars" id="podcast-episode-list"></ul>
    </article>

    <article class="conn-card" data-provider="spotify">
      <h3>Spotify</h3>
      <p>Browse as guest for previews, or sign in with <strong>Spotify Premium</strong> for full-length playback in Tuner. Free accounts and embeds are limited to ~30s previews by Spotify.</p>
      <span class="conn-status">${esc(status)}${who && status === 'user' ? ` · ${esc(who)}` : ''}</span>
      <p id="conn-status-msg" class="conn-hint" aria-live="polite"></p>

      <div class="conn-actions">
        <button type="button" class="btn-secondary" data-conn="spotify-guest">Browse as Guest</button>
        <button type="button" class="btn-ghost" data-conn="spotify-disconnect">Disconnect</button>
      </div>

      <div class="conn-field">
        <label class="field-label" for="spotify-link">Open any Spotify link</label>
        <div class="row">
          <input id="spotify-link" placeholder="Paste playlist / album / track URL" />
          <button type="button" class="btn-primary" data-conn="spotify-open-link">Play full</button>
          <button type="button" class="btn-ghost" data-conn="spotify-preview-link">Preview</button>
        </div>
        <span class="conn-hint">Full length uses Spotify Premium (in Tuner or the Spotify app). Preview is the ~30s clip Spotify allows without Premium streaming.</span>
      </div>

      <details class="conn-advanced">
        <summary>Sign in for your playlists (one-time setup)</summary>
        <ol class="conn-steps">
          <li>Open the <button type="button" class="linkish" data-conn="spotify-dashboard">Spotify Developer Dashboard</button> and create an app (owner needs <strong>Spotify Premium</strong>).</li>
          <li>Add redirect URI
            <code id="spotify-redirect-uri">${esc(getSpotifyRedirectUri())}</code>
            <button type="button" class="btn-tiny btn-ghost" data-conn="spotify-copy-uri">Copy</button>
          </li>
          <li><strong>User Management</strong> → Add new user → enter the <em>exact</em> Spotify email you’ll sign in with (required in Development Mode or API calls return 403).</li>
          <li>Paste the Client ID below, click <strong>Connect Spotify</strong>, approve in the browser. Disconnect/reconnect after changing scopes. Premium is required for full songs in Tuner.</li>
        </ol>
        <div class="conn-field">
          <label class="field-label" for="spotify-client-id">Client ID</label>
          <input id="spotify-client-id" placeholder="Paste Client ID from Spotify Dashboard" value="${esc(getSpotifyClientId())}" />
        </div>
        <div class="conn-actions">
          <button type="button" class="btn-primary" data-conn="spotify-login">Connect Spotify</button>
        </div>
        <div class="conn-field">
          <label class="field-label" for="spotify-code">Fallback: paste redirect URL</label>
          <input id="spotify-code" placeholder="Only if auto-connect fails" />
          <button type="button" class="btn-secondary" data-conn="spotify-finish">Finish login</button>
        </div>
      </details>

      <h4 class="section-label">Your Spotify library</h4>
      <ul class="conn-playlists tuner-scrollbars" id="spotify-playlist-list"></ul>
    </article>
    <p class="conn-hint">Pandora isn’t available for third-party Connect (no public free stream API). Audius, Archive, Podcasts, and live Radio cover free listening with little or no setup.</p>
  `;

  await Promise.all([fillAudiusTrackList(), fillArchiveItemList(), fillPodcastShowList(), fillSpotifyPlaylistList()]);
}

async function fillSpotifyPlaylistList() {
  const list = $('spotify-playlist-list');
  const spotify = getConnection('spotify');
  if (!list || !spotify) return;
  try {
    const playlists = await spotify.listPlaylists();
    list.innerHTML = playlists.map((p) => `
      <li>
        <span class="item-title">${esc(p.name)}</span>
        <span class="station-meta">${esc(p.subtitle || '')}</span>
        <span class="actions">
          ${p.externalUrl ? `<button type="button" data-a="sp-full" data-url="${esc(p.externalUrl)}">Play full</button>` : ''}
          ${p.embedUrl ? `<button type="button" data-a="sp-embed" data-url="${esc(p.embedUrl)}">Preview</button>` : ''}
          ${p.externalUrl ? `<button type="button" data-a="sp-open" data-url="${esc(p.externalUrl)}">Open Spotify</button>` : ''}
        </span>
      </li>
    `).join('') || '<li class="empty">No playlists yet — try Browse as Guest.</li>';
  } catch (e) {
    list.innerHTML = `<li class="error">${esc(e.message || 'Failed to load playlists')}</li>`;
  }
}

async function fillAudiusTrackList(query = '') {
  const list = $('audius-track-list');
  const status = $('audius-status-msg');
  if (!list) return;
  list.innerHTML = '<li class="empty">Loading Audius…</li>';
  try {
    const audius = getConnection('audius');
    if (audius?.getStatus() === 'disconnected') await audius.connectGuest();
    const tracks = query
      ? await searchAudiusTracks(query, 28)
      : await audius.listPlaylists();
    if (status) status.textContent = query ? `Results for “${query}”` : 'Trending this week · full-length streams';
    list.innerHTML = tracks.map((t) => `
      <li>
        <span class="item-title">${esc(t.name)}</span>
        <span class="station-meta">${esc(t.subtitle || '')}</span>
        <span class="actions">
          ${t.streamUrl || t.id ? `<button type="button" data-a="audius-play" data-id="${esc(t.id)}">Play</button>` : ''}
          ${t.externalUrl ? `<button type="button" data-a="audius-open" data-url="${esc(t.externalUrl)}">Open</button>` : ''}
        </span>
      </li>
    `).join('') || '<li class="empty">No tracks found.</li>';
  } catch (e) {
    list.innerHTML = `<li class="error">${esc(e.message || 'Audius failed to load')}</li>`;
  }
}

async function fillArchiveItemList(query = '') {
  const list = $('archive-item-list');
  const status = $('archive-status-msg');
  const files = $('archive-file-list');
  if (!list) return;
  list.innerHTML = '<li class="empty">Loading Archive.org…</li>';
  if (files) files.innerHTML = '';
  try {
    const archive = getConnection('archive');
    if (archive?.getStatus() === 'disconnected') await archive.connectGuest();
    const items = query
      ? await searchArchive(query, archiveCategory, 28)
      : await browseArchive(archiveCategory, 28);
    if (status) {
      status.textContent = query
        ? `Results for “${query}” · ${archiveCategory}`
        : `Browsing ${archiveCategory} · free streams`;
    }
    list.innerHTML = items.map((t) => `
      <li>
        <span class="item-title">${esc(t.name)}</span>
        <span class="station-meta">${esc(t.subtitle || '')}</span>
        <span class="actions">
          <button type="button" data-a="archive-play" data-id="${esc(t.id)}">Play</button>
          ${t.externalUrl ? `<button type="button" data-a="archive-open" data-url="${esc(t.externalUrl)}">Open</button>` : ''}
        </span>
      </li>
    `).join('') || '<li class="empty">No items found.</li>';
  } catch (e) {
    list.innerHTML = `<li class="error">${esc(e.message || 'Archive failed to load')}</li>`;
  }
}

function fillArchiveFileList(item) {
  const list = $('archive-file-list');
  if (!list || !item) return;
  const files = item.audioFiles || [];
  list.innerHTML = files.map((f) => `
    <li>
      <span class="item-title">${esc(f.name)}</span>
      <span class="station-meta">${esc(f.format || '')}</span>
      <span class="actions">
        <button type="button" data-a="archive-file" data-id="${esc(item.id)}" data-file="${esc(f.name)}">Play</button>
      </span>
    </li>
  `).join('') || '<li class="empty">Single stream — use Play on the item above.</li>';
}

async function fillPodcastShowList(query = '') {
  const list = $('podcast-show-list');
  const status = $('podcast-status-msg');
  const episodes = $('podcast-episode-list');
  if (!list) return;
  list.innerHTML = '<li class="empty">Loading podcasts…</li>';
  if (episodes) episodes.innerHTML = '';
  try {
    const podcasts = getConnection('podcasts');
    if (podcasts?.getStatus() === 'disconnected') await podcasts.connectGuest();
    const shows = query
      ? await searchPodcastShows(query, 20)
      : await browseFeaturedPodcasts(18);
    if (status) status.textContent = query ? `Shows for “${query}”` : 'Featured free podcasts';
    list.innerHTML = shows.map((s) => `
      <li>
        <span class="item-title">${esc(s.name)}</span>
        <span class="station-meta">${esc(s.subtitle || '')}</span>
        <span class="actions">
          <button type="button" data-a="podcast-episodes" data-id="${esc(s.id)}">Episodes</button>
          ${s.externalUrl ? `<button type="button" data-a="podcast-open" data-url="${esc(s.externalUrl)}">Open</button>` : ''}
        </span>
      </li>
    `).join('') || '<li class="empty">No shows found.</li>';
  } catch (e) {
    list.innerHTML = `<li class="error">${esc(e.message || 'Podcasts failed to load')}</li>`;
  }
}

async function fillPodcastEpisodeList(showId) {
  const list = $('podcast-episode-list');
  const status = $('podcast-status-msg');
  if (!list) return;
  podcastFocusShowId = showId;
  list.innerHTML = '<li class="empty">Loading episodes…</li>';
  try {
    const episodes = await fetchPodcastEpisodes(showId, 24);
    const show = getCachedPodcastShow(showId);
    if (status) status.textContent = show ? `Episodes · ${show.name}` : 'Episodes';
    list.innerHTML = episodes.map((ep) => `
      <li>
        <span class="item-title">${esc(ep.name)}</span>
        <span class="station-meta">${esc(ep.subtitle || '')}</span>
        <span class="actions">
          <button type="button" data-a="podcast-play" data-id="${esc(ep.id)}">Play</button>
        </span>
      </li>
    `).join('') || '<li class="empty">No episodes with playable audio.</li>';
  } catch (e) {
    list.innerHTML = `<li class="error">${esc(e.message || 'Could not load episodes')}</li>`;
  }
}


function render() {
  const src = currentSource();
  document.body.classList.toggle('source-radio', src === 'radio');
  document.body.classList.toggle('source-library', src === 'library');

  const np = $('now-playing');
  if (np && !activeStationId) {
    np.textContent = state.currentId
      ? (trackById(state, state.currentId)?.name || 'Unknown')
      : 'Select a track';
  }

  const lib = $('library-list');
  if (lib) {
    lib.classList.add('tuner-scrollbars', 'media-list');
    lib.innerHTML = '';
    state.library.forEach((t) => {
      const li = document.createElement('li');
      li.className = state.currentId === t.id ? 'active' : '';
      li.innerHTML =
        `<span class="item-title" title="${esc(t.name)}">${esc(t.name)}</span>` +
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
  const lc = $('library-count');
  if (lc) lc.textContent = state.library.length ? `${state.library.length}` : '';

  const pl = $('playlist-list');
  if (pl) {
    pl.classList.add('tuner-scrollbars', 'media-list');
    pl.innerHTML = '';
    let missingTotal = 0;
    state.playlists.forEach((p) => {
      const li = document.createElement('li');
      li.innerHTML =
        `<span class="item-title" title="${esc(p.name)}">${esc(p.name)} (${p.trackIds.length})</span>` +
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
          `<span class="item-title" title="${esc(tr.name)}">${i + 1}. ${esc(tr.name)}</span>` +
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
        pe.classList.remove('hidden');
        pe.textContent = `${missingTotal} missing track(s) in library`;
      } else {
        pe.hidden = true;
        pe.classList.add('hidden');
        pe.textContent = '';
      }
    }
    const ple = $('playlist-empty');
    if (ple) ple.style.display = state.playlists.length ? 'none' : 'block';
  }

  if (src === 'radio') renderRadioLists();
  renderQueue();
  syncPlaylistSelect();

  const prev = $('btn-prev');
  const next = $('btn-next');
  const canNav = state.queue.length > 0 && !activeStationId;
  if (prev) prev.disabled = !canNav;
  if (next) next.disabled = !canNav;
}

function findStation(id) {
  return [...radioCache.local, ...radioCache.national].find((s) => s.id === id) || null;
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

  $('btn-prev')?.addEventListener('click', () => queueNeighbor(-1));
  $('btn-next')?.addEventListener('click', () => queueNeighbor(1));

  $('btn-focus-mode')?.addEventListener('click', async () => {
    const current = document.documentElement.dataset.windowMode || WINDOW_MODE.standard;
    const next = current === WINDOW_MODE.focused ? WINDOW_MODE.standard : WINDOW_MODE.focused;
    await applyWindowMode(next, {
      persist: (mode) => { state = updateSettings({ windowMode: mode }); },
    });
  });

  $('tab-library')?.addEventListener('click', () => setMediaSource('library'));
  $('tab-radio')?.addEventListener('click', () => setMediaSource('radio'));

  $('btn-radio-refresh')?.addEventListener('click', () => { void loadRadio(true); });
  $('radio-region')?.addEventListener('change', () => {
    const region = $('radio-region')?.value || '';
    state = updateSettings({ radioRegion: region });
    void loadRadio(true);
  });

  $('btn-connections')?.addEventListener('click', () => setConnectionsOpen(!connectionsOpen));
  $('btn-connections-close')?.addEventListener('click', () => setConnectionsOpen(false));
}

document.addEventListener('click', async (e) => {
  const connBtn = e.target.closest('[data-conn]');
  if (connBtn) {
    const action = connBtn.dataset.conn;
    if (action === 'audius-trending') {
      await fillAudiusTrackList('');
    } else if (action === 'audius-search') {
      await fillAudiusTrackList($('audius-search')?.value || '');
        } else if (action === 'archive-cat') {
      archiveCategory = connBtn.dataset.cat || 'music';
      await fillArchiveItemList('');
      document.querySelectorAll('[data-conn="archive-cat"]').forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.cat === archiveCategory);
      });
    } else if (action === 'archive-browse') {
      await fillArchiveItemList('');
    } else if (action === 'archive-search') {
      await fillArchiveItemList($('archive-search')?.value || '');
    } else if (action === 'podcast-featured') {
      await fillPodcastShowList('');
    } else if (action === 'podcast-search') {
      await fillPodcastShowList($('podcast-search')?.value || '');
    } else if (action === 'spotify-guest') {
      await getConnection('spotify')?.connectGuest();
      state = load();
      setConnStatusMsg('Browsing Spotify as guest.');
      await renderConnections();
    } else if (action === 'spotify-login') {
      void startSpotifyLoginFlow();
    } else if (action === 'spotify-finish') {
      const code = $('spotify-code')?.value || '';
      const res = await completeSpotifyLogin(code);
      setConnStatusMsg(res.message, !res.ok);
      state = load();
      await renderConnections();
    } else if (action === 'spotify-disconnect') {
      await getConnection('spotify')?.disconnect();
      await disconnectSpotifyPlayer();
      state = load();
      setConnStatusMsg('Disconnected from Spotify.');
      await renderConnections();
    } else if (action === 'spotify-copy-uri') {
      const uri = getSpotifyRedirectUri();
      try {
        await navigator.clipboard.writeText(uri);
        setConnStatusMsg('Redirect URI copied.');
      } catch {
        setConnStatusMsg(uri);
      }
    } else if (action === 'spotify-dashboard') {
      await openExternal(SPOTIFY_DASHBOARD_URL);
    } else if (action === 'spotify-open-link') {
      const parsed = parseSpotifyLink($('spotify-link')?.value || '');
      if (!parsed) {
        setConnStatusMsg('Paste a valid Spotify playlist, album, or track link.', true);
        return;
      }
      activeStationId = null;
      const ok = await playSpotifyFullOrOpen(parsed.externalUrl);
      if (!ok) {
        const np = $('now-playing');
        if (np) np.textContent = `Spotify · ${parsed.type} (opened for full playback)`;
        setConnStatusMsg('Opened in Spotify for full-length playback.');
      }
      setConnectionsOpen(false);
    } else if (action === 'spotify-preview-link') {
      const parsed = parseSpotifyLink($('spotify-link')?.value || '');
      if (!parsed?.embedUrl) {
        setConnStatusMsg('Paste a valid Spotify link for preview.', true);
        return;
      }
      activeStationId = null;
      setLiveBadge(false);
      if (player) { player.pause(); player.removeAttribute('src'); }
      showSpotifyEmbed(parsed.embedUrl);
      const np = $('now-playing');
      if (np) np.textContent = `Spotify preview · ${parsed.type}`;
      setConnStatusMsg('Embed preview (~30s unless Spotify Premium is logged into the player).');
      setConnectionsOpen(false);
    }
    return;
  }

  const btn = e.target.closest('button[data-a]');
  if (!btn) return;
  const a = btn.dataset.a;
  const id = btn.dataset.id;
  if (a === 'play') {
    playById(id);
  } else if (a === 'listen') {
    const st = findStation(btn.dataset.sid);
    if (st) void listenStation(st);
  } else if (a === 'audius-play') {
    const track = getCachedAudiusTrack(btn.dataset.id);
    if (track) {
      void playAudiusTrack(track);
    }
  } else if (a === 'audius-open') {
    void openExternal(btn.dataset.url);
  } else if (a === 'archive-play') {
    void playArchiveItem(btn.dataset.id);
  } else if (a === 'archive-file') {
    void playArchiveItem(btn.dataset.id, btn.dataset.file || '');
  } else if (a === 'archive-open') {
    void openExternal(btn.dataset.url);
  } else if (a === 'podcast-episodes') {
    void fillPodcastEpisodeList(btn.dataset.id);
  } else if (a === 'podcast-play') {
    const ep = getCachedPodcastEpisode(btn.dataset.id);
    if (ep) void playPodcastEpisode(ep);
  } else if (a === 'podcast-open') {
    void openExternal(btn.dataset.url);
  } else if (a === 'sp-full') {
    activeStationId = null;
    void playSpotifyFullOrOpen(btn.dataset.url).then((ok) => {
      if (!ok) {
        const np = $('now-playing');
        if (np) np.textContent = 'Spotify · opened for full playback';
      }
      setConnectionsOpen(false);
    });
  } else if (a === 'sp-embed') {
    activeStationId = null;
    setLiveBadge(false);
    if (player) { player.pause(); player.removeAttribute('src'); }
    showSpotifyEmbed(btn.dataset.url);
    const np = $('now-playing');
    if (np) np.textContent = 'Spotify preview (~30s)';
    setConnectionsOpen(false);
  } else if (a === 'sp-open') {
    void openExternal(btn.dataset.url);
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
  fillRadioRegionSelect();
  setMediaSource(currentSource());
  await applyWindowMode(getSavedWindowMode(state.settings), {
    persist: (mode) => { state = updateSettings({ windowMode: mode }); },
  });
  // Align native mins with layout that keeps library controls usable
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const { LogicalSize } = await import('@tauri-apps/api/dpi');
    if (document.documentElement.dataset.windowMode !== WINDOW_MODE.focused) {
      await getCurrentWindow().setMinSize(new LogicalSize(900, 560));
    }
  } catch { /* browser */ }
  if (player && !player.dataset.stageVisualBound) {
    player.dataset.stageVisualBound = '1';
    player.addEventListener('loadedmetadata', () => {
      if (Number(player.videoWidth) > 0 && Number(player.videoHeight) > 0) {
        clearStageVisual();
      } else if (activePlayStyle && activePlayStyle !== 'spotify') {
        syncStageVisualFromPlayer(player, activePlayStyle, activeArtworkUrl);
      }
    });
  }

  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { void boot(); });
} else {
  void boot();
}
