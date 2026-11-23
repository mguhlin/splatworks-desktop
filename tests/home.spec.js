const {test,expect}=require('@playwright/test');
const {start,png,output}=require('./standalone-helpers');
const tools=require('../tools.json');
async function suite(page){
 // Reuse the native writer and CSP harness, while retaining the full installed registry.
 await start(page,'qrsplat');await page.unroute('**/app.json');await page.unroute('**/tools.json');await page.goto('/');await expect(page.locator('#appHome')).toBeVisible();
}
test('home centers the brand, fits all fourteen choices, and preserves open work',async({page})=>{
 await suite(page);expect(await page.evaluate(()=>SplatDesktop.frames.size)).toBe(0);await expect(page.locator('#homeApps button')).toHaveCount(14);
 for(const size of [{width:1360,height:900},{width:800,height:600},{width:390,height:844}]){
  await page.setViewportSize(size);const geometry=await page.locator('#homeApps button').evaluateAll(buttons=>buttons.map(b=>{const r=b.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};}));
  for(let a=0;a<geometry.length;a++){const r=geometry[a];expect(r.x).toBeGreaterThanOrEqual(0);expect(r.x+r.w).toBeLessThanOrEqual(size.width);for(let b=a+1;b<geometry.length;b++){const s=geometry[b];expect(r.x>=s.x+s.w||s.x>=r.x+r.w||r.y>=s.y+s.h||s.y>=r.y+r.h).toBe(true);}}
 }
 await page.setViewportSize({width:1360,height:900});const logo=await page.locator('.home-center img').boundingBox();expect(Math.abs(logo.x+logo.width/2-680)).toBeLessThan(1);
 await page.getByRole('button',{name:'Open GIFsplat',exact:true}).click();const gif=page.frameLocator('#tool-gifsplat');await gif.locator('#frameInput').setInputFiles({name:'retain.png',mimeType:'image/png',buffer:await png(page)});await expect(gif.locator('.frame-row')).toHaveCount(1);await page.locator('#homeButton').click();expect(await page.evaluate(()=>SplatDesktop.dirty)).toContain('GIFsplat');await page.evaluate(()=>void SplatDesktop.requestClose());await expect(page.locator('#leaveDialog')).toBeVisible();await page.locator('#keepWorking').click();await page.getByRole('button',{name:'Open GIFsplat',exact:true}).click();await expect(gif.locator('.frame-row')).toHaveCount(1);
});
for(const id of ['gifsplat','qrsplat','imagesplat','audiosplat','videosplat','mediasplat'])test('combined suite runs actual '+id+' engines offline',async({page})=>{
 test.setTimeout(240000);await suite(page);await page.evaluate(()=>__smoke=true);await page.getByRole('button',{name:'Open '+tools.find(t=>t.id===id).name,exact:true}).click();
 const script=['audiosplat','videosplat'].includes(id)?'native-smoke-media.js':id==='mediasplat'?'native-smoke-mediasplat.js':'native-smoke-tools.js';await page.addScriptTag({url:'/desktop/'+script});
 const result=await page.evaluate(async id=>id==='mediasplat'?SplatMediaUtilitySmoke():['audiosplat','videosplat'].includes(id)?SplatMediaSmokeRunner(id):SplatToolSmoke(id),id);expect(result.error).toBeFalsy();expect(result.passed).toBe(true);
});
test('MediaSplat keeps output after cancelled and failed saves and rejects bad replacements',async({page})=>{
 await suite(page);await page.getByRole('button',{name:'Open MediaSplat',exact:true}).click();const frame=page.frameLocator('#tool-mediasplat');
 const buffer=Buffer.alloc(16044);buffer.write('RIFF');buffer.writeUInt32LE(16036,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(8000,24);buffer.writeUInt32LE(16000,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(16000,40);
 await frame.locator('.drop-zone input').setInputFiles({name:'retry.wav',mimeType:'audio/wav',buffer});await frame.getByRole('button',{name:'Trim media',exact:true}).click();await expect(frame.locator('.results article')).toHaveCount(1);
 await page.evaluate(()=>__cancel=true);await frame.locator('.results .download').click();await expect(frame.locator('.action-bar')).toContainText('cancelled');expect(await page.evaluate(()=>SplatDesktop.dirty)).toContain('MediaSplat');
 await page.evaluate(()=>{__cancel=false;__fail=true});await frame.locator('.results .download').click();await expect(frame.locator('[role=alert]')).toContainText('disk full');
 await frame.locator('.drop-zone input').setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('bad')});await expect(frame.locator('.results article')).toHaveCount(1);await expect(frame.locator('.file-name strong')).toHaveText('retry.wav');
 await page.evaluate(()=>__fail=false);await frame.locator('.results .download').click();await expect.poll(()=>page.evaluate(()=>SplatDesktop.dirty)).toEqual([]);
});
