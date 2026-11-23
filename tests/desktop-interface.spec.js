const{test,expect}=require('@playwright/test');
const{start,png}=require('./standalone-helpers');
const tools=require('../tools.json');
async function suite(page,id){await start(page,'qrsplat');await page.unroute('**/app.json');await page.unroute('**/tools.json');await page.goto('/');await expect(page.locator('#appHome')).toBeVisible({timeout:30000});await page.evaluate(id=>SplatDesktop.selectTool(id),id);const frame=page.frameLocator('#tool-'+id);await expect(frame.locator('html.splat-desktop')).toHaveAttribute('data-tool',id);await expect(frame.locator('.splat-app-header')).toBeVisible();return frame;}
for(const tool of tools)test('desktop '+tool.id+' retains its header controls with the shared appearance',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));const frame=await suite(page,tool.id);
 if(tool.id==='videosplat')await frame.getByRole('button',{name:'Edit video',exact:false}).click();
 for(const width of [1360,800]){await page.setViewportSize({width,height:width===800?600:900});
 const lost=await frame.locator('.splat-app-header').evaluate(header=>{const h=header.getBoundingClientRect();return[...header.querySelectorAll('button,a,input:not([type=file]):not([type=hidden]),select')].filter(e=>{const r=e.getBoundingClientRect();return r.width>10&&r.height>10&&getComputedStyle(e).visibility!=='hidden'&&(r.top<h.top-1||r.bottom>h.bottom+1);}).map(e=>e.getAttribute('aria-label')||e.textContent.trim());});expect(lost).toEqual([]);}
 if(!tool.source.startsWith('splatworks/')){await expect(frame.locator('.splat-app-header .splat-tools-label')).toBeVisible();await expect(frame.locator('.splat-app-header .splat-tools-label')).toContainText('DrawSplat™ Tools');}
 expect(errors).toEqual([]);
});
test('desktop appearance preserves slide colors, image color pickers, and the WriteSplat theme switch',async({page})=>{
 let frame=await suite(page,'showsplat');await frame.locator('body').evaluate(()=>document.documentElement.style.setProperty('--accent','#008850'));expect(await frame.locator('html').evaluate(e=>getComputedStyle(e).getPropertyValue('--accent').trim())).toBe('#008850');
 await page.evaluate(()=>SplatDesktop.selectTool('imagesplat'));frame=page.frameLocator('#tool-imagesplat');await expect(frame.locator('html.splat-desktop')).toBeVisible();const colors=frame.locator('input[type=color]');expect(await colors.count()).toBeGreaterThan(0);const value=await colors.first().inputValue();await colors.first().fill('#008850');await expect(colors.first()).toHaveValue('#008850');
 await page.evaluate(()=>SplatDesktop.selectTool('writesplat'));frame=page.frameLocator('#tool-writesplat');await expect(frame.locator('html.splat-desktop')).toBeVisible();await frame.locator('body').evaluate(e=>e.classList.add('dark'));expect(await frame.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(23, 18, 63)');expect(value).toMatch(/^#/);
});
test('desktop recorder setup denial offers retry and a mode choice without requesting devices again',async({page})=>{
 await page.addInitScript(()=>{if(window===top)return;window.__mediaRequests=0;Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{window.__mediaRequests++;throw new DOMException('Denied','NotAllowedError')},enumerateDevices:async()=>[]}});});
 const frame=await suite(page,'videosplat');await frame.getByRole('button',{name:'Record video',exact:false}).first().click();await frame.getByRole('button',{name:'Set up recording permissions',exact:true}).click();await expect(frame.locator('.splash-permission-error')).toContainText('system privacy settings');await expect(frame.locator('.splash-permission-error')).not.toContainText('only asks after');
 await frame.getByRole('button',{name:'Set up recording permissions',exact:true}).click();await expect.poll(()=>frame.locator('body').evaluate(()=>window.__mediaRequests)).toBe(2);await frame.getByRole('button',{name:'Choose recording mode first',exact:true}).click();await expect(frame.locator('#recorder-title')).toBeVisible();expect(await frame.locator('body').evaluate(()=>window.__mediaRequests)).toBe(2);
});
