const {test,expect}=require('@playwright/test');
const {PDFDocument,StandardFonts,rgb,PDFName}=require('../frontend/solutions/pdfsplat/vendor/pdf-lib.min.js');

async function sourcePDF(){const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);pdf.addPage([400,500]).drawText('Original classroom handout',{x:30,y:440,font,size:18});pdf.addPage([400,500]);return Buffer.from(await pdf.save());}
async function editorReady(pdf){await expect.poll(()=>pdf.locator('#fileInput').evaluate(input=>typeof input.onchange==='function')).toBe(true);}
test('PDF insertion retains painted thumbnails while new previews are delayed',async({page})=>{
  await page.setViewportSize({width:1280,height:1000});
  await page.goto('/#pdfsplat');const pdf=page.frameLocator('#tool-pdfsplat');await editorReady(pdf);
  const doc=await PDFDocument.create();doc.addPage([600,800]).drawRectangle({x:0,y:0,width:600,height:800,color:rgb(0,0,1)});
  const bytes=Buffer.from(await doc.save());
  await pdf.locator('#fileInput').setInputFiles({name:'worksheet.pdf',mimeType:'application/pdf',buffer:bytes});
  const thumbs=pdf.locator('#thumbnails canvas');
  const pixel=index=>thumbs.nth(index).evaluate(c=>[...c.getContext('2d').getImageData(20,20,1,1).data]);
  await expect.poll(()=>pixel(0)).toEqual([0,0,255,255]);
  await pdf.locator('#toolGroup-pages').evaluate(el=>el.open=true);await pdf.locator('#duplicatePageButton').click();
  await expect(thumbs).toHaveCount(2);await expect.poll(()=>pixel(1)).toEqual([0,0,255,255]);
  await pdf.locator('#thumbnails .thumbnail').first().click();
  await pdf.locator('body').evaluate(async(_,bytes)=>{
    const probe=await pdfjsLib.getDocument({data:new Uint8Array(bytes),isEvalSupported:false}).promise;
    const prototype=Object.getPrototypeOf(await probe.getPage(1)),render=prototype.render;
    window.releaseThumbnailPaints=[];
    prototype.render=function(options){
      if(Math.abs(options.viewport.scale-.2)>.001)return render.call(this,options);
      let task;const gate=new Promise(resolve=>releaseThumbnailPaints.push(resolve));
      return {promise:gate.then(()=>{task=render.call(this,options);return task.promise;}),cancel(){task?.cancel();}};
    };
    await probe.destroy();
  },Array.from(bytes));
  await pdf.locator('#blankPageButton').click();await expect(pdf.locator('#status')).toContainText('Blank page inserted');
  await expect(thumbs).toHaveCount(3);
  expect(await pixel(0)).toEqual([0,0,255,255]);expect(await pixel(2)).toEqual([0,0,255,255]);
  await pdf.locator('body').evaluate(()=>releaseThumbnailPaints.splice(0).forEach(release=>release()));
  await expect.poll(()=>pixel(1)).toEqual([255,255,255,255]);
});

