const {test,expect}=require('@playwright/test');
const profiles=require('../profiles.json'),tools=[...require('../tools.json'),...require('../standalone-tools.json')];
const fs=require('fs/promises'),{PNG}=require('pngjs'),jsQR=require('jsqr');
const csp="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; frame-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'";
async function start(page,id){
 const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!/^(http:\/\/127.0.0.1:4194|data:|blob:)/.test(r.url()))external.push(r.url());});
 await page.route('**/app.json',r=>r.fulfill({json:profiles[id]}));await page.route('**/tools.json',r=>r.fulfill({json:tools.filter(t=>t.id===id)}));
 await page.route('**/*',async r=>{if(r.request().resourceType()==='document'){const response=await r.fetch();await r.fulfill({response,headers:{...response.headers(),'content-security-policy':csp}});}else await r.fallback();});
 await page.addInitScript(()=>{if(window!==window.top)return;window.__files={};window.__cancel=false;window.__fail=false;window.go={main:{App:{Version:async()=> 'test',SmokeEnabled:async()=>false,Ready:async()=>{},
 BeginSave:async name=>{if(__cancel)return '';if(__fail)throw Error('Synthetic disk full');__files[name]=[];return name;},AppendSave:async(name,path,data)=>{__files[name].push(data)},FinishSave:async name=>name,CancelSave:async()=>{},QuitWhenSafe:async()=>{}}}};});
 await page.goto('/');await expect(page).toHaveTitle(profiles[id].name);const frame=page.frameLocator('#tool-'+id);await expect(frame.locator('body')).toBeVisible();return{frame,errors,external};
}
async function png(page,color='red'){return Buffer.from(await page.evaluate(color=>{const c=document.createElement('canvas');c.width=80;c.height=60;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,80,60);ctx.fillStyle=color;ctx.fillRect(20,20,40,20);return c.toDataURL().split(',')[1]},color),'base64');}
async function output(page,name){await expect.poll(()=>page.evaluate(name=>__files[name]?.join('').length,name)).toBeGreaterThan(0);return Buffer.concat((await page.evaluate(name=>__files[name],name)).map(b=>Buffer.from(b,'base64')));}

test('standalone GIF preserves frame timing, save cancellation, and newer edits',async({page})=>{
 const{frame,errors,external}=await start(page,'gifsplat');
 await frame.locator('#frameInput').setInputFiles([{name:'red.png',mimeType:'image/png',buffer:await png(page)},{name:'blue.png',mimeType:'image/png',buffer:await png(page,'blue')}]);await expect(frame.locator('.frame-row')).toHaveCount(2);
 await frame.locator('#delayInput').fill('200');await frame.locator('#generateBtn').click();await expect(frame.locator('#downloadBtn')).toBeEnabled();
 await page.evaluate(()=>__cancel=true);await frame.locator('#downloadBtn').click();await expect(frame.locator('#statusLine')).toContainText('cancelled');expect(await page.evaluate(()=>SplatDesktop.dirty)).toContain('GIFsplat');
 await page.evaluate(()=>{__cancel=false;__fail=true});await frame.locator('#downloadBtn').click();await expect(frame.locator('#statusLine')).toContainText('Synthetic disk full');
 await page.evaluate(()=>__fail=false);await frame.locator('#downloadBtn').click();const bytes=await output(page,'GIFsplat-animation.gif');expect(bytes.subarray(0,6).toString()).toBe('GIF89a');expect(bytes.readUInt16LE(6)).toBe(80);
 await expect.poll(()=>page.evaluate(()=>SplatDesktop.dirty)).toEqual([]);
 await frame.locator('#delayInput').fill('350');await frame.locator('#downloadBtn').click();await expect.poll(()=>page.evaluate(()=>SplatDesktop.dirty)).toEqual(['GIFsplat']);
 await frame.locator('#resetBtn').click();await expect(page.locator('#leaveDialog')).toBeVisible();await page.locator('#keepWorking').click();await expect(frame.locator('.frame-row')).toHaveCount(2);
 await expect(frame.locator('#recordVideoBtn')).toBeHidden();expect(errors).toEqual([]);expect(external).toEqual([]);
});

test('standalone QR exports decode to the requested content and excludes Wi-Fi passwords from saved designs',async({page})=>{
 const{frame,errors,external}=await start(page,'qrsplat');await expect(frame.locator('#qrPreview svg')).toBeVisible();await expect.poll(()=>page.evaluate(()=>SplatDesktop.busy)).toBe(false);
 await frame.locator('#qrContent').fill('https://example.org/standalone');await frame.locator('#designName').fill('QR test');await frame.locator('#downloadPng').click();
 const qrBytes=await output(page,'qr-test.png');await test.info().attach('standard-qr.png',{body:qrBytes,contentType:'image/png'});const image=PNG.sync.read(qrBytes);expect(jsQR(new Uint8ClampedArray(image.data),image.width,image.height).data).toBe('https://example.org/standalone');
 await frame.locator('#downloadSvg').click();expect((await output(page,'qr-test.svg')).toString()).toContain('<svg');
 await frame.locator('#contentType').selectOption('wifi');await frame.locator('#wifiName').fill('Library;Guest');await frame.locator('#wifiPassword').fill('read:more');await frame.locator('#saveDesign').click();
 expect(await frame.locator('body').evaluate(()=>localStorage.getItem('qrsplat.designs.v1'))).not.toContain('read:more');
 await frame.locator('#designName').fill('WiFi QR');await frame.locator('#downloadPng').click();const wifiBytes=await output(page,'wifi-qr.png');await test.info().attach('wifi-qr.png',{body:wifiBytes,contentType:'image/png'});const wifi=PNG.sync.read(wifiBytes);expect(jsQR(new Uint8ClampedArray(wifi.data),wifi.width,wifi.height).data).toBe('WIFI:T:WPA;S:Library\\;Guest;P:read\\:more;H:false;');
 await frame.locator('#wifiPassword').fill('keep this edit');const design=await frame.locator('#savedDesigns option').last().getAttribute('value');await frame.locator('#savedDesigns').selectOption(design);await expect(page.locator('#leaveDialog')).toBeVisible();await page.locator('#keepWorking').click();await expect(frame.locator('#wifiPassword')).toHaveValue('keep this edit');
 await expect(frame.locator('#backendSetup')).toBeHidden();await expect(frame.locator('[data-mode="editable"]')).toBeHidden();expect(errors).toEqual([]);expect(external).toEqual([]);
});

