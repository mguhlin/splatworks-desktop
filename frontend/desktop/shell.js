/* Shared desktop capabilities. Tool code never receives a native file path. */
(() => {
  'use strict';
  const status = document.getElementById('desktopStatus');
  const help = document.getElementById('helpDialog');
  let backend, tools = [], active = '', saving = Promise.resolve(),info,online=false;
  const frames = new Map();
  const workspaces=new Map(),commands=new Map(),fileReceivers=new Map();
  const leave=document.getElementById('leaveDialog'),leaveMessage=document.getElementById('leaveMessage'),discard=document.getElementById('discardWork');
  let operations=0, pendingDecision=null,approvedQuit=false;
  const say = message => { status.textContent = message; };
  function changed(id){for(const button of document.querySelectorAll(`[data-tool="${id}"]`)){const dirty=!!workspaces.get(id)?.isDirty();button.classList.toggle('has-unsaved',dirty);button.title=dirty?'Unsaved work':'';}}
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
  async function saveFolder(files,details,directories=[]) {
    if (!backend) throw Error('Native folder restoration requires the desktop window.');
    return enqueue(async () => {
      say('Choose where to restore the folder…');
      const id=await backend.BeginFolderRestore();
      if (!id) { say('Folder restoration cancelled.');return false; }
      try {
        for (const path of directories) await backend.AppendSaveDirectory(id,path);
        for (const item of files) { say('Restoring '+item.path+'…');await append(id,item.blob,item.path); }
        const folder=await backend.FinishSave(id);saved(details);say('Restored '+files.length+' file(s) into '+folder);return true;
      } catch(error) { await backend.CancelSave(id);throw error; }
    });
  }
  function showHome(){
    if(info?.id!=='desktop')return selectTool(tools[0]?.id);
    for(const frame of frames.values())frame.hidden=true;
    document.getElementById('appHome').hidden=false;
    for(const button of document.querySelectorAll('[data-tool]'))button.removeAttribute('aria-current');
    document.getElementById('homeButton').setAttribute('aria-current','page');
    document.getElementById('appsMenu').open=false;document.getElementById('currentApp').textContent='Choose an app';
    active='home';history.replaceState(null,'','#home');
  }
  function selectTool(id,hash='') {
    const tool=tools.find(t=>t.id===id);if (!tool) return;
    document.getElementById('appHome').hidden=true;document.getElementById('homeButton').removeAttribute('aria-current');
    if (!frames.has(id)) {
      const frame=document.createElement('iframe');frame.title=tool.name+' workspace';frame.id='tool-'+id;
      if(['videosplat','audiosplat','qrsplat','pdfsplat'].includes(id))frame.allow='camera \'self\'; microphone \'self\'; display-capture \'self\'';
      // Mounted workspaces retain their open documents while switching apps.
      if(tool.source?.startsWith('splatworks/'))frame.inert=true;
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
    active=id;document.getElementById('appsMenu').open=false;document.getElementById('currentApp').textContent=tool.name;history.replaceState(null,'','#'+id);
  }
  async function openWorkspaceFile(id,file){
    if(Object.prototype.toString.call(file)!=='[object File]'||file.size>20_000_000)throw Error('Choose a supported file under 20 MB.');
    if(!tools.some(tool=>tool.id===id))throw Error('This app is not installed.');
    selectTool(id);
    const deadline=Date.now()+30000;
    while(!fileReceivers.has(id)){if(Date.now()>deadline)throw Error('The workspace could not start. Choose the file again.');await new Promise(resolve=>setTimeout(resolve,50));}
    await fileReceivers.get(id)(file);
  }
  async function openLink(raw) {
    const url=new URL(raw,location.href);
    const tool=tools.find(t=>url.origin===location.origin&&url.pathname.startsWith(t.path));
    if (tool) {
      selectTool(tool.id,url.hash);
      if(tool.id==='ciphersplat'){
        const frame=frames.get(tool.id);if(!frame.contentWindow?.CipherSplatWorkspace)await new Promise(resolve=>frame.addEventListener('load',resolve,{once:true}));
        const workspace=frame.contentWindow.CipherSplatWorkspace;
        if(url.pathname.endsWith('/help.html'))workspace?.showHelp();
        else await workspace?.switchMode(url.pathname.endsWith('/openpgp.html')?'openpgp':'password');
      }
      return;
    }
    if (url.origin===location.origin && (/\/docs\//.test(url.pathname)||/LICENSE|NOTICE/.test(url.pathname))) { help.showModal();return; }
    if (url.protocol==='https:') {
      if (backend) await backend.OpenExternal(url.href);else window.open(url.href,'_blank','noopener');
    } else if (url.origin===location.origin) {
      await openLink('https://splatworks.org'+url.pathname+url.search+url.hash);
    }
  }
  const showHelp=()=>{const workspace=active==='ciphersplat'&&frames.get(active)?.contentWindow?.CipherSplatWorkspace;if(workspace)workspace.showHelp();else help.showModal();};
  const bridge={registerFileReceiver:(id,receive)=>fileReceivers.set(id,receive),openWorkspaceFile,get onlineEnabled(){return online;},registerCommands:(id,actions)=>commands.set(id,actions),command:(id,name)=>{const action=commands.get(id)?.[name];if(!action)return false;void action();return true;},saveBlob,saveFolder,selectTool,showHome,selectIndex:index=>{if(tools[index])selectTool(tools[index].id);},openLink,beginOperation,confirmReplace,requestClose,changed,
    toolId:path=>tools.find(tool=>path.startsWith(tool.path))?.id,
    get profile(){return info;},
    registerWorkspace:(id,workspace)=>{workspaces.set(id,workspace);if(frames.has(id))frames.get(id).inert=false;changed(id);},
    get dirty(){return dirtyTools();},get busy(){return operations>0;},
    help:showHelp,status:say,fullscreen:()=>backend?.ToggleFullscreen(),get native(){return !!backend},get active(){return active},get frames(){return frames}};
  window.SplatDesktop=bridge;
  document.getElementById('homeButton').onclick=showHome;
  document.getElementById('settingsButton').onclick=()=>document.getElementById('settingsDialog').showModal();
  document.getElementById('optionalOnline').onchange=async event=>{const input=event.target;input.disabled=true;try{await backend.SetOnlineEnabled(input.checked);online=input.checked;document.getElementById('onlineStatus').textContent=online?'Optional online connections enabled.':'Optional online connections off.';}catch(error){online=!!await backend?.OnlineEnabled?.();input.checked=online;document.getElementById('onlineStatus').textContent=error.message;}finally{input.disabled=!backend;}};
  document.getElementById('helpButton').onclick=showHelp;
  document.addEventListener('keydown',event=>{if(event.key==='Escape')document.getElementById('appsMenu').open=false;});
  document.addEventListener('pointerdown',event=>{if(!event.target.closest('#appsMenu'))document.getElementById('appsMenu').open=false;});
  document.addEventListener('click',event=>{
    const a=event.target.closest('a[href]');if(!a)return;
    if(a.hash==='#home'&&a.origin===location.origin){event.preventDefault();showHome();return;}
    if(a.protocol==='https:'){event.preventDefault();void openLink(a.href);}
  });
  document.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&!event.altKey&&!event.shiftKey&&['s','o'].includes(event.key.toLowerCase())&&!document.querySelector('dialog[open]')){if(bridge.command(active,event.key.toLowerCase()==='s'?'save':'open'))event.preventDefault();}
    if(event.key==='F1'){event.preventDefault();showHelp();}
    if((event.ctrlKey||event.metaKey)&&event.key==='Home'){event.preventDefault();showHome();}
    if((event.ctrlKey||event.metaKey)&&/^[1-9]$/.test(event.key)){event.preventDefault();bridge.selectIndex(Number(event.key)-1);}
  });
  (async()=>{
    backend=window.go?.main?.App;online=!!await backend?.OnlineEnabled?.();document.getElementById('optionalOnline').checked=online;document.getElementById('optionalOnline').disabled=!backend;
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
    if(info.id==='desktop'){
      document.getElementById('homeButton').hidden=false;
      for(const [index,tool] of tools.entries()){
        const angle=(-90+index*360/tools.length)*Math.PI/180,button=document.createElement('button');
        button.type='button';button.className='home-app';button.dataset.tool=tool.id;
        button.style.setProperty('--x',(50+40*Math.cos(angle))+'%');button.style.setProperty('--y',(50+40*Math.sin(angle))+'%');
        button.setAttribute('aria-label','Open '+tool.name);button.title=tool.description;
        const icon=document.createElement('img');icon.src='/'+tool.icon;icon.alt='';icon.width=36;icon.height=36;
        const text=document.createElement('span'),name=document.createElement('strong'),purpose=document.createElement('small');
        name.textContent=tool.name;purpose.textContent=tool.purpose;text.append(name,purpose);button.append(icon,text);
        button.onclick=()=>selectTool(tool.id);document.getElementById('homeApps').append(button);
      }
    }
    if(tools.some(t=>t.id===location.hash.slice(1)))selectTool(location.hash.slice(1));else if(info.id==='desktop')showHome();else selectTool(tools[0].id);
    say(backend?'Local tools ready. Open a file to begin.':'Local browser mode. Saves use browser downloads.');
    await backend?.Ready?.();
    if(backend&&await backend.SmokeEnabled()){const script=document.createElement('script');script.src='/desktop/'+info.smoke;document.head.append(script);}
  })().catch(error=>say('Could not start: '+error.message));
  window.addEventListener('beforeunload',event=>{if(!approvedQuit&&(operations||dirtyTools().length)){event.preventDefault();event.returnValue='';}});
})();
