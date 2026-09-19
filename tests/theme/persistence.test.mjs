import test from 'node:test';
import assert from 'node:assert/strict';
import { initTheme, applyTheme, listThemes, getTheme } from '../../src/theme/themeManager.js';
import { DEFAULT_THEME_ID } from '../../src/theme/constants.js';

/**
 * Persistence contract via ThemeManager callbacks (mirrors src/main.js boot wiring).
 * Avoids importing src/store.js (duplicate export parse error in app source).
 */

test('persistence: initTheme reads saved themeId from getter', async () => {
  await initTheme({ getThemeId: () => null, setThemeId: () => {} });
  const themes = listThemes();
  assert.ok(themes.length > 0);
  const target = themes.find((t) => t.id !== DEFAULT_THEME_ID) || themes[0];
  let saved = target.id;
  const applied = await initTheme({
    getThemeId: () => saved,
    setThemeId: (id) => { saved = id; },
  });
  assert.equal(applied, target.id);
  assert.equal(getTheme()?.id, target.id);
});

test('persistence: applyTheme writes themeId via setter', async () => {
  let saved = null;
  await initTheme({ getThemeId: () => saved, setThemeId: (id) => { saved = id; } });
  const alt = listThemes().find((t) => t.id !== saved) || listThemes()[0];
  applyTheme(alt.id);
  assert.equal(saved, alt.id);
});

test('persistence: invalid saved id falls back to default', async () => {
  const applied = await initTheme({
    getThemeId: () => 'nonexistent-theme-id',
    setThemeId: () => {},
  });
  assert.equal(applied, DEFAULT_THEME_ID);
});
