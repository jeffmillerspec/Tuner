import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'vite';

/** Copy bundled theme JSON into dist for packaged app asset verification. */
function copyBundledThemesPlugin() {
  return {
    name: 'copy-bundled-themes',
    closeBundle() {
      const src = join(process.cwd(), 'Bundled themes json');
      const dest = join(process.cwd(), 'dist', 'Bundled themes json');
      if (!existsSync(src)) return;
      mkdirSync(dest, { recursive: true });
      cpSync(src, dest, { recursive: true });
    },
  };
}

export default defineConfig({
  base: './',
  clearScreen: false,
  plugins: [copyBundledThemesPlugin()],
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: ['es2021', 'chrome100', 'safari13'],
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
