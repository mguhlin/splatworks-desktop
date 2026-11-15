PDFsplat and CipherSplat together in a standalone Go/Wails desktop application.

- Local PDF editing, annotations, page tools, conversion, and bundled English/Spanish OCR.
- CipherSplat file, folder, and text encryption with the existing CS4 package format and optional OpenPGP tools.
- Native destination pickers and chunked saves; folder restoration creates a new destination folder.
- Both workspaces remain open while switching tools.
- No account, hosted backend, Python, Node.js, or Go installation required for desktop use.

Download the package for your platform and its matching `.sha256` file. Linux
`.deb` packages declare GTK 3 and WebKitGTK 4.1 dependencies. Windows requires
Microsoft Edge WebView2 Runtime; provision it before an offline deployment. Mac
packages contain a universal application for Intel and Apple silicon.

This is an **unsigned preview**, without Apple notarization. Platform publisher
warnings are expected. Native automated smoke tests exercise PDF rendering/export,
CS4 encryption/authentication, native file writes, folder restoration, and local
OCR on the build runners. Physical-device camera, capture, screen-reader, and
file-picker verification remains outstanding. Camera/screen capture depends on
the embedded webview; use the browser edition for browser-tab capture.

PDF visual covers are not secure redaction. Existing browser-tool memory and
conversion limits still apply. This edition combines Go desktop integration with
the existing JavaScript PDF and encryption engines.

Notices and installation instructions are included in each archive. Corresponding
source is available in this repository and the release's source archives.
