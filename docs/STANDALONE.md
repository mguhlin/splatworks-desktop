# Standalone desktop applications

The PDF/Cipher suite and the standalone tools live in this repository. Each tool gets its own executable, icon, Mac bundle identifier, Windows installer registration, and Linux package name. The shared Go code provides native saves, safe folder restoration, operation tracking, unsaved-work warnings and restricted navigation. Browser sources remain in `mguhlin/drawsplat`.

| App | Main workflow | Offline scope |
| --- | --- | --- |
| GIFsplat | Turn local images into timed animated GIFs | GIF creation; no video capture/export |
| CipherSplat | Encrypt/unlock files, folders and text | Argon2id/AES-GCM and OpenPGP engines included |
| QRSplat | Create printable or shareable QR codes | Standard codes; no redirect-service backend |
| ImageSplat | Edit and compose images | PNG/GIF exports, adjustments, blur, white/color removal; no remote models or hardware capture |

GIFsplat and CipherSplat were requested first. QR creation and quick image editing were selected as useful everyday companions for classroom links, handouts and visual materials; this is a product choice, not a measured demand ranking.

## Build one app

Use the same Go/Wails platform dependencies as the main application:

```sh
python3 scripts/build-profile.py --profile gifsplat --version 0.1.0-preview.1
cd output/profiles/gifsplat
python3 scripts/package-release.py --platform linux --version 0.1.0-preview.1
```

Profile names are `gifsplat`, `ciphersplat`, `qrsplat` and `imagesplat`. Use `--platform windows/amd64` or `--platform darwin/universal` on the corresponding build host. Windows packaging requires `scripts/prepare-windows.ps1`. Mac packaging requires ad hoc or developer signing before archiving. `--prepare-only` stages a profile for inspection. The staged tree contains one tool, its local dependencies, license notices and shared desktop assets. PDF/OCR engines and photo-subject models are excluded from the small profiles.

Import updates explicitly with `python3 scripts/sync-small-tools.py ../drawsplat_github`. Review desktop adapters and both snapshot manifests, run browser/native checks, then commit. `scripts/sync-tools.py` imports the PDF/Cipher suite separately; importing either set must preserve the other.

## Automated distribution

The Standalone tools workflow builds all four tools on Linux, Windows and Mac. It exercises production native saves, validates output bytes, installs/removes Debian packages, installs/upgrades/uninstalls Windows apps while preserving user files, and validates Mac archives, signatures and universal architectures. Browser checks run under the production content-security restrictions and decode exported URL and Wi-Fi QR images.

Push a tag such as `tools-v0.1.0-preview.1` to publish a preview. Core suite tags remain `v…`. Stable standalone tags require `STANDALONE_PHYSICAL_VALIDATION_APPROVED=true` and enable signing automatically. A manually dispatched signed build uses `sign_release=true`. Signing uses the same developer-owned identities and secrets described in [SIGNING.md](SIGNING.md). No credential is bundled in an app.

Before stable approval, run [VALIDATION.md](VALIDATION.md) on every app and applicable platform. Additionally check GIF timing/reordering in an independent viewer; decrypt the standalone Cipher output in the browser tool; scan QR PNG/SVG printouts on a physical phone, including Wi-Fi; and verify image dimensions, transparency, text, undo and background removal in another editor. Test actual native save cancellation, overwrite, permissions, unsaved-work prompts and offline startup. Approve the standalone variable only after recording passing results for the exact tag and architectures.
