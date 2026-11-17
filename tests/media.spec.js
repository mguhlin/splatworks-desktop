const {test,expect}=require('@playwright/test');
const {start,png,output}=require('./standalone-helpers');
function wav(){const size=8000,b=Buffer.alloc(44+size*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(size*2,40);for(let i=0;i<size;i++)b.writeInt16LE(Math.round(8000*Math.sin(i*2*Math.PI*440/8000)),44+2*i);return b;}
for(const id of ['audiosplat','videosplat']){
 test(id+' imports local media, saves a portable native project, and protects unsaved work',async({page})=>{
  const {frame,errors,external}=await start(page,id);
  if(id==='audiosplat'){
   await frame.locator('#audio-input').setInputFiles({name:'tone.wav',mimeType:'audio/wav',buffer:wav()});
   await expect(frame.locator('.clip')).toHaveCount(1);
  }else{
   await frame.getByRole('button',{name:'Edit video',exact:false}).click();
   await frame.locator('input[type=file][accept^="video"]').first().setInputFiles({name:'frame.png',mimeType:'image/png',buffer:await png(page)});
   await expect(frame.locator('.timeline-clip')).toHaveCount(1);
  }
  await expect.poll(()=>page.evaluate(()=>SplatDesktop.dirty)).toEqual([id==='audiosplat'?'AudioSplat':'VideoSplat']);
  await page.evaluate(()=>{void SplatDesktop.requestClose()});await expect(page.locator('#leaveDialog')).toBeVisible();await page.locator('#keepWorking').click();
  await page.evaluate(()=>SplatDesktop.command(SplatDesktop.active,'save'));
  await expect.poll(()=>page.evaluate(()=>Object.keys(__files).find(k=>k.endsWith('.json')))).toBeTruthy();
  await expect.poll(()=>page.evaluate(()=>SplatDesktop.busy)).toBe(false);
  const name=await page.evaluate(()=>Object.keys(__files).find(k=>k.endsWith('.json'))),data=JSON.parse((await output(page,name)).toString());
  if(id==='audiosplat'){expect(data.project.tracks[0].clips).toHaveLength(1);expect(data.sources[0].dataUrl).toContain('base64,');}
  else{expect(data.assets).toHaveLength(1);expect(data.embeddedMedia[data.assets[0].id]).toContain('data:image/png;base64,');}
  await expect.poll(()=>page.evaluate(()=>SplatDesktop.dirty)).toEqual([]);
  const db=await frame.locator('body').evaluate(async()=> (await indexedDB.databases()).map(d=>d.name));expect(db).not.toContain(id==='audiosplat'?'audiosplat':'videosplat-local');
  expect(errors).toEqual([]);expect(external).toEqual([]);
 });
 test(id+' cancelled and failed project writes leave edits unsaved',async({page})=>{
  const {frame,errors}=await start(page,id);
  if(id==='audiosplat'){await frame.locator('#audio-input').setInputFiles({name:'tone.wav',mimeType:'audio/wav',buffer:wav()});await expect(frame.locator('.clip')).toHaveCount(1);}
  else{await frame.getByRole('button',{name:'Edit video',exact:false}).click();await frame.getByRole('textbox',{name:'Project name',exact:true}).fill('Unsaved movie');}
  await page.evaluate(()=>{__cancel=true;SplatDesktop.command(SplatDesktop.active,'save')});await expect(page.locator('#desktopStatus')).toContainText('cancelled');expect(await page.evaluate(()=>SplatDesktop.dirty)).toHaveLength(1);
  await page.evaluate(()=>{__cancel=false;__fail=true;SplatDesktop.command(SplatDesktop.active,'save')});await expect(page.locator('#desktopStatus')).toContainText('Synthetic disk full');expect(await page.evaluate(()=>SplatDesktop.dirty)).toHaveLength(1);
  expect(errors).toEqual([]);
 });
}
for(const id of ['audiosplat','videosplat'])test(id+' native smoke verifies encoded media and portable project round trips',async({page})=>{
 test.setTimeout(180000);
 const {errors}=await start(page,id,{smoke:true});
 await expect.poll(()=>page.evaluate(()=>window.__report),{timeout:160000}).toBeTruthy();
 const report=await page.evaluate(()=>window.__report);expect(report,report.error).toMatchObject({passed:true,errors:[]});expect(report.checks.length).toBeGreaterThanOrEqual(10);expect(errors).toEqual([]);
});

for(const id of ['audiosplat','videosplat'])test(id+' keyboard save opens one dialog and preserves independent drafts',async({page})=>{
 const {frame,errors}=await start(page,id);
 if(id==='audiosplat'){await frame.locator('#audio-input').setInputFiles({name:'tone.wav',mimeType:'audio/wav',buffer:wav()});await expect(frame.locator('.clip')).toHaveCount(1);}
 else{await frame.getByRole('button',{name:'Edit video',exact:false}).click();await frame.getByRole('textbox',{name:'Project name',exact:true}).fill('My video');}
 await frame.locator('body').evaluate(()=>SplatMediaSession.retain('transcript'));
 await frame.locator('body').click({position:{x:5,y:5}});
 await page.keyboard.press('Control+s');
 await expect.poll(()=>page.evaluate(()=>window.__saveCalls?.length)).toBe(1);
 await expect.poll(()=>page.evaluate(()=>SplatDesktop.busy)).toBe(false);
 expect(await page.evaluate(()=>SplatDesktop.dirty)).toHaveLength(1);
 await frame.locator('body').evaluate(()=>SplatMediaSession.release('transcript'));
 await expect.poll(()=>page.evaluate(()=>SplatDesktop.dirty)).toEqual([]);
 expect(errors).toEqual([]);
});

test('video recorder opens safely and backdrop dismissal protects its unsaved draft',async({page})=>{
 const {frame,errors}=await start(page,'videosplat');await frame.getByRole('button',{name:'Edit video',exact:false}).click();
 await frame.getByRole('button',{name:'Record video',exact:true}).click();await expect(frame.locator('#recorder-title')).toBeVisible();expect(errors).toEqual([]);
 await frame.locator('body').evaluate(()=>SplatMediaSession.retain('recording'));
 page.once('dialog',dialog=>dialog.dismiss());await frame.locator('.backdrop').click({position:{x:2,y:2}});
 await expect(frame.locator('#recorder-title')).toBeVisible();expect(await page.evaluate(()=>SplatDesktop.dirty)).toEqual(['VideoSplat']);
 await frame.getByRole('button',{name:'Close recorder'}).focus();await page.keyboard.press('Control+s');
 expect(await page.evaluate(()=>window.__saveCalls||[])).toHaveLength(0);
 page.once('dialog',dialog=>dialog.accept());await frame.getByRole('button',{name:'Close recorder'}).click();await expect(frame.locator('#recorder-title')).toHaveCount(0);expect(errors).toEqual([]);
});

test('audio project reopen replaces dirty work and reports a clean saved workspace',async({page})=>{
 const {frame,errors}=await start(page,'audiosplat');await frame.locator('#audio-input').setInputFiles({name:'tone.wav',mimeType:'audio/wav',buffer:wav()});await expect(frame.locator('.clip')).toHaveCount(1);
 await page.evaluate(()=>SplatDesktop.command('audiosplat','save'));await expect.poll(()=>page.evaluate(()=>SplatDesktop.busy)).toBe(false);
 const name=await page.evaluate(()=>Object.keys(__files).find(k=>k.endsWith('.json'))),bytes=await output(page,name);
 await frame.locator('#project-title').fill('Unsaved replacement');await expect.poll(()=>page.evaluate(()=>SplatDesktop.dirty.length)).toBe(1);
 await frame.locator('#project-input').setInputFiles({name:'restore.audiosplat.json',mimeType:'application/json',buffer:bytes});await page.locator('#discardWork').click();
 await expect(frame.locator('#project-title')).not.toHaveValue('Unsaved replacement');await expect.poll(()=>page.evaluate(()=>SplatDesktop.busy)).toBe(false);await expect.poll(()=>page.evaluate(()=>SplatDesktop.dirty)).toEqual([]);expect(errors).toEqual([]);
});

test('corrupt embedded video media cannot replace the current timeline',async({page})=>{
 const {frame,errors}=await start(page,'videosplat');await frame.getByRole('button',{name:'Edit video',exact:false}).click();await frame.locator('input[accept^="video/"]').setInputFiles({name:'frame.png',mimeType:'image/png',buffer:await png(page)});await expect(frame.locator('.timeline-clip')).toHaveCount(1);
 await page.evaluate(()=>SplatDesktop.command('videosplat','save'));await expect.poll(()=>page.evaluate(()=>SplatDesktop.busy)).toBe(false);const name=await page.evaluate(()=>Object.keys(__files).find(k=>k.endsWith('.json'))),data=JSON.parse((await output(page,name)).toString());
 const id=data.assets[0].id,raw=Buffer.from(data.embeddedMedia[id].split(',')[1],'base64');raw[raw.length-1]^=1;data.embeddedMedia[id]='data:image/png;base64,'+raw.toString('base64');data.name='Damaged import';
 await frame.locator('input[accept^=".json"]').setInputFiles({name:'damaged.videosplat.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await expect(frame.locator('footer [role=status]')).toContainText('checksum mismatch');await expect(frame.getByRole('textbox',{name:'Project name',exact:true})).not.toHaveValue('Damaged import');await expect(frame.locator('.timeline-clip')).toHaveCount(1);expect(errors).toEqual([]);
});

test('audio projects reject external source URLs and malformed mixer values',async({page})=>{
 const {frame,errors,external}=await start(page,'audiosplat');await frame.locator('#audio-input').setInputFiles({name:'tone.wav',mimeType:'audio/wav',buffer:wav()});await expect(frame.locator('.clip')).toHaveCount(1);
 await page.evaluate(()=>SplatDesktop.command('audiosplat','save'));await expect.poll(()=>page.evaluate(()=>SplatDesktop.busy)).toBe(false);const name=await page.evaluate(()=>Object.keys(__files).find(k=>k.endsWith('.json'))),valid=JSON.parse((await output(page,name)).toString());
 for(const mode of ['url','pan']){
  const data=structuredClone(valid);data.project.metadata.title='Bad import';if(mode==='url')data.sources[0].dataUrl='https://example.org/private.wav';else data.project.tracks[0].pan=100;
  await frame.locator('#project-input').setInputFiles({name:mode+'.audiosplat.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await expect(frame.locator('#toast')).toContainText('project',{ignoreCase:true});await expect.poll(()=>page.evaluate(()=>SplatDesktop.busy)).toBe(false);await expect(frame.locator('#project-title')).not.toHaveValue('Bad import');
 }
 expect(external).toEqual([]);expect(errors).toEqual([]);
});

test('audio transcript edits survive a cancelled save and rejected dialog close',async({page})=>{
 await page.addInitScript(()=>{
  if(window===top)return;
  window.Worker=class{
   postMessage(){setTimeout(()=>this.onmessage?.({data:{type:'complete',cues:[{start:0,end:.8,text:'Synthetic transcript'}]}}),0)}
   terminate(){}
  };
 });
 const {frame,errors}=await start(page,'audiosplat');await frame.locator('details.menu').first().locator('summary').click();await frame.locator('[data-action="transcribe"]').click();
 await frame.locator('#audio-transcription input[type=file]').first().setInputFiles({name:'tone.wav',mimeType:'audio/wav',buffer:wav()});await frame.locator('#transcription-start').click();
 const text=frame.locator('#audio-transcription textarea').first();await expect(text).toHaveValue('Synthetic transcript');expect(await page.evaluate(()=>SplatDesktop.dirty)).toEqual(['AudioSplat']);
 await page.evaluate(()=>__cancel=true);await frame.locator('#transcription-srt').click();await expect(page.locator('#desktopStatus')).toContainText('cancelled');expect(await page.evaluate(()=>SplatDesktop.dirty)).toEqual(['AudioSplat']);
 await page.evaluate(()=>__cancel=false);await frame.locator('#transcription-srt').click();await expect.poll(()=>page.evaluate(()=>SplatDesktop.busy)).toBe(false);await expect.poll(()=>page.evaluate(()=>SplatDesktop.dirty)).toEqual([]);
 await text.fill('Reviewed transcript');page.once('dialog',dialog=>dialog.dismiss());await frame.locator('[data-dialog-close]').click();await expect(text).toHaveValue('Reviewed transcript');
 page.once('dialog',dialog=>dialog.accept());await frame.locator('[data-dialog-close]').click();await expect(frame.locator('#audio-transcription')).toHaveCount(0);expect(errors).toEqual([]);
});

test('audio keyboard save captures an unblurred project title',async({page})=>{
 const {frame,errors}=await start(page,'audiosplat');await frame.locator('#project-title').fill('Untabbed title');await page.keyboard.press('Control+s');
 const bytes=await output(page,'Untabbed title.audiosplat.json');expect(JSON.parse(bytes.toString()).project.metadata.title).toBe('Untabbed title');expect(errors).toEqual([]);
});

test('video timeline export saves MP4 or explains a missing platform encoder',async({page})=>{
 const {frame,errors}=await start(page,'videosplat');await frame.getByRole('button',{name:'Edit video',exact:false}).click();
 const supported=await frame.locator('body').evaluate(async()=>{
  if(window.VideoEncoder)for(const hardwareAcceleration of ['prefer-hardware','prefer-software'])try{if((await VideoEncoder.isConfigSupported({codec:'avc1.42001f',width:160,height:120,bitrate:4000000,framerate:5,hardwareAcceleration})).supported)return true;}catch{}
  return !!HTMLCanvasElement.prototype.captureStream&&typeof MediaRecorder!=='undefined'&&MediaRecorder.isTypeSupported('video/webm');
 });
 await frame.locator('input[accept^="video/"]').setInputFiles({name:'frame.png',mimeType:'image/png',buffer:await png(page)});await expect(frame.locator('.timeline-clip')).toHaveCount(1);
 await frame.getByRole('menuitem',{name:'File',exact:true}).click();await frame.getByRole('menuitem',{name:'Export video…',exact:true}).click();
 await frame.getByLabel('Export format',{exact:true}).selectOption('mp4');await frame.getByLabel('Export width',{exact:true}).fill('160');await frame.getByLabel('Export height',{exact:true}).fill('120');await frame.getByLabel('Export frame rate',{exact:true}).fill('5');await frame.getByLabel('Export range end',{exact:true}).fill('0.4');await frame.getByLabel('Include timeline audio',{exact:true}).uncheck();await frame.getByRole('button',{name:'Render local MP4',exact:true}).click();
 if(!supported){await expect(frame.getByRole('alert')).toContainText('cannot export a local composition');await expect.poll(()=>page.evaluate(()=>SplatDesktop.busy)).toBe(false);expect(await page.evaluate(()=>Object.keys(__files).some(k=>k.endsWith('.mp4')))).toBe(false);expect(errors).toEqual([]);return;}
 await expect.poll(()=>page.evaluate(()=>Object.keys(__files).find(k=>k.endsWith('.mp4'))),{timeout:60000}).toBeTruthy();await expect.poll(()=>page.evaluate(()=>SplatDesktop.busy)).toBe(false);
 const name=await page.evaluate(()=>Object.keys(__files).find(k=>k.endsWith('.mp4'))),bytes=await output(page,name);expect(bytes.subarray(4,8).toString()).toBe('ftyp');await expect(frame.getByText('Saved to your chosen destination',{exact:false})).toBeVisible();expect(errors).toEqual([]);
});
