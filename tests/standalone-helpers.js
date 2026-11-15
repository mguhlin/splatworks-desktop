const {test,expect}=require('@playwright/test');
const profiles=require('../profiles.json'),tools=[...require('../tools.json'),...require('../standalone-tools.json')];
const fs=require('fs/promises'),{PNG}=require('pngjs'),jsQR=require('jsqr');
const csp="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data: blob:; connect-src 'self' data: blob:; worker-src 'self' blob:; frame-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'";
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

module.exports={start,png,output};
