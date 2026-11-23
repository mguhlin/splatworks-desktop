# Third-party notices

The application embeds the SplatWorks browser tools and their corresponding source
under `frontend/solutions/` and `frontend/splatworks/`. Original component and dependency notices remain
beside their assets. `frontend/source-manifest.json` identifies the imported
DrawSplat revision and asset hashes. The smaller tool imports are recorded in
`frontend/standalone-manifest.json`; individual profiles include only their dependencies.

| Component | Purpose | License / notice |
| --- | --- | --- |
| Wails | Go desktop shell and platform webview | MIT; `licenses/Wails-LICENSE` |
| Go standard library | Application runtime | BSD; `licenses/Go-LICENSE` |
| Mozilla PDF.js | PDF parsing and rendering | Apache-2.0; headers in `frontend/vendor/pdf*.js`, full text in `licenses/Apache-2.0.txt` |
| pdf-lib | PDF editing and exports | MIT; `frontend/solutions/pdfsplat/vendor/pdf-lib.LICENSE.md` |
| JSZip | ZIP, EPUB, and document packaging | MIT or GPL-3.0; `licenses/JSZip-LICENSE.markdown` |
| Tesseract.js and Tesseract core | Offline OCR | Apache-2.0; `frontend/solutions/pdfsplat/vendor/ocr/` |
| hash-wasm | Argon2id | MIT; each tool's `vendor/hash-wasm/LICENSE` |
| OpenPGP.js | Optional public-key encryption | LGPL-3.0; `frontend/solutions/CipherSplat/vendor/openpgp/LICENSE` |
| QR Code Generator (Kazuhiko Arase) | QRSplat QR encoding | MIT; header in `frontend/solutions/qrsplat/vendor/qrcode.js`, full text in `licenses/QRCode-MIT.txt` |
| WebDeck framework v5 | Exported presentation runtime | MIT; `frontend/solutions/pdfsplat/webdeck/LICENSE` |

Go module versions and checksums are pinned in `go.mod` and `go.sum`. Dependency
source is retrieved by Go during builds, and is available from the repositories
identified by those module paths. `licenses/go-modules/` contains their license
texts. Platform GTK/WebKit/WebView2 runtimes are system dependencies and are not
included in the portable application archives. The Windows setup executable
includes Microsoft's separately licensed Evergreen WebView2 Runtime installer;
its version, publisher and SHA-256 are recorded in the release's `-webview2.json`.
Microsoft's installer manages the runtime and its own servicing independently of
the application.

ImageSplat, both independently and in the combined suite, additionally includes Transformers.js 3.8.1 (Apache-2.0), ONNX Runtime
Web 1.22.0-dev.20250409-89f8206ba4 (MIT), and the ORMBG q8 model at revision
`034e2d884afbab897e10e78fc5bb566b29533fd6` (Apache-2.0). Runtime hashes and
notices are in `ai-runtime/vendor/`; model hashes are in `ai-runtime/model.json`.
ImageSplat archives include these terms under `licenses/AI/`; the combined suite also embeds the original terms beside `solutions/backdropsplat/vendor/`. Original model
source: https://huggingface.co/onnx-community/ormbg-ONNX .

Embedded FontSplat uses the bundled Liberation, DejaVu, Comic Neue and Noto
typefaces. Their original font licenses are included under `licenses/fonts/`
in ImageSplat distributions and beside the font sources. No FFmpeg core is
required by the embedded still-image lettering workflow.


AudioSplat, VideoSplat and MediaSplat snapshots, source hashes and the reviewed browser revision
are recorded in `frontend/media-manifest.json`. Each media app includes dependency
license texts in its `licenses/` directory. AudioSplat includes the LGPL-3.0
MP3 encoder `@breezystack/lamejs`; VideoSplat includes React (MIT), Mediabunny (MPL-2.0),
and `@ffmpeg/ffmpeg` (MIT). The separately bundled `@ffmpeg/core` 0.12.10 is
GPL-2.0-or-later and includes GPL-enabled codec libraries. FFmpeg core, build source
and component notices are documented in [Media engine sources](docs/MEDIA-SOURCES.md).
DejaVu Sans and its notice accompany the FFmpeg assets. All three apps also include the
shared local subtitle engines (Transformers.js, ONNX Runtime and whisper.cpp);
original notices and GGML runtime sources remain alongside their assets.


The six office apps retain GPL-3.0-only notices and their original COPYING files.
Their source, lockfiles, local fonts and importer notices accompany the snapshot.
GridSplat and WriteSplat runtime package notices are in their `dependency-notices/`
directories, including React, Chart.js, HyperFormula (GPL-3.0), ExcelJS, PapaParse,
ProseMirror and docx. Package versions and distribution sources are listed in each
`dependency-notices/packages.json`. Older npm distributions place notices in
README and package metadata; those original files are preserved. Saxes 5.0.1's
full [upstream license](https://github.com/lddubeau/saxes/blob/v5.0.1/LICENSE) is
also preserved in `licenses/office/` and beside the GridSplat notices.

LayoutSplat uses the bundled FFmpeg core for optional local media conversions;
its source/build and GPL notices are in [Media engine sources](docs/MEDIA-SOURCES.md).
The office font licenses remain beside the bundled fonts. Publication background
images retain their original collection README/attribution material in
`frontend/assets/`. Nothing is fetched from a source checkout at runtime.
