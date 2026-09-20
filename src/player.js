import { convertFileSrc } from '@tauri-apps/api/core';

export function mediaType(p) {
  const l = String(p || '').toLowerCase();
  if (l.startsWith('http://') || l.startsWith('https://')) return 'stream';
  return (l.endsWith('.mp4') || l.endsWith('.webm')) ? 'video' : 'audio';
}

export async function srcFor(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || String(path).startsWith('blob:')) return path;
  try { return convertFileSrc(path); } catch { return path; }
}

/**
 * Play a library track or live radio stream on the shared media element.
 * @param {HTMLMediaElement} el
 * @param {{ path?: string, blobUrl?: string, streamUrl?: string, name?: string }} track
 */
export async function playTrack(el, track) {
  if (!el) return false;
  if (!track) {
    el.removeAttribute('src');
    el.pause();
    return false;
  }
  const url = track.blobUrl || track.streamUrl || (track.path ? await srcFor(track.path) : '');
  if (!url) return false;
  el.src = url;
  el.load();
  try {
    await el.play();
    return true;
  } catch {
    return false;
  }
}

export async function playStream(el, url, { muted = false } = {}) {
  if (!el || !url) return false;
  el.muted = muted;
  el.src = url;
  el.load();
  try {
    await el.play();
    return true;
  } catch {
    // Autoplay policies: retry unmuted only after user gesture (caller handles)
    try {
      el.muted = true;
      await el.play();
      return true;
    } catch {
      return false;
    }
  }
}
