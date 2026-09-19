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

/**
 * Fetch a theme token by CSS var, color key, or alias.
 * @param {string} name Token key (e.g. '--tuner-accent', 'accent', 'appBackground')
 * @param {string|null} [fallback] Returned when token is missing or empty
 * @returns {string|null}
 */
export function getToken(name, fallback = null) {
  const pick = (v) => (v != null && v !== '' ? v : (fallback ?? null));
  if (name in state.currentTokens) return pick(state.currentTokens[name]);
  if (name.startsWith('--')) return pick(state.currentTokens[name]);
  const cssVar = COLOR_TO_CSS_VAR[name];
  if (cssVar) return pick(state.currentTokens[cssVar]);
  return fallback ?? null;
}

export function getTheme() {
  return state.currentTheme;
}

export function listThemes() {
  return [...themes.values()]
    .map((t) => ({ id: t.id, name: t.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Apply a bundled theme by id, display name, or {id?, name?} object.
 * @param {string|{id?:string,name?:string}} nameOrTheme
 * @returns {string} Resolved theme id
 */
export function applyTheme(nameOrTheme) {
  const resolved = resolveThemeId(nameOrTheme);
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
