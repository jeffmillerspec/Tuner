import fs from 'fs';
import path from 'path';
const ROOT = process.cwd();
const src = path.join(ROOT, 'app-icon.png');
if (!fs.existsSync(src)) throw new Error('missing app-icon.png');
const iconsDir = path.join(ROOT, 'src-tauri/icons');
fs.mkdirSync(iconsDir, { recursive: true });
for (const name of ['32x32.png', '128x128.png', '128x128@2x.png', 'icon.png']) {
  fs.copyFileSync(src, path.join(iconsDir, name));
}
console.log('PNG_ICONS_OK');
