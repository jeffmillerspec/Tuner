export function loadBundledJsonRecords() {
  if (typeof import.meta.glob === 'function') {
    const modules = import.meta.glob('../../Bundled themes json/*.json', { eager: true });
    const loaded = Object.entries(modules).map(([path, mod]) => {
      const data = mod.default ?? mod;
      const id = data.id ?? path.split(/[/\\]/).pop().replace(/\.json$/i, '');
      return { ...data, id };
    });
    if (loaded.length) return loaded;
  }
  return [];
}
