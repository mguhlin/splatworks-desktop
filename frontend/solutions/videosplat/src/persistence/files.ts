import { validateProject, type VideoSplatProject } from '../domain/project';
import { loadMedia, saveMedia } from './database';
import { save, stamp, operation } from '../desktop';
export const projectFileName = (p:VideoSplatProject) => `${p.name.replace(/[^a-z0-9-_]+/gi,'-')||'project'}.videosplat.json`;
export const projectFile = (p:VideoSplatProject) => new Blob([JSON.stringify(p,null,2)],{type:'application/json'});
function dataUrl(blob:Blob):Promise<string> { return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(r.error);r.readAsDataURL(blob);}); }
export async function downloadProject(p:VideoSplatProject) {
  const savedStamp=stamp();
  // Snapshot before encoding: editing while a native dialog is open remains dirty.
  const snapshot=structuredClone(p);
  return operation(async()=>{
    const embeddedMedia:Record<string,string>={};let bytes=0;
    for(const asset of snapshot.assets){
      const blob=await loadMedia(asset.id);
      if(!blob)throw Error('Relink missing media before saving a portable project: '+asset.name);
      bytes+=blob.size;if(bytes>256*1024*1024)throw Error('Portable projects support up to 256 MB of source media. Split this project or keep the source files separately.');
      embeddedMedia[asset.id]=await dataUrl(blob);
    }
    return save(new Blob([JSON.stringify({...snapshot,embeddedMedia})],{type:'application/json'}),projectFileName(snapshot),savedStamp);
  });
}
export async function readProject(file:File):Promise<VideoSplatProject> {
  if(file.size>360*1024*1024)throw Error('Project file exceeds the 360 MB limit.');
  const raw=JSON.parse(await file.text());const {embeddedMedia,...manifest}=raw;
  const project=validateProject(manifest);
  const pending:[string,Blob][]=[];let total=0;
  if(embeddedMedia!==undefined){
    if(!embeddedMedia||typeof embeddedMedia!=='object'||Array.isArray(embeddedMedia))throw Error('Invalid embedded media.');
    for(const asset of project.assets){
      const url=embeddedMedia[asset.id];
      if(typeof url!=='string'||!/^data:[a-z0-9.+/-]*;base64,[A-Za-z0-9+/]*={0,2}$/i.test(url))throw Error('Invalid or missing embedded media: '+asset.name);
      const blob=await (await fetch(url)).blob();total+=blob.size;
      if(total>256*1024*1024||blob.size!==asset.size)throw Error('Embedded media size mismatch.');
      pending.push([asset.id,blob]);
    }
  }
  // Commit only after the entire file validates, preserving the open workspace on failure.
  for(const [id,blob] of pending)await saveMedia(id,blob);
  return project;
}
