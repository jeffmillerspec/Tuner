/**
 * Internal theme state, bundled JSON loader, token builder.
 * Imported by themeManager.js — not part of the public API.
 */
import { COLOR_TO_CSS_VAR, DEFAULT_THEME_ID, DESIGN_DEFAULTS } from './constants.js';
import { computeColorShades, clearShadeCache } from './shades.js';
import { fallbackTheme, validateTheme } from './validate.js';

/** Vite requires a string-literal glob at module scope; empty in plain Node tests. */
export const bundledThemeModules =
  typeof import.meta.glob === 'function'
    ? import.meta.glob('../../Bundled themes json/*.json', { eager: true })
    : {};

export const themes = new Map();
export const subscribers = new Set();
export const themeShadeCache = new Map();

export const state = {
  currentTheme: null,
  currentTokens: {},
  persistence: { getThemeId: () => null, setThemeId: () => {} },
};

export function buildTokens(theme, shades) {
  const tokens = { ...DESIGN_DEFAULTS };
  for (const [key, cssVar] of Object.entries(COLOR_TO_CSS_VAR)) {
    const hex = theme.colors[key];
    tokens[cssVar] = hex;
    tokens[key] = hex;
  }
  for (const [colorKey, variants] of Object.entries(shades)) {
    const cssVar = COLOR_TO_CSS_VAR[colorKey];
    for (const [variant, hex] of Object.entries(variants)) {
      if (cssVar) tokens[`${cssVar}-${variant}`] = hex;
      tokens[`${colorKey}.${variant}`] = hex;
    }
  }
  return tokens;
}

export function applyCssVars(tokens) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(tokens)) {
    if (k.startsWith('--')) root.style.setProperty(k, v);
  }
}

export function notify() {
  const payload = { theme: state.currentTheme, tokens: { ...state.currentTokens } };
  for (const fn of subscribers) {
    try {
      fn(payload);
    } catch (_) {
      /* subscriber errors must not break theme apply */
    }
  }
}

/** Load all bundled JSON themes; never throws. */
export function loadBundledThemes() {
  themes.clear();
  for (const mod of Object.values(bundledThemeModules)) {
    const raw = mod?.default ?? mod;
    const { theme } = validateTheme(raw);
    if (theme) themes.set(theme.id, theme);
  }
  if (!themes.size) {
    const fb = fallbackTheme();
    themes.set(fb.id, fb);
  }
}

export function resolveThemeId(themeId) {
  if (themeId && themes.has(themeId)) return themeId;
  if (themes.has(DEFAULT_THEME_ID)) return DEFAULT_THEME_ID;
  const first = themes.keys().next();
  return first.done ? fallbackTheme().id : first.value;
}

export function getShadesForTheme(theme) {
  const cacheKey = theme.id;
  if (themeShadeCache.has(cacheKey)) return themeShadeCache.get(cacheKey);
  const shades = computeColorShades(theme.colors);
  themeShadeCache.set(cacheKey, shades);
  return shades;
}

export function resetThemeCaches() {
  themeShadeCache.clear();
  clearShadeCache();
}
