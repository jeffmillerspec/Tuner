import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const BINARY = path.join(ROOT, 'src-tauri/target/debug/tuner.exe');
const logPath = path.join(ROOT, 'docs/build-log.txt');

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

function logTail() {
  try {
    const text = fs.readFileSync(logPath, 'utf8');
    return text.split(/\r?\n/).slice(-20).join('\n');
  } catch {
    return '';
  }
}

function cargoExit() {
  try {
    const text = fs.readFileSync(logPath, 'utf8');
    const matches = text.match(/CARGO_BUILD_EXIT:(\d+)/g);
    if (!matches || !matches.length) return null;
    const last = matches[matches.length - 1];
    return Number(last.split(':')[1]);
  } catch {
    return null;
  }
}

const binaryExists = fs.existsSync(BINARY) && fs.statSync(BINARY).size > 10000;
console.log(
  JSON.stringify({
    binaryExists,
    binaryPath: binaryExists ? 'src-tauri/target/debug/tuner.exe' : null,
    cargoRunning: cargoRunning(),
    cargoExit: cargoExit(),
    logTail: logTail(),
    timestamp: new Date().toISOString(),
  })
);
process.exit(binaryExists ? 0 : 2);
