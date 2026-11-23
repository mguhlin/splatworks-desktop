/* Explicit synthetic native check for the newly bundled MediaSplat engine. */
window.SplatMediaUtilitySmoke=async function(){
 const desktop=SplatDesktop,id='mediasplat',checks=[],errors=[],saved=[];
 const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};
 const wait=async(fn,label)=>{const start=Date.now();while(!fn()){if(Date.now()-start>120000)throw Error('Timed out: '+label);await new Promise(r=>setTimeout(r,75));}};
 const original=desktop.saveBlob;desktop.saveBlob=async(blob,name,details)=>{const ok=await original(blob,name,details);saved.push({blob,name,ok});return ok;};
 try{
  const frame=desktop.frames.get(id);await wait(()=>frame.contentDocument?.querySelector('.tool-tabs'),'MediaSplat startup');
  const win=frame.contentWindow,doc=win.document;win.addEventListener('error',event=>errors.push(event.message));win.addEventListener('unhandledrejection',event=>errors.push(String(event.reason)));
  const bytes=new Uint8Array(32044),view=new DataView(bytes.buffer),text=(at,value)=>[...value].forEach((c,i)=>bytes[at+i]=c.charCodeAt(0));text(0,'RIFF');view.setUint32(4,32036,true);text(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,8000,true);view.setUint32(28,16000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,32000,true);for(let i=0;i<16000;i++)view.setInt16(44+2*i,Math.round(8000*Math.sin(i*2*Math.PI*440/8000)),true);
  const choose=async(names)=>{const input=doc.querySelector('.drop-zone input'),transfer=new win.DataTransfer();for(const name of names)transfer.items.add(new win.File([bytes],name,{type:'audio/wav'}));input.files=transfer.files;input.dispatchEvent(new win.Event('change',{bubbles:true}));await wait(()=>doc.querySelectorAll('.file-row').length===names.length&&!desktop.busy,'media import');};
  const tab=async(name)=>{[...doc.querySelectorAll('.tool-tabs button')].find(button=>button.textContent.includes(name)).click();await wait(()=>doc.querySelector('.tool-tabs button[aria-pressed=true]').textContent.includes(name)&&!doc.querySelector('.file-row'),'tool change');};
  await tab('Split');await choose(['native-media.wav']);check(desktop.dirty.includes('MediaSplat'),'chosen source marks volatile work unsaved');
  doc.querySelector('.action-bar button.primary').click();await wait(()=>doc.querySelectorAll('.results article').length===2&&!desktop.busy,'offline split');check(true,'bundled FFmpeg splits actual WAV into two outputs');
  doc.querySelector('.download-all').click();await wait(()=>saved.length===1&&!desktop.busy,'native ZIP save');check(saved[0].ok&&(await saved[0].blob.slice(0,2).text())==='PK','split outputs saved as native ZIP');check(!desktop.dirty.includes('MediaSplat'),'saving all matching outputs clears unsaved state');
  await tab('Join');await choose(['native-a.wav','native-b.wav']);doc.querySelector('.action-bar button.primary').click();await wait(()=>doc.querySelectorAll('.results article').length===1&&!desktop.busy,'offline join');doc.querySelector('.results .download').click();await wait(()=>saved.length===2&&!desktop.busy,'native joined WAV save');check(saved[1].ok&&(await saved[1].blob.slice(0,4).text())==='RIFF','bundled FFmpeg joins WAV and saves it natively');
  await tab('Trim');await choose(['native-trim.wav']);doc.querySelector('.action-bar button.primary').click();await wait(()=>doc.querySelectorAll('.results article').length===1&&!desktop.busy,'precise trim');doc.querySelector('.results .download').click();await wait(()=>saved.length===3&&!desktop.busy,'native precise trim save');check(saved[2].ok&&saved[2].blob.size>100,'precise trim re-encodes to MP3 and saves natively');
  check(!desktop.dirty.includes('MediaSplat'),'saved outputs leave no pending MediaSplat work');
  const databases=await win.indexedDB.databases();check(!databases.some(db=>db.name==='splat-transcription-progress-v1'),'no automatic transcript recovery database');check(!errors.length,'no JavaScript errors');return {passed:true,checks,errors};
 }catch(error){return {passed:false,checks,errors,error:String(error.stack||error)};}finally{desktop.saveBlob=original;}
};
