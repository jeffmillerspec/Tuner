import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const check = (name, fn) => {
  try { fn(); console.log('PASS:' + name); }
  catch (e) { failures++; console.log('FAIL:' + name + ':' + e.message); }
};
check('package', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (!pkg.scripts?.test) throw new Error('missing test script');
});
check('cargo', () => {
  if (!fs.existsSync(path.join(root, 'src-tauri/Cargo.toml'))) throw new Error('missing Cargo.toml');
});
check('window', () => {
  const conf = JSON.parse(fs.readFileSync(path.join(root, 'src-tauri/tauri.conf.json'), 'utf8'));
  const win = conf.app.windows[0];
  if (win.maxWidth > 960 || win.maxHeight > 540) throw new Error('max too large');
});
check('frontend', () => {
  if (!fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes('Tuner')) throw new Error('missing title');
});
console.log('TOTAL_FAILURES:' + failures);
process.exit(failures ? 1 : 0);
