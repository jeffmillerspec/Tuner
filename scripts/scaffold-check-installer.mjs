import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundleRoot = path.join(root, 'src-tauri', 'target', 'release', 'bundle');
const logPath = path.join(root, 'docs', 'tauri-build-latest.txt');

function findInstaller() {
  if (!fs.existsSync(bundleRoot)) return null;
  for (const sub of ['nsis', 'msi']) {
    const dir = path.join(bundleRoot, sub);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (/\.(exe|msi)$/i.test(f)) return path.join('src-tauri/target/release/bundle', sub, f).replace(/\\/g, '/');
    }
  }
  return null;
}

function cargoRunning() {
  try {
    const out = execSync('tasklist /FI "IMAGENAME eq cargo.exe"', { encoding: 'utf8', windowsHide: true });
    return out.toLowerCase().includes('cargo.exe');
  } catch {
    return false;
  }
}

const log = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
const exitMatch = log.match(/TAURI_BUILD_EXIT:(\d+)/);
const installer = findInstaller();
console.log(JSON.stringify({ installerExists: !!installer, installerPath: installer, buildExit: exitMatch ? Number(exitMatch[1]) : null, buildRunning: cargoRunning(), logTail: log.split('\n').slice(-15).join('\n'), timestamp: new Date().toISOString() }));
process.exit(installer && exitMatch && Number(exitMatch[1]) === 0 ? 0 : installer ? 0 : exitMatch ? Number(exitMatch[1]) : 2);
