const{test,expect}=require('@playwright/test');
const{start,png}=require('./standalone-helpers');
const fs=require('fs/promises');
for(const id of ['gifsplat','imagesplat','qrsplat'])test(id+' browser project opens in desktop and returns to browser',async({page,context})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4195/solutions/'+id+'/');
 if(id==='qrsplat'){await expect.poll(()=>page.evaluate(()=>SplatWorkspace.busy)).toBe(false);await page.locator('#qrContent').fill('https://example.org/parity');}
 else{await page.locator(id==='gifsplat'?'#frameInput':'#imageInput').setInputFiles({name:'shared.png',mimeType:'image/png',buffer:await png(page)});await expect(page.locator(id==='gifsplat'?'.frame-row':'#layerList .layer')).toHaveCount(1);}
 const download=page.waitForEvent('download');await page.locator('#desktopSaveProject').click();const file=await download,bytes=await fs.readFile(await file.path());
 const desktop=await context.newPage();const{frame,errors:nativeErrors}=await start(desktop,id);await expect.poll(()=>desktop.evaluate(()=>SplatDesktop.busy)).toBe(false);await frame.locator('#desktopProjectInput').setInputFiles({name:'shared.'+id,mimeType:'application/json',buffer:bytes});await expect(frame.locator(id==='qrsplat'?'#scanMessage':'#statusLine')).toContainText('Opened editable project');
 await frame.locator('#desktopSaveProject').click();await expect.poll(()=>desktop.evaluate(name=>__files[name]?.length,'shared.'+id)).toBeGreaterThan(0);const returned=Buffer.concat((await desktop.evaluate(name=>__files[name],'shared.'+id)).map(s=>Buffer.from(s,'base64')));
 expect(JSON.parse(returned).data).toEqual(JSON.parse(bytes).data);
 page.once('dialog',dialog=>dialog.accept());await page.locator('#desktopProjectInput').setInputFiles({name:'returned.'+id,mimeType:'application/json',buffer:returned});await expect(page.locator(id==='qrsplat'?'#scanMessage':'#statusLine')).toContainText('Opened editable project');expect(errors).toEqual([]);expect(nativeErrors).toEqual([]);
});

test('the browser and desktop use identical editing and project implementations',async()=>{
 const path=require('path'),root=process.env.SPLAT_BROWSER_SOURCE||path.resolve(__dirname,'../../drawsplat_github');
 for(const file of ['solutions/fontsplat/app.mjs','solutions/gifsplat/app.js','solutions/imagesplat/app.js','solutions/qrsplat/app.js','splatworks/shared/project-files.js','splatworks/shared/project-files.css','splatworks/shared/photo-blur.js','solutions/backdropsplat/processor.mjs','solutions/backdropsplat/worker.mjs'])expect(await fs.readFile(path.resolve(__dirname,'../frontend',file),'utf8')).toBe(await fs.readFile(path.join(root,file),'utf8'));
});
