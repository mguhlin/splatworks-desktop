import {parse} from 'acorn';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const web=resolve(import.meta.dirname,'..','frontend');
function once(text,from,to){if(text.split(from).length!==2)throw Error('Review small-tool integration: '+from);return text.replace(from,to);}
function walk(node,parents,visit){if(!node||typeof node!=='object')return;if(node.type)visit(node,parents);const next=node.type?[...parents,node]:parents;for(const value of Object.values(node)){if(Array.isArray(value))for(const item of value)walk(item,next,visit);else if(value&&typeof value==='object')walk(value,next,visit);}}
function replaceFunctions(source,replacements){const edits=[];walk(parse(source,{ecmaVersion:'latest'}),[],node=>{if(node.type==='FunctionDeclaration'&&replacements[node.id.name])edits.push([node.start,node.end,replacements[node.id.name]]);});for(const name of Object.keys(replacements))if(!edits.some(e=>e[2]===replacements[name]))throw Error('Missing function '+name);for(const [start,end,text]of edits.sort((a,b)=>b[0]-a[0]))source=source.slice(0,start)+text+source.slice(end);return source;}
function track(source,downloads=[],sourceType='script'){
 const edits=[],functions=new Set();walk(parse(source,{ecmaVersion:'latest',sourceType}),[],(node,parents)=>{
  if(node.async&&node.body?.type==='BlockStatement')functions.add(node);
  if(node.type==='CallExpression'&&downloads.includes(node.callee.name)&&parents.at(-1)?.type==='ExpressionStatement'){
   const fn=[...parents].reverse().find(n=>/Function/.test(n.type));if(!fn)return;functions.add(fn);const st=parents.at(-1);edits.push([st.start,st.end,'{if(!await '+source.slice(node.start,node.end)+')return false;}']);
  }
 });
 for(const fn of functions){if(!fn.async)edits.push([fn.start,fn.start,'async ']);edits.push([fn.body.start+1,fn.body.start+1,'const __desktopDone=globalThis.SplatDesktop?.beginOperation();try{']);edits.push([fn.body.end-1,fn.body.end-1,'}finally{__desktopDone?.();}']);}
 for(const [start,end,text]of edits.sort((a,b)=>b[0]-a[0]))source=source.slice(0,start)+text+source.slice(end);
 parse(source,{ecmaVersion:'latest',sourceType});return source;
}
function injectIIFE(source,code){const pos=source.lastIndexOf('})();');if(pos<0)throw Error('Missing tool closure');return source.slice(0,pos)+code+'\n'+source.slice(pos);}
const saveHelper=(id,output)=>`async function desktopSave(blob,name,details={}){try{const ok=await SplatDesktop.saveBlob(blob,name,details);${output}=ok?'Saved '+name:'Save cancelled. Your work is still open.';return ok;}catch(error){${output}='Save failed: '+error.message;return false;}}`;

let file=resolve(web,'solutions/gifsplat/desktop-entry-1.js'),source=await readFile(file,'utf8');
source=source.replace('(function(){','(function(){\nlet desktopSaved="",desktopGenerated="";');
source=once(source,'function renderList(){',"function renderList(){queueMicrotask(()=>SplatDesktop.changed('gifsplat'));");
source=once(source,"$('clearFramesBtn').addEventListener('click', ()=>{","$('clearFramesBtn').addEventListener('click', async()=>{if(!await SplatDesktop.confirmReplace('gifsplat'))return;");
source=once(source,"$('resetBtn').addEventListener('click', ()=>{","$('resetBtn').addEventListener('click', async()=>{if(!await SplatDesktop.confirmReplace('gifsplat'))return;state.lastBlob=null;");
source=once(source,"const btn=$('generateBtn'); btn.disabled=true;","const desktopEnd=SplatDesktop.beginOperation(),desktopStart=desktopStamp();const btn=$('generateBtn'); btn.disabled=true;");
source=once(source,'state.lastBlobUrl=URL.createObjectURL(blob);','state.lastBlobUrl=URL.createObjectURL(blob);state.lastBlob=blob;desktopGenerated=desktopStart;');
source=source.replace('btn.disabled=false;\n      }','btn.disabled=false;desktopEnd();\n      }');
const gifAst=parse(source,{ecmaVersion:'latest'});let download;
walk(gifAst,[],node=>{if(node.type==='CallExpression'&&node.callee.property?.name==='addEventListener'&&node.callee.object?.arguments?.[0]?.value==='downloadBtn')download=node.arguments[1];});
if(!download)throw Error('GIF download listener changed');
source=source.slice(0,download.start)+`async()=>{if(!state.lastBlob)return;await desktopSave(state.lastBlob,'GIFsplat-animation.gif',{tool:'gifsplat',stamp:desktopGenerated,complete:true});}`+source.slice(download.end);
source=injectIIFE(source,`
function desktopStamp(){return JSON.stringify({frames:state.frames.map(f=>f.id),settings:['delayInput','loopInput','maxWidthInput','qualityInput','paletteSizeInput','ditherInput'].map(id=>[$(id)?.value,$(id)?.checked])});}
${saveHelper('gifsplat',"$('statusLine').textContent")}
SplatDesktop.registerWorkspace('gifsplat',{isDirty:()=>state.frames.length>0&&desktopStamp()!==desktopSaved,markSaved:stamp=>desktopSaved=stamp});
const videoButton=$('recordVideoBtn');if(videoButton){videoButton.hidden=true;videoButton.disabled=true;}
`);
await writeFile(file,track(source));

