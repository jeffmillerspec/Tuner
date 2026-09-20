/**
 * Live radio via Radio Browser API with curated US fallbacks.
 * https://api.radio-browser.info
 */

const API_HOSTS = [
  'https://de1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
];

/** Curated high-quality US streams used when the API is unreachable. */
export const FALLBACK_STATIONS = {
  national: [
    { id: 'fb-npr', name: 'NPR News', tags: 'news,public', country: 'US', region: 'National', favicon: '', url: 'https://npr-ice.streamguys1.com/live.mp3', bitrate: 128 },
    { id: 'fb-bbc', name: 'BBC World Service', tags: 'news,world', country: 'GB', region: 'National', favicon: '', url: 'https://stream.live.vc.bbcmedia.co.uk/bbc_world_service', bitrate: 64 },
    { id: 'fb-kexp', name: 'KEXP 90.3 Seattle', tags: 'indie,alternative', country: 'US', region: 'National', favicon: '', url: 'https://kexp-mp3-128.streamguys1.com/kexp128.mp3', bitrate: 128 },
    { id: 'fb-wfmt', name: 'WFMT Classical', tags: 'classical', country: 'US', region: 'National', favicon: '', url: 'https://wfmt.streamguys1.com/main-mp3', bitrate: 128 },
    { id: 'fb-soma-gs', name: 'SomaFM Groove Salad', tags: 'ambient,electronic', country: 'US', region: 'National', favicon: '', url: 'https://ice1.somafm.com/groovesalad-128-mp3', bitrate: 128 },
    { id: 'fb-soma-dc', name: 'SomaFM Dual Core', tags: 'electronic', country: 'US', region: 'National', favicon: '', url: 'https://ice1.somafm.com/dualcombo-128-mp3', bitrate: 128 },
    { id: 'fb-jazz', name: 'Smooth Jazz Florida', tags: 'jazz', country: 'US', region: 'National', favicon: '', url: 'https://us4.internet-radio.com:8266/stream', bitrate: 128 },
    { id: 'fb-classic-rock', name: 'Classic Rock Florida', tags: 'rock', country: 'US', region: 'National', favicon: '', url: 'https://us4.internet-radio.com:8258/stream', bitrate: 128 },
  ],
  local: [
    { id: 'fb-local-1', name: 'Radio Paradise (Mix)', tags: 'eclectic', country: 'US', region: 'Local', favicon: '', url: 'https://stream.radioparadise.com/aac-320', bitrate: 320 },
    { id: 'fb-local-2', name: 'SomaFM Underground 80s', tags: '80s,new wave', country: 'US', region: 'Local', favicon: '', url: 'https://ice1.somafm.com/u80s-128-mp3', bitrate: 128 },
    { id: 'fb-local-3', name: 'SomaFM Indie Pop', tags: 'indie,pop', country: 'US', region: 'Local', favicon: '', url: 'https://ice1.somafm.com/indiepop-128-mp3', bitrate: 128 },
    { id: 'fb-local-4', name: 'SomaFM Folk Forward', tags: 'folk', country: 'US', region: 'Local', favicon: '', url: 'https://ice1.somafm.com/folkfwd-128-mp3', bitrate: 128 },
  ],
};

function mapStation(s, region) {
  return {
    id: String(s.stationuuid || s.id || s.changeuuid || s.name),
    name: s.name?.trim() || 'Unknown station',
    tags: s.tags || '',
    country: s.countrycode || s.country || '',
    state: s.state || '',
    region,
    favicon: s.favicon || '',
    url: s.url_resolved || s.url || '',
    bitrate: Number(s.bitrate) || 0,
    votes: Number(s.votes) || 0,
  };
}

async function apiGet(path) {
  let lastErr;
  for (const host of API_HOSTS) {
    try {
      const res = await fetch(`${host}${path}`, {
        headers: { 'User-Agent': 'Tuner/0.5.0', Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Radio API unreachable');
}

export async function fetchTopNational(limit = 24) {
  try {
    const data = await apiGet(
      `/json/stations/search?countrycode=US&order=votes&reverse=true&hidebroken=true&limit=${limit}`,
    );
    const list = (Array.isArray(data) ? data : [])
      .filter((s) => (s.url_resolved || s.url) && (s.codec || '').toLowerCase() !== 'unknown')
      .map((s) => mapStation(s, 'National'));
    return list.length ? list : FALLBACK_STATIONS.national;
  } catch {
    return FALLBACK_STATIONS.national;
  }
}

export async function fetchTopLocal(limit = 20, state = '') {
  try {
    const q = state
      ? `/json/stations/search?countrycode=US&state=${encodeURIComponent(state)}&order=votes&reverse=true&hidebroken=true&limit=${limit}`
      : `/json/stations/search?countrycode=US&tag=local&order=votes&reverse=true&hidebroken=true&limit=${limit}`;
    const data = await apiGet(q);
    let list = (Array.isArray(data) ? data : [])
      .filter((s) => s.url_resolved || s.url)
      .map((s) => mapStation(s, 'Local'));
    if (list.length < 4) {
      const top = await apiGet(
        `/json/stations/search?countrycode=US&order=clickcount&reverse=true&hidebroken=true&limit=${limit}`,
      );
      list = (Array.isArray(top) ? top : [])
        .filter((s) => s.url_resolved || s.url)
        .map((s) => mapStation(s, 'Local'));
    }
    return list.length ? list : FALLBACK_STATIONS.local;
  } catch {
    return FALLBACK_STATIONS.local;
  }
}

export const US_STATES = [
  '', 'California', 'New York', 'Texas', 'Florida', 'Illinois', 'Washington',
  'Massachusetts', 'Georgia', 'Colorado', 'Oregon', 'Pennsylvania', 'Ohio',
  'Michigan', 'Arizona', 'Tennessee', 'North Carolina', 'Minnesota',
];
