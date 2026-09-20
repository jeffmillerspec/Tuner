import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const LOG = path.join(ROOT, 'docs/cargo-build-latest.txt');
const LATEST = path.join(ROOT, 'docs/build-log.txt');
const BINARY = path.join(ROOT, 'src-tauri/target/debug/tuner.exe');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readLogs() {
  let text = '';
  for (const p of [LATEST, LOG]) {
    if (fs.existsSync(p)) text += fs.readFileSync(p, 'utf8') + '\n';
  }
  return text;
}

function latestBuildSection(text) {
  const idx = text.lastIndexOf('=== BUILD_STARTED');
  return idx >= 0 ? text.slice(idx) : text;
}

function sectionFailed(section) {
  return /could not compile|error\[E\d+\]:/i.test(section);
}

function sectionFinished(section) {
  return /Finished `dev` profile|Finished `release` profile/.test(section);
}

function readExitFromSection(section) {
  if (sectionFailed(section)) return 1;
  const matches = section.match(/CARGO_BUILD_EXIT:(\d+)/g);
  if (!matches?.length) return sectionFinished(section) ? 0 : null;
  const code = Number(matches[matches.length - 1].split(':')[1]);
  if (code === 0 && sectionFailed(section)) return 1;
  return code;
}

function cargoRunning() {
  try {
    const out = execSync('tasklist /FI "IMAGENAME eq cargo.exe"', { encoding: 'utf8' });
    return out.toLowerCase().includes('cargo.exe');
  } catch {
    return false;
  }
}

const deadline = Date.now() + 85000;
let exitCode = null;
let section = '';
while (Date.now() < deadline) {
  const logs = readLogs();
  section = latestBuildSection(logs);
  exitCode = readExitFromSection(section);
  if (exitCode !== null) break;
  if (!cargoRunning() && section.includes('error:')) {
    exitCode = 1;
    break;
  }
  await sleep(2000);
}

if (exitCode === null) {
  exitCode = sectionFailed(section) ? 1 : null;
}

const result = {
  cargoExit: exitCode,
  binaryExists: fs.existsSync(BINARY),
  binaryPath: fs.existsSync(BINARY) ? 'src-tauri/target/debug/tuner.exe' : null,
  buildFailed: sectionFailed(section),
  buildFinished: sectionFinished(section),
  logTail: section.split('\n').slice(-25).join('\n'),
  timestamp: new Date().toISOString(),
};
console.log(JSON.stringify(result));
process.exit(exitCode === 0 && result.binaryExists ? 0 : 1);
