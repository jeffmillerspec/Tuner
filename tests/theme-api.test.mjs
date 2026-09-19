import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_THEME_ID } from '../src/theme/constants.js';
import { initTheme, applyTheme, getToken, subscribe, listThemes } from '../src/theme/themeManager.js';

test('getToken returns token and respects fallback', async () => {
  await initTheme({ getThemeId: () => null, setThemeId: () => {} });
  const accent = getToken('--tuner-accent');
  assert.ok(accent, 'accent token should exist after init');
  assert.equal(getToken('--nonexistent-token-xyz', '#fallback'), '#fallback');
  assert.equal(getToken('appBackground'), getToken('--tuner-bg-app'));
});

test('subscribe receives applyTheme notifications', async () => {
  await initTheme({ getThemeId: () => null, setThemeId: () => {} });
  let calls = 0;
  let lastId = null;
  const unsub = subscribe(({ theme }) => {
    calls += 1;
    lastId = theme?.id ?? null;
  });
  const alt = listThemes().find((t) => t.id !== DEFAULT_THEME_ID) || listThemes()[0];
  applyTheme(alt.id);
  assert.ok(calls >= 1);
  assert.equal(lastId, alt.id);
  unsub();
});

test('applyTheme accepts id string and name object', async () => {
  await initTheme({ getThemeId: () => null, setThemeId: () => {} });
  const themes = listThemes();
  assert.ok(themes.length > 0);
  const target = themes.find((t) => t.id !== DEFAULT_THEME_ID) || themes[0];
  applyTheme(target.id);
  assert.equal(applyTheme({ id: target.id }), target.id);
  applyTheme(DEFAULT_THEME_ID);
  const byName = listThemes().find((t) => t.name);
  if (byName) {
    assert.equal(applyTheme(byName.name), byName.id);
    assert.equal(applyTheme({ name: byName.name }), byName.id);
  }
});
