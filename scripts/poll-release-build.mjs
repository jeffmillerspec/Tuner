import fs from 'node:fs';
import path from 'node:path';

const logs = ['docs/release-build-0.4.0.log', 'docs/tauri-build-0.4.0.log', 'docs/tauri-build-0.3.0.log', 'docs/release-build-0.3.0.log'];
const deadline = Date.now() + 25 * 60 * 1000;
const nsisDir = path.join('src-tauri', 'target', 'release', 'bundle', 'nsis');

function readExit() {
  for (const log of logs) {
    if (!fs.existsSync(log)) continue;
    const text = fs.readFileSync(log, 'utf8');
    const tauri = text.match(/TAURI_BUILD_EXIT:(\d+)/);
    if (tauri) return { kind: 'tauri', code: Number(tauri[1]), log };
    const rel = text.match(/RELEASE_BUILD_EXIT:(\d+)/);
    if (rel) return { kind: 'release', code: Number(rel[1]), log };
  }
  return null;
}

function newestNsis() {
  if (!fs.existsSync(nsisDir)) return null;
  const exes = fs.readdirSync(nsisDir).filter((f) => f.toLowerCase().endsWith('.exe'));
  if (!exes.length) return null;
  let best = null;
  for (const f of exes) {
    const p = path.join(nsisDir, f);
    const st = fs.statSync(p);
    if (!best || st.mtimeMs > best.mtimeMs) best = { file: p, mtimeMs: st.mtimeMs, size: st.size };
  }
  return best;
}

while (Date.now() < deadline) {
  const exit = readExit();
  if (exit) {
    console.log(`POLL:${exit.kind}:exit=${exit.code}:log=${exit.log}`);
    process.exit(exit.code === 0 ? 0 : 1);
  }
  const nsis = newestNsis();
  if (nsis && nsis.mtimeMs > Date.now() - 30 * 60 * 1000 && nsis.size > 500_000) {
    console.log(`POLL:nsis:ready:${nsis.file}:${nsis.size}`);
    process.exit(0);
  }
  const end = Date.now() + 15000;
  while (Date.now() < end) {}
}
console.log('POLL:timeout');
process.exit(1);
