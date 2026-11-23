/* Desktop-only appearance: retain app-owned controls and document content. */
(() => {
  const desktop=window.SplatDesktop;
  if(desktop?.profile?.id!=='desktop')return;
  const id=desktop.toolId(location.pathname),office=['gridsplat','listsplat','writesplat','showsplat','layoutsplat','plansplat'].includes(id);
  if(!id)return;
  const root=document.documentElement;root.classList.add('splat-desktop');root.dataset.tool=id;root.dataset.family=office?'office':'tool';
  const link=document.createElement('link');link.rel='stylesheet';link.href='/desktop/theme.css';document.head.append(link);
  function brand(){
    const header=document.querySelector('header');if(!header)return;
    header.classList.add('splat-app-header');
    if(office)return;
    if(document.querySelector('.spectrum'))root.dataset.spectrum='true';
    let label=header.querySelector('.eyebrow,.splat-tools-label');
    if(!label){label=document.createElement('p');label.className='splat-tools-label';const title=header.querySelector('h1,.brand');if(title?.parentElement&&title.parentElement!==header)title.parentElement.insertBefore(label,title);else header.prepend(label);}
    label.classList.add('splat-tools-label');const text=label.querySelector('a')||label;if(text.textContent!=='DrawSplat™ Tools')text.textContent='DrawSplat™ Tools';
    const splash=document.querySelector('.launch-splash');
    if(splash&&!splash.querySelector('.splat-tools-label')){const p=document.createElement('p');p.className='splat-tools-label';p.textContent='DrawSplat™ Tools';const title=splash.querySelector('h1');splash.insertBefore(p,title);}
  }
  brand();let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;brand();});}).observe(document.body,{childList:true,subtree:true});
})();
