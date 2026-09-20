/**
 * Full-length Spotify playback via Web Playback SDK (Premium + signed-in only).
 * Embeds / preview_url are intentionally 30s — Spotify does not allow full streams that way.
 */
import { getSpotifyAccessToken, getSpotifyAccountProduct } from './spotify.js';

const SDK_SRC = 'https://sdk.scdn.co/spotify-player.js';
const API = 'https://api.spotify.com/v1';

let sdkLoading = null;
let player = null;
let deviceId = null;
let readyPromise = null;

function loadSdk() {
  if (window.Spotify?.Player) return Promise.resolve();
  if (sdkLoading) return sdkLoading;
  sdkLoading = new Promise((resolve, reject) => {
    const prev = window.onSpotifyWebPlaybackSDKReady;
    window.onSpotifyWebPlaybackSDKReady = () => {
      try { prev?.(); } catch { /* ignore */ }
      resolve();
    };
    const s = document.createElement('script');
    s.src = SDK_SRC;
    s.async = true;
    s.onerror = () => reject(new Error('Could not load Spotify Web Playback SDK.'));
    document.head.appendChild(s);
  });
  return sdkLoading;
}

async function ensurePlayer() {
  await loadSdk();
  if (player && deviceId) return { player, deviceId };

  readyPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Spotify player timed out.')), 20000);
    player = new window.Spotify.Player({
      name: 'Tuner',
      getOAuthToken: async (cb) => {
        try {
          const token = await getSpotifyAccessToken();
          cb(token || '');
        } catch {
          cb('');
        }
      },
      volume: 0.85,
    });

    player.addListener('ready', ({ device_id }) => {
      deviceId = device_id;
      clearTimeout(timeout);
      resolve({ player, deviceId });
    });
    player.addListener('not_ready', () => {
      deviceId = null;
    });
    player.addListener('initialization_error', ({ message }) => {
      clearTimeout(timeout);
      reject(new Error(message || 'Spotify player init failed'));
    });
    player.addListener('authentication_error', ({ message }) => {
      clearTimeout(timeout);
      reject(new Error(message || 'Spotify auth failed — Disconnect and Connect again (needs streaming scopes).'));
    });
    player.addListener('account_error', ({ message }) => {
      clearTimeout(timeout);
      reject(new Error(message || 'Spotify Premium is required for full-length playback in Tuner.'));
    });

    player.connect();
  });

  return readyPromise;
}

async function apiPlay(body) {
  const token = await getSpotifyAccessToken();
  if (!token) throw new Error('Sign in to Spotify first.');
  const { deviceId: id } = await ensurePlayer();
  // Transfer + play on Tuner device
  const res = await fetch(`${API}/me/player/play?device_id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (res.status === 204 || res.ok) return true;
  if (res.status === 404) {
    // No active device yet — transfer then retry
    await fetch(`${API}/me/player`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ device_ids: [id], play: false }),
    });
    const retry = await fetch(`${API}/me/player/play?device_id=${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (retry.status === 204 || retry.ok) return true;
    const t = await retry.text();
    throw new Error(t.slice(0, 180) || `Spotify play failed (${retry.status})`);
  }
  const text = await res.text();
  throw new Error(text.slice(0, 180) || `Spotify play failed (${res.status})`);
}

/**
 * Play a Spotify context or track at full length (Premium).
 * @param {{ contextUri?: string, uris?: string[] }} opts
 */
export async function playSpotifyFull(opts = {}) {
  const product = await getSpotifyAccountProduct();
  if (product && product !== 'premium') {
    throw new Error('Full-length Spotify playback in Tuner requires Spotify Premium. Use “Play full in Spotify”, or upgrade.');
  }
  if (opts.contextUri) {
    await apiPlay({ context_uri: opts.contextUri });
    return { ok: true, mode: 'full' };
  }
  if (opts.uris?.length) {
    await apiPlay({ uris: opts.uris });
    return { ok: true, mode: 'full' };
  }
  throw new Error('Nothing to play.');
}

export function spotifyUriFromOpenUrl(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex((p) => ['playlist', 'album', 'track', 'artist'].includes(p));
    if (idx >= 0 && parts[idx + 1]) {
      return `spotify:${parts[idx]}:${parts[idx + 1].split('?')[0]}`;
    }
  } catch { /* ignore */ }
  return null;
}

export async function disconnectSpotifyPlayer() {
  try { await player?.disconnect(); } catch { /* ignore */ }
  player = null;
  deviceId = null;
  readyPromise = null;
}
