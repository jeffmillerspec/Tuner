import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const binary = path.join(root, 'src-tauri', 'target', 'debug', 'tuner.exe');
const logPath = path.join(root, 'docs', 'cargo-build-latest.txt');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function cargoRunning() {
  try {
    const out = execSync(
      'tasklist /FI "IMAGENAME eq cargo.exe"',
      { encoding: 'utf8', windowsHide: true }
    );
    return out.toLowerCase().includes('cargo.exe');
  } catch {
    return false;
  }
}

function logTail() {
  try {
    const log = fs.readFileSync(logPath, 'utf8');
    return log.split('\n').slice(-20).join('\n');
  } catch {
    return '';
  }
}

const deadline = Date.now() + 180000;
while (Date.now() < deadline) {
  if (fs.existsSync(binary)) {
    const rel = 'src-tauri/target/debug/tuner.exe';
    console.log(
      JSON.stringify({
        binaryExists: true,
        binaryPath: rel,
        cargoExit: 0,
        logTail: logTail(),
        timestamp: new Date().toISOString(),
      })
    );
    process.exit(0);
  }
  if (!cargoRunning()) {
    break;
  }
  await sleep(5000);
}

const exists = fs.existsSync(binary);
console.log(
  JSON.stringify({
    binaryExists: exists,
    binaryPath: exists ? 'src-tauri/target/debug/tuner.exe' : null,
    cargoExit: exists ? 0 : cargoRunning() ? null : 1,
    logTail: logTail(),
    timestamp: new Date().toISOString(),
  })
);
process.exit(exists ? 0 : 1);
