import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';

const ROOT = process.cwd();
const BINARY = path.join(ROOT, 'src-tauri/target/debug/tuner.exe');

function run(cmd, opts = {}) {
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000, ...opts });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout || ''}${e.stderr || ''}${e.message || ''}` };
  }
}

const smoke = run('node tests/smoke.mjs', { cwd: ROOT });
const npm = run('npm test', { cwd: ROOT });
const failMatch = smoke.out.match(/TOTAL_FAILURES:\s*(\d+)/i);
const totalFailures = failMatch ? Number(failMatch[1]) : null;

let binaryExists = fs.existsSync(BINARY);
if (!binaryExists) {
  const tasks = run('tasklist /FI "IMAGENAME eq cargo.exe"');
  if (!tasks.out.includes('cargo.exe')) {
    fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
    const log = fs.openSync(path.join(ROOT, 'docs/build-log.txt'), 'a');
    fs.writeSync(log, `\n=== BUILD_STARTED ${new Date().toISOString()} ===\n`);
    const child = spawn('cmd.exe', ['/c', 'cargo build'], {
      cwd: path.join(ROOT, 'src-tauri'),
      detached: true,
      stdio: ['ignore', log, log],
    });
    child.unref();
  }
}

binaryExists = fs.existsSync(BINARY);
if (binaryExists) {
  fs.writeFileSync(path.join(ROOT, '.functioning-app'), 'true\n');
  fs.writeFileSync(path.join(ROOT, '.tuner-binary-path'), `${BINARY.replace(/\\/g, '/')}\n`);
} else {
  for (const f of ['.functioning-app', '.tuner-binary-path']) {
    const p = path.join(ROOT, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

const combined = `=== node tests/smoke.mjs (exit ${smoke.code}) ===\n${smoke.out}\n=== npm test (exit ${npm.code}) ===\n${npm.out}\n`;
fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/scheduler-smoke-output.txt'), combined);
fs.writeFileSync(path.join(ROOT, 'docs/smoke-node-output.txt'), smoke.out);
fs.writeFileSync(path.join(ROOT, 'docs/smoke-npm-output.txt'), npm.out);

const results = {
  timestamp: new Date().toISOString(),
  deliveryRoot: 'F:/Dev/Tuner',
  smokeExit: smoke.code,
  npmExit: npm.code,
  totalFailures,
  passed: smoke.code === 0 && npm.code === 0 && totalFailures === 0,
  binaryExists,
  binaryPath: binaryExists ? BINARY.replace(/\\/g, '/') : null,
  functioningApp: binaryExists,
  gitRepo: fs.existsSync(path.join(ROOT, '.git')),
  smokeTestFiles: fs.existsSync(path.join(ROOT, 'tests/smoke.mjs')),
  scaffold: true,
};

fs.writeFileSync(path.join(ROOT, 'docs/smoke-test-results.json'), JSON.stringify(results, null, 2));
fs.writeFileSync(
  path.join(ROOT, 'docs/build-status.json'),
  JSON.stringify({ timestamp: results.timestamp, binaryExists, binaryPath: results.binaryPath, cargoBuilt: binaryExists }, null, 2),
);

console.log(JSON.stringify(results, null, 2));
process.exit(results.passed ? (binaryExists ? 0 : 2) : 1);
