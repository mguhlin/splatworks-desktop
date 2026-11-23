# SplatWorks Desktop development handoff

The PDF/Cipher suite and all six standalone apps have published, verified release
candidates. Stable publisher signing and physical-device qualification remain open.

## CipherSplat workspace update

The current work imports the committed CipherSplat 1.1.0 browser port of CipherEnc.
It preserves CipherSplat branding and CS4/legacy formats while adding automatic
input detection, local OpenPGP key import/fingerprints, verified compressed file
saves, safe ZIP/PDF restoration, and static in-app Help. Native saves retain
cancelled/failed results for retry; mode changes, Clear and input replacement
protect unsaved work. Empty directories use a narrow save-session capability
inside the private restoration stage. No automatic recovery copies are created.

Local verification passed 102 Chromium/WebKit checks, Go transfer race tests/vet,
five Python packaging tests and all snapshot/runtime-asset checks. The browser
port passed 57 Chromium/Firefox/WebKit checks, independent CipherEnc fixtures,
direct-file offline checks and automated WCAG A/AA scans of all three pages.
Publisher signing and physical-device testing remain open. Published candidates are core `v1.0.0-rc.11` and standalone `tools-v1.0.0-rc.5`.
All 98 public files were downloaded and matched adjacent checksums, official
sizes and GitHub SHA-256 digests. The extracted Linux suite and CipherSplat
standalone each passed eight Chromium/WebKit workflow checks. All three native
build platforms passed smoke, installation/archive and packaging checks.

## Published candidates

| Distribution | Release | Build source | Automated delivery |
| --- | --- | --- | --- |
| PDF/Cipher suite | [v1.0.0-rc.11](https://github.com/mguhlin/splatworks-desktop/releases/tag/v1.0.0-rc.11) | `ef4bf55` | [Successful workflow](https://github.com/mguhlin/splatworks-desktop/actions/runs/45225213734) |
| Six standalone apps | [tools-v1.0.0-rc.5](https://github.com/mguhlin/splatworks-desktop/releases/tag/tools-v1.0.0-rc.5) | `ef4bf55` | [Successful workflow](https://github.com/mguhlin/splatworks-desktop/actions/runs/45225214790) |

Standalone apps: GIFsplat, CipherSplat, QRSplat, ImageSplat, AudioSplat and VideoSplat.
Both workflows use Intel Mac runners to build universal packages. Their native
checks qualify build runners, not physical devices or Apple-silicon hardware.

## Regression fixes

- Imported DrawSplat `a19b34d` into the PDF/Cipher snapshot. PDF page insertion,
  duplication and reordering retain painted thumbnails while previews are pending.
- Improved CipherSplat password-strength label contrast in the suite and its
  standalone app. Both regressions failed in Chromium and WebKit before import
  and passed afterward.
- The snapshot includes editable external/file links and internal PDF page
  destinations. Native-save checks reopen exported annotations and destinations.
- Link-aware rotation is asynchronous. Native smoke checks now wait for the
  rotation before exporting; a save overlapping later edits must retain its warning.

The browser applications remain owned by `mguhlin/drawsplat`. Desktop adapters,
registries, native authority, installers and packaging remain in this repository.
The paired browser/core-app regression work is recorded in the sibling checkout's
`CORE_SESSION_NOTES.md`.

## Evidence

- 102 Chromium/WebKit checks passed locally and in core CI.
- Go transfer race tests and vet passed locally; five Python packaging checks passed.
- Both release workflows passed Linux, Windows and universal Mac build, native
  smoke, installer/archive and checksum checks. Linux native checks run offline.
- All 98 public files were downloaded: seven core distribution artifacts and
  their checksums, plus 42 standalone artifacts and their checksums. Sizes and
  SHA-256 digests matched GitHub metadata and adjacent checksum files.
- The downloaded Linux suite and standalone CipherSplat each passed eight
  Chromium/WebKit checks covering compatible encryption, text round trips,
  cancelled saves and mode/Help lifecycle. The suite checks also exercised PDF
  interoperability. The other five standalone apps passed native CI; their
  published files were verified by size and digest here.

Ignored evidence is under `output/public/`; browser logs are in `/tmp/` and do not
survive every environment. A fresh checkout can reproduce package verification:

```sh
gh release download v1.0.0-rc.11 --dir output/public/v1.0.0-rc.11
python3 scripts/verify-packages.py output/public/v1.0.0-rc.11
gh release download tools-v1.0.0-rc.5 --dir output/public/tools-v1.0.0-rc.5
python3 scripts/verify-packages.py output/public/tools-v1.0.0-rc.5
```

## Qualification boundaries

| Gate | Result and limits |
| --- | --- |
| Task/design/accessibility | Automated editing, save/reopen, cancellation and keyboard paths PASS; real screen-reader, native-picker and touch qualification NOT_RUN. |
| Privacy/education applicability | Exercised local processing, explicit saves and connection controls PASS; institution-specific deployment review is separate. |
| Security boundaries | Tested native save/restoration rejection, lifecycle and integrity checks PASS; this is not a complete security audit. |
| Recoverable delivery | Candidate builds, packages and published bytes PASS; publisher signing and physical approval NOT_RUN. |

Decision: CONDITIONAL for unsigned evaluation candidates. Do not publish stable
`v1.0.0` or `tools-v1.0.0`, set physical-approval flags, or claim trusted publisher
identity without the evidence in `docs/SIGNING.md` and `docs/VALIDATION.md`.
No credentials or hardware approval were supplied. Never persist document
contents, passwords or recovery copies automatically.

This machine has Go 1.27.4 and Wails 2.17.1, but lacks the GTK/WebKit development
headers and pkg-config needed for local native rebuilding. Source/browser checks
ran here; native builds and installed-package tests ran in CI. The downloaded
Linux loopback runtimes ran here. Preserve these distinctions.
