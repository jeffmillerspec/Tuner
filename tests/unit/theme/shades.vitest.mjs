import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseHex,
  lighten,
  darken,
  contrastRatio,
  ensureContrast,
  deriveShades,
  computeColorShades,
  clearShadeCache,
  getShadeCacheSize,
} from '../../../src/theme/shades.js';

describe('shades', () => {
  beforeEach(() => clearShadeCache());

  it('lighten/darken respect near-white and near-black boundaries', () => {
    expect(parseHex(lighten('#fefefe', 0.5))).toBeTruthy();
    expect(parseHex(darken('#010101', 0.5))).toBeTruthy();
    expect(lighten('#000000', 1)).toBe('#ffffff');
    expect(darken('#ffffff', 1)).toBe('#000000');
  });

  it('ensureContrast clamps low-contrast pairs to minimum ratio', () => {
    const fg = ensureContrast('#777777', '#888888', 4.5);
    expect(contrastRatio(fg, '#888888')).toBeGreaterThanOrEqual(4.5);
  });

  it('computeColorShades is deterministic for identical palettes', () => {
    const palette = {
      accent: '#27d8c7',
      appBackground: '#02090e',
      surface: '#05131b',
      surfaceAlt: '#0a202b',
      textMuted: '#759ca2',
      scrollbarTrack: '#041017',
      scrollbarThumb: '#123746',
    };
    expect(computeColorShades(palette)).toEqual(computeColorShades(palette));
  });

  it('deriveShades returns hover/active/disabled keys', () => {
    const shades = deriveShades('#ff4fd8', '#090312');
    expect(shades.hover).toMatch(/^#[0-9a-f]{6}$/);
    expect(shades.active).toMatch(/^#[0-9a-f]{6}$/);
    expect(shades.disabled).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('shade cache avoids duplicate computation', () => {
    deriveShades('#27d8c7', '#02090e');
    const size = getShadeCacheSize();
    deriveShades('#27d8c7', '#02090e');
    expect(getShadeCacheSize()).toBe(size);
    expect(size).toBeGreaterThanOrEqual(1);
  });
});
