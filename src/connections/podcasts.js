/**
 * Podcasts — discover via Apple iTunes Search API, play episode audio URLs.
 * Zero user setup (no API key, no account).
 */
import { registerConnection } from './registry.js';
import { updateSettings, getState } from '../store.js';

const ITUNES_SEARCH = 'https://itunes.apple.com/search';
const ITUNES_LOOKUP = 'https://itunes.apple.com/lookup';

function connSettings() {
  return getState().settings?.connections?.podcasts || {};
}

function savePodcasts(partial) {
  const d = getState();
  const connections = { ...(d.settings?.connections || {}) };
  connections.podcasts = { ...(connections.podcasts || {}), ...partial };
  return updateSettings({ connections });
}

/** @type {Map<string, object>} */
const showCache = new Map();
/** @type {Map<string, object>} */
const episodeCache = new Map();

export function getCachedPodcastShow(id) {
  return showCache.get(String(id)) || null;
}

export function getCachedPodcastEpisode(id) {
  return episodeCache.get(String(id)) || null;
}

function mapShow(r) {
  const id = String(r.collectionId || r.trackId || '');
  return {
    id,
    name: r.collectionName || r.trackName || 'Untitled podcast',
    subtitle: r.artistName || '',
    artists: r.artistName || '',
    image: r.artworkUrl600 || r.artworkUrl100 || '',
    feedUrl: r.feedUrl || '',
    externalUrl: r.collectionViewUrl || r.trackViewUrl || '',
    episodeCount: Number(r.trackCount) || 0,
  };
}

function mapEpisode(r, show = null) {
  const id = String(r.trackId || r.episodeGuid || `${r.collectionId}-${r.trackName}`);
  return {
    id,
    name: r.trackName || 'Untitled episode',
    subtitle: [show?.name || r.collectionName, r.releaseDate ? String(r.releaseDate).slice(0, 10) : '']
      .filter(Boolean)
      .join(' · '),
    artists: show?.artists || r.artistName || '',
    image: r.artworkUrl600 || r.artworkUrl60 || show?.image || '',
    streamUrl: r.episodeUrl || '',
    duration: Math.round((Number(r.trackTimeMillis) || 0) / 1000),
    externalUrl: r.trackViewUrl || show?.externalUrl || '',
    collectionId: String(r.collectionId || show?.id || ''),
  };
}

export async function searchPodcastShows(query, limit = 20) {
  const q = String(query || '').trim() || 'science news music history';
  const params = new URLSearchParams({
    term: q,
    media: 'podcast',
    entity: 'podcast',
    limit: String(limit),
  });
  const res = await fetch(`${ITUNES_SEARCH}?${params}`);
  if (!res.ok) throw new Error(`Podcast search ${res.status}`);
  const json = await res.json();
  const shows = (json.results || [])
    .filter((r) => r && (r.collectionId || r.trackId))
    .map(mapShow);
  for (const s of shows) showCache.set(String(s.id), s);
  return shows;
}

export async function fetchPodcastEpisodes(collectionId, limit = 24) {
  const id = String(collectionId || '');
  if (!id) return [];
  const params = new URLSearchParams({
    id,
    entity: 'podcastEpisode',
    limit: String(limit),
  });
  const res = await fetch(`${ITUNES_LOOKUP}?${params}`);
  if (!res.ok) throw new Error(`Podcast lookup ${res.status}`);
  const json = await res.json();
  const rows = json.results || [];
  const showRow = rows.find((r) => r.wrapperType === 'track' && r.kind === 'podcast') || null;
  const show = showCache.get(id) || (showRow ? mapShow(showRow) : null);
  if (show) showCache.set(id, show);

  const episodes = rows
    .filter((r) => r.wrapperType === 'podcastEpisode' && (r.episodeUrl || r.trackName))
    .map((r) => mapEpisode(r, show))
    .filter((e) => e.streamUrl);
  for (const ep of episodes) episodeCache.set(String(ep.id), ep);
  return episodes;
}

export async function browseFeaturedPodcasts(limit = 18) {
  return searchPodcastShows('interview documentary education science technology history', limit);
}

export const podcastsProvider = registerConnection({
  id: 'podcasts',
  name: 'Podcasts',
  description: 'Search free podcasts and play episodes — no account or API key required.',

  getStatus() {
    const s = connSettings();
    if (s.mode === 'guest') return 'guest';
    return 'disconnected';
  },

  async connectGuest() {
    savePodcasts({ mode: 'guest', displayName: 'Guest' });
    return { ok: true, message: 'Podcasts ready — search shows and play episodes.' };
  },

  async connectUser() {
    return {
      ok: false,
      message: 'Podcasts in Tuner need no login — search and play freely.',
    };
  },

  async disconnect() {
    savePodcasts({ mode: 'disconnected', displayName: null });
  },

  async listPlaylists() {
    if (this.getStatus() === 'disconnected') await this.connectGuest();
    try {
      return await browseFeaturedPodcasts(16);
    } catch (e) {
      return [{
        id: 'podcasts-error',
        name: 'Could not load podcasts',
        subtitle: e?.message || String(e),
        externalUrl: 'https://podcasts.apple.com',
      }];
    }
  },
});
