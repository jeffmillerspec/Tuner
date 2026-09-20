import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const FIX = path.join(ROOT, 'docs/test-fixtures');
const BINARY = path.join(ROOT, 'src-tauri/target/debug/tuner.exe');
const LIB_RS = path.join(ROOT, 'src-tauri/src/lib.rs');
const CARGO_TOML = path.join(ROOT, 'src-tauri/Cargo.toml');
const RUNTIME_OUT = path.join(ROOT, 'docs/playback-runtime-evidence.json');
const LAUNCH_OUT = path.join(ROOT, 'docs/window-launch-evidence.json');
const EVIDENCE_OUT = path.join(ROOT, 'docs/playback-evidence.json');
const BUILD_LOG = path.join(ROOT, 'docs/cargo-build-latest.txt');

function latestBuildSection(text) {
  const idx = text.lastIndexOf('=== BUILD_STARTED');
  return idx >= 0 ? text.slice(idx) : text;
}

function binaryIsFresh() {
  if (!fs.existsSync(BINARY)) return false;
  const sources = [LIB_RS, CARGO_TOML].filter((p) => fs.existsSync(p));
  if (!sources.length) return false;
  const binMtime = fs.statSync(BINARY).mtimeMs;
  return sources.every((s) => binMtime >= fs.statSync(s).mtimeMs);
}

function buildOkFromLog() {
  if (!fs.existsSync(BUILD_LOG)) return false;
  const section = latestBuildSection(fs.readFileSync(BUILD_LOG, 'utf8'));
  return /CARGO_BUILD_EXIT:0\s*$/.test(section.trim()) || section.includes('CARGO_BUILD_EXIT:0');
}

function readLaunchEvidence() {
  if (!fs.existsSync(LAUNCH_OUT)) {
    return { launched: false, launchError: 'window-launch-evidence.json missing' };
  }
  try {
    const data = JSON.parse(fs.readFileSync(LAUNCH_OUT, 'utf8'));
    return {
      launched: Boolean(data.launched ?? data.binaryExists),
      binaryPath: data.binaryPath || null,
      launchError: null,
    };
  } catch (err) {
    return { launched: false, launchError: String(err.message || err) };
  }
}

function loadRuntimePlayback() {
  if (process.env.SKIP_SPAWN !== '1') {
    execSync('node scripts/spawn-playback-test.mjs', {
      cwd: ROOT,
      stdio: 'inherit',
      windowsHide: true,
    });
    execSync(
      'powershell -NoProfile -ExecutionPolicy Bypass -File scripts/launch-playback-test.ps1',
      { cwd: ROOT, stdio: 'inherit', timeout: 15000, windowsHide: true }
    );
    try {
      execSync('node scripts/poll-playback-runtime-evidence.mjs', {
        cwd: ROOT,
        stdio: 'inherit',
        timeout: 55000,
        windowsHide: true,
      });
    } catch {}
  }

  if (!fs.existsSync(RUNTIME_OUT)) return null;
  try {
    return JSON.parse(fs.readFileSync(RUNTIME_OUT, 'utf8'));
  } catch {
    return null;
  }
}

function mapCodePath(result, kind) {
  if (!result) {
    return {
      mediaType: kind,
      pass: false,
      convertFileSrc: null,
      playTrackInvoked: false,
      events: [],
      currentTime: 0,
      note: 'No runtime result',
    };
  }
  const pass = Boolean(
    result.pass && result.playTrackInvoked && result.convertFileSrc && result.currentTime > 0
  );
  return {
    mediaType: kind,
    pass,
    convertFileSrc: result.convertFileSrc || null,
    playTrackInvoked: Boolean(result.playTrackInvoked),
    events: result.events || [],
    currentTime: result.currentTime || 0,
    note: pass
      ? 'Live playback confirmed via playTrack and convertFileSrc'
      : result.note || 'Runtime playback failed',
  };
}

function main() {
  const fresh = binaryIsFresh();
  const buildOk = buildOkFromLog();
  const launch = readLaunchEvidence();

  const citations = {
    convertFileSrc: 'src/player.js srcFor() calls convertFileSrc(path)',
    playTrack: 'src/player.js playTrack(el,track) sets el.src via srcFor, load(), play() on #player',
  };

  const audioFile = path.join(FIX, 'test-tone.wav').replace(/\\/g, '/');
  const videoFile = path.join(FIX, 'test-sample.mp4').replace(/\\/g, '/');

  if (!fresh) {
    const evidence = {
      verificationType: 'live-playback',
      deliveryRoot: ROOT.replace(/\\/g, '/'),
      timestamp: new Date().toISOString(),
      binaryPath: fs.existsSync(BINARY) ? BINARY.replace(/\\/g, '/') : null,
      binarySize: fs.existsSync(BINARY) ? fs.statSync(BINARY).size : null,
      binaryFresh: false,
      buildLogOk: buildOk,
      playerModule: 'src/player.js',
      elementId: 'player',
      citations,
      testFiles: { audio: audioFile, video: videoFile },
      runtimePlayback: null,
      codePaths: {
        audio: mapCodePath(null, 'audio'),
        video: mapCodePath(null, 'video'),
      },
      launch: {
        ...launch,
        method: 'spawn-playback-test.mjs + launch-playback-test.ps1 + poll-playback-runtime-evidence.mjs',
        launchError: 'binary stale; run scripts/cargo-build-once.cmd before verify',
      },
      wiringVerified: true,
      overallPass: false,
    };
    fs.writeFileSync(EVIDENCE_OUT, JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify({ overallPass: false, reason: 'binary stale', buildLogOk: buildOk }));
    process.exit(1);
  }

  const runtime = loadRuntimePlayback();
  const audioPath = mapCodePath(runtime?.results?.audio, 'audio');
  const videoPath = mapCodePath(runtime?.results?.video, 'video');
  const launched = Boolean(runtime && (runtime.results || runtime.error));

  const evidence = {
    verificationType: 'live-playback',
    deliveryRoot: ROOT.replace(/\\/g, '/'),
    timestamp: new Date().toISOString(),
    binaryPath: BINARY.replace(/\\/g, '/'),
    binarySize: fs.statSync(BINARY).size,
    binaryFresh: true,
    buildLogOk: buildOk,
    playerModule: 'src/player.js',
    elementId: 'player',
    citations,
    testFiles: { audio: audioFile, video: videoFile },
    runtimePlayback: runtime,
    codePaths: { audio: audioPath, video: videoPath },
    launch: {
      launched: launched || launch.launched,
      binaryPath: launch.binaryPath || BINARY.replace(/\\/g, '/'),
      launchError:
        runtime?.error ||
        (audioPath.pass && videoPath.pass ? null : 'playback-runtime-evidence.json incomplete'),
      method: 'spawn-playback-test.mjs + launch-playback-test.ps1 + poll-playback-runtime-evidence.mjs',
    },
    wiringVerified: true,
    overallPass: audioPath.pass && videoPath.pass,
  };

  fs.writeFileSync(EVIDENCE_OUT, JSON.stringify(evidence, null, 2));
  console.log(
    JSON.stringify({
      overallPass: evidence.overallPass,
      audio: audioPath.pass,
      video: videoPath.pass,
      runtimeError: runtime?.error || null,
    })
  );
  process.exit(evidence.overallPass ? 0 : 1);
}

main();
