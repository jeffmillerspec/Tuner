import { execSync } from 'node:child_process';

const attempts = 6;
for (let i = 0; i < attempts; i++) {
  try {
    execSync('node scripts/quick-release-status.mjs', { stdio: 'inherit' });
    process.exit(0);
  } catch (_) {}
  if (i + 1 < attempts) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10000);
  }
}
try {
  execSync('node scripts/quick-release-status.mjs', { stdio: 'inherit' });
} catch (_) {
  process.exit(2);
}
