import assert from 'node:assert/strict';
import { describe, it, before } from 'node:test';

// store.js / spotify provider persist via localStorage
if (!globalThis.localStorage) {
  const mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
    removeItem: (k) => { mem.delete(k); },
    clear: () => { mem.clear(); },
  };
}

const {
  parseSpotifyLink,
  GUEST_PLAYLISTS,
  spotifyProvider,
} = await import('../../src/connections/spotify.js');
const { listConnections, getConnection } = await import('../../src/connections/registry.js');

describe('spotify link parsing', () => {
  it('parses open.spotify.com playlist urls', () => {
    const p = parseSpotifyLink('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
    assert.equal(p.type, 'playlist');
    assert.equal(p.id, '37i9dQZF1DXcBWIGoYBM5M');
    assert.match(p.embedUrl, /embed\/playlist/);
  });

  it('parses spotify: URIs', () => {
    const p = parseSpotifyLink('spotify:album:1ATL5GLyefJaxhQzSPVdXF');
    assert.equal(p.type, 'album');
    assert.equal(p.id, '1ATL5GLyefJaxhQzSPVdXF');
  });

  it('rejects non-spotify input', () => {
    assert.equal(parseSpotifyLink('https://example.com/x'), null);
    assert.equal(parseSpotifyLink(''), null);
  });
});

describe('spotify guest catalog', () => {
  before(() => {
    localStorage.clear();
  });

  it('registers spotify in the connection registry', () => {
    assert.equal(spotifyProvider.id, 'spotify');
    assert.equal(getConnection('spotify')?.id, 'spotify');
    assert.ok(listConnections().some((p) => p.id === 'spotify'));
  });

  it('guest playlists are embeddable without credentials', () => {
    assert.ok(GUEST_PLAYLISTS.length >= 4);
    for (const p of GUEST_PLAYLISTS) {
      assert.ok(p.embedUrl.includes('open.spotify.com/embed/'));
      assert.ok(p.externalUrl.includes('open.spotify.com/'));
    }
  });

  it('connectGuest exposes curated playlists', async () => {
    localStorage.clear();
    const res = await spotifyProvider.connectGuest();
    assert.equal(res.ok, true);
    assert.equal(spotifyProvider.getStatus(), 'guest');
    const playlists = await spotifyProvider.listPlaylists();
    assert.ok(playlists.length >= 4);
  });
});
