const {test,expect}=require('@playwright/test');
const {PDFDocument,StandardFonts}=require('../frontend/solutions/pdfsplat/vendor/pdf-lib.min.js');

async function sourcePDF(){const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);pdf.addPage([400,500]).drawText('Original classroom handout',{x:30,y:440,font,size:18});pdf.addPage([400,500]);return Buffer.from(await pdf.save());}
test('two offline workspaces retain open PDFs and export a valid edited copy',async({page})=>{
  const external=[],errors=[];page.on('request',req=>{if(!req.url().startsWith('http://127.0.0.1:4194')&&!/^(blob:|data:)/.test(req.url()))external.push(req.url());});page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');const pdf=page.frameLocator('#tool-pdfsplat');
  await pdf.locator('#fileInput').setInputFiles({name:'lesson.pdf',mimeType:'application/pdf',buffer:await sourcePDF()});
  await expect(pdf.locator('#status')).toContainText('2 pages');
  await pdf.locator('#addTextButton').click();await pdf.locator('#annotationLayer').press('Enter');
  await pdf.locator('#textValue').fill('Desktop teacher directions');await pdf.locator('#textValue').press('Tab');
  await page.getByRole('button',{name:'CipherSplat',exact:true}).click();
  await expect(page.frameLocator('#tool-ciphersplat').locator('#runButton')).toBeVisible();
  await page.getByRole('button',{name:'PDFsplat',exact:true}).click();
  await expect(pdf.locator('.text-object')).toContainText('Desktop teacher directions');
  const download=page.waitForEvent('download');await pdf.locator('#saveAsSelect').selectOption('pdf');
  const file=await download;expect(file.suggestedFilename()).toBe('lesson-edited.pdf');
  const saved=await PDFDocument.load(await require('fs/promises').readFile(await file.path()));expect(saved.getPageCount()).toBe(2);
  expect(external).toEqual([]);expect(errors).toEqual([]);
});

test('CipherSplat packages open in PDFsplat and reject modified bytes',async({page})=>{
  await page.goto('/#ciphersplat');const cipher=page.frameLocator('#tool-ciphersplat');
  await cipher.locator('#password').fill('desktop compatibility test password');
  await cipher.locator('#fileInput').setInputFiles({name:'handout.pdf',mimeType:'application/pdf',buffer:await sourcePDF()});
  await cipher.locator('#runButton').click();await expect(cipher.locator('#resultTitle')).toContainText('Encryption complete');
  const download=page.waitForEvent('download');await cipher.locator('#downloadResult').click();const file=await download;
  const bytes=await require('fs/promises').readFile(await file.path());expect(bytes.subarray(0,8).toString()).toBe('CSPCS4!!');
  await page.getByRole('button',{name:'PDFsplat',exact:true}).click();const pdf=page.frameLocator('#tool-pdfsplat');
  await pdf.locator('#vaultInput').setInputFiles({name:'handout.pdf.csplat',mimeType:'application/octet-stream',buffer:bytes});
  await pdf.locator('#vaultPassword').fill('desktop compatibility test password');await pdf.locator('#vaultRun').click();
  await expect(pdf.locator('#status')).toContainText('authenticated, decrypted, and opened');
  await expect(pdf.locator('#pagePosition')).toHaveText('1 / 2');
  bytes[bytes.length-1]^=1;
  await pdf.locator('#vaultInput').setInputFiles({name:'bad.csplat',mimeType:'application/octet-stream',buffer:bytes});
  await pdf.locator('#vaultPassword').fill('desktop compatibility test password');await pdf.locator('#vaultRun').click();
  await expect(pdf.locator('#vaultDialog')).toBeVisible();await expect(pdf.locator('#vaultCopy')).not.toBeEmpty();
  await expect(pdf.locator('#vaultPassword')).toHaveValue('');
});

test('desktop adapter streams saves and folder paths through native capabilities',async({page})=>{
  await page.addInitScript(()=>{
    window.__writes=[];window.__commits=0;
    window.go={main:{App:{Version:async()=> 'test',SmokeEnabled:async()=>false,
      BeginSave:async name=>{window.__name=name;return 'save-token'},
      BeginFolderRestore:async()=> 'folder-token',AppendSave:async(...args)=>window.__writes.push(args),
      FinishSave:async()=>{window.__commits++;return 'saved-output'},CancelSave:async()=>{},OpenExternal:async()=>{},ToggleFullscreen:async()=>{}}}};
  });
  await page.goto('/');await expect(page.locator('#desktopVersion')).toHaveText('vtest');
  await page.evaluate(async()=>{
    const bytes=new Uint8Array(2*1024*1024+17);bytes.fill(65);await SplatDesktop.saveBlob(new Blob([bytes]),'large.pdf');
    await SplatDesktop.saveFolder([{path:'classroom/empty.txt',blob:new Blob([])},{path:'classroom/notes.txt',blob:new Blob(['notes'])}]);
  });
  const result=await page.evaluate(()=>({name:__name,writes:__writes.map(([token,path,data,first])=>({token,path,size:atob(data).length,first})),commits:__commits}));
  expect(result.name).toBe('large.pdf');expect(result.writes.map(x=>x.size)).toEqual([1048576,1048576,17,0,5]);
  expect(result.writes[3]).toMatchObject({token:'folder-token',path:'classroom/empty.txt',first:true});expect(result.commits).toBe(2);
});

test('save cancellation and failure keep the workspace usable',async({page})=>{
  await page.addInitScript(()=>{window.__cancelled=[];window.go={main:{App:{Version:async()=> 'test',SmokeEnabled:async()=>false,BeginSave:async()=>'',AppendSave:async()=>{},FinishSave:async()=>'',CancelSave:async id=>__cancelled.push(id)}}};});
  await page.goto('/');await expect(page.locator('#desktopVersion')).toHaveText('vtest');
  expect(await page.evaluate(()=>SplatDesktop.saveBlob(new Blob(['keep']),'source.pdf'))).toBe(false);
  await expect(page.locator('#desktopStatus')).toContainText('cancelled');
  await page.evaluate(async()=>{go.main.App.BeginSave=async()=> 'bad';go.main.App.AppendSave=async()=>{throw Error('Disk full')};try{await SplatDesktop.saveBlob(new Blob(['keep']),'source.pdf')}catch{}});
  await expect(page.locator('#desktopStatus')).toContainText('Disk full');expect(await page.evaluate(()=>__cancelled)).toEqual(['bad']);
});
