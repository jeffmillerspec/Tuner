import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundleRoot = path.join(root, 'src-tauri', 'target', 'release', 'bundle');
const logPath = path.join(root, 'docs', 'tauri-build-latest.txt');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function findInstaller() {
  if (!fs.existsSync(bundleRoot)) return null;
  for (const sub of ['nsis', 'msi']) {
    const dir = path.join(bundleRoot, sub);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (/\.(exe|msi)$/i.test(f)) {
        return path.join('src-tauri/target/release/bundle', sub, f).replace(/\\/g, '/');
      }
    }
  }
  return null;
}

function buildRunning() {
  try {
    const out = execSync('tasklist /FI "IMAGENAME eq cargo.exe"', { encoding: 'utf8', windowsHide: true });
    if (out.toLowerCase().includes('cargo.exe')) return true;
    const nodeOut = execSync('tasklist /FI "IMAGENAME eq node.exe"', { encoding: 'utf8', windowsHide: true });
    return nodeOut.toLowerCase().includes('node.exe') && fs.existsSync(logPath) && !/TAURI_BUILD_EXIT:/.test(fs.readFileSync(logPath, 'utf8'));
  } catch {
    return false;
  }
}

function logTail() {
  try {
    return fs.readFileSync(logPath, 'utf8').split('\n').slice(-25).join('\n');
  } catch {
    return '';
  }
}

function readBuildExit() {
  try {
    const m = fs.readFileSync(logPath, 'utf8').match(/TAURI_BUILD_EXIT:(\d+)/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

const deadline = Date.now() + 55000;
while (Date.now() < deadline) {
  const installer = findInstaller();
  const buildExit = readBuildExit();
  if (installer) {
    console.log(JSON.stringify({ installerExists: true, installerPath: installer, buildExit: buildExit ?? 0, logTail: logTail(), timestamp: new Date().toISOString() }));
    process.exit(0);
  }
  if (buildExit !== null) break;
  if (!buildRunning()) break;
  await sleep(5000);
}

const installer = findInstaller();
const buildExit = readBuildExit();
console.log(JSON.stringify({
  installerExists: !!installer,
  installerPath: installer,
  buildExit: buildExit ?? (installer ? 0 : null),
  buildRunning: buildRunning(),
  logTail: logTail(),
  timestamp: new Date().toISOString(),
}));
process.exit(installer && (buildExit === null || buildExit === 0) ? 0 : 1);
