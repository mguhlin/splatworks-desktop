/* Small adapter shared by the installed tools; upstream PDF/crypto stays local. */
(() => {
  'use strict';
  const desktop=window.parent!==window?(window.parent.SplatDesktop||window.parent.SplatWorkspace):null;
  if(!desktop)return;
  window.SplatDesktop=desktop;
  window.SplatPrivacy={getState:()=>({optionalConnections:desktop.onlineEnabled})};
  const fetchOriginal=window.fetch.bind(window);
  window.fetch=(input,init)=>{const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.href);if(url.origin===location.origin||['data:','blob:'].includes(url.protocol))return fetchOriginal(input,init);if(!desktop.onlineEnabled)return Promise.reject(Error('Optional online connections are off. Enable them in Settings.'));return fetchOriginal('/desktop/remote?url='+encodeURIComponent(url.href),{...init,credentials:'omit',referrerPolicy:'no-referrer'});};
  const blobs=new Map(),create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
  URL.createObjectURL=value=>{const url=create(value);if(value instanceof Blob)blobs.set(url,value);return url;};
  URL.revokeObjectURL=url=>{blobs.delete(url);revoke(url);};
  function download(a){
    if(!a.hasAttribute('download')||!a.href.startsWith('blob:'))return false;
    const blob=blobs.get(a.href);if(!blob)return false;
    void desktop.saveBlob(blob,a.download||'document').catch(error=>desktop.status('Save failed: '+error.message));return true;
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
    const id=desktop.toolId(location.pathname);
    if(id==='ciphersplat')desktop.registerCommands(id,{open:()=>document.getElementById('chooseFiles')?.click(),save:()=>{const result=document.getElementById('resultPanel');if(result&&!result.classList.contains('hidden'))document.getElementById('downloadResult')?.click();else desktop.status('Encrypt or unlock something before saving a result.');}});
    for(const type of ['input','change','click'])document.addEventListener(type,()=>queueMicrotask(()=>desktop.changed(id)));
    const drive=document.getElementById('saveDriveButton');if(drive)drive.hidden=true;
    const launcher=document.querySelector('[data-ds-app-launcher]');if(launcher)launcher.hidden=true;
    for(const a of document.querySelectorAll('.online-link')){a.classList.remove('online-link');a.href='https://splatworks.org/pages/tools';}
    const full=document.getElementById('fullscreenButton');
    if(full&&desktop.native)full.addEventListener('click',event=>{event.stopImmediatePropagation();desktop.fullscreen();},true);
    const docs=document.querySelectorAll('a[href*="docs/pdfsplat"]');for(const a of docs)a.addEventListener('click',event=>{event.preventDefault();desktop.help();});
  });
  window.addEventListener('keydown',event=>{
    if(event.key==='F1'){event.preventDefault();desktop.help();return;}
    if((event.ctrlKey||event.metaKey)&&!event.altKey&&!event.shiftKey&&['s','o'].includes(event.key.toLowerCase())&&!document.querySelector('dialog[open]')){if(desktop.command(desktop.toolId(location.pathname),event.key.toLowerCase()==='s'?'save':'open'))event.preventDefault();}
    if((event.ctrlKey||event.metaKey)&&['1','2'].includes(event.key)){event.preventDefault();desktop.selectIndex(Number(event.key)-1);}
  });
})();
