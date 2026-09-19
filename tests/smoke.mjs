import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runThemeSwitchSmoke } from './smoke/harness.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportsDir = path.join(root, 'tests', 'reports');
const smokeLogPath = path.join(reportsDir, 'smoke.log');
const resultsPath = path.join(reportsDir, 'test-results.txt');

let failures = 0;
const logLines = [];

function log(msg) {
  logLines.push(msg);
  console.log(msg);
}

function check(name, fn) {
  try {
    fn();
    log('PASS:' + name);
  } catch (e) {
    failures++;
    log('FAIL:' + name + ':' + e.message);
  }
}

async function checkAsync(name, fn) {
  try {
    await fn();
    log('PASS:' + name);
  } catch (e) {
    failures++;
    log('FAIL:' + name + ':' + e.message);
  }
}

function writeReports(exitCode) {
  try {
    fs.mkdirSync(reportsDir, { recursive: true });
    fs.writeFileSync(smokeLogPath, logLines.join('\n'), 'utf8');
    const body = [
      'timestamp=' + new Date().toISOString(),
      'exit_code=' + exitCode,
      'smoke_failures=' + failures,
      '',
      ...logLines,
    ].join('\n');
    fs.writeFileSync(resultsPath, body, 'utf8');
  } catch (e) {
    console.error('FAIL:write-reports:' + e.message);
    process.exitCode = 1;
  }
}

async function main() {
  check('smoke-script', () => {
    const p = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    if (!p.scripts?.smoke?.includes('scripts/smoke.mjs')) throw new Error('smoke must use scripts/smoke.mjs');
    if (!p.scripts?.['test:all']) throw new Error('missing test:all');
    if (!fs.existsSync(path.join(root, 'scripts/smoke.mjs'))) throw new Error('scripts/smoke.mjs missing');
  });

  check('theme-unit-files', () => {
    for (const f of ['tests/theme-validate.test.mjs', 'tests/theme-shades.test.mjs', 'tests/theme-persist.test.mjs']) {
      if (!fs.existsSync(path.join(root, f))) throw new Error(f);
    }
  });

  check('vitest-runtime-files', () => {
    for (const f of ['tests/smoke.vitest.mjs', 'tests/theme-queue-scrollbar.vitest.mjs']) {
      if (!fs.existsSync(path.join(root, f))) throw new Error(f);
    }
  });

  check('queue-modern', () => {
    const m = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
    const c = fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8');
    if (!m.includes('queue-item') || !m.includes('setupQueueKeyboard')) throw new Error('queue js');
    if (!c.includes('--tuner-scrollbar-size') || !c.includes('scrollbar-thumb:active')) throw new Error('queue css');
  });

  check('reports-wrapper', () => {
    const w = fs.readFileSync(path.join(root, 'scripts/npm-test-wrapper.mjs'), 'utf8');
    if (!w.includes('test-results.txt') || !w.includes('reports')) throw new Error('report path');
  });

  await checkAsync('theme-switch-runtime', async () => {
    const result = await runThemeSwitchSmoke();
    if (!result.thumbBefore || !result.thumbAfter) throw new Error('scrollbar tokens missing');
  });

  log('TOTAL_FAILURES:' + failures);
  const exitCode = failures ? 1 : 0;
  writeReports(exitCode);
  process.exitCode = exitCode;
}

main().catch((e) => {
  log('FAIL:smoke-fatal:' + e.message);
  failures++;
  log('TOTAL_FAILURES:' + failures);
  writeReports(1);
  process.exitCode = 1;
});
