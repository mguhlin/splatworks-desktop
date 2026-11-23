/** Native-only MediaSplat adapter; the browser checkout remains untouched. */
import fs from 'node:fs';
import path from 'node:path';
const root=path.join(process.argv[2],'solutions/mediasplat');
const app=path.join(root,'src/ui/App.tsx');let text=fs.readFileSync(app,'utf8');
function swap(old,next){if(!text.includes(old))throw Error('MediaSplat hook changed: '+old.slice(0,90));text=text.replace(old,next);}
function section(start,end,next){const a=text.indexOf(start),b=text.indexOf(end,a);if(a<0||b<0)throw Error('Missing MediaSplat section '+start);text=text.slice(0,a)+next+'\n'+text.slice(b);}
text='import {desktop,changed,loaded,stamp,save,commands,confirmReplace,retain,release,draftStamp,discardDrafts} from "../desktop";\n'+text;
swap('useEffect, useRef, useState','useEffect, useLayoutEffect, useRef, useState');
swap('  const clearResults = () => setResults([]);',`  const resultVersions=useRef(new Map<Blob,{key:string;token:number|undefined;revision:number}>());
  const previous=useRef('');
  const config=JSON.stringify([tool,items.map(item=>item.id),mode,start,end,splitBy,count,hours,minutes,seconds,targetSize,sizeUnit,ranges,subtitle?.name,subtitle?.size,subtitleOptions]);
  useLayoutEffect(()=>{if(previous.current&&previous.current!==config){if(items.length||subtitle)changed();else loaded();}previous.current=config;},[config]);
  const clearResults = () => {for(const value of resultVersions.current.values())release(value.key,value.token);resultVersions.current.clear();setResults([]);};
  const [saving,setSaving]=useState(false);
  useLayoutEffect(()=>{commands({open:()=>{if(!busy)input.current?.click();},save:()=>results.length?results.length===1?download(results[0]):downloadAll():setStatus('Process media first, then save the output files.')});});`);
section('  const choose = async','  const changeTool',`  const choose = async (files: File[]) => {
    if(busy||saving)return;
    setError('');
    if(tool==='subtitles'&&files.some(file=>file.type.startsWith('audio/'))){setError('Choose a video file to burn subtitles into.');return;}
    if(!files.length||files.some(file=>!acceptedMedia(file))){setError('Choose supported video or audio files.');return;}
    const valid=tool==='join'?files:files.slice(0,1);
    if(valid.reduce((total,file)=>total+file.size,0)>256*1024*1024){setError('Choose media under 256 MiB in total.');return;}
    const finish=desktop.beginOperation(),before=stamp(),selected:Selected[]=[];setBusy(true);
    try{
      for(const file of valid)selected.push({id:crypto.randomUUID(),file,info:await inspectMedia(file)});
      if(before!==stamp()||!await confirmReplace()){selected.forEach(item=>item.info.url&&URL.revokeObjectURL(item.info.url));return;}
      items.forEach(item=>item.info.url&&URL.revokeObjectURL(item.info.url));clearResults();discardDrafts();setSubtitle(undefined);setItems(selected);
      const known=selected[0]?.info.duration;if(known){setEnd(Number(known.toFixed(3)));setRanges([{start:0,end:Number((known/2).toFixed(3))},{start:Number((known/2).toFixed(3)),end:Number(known.toFixed(3))}]);}
    }catch(reason){selected.forEach(item=>item.info.url&&URL.revokeObjectURL(item.info.url));setError((reason as Error).message);}finally{setBusy(false);finish();if(input.current)input.current.value='';}
  };`);
swap('const changeTool = (next: Tool) => { if (busy) return;', 'const changeTool = async (next: Tool) => { if (busy || saving || next===tool || !await confirmReplace()) return;discardDrafts();');
swap('const remove = (id: string) => { setSubtitle', 'const remove = async (id: string) => { if(busy||saving||!await confirmReplace())return;clearResults();discardDrafts();setSubtitle');
swap('    setError(""); clearResults(); setBusy(true);',"    if(busy||saving)return;\n    if(resultVersions.current.size&&!await confirmReplace())return;\n    const finish=desktop.beginOperation(),revision=stamp();\n    setError(\"\"); setBusy(true);");
swap('setResults(output); setProgress(1);',`if(output.reduce((sum,file)=>sum+file.blob.size,0)>512*1024*1024)throw Error('Output exceeds the 512 MiB desktop limit. Process a shorter range.');
      clearResults();output.forEach((result,index)=>{const key='media-output-'+index;retain(key);resultVersions.current.set(result.blob,{key,token:draftStamp(key),revision});});setResults(output); setProgress(1);`);
