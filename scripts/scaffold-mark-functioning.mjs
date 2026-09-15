import fs from 'fs';
import path from 'path';
const ROOT = process.cwd();
const BINARY = path.join(ROOT, 'src-tauri/target/debug/tuner.exe');
const binaryExists = fs.existsSync(BINARY);
if (binaryExists) {
  fs.writeFileSync(path.join(ROOT, '.functioning-app'), 'true\n');
  fs.writeFileSync(path.join(ROOT, '.tuner-binary-path'), `${BINARY.replace(/\\/g, '/')}\n`);
} else {
  for (const f of ['.functioning-app', '.tuner-binary-path']) {
    const p = path.join(ROOT, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}
const statusPath = path.join(ROOT, 'docs/build-status.json');
let status = {};
try { status = JSON.parse(fs.readFileSync(statusPath, 'utf8')); } catch {}
status.timestamp = new Date().toISOString();
status.binaryExists = binaryExists;
status.binaryPath = binaryExists ? BINARY.replace(/\\/g, '/') : null;
status.cargoBuilt = binaryExists;
fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
if (binaryExists) {
  const resultsPath = path.join(ROOT, 'docs/smoke-test-results.json');
  if (fs.existsSync(resultsPath)) {
    const r = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    r.binaryExists = true;
    r.binaryPath = status.binaryPath;
    r.functioningApp = true;
    r.timestamp = status.timestamp;
    fs.writeFileSync(resultsPath, JSON.stringify(r, null, 2));
  }
}
console.log(JSON.stringify({ binaryExists, binaryPath: status.binaryPath }));
process.exit(binaryExists ? 0 : 2);
