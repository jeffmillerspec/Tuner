import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const RUNTIME_OUT = path.join(ROOT, 'docs/playback-runtime-evidence.json');
const TIMEOUT_MS = Number(process.env.POLL_MS || 45000);
const INTERVAL_MS = 1000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function killTuner() {
  try {
    execSync('taskkill /IM tuner.exe /F', { stdio: 'ignore', timeout: 2000, windowsHide: true });
  } catch {}
}

function resultReady(data) {
  return Boolean(data?.results?.audio && data?.results?.video);
}

const start = Date.now();
let data = null;
while (Date.now() - start < TIMEOUT_MS) {
  if (fs.existsSync(RUNTIME_OUT)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(RUNTIME_OUT, 'utf8'));
      data = parsed;
      if (resultReady(parsed) || parsed.error) break;
    } catch {}
  }
  await sleep(INTERVAL_MS);
}

killTuner();

const found = resultReady(data);
const out = {
  found,
  waitedMs: Date.now() - start,
  runtimePath: RUNTIME_OUT.replace(/\\/g, '/'),
  error: data?.error || null,
  timestamp: new Date().toISOString(),
};
if (data?.results) {
  out.audio = data.results.audio;
  out.video = data.results.video;
  out.overallPass = Boolean(data.results.audio?.pass && data.results.video?.pass);
}
console.log(JSON.stringify(out));
process.exit(found ? 0 : 1);
