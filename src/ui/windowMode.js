import { LogicalSize } from '@tauri-apps/api/dpi';
import { getCurrentWindow } from '@tauri-apps/api/window';

export const WINDOW_MODE = {
  standard: 'standard',
  focused: 'focused',
};

export const WINDOW_SIZES = {
  standard: { width: 1080, height: 680, minWidth: 720, minHeight: 480 },
  focused: { width: 440, height: 340, minWidth: 360, minHeight: 280 },
};

function isTauriRuntime() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);
}

async function applyNativeSize(mode) {
  if (!isTauriRuntime()) return;
  const size = WINDOW_SIZES[mode] || WINDOW_SIZES.standard;
  const win = getCurrentWindow();
  try {
    await win.setMinSize(new LogicalSize(size.minWidth, size.minHeight));
    await win.setSize(new LogicalSize(size.width, size.height));
    if (mode === WINDOW_MODE.focused) {
      await win.setMaxSize(new LogicalSize(560, 420));
      await win.setAlwaysOnTop(true);
    } else {
      await win.setMaxSize(null);
      await win.setAlwaysOnTop(false);
    }
  } catch {
    /* browser / missing ACL — CSS mode still applies */
  }
}

/**
 * Apply layout class + optional native window resize for focused/standard modes.
 * @param {'standard'|'focused'} mode
 * @param {{ persist?: (mode: string) => void }} [opts]
 */
export async function applyWindowMode(mode, opts = {}) {
  const next = mode === WINDOW_MODE.focused ? WINDOW_MODE.focused : WINDOW_MODE.standard;
  document.documentElement.dataset.windowMode = next;
  document.body.classList.toggle('mode-focused', next === WINDOW_MODE.focused);
  document.body.classList.toggle('mode-standard', next === WINDOW_MODE.standard);
  const btn = document.getElementById('btn-focus-mode');
  if (btn) {
    const focused = next === WINDOW_MODE.focused;
    btn.setAttribute('aria-pressed', focused ? 'true' : 'false');
    btn.title = focused ? 'Expand to full layout' : 'Compact focused window';
    btn.textContent = focused ? 'Expand' : 'Focus';
  }
  opts.persist?.(next);
  await applyNativeSize(next);
  return next;
}

export function getSavedWindowMode(settings) {
  return settings?.windowMode === WINDOW_MODE.focused
    ? WINDOW_MODE.focused
    : WINDOW_MODE.standard;
}
