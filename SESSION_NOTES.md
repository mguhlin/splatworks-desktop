# SplatWorks Desktop development handoff

The fourteen-app Home chooser and media integration are implemented for the next
candidate. The verified public baseline remains `v1.0.0-rc.14` until the new
candidate's native workflow and public package checks finish. Standalone packages
remain `tools-v1.0.0-rc.5`.

Home starts without loading an editor, places all fourteen apps around the central
SplatWorks logo, and retains mounted workspaces on return. GIFsplat, QRSplat,
ImageSplat, AudioSplat, VideoSplat and MediaSplat join the existing eight apps.
ImageSplat includes the pinned Fast model/runtime in `core-assets-manifest.json`.
Media imports/builds stay isolated from the browser checkout; MediaSplat native
adapters use awaited saves, output drafts, close/replacement warnings and explicit
256 MiB input / 512 MiB output limits. The shared native smoke now exercises all
fourteen apps and actual exports. Build-runner checks do not qualify physical
file pickers, accessibility, recording or hardware codecs.

## Previous public baseline

## Published candidates

| Distribution | Release | Build source | Automated delivery |
| --- | --- | --- | --- |
| Eight-app suite | [v1.0.0-rc.14](https://github.com/mguhlin/splatworks-desktop/releases/tag/v1.0.0-rc.14) | `4d6e709` | [Successful workflow](https://github.com/mguhlin/splatworks-desktop/actions/runs/45242637093) |
| Six standalone apps | [tools-v1.0.0-rc.5](https://github.com/mguhlin/splatworks-desktop/releases/tag/tools-v1.0.0-rc.5) | `ef4bf55` | [Successful workflow](https://github.com/mguhlin/splatworks-desktop/actions/runs/45225214790) |

Combined apps: ListSplat, GridSplat, WriteSplat, ShowSplat, LayoutSplat, PlanSplat,
PDFsplat and CipherSplat. Standalones: GIFsplat, CipherSplat, QRSplat, ImageSplat,
AudioSplat and VideoSplat. The Mac packages are universal; native execution ran
on Intel build runners, not Apple-silicon hardware.

## Core integration

The suite imports committed DrawSplat `ccaad8a`. The Apps chooser retains mounted
documents and the app uses the SplatWorks icon. Native project saves protect
newer edits, cancelled/failed writes, import replacement and unfinished planner
forms. Known cross-app office formats move in memory. Desktop drafts and service
workers do not persist document content. Chart/image data-URL exports use native
destination dialogs. Suite Help preserves edited work.

ShowSplat Present explicitly saves WebDeck HTML for presentation in a browser.
Printing uses exported HTML/PDF in a browser; cloud-account workflows use browser
editions. Grid project files preserve sheet data, formulas and formatting; chart
appearance needs a separate image export. See `docs/OFFICE.md` for support limits.
Browser editions retain their browser saving and offline behavior. PlanSplat's
worker caches the new shared adapter for offline reloads.

The importer now selects committed source inputs and excludes developer caches.
An ignored Python bytecode entry caused the rc.12 integrity gate to fail before
publication. Superseded candidates were cancelled; no failed candidate's packages
were promoted on the website. Keep source/browser changes upstream, commit them,
and import an explicit checkout with `scripts/sync-tools.py`.

## Evidence

- 134 Chromium/WebKit checks passed in release CI, including all six office
  project saves, reopen/browser interoperability, cancellation, late results,
  unsaved decisions, no persistent drafts, exports, navigation and Help.
- All three native platforms passed 58 smoke checks with real Go writes, plus
  Windows install/upgrade/uninstall, Linux install/removal, Mac archive/disk-image
  and universal-architecture checks. Linux native execution ran without networking.
- All 1579 snapshot/runtime hashes passed. Five Python packaging tests and Go
  transfer race tests passed. Every core manifest path exists in Git.
- All 14 distribution files matched the public GitHub sizes and SHA-256 digests.
  Public sidecars, the WebView2 manifest and Linux archive were fetched directly;
  Windows/Mac package bytes came from CI and matched their public release digests.
- The downloaded Linux runtime served its production security policy and passed
  64 Chromium/WebKit office, PDF, CipherSplat and lifecycle checks. This loopback
  verification uses browser automation; native webviews were exercised in CI.
- The six standalone packages retain their earlier qualification: all 84 files
  matched official metadata/checksums and all platforms passed native/package CI.

Ignored evidence is under `output/native-proof/`, `output/pre-release/` and
`output/public/`; the public verification receipt is
`output/public/v1.0.0-rc.14-verified.json`. Public downloads and the short guide are
maintained in the sibling checkout's `data/desktop-apps.json` and
`docs/desktop-apps.md`. School privacy/agreement resources are at
https://splatworks.org/schools/ . Preserve the user's unrelated untracked
`pages/audit_instructions.md` in that checkout.

## CipherSplat and PDF compatibility

CipherSplat retains its name, CS4/legacy formats, CipherEnc-derived automatic input
detection, local OpenPGP key import/fingerprints, compressed and verified saves,
empty-directory restoration, and static Help. Cancelled/failed results stay open
for retry; mode changes and replacement protect unsaved work. PDFsplat retains
editable web/file links and internal destinations, stable painted thumbnails
during page edits, and local English/Spanish OCR. Covers are not secure redaction.

## Qualification boundaries

| Gate | Result and limits |
| --- | --- |
| Task/design/accessibility | Automated editing, save/reopen, cancellation and keyboard paths PASS; real screen-reader, native-picker and touch qualification NOT_RUN. |
| Privacy/education applicability | Exercised local processing, explicit saving and connection controls PASS; institution-specific deployment review is separate. |
| Security boundaries | Native capability, lifecycle and integrity checks PASS; not a complete security audit. |
| Recoverable delivery | Candidate builds, native/platform checks, package integrity and publication PASS; publisher signing and physical approval NOT_RUN. |

Decision: CONDITIONAL for unsigned evaluation candidates. Do not publish stable
releases or set physical-approval flags without the evidence in `docs/SIGNING.md`
and `docs/VALIDATION.md`. Never persist documents, credentials or recovery copies
automatically. Go 1.27.4 and Wails 2.17.1 are installed here; GTK/WebKit development
headers and pkg-config are absent. Source/browser and downloaded loopback checks
ran here; native builds and installation/archive checks ran in CI.
