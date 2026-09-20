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
  archiveProvider,
  browseArchive,
  archiveDownloadUrl,
  pickArchiveStreamFile,
} = await import('../../src/connections/archive.js');
const { getConnection } = await import('../../src/connections/registry.js');

describe('archive connection', () => {
  before(() => { localStorage.clear(); });

  it('registers in the connection registry', () => {
    assert.equal(archiveProvider.id, 'archive');
    assert.equal(getConnection('archive')?.id, 'archive');
  });

  it('builds download urls without credentials', () => {
    assert.match(
      archiveDownloadUrl('some-id', 'track.mp3'),
      /archive\.org\/download\/some-id\/track\.mp3/,
    );
  });

  it('connectGuest needs no setup', async () => {
    const res = await archiveProvider.connectGuest();
    assert.equal(res.ok, true);
    assert.equal(archiveProvider.getStatus(), 'guest');
  });

  it('pickArchiveStreamFile prefers streamable audio', () => {
    const file = pickArchiveStreamFile([
      { name: 'notes.xml', format: 'Metadata' },
      { name: 'chapter_64kb.mp3', format: '64Kbps MP3', size: '1000' },
      { name: 'chapter.mp3', format: 'VBR MP3', size: '2000' },
    ]);
    assert.ok(file);
    assert.match(file.name, /\.mp3$/i);
  });

  it('browseArchive returns items', async () => {
    const items = await browseArchive('audiobooks', 3);
    assert.ok(Array.isArray(items));
    assert.ok(items.length >= 1);
    assert.ok(items[0].id && items[0].name);
  });
});
