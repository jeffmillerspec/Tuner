const KEY = 'tuner-data';

function empty() {
  return { library: [], playlists: [], queue: [], currentId: null, settings: {} };
}

export function load() {
  try { return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return empty(); }
}

export function save(data) { localStorage.setItem(KEY, JSON.stringify(data)); }
export function getState() { return load(); }

export function updateSettings(partial) {
  const d = getState();
  const next = { ...d, settings: { ...d.settings, ...partial } };
  save(next);
  return next;
}

export function getThemeId() { return getState().settings?.themeId ?? null; }
export function setThemeId(id) { return updateSettings({ themeId: id }); }

export function uid() {
  return crypto.randomUUID?.() || String(Date.now()) + Math.random().toString(16).slice(2);
}

export function trackById(d, id) { return d.library.find((t) => t.id === id) || null; }
export function addTracks(d, tracks) { return { ...d, library: [...d.library, ...tracks] }; }
export function setCurrent(d, id) { return { ...d, currentId: id }; }
export function createPlaylist(d, name) {
  return { ...d, playlists: [...d.playlists, { id: uid(), name, trackIds: [] }] };
}
export function deletePlaylist(d, pid) {
  return { ...d, playlists: d.playlists.filter((p) => p.id !== pid) };
}
export function renamePlaylist(d, pid, name) {
  return { ...d, playlists: d.playlists.map((p) => (p.id === pid ? { ...p, name } : p)) };
}
export function addToPlaylist(d, pid, tid) {
  return { ...d, playlists: d.playlists.map((p) =>
    p.id === pid && !p.trackIds.includes(tid) ? { ...p, trackIds: [...p.trackIds, tid] } : p) };
}
export function removeFromPlaylist(d, pid, tid) {
  return { ...d, playlists: d.playlists.map((p) =>
    p.id === pid ? { ...p, trackIds: p.trackIds.filter((x) => x !== tid) } : p) };
}
export function reorderPlaylist(d, pid, from, to) {
  return { ...d, playlists: d.playlists.map((p) => {
    if (p.id !== pid) return p;
    const ids = [...p.trackIds];
    if (from < 0 || from >= ids.length || to < 0 || to >= ids.length) return p;
    const [item] = ids.splice(from, 1); ids.splice(to, 0, item);
    return { ...p, trackIds: ids };
  }) };
}
export function loadPlaylistQueue(d, pid) {
  const pl = d.playlists.find((p) => p.id === pid);
  return pl ? { ...d, queue: [...pl.trackIds] } : d;
}
