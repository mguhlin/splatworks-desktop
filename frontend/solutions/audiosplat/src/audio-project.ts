import {validateProject,type AudioProject} from './types';
/** Validate the portable file boundary before assigning editor state. */
export function validatePortableProject(value:unknown):value is AudioProject {
  if(!validateProject(value))return false;
  const p=value as AudioProject;
  const finite=(v:unknown,min=0)=>typeof v==='number'&&Number.isFinite(v)&&v>=min;
  if(!p.metadata||typeof p.metadata.title!=='string'||!finite(p.metadata.sampleRate,8000)||p.metadata.sampleRate>192000||
     !p.view||!finite(p.view.zoom,Number.MIN_VALUE)||!finite(p.view.scrollTime)||!finite(p.view.playhead)||
     (p.view.loop!==null&&(!Array.isArray(p.view.loop)||p.view.loop.length!==2||!p.view.loop.every(n=>finite(n))||p.view.loop[1]<=p.view.loop[0]))||
     !p.tracks.length||p.tracks.length>1000)return false;
  const tracks=new Set<string>(),clips=new Set<string>();let count=0;
  for(const track of p.tracks){
    if(!track.id||tracks.has(track.id)||typeof track.muted!=='boolean'||typeof track.solo!=='boolean'||
       !finite(track.gain)||!finite(track.pan,-1)||track.pan>1)return false;
    tracks.add(track.id);
    for(const clip of track.clips){
      if(++count>10000||!clip.id||clips.has(clip.id)||typeof clip.name!=='string'||!finite(clip.gain)||!finite(clip.fadeIn)||!finite(clip.fadeOut))return false;
      clips.add(clip.id);
    }
  }
  return true;
}
