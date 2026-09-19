import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach } from 'vitest';
import { initTheme, applyTheme, listThemes } from '../src/theme/themeManager.js';

const execFileAsync = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('smoke theme runtime', () => {
  beforeEach(() => { document.documentElement.style.cssText = ''; });

  it('initTheme sets CSS variables', async () => {
    let saved = null;
    await initTheme({ getThemeId: () => saved, setThemeId: (id) => { saved = id; } });
    const bg = document.documentElement.style.getPropertyValue('--tuner-bg-app')
      || document.documentElement.style.getPropertyValue('--tuner-bg');
    expect(bg).toBeTruthy();
  });

  it('applyTheme switches theme id', async () => {
    let saved = null;
    await initTheme({ getThemeId: () => saved, setThemeId: (id) => { saved = id; } });
    const alt = listThemes().find((t) => t.id !== saved) || listThemes()[0];
    applyTheme(alt.id);
    expect(saved).toBe(alt.id);
  });
});

describe('smoke delivery', () => {
  it('scripts/smoke.mjs exits 0 (quick mode)', async () => {
    const { stdout } = await execFileAsync(process.execPath, ['scripts/smoke.mjs'], {
      cwd: root,
      timeout: 60000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, SMOKE_QUICK: '1' },
    });
    expect(stdout).toContain('SMOKE_OK');
  }, 65000);
});
