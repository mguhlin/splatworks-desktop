# Standalone desktop applications

The PDF/Cipher suite and the standalone tools live in this repository. Each tool gets its own executable, icon, Mac bundle identifier, Windows installer registration, and Linux package name. The shared Go code provides native saves, safe folder restoration, operation tracking, unsaved-work warnings and restricted navigation. Browser sources remain in `mguhlin/drawsplat`.

| App | Main workflow | Offline scope |
| --- | --- | --- |
| GIFsplat | Turn local images into timed animated GIFs | GIF creation and supported video export |
| CipherSplat | Encrypt/unlock files, folders and text | Argon2id/AES-GCM and OpenPGP engines included |
| QRSplat | Create printable or shareable QR codes | Standard codes; configured redirect services with opt-in connections |
| ImageSplat | Edit and compose images | PNG/GIF, projects, adjustments, blur, bundled Fast model, backgrounds and lettering |
| AudioSplat | Record and edit multitrack audio | WAV/MP3, effects and portable projects with embedded sources |
| VideoSplat | Edit layered video timelines | Local media, titles/captions, mixed audio, portable projects and bundled FFmpeg |

GIFsplat and CipherSplat were requested first. QR creation and quick image editing were selected as useful everyday companions for classroom links, handouts and visual materials; this is a product choice, not a measured demand ranking.

## Build one app

Use the same Go/Wails platform dependencies as the main application:

```sh
python3 scripts/build-profile.py --profile gifsplat --version 1.0.0-rc.4
cd output/profiles/gifsplat
python3 scripts/package-release.py --platform linux --version 1.0.0-rc.4
```

Profile names are `gifsplat`, `ciphersplat`, `qrsplat`, `imagesplat`, `audiosplat` and `videosplat`. Use `--platform windows/amd64` or `--platform darwin/universal` on the corresponding build host. Windows packaging requires `scripts/prepare-windows.ps1`. Mac packaging requires ad hoc or developer signing before archiving. `--prepare-only` stages a profile for inspection. The staged tree contains one tool, its local dependencies, license notices and shared desktop assets. PDF/OCR engines are omitted from the standalone profiles. The default photo model is included only in ImageSplat; the FFmpeg transcoder is included only in VideoSplat.

Import updates explicitly with `python3 scripts/sync-small-tools.py ../drawsplat_github`. Review desktop adapters and the snapshot manifests, run browser/native checks, then commit. `scripts/sync-tools.py` imports the PDF/Cipher suite separately; importing either set must preserve the other.

## Automated distribution

The Standalone tools workflow builds all six tools on Linux, Windows and Mac. It exercises production native saves, validates output bytes, installs/removes Debian packages, installs/upgrades/uninstalls Windows apps while preserving user files, and validates Mac archives, signatures and universal architectures. Browser checks run under the production content-security restrictions and decode exported URL and Wi-Fi QR images.

Push a tag such as `tools-v1.0.0-rc.4` to publish a preview. Core suite tags remain `v…`. Stable standalone tags require `STANDALONE_PHYSICAL_VALIDATION_APPROVED=true` and enable signing automatically. A manually dispatched signed build uses `sign_release=true`. Signing uses the same developer-owned identities and secrets described in [SIGNING.md](SIGNING.md). No credential is bundled in an app.

Before stable approval, run [VALIDATION.md](VALIDATION.md) on every app and applicable platform. Additionally check GIF timing/reordering in an independent viewer; decrypt the standalone Cipher output in the browser tool; scan QR PNG/SVG printouts on a physical phone, including Wi-Fi; and verify image dimensions, transparency, text, undo and background removal in another editor. Test actual native save cancellation, overwrite, permissions, unsaved-work prompts and offline startup. Approve the standalone variable only after recording passing results for the exact tag and architectures.

## Shared browser features and portable projects

The browser repository owns the GIFsplat, ImageSplat, QRSplat, project-file and background-removal implementations. Desktop imports them unchanged. Cross-version tests compare those sources and open projects in both directions. Make editing changes in DrawSplat first, import with `sync-small-tools.py`, run both regression suites, and publish the paired updates. Native saving, the connection gate and installers stay here.

