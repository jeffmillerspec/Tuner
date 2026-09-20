import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const BINARY = path.join(ROOT, 'src-tauri/target/debug/tuner.exe');

function cargoRunning() {
  try {
    const out = execSync('tasklist /FI "IMAGENAME eq cargo.exe"', {
      encoding: 'utf8',
      windowsHide: true,
    });
    return out.toLowerCase().includes('cargo.exe');
  } catch {
    return false;
  }
}

if (fs.existsSync(BINARY) && fs.statSync(BINARY).size > 10000) {
  console.log(JSON.stringify({ binaryExists: true, action: 'ready', cargoRunning: false }));
  process.exit(0);
}

if (cargoRunning()) {
  console.log(JSON.stringify({ binaryExists: false, action: 'waiting', cargoRunning: true }));
  process.exit(2);
}

execSync('scripts\\cargo-build-background.cmd', { cwd: ROOT, stdio: 'inherit' });
console.log(JSON.stringify({ binaryExists: false, action: 'started', cargoRunning: true }));
process.exit(2);
