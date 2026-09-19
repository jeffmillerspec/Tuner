import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveShades, mixHex, lighten, darken, ensureContrast } from './shades.js';
import { getShadesForTheme } from './shades.js';
import { COLOR_TO_CSS_VAR, FALLBACK_COLORS } from './constants.js';

const __root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const BUNDLED_DIR = join(__root, 'Bundled themes json');

let themeCache = null;
let tokenCache = new Map();

function readBundledThemeRecords() {
  if (typeof import.meta.glob === 'function') {
    const modules = import.meta.glob('../../Bundled themes json/*.json', { eager: true });
    return Object.entries(modules).map(([path, mod]) => {
      const data = mod.default ?? mod;
      const id = data.id ?? path.split(/[/\\]/).pop().replace(/\.json$/i, '');
      return { ...data, id };
    });
  }
  try {
    return readdirSync(BUNDLED_DIR)
      .filter((f) => f.toLowerCase().endsWith('.json'))
      .map((f) => {
        const raw = readFileSync(join(BUNDLED_DIR, f), 'utf8');
        const data = JSON.parse(raw);
        const id = data.id ?? f.replace(/\.json$/i, '');
        return { ...data, id };
      });
  } catch {
    return [];
  }
}

export function resetThemeCaches() {
  themeCache = null;
  tokenCache.clear();
}

export function loadBundledThemes() {
  if (themeCache) return themeCache;
  themeCache = readBundledThemeRecords();
  return themeCache;
}

/** Derive hover/pressed shades from a base hex color preserving contrast against bg. */
export function generateShades(base, bg = '#0f1117') {
  const shades = deriveShades(base, bg, 3.0);
  return {
    hover: shades.hover,
    pressed: shades.active,
    disabled: shades.disabled,
  };
}

/** Derive scrollbar track/thumb/hover/active from theme palette. */
export function deriveScrollbar(theme) {
  const colors = theme.colors || theme;
  const track = colors.bgSurfaceAlt ?? colors.surfaceAlt ?? colors.bgSurface ?? colors.surface ?? '#171a22';
  const bg = colors.bgApp ?? colors.appBackground ?? track;
  const thumbBase = colors.accent ?? colors.border ?? '#3a4254';
  const shades = generateShades(thumbBase, track);
  return {
    track,
    thumb: mixHex(thumbBase, track, 0.35),
    thumbHover: shades.hover,
    thumbActive: shades.pressed,
    size: '10px',
    radius: '4px',
  };
}

export function buildTokens(theme) {
  const key = theme.id;
  if (tokenCache.has(key)) return tokenCache.get(key);
  const colors = { ...FALLBACK_COLORS, ...(theme.colors || theme) };
  const shades = getShadesForTheme(colors);
  const tokens = {};
  for (const [k, cssVar] of Object.entries(COLOR_TO_CSS_VAR)) {
    if (colors[k]) tokens[cssVar] = colors[k];
  }
  for (const [k, v] of Object.entries(shades)) {
    tokens[k.startsWith('--') ? k : `--tuner-${k}`] = v;
  }
  if (colors.bgSurfaceAlt) tokens['--tuner-bg-surface-alt'] = colors.bgSurfaceAlt;
  if (colors.bgHover) tokens['--tuner-bg-hover'] = colors.bgHover;
  else if (!tokens['--tuner-bg-hover']) {
    tokens['--tuner-bg-hover'] = tokens['--tuner-bg-surface-alt'] || lighten(colors.surface ?? '#171a22', 0.06);
  }
  const sb = deriveScrollbar(theme);
  tokens['--tuner-scrollbar-track'] = sb.track;
  tokens['--tuner-scrollbar-thumb'] = sb.thumb;
  tokens['--tuner-scrollbar-thumb-hover'] = sb.thumbHover;
  tokens['--tuner-scrollbar-thumb-active'] = sb.thumbActive;
  tokens['--tuner-scrollbar-size'] = sb.size;
  tokens['--tuner-scrollbar-radius'] = sb.radius;
  tokenCache.set(key, tokens);
  return tokens;
}

export function applyCssVars(tokens) {
  const el = document.documentElement;
  for (const [name, value] of Object.entries(tokens)) {
    if (value != null && value !== '') el.style.setProperty(name, value);
  }
}'] = colors.bgHover;
  else tokens['--tuner-bg-hover'] = tokens['--tuner-bg-surface-alt'] || lighten(colors.bgSurface ?? '#171a22', 0.06);

  const sb = deriveScrollbar(theme);
  tokens['--tuner-scrollbar-track'] = sb.track;
  tokens['--tuner-scrollbar-thumb'] = sb.thumb;
  tokens['--tuner-scrollbar-thumb-hover'] = sb.thumbHover;
  tokens['--tuner-scrollbar-thumb-active'] = sb.thumbActive;
  tokens['--tuner-scrollbar-size'] = sb.size;
  tokens['--tuner-scrollbar-radius'] = sb.radius;
  tokenCache.set(key, tokens);
  return tokens;
}

export function applyCssVars(tokens) {
  const el = document.documentElement;
  for (const [name, value] of Object.entries(tokens)) {
    if (value != null && value !== '') el.style.setProperty(name, value);
  }
}
