import { getShadesForTheme, deriveShades, lighten, mixHex } from './shades.js';
import { COLOR_TO_CSS_VAR, FALLBACK_COLORS, DESIGN_DEFAULTS } from './constants.js';

/** Vite inlines bundled JSON via import.meta.glob during dev/build. */
const bundledGlob =
  typeof import.meta !== 'undefined' && typeof import.meta.glob === 'function'
    ? import.meta.glob('../../Bundled themes json/*.json', { eager: true })
    : null;

const BUILTIN_THEMES = [
  { id: 'dark', name: 'Dark', colors: { bgApp: '#0f1117', bgSurface: '#171a22', bgSurfaceAlt: '#1e2330', border: '#2a2f3a', text: '#eeeeee', textMuted: '#888888', accent: '#27d8c7', accentContrast: '#03110f', focus: '#4eeaff' } },
  { id: 'light', name: 'Light', colors: { bgApp: '#f5f6f8', bgSurface: '#ffffff', bgSurfaceAlt: '#eef0f4', border: '#c8ccd4', text: '#1a1d24', textMuted: '#5c6370', accent: '#00796b', accentContrast: '#ffffff', focus: '#005fcc' } },
];

let themeCache = null;
const tokenCache = new Map();

function basenameJson(path) {
  const normalized = String(path).replace(/\\/g, '/');
  const file = normalized.slice(normalized.lastIndexOf('/') + 1);
  return file.replace(/\.json$/i, '');
}

function readBundledFromGlob() {
  if (!bundledGlob) return [];
  return Object.entries(bundledGlob).map(([path, mod]) => {
    const data = mod.default ?? mod;
    const id = data.id ?? basenameJson(path);
    return { ...data, id, name: data.name || data.label || id };
  });
}

async function readBundledThemeRecords() {
  const fromGlob = readBundledFromGlob();
  if (fromGlob.length) return fromGlob;
  if (typeof process !== 'undefined' && process.versions?.node) {
    const mod = await import(/* @vite-ignore */ './themeBundledRecords.node.js');
    const loaded = mod.loadBundledJsonRecords();
    if (loaded.length) return loaded;
  }
  return BUILTIN_THEMES.map((t) => ({ ...t }));
}

export function resetThemeCaches() {
  themeCache = null;
  tokenCache.clear();
}

export async function loadBundledThemes() {
  if (themeCache) return themeCache;
  themeCache = await readBundledThemeRecords();
  return themeCache;
}

export function generateShades(base, bg = '#0f1117') {
  const shades = deriveShades(base, bg, 3.0);
  return { hover: shades.hover, pressed: shades.active, disabled: shades.disabled };
}

export function deriveScrollbar(theme) {
  const colors = theme.colors || theme;
  const track = colors.bgSurfaceAlt ?? colors.surfaceAlt ?? colors.bgSurface ?? colors.surface ?? '#171a22';
  const thumbBase = colors.accent ?? colors.border ?? '#3a4254';
  const shades = generateShades(thumbBase, track);
  return {
    track,
    thumb: mixHex(thumbBase, track, 0.35),
    thumbHover: shades.hover,
    thumbActive: shades.pressed,
    size: DESIGN_DEFAULTS?.scrollbarSize ?? '10px',
    radius: DESIGN_DEFAULTS?.scrollbarRadius ?? '4px',
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
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  for (const [name, value] of Object.entries(tokens)) {
    if (value != null && value !== '') el.style.setProperty(name, value);
  }
}