test('standalone ImageSplat exports exact artwork and performs background removal offline',async({page})=>{
 const{frame,errors,external}=await start(page,'imagesplat');await frame.locator('#imageInput').setInputFiles({name:'white-red.png',mimeType:'image/png',buffer:await png(page)});await expect(frame.locator('#layerList .layer')).toHaveCount(1);
 await frame.locator('[data-action="exportPng"]').first().evaluate(b=>b.click());let image=PNG.sync.read(await output(page,'ImageSplat.png'));expect([image.width,image.height]).toEqual([80,60]);expect([...image.data.subarray(0,4)]).toEqual([255,255,255,255]);
 await frame.locator('[data-action="removeBg"]').first().evaluate(b=>b.click());await expect(frame.locator('#bs-mode')).toHaveValue('white');await frame.locator('#bs-process').click();await expect(frame.locator('#bs-apply')).toBeEnabled();await frame.locator('#bs-apply').click();await expect(frame.locator('#bs-process')).toHaveCount(0);
 await frame.locator('[data-action="exportPng"]').first().evaluate(b=>b.click());await expect.poll(()=>page.evaluate(()=>SplatDesktop.busy)).toBe(false);image=PNG.sync.read(await output(page,'ImageSplat.png'));expect([image.width,image.height]).toEqual([80,60]);expect(image.data[3]).toBe(0);expect(image.data[(30*80+40)*4+3]).toBe(255);
 await frame.locator('[data-action="duplicate"]').first().evaluate(b=>b.click());await expect(frame.locator('#layerList .layer')).toHaveCount(2);await frame.locator('[data-action="clear"]').first().evaluate(b=>b.click());await expect(page.locator('#leaveDialog')).toBeVisible();await page.locator('#keepWorking').click();await expect(frame.locator('#layerList .layer')).toHaveCount(2);
 expect(errors).toEqual([]);expect(external).toEqual([]);
});

test('standalone CipherSplat keeps its CS4 file format and uses the shared native save',async({page})=>{
 const{frame,errors,external}=await start(page,'ciphersplat');await frame.locator('#password').fill('standalone format test');await frame.locator('#fileInput').setInputFiles({name:'sample.txt',mimeType:'text/plain',buffer:Buffer.from('Unicode español 日本語')});await frame.locator('#runButton').click();await expect(frame.locator('#resultTitle')).toContainText('Encryption complete');await frame.locator('#downloadResult').click();const data=await output(page,'sample.txt.csplat');expect(data.subarray(0,8).toString()).toBe('CSPCS4!!');expect(errors).toEqual([]);expect(external).toEqual([]);
});

test('ImageSplat crop undo restores canvas dimensions and image layers',async({page})=>{
 const{frame,errors}=await start(page,'imagesplat');await frame.locator('#imageInput').setInputFiles({name:'crop.png',mimeType:'image/png',buffer:await png(page)});await expect(frame.locator('#layerList .layer')).toHaveCount(1);
 const original=await frame.locator('#stage').evaluate(c=>[c.width,c.height]);await frame.locator('[data-tool="crop"]').first().evaluate(b=>b.click());
 await frame.locator('#stage').evaluate(c=>{const r=c.getBoundingClientRect(),scale=r.width/c.width;for(const[type,x,y]of [['pointerdown',40,40],['pointermove',120,100],['pointerup',120,100]])c.dispatchEvent(new PointerEvent(type,{bubbles:true,clientX:r.left+x*scale,clientY:r.top+y*scale,pointerId:1}));});
 await frame.locator('[data-action="applyCrop"]').first().evaluate(b=>b.click());await expect.poll(()=>frame.locator('#stage').evaluate(c=>[c.width,c.height])).toEqual([80,60]);
 await frame.locator('[data-action="undo"]').first().evaluate(b=>b.click());await expect.poll(()=>frame.locator('#stage').evaluate(c=>[c.width,c.height])).toEqual(original);await expect(frame.locator('#layerList .layer')).toHaveCount(1);
 await frame.locator('[data-action="redo"]').first().evaluate(b=>b.click());await expect.poll(()=>frame.locator('#stage').evaluate(c=>[c.width,c.height])).toEqual([80,60]);expect(errors).toEqual([]);
});
