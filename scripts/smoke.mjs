import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const reportsDir = join(root, 'tests', 'reports');
const PORT = 4173;
const READY_TIMEOUT = 60000;
const quick = process.env.SMOKE_QUICK === '1' || process.argv.includes('--quick');
const skipCi = process.env.SKIP_SMOKE_CI === '1' || quick;
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const log = [];

function note(msg) {
  log.push(msg);
  console.log(msg);
}

function runSync(cmd, args) {
  return spawnSync(cmd, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
}

function waitHttp(url, ms) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const go = () => {
      http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) resolve();
        else retry();
      }).on('error', retry);
    };
    const retry = () => (Date.now() - start > ms ? reject(new Error('readiness timeout')) : setTimeout(go, 300));
    go();
  });
}

function writeReports(code) {
  mkdirSync(reportsDir, { recursive: true });
  writeFileSync(join(reportsDir, 'smoke.log'), log.join('\n'), 'utf8');
  writeFileSync(join(reportsDir, 'test-results.txt'), ['timestamp=' + new Date().toISOString(), 'exit_code=' + code, '', ...log].join('\n'), 'utf8');
}

async function main() {
  let code = 0;
  let preview = null;
  try {
    const depsReady = existsSync(join(root, 'node_modules', 'vite', 'package.json'));
    if (!skipCi && !depsReady) {
      note('[step] npm ci');
      const ci = runSync(npmCmd, ['ci', '--no-fund', '--no-audit']);
      if (ci.status !== 0) throw new Error('npm ci failed');
      note('PASS:npm-ci');
    } else if (depsReady) {
      note('SKIP:npm-ci (node_modules present)');
    }
    if (!quick) {
      note('[step] build');
      const build = runSync(npmCmd, ['run', 'build']);
      if (build.status !== 0) throw new Error('build failed');
      note('PASS:build');
      note('[step] preview');
      const viteBin = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
      preview = spawn(process.execPath, [viteBin, 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore', windowsHide: true });
      await waitHttp('http://127.0.0.1:' + PORT + '/', READY_TIMEOUT);
      note('PASS:preview-ready');
      const res = await fetch('http://127.0.0.1:' + PORT + '/');
      const html = await res.text();
      if (!html.includes('theme-select')) throw new Error('theme-select missing in preview');
      note('PASS:preview-html');
    }
    const { runThemeSwitchSmoke } = await import('../tests/smoke/harness.mjs');
    await runThemeSwitchSmoke();
    note('PASS:theme-switch');
    const stat = runSync(process.execPath, ['tests/smoke.mjs']);
    if (stat.stdout) process.stdout.write(stat.stdout);
    if (stat.status !== 0) throw new Error('static smoke failed');
    note('PASS:static-smoke');
    note('PASS:smoke-complete');
  } catch (err) {
    code = 1;
    note('FAIL:' + (err?.message || String(err)));
  } finally {
    preview?.kill('SIGTERM');
    writeReports(code);
    process.exit(code);
  }
}

main();
