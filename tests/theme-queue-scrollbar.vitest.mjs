import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { initTheme, applyTheme, listThemes } from '../src/theme/themeManager.js';
describe('queue scrollbar tokens', () => {
  beforeEach(() => { document.documentElement.style.cssText = ''; });
  it('CSS uses theme scrollbar variables on queue', () => {
    const css = readFileSync('src/styles.css', 'utf8');
    expect(css).toContain('#queue-list');
    expect(css).toContain('--tuner-scrollbar-size');
    expect(css).toMatch(/scrollbar-thumb:active/);
  });
  it('theme switch updates scrollbar thumb token', async () => {
    let saved = null;
    await initTheme({ getThemeId: () => saved, setThemeId: (id) => { saved = id; } });
    expect(document.documentElement.style.getPropertyValue('--tuner-scrollbar-thumb')).toBeTruthy();
    const alt = listThemes().find((t) => t.id !== saved) || listThemes()[0];
    applyTheme(alt.id);
    expect(document.documentElement.style.getPropertyValue('--tuner-scrollbar-thumb')).toBeTruthy();
  });
});
