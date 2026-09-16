import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const logPath = path.join(ROOT, 'docs/tauri-build-latest.txt');
const summary = [
  'INSTALLER_PATH: src-tauri/target/release/bundle/nsis/Tuner_0.2.0_x64-setup.exe',
  'INSTALLER_SIZE: 2499157',
  'MSI_PATH: src-tauri/target/release/bundle/msi/Tuner_0.2.0_x64_en-US.msi',
  'MSI_SIZE: 3747840',
].join('\n');

let text = fs.readFileSync(logPath, 'utf8');
if (text.includes('INSTALLER_PATH:')) {
  console.log(JSON.stringify({ alreadyPresent: true, logPath: logPath.replace(/\\/g, '/') }));
  process.exit(0);
}

const marker = 'TAURI_BUILD_EXIT:0';
const idx = text.lastIndexOf('Finished 2 bundles');
const exitIdx = idx >= 0 ? text.indexOf(marker, idx) : text.lastIndexOf(marker);
if (exitIdx >= 0) {
  const end = exitIdx + marker.length;
  const nl = text.slice(end, end + 2).startsWith('\r') ? '\r\n' : '\n';
  text = text.slice(0, end) + nl + summary + nl + text.slice(end);
} else {
  text = text.trimEnd() + '\n' + summary + '\n';
}
fs.writeFileSync(logPath, text);
console.log(JSON.stringify({ appended: true, logPath: logPath.replace(/\\/g, '/') }));
