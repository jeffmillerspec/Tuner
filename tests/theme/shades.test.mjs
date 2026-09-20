import test from 'node:test';
import assert from 'node:assert/strict';
import { lighten, darken, computeColorShades, deriveShades, clearShadeCache } from '../../src/theme/shades.js';

test('shades: lighten/darken deterministic', () => {
  assert.equal(lighten('#000000', 0.5), '#808080');
  assert.equal(darken('#ffffff', 0.5), '#808080');
});

test('shades: computeColorShades stable', () => {
  const palette = {
    accent: '#27d8c7',
    surface: '#05131b',
    border: '#164254',
    text: '#dbf2f2',
    textMuted: '#759ca2',
    appBackground: '#02090e',
  };
  assert.deepEqual(computeColorShades(palette), computeColorShades(palette));
});

test('shades: deriveShades cache', () => {
  clearShadeCache();
  const a = deriveShades('#ff4fd8', '#090312');
  const b = deriveShades('#ff4fd8', '#090312');
  assert.deepEqual(a, b);
  assert.ok(a.hover && a.active && a.disabled);
});
