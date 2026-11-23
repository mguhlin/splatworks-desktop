/* Small adapter shared by the installed tools; upstream PDF/crypto stays local. */
(() => {
  'use strict';
  const desktop=window.parent!==window?(window.parent.SplatDesktop||window.parent.SplatWorkspace):null;
  if(!desktop)return;
  window.SplatDesktop=desktop;
  // Password/text handlers depend on browser.js, which loads after app.js.
  // Keep early typing out of this workspace until both scripts have initialized.
  if(desktop.toolId(location.pathname)==='ciphersplat'){
    document.documentElement.inert=true;
    document.addEventListener('DOMContentLoaded',()=>{document.documentElement.inert=false;},{once:true});
  }
  window.SplatPrivacy={getState:()=>({optionalConnections:desktop.onlineEnabled})};
  const fetchOriginal=window.fetch.bind(window);
  window.fetch=(input,init)=>{const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.href);if(url.origin===location.origin||['data:','blob:'].includes(url.protocol))return fetchOriginal(input,init);if(!desktop.onlineEnabled)return Promise.reject(Error('Optional online connections are off. Enable them in Settings.'));return fetchOriginal('/desktop/remote?url='+encodeURIComponent(url.href),{...init,credentials:'omit',referrerPolicy:'no-referrer'});};
  const blobs=new Map(),create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
  URL.createObjectURL=value=>{const url=create(value);if(value instanceof Blob)blobs.set(url,value);return url;};
  URL.revokeObjectURL=url=>{blobs.delete(url);revoke(url);};
  function download(a){
    if(!a.hasAttribute('download')||! /^(blob:|data:)/.test(a.href))return false;
    if(a.href.startsWith('data:')&&a.href.length>64*1024*1024){desktop.status('This image export is too large. Choose a smaller image.');return true;}
    const blob=a.href.startsWith('blob:')?blobs.get(a.href):null;
    if(a.href.startsWith('blob:')&&!blob)return false;
    const content=blob?Promise.resolve(blob):fetchOriginal(a.href).then(response=>response.blob());
    void content.then(value=>desktop.saveBlob(value,a.download||'document'))
      .then(ok=>window.dispatchEvent(new CustomEvent('desktop:export-result',{detail:{ok}})))
      .catch(error=>{desktop.status('Save failed: '+error.message);window.dispatchEvent(new CustomEvent('desktop:export-result',{detail:{ok:false,error:error.message}}));});
    return true;
  }
  const click=HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click=function(){if(download(this))return;return click.call(this);};
  document.addEventListener('click',event=>{
    const a=event.target.closest('a[href]');if(!a)return;
    if(download(a)){event.preventDefault();return;}
    const url=new URL(a.href,location.href);
    if(url.origin===location.origin&&url.pathname===location.pathname&&url.hash)return;
    if(url.protocol==='blob:'||url.protocol==='data:')return;
    event.preventDefault();event.stopImmediatePropagation();void desktop.openLink(url.href);
  },true);
  window.open=(url)=>{if(url)void desktop.openLink(new URL(url,location.href).href);return null;};
  document.addEventListener('DOMContentLoaded',()=>{
    const theme=document.createElement('script');theme.src='/desktop/theme.js';document.head.append(theme);
    const id=desktop.toolId(location.pathname);
    if(id==='ciphersplat')desktop.registerCommands(id,{open:()=>document.getElementById('chooseFiles')?.click(),save:()=>{const result=document.getElementById('resultPanel');if(result&&!result.classList.contains('hidden'))document.getElementById('downloadResult')?.click();else desktop.status('Encrypt or unlock something before saving a result.');}});
    for(const type of ['input','change','click'])document.addEventListener(type,()=>queueMicrotask(()=>desktop.changed(id)));
    if(['listsplat','gridsplat','writesplat','showsplat','layoutsplat','plansplat'].includes(id)){
      for(const button of document.querySelectorAll('[data-action="save-drive"],[data-action="cloud-save"],[data-action="cloud-open"],#connectGoogle,#connectionNoteButton,#connectCalendar,#syncNow')){button.disabled=true;button.title='Use the browser edition for cloud connections.';}
      for(const button of document.querySelectorAll('[data-action="open-local-library"]')){button.textContent='Open saved file';button.title='Open a project saved on this device';}
      window.print=()=>{desktop.status('Export PDF or HTML, then open the saved file in your browser to print.');window.dispatchEvent(new CustomEvent('desktop:export-result',{detail:{ok:false,error:'Export PDF or HTML and open it in your browser to print'}}));};
    }
    const drive=document.getElementById('saveDriveButton');if(drive)drive.hidden=true;
    const launcher=document.querySelector('[data-ds-app-launcher]');if(launcher)launcher.hidden=true;
    for(const a of document.querySelectorAll('.online-link')){a.classList.remove('online-link');a.href='https://splatworks.org/pages/tools';}
    const full=document.getElementById('fullscreenButton');
    if(full&&desktop.native)full.addEventListener('click',event=>{event.stopImmediatePropagation();desktop.fullscreen();},true);
    const docs=document.querySelectorAll('a[href*="docs/pdfsplat"]');for(const a of docs)a.addEventListener('click',event=>{event.preventDefault();desktop.help();});
  });
  window.addEventListener('keydown',event=>{
    if(!['listsplat','gridsplat','writesplat','showsplat','layoutsplat','plansplat'].includes(desktop.toolId(location.pathname)))return;
    if((event.ctrlKey||event.metaKey)&&!event.altKey&&!event.shiftKey&&['s','o'].includes(event.key.toLowerCase())){
      event.preventDefault();event.stopImmediatePropagation();
      if(document.querySelector('dialog[open],[role=dialog][aria-modal=true]:not([hidden])'))return;
      desktop.command(desktop.toolId(location.pathname),event.key.toLowerCase()==='s'?'save':'open');
    }
  },true);
  window.addEventListener('keydown',event=>{
    if(event.key==='F1'){event.preventDefault();desktop.help();return;}
    if((event.ctrlKey||event.metaKey)&&!event.altKey&&!event.shiftKey&&['s','o'].includes(event.key.toLowerCase())){
      if([...document.querySelectorAll('dialog[open],[role=dialog][aria-modal=true]')].some(dialog=>dialog.getClientRects().length)){event.preventDefault();return;}
      if(desktop.command(desktop.toolId(location.pathname),event.key.toLowerCase()==='s'?'save':'open'))event.preventDefault();
    }
    if((event.ctrlKey||event.metaKey)&&event.key==='Home'){event.preventDefault();desktop.showHome();}
    if((event.ctrlKey||event.metaKey)&&/^[1-9]$/.test(event.key)){event.preventDefault();desktop.selectIndex(Number(event.key)-1);}
  });
})();
