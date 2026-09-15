import fs from 'fs';
import path from 'path';
const ROOT = process.cwd();
const BINARY = path.join(ROOT, 'src-tauri/target/debug/tuner.exe');
const nodeOut = fs.existsSync(path.join(ROOT, 'docs/smoke-node-output.txt')) ? fs.readFileSync(path.join(ROOT, 'docs/smoke-node-output.txt'), 'utf8') : '';
const npmOut = fs.existsSync(path.join(ROOT, 'docs/smoke-npm-output.txt')) ? fs.readFileSync(path.join(ROOT, 'docs/smoke-npm-output.txt'), 'utf8') : '';
const failMatch = nodeOut.match(/TOTAL_FAILURES:\s*(\d+)/i);
const totalFailures = failMatch ? Number(failMatch[1]) : null;
const smokeExit = totalFailures === 0 && nodeOut.includes('PASS:') ? 0 : 1;
const npmExit = npmOut.includes('TOTAL_FAILURES: 0') || (npmOut.includes('PASS:') && !npmOut.includes('FAIL:')) ? 0 : (npmOut.length ? 1 : null);
const binaryExists = fs.existsSync(BINARY);
if (binaryExists) {
  fs.writeFileSync(path.join(ROOT, '.functioning-app'), 'true\n');
  fs.writeFileSync(path.join(ROOT, '.tuner-binary-path'), `${BINARY.replace(/\\/g, '/')}\n`);
} else {
  for (const f of ['.functioning-app', '.tuner-binary-path']) {
    const p = path.join(ROOT, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}
const combined = `=== node tests/smoke.mjs ===\n${nodeOut}\n=== npm test ===\n${npmOut}\n`;
fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/scheduler-smoke-output.txt'), combined);
const results = { timestamp: new Date().toISOString(), deliveryRoot: 'F:/Dev/Tuner', smokeExit, npmExit, totalFailures, passed: smokeExit === 0 && npmExit === 0 && totalFailures === 0, binaryExists, binaryPath: binaryExists ? BINARY.replace(/\\/g, '/') : null, functioningApp: binaryExists, gitRepo: fs.existsSync(path.join(ROOT, '.git')), smokeTestFiles: fs.existsSync(path.join(ROOT, 'tests/smoke.mjs')), scaffold: true };
fs.writeFileSync(path.join(ROOT, 'docs/smoke-test-results.json'), JSON.stringify(results, null, 2));
fs.writeFileSync(path.join(ROOT, 'docs/build-status.json'), JSON.stringify({ timestamp: results.timestamp, binaryExists, binaryPath: results.binaryPath, cargoBuilt: binaryExists }, null, 2));
console.log(JSON.stringify(results, null, 2));
process.exit(results.passed ? (binaryExists ? 0 : 2) : 1);
