import { DEFAULT_THEME_ID, COLOR_TO_CSS_VAR } from './constants.js';
import {
  loadBundledThemes,
  buildTokens,
  applyCssVars,
  resetThemeCaches,
} from './themeInternal.js';

const state = {
  themes: [],
  currentId: DEFAULT_THEME_ID,
  tokens: {},
  persistence: { getThemeId: () => null, setThemeId: () => {} },
};

const listeners = new Set();
let bundledThemeModules = {};

function resolveDefaultThemeId() {
  return state.themes.some((t) => t.id === DEFAULT_THEME_ID)
    ? DEFAULT_THEME_ID
    : (state.themes[0]?.id ?? DEFAULT_THEME_ID);
}

function resolveThemeRef(idOrSpec) {
  if (idOrSpec == null) return null;
  if (typeof idOrSpec === 'object') {
    if (idOrSpec.id && state.themes.some((t) => t.id === idOrSpec.id)) return idOrSpec.id;
    if (idOrSpec.name) {
      const hit = state.themes.find((t) => t.name === idOrSpec.name);
      if (hit) return hit.id;
    }
    return null;
  }
  if (typeof idOrSpec === 'string') {
    if (state.themes.some((t) => t.id === idOrSpec)) return idOrSpec;
    const hit = state.themes.find((t) => t.name === idOrSpec);
    if (hit) return hit.id;
  }
  return null;
}

export function listThemes() {
  return state.themes.map(({ id, name }) => ({ id, name: name || id }));
}

export function getTheme() {
  return state.themes.find((t) => t.id === state.currentId) || state.themes[0] || null;
}

export function getToken(name, fallback) {
  if (name == null) return fallback;
  const key = name.startsWith('--') ? name : COLOR_TO_CSS_VAR[name];
  if (key) {
    const val = state.tokens[key];
    if (val != null && val !== '') return val;
  }
  const direct = state.tokens[name];
  if (direct != null && direct !== '') return direct;
  return fallback;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  const theme = getTheme();
  const payload = { theme, tokens: { ...state.tokens } };
  for (const fn of listeners) {
    try { fn(payload); } catch (_) {}
  }
}

export function applyTheme(idOrSpec, opts = {}) {
  const persist = opts.persist !== false;
  const resolved = resolveThemeRef(idOrSpec);
  const theme =
    state.themes.find((t) => t.id === resolved) ||
    state.themes.find((t) => t.id === DEFAULT_THEME_ID) ||
    state.themes[0];
  if (!theme) return state.currentId;
  state.currentId = theme.id;
  state.tokens = buildTokens(theme);
  applyCssVars(state.tokens);
  if (persist) {
    try { state.persistence.setThemeId(state.currentId); } catch (_) {}
  }
  notify();
  return state.currentId;
}

function setupDevHotReload() {
  if (!(import.meta.env && import.meta.env.DEV)) return;
  if (!import.meta.hot) return;
  for (const p of Object.keys(bundledThemeModules)) {
    import.meta.hot.accept(p, () => { void reloadThemes(); });
  }
}

export async function initTheme({ getThemeId, setThemeId } = {}) {
  resetThemeCaches();
  state.persistence = {
    getThemeId: getThemeId ?? (() => null),
    setThemeId: setThemeId ?? (() => {}),
  };
  if (typeof import.meta.glob === 'function') {
    bundledThemeModules = import.meta.glob('../../Bundled themes json/*.json', { eager: true });
  }
  state.themes = await loadBundledThemes();
  setupDevHotReload();
  const persisted = state.persistence.getThemeId?.();
  const initial = state.themes.some((t) => t.id === persisted) ? persisted : resolveDefaultThemeId();
  applyTheme(initial, { persist: false });
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.themeReady = 'true';
  }
  return state.currentId;
}

export async function reloadThemes() {
  resetThemeCaches();
  state.themes = await loadBundledThemes();
  const id = state.currentId ?? state.persistence.getThemeId?.() ?? resolveDefaultThemeId();
  return applyTheme(id, { persist: false });
}
