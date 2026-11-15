GIFsplat, CipherSplat, QRSplat and ImageSplat for Linux, Windows and Mac.

- Share editing and project code with the browser tools, with automated source and project-interchange checks.
- Save/open portable GIF, image and QR projects. Preserve frames, layers, text and styling; exclude Wi-Fi passwords.
- Keep valid imports when another image is corrupt, invalidate stale GIF previews, retain undo history for style gestures, and wait for blur saves to complete.
- Bundle the default photo background-removal model and inference runtime in ImageSplat. Fast photo removal works offline on first launch. Restore local FontSplat lettering and typefaces.
- Add a default-off Settings switch for optional connections and model downloads. Turning it off cancels external requests. Updates are installed manually.
- Preserve CipherSplat CS4 compatibility and add native result-save keyboard access. Ctrl/Cmd+S and Ctrl/Cmd+O operate on editable projects in the other apps.

Choose the filename beginning with your app's name: Linux `.deb` or `.tar.gz`, Windows `-setup.exe` or portable ZIP, Mac universal DMG or ZIP. Windows setup includes Microsoft's verified WebView2 installer; portable Windows requires an existing runtime. Linux needs GTK3/WebKitGTK4.1; macOS support begins at 14. ImageSplat downloads are larger because the model, runtime and fonts are included.

Publisher signing, notarization and physical-device qualification remain stable-release gates. Camera, screen and video workflows depend on webview APIs, codecs, device permissions and hardware. Automated checks do not approve physical devices. Scan QR output with a real phone before printing, and test decryption before deleting originals.

Source, licenses, feature scope and signing instructions: https://github.com/mguhlin/splatworks-desktop
