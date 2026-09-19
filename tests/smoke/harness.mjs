import { Window } from 'happy-dom';

/** Minimal DOM smoke: init theme, switch theme, assert scrollbar token. */
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
    await initTheme({
      getThemeId: () => saved,
      setThemeId: (id) => { saved = id; },
    });
    const thumbBefore = document.documentElement.style.getPropertyValue('--tuner-scrollbar-thumb');
    if (!thumbBefore) throw new Error('missing --tuner-scrollbar-thumb after init');

    const themes = listThemes();
    if (!themes.length) throw new Error('no bundled themes');
    const alt = themes.find((t) => t.id !== saved) ?? themes[0];
    applyTheme(alt.id);

    const thumbAfter = document.documentElement.style.getPropertyValue('--tuner-scrollbar-thumb');
    if (!thumbAfter) throw new Error('missing --tuner-scrollbar-thumb after switch');
    if (saved !== alt.id) throw new Error('theme id not persisted');

    return { thumbBefore, thumbAfter, themeId: saved };
  } finally {
    globalThis.window = prev.window;
    globalThis.document = prev.document;
    globalThis.HTMLElement = prev.HTMLElement;
    globalThis.Node = prev.Node;
    window.close();
  }
}
