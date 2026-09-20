import fs from 'node:fs';
import path from 'node:path';

function lastExit(log) {
  const matches = [...log.matchAll(/TAURI_BUILD_EXIT:(\d+)/g)];
  return matches.length ? Number(matches.at(-1)[1]) : null;
}

const cleanPath = 'docs/tauri-build-clean.log';
if (fs.existsSync(cleanPath)) {
  const clean = fs.readFileSync(cleanPath, 'utf8');
  const code = lastExit(clean);
  if (code != null) {
    console.log('BUILD_EXIT=' + code + ' log=' + cleanPath);
    process.exit(code === 0 ? 0 : 1);
  }
  if (clean.trim().length > 0) {
    console.log('BUILD_PENDING clean');
    process.exit(2);
  }
}

const nsisDirs = [
  path.join('target', 'release', 'bundle', 'nsis'),
  path.join('src-tauri', 'target', 'release', 'bundle', 'nsis'),
];
for (const nsisDir of nsisDirs) {
  if (!fs.existsSync(nsisDir)) continue;
  for (const f of fs.readdirSync(nsisDir).filter((x) => /\.exe$/i.test(x))) {
    const p = path.join(nsisDir, f);
    const st = fs.statSync(p);
    console.log('NSIS', f, st.size, st.mtime.toISOString());
    if (/0\.4\.0/i.test(f) || st.mtimeMs > Date.now() - 24 * 3600 * 1000) {
      console.log('NSIS_READY', p);
      process.exit(0);
    }
  }
}
console.log('BUILD_PENDING');
process.exit(2);
