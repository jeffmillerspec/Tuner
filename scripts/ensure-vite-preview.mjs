import fs from 'fs';
import path from 'path';
import net from 'net';
import { spawn, execSync } from 'child_process';

const ROOT = process.cwd();
const PORT = 1420;
const LOG = path.join(ROOT, 'docs/vite-preview.log');

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port }, () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.setTimeout(750, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitPort(ms = 35000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await portOpen(PORT)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

execSync('node scripts/ensure-playback-dist.mjs', {
  cwd: ROOT,
  stdio: 'inherit',
  windowsHide: true,
});

let started = false;
if (!(await portOpen(PORT))) {
  const viteBin = path.join(ROOT, 'node_modules/vite/bin/vite.js');
  if (!fs.existsSync(viteBin)) {
    console.log(JSON.stringify({ port1420Open: false, error: 'vite bin missing', timestamp: new Date().toISOString() }));
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(LOG), { recursive: true });
  const logFd = fs.openSync(LOG, 'w');
  const child = spawn(
    process.execPath,
    [viteBin, 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
    {
      cwd: ROOT,
      detached: true,
      stdio: ['ignore', logFd, logFd],
      windowsHide: true,
    }
  );
  child.unref();
  started = true;
}

const ok = await waitPort(35000);
const out = {
  port1420Open: ok,
  vitePreviewStarted: started,
  logPath: LOG.replace(/\\/g, '/'),
  timestamp: new Date().toISOString(),
};
if (!ok && fs.existsSync(LOG)) {
  out.logTail = fs.readFileSync(LOG, 'utf8').split('\n').slice(-20).join('\n');
}
console.log(JSON.stringify(out));
process.exit(ok ? 0 : 1);
