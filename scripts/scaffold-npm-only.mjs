import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
const ROOT = process.cwd();
let out = '';
let code = 1;
try {
  out = execSync('npm test', { cwd: ROOT, encoding: 'utf8', timeout: 45000, stdio: ['ignore', 'pipe', 'pipe'] });
  code = 0;
} catch (e) {
  out = `${e.stdout || ''}${e.stderr || ''}${e.message || ''}`;
  code = e.status ?? 1;
}
fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/smoke-npm-output.txt'), out);
console.log(JSON.stringify({ npmExit: code }));
process.exit(code);
