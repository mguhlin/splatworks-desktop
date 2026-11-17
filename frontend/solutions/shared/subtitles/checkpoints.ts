import { getWhisperModel, type WhisperModelId } from './models';
import { validateCues, type Cue } from './core';
export interface Checkpoint {
  key: string; cues: Cue[]; nextSample: number; totalSamples: number; complete: boolean; updatedAt: number;
}
export async function readCheckpoint(_key:string,_total:number):Promise<Checkpoint|undefined>{return undefined;}
export async function saveCheckpoint(_value:Checkpoint):Promise<void>{throw Error('Desktop transcripts stay in memory. Download SRT/text to keep them.');}
export async function deleteCheckpoint(_key:string):Promise<void>{}
/** Hash all bytes in bounded chunks; names/mtime alone can match different recordings. */
export async function fingerprint(blob: Blob, start: number, duration: number, signal: AbortSignal, model: WhisperModelId = 'tiny'): Promise<string> {
  return fingerprintWithNamespace(blob, start, duration, signal, getWhisperModel(model).checkpointNamespace);
}
export async function fingerprintWithNamespace(blob: Blob, start: number, duration: number, signal: AbortSignal, namespace: string): Promise<string> {
  const hashes: Uint8Array[] = [];
  for (let offset = 0; offset < blob.size; offset += 1024 * 1024) {
    signal.throwIfAborted();
    const bytes = await blob.slice(offset, offset + 1024 * 1024).arrayBuffer();
    hashes.push(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
  }
  signal.throwIfAborted();
  const meta = new TextEncoder().encode(`${namespace}:${blob.size}:${start}:${duration}:`);
  const joined = new Uint8Array(meta.length + hashes.length * 32); joined.set(meta);
  hashes.forEach((hash, index) => joined.set(hash, meta.length + index * 32));
  const digest = await crypto.subtle.digest('SHA-256', joined);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
