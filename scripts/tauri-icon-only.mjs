/**
 * Regenerate Tauri/Windows icons from the Tuner brand mark.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets', 'tuner-icon-1024.png');
const APP_ICON = path.join(ROOT, 'app-icon.png');
const iconsDir = path.join(ROOT, 'src-tauri', 'icons');

if (!fs.existsSync(SRC)) throw new Error(`missing ${SRC}`);
fs.copyFileSync(SRC, APP_ICON);
fs.mkdirSync(iconsDir, { recursive: true });

execSync('npm exec -- tauri icon app-icon.png -o src-tauri/icons', {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 180000,
  stdio: 'inherit',
});

const ico = path.join(iconsDir, 'icon.ico');
if (!fs.existsSync(ico) || fs.statSync(ico).size < 1000) {
  throw new Error('valid icon.ico not produced');
}
console.log(JSON.stringify({
  source: SRC,
  iconIcoBytes: fs.statSync(ico).size,
  iconPngBytes: fs.statSync(path.join(iconsDir, 'icon.png')).size,
}));
