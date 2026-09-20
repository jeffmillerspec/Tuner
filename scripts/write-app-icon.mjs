/**
 * Ensure root app-icon.png is the Tuner brand mark (not a placeholder pixel).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets', 'tuner-icon-1024.png');
const DEST = path.join(ROOT, 'app-icon.png');

if (!fs.existsSync(SRC)) {
  throw new Error(`missing brand source: ${SRC}`);
}
fs.copyFileSync(SRC, DEST);
const st = fs.statSync(DEST);
if (st.size < 10_000) {
  throw new Error(`app-icon.png looks too small (${st.size} bytes) — refusing placeholder`);
}
console.log(JSON.stringify({ appIcon: DEST, bytes: st.size }));
