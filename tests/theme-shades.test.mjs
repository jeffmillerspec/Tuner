import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseHex,
  lighten,
  darken,
  mixHex,
  contrastRatio,
  ensureContrast,
  computeColorShades,
  deriveShades,
  clearShadeCache,
  getShadeCacheSize,
} from '../src/theme/shades.js';

test('parseHex validates input', () => {
  assert.deepEqual(parseHex('#ffffff'), { r: 255, g: 255, b: 255 });
  assert.equal(parseHex('#gggggg'), null);
  assert.equal(parseHex(''), null);
});

test('lighten and darken', () => {
  assert.equal(lighten('#000000', 0.5), '#808080');
  assert.equal(darken('#ffffff', 0.5), '#808080');
  assert.equal(mixHex('#112233', '#ffffff', 0), '#112233');
});

test('near-white and near-black edge cases', () => {
  assert.ok(parseHex('#fefefe'));
  assert.ok(parseHex('#010101'));
  assert.ok(parseHex(lighten('#fefefe', 0.01)));
  assert.ok(parseHex(darken('#010101', 0.01)));
  assert.notEqual(lighten('#000000', 0.01), '#000000');
  assert.notEqual(darken('#ffffff', 0.01), '#ffffff');
});

test('invalid input returns safe values', () => {
  assert.equal(lighten('not-a-color', 0.5), 'not-a-color');
  assert.equal(ensureContrast('bad', '#ffffff', 4.5), 'bad');
});

test('contrastRatio black on white', () => {
  assert.ok(contrastRatio('#000000', '#ffffff') > 4.5);
});

test('ensureContrast improves low contrast', () => {
  const fg = ensureContrast('#777777', '#888888', 4.5);
  assert.ok(contrastRatio(fg, '#888888') >= 4.5);
});

test('computeColorShades deterministic', () => {
  const p = {
    accent: '#27d8c7',
    surface: '#05131b',
    border: '#164254',
    text: '#dbf2f2',
    textMuted: '#759ca2',
    appBackground: '#02090e',
  };
  assert.deepEqual(computeColorShades(p), computeColorShades(p));
});

test('shade cache avoids recompute', () => {
  clearShadeCache();
  deriveShades('#27d8c7', '#02090e');
  const size = getShadeCacheSize();
  deriveShades('#27d8c7', '#02090e');
  assert.equal(getShadeCacheSize(), size);
  assert.ok(size >= 1);
});
