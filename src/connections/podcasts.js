/**
 * Podcasts — discover via Apple iTunes Search API, play episode audio URLs.
 * Zero user setup (no API key, no account).
 *
 * Fetch order: Tauri HTTP → JSONP → browser fetch. iTunes serves text/javascript
 * with nosniff, which breaks WebView fetch; JSONP/Tauri avoid that.
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

/** Parse iTunes JSON that sometimes arrives as JSONP or text/javascript. */
export function parseItunesPayload(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('Empty podcast API response');
  if (raw[0] === '{' || raw[0] === '[') return JSON.parse(raw);
  const start = raw.indexOf('(');
  const end = raw.lastIndexOf(')');
  if (start >= 0 && end > start) return JSON.parse(raw.slice(start + 1, end));
  return JSON.parse(raw);
}

async function fetchTextViaTauri(url) {
  const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
  const res = await tauriFetch(url, {
    method: 'GET',
    connectTimeout: 20_000,
    headers: { Accept: 'application/json, text/javascript, application/xml, text/xml, */*' },
  });
  if (!res.ok) throw new Error(`Podcast API ${res.status}`);
  return res.text();
}

async function fetchViaTauriHttp(url) {
  return parseItunesPayload(await fetchTextViaTauri(url));
}

async function fetchViaBrowser(url) {
  // iTunes often returns Content-Type: text/javascript + nosniff. Chromium/WebView
  // may refuse to expose that body to fetch(); callers should prefer JSONP/Tauri.
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json, text/javascript, */*' },
  });
  if (!res.ok) throw new Error(`Podcast API ${res.status}`);
  return parseItunesPayload(await res.text());
}

/** JSONP — loads iTunes' text/javascript responses as scripts (MIME-safe in WebView). */
function fetchViaJsonp(url) {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('JSONP unavailable'));
  }
  return new Promise((resolve, reject) => {
    const cb = `__tunerItunes_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const script = document.createElement('script');
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Podcast search timed out'));
    }, 15_000);

    function cleanup() {
      clearTimeout(timer);
      try { delete globalThis[cb]; } catch { globalThis[cb] = undefined; }
      script.remove();
    }

    globalThis[cb] = (data) => {
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error('Podcast search failed to load'));
    };
    const sep = url.includes('?') ? '&' : '?';
    script.src = `${url}${sep}callback=${encodeURIComponent(cb)}`;
    document.head.appendChild(script);
  });
}

export async function itunesGetJson(url) {
  const errors = [];

  // 1) Tauri native HTTP — bypasses WebView MIME/CORS quirks (desktop app).
  try {
    return await fetchViaTauriHttp(url);
  } catch (e) {
    errors.push(e?.message || String(e));
  }

  // 2) JSONP — iTunes returns text/javascript; script tags accept that MIME.
  try {
    return await fetchViaJsonp(url);
  } catch (e) {
    errors.push(e?.message || String(e));
  }

  // 3) Browser fetch — works in Node and some browsers despite the MIME type.
  try {
    return await fetchViaBrowser(url);
  } catch (e) {
    errors.push(e?.message || String(e));
  }

  throw new Error(`Could not reach Apple Podcasts (${errors.filter(Boolean).join(' · ') || 'network error'})`);
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

function isEpisodeRow(r) {
  if (!r) return false;
  if (r.wrapperType === 'podcastEpisode') return true;
  if (r.kind === 'podcast-episode' || r.kind === 'podcastEpisode') return true;
  return Boolean(r.episodeUrl && r.trackName && r.wrapperType !== 'track');
}

/** Pull enclosure URLs from a podcast RSS/Atom feed (fallback when lookup is empty). */
export function parsePodcastFeedXml(xml, show = null) {
  const text = String(xml || '');
  const items = [];
  const itemRe = /<item[\s\S]*?<\/item>/gi;
  let match;
  let i = 0;
  while ((match = itemRe.exec(text)) && i < 40) {
    const block = match[0];
    const title = (
      block.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)?.[1]
      || block.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]
      || ''
    ).replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    const enclosure = block.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*>/i)?.[1]
      || block.match(/url=["']([^"']+\.(?:mp3|m4a|aac|ogg)[^"']*)["']/i)?.[1]
      || '';
    const guid = (block.match(/<guid[^>]*>([^<]+)<\/guid>/i)?.[1] || `${show?.id || 'feed'}-${i}`).trim();
    const date = block.match(/<pubDate[^>]*>([^<]*)<\/pubDate>/i)?.[1]?.trim() || '';
    if (enclosure) {
      items.push({
        id: guid,
        name: title || `Episode ${i + 1}`,
        subtitle: [show?.name, date ? date.slice(0, 16) : ''].filter(Boolean).join(' · '),
        artists: show?.artists || '',
        image: show?.image || '',
        streamUrl: enclosure,
        duration: 0,
        externalUrl: show?.externalUrl || '',
        collectionId: String(show?.id || ''),
      });
    }
    i += 1;
  }
  return items;
}

async function fetchEpisodesFromFeed(show, limit = 24) {
  if (!show?.feedUrl) return [];
  let xml = '';
  try {
    try {
      xml = await fetchTextViaTauri(show.feedUrl);
    } catch {
      const res = await fetch(show.feedUrl);
      if (!res.ok) return [];
      xml = await res.text();
    }
  } catch {
    return [];
  }
  return parsePodcastFeedXml(xml, show).slice(0, limit);
}

export async function searchPodcastShows(query, limit = 20) {
  const q = String(query || '').trim() || 'science news music history';
  const params = new URLSearchParams({
    term: q,
    media: 'podcast',
    entity: 'podcast',
    country: 'us',
    limit: String(limit),
  });
  const json = await itunesGetJson(`${ITUNES_SEARCH}?${params}`);
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
    country: 'us',
    limit: String(Math.min(Number(limit) || 24, 100)),
  });

  let show = showCache.get(id) || null;
  let episodes = [];

  try {
    const json = await itunesGetJson(`${ITUNES_LOOKUP}?${params}`);
    const rows = json.results || [];
    const showRow = rows.find((r) => r.wrapperType === 'track' && r.kind === 'podcast') || null;
    show = showCache.get(id) || (showRow ? mapShow(showRow) : show);
    if (show) showCache.set(id, show);

    episodes = rows
      .filter(isEpisodeRow)
      .map((r) => mapEpisode(r, show))
      .filter((e) => e.streamUrl);
  } catch {
    episodes = [];
  }

  if (!episodes.length && show?.feedUrl) {
    episodes = await fetchEpisodesFromFeed(show, limit);
  } else if (!episodes.length) {
    // Lookup may omit feedUrl when show wasn't cached — refresh show record once.
    try {
      const meta = await itunesGetJson(`${ITUNES_LOOKUP}?${new URLSearchParams({ id, country: 'us' })}`);
      const row = (meta.results || []).find((r) => r.collectionId || r.trackId);
      if (row) {
        show = mapShow(row);
        showCache.set(id, show);
        episodes = await fetchEpisodesFromFeed(show, limit);
      }
    } catch {
      /* keep empty */
    }
  }

  for (const ep of episodes) episodeCache.set(String(ep.id), ep);
  return episodes.slice(0, limit);
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
