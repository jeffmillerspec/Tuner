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
  audiusProvider,
  fetchAudiusTrending,
  audiusStreamUrl,
} = await import('../../src/connections/audius.js');
const { getConnection } = await import('../../src/connections/registry.js');

describe('audius connection', () => {
  before(() => { localStorage.clear(); });

  it('registers in the connection registry', () => {
    assert.equal(audiusProvider.id, 'audius');
    assert.equal(getConnection('audius')?.id, 'audius');
  });

  it('builds stream urls without credentials', () => {
    assert.match(audiusStreamUrl('abc123'), /api\.audius\.co\/v1\/tracks\/abc123\/stream/);
  });

  it('connectGuest needs no setup', async () => {
    const res = await audiusProvider.connectGuest();
    assert.equal(res.ok, true);
    assert.equal(audiusProvider.getStatus(), 'guest');
  });

  it('fetchAudiusTrending returns playable tracks', async () => {
    const tracks = await fetchAudiusTrending(5);
    assert.ok(Array.isArray(tracks));
    assert.ok(tracks.length >= 1);
    assert.ok(tracks[0].streamUrl && tracks[0].name);
  });
});
