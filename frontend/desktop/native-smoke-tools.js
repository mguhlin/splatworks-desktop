/* Synthetic data only, enabled by the explicit --smoke-test command line. */
(async()=>{
 const desktop=SplatDesktop,app=go.main.App,id=desktop.profile.id,checks=[],errors=[],saved=[];
 const wait=async(fn,label)=>{const start=Date.now();while(!fn()){if(Date.now()-start>120000)throw Error('Timed out: '+label);await new Promise(r=>setTimeout(r,75));}};
 const check=(value,label)=>{if(!value)throw Error(label);checks.push(label);};
 const originalSave=desktop.saveBlob;
 desktop.saveBlob=async(blob,name,details)=>{if(id==='imagesplat'&&saved.length)name='ImageSplat-cutout.png';const ok=await originalSave(blob,name,details);saved.push({blob,name,ok});return ok;};
 const report=async(passed,error)=>app.CompleteSmoke(JSON.stringify({passed,profile:id,checks,errors,error:error?String(error.message||error)+'\n'+String(error.stack||''):null,userAgent:navigator.userAgent},null,2));
 const deadline=setTimeout(()=>void report(false,Error('Native smoke deadline exceeded')),210000);
 try{
  await wait(()=>desktop.frames.get(id)?.contentDocument?.readyState==='complete'&&desktop.frames.get(id)?.contentDocument?.title.length>0,'tool document');
  const win=desktop.frames.get(id).contentWindow,doc=win.document,$=id=>doc.getElementById(id);
  win.addEventListener('error',e=>errors.push(e.message));win.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
  const set=(id,value)=>{const input=$(id);input.value=value;input.dispatchEvent(new win.Event('input',{bubbles:true}));input.dispatchEvent(new win.Event('change',{bubbles:true}));};
  const importFiles=(input,files)=>{const data=new win.DataTransfer();for(const file of files)data.items.add(file);$(input).files=data.files;$(input).dispatchEvent(new win.Event('change',{bubbles:true}));};
  const png=async(color,name)=>{const c=doc.createElement('canvas');c.width=80;c.height=60;const cx=c.getContext('2d');cx.fillStyle='white';cx.fillRect(0,0,80,60);cx.fillStyle=color;cx.fillRect(20,20,40,20);return new win.File([await new Promise(r=>c.toBlob(r,'image/png'))],name,{type:'image/png'});};
  const warning=async()=>{const pending=desktop.requestClose();await wait(()=>document.getElementById('leaveDialog').open,'unsaved close warning');document.getElementById('keepWorking').click();check(!await pending,'close warning keeps unsaved work open');};
  check(desktop.native,'native Go bridge available');check(doc.title.length>0,'standalone tool document loaded');check(!!win.crypto.subtle,'Web Crypto available offline');
  if(id==='ciphersplat'){
   await wait(()=>typeof win.runRequested==='function','cipher startup');
   $('password').value='synthetic standalone password';win.setEntries([{file:new win.File(['Standalone Unicode: español 日本語'],'sample.txt'),path:'sample.txt'}]);
   await win.runRequested();check(!$('errorMessage').textContent,'Argon2id file encryption succeeds');await warning();await win.downloadResult();
   const encrypted=saved.find(s=>s.name==='sample.txt.csplat');check(encrypted?.ok,'encrypted file saved through Go');check(await encrypted.blob.slice(0,8).text()==='CSPCS4!!','CS4 format preserved');
   $('password').value='synthetic standalone password';const unlocked=await win.decryptFilesChunked(new win.File([await encrypted.blob.arrayBuffer()],'sample.csplat'));
   check(await unlocked.files[0].blob.text()==='Standalone Unicode: español 日本語','file decrypt restores exact Unicode bytes');
   const bad=new Uint8Array(await encrypted.blob.arrayBuffer());bad[bad.length-1]^=1;let rejected=false;try{await win.decryptFilesChunked(new win.File([bad],'bad.csplat'));}catch{rejected=true;}check(rejected,'tampered file fails authentication');
   $('password').value='wrong';rejected=false;try{await win.decryptFilesChunked(new win.File([await encrypted.blob.arrayBuffer()],'wrong.csplat'));}catch{rejected=true;}check(rejected,'wrong password rejected');$('password').value='synthetic standalone password';
   const keys=await win.openpgp.generateKey({type:'ecc',curve:'p256',userIDs:[{name:'Synthetic test'}],passphrase:'test key passphrase',format:'armored'});
   win.selectMode($('textTab'));win.setCryptoMethod('openpgp');win.setOperation('encrypt');$('textInput').value='Standalone OpenPGP round trip';$('pgpKeyInput').value=keys.publicKey;await win.runRequested();await win.downloadResult();
   const pgp=saved.find(s=>s.name==='encrypted-message.asc');check(pgp?.ok,'OpenPGP encryption exported');
   win.setOperation('decrypt');$('textInput').value=await pgp.blob.text();$('pgpKeyInput').value=keys.privateKey;$('pgpPassphrase').value='test key passphrase';await win.runRequested();await win.downloadResult();
   check(await saved.find(s=>s.name==='decrypted-message.txt').blob.text()==='Standalone OpenPGP round trip','OpenPGP decrypt restores plaintext');
   check(await desktop.saveFolder([{path:'nested/sample.txt',blob:unlocked.files[0].blob},{path:'nested/empty.txt',blob:new Blob([])}]),'native nested folder restoration');
  }else if(id==='gifsplat'){
   importFiles('frameInput',[await png('red','red.png'),await png('blue','blue.png')]);await wait(()=>doc.querySelectorAll('.frame-row').length===2,'import GIF frames');check(true,'two local image frames imported');await warning();
   set('delayInput','200');$('generateBtn').click();await wait(()=>!$('downloadBtn').disabled&&!desktop.busy,'GIF encoding');check(!!doc.querySelector('#previewWrap img'),'generated animation preview');$('downloadBtn').click();await wait(()=>saved.length===1,'GIF save');
   check(saved[0].ok&&await saved[0].blob.slice(0,6).text()==='GIF89a','GIF89a saved through native writer');check(!desktop.dirty.length,'saved animation clears matching unsaved state');set('delayInput','350');check(desktop.dirty.includes('GIFsplat'),'timing change remains unsaved');
   check($('recordVideoBtn').hidden&&$('recordVideoBtn').disabled,'unvalidated video capture excluded');
  }else if(id==='qrsplat'){
   await wait(()=>doc.querySelector('#qrPreview svg')&&!desktop.busy,'QR startup');set('qrContent','https://example.org/standalone');set('designName','Native QR');check($('payloadPreview').textContent==='https://example.org/standalone','local URL QR generation');await warning();
   $('downloadSvg').click();await wait(()=>saved.length===1,'SVG save');check(saved[0].ok&&/svg/.test(await saved[0].blob.text()),'SVG saved through native writer');
   $('downloadPng').click();await wait(()=>saved.length===2,'PNG save');check(saved[1].ok&&saved[1].blob.type==='image/png','PNG saved through native writer');check(!desktop.dirty.length,'QR export clears matching unsaved state');
   set('contentType','wifi');set('wifiName','Library;Guest');set('wifiPassword','synthetic:password');$('saveDesign').click();check(!win.localStorage.getItem('qrsplat.designs.v1').includes('synthetic:password'),'saved Wi-Fi designs exclude passwords');
   check($('payloadPreview').textContent.includes('Library\\;Guest'),'Wi-Fi separators escaped');check($('backendSetup').hidden&&doc.querySelector('[data-mode="editable"]').hidden,'network redirect service excluded');
  }else if(id==='imagesplat'){
   importFiles('imageInput',[await png('red','red.png')]);await wait(()=>doc.querySelectorAll('#layerList .layer').length===1,'image import');check(true,'local image imported as layer');await warning();
   doc.querySelector('[data-action="exportPng"]').click();await wait(()=>saved.length===1,'image export');check(saved[0].ok&&saved[0].blob.type==='image/png','artwork PNG saved natively');check(!desktop.dirty.length,'full artwork export clears matching unsaved state');
   doc.querySelector('[data-action="duplicate"]').click();await wait(()=>doc.querySelectorAll('#layerList .layer').length===2,'duplicate layer');check(desktop.dirty.includes('ImageSplat'),'new layer remains unsaved');
   doc.querySelector('[data-action="undo"]').click();check(doc.querySelectorAll('#layerList .layer').length===1,'layer undo restores original artwork');
   doc.querySelector('#layerList .layer').click();doc.querySelector('[data-action="removeBg"]').click();await wait(()=>$('bs-process'),'background studio');check($('bs-mode').value==='white','offline white background mode');$('bs-process').click();await wait(()=>!$('bs-apply').disabled,'white background worker');check(true,'background worker runs offline');$('bs-apply').click();await wait(()=>!$('bs-process'),'apply cutout');
   doc.querySelector('[data-action="exportPng"]').click();await wait(()=>saved.length===2,'cutout export');check(saved[1].ok,'transparent cutout exported');
   for(const action of ['captureScreen','greenScreen','fontsplat','smartRemoveBg'])check([...doc.querySelectorAll('[data-action="'+action+'"]')].every(b=>b.hidden&&b.disabled),'offline feature scope: '+action);
  }else throw Error('Unknown profile '+id);
  await wait(()=>!desktop.busy,'operations complete');check(errors.length===0,'no JavaScript errors');clearTimeout(deadline);await report(true);
 }catch(error){clearTimeout(deadline);await report(false,error);}
})();
