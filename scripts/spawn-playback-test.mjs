import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const TEST_CONFIG = path.join(ROOT, 'docs/playback-test-config.json');
const RUNTIME_OUT = path.join(ROOT, 'docs/playback-runtime-evidence.json');
const FIX = path.join(ROOT, 'docs/test-fixtures');
const AUDIO = path.join(FIX, 'test-tone.wav');
const VIDEO = path.join(FIX, 'test-sample.mp4');

import { fileURLToPath } from 'url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

function writeMinimalWav(p) {
  const sr = 22050;
  const samples = sr;
  const dataSize = samples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  fs.writeFileSync(p, buf);
}

function writeMinimalMp4(p) {
  const b64Path = path.join(SCRIPT_DIR, 'minimal-test-mp4.b64');
  const b64 = fs.readFileSync(b64Path, 'utf8').trim();
  fs.writeFileSync(p, Buffer.from(b64, 'base64'));
}

function hasFfmpeg() {
  try {
    execSync('where ffmpeg', { stdio: 'ignore', timeout: 5000, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

function ensureVideoFixture(mp4Path) {
  if (hasFfmpeg()) {
    try {
      execSync(
        `ffmpeg -y -f lavfi -i testsrc=duration=1:size=320x240:rate=10 -pix_fmt yuv420p -c:v libx264 "${mp4Path}"`,
        { stdio: 'ignore', timeout: 30000, windowsHide: true }
      );
      if (fs.existsSync(mp4Path) && fs.statSync(mp4Path).size > 500) return mp4Path;
    } catch {}
  }
  writeMinimalMp4(mp4Path);
  return mp4Path;
}

fs.mkdirSync(FIX, { recursive: true });
if (!fs.existsSync(AUDIO) || fs.statSync(AUDIO).size < 100) writeMinimalWav(AUDIO);
ensureVideoFixture(VIDEO);

const config = {
  active: true,
  elementId: 'player',
  outputPath: path.resolve(RUNTIME_OUT).replace(/\\/g, '/'),
  files: {
    audio: path.resolve(AUDIO).replace(/\\/g, '/'),
    video: path.resolve(VIDEO).replace(/\\/g, '/'),
  },
};

fs.mkdirSync(path.dirname(TEST_CONFIG), { recursive: true });
fs.writeFileSync(TEST_CONFIG, JSON.stringify(config, null, 2));

if (fs.existsSync(RUNTIME_OUT)) {
  try {
    fs.unlinkSync(RUNTIME_OUT);
  } catch {}
}

console.log(
  JSON.stringify({
    configReady: true,
    configPath: path.resolve(TEST_CONFIG).replace(/\\/g, '/'),
    outputPath: config.outputPath,
    audioBytes: fs.statSync(AUDIO).size,
    videoBytes: fs.statSync(VIDEO).size,
    timestamp: new Date().toISOString(),
  })
);
process.exit(0);
