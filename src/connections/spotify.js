import { updateSettings, getState } from '../store.js';
import { registerConnection } from './registry.js';

const SPOTIFY_AUTH = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API = 'https://api.spotify.com/v1';
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read',
  // Full-length in-app playback (Premium required by Spotify)
  'streaming',
  'user-read-playback-state',
  'user-modify-playback-state',
].join(' ');

const DEV_MODE_403_HINT =
  'Spotify returned 403 (forbidden). For Development Mode apps: (1) Dashboard → your app → User Management → add your Spotify account email, (2) app owner needs active Spotify Premium, (3) Disconnect in Tuner and Connect again so a new token is issued.';

/** Curated public playlists for guest browsing (no Spotify Developer app required). */
export const GUEST_PLAYLISTS = [
  {
    id: '37i9dQZF1DXcBWIGoYBM5M',
    name: "Today's Top Hits",
    subtitle: 'Spotify · Guest',
    image: '',
    externalUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M',
  },
  {
    id: '37i9dQZF1DX0XUsuxWHRQd',
    name: 'RapCaviar',
    subtitle: 'Spotify · Guest',
    image: '',
    externalUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX0XUsuxWHRQd',
  },
  {
    id: '37i9dQZF1DX4JAvHpjipBk',
    name: 'New Music Friday',
    subtitle: 'Spotify · Guest',
    image: '',
    externalUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX4JAvHpjipBk',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX4JAvHpjipBk',
  },
  {
    id: '37i9dQZF1DX1lVhptIYRda',
    name: 'Hot Country',
    subtitle: 'Spotify · Guest',
    image: '',
    externalUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX1lVhptIYRda',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX1lVhptIYRda',
  },
  {
    id: '37i9dQZF1DX4sWSpwq3LiO',
    name: 'Peaceful Piano',
    subtitle: 'Spotify · Guest',
    image: '',
    externalUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LiO',
  },
  {
    id: '37i9dQZF1DXdPec7aLTmlC',
    name: 'Happy Hits',
    subtitle: 'Spotify · Guest',
    image: '',
    externalUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXdPec7aLTmlC',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXdPec7aLTmlC',
  },
  {
    id: '37i9dQZF1DX4Wsb9d7sYcN',
    name: 'All Out 2010s',
    subtitle: 'Spotify · Guest',
    image: '',
    externalUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX4Wsb9d7sYcN',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX4Wsb9d7sYcN',
  },
  {
    id: '37i9dQZF1DX3rxVfibe1L0',
    name: 'Mood Booster',
    subtitle: 'Spotify · Guest',
    image: '',
    externalUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX3rxVfibe1L0',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX3rxVfibe1L0',
  },
];

const REDIRECT_URI = 'http://127.0.0.1:18423/callback';

function connSettings() {
  return getState().settings?.connections?.spotify || {};
}

function saveSpotify(partial) {
  const d = getState();
  const connections = { ...(d.settings?.connections || {}) };
  connections.spotify = { ...(connections.spotify || {}), ...partial };
  return updateSettings({ connections });
}