test('desktop CipherSplat password strength text has readable contrast',async({page})=>{
  await page.goto('/#ciphersplat');
  const contrast=await page.frameLocator('#tool-ciphersplat').locator('#strengthText').evaluate(el=>{
    const rgb=getComputedStyle(el).color.match(/\d+(?:\.\d+)?/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
    return 1.05/(.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]+.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});

test('native PDF saves retain editable external and internal links',async({page})=>{
  await page.addInitScript(()=>{
    window.__bytes=[];window.go={main:{App:{Version:async()=> 'test',SmokeEnabled:async()=>false,
      BeginSave:async()=>{__bytes=[];return 'pdf-save';},AppendSave:async(_,path,data)=>__bytes.push(data),
      FinishSave:async()=> 'linked.pdf',CancelSave:async()=>{}}}};
  });
  await page.goto('/#pdfsplat');const pdf=page.frameLocator('#tool-pdfsplat');await editorReady(pdf);
  await pdf.locator('#fileInput').setInputFiles({name:'lesson.pdf',mimeType:'application/pdf',buffer:await sourcePDF()});
  await expect(pdf.locator('#status')).toContainText('2 pages');
  await pdf.locator('#addLinkButton').click();await pdf.locator('#annotationLayer').press('Enter');
  await pdf.locator('#linkUrl').fill('https://example.org/lesson');await pdf.locator('#linkSave').click();
  await pdf.locator('#addLinkButton').click();await pdf.locator('#annotationLayer').press('Enter');
  await pdf.locator('#linkKind').selectOption('page');await pdf.locator('#linkPage').selectOption({label:'Page 2'});await pdf.locator('#linkSave').click();
  await pdf.locator('#saveAsSelect').selectOption('pdf');await expect.poll(()=>page.evaluate(()=>SplatDesktop.busy)).toBe(false);
  await expect.poll(()=>page.evaluate(()=>__bytes.length)).toBeGreaterThan(0);
  const bytes=Buffer.concat((await page.evaluate(()=>__bytes)).map(data=>Buffer.from(data,'base64'))),doc=await PDFDocument.load(bytes);
  const links=doc.getPage(0).node.Annots().asArray().map(ref=>doc.context.lookup(ref));
  expect(links).toHaveLength(2);
  expect(links[0].lookup(PDFName.of('A')).lookup(PDFName.of('URI')).decodeText()).toBe('https://example.org/lesson');
  expect(links[1].lookup(PDFName.of('Dest')).get(0).toString()).toBe(doc.getPage(1).ref.toString());
  await expect.poll(()=>page.evaluate(()=>SplatDesktop.dirty)).toEqual([]);
  await pdf.locator('#fileInput').setInputFiles({name:'linked.pdf',mimeType:'application/pdf',buffer:bytes});
  await expect(pdf.locator('#status')).toContainText('linked.pdf opened');await expect(pdf.locator('.link-object')).toHaveCount(2);
});

test('two offline workspaces retain open PDFs and export a valid edited copy',async({page})=>{
  const external=[],errors=[];page.on('request',req=>{if(!req.url().startsWith('http://127.0.0.1:4194')&&!/^(blob:|data:)/.test(req.url()))external.push(req.url());});page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/#pdfsplat');const pdf=page.frameLocator('#tool-pdfsplat');
  await editorReady(pdf);
  await pdf.locator('#fileInput').setInputFiles({name:'lesson.pdf',mimeType:'application/pdf',buffer:await sourcePDF()});
  await expect(pdf.locator('#status')).toContainText('2 pages');
  await pdf.locator('#addTextButton').click();await pdf.locator('#annotationLayer').press('Enter');
  await pdf.locator('#textValue').fill('Desktop teacher directions');await pdf.locator('#textValue').press('Tab');
  await page.locator('#appsMenu').evaluate(menu=>menu.open=true);await page.getByRole('button',{name:'CipherSplat',exact:true}).click();
  await expect(page.frameLocator('#tool-ciphersplat').locator('#runButton')).toBeVisible();
  await page.locator('#appsMenu').evaluate(menu=>menu.open=true);await page.getByRole('button',{name:'PDFsplat',exact:true}).click();
  await expect(pdf.locator('.text-object')).toContainText('Desktop teacher directions');
  const download=page.waitForEvent('download');await pdf.locator('#saveAsSelect').selectOption('pdf');
  const file=await download;expect(file.suggestedFilename()).toBe('lesson-edited.pdf');
  const saved=await PDFDocument.load(await require('fs/promises').readFile(await file.path()));expect(saved.getPageCount()).toBe(2);
  expect(external).toEqual([]);expect(errors).toEqual([]);
});

test('CipherSplat packages open in PDFsplat and reject modified bytes',async({page})=>{
  await page.goto('/#ciphersplat');const cipher=page.frameLocator('#tool-ciphersplat');
  await cipher.locator('#password').fill('desktop compatibility test password');
  const download=page.waitForEvent('download');
  await cipher.locator('#fileInput').setInputFiles({name:'handout.pdf',mimeType:'application/pdf',buffer:await sourcePDF()});
  await expect(cipher.locator('#resultTitle')).toContainText('Encryption complete');
  const file=await download;
  const bytes=await require('fs/promises').readFile(await file.path());expect(bytes.subarray(0,8).toString()).toBe('CSPCS4!!');
  await page.locator('#appsMenu').evaluate(menu=>menu.open=true);await page.getByRole('button',{name:'PDFsplat',exact:true}).click();const pdf=page.frameLocator('#tool-pdfsplat');
  await editorReady(pdf);
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
      BeginFolderRestore:async()=> 'folder-token',AppendSaveDirectory:async(id,path)=>{window.__directory=path},AppendSave:async(...args)=>window.__writes.push(args),
      FinishSave:async()=>{window.__commits++;return 'saved-output'},CancelSave:async()=>{},OpenExternal:async()=>{},ToggleFullscreen:async()=>{}}}};
  });
  await page.goto('/#pdfsplat');await expect(page.locator('#desktopVersion')).toHaveText('vtest');
  await page.evaluate(async()=>{
    const bytes=new Uint8Array(2*1024*1024+17);bytes.fill(65);await SplatDesktop.saveBlob(new Blob([bytes]),'large.pdf');
    await SplatDesktop.saveFolder([{path:'classroom/empty.txt',blob:new Blob([])},{path:'classroom/notes.txt',blob:new Blob(['notes'])}],undefined,['classroom/empty-directory']);
  });
  const result=await page.evaluate(()=>({name:__name,writes:__writes.map(([token,path,data,first])=>({token,path,size:atob(data).length,first})),commits:__commits}));
  expect(await page.evaluate(()=>__directory)).toBe('classroom/empty-directory');
  expect(result.name).toBe('large.pdf');expect(result.writes.map(x=>x.size)).toEqual([1048576,1048576,17,0,5]);
  expect(result.writes[3]).toMatchObject({token:'folder-token',path:'classroom/empty.txt',first:true});expect(result.commits).toBe(2);
});

test('save cancellation and failure keep the workspace usable',async({page})=>{
  await page.addInitScript(()=>{window.__cancelled=[];window.go={main:{App:{Version:async()=> 'test',SmokeEnabled:async()=>false,BeginSave:async()=>'',AppendSave:async()=>{},FinishSave:async()=>'',CancelSave:async id=>__cancelled.push(id)}}};});
  await page.goto('/#pdfsplat');await expect(page.locator('#desktopVersion')).toHaveText('vtest');
  expect(await page.evaluate(()=>SplatDesktop.saveBlob(new Blob(['keep']),'source.pdf'))).toBe(false);
  await expect(page.locator('#desktopStatus')).toContainText('cancelled');
  await page.evaluate(async()=>{go.main.App.BeginSave=async()=> 'bad';go.main.App.AppendSave=async()=>{throw Error('Disk full')};try{await SplatDesktop.saveBlob(new Blob(['keep']),'source.pdf')}catch{}});
  await expect(page.locator('#desktopStatus')).toContainText('Disk full');expect(await page.evaluate(()=>__cancelled)).toEqual(['bad']);
});
