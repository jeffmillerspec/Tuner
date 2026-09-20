import fs from 'fs';
import path from 'path';

const root = process.cwd();
const cargo = fs.readFileSync(path.join(root, 'src-tauri/Cargo.toml'), 'utf8');
const pkg = cargo.match(/^name\s*=\s*"([^"]+)"/m)?.[1] ?? 'tuner';
const debugDir = path.join(root, 'src-tauri/target/debug');

function findBinary() {
  const direct = path.join(debugDir, `${pkg}.exe`);
  if (fs.existsSync(direct)) return direct;
  if (!fs.existsSync(debugDir)) return null;
  const exes = fs.readdirSync(debugDir).filter((f) => f.endsWith('.exe'));
  const match = exes.find((f) => f.toLowerCase() === `${pkg}.exe`.toLowerCase());
  if (match) return path.join(debugDir, match);
  const skip = new Set(['cargo-tauri.exe']);
  const fallback = exes.find((f) => !skip.has(f.toLowerCase()));
  return fallback ? path.join(debugDir, fallback) : null;
}

const binaryPath = findBinary();
const binaryExists = Boolean(binaryPath && fs.statSync(binaryPath).size > 10000);

if (binaryExists) {
  fs.writeFileSync(path.join(root, '.functioning-app'), 'yes\n');
  fs.writeFileSync(path.join(root, '.tuner-binary-path'), binaryPath.replace(/\\/g, '/') + '\n');
  const statusPath = path.join(root, 'docs/build-status.json');
  let status = {};
  if (fs.existsSync(statusPath)) {
    try { status = JSON.parse(fs.readFileSync(statusPath, 'utf8')); } catch { status = {}; }
  }
  status.binaryExists = true;
  status.binaryPath = binaryPath.replace(/\\/g, '/');
  status.functioningApp = true;
  status.timestamp = new Date().toISOString();
  fs.writeFileSync(statusPath, JSON.stringify(status, null, 2) + '\n');
}

console.log(JSON.stringify({ binaryExists, binaryPath: binaryExists ? binaryPath.replace(/\\/g, '/') : null }));
