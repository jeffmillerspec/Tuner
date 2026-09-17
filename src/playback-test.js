import { invoke } from '@tauri-apps/api/core';
import { srcFor, playTrack } from './player.js';

const DEFAULT_RUNTIME_OUT = 'F:/Dev/Tuner/docs/playback-runtime-evidence.json';

async function invokeReady(cmd, args = {}, attempts = 60) {
  let lastErr = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await invoke(cmd, args);
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw lastErr || new Error(`${cmd} unavailable`);
}

async function writeEvidence(outputPath, payload) {
  const body = JSON.stringify(payload, null, 2);
  const paths = [...new Set([outputPath, 'docs/playback-runtime-evidence.json', DEFAULT_RUNTIME_OUT])];
  let lastErr = null;
  for (const p of paths) {
    try {
      await invokeReady('write_playback_evidence', { path: p, content: body });
      return p;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('write_playback_evidence failed');
}

function waitEvent(el, event, ms = 30000) {
  return new Promise((resolve, reject) => {
    if (event === 'playing' && !el.paused && el.currentTime > 0) {
      resolve({ event, currentTime: el.currentTime });
      return;
    }
    const t = setTimeout(() => reject(new Error(`timeout:${event}`)), ms);
    el.addEventListener(
      event,
      () => {
        clearTimeout(t);
        resolve({ event, currentTime: el.currentTime });
      },
      { once: true }
    );
  });
}

async function resetPlayer(el) {
  el.pause();
  el.removeAttribute('src');
  el.load();
  await new Promise((r) => setTimeout(r, 300));
}

function preparePlayer(el) {
  el.muted = true;
  el.playsInline = true;
  el.setAttribute('playsinline', '');
  el.setAttribute('muted', '');
}

async function runOne(el, kind, filePath) {
  const events = [];
  const names = ['loadedmetadata', 'canplay', 'playing', 'timeupdate', 'error'];
  for (const name of names) {
    el.addEventListener(name, () => events.push({ event: name, currentTime: el.currentTime }));
  }
  await resetPlayer(el);
  preparePlayer(el);
  const convertFileSrc = await srcFor(filePath);
  const track = { id: `test-${kind}`, name: `test-${kind}`, path: filePath };
  const playTrackInvoked = true;
  const played = await playTrack(el, track);
  if (!played) {
    return {
      pass: false,
      elementId: el.id,
      filePath,
      convertFileSrc,
      playTrackInvoked,
      played,
      events,
      currentTime: el.currentTime,
      error: 'play() returned false',
    };
  }
  try {
    await waitEvent(el, 'playing', 30000);
  } catch (err) {
    if (!(el.currentTime > 0)) {
      return {
        pass: false,
        elementId: el.id,
        filePath,
        convertFileSrc,
        playTrackInvoked,
        played,
        events,
        currentTime: el.currentTime,
        error: String(err?.message || err),
      };
    }
  }
  await new Promise((r) => setTimeout(r, 800));
  const currentTime = el.currentTime;
  el.pause();
  const hasPlaying = events.some((e) => e.event === 'playing');
  const hasProgress = events.some((e) => e.event === 'timeupdate' && e.currentTime > 0);
  return {
    pass: Boolean(played && convertFileSrc && currentTime > 0 && (hasPlaying || hasProgress)),
    elementId: el.id,
    filePath,
    convertFileSrc,
    playTrackInvoked,
    played,
    events,
    currentTime,
  };
}

async function runPlaybackSelfTest() {
  let config;
  const outputFallback = DEFAULT_RUNTIME_OUT;
  try {
    config = await invokeReady('get_playback_test_config');
  } catch (err) {
    await writeEvidence(outputFallback, {
      timestamp: new Date().toISOString(),
      elementId: null,
      error: `get_playback_test_config failed: ${String(err?.message || err)}`,
      results: {},
    });
    return;
  }
  if (!config) {
    await writeEvidence(outputFallback, {
      timestamp: new Date().toISOString(),
      elementId: null,
      error: 'get_playback_test_config returned null',
      results: {},
    });
    return;
  }
  if (config.active !== true) {
    return;
  }
  const elementId = config.elementId || 'player';
  const outputPath = config.outputPath || outputFallback;
  const el = document.getElementById(elementId);
  if (!el) {
    await writeEvidence(outputPath, {
      timestamp: new Date().toISOString(),
      elementId,
      error: `element #${elementId} not found`,
      results: {},
    });
    return;
  }
  preparePlayer(el);
  await writeEvidence(outputPath, {
    timestamp: new Date().toISOString(),
    elementId,
    status: 'started',
    results: {},
  });
  const results = {};
  try {
    results.audio = await runOne(el, 'audio', config.files.audio);
    results.video = await runOne(el, 'video', config.files.video);
    await writeEvidence(outputPath, {
      timestamp: new Date().toISOString(),
      elementId,
      results,
    });
  } catch (err) {
    await writeEvidence(outputPath, {
      timestamp: new Date().toISOString(),
      elementId,
      error: String(err?.message || err),
      results,
    });
  }
}

runPlaybackSelfTest().catch(async (err) => {
  try {
    await writeEvidence(DEFAULT_RUNTIME_OUT, {
      timestamp: new Date().toISOString(),
      elementId: 'player',
      error: String(err?.message || err),
      results: {},
    });
  } catch {}
});

writeEvidence(DEFAULT_RUNTIME_OUT, {
  timestamp: new Date().toISOString(),
  elementId: 'player',
  status: 'module-loaded',
  results: {},
}).catch(() => {});
