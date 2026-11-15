// Desktop-only integration applied to the imported snapshot. Browser upstream is
// unchanged. Parse source so async scopes remain correct as tools evolve.
import {parse} from 'acorn';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..','frontend');
const pdf=resolve(root,'solutions/pdfsplat/src/app.js');
let source=await readFile(pdf,'utf8');
function replaceOnce(text,from,to){if(text.split(from).length!==2)throw Error('Desktop integration point changed: '+from);return text.replace(from,to);}
source=replaceOnce(source,'async function openFile(input) {','async function openFile(input) {\n  if (globalThis.SplatDesktop && !await SplatDesktop.confirmReplace("pdfsplat")) return false;');
source=replaceOnce(source,'    state.history = [];','    desktopSavedState = prepared.converted ? "" : desktopDocumentState();\n    globalThis.SplatDesktop?.changed("pdfsplat");\n    state.history = [];');
source=replaceOnce(source,'function syncHistory() {','function syncHistory() {\n  globalThis.SplatDesktop?.changed("pdfsplat");');
source=replaceOnce(source,'  o.text = els.textValue.value;','  o.text = els.textValue.value;\n  globalThis.SplatDesktop?.changed("pdfsplat");');
source=replaceOnce(source,'function downloadBytes(bytes, name, type = "application/pdf") {','async function downloadBytes(bytes, name, type = "application/pdf", details = {}) {\n  if (globalThis.SplatDesktop) {\n    try { const ok=await SplatDesktop.saveBlob(new Blob([bytes],{type}),name,details); if(!ok)announce("Save cancelled. Your work is still open.");return ok; }\n    catch(error){announce("Save failed: "+error.message);return false;}\n  }');
source=replaceOnce(source,'  setTimeout(() => URL.revokeObjectURL(url), 30000);\n}', '  setTimeout(() => URL.revokeObjectURL(url), 30000);\n  return true;\n}');
source=source.replaceAll('downloaded.','saved.').replaceAll('downloaded!','saved!');
source+='\nlet desktopSavedState = "";\nfunction desktopDocumentState(){return JSON.stringify({sources:[...state.sources.keys()],pages:state.pages,title:state.documentTitle,language:state.documentLanguage});}\nglobalThis.SplatDesktop?.registerWorkspace("pdfsplat",{isDirty:()=>state.pages.length>0&&desktopDocumentState()!==desktopSavedState,stamp:desktopDocumentState,markSaved:stamp=>{desktopSavedState=stamp;}});\n';
await writeFile(pdf,source);
const cipher=resolve(root,'solutions/CipherSplat/app.js');
source=await readFile(cipher,'utf8');
source=replaceOnce(source,'async function downloadResult(){','async function downloadResult(){if(globalThis.SplatDesktop){try{const details={tool:"ciphersplat",stamp:desktopCipherStamp(),complete:true};const ok=resultFiles.length?await SplatDesktop.saveFolder(resultFiles,details):await SplatDesktop.saveBlob(resultBlob,resultName,details);if(!ok)els.error.textContent="Save cancelled. Your result is still available.";}catch(error){els.error.textContent="Save failed: "+error.message;}return;}');
source=replaceOnce(source,'function resetResult(){','function resetResult(){desktopCipherGeneration++;');
// Generation counters prevent saving an earlier crypto result from clearing a
// newer unsaved result; no secret or plaintext is written to preferences.
source='let desktopCipherGeneration=0,desktopCipherSaved="";\n'+source;
source+='\nfunction desktopCipherStamp(){return JSON.stringify({generation:desktopCipherGeneration,text:els.text.value,hasResult:!!resultBlob||!!resultFiles.length});}\nglobalThis.SplatDesktop?.registerWorkspace("ciphersplat",{isDirty:()=>!!(els.text.value||resultBlob||resultFiles.length)&&desktopCipherStamp()!==desktopCipherSaved,stamp:desktopCipherStamp,markSaved:stamp=>{desktopCipherSaved=stamp;}});\n';
await writeFile(cipher,source);

function walk(node,ancestors,visit){
  if(!node||typeof node!=='object')return;
  if(node.type)visit(node,ancestors);
  const next=node.type?[...ancestors,node]:ancestors;
  for(const [key,value] of Object.entries(node)){if(key==='start'||key==='end')continue;if(Array.isArray(value)){for(const item of value)walk(item,next,visit);}else if(value&&typeof value==='object')walk(value,next,visit);}
}
for(const path of [cipher,...(await readdir(resolve(root,'solutions/pdfsplat/src'))).filter(n=>n.endsWith('.js')&&!['webdeck-runtime.js','boot.js','ocr-worker.js'].includes(n)).map(n=>resolve(root,'solutions/pdfsplat/src',n))]){
  source=await readFile(path,'utf8');
  const ast=parse(source,{ecmaVersion:'latest',sourceType:path===cipher?'script':'module'}),edits=[],functions=new Set();
  walk(ast,[],(node,ancestors)=>{
    if(node.async&&node.body?.type==='BlockStatement')functions.add(node);
    // Mozilla's documented mitigation for CVE-2024-4367. Apply it to every
    // parsing/rendering entry point, including thumbnails and exports.
    if(node.type==='CallExpression'&&node.callee.property?.name==='getDocument'){
      if(node.arguments[0]?.type!=='ObjectExpression')throw Error('Review PDF.js loading options.');
      edits.push([node.arguments[0].start+1,node.arguments[0].start+1,'isEvalSupported:false,']);
    }
    if(path===pdf&&node.type==='CallExpression'&&node.callee.name==='downloadBytes'){
      const fn=[...ancestors].reverse().find(n=>/Function/.test(n.type));
      const statement=ancestors.at(-1);if(!fn||statement.type!=='ExpressionStatement')throw Error('Review the PDF save integration.');
      functions.add(fn);
      const args=node.arguments.map(n=>source.slice(n.start,n.end));
      if(['exportPdf','runVault'].includes(fn.id?.name)){
        if(args.length===2)args.push('"application/pdf"');
        args.push(`{tool:"pdfsplat",stamp:__desktopStamp,complete:${fn.id.name==='exportPdf'?'items===state.pages&&suffix==="-edited"':'true'}}`);
      }
      edits.push([statement.start,statement.end,`{ if (!await downloadBytes(${args.join(',')})) return; }`]);
    }
  });
  for(const fn of functions){
    if(!fn.async)edits.push([fn.start,fn.start,'async ']);
    const stamp=path===pdf&&['exportPdf','runVault'].includes(fn.id?.name)?'finishInlineTextEditing();const __desktopStamp=desktopDocumentState();':'';
    edits.push([fn.body.start+1,fn.body.start+1,`${stamp}const __desktopDone=globalThis.SplatDesktop?.beginOperation();try{`]);
    edits.push([fn.body.end-1,fn.body.end-1,'}finally{__desktopDone?.();}']);
  }
  for(const [start,end,value] of edits.sort((a,b)=>b[0]-a[0]))source=source.slice(0,start)+value+source.slice(end);
  parse(source,{ecmaVersion:'latest',sourceType:path===cipher?'script':'module'});
  await writeFile(path,source);
}
console.log('Adapted desktop save completion, unsaved work, and async operation tracking.');
