import { spawn } from 'child_process';
import fs from 'fs';
import net from 'net';
import path from 'path';

const ROOT = process.cwd();
const PORT = 1420;
const viteBin = path.join(ROOT, 'node_modules/vite/bin/vite.js');

function portOpen(port) {
  return new Promise((resolve) => {
    const s = net.connect(port, '127.0.0.1');
    s.setTimeout(800);
    s.on('connect', () => {
      s.destroy();
      resolve(true);
    });
    s.on('timeout', () => {
      s.destroy();
      resolve(false);
    });
    s.on('error', () => resolve(false));
  });
}

if (!fs.existsSync(viteBin)) {
  console.log(JSON.stringify({ started: false, error: 'vite bin missing', timestamp: new Date().toISOString() }));
  process.exit(1);
}

if (await portOpen(PORT)) {
  console.log(JSON.stringify({ started: false, port1420Open: true, timestamp: new Date().toISOString() }));
  process.exit(0);
}

const cmd = `"${process.execPath}" "${viteBin}" --port ${PORT} --strictPort --host 127.0.0.1`;
spawn(cmd, { cwd: ROOT, shell: true, detached: true, stdio: 'ignore', windowsHide: true }).unref();
console.log(JSON.stringify({ started: true, port1420Open: false, timestamp: new Date().toISOString() }));
process.exit(0);
