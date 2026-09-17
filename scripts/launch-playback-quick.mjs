import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const BIN = path.join(ROOT, 'src-tauri/target/debug/tuner.exe');
const CFG = path.join(ROOT, 'docs/playback-test-config.json');

if (!fs.existsSync(BIN)) {
  console.log(JSON.stringify({ launched: false, error: 'binary missing', binaryPath: BIN.replace(/\\/g, '/') }));
  process.exit(1);
}

const child = spawn(BIN, ['--playback-test', '--playback-test-config', CFG], {
  cwd: ROOT,
  detached: true,
  stdio: 'ignore',
  windowsHide: true,
  env: { ...process.env, TUNER_PLAYBACK_TEST: '1', TUNER_PLAYBACK_TEST_CONFIG: CFG },
});
child.unref();
console.log(JSON.stringify({ launched: true, binaryPath: BIN.replace(/\\/g, '/'), configPath: CFG.replace(/\\/g, '/'), timestamp: new Date().toISOString() }));
process.exit(0);
