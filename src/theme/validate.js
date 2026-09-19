/**
 * Theme JSON parse + validate against derived bundled schema.
 */
import {
  DEFAULT_THEME_ID,
  FALLBACK_COLORS,
  FALLBACK_THEME_RAW,
  REQUIRED_COLOR_KEYS,
} from './constants.js';

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

function normalizeHex(value, fallback) {
  if (typeof value === 'string' && HEX_RE.test(value)) return value.toLowerCase();
  return fallback;
}

/**
 * Validate raw theme object. Missing/invalid colors fall back without throwing.
 * @returns {{ valid: boolean, errors: string[], theme: object|null }}
 */
export function validateTheme(raw) {
  const errors = [];
  const src = raw && typeof raw === 'object' ? raw : {};

  const id = typeof src.id === 'string' && src.id.trim() ? src.id.trim() : DEFAULT_THEME_ID;
  const name = typeof src.name === 'string' && src.name.trim() ? src.name.trim() : id;

  if (!src.id || typeof src.id !== 'string') errors.push('Missing or invalid id');
  if (!src.name || typeof src.name !== 'string') errors.push('Missing or invalid name');

  const colors = {};
  for (const key of REQUIRED_COLOR_KEYS) {
    const val = src[key];
    if (typeof val !== 'string' || !HEX_RE.test(val)) {
      errors.push(`Invalid or missing color: ${key}`);
      colors[key] = FALLBACK_COLORS[key];
    } else {
      colors[key] = val.toLowerCase();
    }
  }

  const theme = {
    id,
    name,
    colors,
    terminal: src.terminal && typeof src.terminal === 'object' ? src.terminal : undefined,
  };

  return { valid: errors.length === 0, errors, theme };
}

export function parseThemeJson(text) {
  try {
    return validateTheme(JSON.parse(text));
  } catch (e) {
    return { valid: false, errors: [String(e.message || e)], theme: null };
  }
}

export function fallbackTheme() {
  return validateTheme(FALLBACK_THEME_RAW).theme;
}

export function normalizeHexColor(value) {
  return normalizeHex(value, FALLBACK_COLORS.accent);
}
