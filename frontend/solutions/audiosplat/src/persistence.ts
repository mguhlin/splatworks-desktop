import type {StoredProject} from "./types";
export async function saveWorkspace(..._args:unknown[]):Promise<void>{}
export async function loadWorkspace():Promise<StoredProject|null>{return null;}
export async function clearWorkspace():Promise<void>{}
export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Invalid embedded audio");
  return response.blob();
}
