import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

const root = process.cwd();
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const nsisDir = path.join(root, 'src-tauri', 'target', 'release', 'bundle', 'nsis');
if (!fs.existsSync(nsisDir)) {
  console.error('NSIS dir missing:', nsisDir);
  process.exit(1);
}
const files = fs.readdirSync(nsisDir).filter((f) => f.toLowerCase().endsWith('-setup.exe'));
if (!files.length) {
  console.error('No setup exe in', nsisDir);
  process.exit(1);
}
const src = path.join(nsisDir, files.sort().at(-1));
const releases = path.join(root, 'Releases');
fs.mkdirSync(releases, { recursive: true });
const versioned = path.join(releases, `Tuner-Setup-${version}.exe`);
const latest = path.join(releases, 'Tuner-Setup-latest.exe');
fs.copyFileSync(src, versioned);
fs.copyFileSync(src, latest);
const sha256 = createHash('sha256').update(fs.readFileSync(latest)).digest('hex');
const meta = { version, src: path.relative(root, src), versioned: path.relative(root, versioned), latest: path.relative(root, latest), sha256, stagedAt: new Date().toISOString() };
fs.writeFileSync(path.join(releases, 'installer-meta.json'), JSON.stringify(meta, null, 2));
console.log(JSON.stringify(meta));