file=resolve(web,'solutions/qrsplat/app.js');source=await readFile(file,'utf8');
source='let desktopRevision=0,desktopSavedRevision=0,desktopUserEdited=false;\n'+source;
source=once(source,'function render(){',"function render(){desktopRevision++;queueMicrotask(()=>SplatDesktop.changed('qrsplat'));");
source=replaceFunctions(source,{
 download:`async function download(blob,name,details={}){return desktopSave(blob,name,details);}`,
 loadCenterImage:`async function loadCenterImage(){const file=$('centerImage').files[0];if(!file)return removeCenterImage();if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2*1024*1024){$('centerImage').value='';$('centerImageHelp').textContent='Choose a PNG, JPEG, or WebP image no larger than 2 MB.';return;}try{const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});state.originalLogoData=state.logoData=data;$('cartoonEffect').checked=false;$('errorLevel').value='H';$('centerImageControls').hidden=false;$('centerImageHelp').textContent=file.name+' added locally. Test the finished QR before sharing.';render();}catch{$('centerImageHelp').textContent='That image could not be read. Try another file.';}}`
});
source+=`\n${saveHelper('qrsplat',"$('scanMessage').textContent")}
for(const type of ['input','change'])document.addEventListener(type,()=>{desktopUserEdited=true;desktopRevision++;SplatDesktop.changed('qrsplat');});
SplatDesktop.registerWorkspace('qrsplat',{isDirty:()=>desktopUserEdited&&desktopRevision!==desktopSavedRevision,markSaved:stamp=>desktopSavedRevision=stamp});
const offlineMode=document.querySelector('[data-mode="editable"]');if(offlineMode){offlineMode.hidden=true;offlineMode.disabled=true;}
for(const id of ['backendSetup']){const button=$(id);if(button){button.hidden=true;button.disabled=true;}}
const reset=resetDesign;$('newDesign').onclick=async()=>{if(await SplatDesktop.confirmReplace('qrsplat'))reset();};
$('savedDesigns').onchange=async()=>{if(await SplatDesktop.confirmReplace('qrsplat'))loadDesign($('savedDesigns').value);};
`;
// Attach exports after the browser controls so each captures the rendered design
// revision before asynchronous canvas conversion starts.
source+=`\n$('downloadPng').onclick=async()=>{if(!state.svg)return;const stamp=desktopRevision;await download(await canvasBlob(),fileName('png'),{tool:'qrsplat',stamp,complete:true});};
$('downloadSvg').onclick=async()=>{if(!state.svg)return;const stamp=desktopRevision;await download(new Blob([state.svg],{type:'image/svg+xml'}),fileName('svg'),{tool:'qrsplat',stamp,complete:true});};\n`;
await writeFile(file,track(source));