function bytesToBase64Url(bytes) {
  let s = '';
  bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256Base64Url(plain) {
  const data = new TextEncoder().encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return bytesToBase64Url(new Uint8Array(hash));
}

function randomVerifier() {
  const bytes = crypto.getRandomValues(new Uint8Array(64));
  return bytesToBase64Url(bytes);
}

async function api(path, token) {
  const res = await fetch(`${SPOTIFY_API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (res.status === 401) throw new Error('Spotify session expired — reconnect.');
  if (res.status === 403) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error?.message || body?.error_description || '';
    } catch { /* ignore */ }
    throw new Error(detail ? `${DEV_MODE_403_HINT} (${detail})` : DEV_MODE_403_HINT);
  }
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error?.message || '';
    } catch { /* ignore */ }
    throw new Error(detail ? `Spotify API ${res.status}: ${detail}` : `Spotify API ${res.status}`);
  }
  return res.json();
}

async function refreshIfNeeded() {
  const s = connSettings();
  if (!s.accessToken) return null;
  if (s.expiresAt && Date.now() < s.expiresAt - 60_000) return s.accessToken;
  if (!s.refreshToken || !s.clientId) return s.accessToken;
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: s.refreshToken,
    client_id: s.clientId,
  });
  const res = await fetch(SPOTIFY_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    saveSpotify({ accessToken: null, refreshToken: null, expiresAt: null, mode: 'guest' });
    throw new Error('Spotify refresh failed — sign in again.');
  }
  const data = await res.json();
  saveSpotify({
    accessToken: data.access_token,
    refreshToken: data.refresh_token || s.refreshToken,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    mode: 'user',
  });
  return data.access_token;
}

/** Public token getter for Web Playback SDK / Connect API. */
export async function getSpotifyAccessToken() {
  return refreshIfNeeded();
}

export async function getSpotifyAccountProduct() {
  const token = await refreshIfNeeded();
  if (!token) return null;
  const me = await api('/me', token);
  return me.product || null; // 'premium' | 'free' | ...
}

export const spotifyProvider = registerConnection({
  id: 'spotify',
  name: 'Spotify',
  description: 'Browse guest catalogs or sign in for your playlists.',

  getStatus() {
    const s = connSettings();
    if (s.mode === 'user' && s.accessToken) return 'user';
    if (s.mode === 'guest') return 'guest';
    return 'disconnected';
  },

  async connectGuest() {
    saveSpotify({ mode: 'guest', displayName: 'Guest' });
    return { ok: true, message: 'Browsing Spotify as guest (curated playlists + embeds).' };
  },

  /**
   * Start PKCE login. Returns authUrl for the UI to open in a browser.
   * After redirect, call completeUserLogin(redirectUrlOrCode).
   */
  async connectUser({ clientId } = {}) {
    const id = (clientId || connSettings().clientId || '').trim();
    if (!id) {
      return {
        ok: false,
        message: 'Add a Spotify Client ID (Developer Dashboard → app → Redirect URI http://127.0.0.1:18423/callback).',
      };
    }
    const verifier = randomVerifier();
    const challenge = await sha256Base64Url(verifier);
    const state = randomVerifier().slice(0, 16);
    saveSpotify({
      clientId: id,
      pkceVerifier: verifier,
      pkceState: state,
      mode: connSettings().mode || 'disconnected',
    });
    const params = new URLSearchParams({
      client_id: id,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      state,
      code_challenge_method: 'S256',
      code_challenge: challenge,
    });
    return {
      ok: true,
      authUrl: `${SPOTIFY_AUTH}?${params}`,
      message: 'Open Spotify, authorize Tuner, then paste the redirect URL back here.',
    };
  },

  async disconnect() {
    saveSpotify({
      mode: 'disconnected',
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      displayName: null,
      pkceVerifier: null,
      pkceState: null,
    });
  },

  async listPlaylists() {
    const status = this.getStatus();
    if (status === 'guest' || status === 'disconnected') {
      if (status === 'disconnected') await this.connectGuest();
      return GUEST_PLAYLISTS;
    }
    const token = await refreshIfNeeded();
    try {
      const data = await api('/me/playlists?limit=50', token);
      return (data.items || []).map((p) => ({
        id: p.id,
        name: p.name,
        subtitle: `${p.tracks?.total ?? p.items?.total ?? 0} tracks · ${p.owner?.display_name || 'You'}`,
        image: p.images?.[0]?.url || '',
        externalUrl: p.external_urls?.spotify,
        embedUrl: `https://open.spotify.com/embed/playlist/${p.id}`,
      }));
    } catch (e) {
      const msg = e?.message || String(e);
      return [
        {
          id: 'spotify-error',
          name: 'Could not load your playlists',
          subtitle: msg,
          image: '',
          externalUrl: SPOTIFY_DASHBOARD_URL,
          embedUrl: '',
        },
        ...GUEST_PLAYLISTS,
      ];
    }
  },

  async listTracks(playlistId) {
    if (this.getStatus() !== 'user') return [];
    const token = await refreshIfNeeded();
    // Feb 2026 Dev Mode: /playlists/{id}/tracks was replaced by /playlists/{id}/items
    const data = await api(`/playlists/${encodeURIComponent(playlistId)}/items?limit=50`, token);
    return (data.items || [])
      .map((it) => it.track || it.item || it)
      .filter((t) => t && t.id)
      .map((t) => ({
        id: t.id,
        name: t.name,
        artists: (t.artists || []).map((a) => a.name).join(', '),
        previewUrl: t.preview_url || '',
        externalUrl: t.external_urls?.spotify,
      }));
  },
});

