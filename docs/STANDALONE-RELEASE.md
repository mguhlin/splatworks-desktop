1.0 release candidates for GIFsplat, CipherSplat, QRSplat, ImageSplat, AudioSplat and VideoSplat.

- Improve CipherSplat's password-strength label contrast on the credential panel.
- Fix recorder-dialog initialization and protect unsaved recordings when dismissing the dialog.
- Harden portable audio imports, decode replacement sources independently, and reject external media URLs or invalid mixer state before replacing open work.
- Verify embedded video media checksums and keep native project saving synchronized with the visible timeline.
- Preserve pending project names, unsaved transcript edits and modal keyboard behavior.
- Retry temporary Mac disk-image contention without hiding permanent packaging failures; make CI artifact uploads safe to retry.

These candidates remain unsigned pending publisher signing and physical-device validation. See docs/1.0.md, docs/SIGNING.md and docs/VALIDATION.md for the stable-release requirements.

AudioSplat and VideoSplat join GIFsplat, CipherSplat, QRSplat and ImageSplat as independently installed desktop apps for Linux, Windows and Mac.

- **AudioSplat:** multitrack audio import/editing, effects, local WAV/MP3 exports, and portable projects with embedded source audio.
- **VideoSplat:** layered timelines, titles/captions, audio mixing, local exports, and portable projects with embedded source media. The FFmpeg conversion engine is bundled for offline use.
- Both share native destination dialogs, close protection, operation tracking and the default-off connection gate. Save completion is reported after the native write; cancellation, failed writes and newer edits remain unsaved.
- Workspaces and transcription progress stay in memory. Save a project before closing. Local GGML speech models work offline; optional model downloads require connections enabled in Settings.

Video portable projects support 256 MB of source media and 360 MB per file. Video composition export, recording, system audio and optional codecs depend on webview support, permissions and hardware. Browser VideoSplat manifests may require relinking source media. Google Drive and cross-app transfers are omitted from these desktop editions.

- Share editing and project code with the browser tools, with automated source and project-interchange checks.
- Save/open portable GIF, image and QR projects. Preserve frames, layers, text and styling; exclude Wi-Fi passwords.
- Keep valid imports when another image is corrupt, invalidate stale GIF previews, retain undo history for style gestures, and wait for blur saves to complete.
- Bundle the default photo background-removal model and inference runtime in ImageSplat. Fast photo removal works offline on first launch. Restore local FontSplat lettering and typefaces.
- Add a default-off Settings switch for optional connections and model downloads. Turning it off cancels external requests. Updates are installed manually.
- Preserve CipherSplat CS4 compatibility and add native result-save keyboard access. Ctrl/Cmd+S and Ctrl/Cmd+O operate on editable projects in the other apps.

Choose the filename beginning with your app's name: Linux `.deb` or `.tar.gz`, Windows `-setup.exe` or portable ZIP, Mac universal DMG or ZIP. Windows setup includes Microsoft's verified WebView2 installer; portable Windows requires an existing runtime. Linux needs GTK3/WebKitGTK4.1; macOS support begins at 14. ImageSplat downloads are larger because the model, runtime and fonts are included.

Publisher signing, notarization and physical-device qualification remain stable-release gates. Camera, screen and video workflows depend on webview APIs, codecs, device permissions and hardware. Automated checks do not approve physical devices. Scan QR output with a real phone before printing, and test decryption before deleting originals.

Source, licenses, feature scope and signing instructions: https://github.com/mguhlin/splatworks-desktop
