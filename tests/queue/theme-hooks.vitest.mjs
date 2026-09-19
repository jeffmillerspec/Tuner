import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { initTheme, applyTheme, listThemes } from '../../src/theme/themeManager.js';

describe('queue theme hooks', () => {
  beforeEach(() => { document.documentElement.style.cssText = ''; });
  it('styles.css references queue and scrollbar tokens', () => {
    const css = readFileSync('src/styles.css', 'utf8');
    expect(css).toContain('#queue-list');
    expect(css).toContain('--scrollbar-thumb-active');
    expect(css).toMatch(/::-webkit-scrollbar-thumb:active/);
    expect(css).toMatch(/scrollbar-color:/);
  });
  it('main.js wires keyboard and dnd', () => {
    const js = readFileSync('src/main.js', 'utf8');
    expect(js).toContain('setupQueueKeyboard');
    expect(js).toContain('setupQueueDragDrop');
    expect(js).toContain('dragstart');
  });
  it('theme switch sets scrollbar CSS variables on :root', async () => {
    let saved = null;
    await initTheme({ getThemeId: () => saved, setThemeId: (id) => { saved = id; } });
    const before = document.documentElement.style.getPropertyValue('--tuner-scrollbar-thumb');
    expect(before).toBeTruthy();
    const alt = listThemes().find((t) => t.id !== saved) || listThemes()[0];
    applyTheme(alt.id);
    const after = document.documentElement.style.getPropertyValue('--tuner-scrollbar-thumb');
    expect(after).toBeTruthy();
  });
});
