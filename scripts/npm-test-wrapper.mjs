import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nodeTests = [
  'tests/theme-validate.test.mjs',
  'tests/theme-shades.test.mjs',
  'tests/theme-persist.test.mjs',
  'tests/theme-api.test.mjs',
  'tests/theme/shades.test.mjs',
  'tests/theme/persistence.test.mjs',
  'tests/theme-browser-glob.test.mjs',
];

function run(cmd, args) {
  return spawnSync(cmd, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    windowsHide: true,
    shell: false,
    cwd: root,
    env: { ...process.env, CI: 'true' },
  });
}

mkdirSync(join(root, 'tests', 'reports'), { recursive: true });
let out = '';
let code = 0;

const theme = run(process.execPath, ['--test', ...nodeTests]);
out += '[node:test]\n' + (theme.stdout || '') + (theme.stderr || '');
if (theme.status !== 0) code = theme.status || 1;

const vitest = run(process.execPath, [join(root, 'scripts', 'run-vitest.mjs')]);
out += '\n[vitest]\n' + (vitest.stdout || '') + (vitest.stderr || '');
if (vitest.status !== 0 && code === 0) code = vitest.status || 1;

const smoke = run(process.execPath, ['tests/smoke.mjs']);
out += '\n[smoke]\n' + (smoke.stdout || '') + (smoke.stderr || '');
if (smoke.status !== 0 && code === 0) code = smoke.status || 1;

const report = [
  'timestamp=' + new Date().toISOString(),
  'exit_code=' + code,
  'node_test=' + (theme.status ?? 'n/a'),
  'vitest=' + (vitest.status ?? 'n/a'),
  'smoke=' + (smoke.status ?? 'n/a'),
  '',
  out,
].join('\n');

if (out) process.stdout.write(out);
try {
  writeFileSync(join(root, 'tests', 'reports', 'test-results.txt'), report, 'utf8');
  writeFileSync(join(root, 'docs', 'npm-test-output.txt'), out, 'utf8');
} catch {}
process.exit(code);
