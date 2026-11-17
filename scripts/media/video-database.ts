import type { VideoSplatProject } from '../domain/project';
// User media never enters persistent browser storage in the desktop edition.
const projects = new Map<string, VideoSplatProject>();
const media = new Map<string, Blob>();
export async function saveProject(p: VideoSplatProject) { projects.set(p.id,p); }
export async function loadProject(id: string) { return projects.get(id); }
export async function listProjects() { return [...projects.values()]; }
export async function deleteProject(id:string) { projects.delete(id); }
export async function clearProjects() { projects.clear(); }
export async function saveMedia(id:string,blob:Blob) { media.set(id,blob); }
export async function loadMedia(id:string) { return media.get(id); }
export async function deleteMedia(id:string) { media.delete(id); }
export async function clearAllLocalData() { projects.clear();media.clear(); }
