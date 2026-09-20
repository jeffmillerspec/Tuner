/**
 * Extensible media-connection registry.
 * Add new providers (Apple Music, YouTube Music, …) by implementing the same shape
 * and registering them in `providers`.
 */

/** @typedef {'guest'|'user'|'disconnected'} ConnectionStatus */

/**
 * @typedef {object} ConnectionProvider
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {() => ConnectionStatus} getStatus
 * @property {() => Promise<{ok:boolean, message?:string}>} connectGuest
 * @property {(opts?: object) => Promise<{ok:boolean, message?:string, authUrl?:string}>} connectUser
 * @property {() => Promise<void>} disconnect
 * @property {() => Promise<Array<{id:string,name:string,subtitle?:string,image?:string,externalUrl?:string,embedUrl?:string}>>} listPlaylists
 * @property {(playlistId: string) => Promise<Array<{id:string,name:string,artists?:string,previewUrl?:string,externalUrl?:string}>>} [listTracks]
 */

/** @type {Map<string, ConnectionProvider>} */
const registry = new Map();

export function registerConnection(provider) {
  if (!provider?.id) throw new Error('Connection provider requires id');
  registry.set(provider.id, provider);
  return provider;
}

export function listConnections() {
  return [...registry.values()];
}

export function getConnection(id) {
  return registry.get(id) || null;
}

export function connectionSummary() {
  return listConnections().map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.getStatus(),
  }));
}
