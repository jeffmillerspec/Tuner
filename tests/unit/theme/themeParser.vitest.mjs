import { describe, it, expect } from 'vitest';
import { validateTheme, parseThemeJson } from '../../../src/theme/validate.js';
import { buildTokens } from '../../../src/theme/themeInternal.js';
import { FALLBACK_COLORS } from '../../../src/theme/constants.js';

function flatTheme(result) {
  return { id: result.theme.id, name: result.theme.name, ...result.theme.colors };
}

const VALID_JSON = JSON.stringify({ id: 'parser-unit', name: 'Parser Unit', ...FALLBACK_COLORS });

describe('themeParser', () => {
  it('valid theme JSON parses and registers CSS tokens', () => {
    const parsed = parseThemeJson(VALID_JSON);
    expect(parsed.valid).toBe(true);
    expect(parsed.errors).toEqual([]);
    const tokens = buildTokens(flatTheme(parsed));
    expect(tokens['--tuner-accent']).toBe(FALLBACK_COLORS.accent.toLowerCase());
    expect(tokens['--tuner-bg-app']).toBe(FALLBACK_COLORS.appBackground.toLowerCase());
    expect(tokens['--tuner-text']).toBe(FALLBACK_COLORS.text.toLowerCase());
    expect(tokens['--tuner-scrollbar-thumb']).toBeTruthy();
  });

  it('malformed JSON returns a descriptive error without throwing', () => {
    const parsed = parseThemeJson('{not valid json');
    expect(parsed.valid).toBe(false);
    expect(parsed.theme).toBeNull();
    expect(parsed.errors.length).toBeGreaterThan(0);
    expect(String(parsed.errors[0]).length).toBeGreaterThan(0);
  });

  it('missing required color tokens fall back deterministically', () => {
    const parsed = validateTheme({ id: 'sparse', name: 'Sparse', accent: '#112233' });
    expect(parsed.valid).toBe(false);
    expect(parsed.errors.some((e) => e.includes('Invalid or missing color'))).toBe(true);
    expect(parsed.theme.colors.accent).toBe('#112233');
    expect(parsed.theme.colors.text).toBe(FALLBACK_COLORS.text);
    expect(parsed.theme.colors.appBackground).toBe(FALLBACK_COLORS.appBackground);
    expect(parsed.theme.colors.surface).toBe(FALLBACK_COLORS.surface);
  });

  it('invalid hex values are replaced with schema fallbacks', () => {
    const parsed = validateTheme({
      id: 'bad-hex',
      name: 'Bad Hex',
      accent: 'not-a-hex',
      appBackground: '#02090e',
      surface: '#05131b',
      surfaceAlt: '#0a202b',
      border: '#164254',
      text: '#dbf2f2',
      textMuted: '#759ca2',
      accentContrast: '#03110f',
      focus: '#4eeaff',
      scrollbarTrack: '#041017',
      scrollbarThumb: '#123746',
      scrollbarThumbHover: '#1d596b',
    });
    expect(parsed.valid).toBe(false);
    expect(parsed.theme.colors.accent).toBe(FALLBACK_COLORS.accent);
  });

  it('buildTokens applies generic alias tokens for UI surfaces', () => {
    const parsed = parseThemeJson(VALID_JSON);
    const tokens = buildTokens(flatTheme(parsed));
    expect(tokens['--bg']).toBe(tokens['--tuner-bg-app']);
    expect(tokens['--fg']).toBe(tokens['--tuner-text']);
    expect(tokens['--surface']).toBe(tokens['--tuner-bg-surface']);
  });
});
