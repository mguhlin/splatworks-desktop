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
