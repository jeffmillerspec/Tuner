import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
const ROOT = process.cwd();
let out = '';
let code = 1;
try {
  out = execSync('node tests/smoke.mjs', { cwd: ROOT, encoding: 'utf8', timeout: 45000, stdio: ['ignore', 'pipe', 'pipe'] });
  code = 0;
} catch (e) {
  out = `${e.stdout || ''}${e.stderr || ''}${e.message || ''}`;
  code = e.status ?? 1;
}
fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/smoke-node-output.txt'), out);
const m = out.match(/TOTAL_FAILURES:\s*(\d+)/i);
console.log(JSON.stringify({ smokeExit: code, totalFailures: m ? Number(m[1]) : null }));
process.exit(code);
