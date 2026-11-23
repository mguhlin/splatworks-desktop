const {test,expect}=require('@playwright/test');
const JSZip=require('../frontend/vendor/jszip.min.js');
const tools=require('../tools.json').filter(tool=>tool.source.startsWith('splatworks/'));
const csp="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data: blob:; connect-src 'self' data: blob:; worker-src 'self' blob:; frame-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'";
async function start(page,id){
 const errors=[],missing=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
 page.on('request',r=>{if(!/^(http:\/\/127.0.0.1:4194|data:|blob:)/.test(r.url()))external.push(r.url());});
 await page.route('**/*',async route=>{if(route.request().resourceType()!=='document')return route.fallback();const response=await route.fetch();await route.fulfill({response,headers:{...response.headers(),'content-security-policy':csp}});});
 await page.addInitScript(()=>{if(window!==top)return;window.files={};window.cancel=false;window.fail=false;window.hold=false;window.go={main:{App:{Version:async()=> 'test',Ready:async()=>{},SmokeEnabled:async()=>false,BeginSave:async name=>{if(cancel)return '';if(fail)throw Error('Synthetic disk full');files[name]=[];return name;},AppendSave:async(name,_,data)=>files[name].push(data),FinishSave:async name=>hold?new Promise(resolve=>window.releaseSave=()=>resolve(name)):name,CancelSave:async()=>{}}}};});
 await page.goto('/#'+id);await expect.poll(()=>page.evaluate(id=>!!SplatDesktop.frames.get(id)?.contentWindow?.SplatDesktop,id)).toBe(true);
 await expect.poll(()=>page.evaluate(id=>SplatDesktop.command(id,'desktop-not-a-command')===false,id)).toBe(true);
 const frame=page.frameLocator('#tool-'+id);
 await expect.poll(()=>page.evaluate(id=>!!SplatDesktop.frames.get(id)?.contentWindow?.document.querySelector(id==='listsplat'?'[data-project-title]':id==='writesplat'?'#docTitle':id==='gridsplat'?'[data-testid="cell-A1"]':id==='showsplat'?'#slideCanvas':id==='layoutsplat'?'#pageSurface':'#quickTitle'),id)).toBe(true);
 // Await the actual model/command registration, not just the parsed page shell.
 await expect.poll(()=>page.evaluate(id=>SplatDesktop.frames.get(id).contentWindow.document.readyState,id)).toBe('complete');
 if(id==='layoutsplat')await expect.poll(()=>frame.locator('body').evaluate(()=>!!window.LayoutSplat)).toBe(true);
 if(id==='plansplat')await expect.poll(()=>frame.locator('body').evaluate(()=>!!window.PlanSplat)).toBe(true);
 if(id==='gridsplat'){const splash=frame.getByRole('dialog',{name:'GridSplat™',exact:true});if(await splash.isVisible())await splash.getByRole('button',{name:'New Sheet',exact:true}).click();}
 return {frame,errors,missing,external};
}
async function edit(frame,id,label='Desktop español 日本語'){
 if(id==='listsplat'){await frame.locator('[data-project-title]').fill(label);await frame.locator('[data-project-title]').press('Tab');}
 if(id==='writesplat'){await frame.locator('#docTitle').fill(label);await frame.locator('#docTitle').press('Tab');}
 if(id==='showsplat'){await frame.locator('#deckTitle').fill(label);await frame.locator('#deckTitle').press('Tab');}
 if(id==='layoutsplat'){await frame.locator('#publicationTitle').fill(label);await frame.locator('#publicationTitle').press('Tab');}
 if(id==='gridsplat'){await frame.getByTestId('cell-A1').dblclick();await frame.locator('input.cell-editor').fill(label);await frame.locator('input.cell-editor').press('Enter');}
 if(id==='plansplat'){await frame.locator('#quickTitle').fill(label);await frame.locator('#quickAdd button').click();}
}
async function save(page,id){await page.evaluate(id=>SplatDesktop.command(id,'save'),id);await expect.poll(()=>page.evaluate(()=>SplatDesktop.busy)).toBe(false);}
async function latest(page){const files=await page.evaluate(()=>files);const name=Object.keys(files).at(-1);expect(name).toBeTruthy();return{name,buffer:Buffer.concat(files[name].map(value=>Buffer.from(value,'base64')))};}
for(const tool of tools)test(tool.name+' saves a compatible project, retains cancelled work, and reopens without persistent drafts',async({page})=>{
 const {frame,errors,missing,external}=await start(page,tool.id);await edit(frame,tool.id);
 await expect.poll(()=>page.evaluate(()=>SplatDesktop.dirty)).toContain(tool.name);
 await page.evaluate(()=>cancel=true);await save(page,tool.id);await expect.poll(()=>page.evaluate(()=>SplatDesktop.dirty)).toContain(tool.name);await expect(page.locator('#desktopStatus')).toContainText('cancelled');
 await page.evaluate(()=>{cancel=false;fail=true;});await save(page,tool.id);await expect.poll(()=>page.evaluate(()=>SplatDesktop.dirty)).toContain(tool.name);
 await page.evaluate(()=>fail=false);await save(page,tool.id);await expect.poll(()=>page.evaluate(()=>SplatDesktop.dirty)).not.toContain(tool.name);
 const output=await latest(page);let model;if(tool.id==='layoutsplat'){const zip=await JSZip.loadAsync(output.buffer);model=JSON.parse(await zip.file('publication.json').async('string'));}else model=JSON.parse(output.buffer.toString());
 expect(JSON.stringify(model)).toContain('Desktop español 日本語');
 // The shipped browser engine must also accept the desktop project format.
 const browserPage=await page.context().newPage();browserPage.on('dialog',dialog=>dialog.accept());
 await browserPage.goto('http://127.0.0.1:4195/splatworks/'+tool.id+'/');await browserPage.waitForLoadState('load');
 if(tool.id==='layoutsplat')await expect.poll(()=>browserPage.evaluate(()=>!!window.LayoutSplat)).toBe(true);
 if(tool.id==='plansplat')await expect.poll(()=>browserPage.evaluate(()=>!!window.PlanSplat)).toBe(true);
 const inputs={listsplat:'[data-open-json]',writesplat:'#fileInput',showsplat:'#deckFileInput',layoutsplat:'#projectInput',plansplat:'#fileInput',gridsplat:'input[aria-label="Import spreadsheet file"]'};
 await browserPage.locator(inputs[tool.id]).setInputFiles({name:output.name,mimeType:'application/octet-stream',buffer:output.buffer});
 const titles={listsplat:'[data-project-title]',writesplat:'#docTitle',showsplat:'#deckTitle',layoutsplat:'#publicationTitle'};
 if(titles[tool.id])await expect(browserPage.locator(titles[tool.id])).toHaveValue('Desktop español 日本語');
 else if(tool.id==='gridsplat')await expect(browserPage.getByTestId('cell-A1')).toContainText('Desktop español 日本語');
 else await expect.poll(()=>browserPage.evaluate(()=>Object.values(PlanSplat.getPlanner().tasks).some(task=>task.title==='Desktop español 日本語'))).toBe(true);
 await browserPage.close();

 await page.evaluate(async({id,name,bytes})=>{const file=new File([new Uint8Array(bytes)],name);await SplatDesktop.openWorkspaceFile(id,file);},{id:tool.id,name:output.name,bytes:[...output.buffer]});
 await save(page,tool.id);const reopened=await latest(page);expect(reopened.buffer.length).toBeGreaterThan(50);
 const persisted=await frame.locator('body').evaluate(async()=>({local:Object.entries(localStorage).filter(([k])=>/autosave|recovery|draft|showsplat.deck|plansplat.timer/.test(k)),session:Object.entries(sessionStorage).filter(([k])=>/autosave|recovery|draft|showsplat.deck|plansplat.timer/.test(k)),databases:typeof indexedDB.databases==='function'?(await indexedDB.databases()).map(db=>db.name):[]}));
 expect(persisted.local).toEqual([]);expect(persisted.session).toEqual([]);expect(persisted.databases.filter(name=>/plansplat|transfers|showsplat-present/.test(name))).toEqual([]);
 expect(errors).toEqual([]);expect(missing).toEqual([]);expect(external).toEqual([]);
});
test('office save snapshot cannot clear newer edits and failed import retains the current document',async({page})=>{
 const {frame}=await start(page,'writesplat');await edit(frame,'writesplat','First draft');await page.evaluate(()=>hold=true);await page.evaluate(()=>SplatDesktop.command('writesplat','save'));await expect.poll(()=>page.evaluate(()=>typeof releaseSave)).toBe('function');
 await edit(frame,'writesplat','Newer draft');await page.evaluate(()=>releaseSave());await expect.poll(()=>page.evaluate(()=>SplatDesktop.busy)).toBe(false);expect(await page.evaluate(()=>SplatDesktop.dirty)).toContain('WriteSplat');
 page.on('dialog',dialog=>dialog.dismiss());await frame.locator('#fileInput').setInputFiles({name:'broken.writesplat.json',mimeType:'application/json',buffer:Buffer.from('{bad')});await expect(page.locator('#leaveDialog')).toBeVisible();await page.locator('#discardWork').click();await expect.poll(()=>page.evaluate(()=>SplatDesktop.busy)).toBe(false);await expect(frame.locator('#docTitle')).toHaveValue('Newer draft');
 await page.evaluate(()=>{window.closeResult=SplatDesktop.requestClose();});await expect(page.locator('#leaveMessage')).toContainText('WriteSplat');await page.locator('#keepWorking').click();expect(await page.evaluate(()=>closeResult)).toBe(false);
});
test('choosing a writing project from slides routes in memory and protects the destination workspace',async({page})=>{
 const {frame}=await start(page,'writesplat');await edit(frame,'writesplat','Keep this writing');
 await page.locator('#appsMenu summary').click();await page.getByRole('button',{name:'ShowSplat',exact:true}).click();const slides=page.frameLocator('#tool-showsplat');await expect(slides.locator('#slideCanvas')).toBeVisible();await expect.poll(()=>slides.locator('body').evaluate(()=>document.readyState)).toBe('complete');
 const model={app:'WriteSplatTM',version:1,createdAt:'2026-10-11T00:00:00Z',updatedAt:'2026-10-11T00:00:00Z',metadata:{title:'Incoming writing',author:'',targetGrade:'6'},document:{format:'html',body:'<p>Transferred safely.</p>'},teacher:{studentView:false,citations:[],answerKey:[]}};
 await slides.locator('#deckFileInput').setInputFiles({name:'lesson.writesplat.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(model))});await expect(page.locator('#leaveDialog')).toBeVisible();await page.locator('#keepWorking').click();await expect(frame.locator('#docTitle')).toHaveValue('Keep this writing');
 await page.evaluate(()=>SplatDesktop.selectTool('showsplat'));await slides.locator('#deckFileInput').setInputFiles({name:'lesson.writesplat.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(model))});await page.locator('#discardWork').click();await expect(frame.locator('#docTitle')).toHaveValue('Incoming writing');await expect(frame.getByRole('textbox',{name:'WriteSplat document editor'})).toContainText('Transferred safely.');expect(page.context().pages()).toHaveLength(1);
});
test('app chooser fits an 800px window and switching retains office work',async({page})=>{
 const {frame}=await start(page,'listsplat');await edit(frame,'listsplat','Retained database');await page.setViewportSize({width:800,height:600});await page.locator('#appsMenu summary').click();await expect(page.locator('#tools button')).toHaveCount(14);await page.getByRole('button',{name:'PlanSplat',exact:true}).click();await expect(page.frameLocator('#tool-plansplat').locator('#quickTitle')).toBeVisible();await page.locator('#appsMenu summary').click();await page.getByRole('button',{name:'ListSplat',exact:true}).click();await expect(frame.locator('[data-project-title]')).toHaveValue('Retained database');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('a late office import cannot replace edits made during the file read',async({page})=>{
 const {frame}=await start(page,'writesplat');page.on('dialog',dialog=>dialog.dismiss());
 await page.evaluate(()=>{const model={app:'WriteSplatTM',version:1,createdAt:'2026-10-11T00:00:00Z',updatedAt:'2026-10-11T00:00:00Z',metadata:{title:'Late incoming file',author:'',targetGrade:'6'},document:{format:'html',body:'<p>Incoming document.</p>'},teacher:{studentView:false,citations:[],answerKey:[]}};const file=new File([JSON.stringify(model)],'late.writesplat.json');file.text=()=>new Promise(resolve=>window.releaseRead=()=>resolve(JSON.stringify(model)));window.importDone=SplatDesktop.openWorkspaceFile('writesplat',file);});
 await expect.poll(()=>page.evaluate(()=>typeof releaseRead)).toBe('function');await edit(frame,'writesplat','New work during read');await page.evaluate(async()=>{releaseRead();await importDone;});await expect(frame.locator('#docTitle')).toHaveValue('New work during read');expect(await page.evaluate(()=>SplatDesktop.dirty)).toContain('WriteSplat');
});
test('Present explicitly saves a WebDeck and cancellation preserves the slide project',async({page})=>{
 const {frame,errors}=await start(page,'showsplat');await edit(frame,'showsplat','Presentation copy');await page.evaluate(()=>cancel=true);await frame.locator('[data-action="present-first"]').first().evaluate(button=>button.click());await expect(frame.locator('#statusText')).toContainText('cancelled');expect(await page.evaluate(()=>SplatDesktop.dirty)).toContain('ShowSplat');
 await page.evaluate(()=>cancel=false);await frame.locator('[data-action="present-first"]').first().evaluate(button=>button.click());await expect.poll(()=>page.evaluate(()=>Object.keys(files).length)).toBe(1);await expect.poll(()=>page.evaluate(()=>SplatDesktop.busy)).toBe(false);const output=await latest(page);expect(output.name).toMatch(/\.html$/);expect(output.buffer.toString()).toContain('Presentation copy');expect(output.buffer.toString()).toContain('Web Deck v5');expect(output.buffer.toString()).toMatch(/<section[^>]+class="[^"]*\bslide\b/);expect(await page.evaluate(()=>SplatDesktop.dirty)).toContain('ShowSplat');expect(errors).toEqual([]);
});

test('GridSplat picture-graph PNG exports use native saving, including cancellation',async({page})=>{
 const {frame,errors}=await start(page,'gridsplat');await frame.getByRole('button',{name:'Insert',exact:true}).click();await frame.getByRole('menuitem',{name:'Picture graph',exact:true}).click();await expect(frame.getByTestId('export-picture-graph')).toBeVisible();
 await page.evaluate(()=>cancel=true);await frame.getByTestId('export-picture-graph').click();await expect(page.locator('#desktopStatus')).toContainText('cancelled');
 await page.evaluate(()=>cancel=false);await frame.getByTestId('export-picture-graph').click();await expect.poll(()=>page.evaluate(()=>Object.keys(files).includes('gridsplat-picture-graph.png'))).toBe(true);await expect.poll(()=>page.evaluate(()=>SplatDesktop.busy)).toBe(false);const output=await latest(page);expect(output.buffer.subarray(0,8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]));expect(errors).toEqual([]);
});

test('an unfinished planner form warns before closing the desktop window',async({page})=>{
 const {frame}=await start(page,'plansplat');await frame.locator('#newTask').click();await frame.locator('#taskForm [name="title"]').fill('Draft task not submitted');await page.evaluate(()=>{window.closeResult=SplatDesktop.requestClose();});await expect(page.locator('#leaveDialog')).toBeVisible();await expect(page.locator('#leaveMessage')).toContainText('PlanSplat');await page.locator('#keepWorking').click();expect(await page.evaluate(()=>closeResult)).toBe(false);await expect(frame.locator('#taskForm [name="title"]')).toHaveValue('Draft task not submitted');
});
test('the office native-smoke workflow exercises all six actual engines',async({page})=>{
 await start(page,'listsplat');const source=require('fs').readFileSync('frontend/desktop/native-smoke.js','utf8');const loop=source.slice(source.indexOf('    // All six office engines'),source.indexOf('    // Additional desktop engines'));
 const wrapper=`(async()=>{const desktop=SplatDesktop,checks=[],saved=[];const wait=async(predicate,label)=>{const start=Date.now();while(!predicate()){if(Date.now()-start>30000)throw Error(label);await new Promise(resolve=>setTimeout(resolve,50));}};const check=(condition,label)=>{if(!condition)throw Error(label);checks.push(label);};const save=desktop.saveBlob;desktop.saveBlob=async(blob,name,details)=>{const ok=await save(blob,name,details);saved.push({blob,name,ok});return ok;};try{${loop};window.loopReport={passed:true,checks};}catch(error){window.loopReport={passed:false,error:error.message,checks};}})();`;
 await page.route('**/desktop/office-loop-test.js',route=>route.fulfill({contentType:'application/javascript',body:wrapper}));await page.addScriptTag({url:'/desktop/office-loop-test.js'});await expect.poll(()=>page.evaluate(()=>window.loopReport),{timeout:90000}).toBeTruthy();const report=await page.evaluate(()=>loopReport);expect(report,report.error).toMatchObject({passed:true});expect(report.checks.length).toBeGreaterThanOrEqual(35);
});

for(const id of ['writesplat','listsplat'])test(id+' desktop Help opens without changing the document',async({page})=>{
 const {frame}=await start(page,id);await edit(frame,id,'Keep this project during Help');await page.locator('#helpButton').click();await expect(page.locator('#helpDialog')).toBeVisible();await expect(page.locator('#helpDialog')).toContainText('ListSplat');await expect(page.locator('#helpDialog')).toContainText('PlanSplat');await page.locator('#helpDialog button').click();await expect(frame.locator(id==='writesplat'?'#docTitle':'[data-project-title]')).toHaveValue('Keep this project during Help');
});
