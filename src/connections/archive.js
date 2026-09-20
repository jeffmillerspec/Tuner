/**
 * Internet Archive — free music, audiobooks, and films. Zero user setup.
 * Search + metadata via public Archive.org APIs (no API key).
 */
import { registerConnection } from './registry.js';
import { updateSettings, getState } from '../store.js';

const SEARCH = 'https://archive.org/advancedsearch.php';
const META = 'https://archive.org/metadata';

/** @typedef {'music' | 'audiobooks' | 'films'} ArchiveCategory */

const CATEGORY_QUERY = {
  music: 'collection:(netlabels OR etree OR audio_music) AND mediatype:audio',
  audiobooks: 'collection:librivoxaudio AND mediatype:audio',
  films: 'collection:(opensource_movies OR prelinger OR feature_films) AND mediatype:movies',
};

function connSettings() {
  return getState().settings?.connections?.archive || {};
}

function saveArchive(partial) {
  const d = getState();
  const connections = { ...(d.settings?.connections || {}) };
  connections.archive = { ...(connections.archive || {}), ...partial };
  return updateSettings({ connections });
}

async function searchDocs(query, rows = 24) {
  const params = new URLSearchParams({
    q: query,
    rows: String(rows),
    page: '1',
    output: 'json',
  });
  ['identifier', 'title', 'creator', 'description', 'mediatype', 'year'].forEach((f) => {
    params.append('fl[]', f);
  });
  params.append('sort[]', 'downloads desc');
  const res = await fetch(`${SEARCH}?${params}`);
  if (!res.ok) throw new Error(`Archive search ${res.status}`);
  const json = await res.json();
  return json?.response?.docs || [];
}

function mapDoc(doc, category = '') {
  const id = String(doc.identifier || '');
  const creator = Array.isArray(doc.creator) ? doc.creator[0] : (doc.creator || '');
  const year = doc.year ? String(doc.year) : '';
  const kind = category || (doc.mediatype === 'movies' ? 'films' : 'audio');
  return {
    id,
    name: doc.title || id || 'Untitled',
    subtitle: [creator, year, kind].filter(Boolean).join(' · '),
    artists: creator,
    image: id ? `https://archive.org/services/img/${encodeURIComponent(id)}` : '',
    externalUrl: id ? `https://archive.org/details/${encodeURIComponent(id)}` : 'https://archive.org',
    mediatype: doc.mediatype || '',
    category: kind,
  };
}

/** @type {Map<string, object>} */
const docCache = new Map();
/** @type {Map<string, object>} */
const itemCache = new Map();

export function getCachedArchiveDoc(id) {
  return docCache.get(String(id)) || null;
}

export function getCachedArchiveItem(id) {
  return itemCache.get(String(id)) || null;
}

function cacheDocs(list) {
  for (const d of list) docCache.set(String(d.id), d);
  return list;
}

/** Pick a streamable file from Archive metadata files list. */
export function pickArchiveStreamFile(files = [], { preferVideo = false } = {}) {
  const list = Array.isArray(files) ? files : [];
  const score = (f) => {
    const name = String(f.name || '').toLowerCase();
    const format = String(f.format || '').toLowerCase();
    const size = Number(f.size) || 0;
    if (!name || name.endsWith('.xml') || name.endsWith('.sqlite') || name.includes('__ia_thumb')) return -1;
    if (preferVideo) {
      if (/\.(mp4|webm|ogv)$/i.test(name) || /h\.?264|mpeg4|webm|ogg video/i.test(format)) {
        if (size > 0 && size < 80_000_000) return 90;
        if (/\.mp4$/i.test(name)) return 80;
        return 60;
      }
      return -1;
    }
    if (/\.(mp3|m4a|ogg|oga)$/i.test(name) || /mp3|vbr mp3|aac|ogg vorbis/i.test(format)) {
      if (/64kb|64 kb/.test(name) || /64kbps/i.test(format)) return 95;
      if (/128kb|128 kb/.test(name) || /128kbps/i.test(format)) return 90;
      if (/\.mp3$/i.test(name) || /vbr mp3|mp3/i.test(format)) return 80;
      if (/\.m4a$/i.test(name)) return 70;
      return 50;
    }
    return -1;
  };

  let best = null;
  let bestScore = -1;
  for (const f of list) {
    const s = score(f);
    if (s > bestScore) {
      bestScore = s;
      best = f;
    }
  }
  return bestScore >= 0 ? best : null;
}

