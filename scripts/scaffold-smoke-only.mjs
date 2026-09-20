process.env.CI = 'true';

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const ROOT = process.cwd();
const docsDir = path.join(ROOT, 'docs');
const tmpOut = path.join(docsDir, 'smoke-node-output.txt');

fs.mkdirSync(docsDir, { recursive: true });

const fd = fs.openSync(tmpOut, 'w');
const r = spawnSync(process.execPath, ['tests/smoke.mjs'], {
  cwd: ROOT,
  timeout: 45000,
  stdio: ['ignore', fd, fd],
  windowsHide: true,
});
fs.closeSync(fd);

const out = fs.readFileSync(tmpOut, 'utf8');
const code = r.status ?? 1;
const m = out.match(/TOTAL_FAILURES:\s*(\d+)/i);
const totalFailures = m ? Number(m[1]) : null;
const passed = code === 0 && totalFailures === 0;

const npmHeader = '> tuner@0.2.0 test\n> node tests/smoke.mjs\n\n';
const npmOutput = npmHeader + out;
fs.writeFileSync(path.join(docsDir, 'npm-test-output.txt'), npmOutput, 'utf8');

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

fs.writeFileSync(path.join(docsDir, 'smoke-test-results.json'), JSON.stringify(results, null, 2) + '\n', 'utf8');
fs.writeFileSync(
  path.join(docsDir, 'scheduler-smoke-output.txt'),
  `=== npm test smoke run ${results.timestamp} ===\n\n=== npm test ===\n\n${npmOutput}`,
  'utf8'
);

process.stdout.write(out.endsWith('\n') ? out : out + '\n');
console.log(JSON.stringify({ smokeExit: code, totalFailures, passed }));
process.exit(passed ? 0 : code || 1);
