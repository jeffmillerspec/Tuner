import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_THEME_ID } from '../src/theme/constants.js';
import { initTheme, applyTheme, getTheme, listThemes } from '../src/theme/themeManager.js';

test('initTheme applies default when persistence absent', async () => {
  const applied = await initTheme({ getThemeId: () => null, setThemeId: () => {} });
  assert.equal(applied, DEFAULT_THEME_ID);
  assert.equal(getTheme()?.id, DEFAULT_THEME_ID);
});

test('initTheme falls back when persisted id invalid', async () => {
  const applied = await initTheme({
    getThemeId: () => 'nonexistent-theme-id',
    setThemeId: () => {},
  });
  assert.equal(applied, DEFAULT_THEME_ID);
});

test('persistence round-trip via applyTheme', async () => {
  let saved = null;
  await initTheme({
    getThemeId: () => saved,
    setThemeId: (id) => { saved = id; },
  });
  const alt = listThemes().find((t) => t.id !== DEFAULT_THEME_ID);
  if (alt) {
    applyTheme(alt.id);
    assert.equal(saved, alt.id);
  }
});
