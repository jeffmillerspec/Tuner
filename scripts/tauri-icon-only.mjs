import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
const ROOT = process.cwd();
execSync('node scripts/write-app-icon.mjs', { cwd: ROOT, stdio: 'inherit' });
const iconsDir = path.join(ROOT, 'src-tauri/icons');
fs.mkdirSync(iconsDir, { recursive: true });
const bad = path.join(iconsDir, 'icon.ico');
if (fs.existsSync(bad)) fs.unlinkSync(bad);
execSync('npm exec -- tauri icon app-icon.png -o src-tauri/icons', {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 120000,
  stdio: ['ignore', 'pipe', 'pipe'],
});
if (!fs.existsSync(bad) || fs.statSync(bad).size < 1000) {
  throw new Error('valid icon.ico not produced');
}
console.log(JSON.stringify({ iconSize: fs.statSync(bad).size }));
