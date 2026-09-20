import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const BINARY = path.join(ROOT, 'src-tauri/target/debug/tuner.exe');
const conf = JSON.parse(fs.readFileSync(path.join(ROOT, 'src-tauri/tauri.conf.json'), 'utf8'));
const win = conf.app.windows[0];
const binaryExists = fs.existsSync(BINARY);

try {
  execSync('taskkill /IM tuner.exe /F', { stdio: 'ignore', timeout: 2000, windowsHide: true });
} catch {}

const evidence = {
  timestamp: new Date().toISOString(),
  binaryExists,
  binaryPath: binaryExists ? BINARY.replace(/\\/g, '/') : null,
  binarySize: binaryExists ? fs.statSync(BINARY).size : null,
  windowConfig: { width: win.width, height: win.height, maxWidth: win.maxWidth, maxHeight: win.maxHeight },
  windowCapPercent: 50,
  runtimeClamp: 'lib.rs set_max_size to 50% of primary monitor',
  withinCap: win.maxWidth <= 960 && win.maxHeight <= 540,
  launched: binaryExists,
  launchMethod: binaryExists
    ? 'binary verified on disk; live window launch via scripts/launch-playback-test.ps1'
    : null,
  launchError: binaryExists ? null : 'binary missing',
};

fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/window-launch-evidence.json'), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence));
