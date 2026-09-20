import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Regression guard: src/theme/themeInternal.js loads bundled JSON themes via
 * import.meta.glob, a Vite-only build-time macro — Vite rewrites the call expression
 * itself and never makes `import.meta.glob` a real runtime function. A guard like
 * `typeof import.meta.glob === 'function'` is therefore always false in a real Vite
 * build/dev-server (confirmed live: the dropdown showed only the Dark/Light fallback,
 * not the 31 bundled themes, until this guard was replaced with try/catch). The
 * Node-only test harness elsewhere in this suite never catches this because it
 * imports themeManager.js outside Vite, which takes an always-taken-in-Node fallback
 * path regardless of the guard's correctness. A live Vite SSR execution test would
 * catch it more directly, but the Vite 6 module runner hangs in this environment (see
 * the hang note in scripts/run-vitest.mjs) — so this checks the source directly for
 * the exact anti-pattern instead.
 */
test('theme modules do not runtime-guard import.meta.glob with typeof', () => {
  for (const file of ['src/theme/themeInternal.js', 'src/theme/themeManager.js']) {
    const src = readFileSync(join(root, file), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    assert.doesNotMatch(
      src,
      /typeof\s+import\.meta\.glob/,
      `${file} must not runtime-check typeof import.meta.glob — it is a Vite build-time ` +
        'macro, not a real function, so the check is always false and silently discards ' +
        'the bundled themes. Guard the call with try/catch instead.'
    );
  }
});
