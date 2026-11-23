import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App";
import "./ui/styles.css";
import "./ui/media.css";

if (false) {
  window.addEventListener("load", async () => {
    // Activating an offline worker must never reload an open editor: recordings
    // and unfinished subtitle jobs exist only in this page. New app code takes
    // effect when the user next opens or reloads VideoSplat.
    try {
      const registration = await navigator.serviceWorker.register(
        `${import.meta.env.BASE_URL}sw.js?v=29`,
        { updateViaCache: "none" },
      );
      await registration.update();
    } catch (error) {
      // Offline support is optional; registration/update failure must not
      // interrupt the editor or produce an unhandled rejection.
      console.warn("VideoSplat offline support could not be updated.", error);
    }
  });
}
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);

void (async()=>{if(!await (window.parent as any).go?.main.App.SmokeEnabled())return;const {getEngine}=await import('./export/transcoder');const {startCapture}=await import('./recorder/capture');(window as any).SplatMediaSmoke={capture:startCapture,encode:async()=>{const ffmpeg=await getEngine();try{const code=await ffmpeg.exec(['-f','lavfi','-i','color=c=red:s=80x60:r=5:d=0.4','-c:v','libx264','-pix_fmt','yuv420p','-y','native.mp4']);if(code!==0)throw Error('Bundled video encoding failed');const bytes=await ffmpeg.readFile('native.mp4');return new Blob([bytes as Uint8Array],{type:'video/mp4'});}finally{await ffmpeg.deleteFile('native.mp4').catch(()=>{});ffmpeg.terminate();}}};})();
