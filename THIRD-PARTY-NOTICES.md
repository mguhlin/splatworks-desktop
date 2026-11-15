# Third-party notices

The application embeds the SplatWorks browser tools and their corresponding source
under `frontend/solutions/`. Original component and dependency notices remain
beside their assets. `frontend/source-manifest.json` identifies the imported
DrawSplat revision and asset hashes.

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
| WebDeck framework v5 | Exported presentation runtime | MIT; `frontend/solutions/pdfsplat/webdeck/LICENSE` |

Go module versions and checksums are pinned in `go.mod` and `go.sum`. Dependency
source is retrieved by Go during builds, and is available from the repositories
identified by those module paths. `licenses/go-modules/` contains their license
texts. Platform GTK/WebKit/WebView2 runtimes are system dependencies and are not
included in the portable application archives.
