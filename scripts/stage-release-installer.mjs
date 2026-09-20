import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

const root = process.cwd();
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const nsisDirs = [
  path.join(root, 'target', 'release', 'bundle', 'nsis'),
  path.join(root, 'src-tauri', 'target', 'release', 'bundle', 'nsis'),
];
let best = null;
for (const dir of nsisDirs) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.toLowerCase().endsWith('-setup.exe'))) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (!best || st.mtimeMs > best.mtimeMs) best = { path: p, rel: path.relative(root, p), mtimeMs: st.mtimeMs };
  }
}
if (!best) {
  console.error('No setup exe in', nsisDirs.join(' or '));
  process.exit(1);
}
const releases = path.join(root, 'Releases');
fs.mkdirSync(releases, { recursive: true });
const versioned = path.join(releases, `Tuner-Setup-${version}.exe`);
const latest = path.join(releases, 'Tuner-Setup-latest.exe');
fs.copyFileSync(best.path, versioned);
fs.copyFileSync(best.path, latest);
const sha256 = createHash('sha256').update(fs.readFileSync(latest)).digest('hex');
const meta = { version, src: best.rel, versioned: path.relative(root, versioned), latest: path.relative(root, latest), sha256, stagedAt: new Date().toISOString() };
fs.writeFileSync(path.join(releases, 'installer-meta.json'), JSON.stringify(meta, null, 2));
console.log(JSON.stringify(meta));