/** List distinct audio chapter/track files for multi-file items. */
export function listArchiveAudioFiles(files = []) {
  const seen = new Set();
  const out = [];
  for (const f of files || []) {
    const name = String(f.name || '');
    const format = String(f.format || '');
    if (!/\.(mp3|m4a|ogg|oga)$/i.test(name) && !/mp3|vbr mp3|aac|ogg vorbis/i.test(format)) continue;
    if (/_64kb\.|_128kb\.|_64kbps|_128kbps/i.test(name)) {
      const base = name.replace(/_64kb\.mp3$/i, '.mp3').replace(/_128kb\.mp3$/i, '.mp3');
      if (seen.has(base.toLowerCase())) continue;
    }
    const stem = name.replace(/_?\d+kb\.mp3$/i, '.mp3').toLowerCase();
    if (seen.has(stem)) continue;
    seen.add(stem);
    out.push(f);
  }
  return out.sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { numeric: true }));
}

export function archiveDownloadUrl(identifier, filename) {
  return `https://archive.org/download/${encodeURIComponent(identifier)}/${String(filename).split('/').map(encodeURIComponent).join('/')}`;
}

export async function fetchArchiveMetadata(identifier) {
  const id = String(identifier || '');
  if (!id) throw new Error('Missing Archive identifier');
  if (itemCache.has(id) && itemCache.get(id)._full) return itemCache.get(id);
  const res = await fetch(`${META}/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Archive metadata ${res.status}`);
  const json = await res.json();
  const files = json.files || [];
  const meta = json.metadata || {};
  const preferVideo = String(meta.mediatype || '') === 'movies';
  const primary = pickArchiveStreamFile(files, { preferVideo });
  const audioFiles = listArchiveAudioFiles(files);
  const item = {
    id,
    _full: true,
    name: meta.title || id,
    title: meta.title || id,
    artists: Array.isArray(meta.creator) ? meta.creator[0] : (meta.creator || ''),
    creator: Array.isArray(meta.creator) ? meta.creator[0] : (meta.creator || ''),
    mediatype: meta.mediatype || '',
    image: `https://archive.org/services/img/${encodeURIComponent(id)}`,
    externalUrl: `https://archive.org/details/${encodeURIComponent(id)}`,
    files,
    audioFiles,
    streamUrl: primary ? archiveDownloadUrl(id, primary.name) : '',
    streamName: primary?.name || '',
    hasVideo: preferVideo && Boolean(primary),
  };
  itemCache.set(id, item);
  return item;
}

export async function browseArchive(category = 'music', limit = 24) {
  const q = CATEGORY_QUERY[category] || CATEGORY_QUERY.music;
  const docs = await searchDocs(q, limit);
  return cacheDocs(docs.map((d) => mapDoc(d, category)));
}

export async function searchArchive(query, category = '', limit = 24) {
  const q = String(query || '').trim();
  if (!q) return browseArchive(category || 'music', limit);
  let lucene = `(${q})`;
  if (category === 'music') {
    lucene += ' AND mediatype:audio AND collection:(netlabels OR etree OR audio_music OR opensource_audio)';
  } else if (category === 'audiobooks') {
    lucene += ' AND (collection:librivoxaudio OR subject:audiobook OR subject:"audio books")';
  } else if (category === 'films') {
    lucene += ' AND mediatype:movies';
  } else {
    lucene += ' AND (mediatype:audio OR mediatype:movies)';
  }
  const docs = await searchDocs(lucene, limit);
  return cacheDocs(docs.map((d) => mapDoc(d, category || (d.mediatype === 'movies' ? 'films' : 'audio'))));
}

export const archiveProvider = registerConnection({
  id: 'archive',
  name: 'Internet Archive',
  description: 'Free music, LibriVox audiobooks, and public-domain films — no account required.',

  getStatus() {
    const s = connSettings();
    if (s.mode === 'guest') return 'guest';
    return 'disconnected';
  },

  async connectGuest() {
    saveArchive({ mode: 'guest', displayName: 'Guest' });
    return { ok: true, message: 'Internet Archive ready — browse music, audiobooks, and films.' };
  },

  async connectUser() {
    return {
      ok: false,
      message: 'Internet Archive in Tuner is free browse/play — no login needed.',
    };
  },

  async disconnect() {
    saveArchive({ mode: 'disconnected', displayName: null });
  },

  async listPlaylists() {
    if (this.getStatus() === 'disconnected') await this.connectGuest();
    try {
      return await browseArchive('music', 20);
    } catch (e) {
      return [{
        id: 'archive-error',
        name: 'Could not load Archive.org',
        subtitle: e?.message || String(e),
        externalUrl: 'https://archive.org',
      }];
    }
  },
});
