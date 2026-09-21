/**
 * Apple Music — catalog browse via public iTunes Search (zero setup).
 * Play ~30s previews in Tuner, use Apple Music embeds, or open full tracks
 * in Apple Music. Full DRM streaming inside WebView2 is not reliable on Windows,
 * so Tuner mirrors Spotify’s guest pattern rather than MusicKit in-app playback.
 */
import { registerConnection } from './registry.js';
import { updateSettings, getState } from '../store.js';
import { itunesGetJson } from './podcasts.js';

const ITUNES_SEARCH = 'https://itunes.apple.com/search';

function connSettings() {
  return getState().settings?.connections?.appleMusic || {};
}

function saveAppleMusic(partial) {
  const d = getState();
  const connections = { ...(d.settings?.connections || {}) };
  connections.appleMusic = { ...(connections.appleMusic || {}), ...partial };
  return updateSettings({ connections });
}

/** @type {Map<string, object>} */
const trackCache = new Map();

export function getCachedAppleMusicTrack(id) {
  return trackCache.get(String(id)) || null;
}

function artwork(url, size = 600) {
  if (!url) return '';
  return String(url).replace(/\/\d+x\d+bb/, `/${size}x${size}bb`);
}

/** Build an embed.music.apple.com URL from iTunes / Music catalog ids. */
export function appleMusicEmbedUrl({ collectionId, trackId, country = 'us' } = {}) {
  const c = country || 'us';
  if (collectionId && trackId) {
    return `https://embed.music.apple.com/${c}/album/${collectionId}?i=${trackId}`;
  }
  if (collectionId) return `https://embed.music.apple.com/${c}/album/${collectionId}`;
  if (trackId) return `https://embed.music.apple.com/${c}/song/${trackId}`;
  return '';
}

export function mapAppleMusicSong(r) {
  const trackId = String(r.trackId || '');
  const collectionId = String(r.collectionId || '');
  const externalUrl = r.trackViewUrl || r.collectionViewUrl || '';
  const previewUrl = r.previewUrl || '';
  return {
    id: trackId || collectionId,
    name: r.trackName || r.collectionName || 'Untitled',
    subtitle: [r.artistName, r.collectionName].filter(Boolean).join(' · '),
    artists: r.artistName || '',
    image: artwork(r.artworkUrl100 || r.artworkUrl60 || ''),
    previewUrl,
    streamUrl: previewUrl,
    externalUrl,
    embedUrl: appleMusicEmbedUrl({ collectionId, trackId }),
    collectionId,
    duration: Math.round((Number(r.trackTimeMillis) || 0) / 1000),
  };
}

function cacheTracks(list) {
  for (const t of list) trackCache.set(String(t.id), t);
  return list;
}

export async function searchAppleMusicSongs(query, limit = 24) {
  const q = String(query || '').trim() || 'top songs';
  const params = new URLSearchParams({
    term: q,
    media: 'music',
    entity: 'song',
    country: 'us',
    limit: String(Math.min(Number(limit) || 24, 50)),
  });
  const json = await itunesGetJson(`${ITUNES_SEARCH}?${params}`);
  const songs = (json.results || [])
    .filter((r) => r && (r.wrapperType === 'track' || r.kind === 'song') && (r.previewUrl || r.trackViewUrl))
    .map(mapAppleMusicSong);
  return cacheTracks(songs);
}

export async function browseFeaturedAppleMusic(limit = 20) {
  return searchAppleMusicSongs('chart hits pop rock hip-hop', limit);
}

/** Optional MusicKit developer JWT for Apple Music catalog API search. */
export function getAppleMusicDeveloperToken() {
  return String(connSettings().developerToken || '').trim();
}

export function setAppleMusicDeveloperToken(token) {
  const cleaned = String(token || '').trim();
  saveAppleMusic({
    developerToken: cleaned || null,
    mode: cleaned ? 'guest' : (connSettings().mode || 'disconnected'),
  });
}

/**
 * Catalog search via Apple Music API when a developer token is present;
 * otherwise falls back to public iTunes Search.
 */
export async function searchAppleMusicCatalog(query, limit = 24) {
  const token = getAppleMusicDeveloperToken();
  const q = String(query || '').trim();
  if (!token || !q) return searchAppleMusicSongs(q, limit);

  try {
    const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
    const url = `https://api.music.apple.com/v1/catalog/us/search?types=songs&limit=${Math.min(limit, 25)}&term=${encodeURIComponent(q)}`;
    const res = await tauriFetch(url, {
      method: 'GET',
      connectTimeout: 20_000,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) throw new Error(`Apple Music API ${res.status}`);
    const json = await res.json();
    const data = json?.results?.songs?.data || [];
    const songs = data.map((item) => {
      const a = item.attributes || {};
      const trackId = String(item.id || '');
      const albumId = String(item.relationships?.albums?.data?.[0]?.id || '');
      const previewUrl = a.previews?.[0]?.url || '';
      return {
        id: trackId,
        name: a.name || 'Untitled',
        subtitle: [a.artistName, a.albumName].filter(Boolean).join(' · '),
        artists: a.artistName || '',
        image: a.artwork?.url
          ? String(a.artwork.url).replace('{w}', '600').replace('{h}', '600')
          : '',
        previewUrl,
        streamUrl: previewUrl,
        externalUrl: a.url || '',
        embedUrl: appleMusicEmbedUrl({ collectionId: albumId || undefined, trackId }),
        collectionId: albumId,
        duration: Math.round((Number(a.durationInMillis) || 0) / 1000),
      };
    }).filter((t) => t.id);
    if (songs.length) return cacheTracks(songs);
  } catch {
    /* fall through to iTunes Search */
  }
  return searchAppleMusicSongs(q, limit);
}

export const appleMusicProvider = registerConnection({
  id: 'appleMusic',
  name: 'Apple Music',
  description: 'Search the Apple Music catalog — previews in Tuner, full tracks via embed or Apple Music. No account required to browse.',

  getStatus() {
    const s = connSettings();
    if (s.mode === 'guest' || getAppleMusicDeveloperToken()) return 'guest';
    return 'disconnected';
  },

  async connectGuest() {
    saveAppleMusic({ mode: 'guest', displayName: 'Guest' });
    return {
      ok: true,
      message: 'Apple Music ready — search songs, play previews, or open full tracks in Apple Music.',
    };
  },

  async connectUser() {
    return {
      ok: false,
      message: 'Optional: paste a MusicKit developer token for catalog API search. Full DRM streaming uses the Apple Music embed or app.',
    };
  },

  async disconnect() {
    saveAppleMusic({ mode: 'disconnected', displayName: null, developerToken: null });
  },

  async listPlaylists() {
    if (this.getStatus() === 'disconnected') await this.connectGuest();
    try {
      return await browseFeaturedAppleMusic(16);
    } catch (e) {
      return [{
        id: 'apple-music-error',
        name: 'Could not load Apple Music',
        subtitle: e?.message || String(e),
        externalUrl: 'https://music.apple.com',
      }];
    }
  },
});
