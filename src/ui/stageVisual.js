/**
 * Stage fallback visuals for audio-only / no-artwork playback.
 * Shows play-style icons (local, radio, Spotify, Audius, Archive, Podcasts) or linked artwork.
 */

/** @typedef {'mp4' | 'radio' | 'spotify' | 'audius' | 'archive' | 'podcast'} PlayStyle */

export const PLAY_STYLE_ICONS = {
  mp4: new URL('../../assets/play-styles/mp4.png', import.meta.url).href,
  radio: new URL('../../assets/play-styles/radio.png', import.meta.url).href,
  spotify: new URL('../../assets/play-styles/spotify.png', import.meta.url).href,
  audius: new URL('../../assets/play-styles/audius.png', import.meta.url).href,
  archive: new URL('../../assets/play-styles/archive.svg', import.meta.url).href,
  podcast: new URL('../../assets/play-styles/podcast.svg', import.meta.url).href,
};

export const PLAY_STYLE_LABELS = {
  mp4: 'MP4',
  radio: 'Radio',
  spotify: 'Spotify',
  audius: 'Audius',
  archive: 'Archive',
  podcast: 'Podcast',
};

/**
 * @param {{ style?: PlayStyle | string, artworkUrl?: string, hasVideo?: boolean }} opts
 */
export function setStageVisual({ style = 'mp4', artworkUrl = '', hasVideo = false } = {}) {
  const fallback = document.getElementById('stage-fallback');
  const icon = document.getElementById('stage-fallback-icon');
  const label = document.getElementById('stage-fallback-label');
  const stage = document.querySelector('.stage');
  if (!fallback || !icon) return;

  const playStyle = PLAY_STYLE_ICONS[style] ? style : 'mp4';
  const showFallback = !hasVideo;

  fallback.classList.toggle('hidden', !showFallback);
  stage?.classList.toggle('stage-has-fallback', showFallback);
  if (stage) stage.dataset.playStyle = showFallback ? playStyle : '';

  if (!showFallback) {
    icon.removeAttribute('src');
    if (label) label.textContent = '';
    return;
  }

  const art = String(artworkUrl || '').trim();
  const applyStyleIcon = () => {
    icon.onerror = null;
    icon.src = PLAY_STYLE_ICONS[playStyle];
    icon.classList.add('is-style-icon');
    icon.classList.remove('is-artwork');
  };

  if (art) {
    icon.classList.add('is-artwork');
    icon.classList.remove('is-style-icon');
    icon.onerror = () => applyStyleIcon();
    icon.src = art;
  } else {
    applyStyleIcon();
  }

  if (label) label.textContent = PLAY_STYLE_LABELS[playStyle] || playStyle;
}

/** Hide fallback (e.g. Spotify embed already provides chrome). */
export function clearStageVisual() {
  setStageVisual({ hasVideo: true });
}

/**
 * After media metadata loads, hide fallback if the element actually has video frames.
 * @param {HTMLVideoElement | null} el
 * @param {PlayStyle | string} [style]
 * @param {string} [artworkUrl]
 */
export function syncStageVisualFromPlayer(el, style = 'mp4', artworkUrl = '') {
  if (!el) return;
  const hasFrames = Number(el.videoWidth) > 0 && Number(el.videoHeight) > 0;
  setStageVisual({ style, artworkUrl: hasFrames ? '' : artworkUrl, hasVideo: hasFrames });
}
