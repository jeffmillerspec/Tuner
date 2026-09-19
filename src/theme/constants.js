/** Canonical theme constants and CSS token map. */
export const DEFAULT_THEME_ID = 'abyssal-console';
export const BUNDLED_THEME_GLOB = '../../Bundled themes json/*.json';

export const REQUIRED_COLOR_KEYS = [
  'appBackground', 'surface', 'surfaceAlt', 'border', 'text', 'textMuted',
  'accent', 'accentContrast', 'focus', 'danger', 'warning', 'success',
  'scrollbarTrack', 'scrollbarThumb', 'scrollbarThumbHover',
];

/** JSON field -> CSS custom property */
export const COLOR_TO_CSS_VAR = {
  appBackground: '--tuner-bg-app',
  surface: '--tuner-bg-surface',
  surfaceAlt: '--tuner-bg-surface-alt',
  border: '--tuner-border',
  text: '--tuner-text',
  textMuted: '--tuner-text-muted',
  accent: '--tuner-accent',
  accentContrast: '--tuner-accent-contrast',
  focus: '--tuner-focus',
  danger: '--tuner-danger',
  warning: '--tuner-warning',
  success: '--tuner-success',
  scrollbarTrack: '--tuner-scrollbar-track',
  scrollbarThumb: '--tuner-scrollbar-thumb',
  scrollbarThumbHover: '--tuner-scrollbar-thumb-hover',
};

/** Non-color design tokens applied with every theme. */
export const DESIGN_DEFAULTS = {
  '--tuner-radius-sm': '4px',
  '--tuner-radius-md': '8px',
  '--tuner-radius-lg': '12px',
  '--tuner-space-xs': '4px',
  '--tuner-space-sm': '6px',
  '--tuner-space-md': '8px',
  '--tuner-space-lg': '12px',
  '--tuner-font-base': '14px',
  '--tuner-font-sm': '12px',
  '--tuner-font-lg': '16px',
  '--tuner-line-base': '1.45',
  '--tuner-line-tight': '1.25',
};

/** Deterministic fallback when bundled JSON is missing or invalid. */
export const FALLBACK_COLORS = {
  appBackground: '#02090e',
  surface: '#05131b',
  surfaceAlt: '#0a202b',
  border: '#164254',
  text: '#dbf2f2',
  textMuted: '#759ca2',
  accent: '#27d8c7',
  accentContrast: '#03110f',
  focus: '#4eeaff',
  danger: '#ff667a',
  warning: '#e7bd5a',
  success: '#50df9b',
  scrollbarTrack: '#041017',
  scrollbarThumb: '#123746',
  scrollbarThumbHover: '#1d596b',
};

export const FALLBACK_THEME_RAW = {
  id: DEFAULT_THEME_ID,
  name: 'Abyssal Console',
  ...FALLBACK_COLORS,
};