/** Finish PKCE after user pastes the full redirect URL or raw `code`. */
export async function completeSpotifyLogin(redirectOrCode) {
  const raw = String(redirectOrCode || '').trim();
  if (!raw) return { ok: false, message: 'Paste the redirect URL or authorization code.' };
  let code = raw;
  let state = '';
  try {
    if (raw.includes('://') || raw.startsWith('http')) {
      const u = new URL(raw);
      code = u.searchParams.get('code') || '';
      state = u.searchParams.get('state') || '';
      if (u.searchParams.get('error')) {
        return { ok: false, message: `Spotify error: ${u.searchParams.get('error')}` };
      }
    }
  } catch {
    /* treat as raw code */
  }
  const s = connSettings();
  if (s.pkceState && state && state !== s.pkceState) {
    return { ok: false, message: 'State mismatch — restart Spotify login.' };
  }
  if (!code || !s.pkceVerifier || !s.clientId) {
    return { ok: false, message: 'Missing code or PKCE session — click Connect again.' };
  }
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: s.clientId,
    code_verifier: s.pkceVerifier,
  });
  const res = await fetch(SPOTIFY_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const err = await res.text();
    return { ok: false, message: `Token exchange failed: ${err.slice(0, 160)}` };
  }
  const data = await res.json();
  let displayName = 'Spotify user';
  try {
    const me = await api('/me', data.access_token);
    displayName = me.display_name || me.id || displayName;
  } catch (e) {
    // Login can succeed while API calls 403 until the Spotify user is allowlisted.
    saveSpotify({
      mode: 'user',
      accessToken: data.access_token,
      refreshToken: data.refresh_token || null,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      displayName: 'Spotify user (limited)',
      pkceVerifier: null,
      pkceState: null,
    });
    return { ok: false, message: e?.message || DEV_MODE_403_HINT };
  }
  saveSpotify({
    mode: 'user',
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    displayName,
    pkceVerifier: null,
    pkceState: null,
  });
  return { ok: true, message: `Connected as ${displayName}` };
}

export function getSpotifyRedirectUri() {
  return REDIRECT_URI;
}

export function getSpotifyClientId() {
  return connSettings().clientId || '';
}

export function setSpotifyClientId(clientId) {
  saveSpotify({ clientId: String(clientId || '').trim() });
}

export function getSpotifyDisplayName() {
  return connSettings().displayName || null;
}

/** Parse open.spotify.com / spotify: URIs into an embeddable playlist/album/track. */
export function parseSpotifyLink(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  let type = null;
  let id = null;
  const uri = raw.match(/^spotify:(playlist|album|track|artist):([a-zA-Z0-9]+)$/);
  if (uri) {
    type = uri[1];
    id = uri[2];
  } else {
    try {
      const u = new URL(raw.includes('://') ? raw : `https://${raw}`);
      if (!/open\.spotify\.com$/i.test(u.hostname) && !/spotify\.com$/i.test(u.hostname)) {
        return null;
      }
      const parts = u.pathname.split('/').filter(Boolean);
      const idx = parts.findIndex((p) => ['playlist', 'album', 'track', 'artist'].includes(p));
      if (idx >= 0 && parts[idx + 1]) {
        type = parts[idx];
        id = parts[idx + 1].split('?')[0];
      }
    } catch {
      return null;
    }
  }
  if (!type || !id) return null;
  return {
    id,
    type,
    name: `Spotify ${type}`,
    subtitle: 'Opened from link',
    externalUrl: `https://open.spotify.com/${type}/${id}`,
    embedUrl: `https://open.spotify.com/embed/${type}/${id}`,
  };
}

export const SPOTIFY_DASHBOARD_URL = 'https://developer.spotify.com/dashboard';
export const OAUTH_PORT = 18423;
