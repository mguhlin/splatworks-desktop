/** Apply reviewed desktop boundaries to isolated browser source copies. */
import fs from 'node:fs';
import path from 'node:path';
const stage=process.argv[2], templates=path.join(import.meta.dirname,'media');
const file=(rel)=>path.join(stage,rel);
function edit(rel,fn){const p=file(rel);fs.writeFileSync(p,fn(fs.readFileSync(p,'utf8')));}
function replace(text,old,next){if(!text.includes(old))throw Error('Upstream hook changed: '+old.slice(0,110));return text.replace(old,next);}
function wrap(text,name){
  const start=text.indexOf('async function '+name+'(');if(start<0)throw Error('Missing function '+name);
  const begin=text.indexOf(' {',text.indexOf('): Promise',start))+2;
  const end=text.indexOf('\n}',begin);
  if(begin<2||end<0)throw Error('Invalid function '+name);
  return text.slice(0,begin)+'\n  const desktopEnd=desktop.beginOperation();\n  try {'+text.slice(begin,end)+'\n  } finally { desktopEnd(); }'+text.slice(end);
}
for(const id of ['audiosplat','videosplat','mediasplat']){
  const app='solutions/'+id;
  fs.copyFileSync(path.join(templates,'desktop.ts'),file(app+'/src/desktop.ts'));
  edit(app+'/vite.config.ts',text=>{
    // Vite resolves each exact package entry to the adapted shared copy, never upstream node_modules.
    const aliases=Object.fromEntries(['','core','client','models','local-model'].map(key=>['@splat/local-subtitles'+(key?'/'+key:''),file('solutions/shared/subtitles/'+(key||'SubtitleGenerator')+(key?'':'.tsx')+(key?'.ts':''))]));
    return replace(text,'resolve: { alias: {','resolve: { alias: {'+Object.entries(aliases).sort((a,b)=>b[0].length-a[0].length).map(([k,v])=>JSON.stringify(k)+':'+JSON.stringify(v)).join(',')+',');
  });
  let page=fs.readFileSync(file(app+'/index.vite.html'),'utf8');
  page=page.replace(/<!-- splat-privacy:start -->[\s\S]*?<!-- splat-privacy:end -->/g,'').replace(/<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?\/>/g,'').replace(/<link[^>]+rel="manifest"[^>]*>/g,'').replace(/<link[^>]+(?:tool-launcher|launcher-trigger)\.css[^>]*>/g,'').replace(/<script[^>]+tool-launcher[^>]*><\/script>/g,'').replace(/<button[^>]+data-ds-app-launcher[^>]*>[\s\S]*?<\/button>/g,'');
  // Vite leaves these shared static assets external, to be supplied by the desktop profile.
  page=page.replace('<head>','<head><link rel="stylesheet" href="/desktop/frame.css"><script src="/desktop/frame.js"></script>');
  fs.writeFileSync(file(app+'/index.html'),page);
  fs.rmSync(file(app+'/public/sw.js'),{force:true});
}
fs.copyFileSync(path.join(templates,'audio-project.ts'),file('solutions/audiosplat/src/audio-project.ts'));
const audio='solutions/audiosplat/src/main.ts';
edit(audio,text=>{
  text='import {desktop,changed,stamp,loaded,save,commands,confirmReplace} from "./desktop";\n'+text;
  text=replace(text,'function scheduleSave(): void {','function scheduleSave(): void {\n  changed(); return;\n/*');
  text=replace(text,'\nasync function togglePlay()', '*/}\nasync function togglePlay()');
  // Remove the old function's closing brace along with its unreachable autosave body.
  text=text.replace(/function scheduleSave\(\): void \{[\s\S]*?\/\*([\s\S]*?)\*\/\}/,'function scheduleSave(): void { changed(); const node=document.querySelector("#save-state");if(node)node.textContent="Unsaved — save a project"; }');
  text=replace(text,'async function downloadProject(): Promise<void> {','async function downloadProject(): Promise<void> {\n  const savedStamp=stamp(),snapshot=structuredClone(project);');
  text=replace(text,'  download(\n    new Blob([JSON.stringify({ project, sources: embedded }, null, 2)]','  const ok=await save(\n    new Blob([JSON.stringify({ project:snapshot, sources: embedded }, null, 2)]');
  text=replace(text,'`${safeName(project.metadata.title)}.audiosplat.json`,','`${safeName(snapshot.metadata.title)}.audiosplat.json`,savedStamp,');
  text=replace(text,'  toast(t("projectSaved"));','  if(ok){toast(t("projectSaved"));const node=document.querySelector("#save-state");if(node)node.textContent="Project saved";}');
  text=replace(text,'    download(rendered.blob, rendered.name);\n    toast(t("exportDone"));','    if(await save(rendered.blob, rendered.name))toast(t("exportDone"));');
  const begin=text.indexOf('function download(blob: Blob, name: string): void {'),end=text.indexOf('\nasync function newProject',begin);
  text=text.slice(0,begin)+'async function download(blob: Blob,name:string):Promise<void> { await save(blob,name); }\n'+text.slice(end);
  text=replace(text,'  if (!file) return;\n  try {\n    if (file.size > 750_000_000)','  if (!file || !await confirmReplace()) return;\n  try {\n    if (file.size > 750_000_000)');
  text=replace(text,'    scheduleSave();\n  } catch {\n    toast(t("projectFailed")','    loaded();\n  } catch {\n    toast(t("projectFailed")');
  text=replace(text,'  if (!confirm(t("confirmNew"))) return;','  if (!await confirmReplace()) return;');
  text=replace(text,'    recorder.start(250);','    recorder.start(250);\n    recordingEnd?.();recordingEnd=desktop.beginOperation();changed();');
  text='let recordingEnd:(()=>void)|undefined;\n'+text;
  // Keep the operation active until decoding and timeline insertion finish.
  text=replace(text,'  if (blob.size === 0) {','  const end=recordingEnd;recordingEnd=undefined;\n  if (blob.size === 0) {\n    end?.();');
  text=replace(text,'async function finishRecording(): Promise<void> {','async function finishRecording(): Promise<void> {');
  text=replace(text,'\n}\nfunction stopRecordingStream(): void {','\n  end?.();\n}\nfunction stopRecordingStream(): void {');
  text=text.replace('if ("serviceWorker" in navigator && import.meta.env.PROD)', 'if (false)');
  text=replace(text,'  document.addEventListener("click", handleAction);','  document.addEventListener("click", event=>{void handleAction(event).catch(error=>desktop.status("Action failed: "+error.message));});');
  for(const name of ['downloadProject','exportMix','openProject','addBlob','runEffect'])text=wrap(text,name);
  text+='\ncommands({save:downloadProject,open:()=>document.querySelector<HTMLInputElement>("#project-input")?.click()});\n';
  return text;
});
edit('solutions/audiosplat/src/persistence.ts',text=>{
  const helpers=text.slice(text.indexOf('export async function blobToDataUrl'));
  return 'import type {StoredProject} from "./types";\nexport async function saveWorkspace(..._args:unknown[]):Promise<void>{}\nexport async function loadWorkspace():Promise<StoredProject|null>{return null;}\nexport async function clearWorkspace():Promise<void>{}\n'+helpers;
});
edit('solutions/audiosplat/src/transcription.ts',text=>text.replace('=> void, close:', '=> Promise<void>, close:').replace('download(new Blob([body]', 'await download(new Blob([body]').replace(/addEventListener\('click',\s*\(\) => \{/g, "addEventListener('click', async () => {"));
const video='solutions/videosplat/src/';
fs.copyFileSync(path.join(templates,'video-database.ts'),file(video+'persistence/database.ts'));
fs.copyFileSync(path.join(templates,'video-files.ts'),file(video+'persistence/files.ts'));
edit(video+'main.tsx',text=>text.replace('if ("serviceWorker" in navigator && import.meta.env.PROD)', 'if (false)'));
edit(video+'ui/App.tsx',text=>{
  text='import {desktop,changed,loaded,commands,confirmReplace} from "../desktop";\n'+text;
  text=replace(text,'  const [savedAt, setSavedAt] = useState<string>();','  const previousProject=useRef(project);\n  useEffect(()=>{if(previousProject.current!==project){changed();previousProject.current=project;}},[project]);\n  useEffect(()=>{commands({save:()=>downloadProject(project).catch(error=>setStatus(error.message)),open:()=>fileInput.current?.click()});},[project]);');
  const start=text.indexOf('  useEffect(() => {\n    const handle = window.setTimeout('),end=text.indexOf('\n  useEffect(() => {',start+10);
  if(start<0||end<0)throw Error('Autosave hook changed');
  text=text.slice(0,start)+text.slice(end);
  text=replace(text,'        downloadProject(project);\n        setStatus("Project copy downloaded");','        void downloadProject(project).then(ok=>setStatus(ok?"Project saved":"Save cancelled")).catch(error=>setStatus(error.message));');
  text=replace(text,'downloadProject(project); setStatus("Project copy downloaded");','void downloadProject(project).then(ok=>setStatus(ok?"Project saved":"Save cancelled")).catch(error=>setStatus(error.message));');
  text=replace(text,'  const newProject = () => {','  const newProject = async () => {\n    if(!await confirmReplace())return;');
  text=replace(text,'  const importProject = async (file?: File) => {\n    if (!file) return;','  const importProject = async (file?: File) => {\n    if (!file || !await confirmReplace()) return;');
  text=replace(text,'  const openRecent = async (next: VideoSplatProject) => {','  const openRecent = async (next: VideoSplatProject) => {\n    if(!await confirmReplace())return;');
  text=replace(text,'<span>{savedAt ? `Saved ${savedAt}` : "Saving locally…"}</span>','<span>Workspace stays in memory. Save a portable project to keep it.</span>');
  text=text.replace('{new Date(item.updatedAt).toLocaleString()} ·{" "}', 'Session project ·{" "}');
  text=text.replaceAll('Autosaved locally','Kept in this session').replaceAll('autosave','session workspace').replaceAll('stored locally','kept in memory').replaceAll('Saved projects','Session projects');
  return text;
});
edit(video+'ui/ExportDialog.tsx',text=>{
  text='import {save,desktop} from "../desktop";\n'+text;
  const start=text.indexOf('const saveBlob = ('),end=text.indexOf('\nexport function',start);
  text=text.slice(0,start)+'const saveBlob=save;\n'+text.slice(end);
  text=replace(text,'    setBusy(true);','    const end=desktop.beginOperation();\n    setBusy(true);');
  text=replace(text,'      saveBlob(blob, exportName(project.name, format));\n      setSaved(true);\n      onStatus(`Export saved to Downloads · ${bytes(blob.size)}`);','      const ok=await saveBlob(blob, exportName(project.name, format));\n      setSaved(ok);\n      onStatus(ok?`Export saved · ${bytes(blob.size)}`:"Save cancelled — rendered video is still available");');
  text=replace(text,'    } finally {\n      setBusy(false);','    } finally {\n      end();setBusy(false);');
  text=replace(text,'  const download = () => {\n    if (!result) return;\n    saveBlob(result.blob, exportName(project.name, result.format));\n    setSaved(true);','  const download = async () => {\n    if (!result) return;\n    try {setSaved(await saveBlob(result.blob, exportName(project.name, result.format)));}catch(error){setError((error as Error).message);}');
  return text.replace('A copy is uploaded only if you choose Google Drive saving.','Exports use a native destination dialog.');
});
// The editor's native writer handles legacy auxiliary exports through frame.js.
// Track long-running React operations from their state, including cancellation/unmount.
for(const [name,expression] of [['OptimizerDialog','busy'],['RecorderDialog','state === "recording" || state === "paused" || state === "stopping" || adding || cropping']]){
  edit(video+'ui/'+name+'.tsx',text=>{
    text='import {desktop} from "../desktop";\n'+text;
    const marker=name==='OptimizerDialog'?'  const options =':'  const session =';
    // State layouts differ; insert before the component's return, after every state declaration.
    const anchor='  return <>';
    const pos=text.lastIndexOf(anchor);if(pos<0)throw Error('Operation hook missing '+name);
    const expr=name==='RecorderDialog'?'state === "recording" || state === "paused" || adding':expression;
    return text.slice(0,pos)+'  useEffect(()=>{if('+expr+')return desktop.beginOperation();},['+ (name==='RecorderDialog'?'state,adding':'busy')+']);\n'+text.slice(pos);
  });
}
// No transcript/recovery content is written automatically. Model weights can be cached.
edit('solutions/shared/subtitles/checkpoints.ts',text=>{
  const start=text.indexOf('const DB_NAME'),end=text.indexOf('/** Hash all bytes');
  return text.slice(0,start)+`export async function readCheckpoint(_key:string,_total:number):Promise<Checkpoint|undefined>{return undefined;}\nexport async function saveCheckpoint(_value:Checkpoint):Promise<void>{throw Error('Desktop transcripts stay in memory. Download SRT/text to keep them.');}\nexport async function deleteCheckpoint(_key:string):Promise<void>{}\n`+text.slice(end);
});
fs.copyFileSync(path.join(templates,'remote.ts'),file('solutions/shared/subtitles/desktop-remote.ts'));
edit('solutions/shared/subtitles/worker.ts',text=>'import "./desktop-remote";\n'+text);
console.log('Adapted media source: native writes, volatile workspaces, portable video media.');

// Keep desktop copy accurate about volatile storage and omitted browser-only integrations.
for(const rel of ['solutions/audiosplat/src/main.ts','solutions/audiosplat/src/transcription.ts','solutions/shared/subtitles/SubtitleGenerator.tsx'])edit(rel,text=>text
 .replaceAll('Generated progress is saved locally when storage allows. Choose the same file and generate again to resume.','Transcripts stay in memory; download SRT/text before closing.')
 .replaceAll('Progress is saved separately for each model. Select Tiny to resume work created before model selection was added.','Optional downloads require connections enabled in desktop Settings. Local GGML files work offline.')
 .replaceAll('Generated progress is saved locally. Resume is available for 30 days (20 recent recordings).','Download SRT/text to keep this transcript.')
 .replaceAll('Progress is saved locally when storage allows.','Transcripts stay in memory.')
 .replaceAll('completed sections are saved locally','completed sections stay in memory')
 .replaceAll('Transcription cancelled. Generate again to resume completed sections.','Transcription cancelled. Download partial results before closing.')
 .replaceAll('Autosave','In-memory workspace').replaceAll('data-i18n="autosave"','').replaceAll('data-i18n="saved"','')
 .replace(/<button data-action="save-drive"[\s\S]*?<\/button>/g,'')
);
for(const rel of ['solutions/videosplat/src/ui/App.tsx','solutions/videosplat/src/ui/ExportDialog.tsx'])edit(rel,text=>text.replace(/<button[^>]*onClick=\{\(\) => menuAction\(async \(\) => \{[\s\S]*?Save project to Google Drive<\/button>/g,'').replace(/<button[^>]*onClick=\{async \(\) => \{[\s\S]*?Save video to Google Drive<\/button>/g,''));
edit('solutions/videosplat/src/ui/App.tsx',text=>text.replaceAll('Local processing · Optional Drive saving','Local processing · Native file saving').replaceAll('Private video editing. Right in your browser.','Private video editing on this device.').replace('  const [importing, setImporting] = useState(false);','  const [importing, setImporting] = useState(false);\n  useEffect(()=>{if(importing)return desktop.beginOperation();},[importing]);'));
edit('solutions/videosplat/src/ui/RecorderDialog.tsx',text=>text.replace('state === "recording" || state === "paused" || adding','state === "recording" || state === "paused" || state === "saving" || state === "cropping" || starting || adding').replace('[state,adding]','[state,starting,adding]').replace('>Put into ClipSplat', ' hidden>Put into ClipSplat'));
edit('solutions/shared/subtitles/client.ts',text=>{
 const start=text.indexOf('export async function transcribe('),begin=text.indexOf('): Promise<Cue[]> {',start)+19,end=text.indexOf('\n}',begin);
 if(start<0||begin<19||end<0)throw Error('Missing transcription operation hook');
 return text.slice(0,begin)+'\n const desktopEnd=(globalThis as any).SplatDesktop?.beginOperation()??(()=>{});try{'+text.slice(begin,end)+'\n }finally{desktopEnd();}'+text.slice(end);
});
// Export a narrowly scoped synthetic-test API only in explicit native smoke sessions.
edit('solutions/videosplat/src/export/transcoder.ts',text=>replace(text,'const getEngine = async','export const getEngine = async'));
edit('solutions/videosplat/src/main.tsx',text=>text+`\nvoid (async()=>{if(!await (window.parent as any).go?.main.App.SmokeEnabled())return;const {getEngine}=await import('./export/transcoder');(window as any).SplatMediaSmoke={encode:async()=>{const ffmpeg=await getEngine();try{const code=await ffmpeg.exec(['-f','lavfi','-i','color=c=red:s=80x60:r=5:d=0.4','-c:v','libx264','-pix_fmt','yuv420p','-y','native.mp4']);if(code!==0)throw Error('Bundled video encoding failed');const bytes=await ffmpeg.readFile('native.mp4');return new Blob([bytes as Uint8Array],{type:'video/mp4'});}finally{await ffmpeg.deleteFile('native.mp4').catch(()=>{});ffmpeg.terminate();}}};})();\n`);
// Successful project opens become clean only after React has applied that exact state.
edit('solutions/videosplat/src/ui/App.tsx',text=>text.replace('const previousProject=useRef(project);','const previousProject=useRef(project),openedProject=useRef<VideoSplatProject|undefined>(undefined);').replace('changed();previousProject.current=project;', 'if(openedProject.current===project){loaded();openedProject.current=undefined;}else changed();previousProject.current=project;').replace('const next = await readProject(file);','const next = await readProject(file);openedProject.current=next;'));
// Import/decode must work before the user has activated speaker playback.
edit('solutions/audiosplat/src/audio/engine.ts',text=>text.replace('  async ensureContext(): Promise<AudioContext> {','  decodeContext(): AudioContext { this.context ??= new AudioContext();return this.context; }\n  async ensureContext(): Promise<AudioContext> {').replace('    const context = await this.ensureContext();\n    const buffer = await context.decodeAudioData(', '    const context = this.decodeContext();\n    const buffer = await context.decodeAudioData('));
edit('solutions/audiosplat/src/main.ts',text=>text.replace('  const context = await engine.ensureContext();\n  const buffer = await context.decodeAudioData(', '  const context = engine.decodeContext();\n  const buffer = await context.decodeAudioData('));
edit('solutions/videosplat/src/ui/App.tsx',text=>text.replace('    const onKey = (event: KeyboardEvent) => {','    const onKey = (event: KeyboardEvent) => {\n      if(event.defaultPrevented)return;').replace('        setDialog(null);\n        setOpenMenu(undefined);','        if(dialog==="recorder"){document.querySelector<HTMLButtonElement>("[aria-label=\'Close recorder\']")?.click();return;}\n        setDialog(null);\n        setOpenMenu(undefined);').replaceAll('Progress is saved locally for each model; partial SRT downloads are available.','Transcripts stay in memory; download SRT before closing.').replaceAll('Local editing needs no account. Google Drive uploads only the copy you choose after authorization. No analytics, ads, or trackers.','Local editing needs no account. Native saves write only to destinations you choose. No analytics, ads, or trackers.').replaceAll('stored only in this browser','kept in memory until you save a project'));
edit('solutions/audiosplat/src/main.ts',text=>{
 text=text.replace('desktop,changed,stamp,loaded,save,commands,confirmReplace','desktop,changed,stamp,loaded,save,commands,confirmReplace,discardDraft');
 text=text.replace('function closeDialog(): void {','function closeDialog(): void {\n  if(!discardDraft("transcript"))return;');
 text=text.replace('async function download(blob: Blob,name:string):Promise<void> { await save(blob,name); }','async function download(blob: Blob,name:string):Promise<boolean> { return save(blob,name); }');
 return text;
});
edit('solutions/audiosplat/src/transcription.ts',text=>{
 text='import {retain,draftStamp,release,discardDraft} from "./desktop";\n'+text;
 text=text.replace('=> Promise<void>, close:', '=> Promise<boolean>, close:');
 text=text.replace('  const renderCues = () => {','  const renderCues = () => {\n    if(cues.length)retain("transcript");');
 text=text.replace("control.addEventListener('input', () => {", "control.addEventListener('input', () => {retain('transcript');");
 text=text.replace('        await download(new Blob([body]', '        const savedStamp=draftStamp("transcript");\n        if(await download(new Blob([body]').replace("}.${extension}`);", "}.${extension}`))release('transcript',savedStamp);");
 // Guard replacing an existing transcript when selecting a different source/model.
 text=text.replace('  const dialog = host.closest',`  host.addEventListener('change',event=>{if([input,selector,modelInput].includes(event.target as HTMLInputElement)&&!discardDraft('transcript')){selector.value=model;event.stopImmediatePropagation();}},true);\n  const dialog = host.closest`);
 return text;
});
edit('solutions/videosplat/src/ui/RecorderDialog.tsx',text=>{
 text=text.replace('import {desktop}', 'import {desktop,retain,draftStamp,release,discardDraft,save}');
 text=text.replace('  const close = () => {','  const close = () => {\n    if(!discardDraft("recording"))return;');
 text=text.replace('      setRecording(file);', '      setRecording(file);retain("recording");');
 text=text.replace('      onStatus(message);\n      onClose();', '      onStatus(message);release("recording");\n      onClose();');
 text=text.replace('<a href={recordingUrl} download={recording.name}>Download original recording</a>', '<button onClick={async()=>{const version=draftStamp("recording");try{if(await save(recording,recording.name))release("recording",version);}catch(reason){setError((reason as Error).message);}}}>Save original recording</button>');
 return text;
});
edit('solutions/shared/subtitles/SubtitleGenerator.tsx',text=>{
 text='const mediaSession=()=> (window as any).SplatMediaSession;\n'+text;
 text=text.replace('setPartial(progress); setCues(progress.cues);','setPartial(progress); setCues(progress.cues);if(progress.cues.length)mediaSession().retain("transcript");');
 text=text.replace('  const edit = (index:', '  const edit = (index:');
 text=text.replace('=> setCues(current => current.map(', '=> {mediaSession().retain("transcript");setCues(current => current.map(').replace('i === index ? { ...cue, ...patch } : cue));','i === index ? { ...cue, ...patch } : cue));};');
 text=text.replace('onUse(cues))', 'Promise.resolve(onUse(cues)).then(()=>{mediaSession().release("transcript");}))');
 // Require explicit discard for closing generated text, even after the project was saved.
 text=text.replace('export function SubtitleGenerationDialog({ source, autoStart, onUse, onClose,', 'export function SubtitleGenerationDialog({ source, autoStart, onUse, onClose:finishClose,');
 text=text.replace('  const panel = useRef', '  const onClose=()=>{if(mediaSession().discardDraft("transcript"))finishClose();};\n  const panel = useRef');
 text=text.replace('Completed sections can be resumed.','Download partial results before closing.');
 return text;
});
edit('solutions/shared/subtitles/SubtitleGenerator.tsx',text=>text
 .replaceAll('attempt(() => {\n        const url = URL.createObjectURL(new Blob(', 'attempt(async () => {\n        const version=mediaSession().draftStamp("transcript");\n        const blob = new Blob(')
 .replaceAll("{ type: 'application/x-subrip' }));", "{ type: 'application/x-subrip' });")
 .replaceAll("{ type: 'text/plain;charset=utf-8' }));", "{ type: 'text/plain;charset=utf-8' });")
 .replaceAll("const link = document.createElement('a'); link.href = url; link.download =", 'const filename =')
 .replaceAll('link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);', 'if(await (window as any).SplatDesktop.saveBlob(blob,filename))mediaSession().release("transcript",version);')
);
edit('solutions/audiosplat/src/main.ts',text=>text.replace('<span ></span>: <strong id="save-state" ></strong>','<span>Project</span>: <strong id="save-state">In memory</strong>'));
// Validate/decode an entire imported audio project before replacing the open one.
edit('solutions/audiosplat/src/main.ts',text=>text.replace('    project = data.project;\n    sources = loaded;', '    for(const source of loaded.values())await engine.loadSource(source);\n    project = data.project;\n    sources = loaded;').replace('function closeDialog(): void {\n  if(!discardDraft("transcript"))return;', 'function closeDialog(): boolean {\n  if(!discardDraft("transcript"))return false;').replace('  document.querySelector("#dialog-backdrop")?.remove();\n}', '  document.querySelector("#dialog-backdrop")?.remove();return true;\n}').replace('  closeDialog();\n  document.body.insertAdjacentHTML(', '  if(!closeDialog())return;\n  document.body.insertAdjacentHTML('));

// 1.0 boundary hardening: decode incoming sources independently of the current cache.
edit('solutions/audiosplat/src/main.ts',text=>{
 text='import {validatePortableProject} from "./audio-project";\n'+text;
 text=text.replace('stamp,loaded,save', 'stamp,loaded as markProjectLoaded,save').replace('    loaded();','    markProjectLoaded();');
 text=text.replace('!validateProject(data.project)', '!validatePortableProject(data.project)');
 text=text.replace('!source.dataUrl ||', '!source.dataUrl || typeof source.dataUrl!=="string" || !/^data:[^,]*;base64,[A-Za-z0-9+/]*={0,2}$/i.test(source.dataUrl) || loaded.has(source.id) ||');
 text=text.replace('    for(const source of loaded.values())await engine.loadSource(source);', `    const decoded=new Map<string,AudioBuffer>();
    for(const source of loaded.values()){
      const buffer=await engine.decodeContext().decodeAudioData(await source.blob!.arrayBuffer());
      if(Math.abs(buffer.duration-source.duration)>.02)throw Error('Audio duration mismatch');
      decoded.set(source.id,buffer);
    }`);
 text=text.replace('    for (const source of sources.values()) await engine.loadSource(source);', '    for(const [id,buffer] of decoded)engine.setBuffer(id,buffer);');
 return text;
});
edit('solutions/videosplat/src/ui/App.tsx',text=>text.replace('onMouseDown={() => { if (!recorderFloating) setDialog(null); }}', `onMouseDown={() => {if(recorderFloating)return;if(dialog==='recorder'){document.querySelector<HTMLButtonElement>('[aria-label="Close recorder"]')?.click();return;}setDialog(null);}}`));
edit('solutions/shared/subtitles/SubtitleGenerator.tsx',text=>text
 .replace('      const next = event.target.value === \'local\' ? \'local\' : getWhisperModel(event.target.value).id;', `      if(!mediaSession().discardDraft('transcript'))return;
      const next = event.target.value === 'local' ? 'local' : getWhisperModel(event.target.value).id;`)
 .replace('      setModelFile(event.target.files?.[0]);', `      if(!mediaSession().discardDraft('transcript')){event.target.value='';return;}setModelFile(event.target.files?.[0]);`)
 .replace('onClick={() => setCues(current => current.filter((_, i) => i !== index))}', 'onClick={() => {mediaSession().retain("transcript");setCues(current => current.filter((_, i) => i !== index));}}')
 .replace('attempt(() => Promise.resolve(onUse(cues)).then(()=>{mediaSession().release("transcript");}))', 'attempt(async()=>{const version=mediaSession().draftStamp("transcript");await onUse(cues);mediaSession().release("transcript",version);})')
 .replace('Completed sections are saved on this device when storage allows. Select the same file and generate again to resume after an interruption. Reviewed edits are only kept in your downloads.', 'Transcripts stay in memory. Save SRT/text or add captions to the timeline before closing.')
);
// Capture a pending project name before keyboard saving, and warn while it is edited.
edit('solutions/audiosplat/src/main.ts',text=>text
 .replace('  const savedStamp=stamp(),snapshot=structuredClone(project);','  (document.activeElement as HTMLElement|null)?.blur();\n  const savedStamp=stamp(),snapshot=structuredClone(project);')
 .replace('  document.addEventListener("click", event=>{void handleAction', '  document.querySelector("#project-title")?.addEventListener("input",()=>changed());\n  document.addEventListener("click", event=>{void handleAction')
);
// Native commands must observe the state already visible on the timeline.
edit('solutions/videosplat/src/ui/App.tsx',text=>'import {useLayoutEffect} from "react";\n'+text
 .replace('useEffect(()=>{if(previousProject.current!==project)', 'useLayoutEffect(()=>{if(previousProject.current!==project)')
 .replace('useEffect(()=>{commands({save:', 'useLayoutEffect(()=>{commands({save:')
);
edit('solutions/videosplat/src/ui/ExportDialog.tsx',text=>text.replace('Saved to your Downloads folder','Saved to your chosen destination'));

edit('solutions/audiosplat/src/main.ts',text=>text.replace('typeof source.id !== "string" ||', 'typeof source.id !== "string" || !source.id || typeof source.name!=="string" || typeof source.mimeType!=="string" || !Number.isInteger(source.channels) || source.channels<1 || source.channels>32 || !Number.isFinite(source.sampleRate) || source.sampleRate<8000 || source.sampleRate>192000 ||'));
