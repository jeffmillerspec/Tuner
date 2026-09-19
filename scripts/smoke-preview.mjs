import { spawn } from 'node:child_process';
import http from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = 4173;
const child = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore', windowsHide: true });
function wait(url, ms) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const go = () => http.get(url, (r) => { r.resume(); if (r.statusCode && r.statusCode < 500) resolve(); else retry(); }).on('error', retry);
    const retry = () => (Date.now() - start > ms ? reject(new Error('timeout')) : setTimeout(go, 250));
    go();
  });
}
(async () => {
  let code = 1;
  try { await wait('http://127.0.0.1:' + port + '/', 20000); code = 0; console.log('PASS:smoke-preview'); }
  catch (e) { console.error('FAIL:smoke-preview:' + e.message); }
  finally { child.kill('SIGTERM'); }
  process.exit(code);
})();
