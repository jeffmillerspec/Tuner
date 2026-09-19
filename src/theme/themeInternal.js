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
  tokens['--tuner-bg']=tokens['--tuner-bg-app'];
  tokens['--tuner-fg']=tokens['--tuner-text'];
  tokens['--tuner-on-accent']=tokens['--tuner-accent-contrast'];
  tokens['--tuner-accent-500']=tokens['--tuner-accent'];
  tokens['--tuner-accent-600']=tokens['--tuner-accent-hover']??shades.accent?.hover??tokens['--tuner-accent'];
  tokens['--tuner-accent-700']=tokens['--tuner-accent-active']??shades.accent?.active??tokens['--tuner-accent'];
  tokens['--tuner-disabled-bg']=shades.surface?.disabled??tokens['--tuner-bg-surface-alt'];
  tokens['--tuner-disabled-fg']=tokens['--tuner-text-muted'];
  tokens['--tuner-scrollbar-size']='10px';
  tokens['--tuner-scrollbar-radius']=tokens['--tuner-radius-sm'];
  tokens['--tuner-scrollbar-thumb-active']=tokens['--tuner-scrollbar-thumb-hover'];
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

function resolveDefaultThemeId() {
  if (themes.has(DEFAULT_THEME_ID)) return DEFAULT_THEME_ID;
  const first = themes.keys().next();
  return first.done ? fallbackTheme().id : first.value;
}

/** Resolve theme id from string id/name or {id?, name?} object. */
export function resolveThemeId(nameOrTheme) {
  if (nameOrTheme == null || nameOrTheme === '') return resolveDefaultThemeId();
  if (typeof nameOrTheme === 'object') {
    if (nameOrTheme.id && themes.has(nameOrTheme.id)) return nameOrTheme.id;
    if (nameOrTheme.name) {
      for (const [id, t] of themes) {
        if (t.name === nameOrTheme.name) return id;
      }
    }
    return resolveDefaultThemeId();
  }
  if (themes.has(nameOrTheme)) return nameOrTheme;
  for (const [id, t] of themes) {
    if (t.name === nameOrTheme) return id;
  }
  return resolveDefaultThemeId();
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
