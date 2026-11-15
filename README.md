# SplatWorks Desktop

PDFsplat and CipherSplat in a local desktop application for Linux, Windows, and
macOS. Go and Wails provide the application shell and native file saving. The
existing SplatWorks web tools provide PDF rendering, editing, OCR, and encryption.

[Download releases](https://github.com/mguhlin/splatworks-desktop/releases) ·
[SplatWorks](https://splatworks.org) ·
[Browser-tool source](https://github.com/mguhlin/drawsplat)

## Install

This initial preview is unsigned. Windows and macOS may show an application
publisher warning. Downloads are accompanied by SHA-256 checksums. Physical
device testing, code signing, and notarization remain release-readiness work.

- **Linux x86-64:** use the `.deb` on Debian/Ubuntu, or extract the `.tar.gz` and
  run `SplatWorks-Desktop`. Requires GTK 3 and WebKitGTK 4.1. The Debian package
  declares these dependencies so the package manager can install them.
- **Windows x86-64:** extract the Windows ZIP and run `SplatWorks-Desktop.exe`.
  Requires Microsoft Edge WebView2 Runtime. It is normally present on Windows 11.
  If missing, install it using Microsoft's official [WebView2 Runtime installer](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).
  For an offline deployment, provision the runtime before disconnecting.
- **Mac, Intel or Apple silicon:** open the DMG and copy `SplatWorks Desktop.app`
  to Applications, or extract the ZIP. The universal application contains both
  architectures. Uses the system WebKit runtime.

Go, Node.js, and Python are not required to use the desktop application. The local
tools work without internet access once the platform runtimes are installed.
Website links open in the system browser. There is no updater or runtime tool
download.

## Use

Choose **PDFsplat** or **CipherSplat** in the application bar. Switching tools
keeps both workspaces open. Open a file with the tool's picker or drop it into the
workspace. Saves use native destination dialogs. CipherSplat restores folder
packages inside a newly created directory, preserving nested paths and empty
files without overlaying an existing folder. Close the application to discard
unsaved work and in-memory keys. Ctrl/Cmd+1 and Ctrl/Cmd+2 switch tools.

The complete PDF/OCR engines, English and Spanish OCR models, Argon2id engine,
OpenPGP engine, icons, and interface translations are bundled. CipherSplat retains
the existing CS4 `.csplat` format, including compatibility with PDFsplat.

PDF text replacement and covers are visual edits, not secure redaction. OCR
requires review and does not create tagged accessible PDFs. Browser-engine memory
limits and existing import/export limitations still apply. Camera and screen
capture support depends on the embedded webview and operating-system permissions;
browser tab capture is best done in the browser edition. WebDeck exports open in
a browser for presentation and printing. Google Drive integration is omitted from
the desktop interface.

## Repository boundaries

This repository owns the shared Go shell, desktop adapters, installers, and
release workflows. `mguhlin/drawsplat` owns the browser applications and website.
The website can link to this repository's releases; GitHub Pages cannot run a
native desktop application. Other SplatWorks tools can join the registry as their
offline dependencies and desktop behavior are verified.

The tools are a committed, reproducible snapshot. `frontend/source-manifest.json`
records the upstream commit and bundled file hashes, without maintenance dates.
No symlink to another checkout or external server is needed to build a release.

## Develop

Install Go 1.27 or newer, Wails CLI **v2.17.1**, and the [Wails platform build dependencies](https://v2.wails.io/docs/gettingstarted/installation/).
On Linux, use GTK 3 and WebKitGTK 4.1 development packages. Node.js is needed only
for browser checks or rebuilding the upstream JavaScript bundle.

```sh
go install github.com/wailsapp/wails/v2/cmd/wails@v2.17.1
python3 scripts/check-assets.py
go test -race ./internal/transfer
wails build -tags webkit2_41      # Linux
# wails build                    # Windows or macOS
```

Use `wails dev -tags webkit2_41` on Linux, or `wails dev` elsewhere. A built
application also offers `--serve` for a loopback browser session with ordinary
browser downloads and no native file access. It prints its local address; use
`--port 4194` to select a fixed port.

```sh
npm ci
npx playwright install chromium webkit
npm test
./build/bin/SplatWorks-Desktop --smoke-test ./output/native
```

The explicit smoke-test option uses synthetic files and bypasses destination
dialogs. It runs the real desktop renderer, editing/export, chunked native saves,
CS4 authentication, folder restoration, and bundled OCR. `native-smoke.json`
contains the result. On Linux it can run under Xvfb with networking disabled.
The release workflow runs native smoke checks on each build platform and uploads
the reports. These automated checks do not establish physical-device camera,
screen-reader, touch, or file-picker behavior.

To import a reviewed browser-tools revision:

```sh
python3 scripts/sync-tools.py ../drawsplat_github
python3 scripts/check-assets.py
```

Make browser tool changes upstream first. `sync-tools.py` applies the small,
explicit desktop adaptations and fails if an expected integration point changes.
It does not rebuild the browser bundle; run the upstream PDF build before syncing
when browser source changes. The copied source and build script remain available
for rebuilding the bundle independently.

## Licensing

AGPL-3.0-or-later, retaining the upstream SplatWorks license and notices. See
[LICENSE](LICENSE), [COPYING](COPYING), [NOTICE.md](NOTICE.md), and
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). User documents and keys remain
their owners' content. This desktop edition is not an all-Go rewrite of the tools.
