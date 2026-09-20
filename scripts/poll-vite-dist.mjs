import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const distIndex = path.join(ROOT, 'dist/index.html');
const timeoutMs = Number(process.env.POLL_MS || 55000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const start = Date.now();
while (Date.now() - start < timeoutMs) {
  if (fs.existsSync(distIndex) && fs.statSync(distIndex).size > 100) {
    console.log(JSON.stringify({ found: true, distIndex: distIndex.replace(/\\/g, '/'), waitedMs: Date.now() - start }));
    process.exit(0);
  }
  await sleep(1000);
}
console.log(JSON.stringify({ found: false, waitedMs: Date.now() - start }));
process.exit(1);
