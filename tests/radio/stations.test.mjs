import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  FALLBACK_STATIONS,
  fetchTopLocal,
  fetchTopNational,
  US_STATES,
} from '../../src/radio/stations.js';

describe('radio stations', () => {
  it('exposes curated fallbacks with stream urls', () => {
    assert.ok(FALLBACK_STATIONS.national.length >= 4);
    assert.ok(FALLBACK_STATIONS.local.length >= 2);
    for (const s of [...FALLBACK_STATIONS.national, ...FALLBACK_STATIONS.local]) {
      assert.ok(s.id && s.name && s.url, 'station needs id/name/url');
      assert.match(s.url, /^https?:\/\//);
    }
  });

  it('lists US regions for local tuning', () => {
    assert.ok(US_STATES.includes('California'));
    assert.equal(US_STATES[0], '');
  });

  it('fetchTopNational returns stations (api or fallback)', async () => {
    const list = await fetchTopNational(8);
    assert.ok(Array.isArray(list));
    assert.ok(list.length >= 1);
    assert.ok(list.every((s) => s.url && s.name));
  });

  it('fetchTopLocal returns stations for a region', async () => {
    const list = await fetchTopLocal(8, 'California');
    assert.ok(Array.isArray(list));
    assert.ok(list.length >= 1);
    assert.ok(list.every((s) => s.url && s.name));
  });
});
