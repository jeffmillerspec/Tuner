import{convertFileSrc}from '@tauri-apps/api/core';
export function mediaType(p){const l=p.toLowerCase();return(l.endsWith('.mp4')||l.endsWith('.webm'))?'video':'audio'}
export async function srcFor(path){try{return convertFileSrc(path)}catch{return path}}
export async function playTrack(el,track){if(!track){el.removeAttribute('src');el.pause();return false}el.src=track.blobUrl||await srcFor(track.path);el.load();try{await el.play();return true}catch{return false}}
