import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('queue dnd wiring', () => {
  it('has drag handle and live region', () => {
    const js = readFileSync('src/main.js', 'utf8');
    expect(js).toContain('queue-drag-handle');
    expect(js).toContain('dataset.index');
    expect(js).toContain('announceQueue');
  });
  it('styles drag states', () => {
    const css = readFileSync('src/styles.css', 'utf8');
    expect(css).toContain('.dragging');
    expect(css).toContain('.drag-over');
  });
});
