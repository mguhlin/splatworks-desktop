# Media engine sources and notices

The media apps embed adapted SplatWorks sources under `frontend/solutions/`.
`frontend/media-manifest.json` records the reviewed browser revision and the hashes
of the bundled source, production assets and notices. Desktop adapters and their
rebuild scripts live in `scripts/media/`, `scripts/adapt-media-tools.mjs` and
`scripts/sync-media-tools.py`. Runtime libraries retain their original licenses;
the application license does not replace them.

- **FFmpeg WebAssembly core 0.12.10:** GPL-2.0-or-later. The matching
  [ffmpeg.wasm v12.15 source and build scripts](https://github.com/ffmpegwasm/ffmpeg.wasm/tree/v12.15)
  include `packages/core`, the Emscripten bridge and the Dockerfile. The
  [Dockerfile](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/v12.15/Dockerfile)
  specifies Emscripten 3.1.40, FFmpeg n5.1.4 and codec dependencies; individual
  library builds and configuration flags are under `build/`. Corresponding
  [FFmpeg n5.1.4 source](https://github.com/FFmpeg/FFmpeg/tree/n5.1.4) and the
  dependency repositories/revisions identified by that Dockerfile are available
  for rebuilding the core. The desktop import preserves the two upstream WASM
  chunks and JavaScript loader without changing their code.
- **ffmpeg.wasm JavaScript API 0.12.15:** MIT. Source is in the same v12.15 tree,
  under `packages/ffmpeg`. The per-app lockfile records its distribution integrity.
- **MP3 encoder `@breezystack/lamejs` 1.2.7:** LGPL-3.0. Source and build instructions:
  [BreezyStack/lamejs](https://github.com/BreezyStack/lamejs). Its original license
  notice accompanies AudioSplat; the encoder remains an independently identifiable
  bundled module. Users may rebuild the application with a modified encoder.
- **Mediabunny:** MPL-2.0. Source and notices:
  [Vanilagy/mediabunny](https://github.com/Vanilagy/mediabunny). The imported lockfile
  identifies the exact package version and integrity.
- **whisper.cpp:** MIT, v1.8.3 at commit
  `2eeeba56e9edd762b4b38467bab96c2517163158`.
  [Pinned source](https://github.com/ggml-org/whisper.cpp/tree/2eeeba56e9edd762b4b38467bab96c2517163158).
  The local bridge, build instructions and license are in
  `frontend/solutions/shared/subtitles/ggml/`.
- **Transformers.js and ONNX Runtime Web:** Apache-2.0 and MIT, respectively.
  Per-app lockfiles identify versions; original license notices accompany each
  media app. Model weights are optional user-selected files or explicit downloads,
  with their own upstream model licenses.
- **React:** MIT. Its original notice accompanies VideoSplat.
- **DejaVu Sans:** Bitstream Vera/DejaVu notices are bundled beside the FFmpeg assets.

Full GPL-2.0 and LGPL-3.0 license texts accompany the distribution under `licenses/`.
All desktop source and rebuild instructions are available from the SplatWorks
Desktop repository and its GitHub source archives.
