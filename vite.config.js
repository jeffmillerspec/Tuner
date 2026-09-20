import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = dirname(fileURLToPath(import.meta.url));
const NODE_LOADER_STUB = '\0tuner-node-theme-loader-stub';

/** Stub node-only theme loader so Vite client build never bundles node:fs. */
function stubNodeThemeLoaderPlugin() {
  return {
    name: 'stub-node-theme-loader',
    enforce: 'pre',
    resolveId(source) {
      if (source.includes('themeBundledRecords.node')) return NODE_LOADER_STUB;
      return null;
    },
    load(id) {
      if (id === NODE_LOADER_STUB) {
        return 'export function loadBundledJsonRecords() { return []; }';
      }
      return null;
    },
  };
}

function copyBundledThemesPlugin() {
  return {
    name: 'copy-bundled-themes',
    closeBundle() {
      const src = join(root, 'Bundled themes json');
      const dest = join(root, 'dist', 'Bundled themes json');
      if (!existsSync(src)) return;
      mkdirSync(dest, { recursive: true });
      cpSync(src, dest, { recursive: true });
    },
  };
}

export default defineConfig({
  root,
  base: './',
  clearScreen: false,
  plugins: [stubNodeThemeLoaderPlugin(), copyBundledThemesPlugin()],
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.vitest.mjs'],
    testTimeout: 30000,
  },
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Cargo writes/replaces these while `tauri dev` compiles in the background;
      // watching them races the build and throws EBUSY on Windows.
      ignored: ['**/target/**', '**/src-tauri/gen/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    outDir: 'dist',
    target: ['es2021', 'chrome100', 'safari13'],
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
