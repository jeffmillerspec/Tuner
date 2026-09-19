/** WCAG contrast clamping. */

export function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

const HEX_RE = /^#([0-9A-Fa-f]{6})$/;

export function parseHex(hex) {
  const m = typeof hex === 'string' && hex.match(HEX_RE);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function hexToRgb(hex) {
  return parseHex(hex);
}

export function rgbToHex(r, g, b) {
  const toByte = (v) => Math.round(clamp01(v / 255) * 255);
  return `#${((toByte(r) << 16) | (toByte(g) << 8) | toByte(b)).toString(16).padStart(6, '0')}`;
}

export function mixHex(a, b, amount) {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return a;
  const t = clamp01(amount);
  return rgbToHex(
    ca.r + (cb.r - ca.r) * t,
    ca.g + (cb.g - ca.g) * t,
    ca.b + (cb.b - ca.b) * t,
  );
}

export function lighten(hex, amount) {
  return mixHex(hex, '#ffffff', amount);
}

export function darken(hex, amount) {
  return mixHex(hex, '#000000', amount);
}

export function relativeLuminance(hex) {
  const c = parseHex(hex);
  if (!c) return 0;
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

export function contrastRatio(fg, bg) {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

export function ensureContrast(fg, bg, minRatio = 4.5) {
  if (!parseHex(fg) || !parseHex(bg)) return fg;
  if (contrastRatio(fg, bg) >= minRatio) return fg;
  let cur = fg;
  let best = fg;
  let bestRatio = contrastRatio(fg, bg);
  for (let steps = 0; steps < 24 && contrastRatio(cur, bg) < minRatio; steps += 1) {
    const next = relativeLuminance(bg) > 0.5 ? darken(cur, 0.1) : lighten(cur, 0.1);
    const nextRatio = contrastRatio(next, bg);
    if (nextRatio > bestRatio) { best = next; bestRatio = nextRatio; }
    if (nextRatio >= minRatio) return next;
    cur = next;
  }
  const extreme = contrastRatio('#000000', bg) >= contrastRatio('#ffffff', bg) ? '#000000' : '#ffffff';
  if (contrastRatio(extreme, bg) >= minRatio) return extreme;
  return bestRatio >= contrastRatio(extreme, bg) ? best : extreme;
}

const shadeCache = new Map();

export function deriveShades(baseColor, bg, minRatio = 3.0) {
  const cacheKey = `${baseColor}|${bg}|${minRatio}`;
  if (shadeCache.has(cacheKey)) return shadeCache.get(cacheKey);
  const result = {
    hover: ensureContrast(lighten(baseColor, 0.1), bg, minRatio),
    active: ensureContrast(darken(baseColor, 0.15), bg, minRatio),
    disabled: mixHex(baseColor, bg, 0.55),
  };
  shadeCache.set(cacheKey, result);
  return result;
}

export function getShadesForTheme(theme) {
  const bg = theme.appBackground ?? theme.surface ?? '#000000';
  const accent = theme.accent ?? '#27d8c7';
  const accentShades = deriveShades(accent, bg);
  const thumb = theme.scrollbarThumb ?? accent;
  return {
    accentHover: accentShades.hover,
    accentActive: accentShades.active,
    disabledBg: mixHex(theme.surface ?? bg, bg, 0.5),
    disabledFg: mixHex(theme.textMuted ?? theme.text ?? '#888888', bg, 0.4),
    scrollbarThumbActive: darken(theme.scrollbarThumbHover ?? thumb, 0.12),
  };
}

export function clearShadeCache() {
  shadeCache.clear();
}
