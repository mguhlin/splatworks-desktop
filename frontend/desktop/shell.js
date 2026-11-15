/* Shared desktop capabilities. Tool code never receives a native file path. */
(() => {
  'use strict';
  const status = document.getElementById('desktopStatus');
  const help = document.getElementById('helpDialog');
  let backend, tools = [], active = '', saving = Promise.resolve();
  const frames = new Map();
  const say = message => { status.textContent = message; };
  const bytesToBase64 = bytes => {
    let binary = '';
    for (let at=0; at<bytes.length; at+=32768) binary += String.fromCharCode(...bytes.subarray(at,at+32768));
    return btoa(binary);
  };
  async function append(id, blob, name = '') {
    const chunkSize = 1024*1024;
    for (let at=0; at<blob.size || at===0; at+=chunkSize) {
      const bytes = new Uint8Array(await blob.slice(at, at+chunkSize).arrayBuffer());
      await backend.AppendSave(id, name, bytesToBase64(bytes), at===0);
      if (!blob.size) break;
    }
  }
  function enqueue(operation) {
    const next = saving.then(operation);
    saving = next.catch(error => { say('Save failed: '+error.message); });
    return next;
  }
  function browserSave(blob,name) {
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  async function saveBlob(blob,name) {
    if (!backend) { browserSave(blob,name); return true; }
    return enqueue(async () => {
      say('Choose a destination for '+name+'…');
      const id=await backend.BeginSave(name);
      if (!id) { say('Save cancelled. Your work is still open.'); return false; }
      try {
        say('Saving '+name+'…');await append(id,blob);
        const saved=await backend.FinishSave(id);say('Saved '+saved);return true;
      } catch(error) { await backend.CancelSave(id);throw error; }
    });
  }
  async function saveFolder(files) {
    if (!backend) throw Error('Native folder restoration requires the desktop window.');
    return enqueue(async () => {
      say('Choose where to restore the folder…');
      const id=await backend.BeginFolderRestore();
      if (!id) { say('Folder restoration cancelled.');return false; }
      try {
        for (const item of files) { say('Restoring '+item.path+'…');await append(id,item.blob,item.path); }
        const saved=await backend.FinishSave(id);say('Restored '+files.length+' file(s) into '+saved);return true;
      } catch(error) { await backend.CancelSave(id);throw error; }
    });
  }
  function selectTool(id,hash='') {
    const tool=tools.find(t=>t.id===id);if (!tool) return;
    if (!frames.has(id)) {
      const frame=document.createElement('iframe');frame.title=tool.name+' workspace';frame.id='tool-'+id;
      // Keeping the two same-origin frames mounted preserves open documents.
      frame.src=tool.path+(hash||'');frames.set(id,frame);document.getElementById('workspaces').append(frame);
    }
    for (const [key,frame] of frames) frame.hidden=key!==id;
    for (const button of document.querySelectorAll('[data-tool]')) {
      if (button.dataset.tool===id) button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    }
    if (hash) {
      const frame=frames.get(id);
      const focus=()=>frame.contentDocument?.getElementById(hash.replace(/^#/,''))?.scrollIntoView();
      frame.addEventListener('load',focus,{once:true});focus();
    }
    active=id;history.replaceState(null,'','#'+id);
  }
  async function openLink(raw) {
    const url=new URL(raw,location.href);
    const tool=tools.find(t=>url.origin===location.origin&&url.pathname.startsWith(t.path));
    if (tool) { selectTool(tool.id,url.hash);return; }
    if (url.origin===location.origin && (/\/docs\//.test(url.pathname)||/LICENSE|NOTICE/.test(url.pathname))) { help.showModal();return; }
    if (url.protocol==='https:') {
      if (backend) await backend.OpenExternal(url.href);else window.open(url.href,'_blank','noopener');
    } else if (url.origin===location.origin) {
      await openLink('https://splatworks.org'+url.pathname+url.search+url.hash);
    }
  }
  const bridge={saveBlob,saveFolder,selectTool,openLink,help:()=>help.showModal(),status:say,fullscreen:()=>backend?.ToggleFullscreen(),get native(){return !!backend},get active(){return active},get frames(){return frames}};
  window.SplatDesktop=bridge;
  document.getElementById('helpButton').onclick=()=>help.showModal();
  document.addEventListener('click',event=>{
    const a=event.target.closest('a[href]');if(!a)return;
    if(a.hash==='#pdfsplat'&&a.origin===location.origin){event.preventDefault();selectTool('pdfsplat');return;}
    if(a.protocol==='https:'){event.preventDefault();void openLink(a.href);}
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='F1'){event.preventDefault();help.showModal();}
    if((event.ctrlKey||event.metaKey)&&event.key==='1'){event.preventDefault();selectTool('pdfsplat');}
    if((event.ctrlKey||event.metaKey)&&event.key==='2'){event.preventDefault();selectTool('ciphersplat');}
  });
  (async()=>{
    backend=window.go?.main?.App;
    tools=await (await fetch('/tools.json')).json();
    for(const tool of tools){const button=document.createElement('button');button.type='button';button.textContent=tool.name;button.dataset.tool=tool.id;button.onclick=()=>selectTool(tool.id);document.getElementById('tools').append(button);}
    document.getElementById('desktopVersion').textContent=backend?'v'+await backend.Version():'Browser preview';
    selectTool(tools.some(t=>t.id===location.hash.slice(1))?location.hash.slice(1):tools[0].id);
    say(backend?'Local tools ready. Open a file to begin.':'Local browser mode. Saves use browser downloads.');
    if(backend&&await backend.SmokeEnabled()){const script=document.createElement('script');script.src='/desktop/native-smoke.js';document.head.append(script);}
  })().catch(error=>say('Could not start: '+error.message));
})();
