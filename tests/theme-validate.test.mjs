import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateTheme, parseThemeJson, fallbackTheme } from '../src/theme/validate.js';
import { FALLBACK_COLORS, DEFAULT_THEME_ID } from '../src/theme/constants.js';

const validRaw = { id: 'test-theme', name: 'Test Theme', ...FALLBACK_COLORS };

test('validateTheme accepts complete theme', () => {
  const r = validateTheme(validRaw);
  assert.equal(r.valid, true);
  assert.equal(r.theme.id, 'test-theme');
});

test('validateTheme fills missing colors deterministically', () => {
  const r = validateTheme({ id: 'partial', name: 'Partial', accent: '#112233' });
  assert.equal(r.valid, false);
  assert.equal(r.theme.colors.accent, '#112233');
  assert.equal(r.theme.colors.text, FALLBACK_COLORS.text);
});

test('parseThemeJson rejects malformed JSON', () => {
  const r = parseThemeJson('{bad');
  assert.equal(r.valid, false);
  assert.equal(r.theme, null);
});

test('fallbackTheme is deterministic default', () => {
  assert.equal(fallbackTheme().id, DEFAULT_THEME_ID);
  assert.deepEqual(fallbackTheme(), fallbackTheme());
});

test('theme schema file exists', () => {
  const schema = JSON.parse(readFileSync('src/theme/theme.schema.json', 'utf8'));
  assert.equal(schema.title, 'TunerBundledTheme');
});

test('no absolute path literals in theme modules', () => {
  for (const f of ['src/theme/themeManager.js', 'src/theme/themeInternal.js']) {
    const src = readFileSync(f, 'utf8');
    assert.ok(!/[A-Za-z]:\\/.test(src), f);
  }
});
