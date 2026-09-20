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
  podcastsProvider,
  searchPodcastShows,
  fetchPodcastEpisodes,
  browseFeaturedPodcasts,
} = await import('../../src/connections/podcasts.js');
const { getConnection } = await import('../../src/connections/registry.js');

describe('podcasts connection', () => {
  before(() => { localStorage.clear(); });

  it('registers in the connection registry', () => {
    assert.equal(podcastsProvider.id, 'podcasts');
    assert.equal(getConnection('podcasts')?.id, 'podcasts');
  });

  it('connectGuest needs no setup', async () => {
    const res = await podcastsProvider.connectGuest();
    assert.equal(res.ok, true);
    assert.equal(podcastsProvider.getStatus(), 'guest');
  });

  it('searchPodcastShows returns shows with feed metadata', async () => {
    const shows = await searchPodcastShows('science', 5);
    assert.ok(Array.isArray(shows));
    assert.ok(shows.length >= 1);
    assert.ok(shows[0].id && shows[0].name);
  });

  it('fetchPodcastEpisodes returns playable episode urls', async () => {
    const shows = await browseFeaturedPodcasts(3);
    assert.ok(shows.length >= 1);
    const episodes = await fetchPodcastEpisodes(shows[0].id, 5);
    assert.ok(Array.isArray(episodes));
    assert.ok(episodes.length >= 1);
    assert.ok(episodes[0].streamUrl && episodes[0].name);
  });
});
