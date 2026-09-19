import {
  DEFAULT_THEME_ID,
  COLOR_TO_CSS_VAR,
  DESIGN_DEFAULTS,
  FALLBACK_THEME_RAW,
  THEME_KEYS,
} from './constants.js';
import { getShadesForTheme, clearShadeCache } from './shades.js';

const bundledThemeModules = import.meta.glob('../../Bundled themes json/*.json', { eager: true });
const themes = new Map();

function normalizeTheme(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id || raw.name?.toLowerCase().replace(/\s+/g, '-');
  if (!id) return null;
  return { ...raw, id, name: raw.name ?? id };
}

export function loadBundledThemes() {
  themes.clear();
  for (const mod of Object.values(bundledThemeModules)) {
    const raw = mod.default ?? mod;
    const theme = normalizeTheme(raw);
    if (theme) themes.set(theme.id, theme);
  }
  if (!themes.has(DEFAULT_THEME_ID)) {
    themes.set(DEFAULT_THEME_ID, { ...FALLBACK_THEME_RAW });
  }
}

export function getThemesMap() {
  return themes;
}

export function resolveDefaultThemeId() {
  if (themes.has(DEFAULT_THEME_ID)) return DEFAULT_THEME_ID;
  const first = themes.keys().next();
  return first.done ? DEFAULT_THEME_ID : first.value;
}

export function resolveThemeId(nameOrTheme) {
  if (nameOrTheme && typeof nameOrTheme === 'object') {
    if (nameOrTheme.id && themes.has(nameOrTheme.id)) return nameOrTheme.id;
    if (nameOrTheme.name) {
      const hit = [...themes.values()].find((t) => t.name === nameOrTheme.name);
      if (hit) return hit.id;
    }
  }
  if (typeof nameOrTheme === 'string' && nameOrTheme) {
    if (themes.has(nameOrTheme)) return nameOrTheme;
    const byName = [...themes.values()].find(
      (t) => t.name === nameOrTheme || t.id === nameOrTheme,
    );
    if (byName) return byName.id;
  }
  return resolveDefaultThemeId();
}

export { getShadesForTheme };

export function buildTokens(theme, shades) {
  const tokens = { ...DESIGN_DEFAULTS };
  for (const key of THEME_KEYS) {
    const cssVar = COLOR_TO_CSS_VAR[key];
    if (cssVar && theme[key]) tokens[cssVar] = theme[key];
  }
  tokens['--tuner-bg'] = tokens['--tuner-bg-app'] ?? theme.appBackground;
  tokens['--tuner-fg'] = tokens['--tuner-text'] ?? theme.text;
  tokens['--tuner-scrollbar-size'] = '10px';
  tokens['--tuner-scrollbar-radius'] = tokens['--tuner-radius-sm'];
  tokens['--tuner-scrollbar-thumb-active'] = shades.scrollbarThumbActive;
  tokens['--tuner-accent-hover'] = shades.accentHover;
  tokens['--tuner-accent-500'] = theme.accent;
  tokens['--tuner-accent-600'] = shades.accentHover;
  tokens['--tuner-accent-700'] = shades.accentActive;
  tokens['--tuner-on-accent'] = theme.accentContrast;
  tokens['--tuner-disabled-bg'] = shades.disabledBg;
  tokens['--tuner-disabled-fg'] = shades.disabledFg;
  return tokens;
}

export function applyCssVars(tokens) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokens)) {
    if (value != null) root.style.setProperty(key, value);
  }
}

export function resetThemeCaches() {
  clearShadeCache();
}

export { bundledThemeModules };