file=resolve(web,'solutions/imagesplat/desktop-entry-1.js');source=await readFile(file,'utf8');
source=source.replace('(function(){','(function(){\nlet desktopSaved="";');
if(source.split('JSON.stringify(state.objects.map(o=>serialize(o)))').length!==4)throw Error('Review image undo snapshots');
source=source.replaceAll('JSON.stringify(state.objects.map(o=>serialize(o)))','desktopSnapshot()');
source=once(source,'function render(skipLayers=false){',"function render(skipLayers=false){queueMicrotask(()=>SplatDesktop.changed('imagesplat'));");
source=replaceFunctions(source,{
 restore:`function restore(value){const saved=JSON.parse(value);canvas.width=saved.width;canvas.height=saved.height;state.objects=saved.objects.map(deserialize);state.selected.clear();state.crop=null;state.imageCrop=null;render();}`,
 applyCrop:`async function applyCrop(){if(!state.crop||state.crop.w<5||state.crop.h<5)return;const c=state.crop,out=document.createElement('canvas');out.width=c.w;out.height=c.h;out.getContext('2d').drawImage(renderFullCanvas(),c.x,c.y,c.w,c.h,0,0,c.w,c.h);const src=out.toDataURL(),img=await loadImg(src);snapshot();canvas.width=c.w;canvas.height=c.h;state.objects=[{id:uid(),type:'image',name:'Cropped canvas',x:0,y:0,w:c.w,h:c.h,img,src}];state.selected.clear();state.crop=null;setTool('select');setStatus('status.crop');render();}`,
 downloadBlob:`async function downloadBlob(blob,name,details={}){return desktopSave(blob,name,details);}`,
 downloadCanvas:`async function downloadCanvas(canvas,name,details={}){const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('The image could not be prepared.');return await downloadBlob(blob,name,details);}`,
 exportCanvas:`async function exportCanvas(){const stamp=desktopStamp();if(await downloadCanvas(renderArtwork(),'ImageSplat.png',{tool:'imagesplat',stamp,complete:true}))setStatus('status.exported');}`,
 exportFrames:`async function exportFrames(){const imgs=imageFrames();if(!imgs.length)return setStatus('status.needImages');for(let index=0;index<imgs.length;index++){const o=imgs[index],c=document.createElement('canvas');c.width=o.w;c.height=o.h;c.getContext('2d').drawImage(o.img,0,0,o.w,o.h);if(!await downloadCanvas(c,'ImageSplat-frame-'+(index+1)+'.png'))return;}setStatus('status.frames',{n:imgs.length});}`
});
source=once(source,"async function openBackgroundRemoval(mode='photo'){","async function openBackgroundRemoval(mode='white'){if(mode==='photo')mode='white';");
source=once(source,"if(action==='new'||action==='clear'){snapshot();","if(action==='new'||action==='clear'){if(!await SplatDesktop.confirmReplace('imagesplat'))return;snapshot();");
source=once(source,"$('statusLine').textContent='Background removal downloaded. Original layers are unchanged until Apply.'","$('statusLine').textContent='Background removal downloaded. Original layers are unchanged until Apply.';return true");
source=injectIIFE(source,`
function desktopSnapshot(){return JSON.stringify({width:canvas.width,height:canvas.height,objects:state.objects.map(serialize)});}
function desktopStamp(){return JSON.stringify({width:canvas.width,height:canvas.height,objects:state.objects.map(serialize)});}
${saveHelper('imagesplat',"$('statusLine').textContent")}
SplatDesktop.registerWorkspace('imagesplat',{isDirty:()=>state.objects.length>0&&desktopStamp()!==desktopSaved,markSaved:stamp=>desktopSaved=stamp});
for(const action of ['captureScreen','captureArea','captureAreaDelay','greenScreen','fontsplat','smartRemoveBg'])for(const button of document.querySelectorAll('[data-action="'+action+'"]')){button.hidden=true;button.disabled=true;}
`);
await writeFile(file,track(source,['downloadBlob','downloadCanvas']));

file=resolve(web,'solutions/imagesplat/background-studio.js');source=await readFile(file,'utf8');
source=once(source,"mode = 'photo'","mode = 'white'");
source=source.replace('<option value="photo">Photo subject</option>','<option value="photo" disabled hidden>Photo models are available in the browser edition</option>');
source=source.replace('<form id="bs-bg-form">','<form id="bs-bg-form" hidden>');
source=once(source,'if (!closed) await download(blob, exportName(sources[index()].name, jpeg ? \'jpeg\' : \'png\'));',"if (!closed && !await download(blob, exportName(sources[index()].name, jpeg ? 'jpeg' : 'png'))) { status('Save cancelled or failed. Your previews remain available.'); return; }");
source=once(source,"if (!closed) await download(blob, 'imagesplat-cutouts.zip');","if (!closed && !await download(blob, 'imagesplat-cutouts.zip')) { status('Save cancelled or failed. Your previews remain available.'); return; }");
await writeFile(file,track(source,[],'module'));
file=resolve(web,'solutions/backdropsplat/processor.mjs');source=await readFile(file,'utf8');source=once(source,'  function process(source, options, onProgress = () => {}) {',"  function process(source, options, onProgress = () => {}) {\n    if(options.mode==='photo')return Promise.reject(Error('Photo subject models are available in the browser edition. Use White or Color in this offline app.'));");await writeFile(file,source);
console.log('Adapted GIF, QR, and image tools for offline native saving.');