**Save project / Open project** preserve GIF frame order/timing, image layers/text/canvas, and QR content/styling/logos. Files use `.gifsplat`, `.imagesplat` and `.qrsplat`, with the same versioned JSON format in both editions. QR projects exclude Wi-Fi passwords and leave their unsaved warning active when a password was omitted. Projects are limited to 64 MB; images must be embedded rather than external URLs. No project is stored automatically. Browser downloads retain the close warning until the user verifies or reopens the saved copy; native saves clear matching edits after the write completes.

ImageSplat desktop includes the pinned ORMBG Fast model, Transformers.js and ONNX runtime. First-launch photo background removal works without internet or a GPU. The model and runtime are verified against committed SHA-256 records during packaging; their license notices accompany ImageSplat. FontSplat lettering and bundled typefaces work locally; its embedded editor hands back a still PNG layer.

**Settings → Allow optional online connections** defaults off and remembers the user's explicit choice. It permits optional Best-model downloads, configured editable QR services and HTTPS image backgrounds. Turning it off revokes active external requests. Application updates use the manual downloads link; the app does not install remote application code automatically. The bundled Fast model stays local regardless of this setting. Only the online preference is persisted by the native shell; service keys remain in memory.

Video and camera/screen controls use the shared browser implementations and capability detection. Availability depends on the platform webview, codecs, device permissions and hardware. Physical validation must cover these workflows where supported; a successful headless build does not establish device support.


## AudioSplat and VideoSplat

These apps share the reviewed browser editing engines and use the same Go/Wails
shell and independent installers as the other desktop editions. Media processing
runs on this device. Imports, effects, WAV/MP3 encoding and the bundled video
transcoder work without online connections. Camera, microphone, system-audio
capture, hardware encoding and optional formats depend on the platform webview,
codecs and device permissions. Automated synthetic tests do not establish physical
recording support. Video composition export still needs a supported WebCodecs or
canvas/MediaRecorder encoder; the bundled FFmpeg engine performs format conversion.

Save AudioSplat projects as `.audiosplat.json`; they preserve the browser format,
tracks, effects and embedded source audio. Save VideoSplat projects as
`.videosplat.json`; the desktop edition adds embedded source media so the timeline
can reopen independently. Portable video projects support up to 256 MB of source
media and 360 MB per project file. Browser VideoSplat manifests also open, with
missing media relinked using the original source files. Desktop embedded media is
an extension; the browser edition may require relinking those sources.

Workspaces, recordings and transcription progress stay in memory until explicitly
saved. There is no automatic recovery. Save projects before closing; audio/video
exports do not clear the warning for editable project changes. Native save
cancellation or failure preserves that warning. Edits made while a save is pending
remain unsaved. Google Drive and cross-app transfer controls are omitted.

Speech transcription uses bundled engines. A selected local Whisper GGML `.bin`
model works offline; optional public model downloads require connections enabled
in desktop Settings and remain subject to the 300 MB request limit. Larger models
should use local files. Download reviewed SRT/text before closing; generated
transcripts are not stored automatically or resumed after restart.

Import these reviewed sources separately from the smaller JavaScript tools:

```sh
# Install the browser app dependencies from their lockfiles in the explicit checkout.
(cd ../drawsplat_github/solutions/audiosplat && npm ci)
(cd ../drawsplat_github/solutions/videosplat && npm ci)
python3 scripts/sync-media-tools.py ../drawsplat_github
python3 scripts/check-assets.py
```

The media importer builds isolated source copies in a temporary directory, applies
reviewed desktop adapters and commits production bundles, corresponding sources,
dependency notices and `frontend/media-manifest.json`. It never runs upstream
publication scripts or downloads application code at runtime. Native builds consume
the committed snapshot and do not require Node or a browser checkout.

The standalone release workflow uses GitHub’s `macos-15-intel` runner to avoid ARM runner-capacity contention. It still builds and verifies both Intel and Apple-silicon slices in universal packages. Native execution on a hosted Intel runner is automated coverage; physical-device validation on both architectures remains required.
