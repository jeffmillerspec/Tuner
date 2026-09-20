import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const outPath = path.join(ROOT, 'docs/cargo-build-latest.txt');

try {
  const out = execSync('cargo build', {
    cwd: path.join(ROOT, 'src-tauri'),
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 85000,
  });
  fs.writeFileSync(outPath, out);
  console.log(JSON.stringify({ cargoExit: 0, captured: true }));
  process.exit(0);
} catch (err) {
  const text = `${err.stdout || ''}\n${err.stderr || ''}`;
  fs.writeFileSync(outPath, text);
  console.log(JSON.stringify({ cargoExit: err.status ?? 1, captured: true, tail: text.split(/\r?\n/).slice(-25).join('\n') }));
  process.exit(err.status ?? 1);
}
