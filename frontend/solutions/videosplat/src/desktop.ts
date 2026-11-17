/** Desktop ownership: native writes and volatile workspace bookkeeping only. */
export const desktop = (window as any).SplatDesktop;
export const tool = location.pathname.includes('audiosplat') ? 'audiosplat' : 'videosplat';
let revision = 0, savedRevision = 0;
export function changed() { revision++; desktop.changed(tool); }
export function stamp() { return revision; }
export function loaded() { changed(); savedRevision = revision; desktop.changed(tool); }
export async function save(blob: Blob, name: string, projectStamp?: number): Promise<boolean> {
  try { return await desktop.saveBlob(blob, name, projectStamp === undefined ? undefined : {tool, complete:true, stamp:projectStamp}); }
  catch (error) { desktop.status('Save failed: '+(error as Error).message); throw error; }
}
export async function operation<T>(run: () => Promise<T>): Promise<T> {
  const end = desktop.beginOperation(); try { return await run(); } finally { end(); }
}
export const confirmReplace = () => desktop.confirmReplace(tool);
// Native commands are installed by each editor after its own controls are ready.
export function commands(actions: {save:()=>unknown;open:()=>unknown}) { desktop.registerCommands(tool, Object.fromEntries(Object.entries(actions).map(([key,action])=>[key,()=>Promise.resolve().then(action).catch((error:Error)=>desktop.status('Action failed: '+error.message))]))); }
// Draft recordings and transcripts are separate from the editable timeline.
const drafts=new Map<string,number>();let draftRevision=0;
export function retain(key:string) { drafts.set(key,++draftRevision);desktop.changed(tool); }
export function draftStamp(key:string) { return drafts.get(key); }
export function release(key:string,expected=drafts.get(key)) { if(drafts.get(key)===expected)drafts.delete(key);desktop.changed(tool); }
export function discardDraft(key:string) {
  if(drafts.has(key)&&!window.confirm('Discard unsaved '+key+'? Save or download it before closing.'))return false;
  release(key);return true;
}
desktop.registerWorkspace(tool,{isDirty:()=>revision!==savedRevision||drafts.size>0,markSaved:(value:number)=>{if(value===revision)savedRevision=value;}});
(window as any).SplatMediaSession={retain,draftStamp,release,discardDraft};
