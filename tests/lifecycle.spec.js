const {test,expect}=require('@playwright/test');
const {PDFDocument}=require('../frontend/solutions/pdfsplat/vendor/pdf-lib.min.js');
async function open(page,name='lesson.pdf'){
  await page.goto('/#pdfsplat');const pdf=page.frameLocator('#tool-pdfsplat');await expect.poll(()=>pdf.locator('#fileInput').evaluate(e=>!!e.onchange)).toBe(true);
  const doc=await PDFDocument.create();doc.addPage();await pdf.locator('#fileInput').setInputFiles({name,mimeType:'application/pdf',buffer:Buffer.from(await doc.save())});await expect(pdf.locator('#status')).toContainText(name+' opened.');return pdf;
}
async function cipherReady(page){await page.goto('/#ciphersplat');const cipher=page.frameLocator('#tool-ciphersplat');await expect.poll(()=>cipher.locator('html').evaluate(root=>!root.inert&&document.readyState==='complete'&&!!window.CipherSplatWorkspace)).toBe(true);return cipher;}
async function edit(pdf){await pdf.locator('#addTextButton').click();await pdf.locator('#annotationLayer').press('Enter');await pdf.locator('#textValue').fill('Unsaved classroom work');await pdf.locator('#textValue').press('Tab');}
test('closing warns for unsaved edits and Keep working retains them',async({page})=>{
  const pdf=await open(page);await edit(pdf);
  await page.evaluate(()=>{window.closing=SplatDesktop.requestClose()});await expect(page.locator('#leaveDialog')).toBeVisible();await expect(page.locator('#leaveMessage')).toContainText('PDFsplat');
  await page.getByRole('button',{name:'Keep working',exact:true}).click();expect(await page.evaluate(()=>closing)).toBe(false);await expect(pdf.locator('.text-object')).toContainText('Unsaved classroom work');
  await pdf.locator('#undoButton').click();await pdf.locator('#undoButton').click();expect(await page.evaluate(()=>SplatDesktop.dirty)).toEqual([]);
});
test('replacing a dirty PDF requires an explicit decision',async({page})=>{
  const pdf=await open(page);await edit(pdf);const doc=await PDFDocument.create();doc.addPage();
  await pdf.locator('#fileInput').setInputFiles({name:'replacement.pdf',mimeType:'application/pdf',buffer:Buffer.from(await doc.save())});
  await expect(page.locator('#leaveDialog')).toBeVisible();await page.getByRole('button',{name:'Keep working',exact:true}).click();await expect(pdf.locator('.text-object')).toContainText('Unsaved classroom work');
  await pdf.locator('#fileInput').setInputFiles({name:'replacement.pdf',mimeType:'application/pdf',buffer:Buffer.from(await doc.save())});await page.getByRole('button',{name:'Discard and open',exact:true}).click();await expect(pdf.locator('#status')).toContainText('replacement.pdf opened.');
});
test('pending native writes prevent closing and do not report success early',async({page})=>{
  await page.addInitScript(()=>{window.go={main:{App:{Version:async()=> 'test',SmokeEnabled:async()=>false,Ready:async()=>{},BeginSave:async()=> 'pending',AppendSave:async()=>{},FinishSave:()=>new Promise(resolve=>window.finishWrite=resolve),CancelSave:async()=>{},QuitWhenSafe:async()=>{window.quit=true}}}};});
  const pdf=await open(page);await edit(pdf);await pdf.locator('#saveAsSelect').selectOption('pdf');
  await expect(page.locator('#desktopStatus')).toContainText('Saving');await expect(pdf.locator('#status')).not.toContainText('saved.');
  await page.evaluate(()=>{window.closing=SplatDesktop.requestClose()});await expect(page.locator('#discardWork')).toBeDisabled();await page.locator('#keepWorking').click();
  await page.evaluate(()=>finishWrite('lesson-edited.pdf'));await expect(pdf.locator('#status')).toContainText('saved.');expect(await page.evaluate(()=>SplatDesktop.dirty)).toEqual([]);expect(await page.evaluate(()=>!!window.quit)).toBe(false);
});
test('cancelled native PDF save keeps edits dirty without a success message',async({page})=>{
  await page.addInitScript(()=>{window.go={main:{App:{Version:async()=> 'test',SmokeEnabled:async()=>false,BeginSave:async()=>''}}};});
  const pdf=await open(page);await edit(pdf);await pdf.locator('#saveAsSelect').selectOption('pdf');await expect(pdf.locator('#status')).toContainText('Save cancelled');expect(await page.evaluate(()=>SplatDesktop.dirty)).toEqual(['PDFsplat']);
});
test('a completed earlier save cannot clear edits made while saving',async({page})=>{
  await page.addInitScript(()=>{window.go={main:{App:{Version:async()=> 'test',SmokeEnabled:async()=>false,BeginSave:async()=> 'pending',AppendSave:async()=>{},FinishSave:()=>new Promise(resolve=>window.finishWrite=resolve),CancelSave:async()=>{}}}};});
  const pdf=await open(page);await edit(pdf);await pdf.locator('#saveAsSelect').selectOption('pdf');await expect(page.locator('#desktopStatus')).toContainText('Saving');
  await pdf.locator('#textValue').fill('Newer edits');await pdf.locator('#textValue').press('Tab');await page.evaluate(()=>finishWrite('lesson-edited.pdf'));await expect(pdf.locator('#status')).toContainText('saved.');expect(await page.evaluate(()=>SplatDesktop.dirty)).toEqual(['PDFsplat']);
});
test('malformed PDF leaves the current document usable',async({page})=>{
  const pdf=await open(page,'Résumé 日本語.pdf');await pdf.locator('#fileInput').setInputFiles({name:'broken.pdf',mimeType:'application/pdf',buffer:Buffer.from('not a PDF')});
  await expect(pdf.locator('#status')).not.toContainText('broken.pdf opened');await expect(pdf.locator('#pagePosition')).toHaveText('1 / 1');await edit(pdf);await expect(pdf.locator('.text-object')).toContainText('Unsaved classroom work');
});
test('text encryption is reviewed, saved, and decrypted through the UI',async({page})=>{
  const cipher=await cipherReady(page);await cipher.locator('#textInput').fill('Private note: español 日本語');await cipher.locator('#password').fill('synthetic text roundtrip password');expect(await page.evaluate(()=>SplatDesktop.dirty)).toEqual(['CipherSplat']);const promise=page.waitForEvent('download');await cipher.locator('#runButton').click();const download=await promise;await expect(cipher.locator('#resultTitle')).toContainText('Encryption complete');
  const encrypted=await require('fs/promises').readFile(await download.path(),'utf8');expect(encrypted).toMatch(/^PRISMVAULT3\./);expect(await page.evaluate(()=>SplatDesktop.dirty)).toEqual([]);
  await cipher.locator('#textInput').fill('Changed note: español 日本語');expect(await page.evaluate(()=>SplatDesktop.dirty)).toEqual(['CipherSplat']);
  await cipher.locator('#textInput').fill(encrypted);await cipher.locator('#password').fill('synthetic text roundtrip password');await cipher.locator('#runButton').click();await expect(cipher.locator('#resultTitle')).toContainText('Vault unlocked');
  const plainPromise=page.waitForEvent('download');await cipher.locator('#downloadResult').click();const plain=await plainPromise;expect(await require('fs/promises').readFile(await plain.path(),'utf8')).toBe('Private note: español 日本語');
});
test('CipherSplat mode changes confirm unsaved work and Help preserves it',async({page})=>{
 const cipher=await cipherReady(page);await cipher.locator('#textInput').fill('Keep this synthetic note');await cipher.locator('#workspaceModeLink').click();await expect(page.locator('#leaveDialog')).toBeVisible();await page.locator('#keepWorking').click();await expect(cipher.locator('#textInput')).toHaveValue('Keep this synthetic note');
 await page.locator('#helpButton').click();await expect(cipher.locator('#workspaceHelp')).toBeVisible();await cipher.locator('#closeWorkspaceHelp').click();await expect(cipher.locator('#textInput')).toHaveValue('Keep this synthetic note');
 await cipher.locator('#workspaceModeLink').click();await page.locator('#discardWork').click();await expect(cipher.locator('#pgpKeyInput')).toBeVisible();await expect(cipher.locator('#password')).toBeHidden();await expect(cipher.locator('#textInput')).toHaveValue('');
});
test('cancelled automatic CipherSplat saves retain a retryable result',async({page})=>{
 await page.addInitScript(()=>{if(window!==top)return;window.go={main:{App:{Version:async()=> 'test',SmokeEnabled:async()=>false,BeginSave:async()=>''}}}});
 const cipher=await cipherReady(page);await cipher.locator('#password').fill('Synthetic cancelled save password');await cipher.locator('#fileInput').setInputFiles({name:'sample.txt',mimeType:'text/plain',buffer:Buffer.from('Retain result')});await expect(cipher.locator('#errorMessage')).toContainText('Save cancelled');await expect(cipher.locator('#resultPanel')).toBeVisible();expect(await page.evaluate(()=>SplatDesktop.dirty)).toContain('CipherSplat');
 await cipher.locator('#clearWorkspace').click();await expect(page.locator('#leaveDialog')).toBeVisible();await page.locator('#keepWorking').click();await expect(cipher.locator('#resultPanel')).toBeVisible();
});
