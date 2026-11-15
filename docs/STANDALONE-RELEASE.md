Four independently installable offline tools share the SplatWorks Go desktop shell:

- **GIFsplat:** import image frames, arrange them, adjust timing and palette, generate and save animated GIFs.
- **CipherSplat:** password and OpenPGP encryption for files, folders and text, compatible with existing `.csplat` packages.
- **QRSplat:** standard QR codes for links, text, email, phone and Wi-Fi; PNG/SVG exports and explicit local design presets.
- **ImageSplat:** layers, text, shapes, crop, adjustments, blur, PNG/GIF export, and local white/color background removal.

Choose the filename beginning with your tool's name. Linux has a `.deb` and portable `.tar.gz`; Windows has a per-user `-setup.exe` and portable ZIP; Mac has a universal DMG and ZIP. SHA-256 files accompany every artifact. Windows setup includes Microsoft's publisher-verified offline WebView2 installer. The portable Windows ZIP requires an existing runtime. Linux needs GTK3/WebKitGTK4.1; macOS support begins at 14.

Each executable includes its selected tool and processing engines. GIF, QR and image packages exclude the PDF/OCR engines. All work runs locally, saves use native destination dialogs, and closing unsaved work requires confirmation. No Go, Node.js or Python installation is needed to use the apps.

PNG QR exports draw the encoded modules directly into pixels to avoid platform SVG rasterization differences.

This is a preview with automated browser, native application, export-file, installer and checksum checks. Developer publisher signing, Apple notarization and physical-device qualification remain pending. Automated native tests use synthetic data and bypass destination dialogs; they do not approve real dialogs or physical hardware.

GIFsplat focuses on GIF creation; importing an animated source image supplies one frame. Video export is excluded. QRSplat excludes the network-based editable redirect service. ImageSplat excludes large photo-subject AI models, camera/screen capture, online background URLs, and the separate FontSplat service. White/color removal is bundled and offline. Scan QR codes with a real device before printing.

Source, licenses, build instructions, signing setup and physical validation: https://github.com/mguhlin/splatworks-desktop
