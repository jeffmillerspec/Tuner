const KEY='tuner-data';
const empty=()=>({library:[],playlists:[],queue:[],currentId:null,currentPlaylistId:null});
export function load(){try{return{...empty(),...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return empty()}}
export function save(d){localStorage.setItem(KEY,JSON.stringify(d))}
export function uid(){return crypto.randomUUID()}
export function addTracks(d,tracks){const lib=[...d.library];for(const t of tracks){if(!lib.some(x=>x.path===t.path))lib.push(t)}return{...d,library:lib}}
export function createPlaylist(d,name){if(!name.trim())return d;return{...d,playlists:[...d.playlists,{id:uid(),name:name.trim(),trackIds:[]}]}}
export function deletePlaylist(d,id){return{...d,playlists:d.playlists.filter(p=>p.id!==id)}}
export function addToPlaylist(d,pid,tid){return{...d,playlists:d.playlists.map(p=>p.id===pid&&!p.trackIds.includes(tid)?{...p,trackIds:[...p.trackIds,tid]}:p)}}
export function removeFromPlaylist(d,pid,tid){return{...d,playlists:d.playlists.map(p=>p.id===pid?{...p,trackIds:p.trackIds.filter(x=>x!==tid)}:p)}}
export function reorderPlaylist(d,pid,from,to){return{...d,playlists:d.playlists.map(p=>{if(p.id!==pid)return p;const ids=[...p.trackIds];const[m]=ids.splice(from,1);ids.splice(to,0,m);return{...p,trackIds:ids}})}}
export function loadPlaylistQueue(d,pid){const p=d.playlists.find(x=>x.id===pid);if(!p)return d;return{...d,queue:[...p.trackIds],currentPlaylistId:pid,currentId:p.trackIds[0]||null}}
export function setCurrent(d,id){return{...d,currentId:id}}
export function trackById(d,id){return d.library.find(t=>t.id===id)||null}
