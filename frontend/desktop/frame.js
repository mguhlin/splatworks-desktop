/* Small adapter shared by the installed tools; upstream PDF/crypto stays local. */
(() => {
  'use strict';
  const desktop=window.parent!==window?window.parent.SplatDesktop:null;
  if(!desktop)return;
  window.SplatDesktop=desktop;
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
    const drive=document.getElementById('saveDriveButton');if(drive)drive.hidden=true;
    const launcher=document.querySelector('[data-ds-app-launcher]');if(launcher)launcher.hidden=true;
    for(const a of document.querySelectorAll('.online-link')){a.classList.remove('online-link');a.href='https://splatworks.org/pages/tools';}
    const full=document.getElementById('fullscreenButton');
    if(full&&desktop.native)full.addEventListener('click',event=>{event.stopImmediatePropagation();desktop.fullscreen();},true);
    const docs=document.querySelectorAll('a[href*="docs/pdfsplat"]');for(const a of docs)a.addEventListener('click',event=>{event.preventDefault();desktop.help();});
  });
  window.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&['1','2'].includes(event.key)){event.preventDefault();desktop.selectTool(event.key==='1'?'pdfsplat':'ciphersplat');}
  });
})();
