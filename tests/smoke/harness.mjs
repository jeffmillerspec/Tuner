import { Window } from 'happy-dom';

/** Minimal DOM smoke: init theme, switch theme with persist, assert scrollbar tokens. */
export async function runThemeSwitchSmoke() {
  const { initTheme, applyTheme, listThemes } = await import('../../src/theme/themeManager.js');
  const window = new Window({ url: 'http://localhost/' });
  const document = window.document;
  const prev = {
    window: globalThis.window,
    document: globalThis.document,
    HTMLElement: globalThis.HTMLElement,
    Node: globalThis.Node,
  };
  try {
    globalThis.window = window;
    globalThis.document = document;
    globalThis.HTMLElement = window.HTMLElement;
    globalThis.Node = window.Node;

    const queue = document.createElement('ul');
    queue.id = 'queue-list';
    queue.className = 'tuner-scrollbars';
    queue.style.height = '120px';
    queue.style.overflow = 'auto';
    for (let i = 0; i < 24; i++) {
      const li = document.createElement('li');
      li.className = 'queue-item';
      li.textContent = 'Track ' + (i + 1);
      queue.appendChild(li);
    }
    document.body.appendChild(queue);

    let saved = null;
    const initialId = await initTheme({
      getThemeId: () => saved,
      setThemeId: (id) => { saved = id; },
    });
    const thumbBefore = document.documentElement.style.getPropertyValue('--tuner-scrollbar-thumb');
    if (!thumbBefore) throw new Error('missing --tuner-scrollbar-thumb after init');
    const trackBefore = document.documentElement.style.getPropertyValue('--tuner-scrollbar-track');
    if (!trackBefore) throw new Error('missing --tuner-scrollbar-track after init');

    const themes = listThemes();
    if (!themes.length) throw new Error('no bundled themes');
    const alt = themes.find((t) => t.id !== initialId) ?? themes[0];
    const appliedId = applyTheme(alt.id, { persist: true });

    const thumbAfter = document.documentElement.style.getPropertyValue('--tuner-scrollbar-thumb');
    if (!thumbAfter) throw new Error('missing --tuner-scrollbar-thumb after switch');
    if (saved !== appliedId) throw new Error('theme id not persisted');
    const trackAfter = document.documentElement.style.getPropertyValue('--tuner-scrollbar-track');
    if (!trackAfter) throw new Error('missing --tuner-scrollbar-track after switch');

    return { thumbBefore, thumbAfter, trackBefore, trackAfter, saved, appliedId, themeId: saved };
  } finally {
    globalThis.window = prev.window;
    globalThis.document = prev.document;
    globalThis.HTMLElement = prev.HTMLElement;
    globalThis.Node = prev.Node;
    window.close();
  }
}
