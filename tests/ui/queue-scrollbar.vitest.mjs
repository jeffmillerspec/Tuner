import { describe, it, expect, beforeEach } from 'vitest';
import { initTheme, applyTheme, listThemes } from '../../src/theme/themeManager.js';

/** @vitest-environment happy-dom */

describe('queue scrollbar UI', () => {
  beforeEach(() => {
    document.body.innerHTML = '<ul id="queue-list" style="height:120px;overflow:auto"></ul>';
    document.documentElement.style.cssText = '';
  });

  it('switching themes changes scrollbar CSS variables', async () => {
    let saved = null;
    await initTheme({ getThemeId: () => saved, setThemeId: (id) => { saved = id; } });

    const themes = listThemes();
    expect(themes.length).toBeGreaterThan(0);
    const first = themes[0];
    applyTheme(first.id);

    const thumbBefore = document.documentElement.style.getPropertyValue('--tuner-scrollbar-thumb');
    const trackBefore = document.documentElement.style.getPropertyValue('--tuner-scrollbar-track');
    expect(thumbBefore && trackBefore).toBeTruthy();

    const alt = themes.find((t) => t.id !== first.id) ?? first;
    applyTheme(alt.id);

    const thumbAfter = document.documentElement.style.getPropertyValue('--tuner-scrollbar-thumb');
    const trackAfter = document.documentElement.style.getPropertyValue('--tuner-scrollbar-track');
    expect(thumbAfter && trackAfter).toBeTruthy();

    if (alt.id !== first.id) {
      expect(thumbBefore !== thumbAfter || trackBefore !== trackAfter).toBe(true);
    }
  });
});
