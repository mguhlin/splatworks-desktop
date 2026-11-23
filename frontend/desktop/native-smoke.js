/* Explicit --smoke-test only: synthetic documents, real WebKit/WebView2/WKWebView,
 * real PDF/OCR/crypto engines, and the production Go chunked-save implementation. */
(async () => {
  const app=window.go.main.App, desktop=window.SplatDesktop, checks=[],errors=[];
  const wait=async(predicate,label,timeout=90000)=>{
    const start=Date.now();while(!predicate()){if(Date.now()-start>timeout)throw Error('Timed out: '+label);await new Promise(resolve=>setTimeout(resolve,100));}
  };
  window.addEventListener('error',event=>errors.push(event.message));
  const check=(condition,label)=>{if(!condition)throw Error(label);checks.push(label);};
  const saved=[];const save=desktop.saveBlob;
  desktop.saveBlob=async(blob,name,details)=>{const ok=await save(blob,name,details);saved.push({blob,name,ok});return ok;};
  const report=async(passed,error)=>app.CompleteSmoke(JSON.stringify({passed,checks,error:error?String(error.message)+'\n'+String(error.stack||''):null,errors,userAgent:navigator.userAgent},null,2));
  const deadline=setTimeout(()=>void report(false,Error('Native smoke deadline exceeded')),210000);
  try {
    await wait(()=>desktop.frames.get('pdfsplat')?.contentWindow?.PDFLib,'PDF library');
    const pdf=desktop.frames.get('pdfsplat').contentWindow;
    await wait(()=>pdf.document.getElementById('fileInput')?.onchange,'PDF editor startup');
    check(!!pdf.crypto.subtle,'secure context provides Web Crypto');
    const source=await pdf.PDFLib.PDFDocument.create();
    source.addPage(pdf.Array.of(400,500)).drawText('SplatWorks Desktop PDF test',{x:35,y:440,size:18});
    source.addPage(pdf.Array.of(400,500)).drawText('Second page',{x:35,y:440,size:18});
    const open=async(bytes,name)=>{
      const input=pdf.document.getElementById('fileInput'),dt=new pdf.DataTransfer();
      dt.items.add(new pdf.File([bytes],name,{type:'application/pdf'}));input.files=dt.files;input.dispatchEvent(new pdf.Event('change',{bubbles:true}));
      await wait(()=>pdf.document.getElementById('status').textContent.startsWith(name+' opened.'),'open two-page PDF');
    };
    await open(await source.save(),'desktop-lesson.pdf');
    check(pdf.document.getElementById('pdfCanvas').width>0,'PDF.js renders a local PDF');
    pdf.document.getElementById('addTextButton').click();
    pdf.document.getElementById('annotationLayer').dispatchEvent(new pdf.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
    await wait(()=>pdf.document.querySelector('.text-object'),'insert annotation');
    const value=pdf.document.getElementById('textValue');value.value='Native desktop annotation';value.dispatchEvent(new pdf.Event('input',{bubbles:true}));value.dispatchEvent(new pdf.Event('change',{bubbles:true}));
    const inline=pdf.document.querySelector('.inline-text-editor');if(inline){inline.value=value.value;inline.dispatchEvent(new pdf.Event('input',{bubbles:true}));}
    pdf.document.activeElement?.blur();
    const closing=desktop.requestClose();await wait(()=>document.getElementById('leaveDialog').open,'unsaved close prompt');
    document.getElementById('keepWorking').click();check(!await closing&&desktop.dirty.includes('PDFsplat'),'unsaved PDF close warning preserves work');
    pdf.document.getElementById('rotateRightButton').click();
    // Link-aware rotation loads source geometry asynchronously. Save only after
    // that edit completes; saving during a new edit must keep its dirty warning.
    await wait(()=>pdf.document.getElementById('status').textContent.endsWith('rotated.')&&!desktop.busy,'page rotation completion');
    const select=pdf.document.getElementById('saveAsSelect');select.value='pdf';select.dispatchEvent(new pdf.Event('change',{bubbles:true}));
    await wait(()=>saved.some(item=>item.name==='desktop-lesson-edited.pdf'),'native PDF save');
    const edited=saved.find(item=>item.name==='desktop-lesson-edited.pdf');
    const reopened=await pdf.PDFLib.PDFDocument.load(new pdf.Uint8Array(await edited.blob.arrayBuffer()));
    check(edited.ok&&reopened.getPageCount()===2,'edited PDF saves through Go and reopens');
    check(reopened.getPage(0).getRotation().angle===90,'page rotation survives native export');
    check(!desktop.dirty.includes('PDFsplat'),'successful native PDF save clears only saved edits');
    await open(await edited.blob.arrayBuffer(),'desktop-reopened.pdf');
    check(pdf.document.querySelectorAll('.text-object').length===0,'saved annotations flatten and reopened document renders');

    desktop.selectTool('ciphersplat');
    await wait(()=>typeof desktop.frames.get('ciphersplat')?.contentWindow?.runRequested==='function','CipherSplat startup');
    const cipher=desktop.frames.get('ciphersplat').contentWindow;
    cipher.document.getElementById('password').value='synthetic smoke test password';
    cipher.setEntries([{file:new cipher.File([await edited.blob.arrayBuffer()],'desktop-lesson.pdf',{type:'application/pdf'}),path:'desktop-lesson.pdf'}]);
    await cipher.runRequested();
    check(!cipher.document.getElementById('errorMessage').textContent,'CipherSplat encrypts with bundled Argon2id worker');
    await cipher.downloadResult();
    await wait(()=>saved.some(item=>item.name==='desktop-lesson.pdf.csplat'),'native encrypted package save');
    const encrypted=saved.find(item=>item.name==='desktop-lesson.pdf.csplat');
    check(await encrypted.blob.slice(0,8).text()==='CSPCS4!!','CipherSplat preserves the CS4 package format');
    cipher.document.getElementById('password').value='synthetic smoke test password';
    const unlocked=await cipher.decryptFilesChunked(new cipher.File([await encrypted.blob.arrayBuffer()],'desktop.csplat'));
    const originalBytes=new Uint8Array(await edited.blob.arrayBuffer()),restoredBytes=new Uint8Array(await unlocked.files[0].blob.arrayBuffer());
    check(restoredBytes.length===originalBytes.length&&restoredBytes.every((value,index)=>value===originalBytes[index]),'CS4 decrypt restores the original PDF bytes');
    const tampered=new Uint8Array(await encrypted.blob.arrayBuffer());tampered[tampered.length-1]^=1;
    let rejected=false;try{await cipher.decryptFilesChunked(new cipher.File([tampered],'bad.csplat'));}catch{rejected=true;}
    check(rejected,'modified encrypted package fails authentication');
    cipher.document.getElementById('password').value='wrong password';
    let wrongRejected=false;try{await cipher.decryptFilesChunked(new cipher.File([await encrypted.blob.arrayBuffer()],'wrong.csplat'));}catch{wrongRejected=true;}
    check(wrongRejected,'wrong password produces no decrypted output');
    cipher.document.getElementById('password').value='synthetic smoke test password';
    for(const bytes of [new Uint8Array(await encrypted.blob.slice(0,-1).arrayBuffer()),new cipher.Uint8Array([...(new Uint8Array(await encrypted.blob.arrayBuffer())),1])]){
      let refused=false;try{await cipher.decryptFilesChunked(new cipher.File([bytes],'invalid.csplat'));}catch{refused=true;}check(refused,'truncated or appended CS4 records are rejected');
    }
    check(await desktop.saveFolder([{path:'classroom/lesson.pdf',blob:unlocked.files[0].blob},{path:'classroom/empty.txt',blob:new Blob([])}]),'native folder restoration preserves nested paths and empty files');
    const textBytes=new cipher.TextEncoder().encode('Private note: español 日本語');
    const textPackage=await cipher.encryptData(textBytes,'text','note.txt',[]);const textOpen=await cipher.decryptData(textPackage);
    check(new cipher.TextDecoder().decode(textOpen.data)==='Private note: español 日本語','Unicode text vault round trip preserves exact plaintext');
    const keys=await cipher.openpgp.generateKey({type:'ecc',curve:'p256',userIDs:[{name:'Synthetic desktop test'}],passphrase:'synthetic key passphrase',format:'armored'});
    cipher.selectMode(cipher.document.getElementById('textTab'));cipher.setCryptoMethod('openpgp');cipher.setOperation('encrypt');
    cipher.document.getElementById('textInput').value='OpenPGP desktop round trip';cipher.document.getElementById('pgpKeyInput').value=keys.publicKey;
    await cipher.runRequested();await cipher.downloadResult();
    const pgp=saved.find(item=>item.name==='encrypted-message.asc');check(!!pgp&&pgp.ok,'OpenPGP text encryption saves through native output');
    cipher.setOperation('decrypt');cipher.document.getElementById('textInput').value=await pgp.blob.text();cipher.document.getElementById('pgpKeyInput').value=keys.privateKey;cipher.document.getElementById('pgpPassphrase').value='synthetic key passphrase';
    await cipher.runRequested();await cipher.downloadResult();const pgpPlain=saved.find(item=>item.name==='decrypted-message.txt');
    check(await pgpPlain.blob.text()==='OpenPGP desktop round trip','OpenPGP private-key decryption restores the message');
    const cancelled=await app.BeginSave('cancelled-output.bin');await app.AppendSave(cancelled,'','YQ==',true);await app.CancelSave(cancelled);
    let expired=false;try{await app.AppendSave(cancelled,'','YQ==',false);}catch{expired=true;}check(expired,'cancelled native saves invalidate their capability token');
    desktop.selectTool('pdfsplat');
    check(pdf.document.getElementById('pagePosition').textContent.includes('/ 2'),'switching tools preserves the open PDF');

    // The OCR worker and English model run from the bundled origin, offline.
    const canvas=pdf.document.createElement('canvas');canvas.width=1400;canvas.height=400;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,1400,400);ctx.fillStyle='#000';ctx.font='54px sans-serif';ctx.fillText('SPLATWORKS DESKTOP',60,110);ctx.fillText('LOCAL OCR WORKS',60,220);ctx.fillText('EL CICLO DEL AGUA',60,330);
    const image=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    const scan=await pdf.PDFLib.PDFDocument.create();const picture=await scan.embedPng(new pdf.Uint8Array(await image.arrayBuffer()));
    scan.addPage(pdf.Array.of(700,200)).drawImage(picture,{x:0,y:0,width:700,height:200});
    const dt=new pdf.DataTransfer();dt.items.add(new pdf.File([await scan.save()],'scan.pdf',{type:'application/pdf'}));
    const input=pdf.document.getElementById('fileInput');input.files=dt.files;input.dispatchEvent(new pdf.Event('change',{bubbles:true}));
    await wait(()=>pdf.document.getElementById('pagePosition').textContent==='1 / 1','open scan');
    pdf.document.getElementById('ocrButton').click();pdf.document.getElementById('ocrLanguage').value='eng+spa';pdf.document.getElementById('ocrRun').click();
    await wait(()=>!pdf.document.getElementById('ocrRun').disabled,'OCR completion',120000);
    const lines=[...pdf.document.querySelectorAll('#ocrResults textarea')].map(node=>node.value).join(' ');
    check(/SPLATWORKS/i.test(lines)&&/LOCAL OCR WORKS/i.test(lines),'bundled Tesseract recognizes scanned English text offline');
    check(/CICLO DEL AGUA/i.test(lines),'bundled English and Spanish OCR models load and recognize locally');
    pdf.document.getElementById('ocrApply').click();
    await wait(()=>pdf.document.querySelectorAll('.ocr-text').length>=2,'editable OCR text');
    check(pdf.document.querySelectorAll('.ocr-text').length>=2,'reviewed OCR becomes editable text');
    clearTimeout(deadline);await report(true);
  } catch(error) { clearTimeout(deadline);await report(false,error); }
})();
