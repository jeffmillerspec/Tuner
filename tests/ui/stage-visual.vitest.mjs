import { describe, it, expect, beforeEach } from 'vitest';
import {
  PLAY_STYLE_ICONS,
  PLAY_STYLE_LABELS,
  setStageVisual,
  clearStageVisual,
  syncStageVisualFromPlayer,
} from '../../src/ui/stageVisual.js';

/** @vitest-environment happy-dom */

describe('stage play-style visuals', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="stage">
        <video id="player"></video>
        <div id="stage-fallback" class="stage-fallback hidden">
          <img id="stage-fallback-icon" class="stage-fallback-icon" alt="" />
          <span id="stage-fallback-label" class="stage-fallback-label"></span>
        </div>
      </div>
    `;
  });

  it('exposes icons and labels for all play styles', () => {
    for (const style of ['mp4', 'radio', 'spotify', 'audius', 'archive', 'podcast']) {
      expect(PLAY_STYLE_ICONS[style]).toMatch(/play-styles[\\/].*\.png/);
      expect(PLAY_STYLE_LABELS[style]).toBeTruthy();
    }
  });

  it('shows style icon when audio has no artwork', () => {
    setStageVisual({ style: 'radio', hasVideo: false });
    const fallback = document.getElementById('stage-fallback');
    const icon = document.getElementById('stage-fallback-icon');
    const label = document.getElementById('stage-fallback-label');
    const stage = document.querySelector('.stage');

    expect(fallback.classList.contains('hidden')).toBe(false);
    expect(stage.classList.contains('stage-has-fallback')).toBe(true);
    expect(stage.dataset.playStyle).toBe('radio');
    expect(icon.classList.contains('is-style-icon')).toBe(true);
    expect(icon.getAttribute('src')).toContain('radio');
    expect(label.textContent).toBe('Radio');
  });

  it('prefers artwork when provided', () => {
    setStageVisual({ style: 'audius', artworkUrl: 'https://example.com/art.jpg', hasVideo: false });
    const icon = document.getElementById('stage-fallback-icon');
    expect(icon.classList.contains('is-artwork')).toBe(true);
    expect(icon.getAttribute('src')).toBe('https://example.com/art.jpg');
  });

  it('hides fallback when hasVideo is true', () => {
    setStageVisual({ style: 'mp4', hasVideo: true });
    expect(document.getElementById('stage-fallback').classList.contains('hidden')).toBe(true);
    expect(document.querySelector('.stage').classList.contains('stage-has-fallback')).toBe(false);
  });

  it('clearStageVisual hides the fallback layer', () => {
    setStageVisual({ style: 'spotify', hasVideo: false });
    clearStageVisual();
    expect(document.getElementById('stage-fallback').classList.contains('hidden')).toBe(true);
  });

  it('syncStageVisualFromPlayer keeps icon when videoWidth is 0', () => {
    const el = document.getElementById('player');
    Object.defineProperty(el, 'videoWidth', { configurable: true, get: () => 0 });
    Object.defineProperty(el, 'videoHeight', { configurable: true, get: () => 0 });
    syncStageVisualFromPlayer(el, 'mp4', '');
    expect(document.getElementById('stage-fallback').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('stage-fallback-label').textContent).toBe('MP4');
  });

  it('syncStageVisualFromPlayer hides icon when frames exist', () => {
    const el = document.getElementById('player');
    Object.defineProperty(el, 'videoWidth', { configurable: true, get: () => 1280 });
    Object.defineProperty(el, 'videoHeight', { configurable: true, get: () => 720 });
    syncStageVisualFromPlayer(el, 'mp4', '');
    expect(document.getElementById('stage-fallback').classList.contains('hidden')).toBe(true);
  });
});
