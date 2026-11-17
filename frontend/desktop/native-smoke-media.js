/* Explicit --smoke-test only; all inputs are synthetic. No physical-device claims. */
(async()=>{
 const desktop=SplatDesktop,app=go.main.App,id=desktop.profile.id,checks=[],errors=[],saved=[];
 const wait=async(fn,label)=>{const at=Date.now();while(!fn()){if(Date.now()-at>120000)throw Error('Timed out: '+label);await new Promise(r=>setTimeout(r,75));}};
 const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};
 const report=async(passed,error)=>app.CompleteSmoke(JSON.stringify({passed,profile:id,checks,errors,error:error?String(error.stack||error):null}));
 const deadline=setTimeout(()=>void report(false,Error('Media smoke deadline')),210000);
 const original=desktop.saveBlob;desktop.saveBlob=async(blob,name,details)=>{const ok=await original(blob,name,details);saved.push({blob,name,ok});return ok;};
 try{
  const frame=desktop.frames.get(id);await wait(()=>frame?.contentWindow?.location.pathname===('/solutions/'+id+'/')&&frame?.contentDocument?.readyState==='complete','workspace load');
  const win=frame.contentWindow,doc=win.document;win.addEventListener('error',e=>errors.push(e.message));win.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
  const input=(selector,files)=>{const element=doc.querySelector(selector);if(!element)throw Error('Missing picker '+selector);const transfer=new win.DataTransfer();for(const file of files)transfer.items.add(file);element.files=transfer.files;element.dispatchEvent(new win.Event('change',{bubbles:true}));};
  check(desktop.native,'native Go bridge available');check(!!win.crypto.subtle,'local Web Crypto available');check(!desktop.onlineEnabled,'optional network connections disabled');
  if(id==='audiosplat'){
   await wait(()=>doc.querySelector('#audio-input'),'audio editor ready');
   const bytes=new Uint8Array(16044),view=new DataView(bytes.buffer),text=(at,value)=>[...value].forEach((c,i)=>bytes[at+i]=c.charCodeAt(0));text(0,'RIFF');view.setUint32(4,16036,true);text(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,8000,true);view.setUint32(28,16000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,16000,true);for(let i=0;i<8000;i++)view.setInt16(44+2*i,Math.round(8000*Math.sin(i*2*Math.PI*440/8000)),true);
   input('#audio-input',[new win.File([bytes],'tone.wav',{type:'audio/wav'})]);await wait(()=>doc.querySelectorAll('.clip').length===1&&!desktop.busy,'audio import');check(true,'WAV decoded and inserted into a track');
   doc.querySelector('[data-action="export"][data-format="wav"]').click();await wait(()=>saved.some(s=>s.name.endsWith('.wav'))&&!desktop.busy,'WAV mix native save');const wav=saved.find(s=>s.name.endsWith('.wav'));check(wav.ok,'WAV mix saved through native writer');check(await wav.blob.slice(0,4).text()==='RIFF','WAV export has RIFF header');
   doc.querySelector('[data-action="export"][data-format="mp3"]').click();await wait(()=>saved.some(s=>s.name.endsWith('.mp3'))&&!desktop.busy,'MP3 native save');check(saved.find(s=>s.name.endsWith('.mp3')).blob.size>100,'bundled MP3 encoder produces output');
  }else if(id==='videosplat'){
   await wait(()=>doc.querySelector('.splash-choice button:nth-child(2)'),'video editor ready');doc.querySelector('.splash-choice button:nth-child(2)').click();
   doc.querySelector('[aria-label="Record video"]').click();await wait(()=>doc.querySelector('#recorder-title'),'recorder dialog opens');check(!errors.length,'recorder dialog opens without hook errors');doc.querySelector('[aria-label="Close recorder"]').click();await wait(()=>!doc.querySelector('#recorder-title'),'recorder dialog closes');
   const canvas=doc.createElement('canvas');canvas.width=80;canvas.height=60;canvas.getContext('2d').fillStyle='red';canvas.getContext('2d').fillRect(0,0,80,60);const png=await new Promise(r=>canvas.toBlob(r,'image/png'));
   input('input[accept^="video/"]',[new win.File([png],'native-frame.png',{type:'image/png'})]);await wait(()=>doc.querySelectorAll('.timeline-clip').length===1&&!desktop.busy,'image timeline import');check(true,'local image decoded and placed on timeline');
   await wait(()=>win.SplatMediaSmoke,'bundled encoder test API');const video=await win.SplatMediaSmoke.encode();check(video.size>100,'bundled FFmpeg encodes actual MP4 offline');check(await desktop.saveBlob(video,'native.mp4'),'MP4 saved through native writer');check(await video.slice(4,8).text()==='ftyp','MP4 has ISO base media header');
  }else throw Error('Unknown media profile '+id);
  check(desktop.dirty.length===1,'imported work is marked unsaved');const closing=desktop.requestClose();await wait(()=>document.getElementById('leaveDialog').open,'close warning');document.getElementById('keepWorking').click();check(!await closing,'keep working preserves unsaved workspace');
  desktop.command(id,'save');await wait(()=>saved.some(s=>s.name.endsWith('.'+id+'.json'))&&!desktop.busy,'portable native save');
  const project=saved.find(s=>s.name.endsWith('.'+id+'.json'));check(project.ok,'portable project written through Go');const data=JSON.parse(await project.blob.text());
  if(id==='audiosplat'){check(data.project.app==='AudioSplat','AudioSplat project format preserved');check(data.sources[0].dataUrl.startsWith('data:audio/'),'source audio embedded in portable project');}
  else{check(data.schema==='videosplat-project','VideoSplat project schema preserved');check(data.embeddedMedia[data.assets[0].id].startsWith('data:image/png;base64,'),'source image embedded in portable project');}
  check(!desktop.dirty.length,'completed native project write clears matching edits');
  input(id==='audiosplat'?'#project-input':'input[accept^=".json"]',[new win.File([await project.blob.arrayBuffer()],'reopen.'+id+'.json',{type:'application/json'})]);await wait(()=>!desktop.busy,'project reopen');check(doc.querySelectorAll(id==='audiosplat'?'.clip':'.timeline-clip').length===1,'portable project reopens its editable timeline');
  const databases=await win.indexedDB.databases();check(!databases.some(db=>['audiosplat','videosplat-local','splat-transcription-progress-v1'].includes(db.name)),'no automatic media or transcript recovery database');check(!errors.length,'no JavaScript errors');clearTimeout(deadline);await report(true);
 }catch(error){clearTimeout(deadline);await report(false,error);}
})();
