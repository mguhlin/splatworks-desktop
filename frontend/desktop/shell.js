/* Shared desktop capabilities. Tool code never receives a native file path. */
(() => {
  'use strict';
  const status = document.getElementById('desktopStatus');
  const help = document.getElementById('helpDialog');
  let backend, tools = [], active = '', saving = Promise.resolve(),info;
  const frames = new Map();
  const workspaces=new Map();
  const leave=document.getElementById('leaveDialog'),leaveMessage=document.getElementById('leaveMessage'),discard=document.getElementById('discardWork');
  let operations=0, pendingDecision=null,approvedQuit=false;
  const say = message => { status.textContent = message; };
  function changed(id){const button=document.querySelector(`[data-tool="${id}"]`);if(button){const dirty=!!workspaces.get(id)?.isDirty();button.classList.toggle('has-unsaved',dirty);button.title=dirty?'Unsaved work':'';}}
  const dirtyTools=()=>[...workspaces].filter(([,workspace])=>workspace.isDirty()).map(([id])=>tools.find(t=>t.id===id)?.name||id);
  function refreshLeave(){if(leave.open&&pendingDecision?.kind==='close'){discard.disabled=operations>0;leaveMessage.textContent=operations?'An operation is still running. Wait for it to finish before closing.':dirtyTools().length?'Unsaved work in '+dirtyTools().join(' and ')+'. Keep working to save it, or discard it.':'The operation has finished. You can close the application.';}}
  function beginOperation(){operations++;refreshLeave();let finished=false;return()=>{if(finished)return;finished=true;operations--;refreshLeave();};}
  function decision(kind,message){
    if(pendingDecision)return Promise.resolve(false);
    return new Promise(resolve=>{pendingDecision={kind,resolve};leaveMessage.textContent=message;discard.textContent=kind==='close'?'Discard and close':'Discard and open';discard.disabled=kind==='close'&&operations>0;leave.showModal();});
  }
  function settle(value){const pending=pendingDecision;pendingDecision=null;leave.close();pending?.resolve(value);}
  document.getElementById('keepWorking').onclick=()=>settle(false);
  discard.onclick=()=>{if(pendingDecision?.kind==='close'&&operations){refreshLeave();return;}settle(true);};
  leave.addEventListener('cancel',event=>{event.preventDefault();settle(false);});
  async function requestClose(){
    if(pendingDecision)return false;
    const dirty=dirtyTools();
    if((operations||dirty.length)&&!await decision('close',operations?'An operation is still running. Wait for it to finish before closing.':'Unsaved work in '+dirty.join(' and ')+'. Save your work before closing, or discard it.'))return false;
    if(operations)return false;
    approvedQuit=true;
    try{await backend?.QuitWhenSafe?.();return true;}catch(error){approvedQuit=false;say(error.message);return false;}
  }
  async function confirmReplace(id){return !workspaces.get(id)?.isDirty()||await decision('replace','This will replace unsaved work in '+(tools.find(t=>t.id===id)?.name||id)+'. Save it first, or discard it.');}
  function saved(details){if(details?.complete&&details.tool){workspaces.get(details.tool)?.markSaved(details.stamp);changed(details.tool);}}
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
    const finish=beginOperation();
    const next = saving.then(operation).finally(finish);
    saving = next.catch(error => { say('Save failed: '+error.message); });
    return next;
  }
  function browserSave(blob,name) {
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  async function saveBlob(blob,name,details) {
    if (!backend) { browserSave(blob,name);saved(details); return true; }
    return enqueue(async () => {
      say('Choose a destination for '+name+'…');
      const id=await backend.BeginSave(name);
      if (!id) { say('Save cancelled. Your work is still open.'); return false; }
      try {
        say('Saving '+name+'…');await append(id,blob);
        const filename=await backend.FinishSave(id);saved(details);say('Saved '+filename);return true;
      } catch(error) { await backend.CancelSave(id);throw error; }
    });
  }
  async function saveFolder(files,details) {
    if (!backend) throw Error('Native folder restoration requires the desktop window.');
    return enqueue(async () => {
      say('Choose where to restore the folder…');
      const id=await backend.BeginFolderRestore();
      if (!id) { say('Folder restoration cancelled.');return false; }
      try {
        for (const item of files) { say('Restoring '+item.path+'…');await append(id,item.blob,item.path); }
        const folder=await backend.FinishSave(id);saved(details);say('Restored '+files.length+' file(s) into '+folder);return true;
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
  const bridge={saveBlob,saveFolder,selectTool,selectIndex:index=>{if(tools[index])selectTool(tools[index].id);},openLink,beginOperation,confirmReplace,requestClose,changed,
    toolId:path=>tools.find(tool=>path.startsWith(tool.path))?.id,
    get profile(){return info;},
    registerWorkspace:(id,workspace)=>{workspaces.set(id,workspace);changed(id);},
    get dirty(){return dirtyTools();},get busy(){return operations>0;},
    help:()=>help.showModal(),status:say,fullscreen:()=>backend?.ToggleFullscreen(),get native(){return !!backend},get active(){return active},get frames(){return frames}};
  window.SplatDesktop=bridge;
  document.getElementById('helpButton').onclick=()=>help.showModal();
  document.addEventListener('click',event=>{
    const a=event.target.closest('a[href]');if(!a)return;
    if(a.hash==='#pdfsplat'&&a.origin===location.origin){event.preventDefault();selectTool('pdfsplat');return;}
    if(a.protocol==='https:'){event.preventDefault();void openLink(a.href);}
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='F1'){event.preventDefault();help.showModal();}
    if((event.ctrlKey||event.metaKey)&&event.key==='1'){event.preventDefault();bridge.selectIndex(0);}
    if((event.ctrlKey||event.metaKey)&&event.key==='2'){event.preventDefault();bridge.selectIndex(1);}
  });
  (async()=>{
    backend=window.go?.main?.App;
    info=await (await fetch('/app.json')).json();
    document.title=info.name;document.querySelector('.desktop-brand').textContent=info.name;document.querySelector('.desktop-brand').setAttribute('aria-label',info.name+' home');
    document.querySelector('link[rel="icon"]').href='/'+info.icon;
    if(info.id!=='desktop'){
      const form=help.querySelector('form');help.replaceChildren();
      const heading=document.createElement('h1');heading.id='helpTitle';heading.textContent=info.name;help.append(heading);
      for(const text of [info.description,'Files are processed on this device. Use the tool controls to import files. Saving opens a native destination picker. Unsaved work is protected by a close warning; automatic recovery copies are not created.',...(info.help||[]),'AGPL-3.0-or-later. Source, notices, and downloads: github.com/mguhlin/splatworks-desktop.']){const p=document.createElement('p');p.textContent=text;help.append(p);}
      help.append(form);
    }
    if(backend&&window.runtime?.EventsOn)window.runtime.EventsOn('desktop:close-requested',()=>void requestClose());
    tools=await (await fetch('/tools.json')).json();
    for(const tool of tools){const button=document.createElement('button');button.type='button';button.textContent=tool.name;button.setAttribute('aria-label',tool.name);button.dataset.tool=tool.id;button.onclick=()=>selectTool(tool.id);document.getElementById('tools').append(button);}
    document.getElementById('desktopVersion').textContent=backend?'v'+await backend.Version():'Browser preview';
    selectTool(tools.some(t=>t.id===location.hash.slice(1))?location.hash.slice(1):tools[0].id);
    say(backend?'Local tools ready. Open a file to begin.':'Local browser mode. Saves use browser downloads.');
    await backend?.Ready?.();
    if(backend&&await backend.SmokeEnabled()){const script=document.createElement('script');script.src='/desktop/'+info.smoke;document.head.append(script);}
  })().catch(error=>say('Could not start: '+error.message));
  window.addEventListener('beforeunload',event=>{if(!approvedQuit&&(operations||dirtyTools().length)){event.preventDefault();event.returnValue='';}});
})();
