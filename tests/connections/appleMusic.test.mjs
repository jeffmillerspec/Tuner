import assert from 'node:assert/strict';
import { describe, it, before } from 'node:test';

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
  appleMusicProvider,
  searchAppleMusicSongs,
  browseFeaturedAppleMusic,
  searchAppleMusicCatalog,
  appleMusicEmbedUrl,
  mapAppleMusicSong,
} = await import('../../src/connections/appleMusic.js');
const { getConnection } = await import('../../src/connections/registry.js');

describe('appleMusic connection', () => {
  before(() => { localStorage.clear(); });

  it('registers in the connection registry', () => {
    assert.equal(appleMusicProvider.id, 'appleMusic');
    assert.equal(getConnection('appleMusic')?.id, 'appleMusic');
  });

  it('connectGuest needs no setup', async () => {
    const res = await appleMusicProvider.connectGuest();
    assert.equal(res.ok, true);
    assert.equal(appleMusicProvider.getStatus(), 'guest');
  });

  it('appleMusicEmbedUrl builds album and song embeds', () => {
    assert.equal(
      appleMusicEmbedUrl({ collectionId: '1441164426', trackId: '1441164522' }),
      'https://embed.music.apple.com/us/album/1441164426?i=1441164522',
    );
    assert.equal(
      appleMusicEmbedUrl({ trackId: '1441164522' }),
      'https://embed.music.apple.com/us/song/1441164522',
    );
  });

  it('mapAppleMusicSong maps iTunes song rows', () => {
    const t = mapAppleMusicSong({
      trackId: 1,
      collectionId: 2,
      trackName: 'Song',
      artistName: 'Artist',
      collectionName: 'Album',
      previewUrl: 'https://example.com/p.m4a',
      trackViewUrl: 'https://music.apple.com/us/album/x/2?i=1',
      artworkUrl100: 'https://is1-ssl.mzstatic.com/image/thumb/x/100x100bb.jpg',
      trackTimeMillis: 180000,
    });
    assert.equal(t.id, '1');
    assert.equal(t.name, 'Song');
    assert.ok(t.streamUrl);
    assert.ok(t.embedUrl.includes('album/2'));
  });

  it('searchAppleMusicSongs returns playable previews', async () => {
    const songs = await searchAppleMusicSongs('beatles', 3);
    assert.ok(Array.isArray(songs));
    assert.ok(songs.length >= 1);
    assert.ok(songs[0].id && songs[0].name);
    assert.ok(songs[0].streamUrl || songs[0].externalUrl);
  });

  it('browseFeaturedAppleMusic returns catalog picks', async () => {
    const songs = await browseFeaturedAppleMusic(5);
    assert.ok(songs.length >= 1);
  });

  it('searchAppleMusicCatalog falls back without token', async () => {
    const songs = await searchAppleMusicCatalog('radiohead', 2);
    assert.ok(songs.length >= 1);
  });
});
