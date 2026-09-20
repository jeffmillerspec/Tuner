/**
 * Audius — free full-length music, zero user setup.
 * Read-only trending/search/stream via public API (no login, no developer app).
 */
import { registerConnection } from './registry.js';
import { updateSettings, getState } from '../store.js';

const APP_NAME = 'Tuner';
const API = 'https://api.audius.co/v1';

function connSettings() {
  return getState().settings?.connections?.audius || {};
}

function saveAudius(partial) {
  const d = getState();
  const connections = { ...(d.settings?.connections || {}) };
  connections.audius = { ...(connections.audius || {}), ...partial };
  return updateSettings({ connections });
}

async function apiGet(path) {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${API}${path}${sep}app_name=${encodeURIComponent(APP_NAME)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Audius API ${res.status}`);
  return res.json();
}

export function audiusStreamUrl(trackId) {
  return `${API}/tracks/${encodeURIComponent(trackId)}/stream?app_name=${encodeURIComponent(APP_NAME)}`;
}

export function mapAudiusTrack(t) {
  const id = String(t.id);
  const artist = t.user?.name || t.user?.handle || 'Unknown artist';
  return {
    id,
    name: t.title || 'Untitled',
    subtitle: `${artist}${t.genre ? ` · ${t.genre}` : ''}`,
    artists: artist,
    image: t.artwork?.['150x150'] || t.artwork?.['480x480'] || '',
    externalUrl: t.permalink
      ? (String(t.permalink).startsWith('http') ? t.permalink : `https://audius.co${t.permalink}`)
      : `https://audius.co`,
    streamUrl: audiusStreamUrl(id),
    duration: Number(t.duration) || 0,
  };
}

export async function fetchAudiusTrending(limit = 30) {
  const json = await apiGet(`/tracks/trending?limit=${limit}&time=week`);
  return cacheTracks((json.data || [])
    .filter((t) => t && t.id && !t.is_stream_gated)
    .map(mapAudiusTrack));
}

export async function searchAudiusTracks(query, limit = 24) {
  const q = String(query || '').trim();
  if (!q) return fetchAudiusTrending(limit);
  const json = await apiGet(`/tracks/search?query=${encodeURIComponent(q)}&limit=${limit}`);
  return cacheTracks((json.data || [])
    .filter((t) => t && t.id && !t.is_stream_gated)
    .map(mapAudiusTrack));
}

let trackCache = new Map();

export function getCachedAudiusTrack(id) {
  return trackCache.get(String(id)) || null;
}

function cacheTracks(list) {
  for (const t of list) trackCache.set(String(t.id), t);
  return list;
}

export const audiusProvider = registerConnection({
  id: 'audius',
  name: 'Audius',
  description: 'Free full-length tracks — no account or developer setup required.',

  getStatus() {
    const s = connSettings();
    if (s.mode === 'guest') return 'guest';
    return 'disconnected';
  },

  async connectGuest() {
    saveAudius({ mode: 'guest', displayName: 'Guest' });
    return { ok: true, message: 'Audius ready — browse trending and play full tracks.' };
  },

  async connectUser() {
    return {
      ok: false,
      message: 'Audius in Tuner is free browse/play — no login needed. Use Browse Audius.',
    };
  },

  async disconnect() {
    saveAudius({ mode: 'disconnected', displayName: null });
  },

  /** Surface trending tracks as “playlists” rows for the Connections panel. */
  async listPlaylists() {
    if (this.getStatus() === 'disconnected') await this.connectGuest();
    try {
      const tracks = await fetchAudiusTrending(28);
      return tracks.map((t) => ({
        id: t.id,
        name: t.name,
        subtitle: t.subtitle,
        image: t.image,
        externalUrl: t.externalUrl,
        streamUrl: t.streamUrl,
        embedUrl: '',
      }));
    } catch (e) {
      return [{
        id: 'audius-error',
        name: 'Could not load Audius',
        subtitle: e?.message || String(e),
        externalUrl: 'https://audius.co',
      }];
    }
  },
});
