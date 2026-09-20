import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const distIndex = path.join(ROOT, 'dist/index.html');
const mainJs = path.join(ROOT, 'src/main.js');
const playbackTest = path.join(ROOT, 'src/playback-test.js');

function bundleIncludesPlaybackTest() {
  const assets = path.join(ROOT, 'dist/assets');
  if (!fs.existsSync(assets)) return false;
  for (const f of fs.readdirSync(assets)) {
    if (!f.endsWith('.js')) continue;
    const txt = fs.readFileSync(path.join(assets, f), 'utf8');
    if (txt.includes('get_playback_test_config')) return true;
  }
  return false;
}

function needsBuild() {
  if (!fs.existsSync(distIndex)) return true;
  const distMtime = fs.statSync(distIndex).mtimeMs;
  for (const src of [mainJs, playbackTest]) {
    if (fs.existsSync(src) && fs.statSync(src).mtimeMs > distMtime) return true;
  }
  return !bundleIncludesPlaybackTest();
}

const rebuild = needsBuild();
if (rebuild) {
  execSync('npm run build', { cwd: ROOT, stdio: 'inherit', timeout: 120000, windowsHide: true });
}

console.log(
  JSON.stringify({
    distReady: fs.existsSync(distIndex),
    rebuilt: rebuild,
    bundleIncludesPlaybackTest: bundleIncludesPlaybackTest(),
    timestamp: new Date().toISOString(),
  })
);
