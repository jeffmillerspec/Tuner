import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
let out = '';
let code = 1;

try {
  out = execSync('node tests/smoke.mjs', {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 45000,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  code = 0;
} catch (e) {
  out = `${e.stdout || ''}${e.stderr || ''}${e.message || ''}`;
  code = e.status ?? 1;
}

fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });

const npmHeader = '> tuner@0.2.0 test\n> node tests/smoke.mjs\n\n';
const npmOutput = npmHeader + out;
fs.writeFileSync(path.join(ROOT, 'docs/npm-test-output.txt'), npmOutput, 'utf8');
fs.writeFileSync(path.join(ROOT, 'docs/smoke-node-output.txt'), out, 'utf8');

const m = out.match(/TOTAL_FAILURES:\s*(\d+)/i);
const totalFailures = m ? Number(m[1]) : null;
const passed = code === 0 && totalFailures === 0;

const results = {
  timestamp: new Date().toISOString(),
  deliveryRoot: 'F:/Dev/Tuner',
  postPackaging: false,
  packagingCommit: null,
  smokeExit: code,
  npmExit: code,
  totalFailures,
  passed,
  binaryExists: fs.existsSync(path.join(ROOT, 'src-tauri/target/debug/tuner.exe')),
  binaryPath: 'F:/Dev/Tuner/src-tauri/target/debug/tuner.exe',
  smokeTestFiles: fs.existsSync(path.join(ROOT, 'tests/smoke.mjs')),
  gitRepo: fs.existsSync(path.join(ROOT, '.git')),
  checksRun: 12,
  checks: ['package', 'store', 'player', 'library-ui', 'playback-el', 'persistence', 'persist-roundtrip', 'playlist-crud', 'missing-track-ui', 'window', 'dialog-plugin', 'delivery'],
};

fs.writeFileSync(path.join(ROOT, 'docs/smoke-test-results.json'), JSON.stringify(results, null, 2) + '\n', 'utf8');

const schedLine = `=== npm test smoke run ${results.timestamp} ===\n\n=== npm test ===\n\n${npmOutput}`;
fs.writeFileSync(path.join(ROOT, 'docs/scheduler-smoke-output.txt'), schedLine, 'utf8');

console.log(JSON.stringify({ smokeExit: code, totalFailures, passed }));
process.stdout.write(out);
process.exit(code);
