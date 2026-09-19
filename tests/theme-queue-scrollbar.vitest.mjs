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
    const thumbBefore = document.documentElement.style.getPropertyValue('--tuner-scrollbar-thumb');
    const trackBefore = document.documentElement.style.getPropertyValue('--tuner-scrollbar-track');
    expect(thumbBefore).toBeTruthy();
    expect(trackBefore).toBeTruthy();
    const alt = listThemes().find((t) => t.id !== saved) || listThemes()[0];
    applyTheme(alt.id);
    const thumbAfter = document.documentElement.style.getPropertyValue('--tuner-scrollbar-thumb');
    const trackAfter = document.documentElement.style.getPropertyValue('--tuner-scrollbar-track');
    expect(thumbAfter).toBeTruthy();
    expect(trackAfter).toBeTruthy();
    if (alt.id !== saved) {
      expect(thumbBefore !== thumbAfter || trackBefore !== trackAfter).toBe(true);
    }
  });
});
