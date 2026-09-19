/**
 * ThemeManager — load bundled JSON themes, compute shades, apply CSS tokens.
 * Public API: initTheme, applyTheme, getToken, subscribe, listThemes, reloadThemes
 */
import { DEFAULT_THEME_ID, COLOR_TO_CSS_VAR } from './constants.js';
import {
  themes,
  subscribers,
  state,
  bundledThemeModules,
  buildTokens,
  applyCssVars,
  notify,
  loadBundledThemes,
  resolveThemeId,
  getShadesForTheme,
  resetThemeCaches,
} from './themeInternal.js';

/** @param {(payload:{theme:object,tokens:Record<string,string>})=>void} fn @returns {()=>void} */
export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

/** @param {string} name @returns {string|null} */
export function getToken(name) {
  if (name in state.currentTokens) return state.currentTokens[name];
  if (name.startsWith('--')) return state.currentTokens[name] ?? null;
  const cssVar = COLOR_TO_CSS_VAR[name];
  if (cssVar) return state.currentTokens[cssVar] ?? null;
  return null;
}

export function getTheme() {
  return state.currentTheme;
}

export function listThemes() {
  return [...themes.values()]
    .map((t) => ({ id: t.id, name: t.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** @param {string} themeId @returns {string} */
export function applyTheme(themeId) {
  const resolved = resolveThemeId(themeId);
  const theme = themes.get(resolved);
  if (!theme) return applyTheme(DEFAULT_THEME_ID);
  const shades = getShadesForTheme(theme);
  state.currentTheme = theme;
  state.currentTokens = buildTokens(theme, shades);
  applyCssVars(state.currentTokens);
  notify();
  try { state.persistence.setThemeId(resolved); } catch (_) {}
  return resolved;
}

/** @returns {Promise<string>} */
export async function reloadThemes() {
  resetThemeCaches();
  loadBundledThemes();
  const id = state.currentTheme?.id ?? state.persistence.getThemeId() ?? DEFAULT_THEME_ID;
  return applyTheme(id);
}

function setupDevHotReload() {
  if (import.meta.env?.PROD) return;
  if (!import.meta.hot) return;
  for (const p of Object.keys(bundledThemeModules)) {
    import.meta.hot.accept(p, () => { reloadThemes(); });
  }
}

/** @param {{getThemeId?:()=>string|null,setThemeId?:(id:string)=>void}} [options] @returns {Promise<string>} */
export async function initTheme(options = {}) {
  if (options.getThemeId) state.persistence.getThemeId = options.getThemeId;
  if (options.setThemeId) state.persistence.setThemeId = options.setThemeId;
  await Promise.resolve();
  loadBundledThemes();
  setupDevHotReload();
  const persisted = state.persistence.getThemeId();
  const initial = persisted && themes.has(persisted) ? persisted : DEFAULT_THEME_ID;
  return applyTheme(initial);
}
