import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const reportsDir = join(root, 'tests', 'reports');
const vitestBin = join(root, 'node_modules', 'vitest', 'vitest.mjs');

mkdirSync(reportsDir, { recursive: true });

const result = spawnSync(process.execPath, [vitestBin, 'run', '--reporter=verbose'], {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
  env: { ...process.env, CI: 'true' },
});

const out = (result.stdout || '') + (result.stderr || '');
writeFileSync(join(reportsDir, 'vitest.txt'), out, 'utf8');
if (out) process.stdout.write(out);
process.exit(result.status ?? 1);
