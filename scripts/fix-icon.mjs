import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
const ROOT = process.cwd();
const iconsDir = path.join(ROOT, 'src-tauri/icons');
fs.mkdirSync(iconsDir, { recursive: true });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAEklEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync(path.join(ROOT, 'app-icon.png'), png);
try {
  execSync('npx tauri icon app-icon.png -o src-tauri/icons', { cwd: ROOT, encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'] });
} catch (e) {
  console.log('tauri-icon-fallback');
  const ps = `
Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap 32, 32
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(255, 45, 45, 60))
$g.Dispose()
$iconPath = Join-Path '${ROOT.replace(/\\/g, '/')}' 'src-tauri/icons/icon.ico'
$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = [System.IO.File]::Open($iconPath, [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$icon.Dispose()
$bmp.Dispose()
`;
  execSync(`powershell -NoProfile -Command "${ps.replace(/"/g, '\\"')}"`, { cwd: ROOT, timeout: 60000 });
}
const iconPath = path.join(iconsDir, 'icon.ico');
if (!fs.existsSync(iconPath) || fs.statSync(iconPath).size < 100) {
  throw new Error('icon generation failed');
}
console.log(JSON.stringify({ iconPath, iconSize: fs.statSync(iconPath).size }));