swap('finally { setBusy(false); }','finally { setBusy(false);finish(); }');
section('  const download =','  const accept =',`  const download = async (result: ResultFile) => {
    if(saving)return;setError('');setSaving(true);const version=resultVersions.current.get(result.blob);
    try{const ok=await save(result.blob,result.name,version?.revision);if(ok&&version)release(version.key,version.token);setStatus(ok?'Saved '+result.name:'Save cancelled — output is still available.');}
    catch(reason){setError((reason as Error).message);}finally{setSaving(false);}
  };
  const downloadAll = async () => {
    if(saving)return;setError('');setSaving(true);const finish=desktop.beginOperation(),files=[...results],versions=files.map(file=>resultVersions.current.get(file.blob));
    try{setStatus('Packaging output files…');const zip=await createZip(files);const ok=await save(zip,safeStem(primary?.file.name??'mediasplat')+'-parts.zip',versions[0]?.revision);if(ok)versions.forEach(version=>{if(version)release(version.key,version.token);});setStatus(ok?'Saved all output files.':'Save cancelled — outputs are still available.');}
    catch(reason){setError((reason as Error).message);}finally{setSaving(false);finish();}
  };`);
// Cloud destinations belong to the browser edition. Native writes must be awaited.
text=text.replace(/^import \{ saveToGoogleDrive \}.*\n/m,'');
text=text.replace('onSaveFile={(name, blob) => saveDrive(name, () => blob)} ','');
text=text.replace(/\{results.length > 1 && <button className="secondary" onClick=\{\(\) => \{ const files = \[\.\.\.results\]; void saveDrive[\s\S]*?<\/button>\}/,'');
text=text.replace(/<button className="secondary" onClick=\{\(\) => void saveDrive\(result.name, \(\) => result.blob\)\}>Save to Google Drive<\/button>/,'');
text=text.replaceAll('Download all as ZIP','Save all as ZIP').replaceAll('Downloads ready','Output files ready').replaceAll('ready to download','ready to save');
text=text.replace('onClick={() => download(result)}>Download','disabled={saving || busy} onClick={() => void download(result)}>Save');
text=text.replace('className="download-all" onClick','className="download-all" disabled={saving || busy} onClick');
text=text.replace('multiple={tool === "join"}', 'disabled={busy || saving} multiple={tool === "join"}');
text=text.replaceAll('<fieldset>','<fieldset disabled={busy || saving}>').replaceAll('disabled={busy}', 'disabled={busy || saving}');
text=text.replaceAll('onClick={() => move(index, -1)}','onClick={() => {if(!busy&&!saving)move(index, -1);}}').replaceAll('onClick={() => move(index, 1)}','onClick={() => {if(!busy&&!saving)move(index, 1);}}');
text=text.replace('disabled={!primary ||','disabled={saving || !primary ||');
text=text.replace('Optional Google Drive saving','Native file saving').replace('Optional Drive saving','Native file saving');
text=text.replace('Files are processed locally. Only an explicitly authorized Drive save uploads a copy.','Files stay on this device. Choose up to 256 MiB of media; save your outputs before closing.');
text=text.replace('MediaSplat processes media in your browser. Files are uploaded only when you choose and authorize Google Drive saving. Local editing needs no account; there are no analytics, ads, or tracking. The app shell and local FFmpeg engine may be cached for offline use.','MediaSplat processes files locally with its bundled media engine. Saving opens a native destination picker. No account is needed. Speech models are optional downloads.');
text=text.replace('Processing happens in this tab with a locally hosted FFmpeg engine.','Processing uses the bundled FFmpeg engine on this device.');
text=text.replace('onUse={cues => {','onUse={async cues => {if(resultVersions.current.size&&!await confirmReplace())throw Error("Keep your existing output files or save them before replacing them.");');
fs.writeFileSync(app,text);
const about=path.join(root,'src/ui/AboutInfo.tsx');fs.writeFileSync(about,fs.readFileSync(about,'utf8').replace('up to 120 minutes (2 hours) and 512 MB per source file','up to 120 minutes (2 hours), within the desktop 256 MiB input limit').replace('no fixed app-level file-size, duration, resolution, or frame-rate cap','up to 256 MiB of source media in total and 512 MiB of outputs; no fixed duration, resolution, or frame-rate cap').replace('Keep this tab open','Keep this app open'));
const main=path.join(root,'src/main.tsx');fs.writeFileSync(main,fs.readFileSync(main,'utf8').replace('if ("serviceWorker" in navigator && import.meta.env.PROD)','if (false)'));
