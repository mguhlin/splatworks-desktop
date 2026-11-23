# SplatWorks Desktop development handoff

The fourteen-app suite is published as `v1.0.0-rc.15`, source `a8f75bd`.
The six smaller standalone packages remain `tools-v1.0.0-rc.5`, source `ef4bf55`.
Stable publisher signing and physical-device qualification remain open.

## Published candidates

| Distribution | Release | Verified workflow |
| --- | --- | --- |
| Fourteen-app suite | [v1.0.0-rc.15](https://github.com/mguhlin/splatworks-desktop/releases/tag/v1.0.0-rc.15) | [Release checks and delivery](https://github.com/mguhlin/splatworks-desktop/actions/runs/45268392420) |
| Six standalone apps | [tools-v1.0.0-rc.5](https://github.com/mguhlin/splatworks-desktop/releases/tag/tools-v1.0.0-rc.5) | [Release checks and delivery](https://github.com/mguhlin/splatworks-desktop/actions/runs/45225214790) |

Home starts without loading an editor. All fourteen app choices surround the
central SplatWorks logo; a compact grid fits small screens. Home and app switching
retain mounted workspaces, unsaved state and active operations. Deep links can
open a specific tool. Single-app profiles still open their own editor directly.

The suite includes ListSplat, GridSplat, WriteSplat, ShowSplat, LayoutSplat,
PlanSplat, PDFsplat, CipherSplat, GIFsplat, QRSplat, ImageSplat, AudioSplat,
VideoSplat and MediaSplat. ImageSplat bundles the pinned Fast model and runtime.
MediaSplat has native output/ZIP saves, independent output drafts, replacement
and close warnings, retryable cancelled/failed saves, and snapshot tracking that
preserves newer settings and subtitle-file changes. Input media is limited to
256 MiB in total and output to 512 MiB. Audio/Video retain portable project saves.
Speech models are optional explicit downloads or local files; online connections
default off. No automatic document, credential or recovery persistence is allowed.

## Source ownership and rebuilds

Browser apps live in the sibling `drawsplat_github` repository. Keep adapters here.
The registry and bundled `frontend/tools.json` must stay identical with unique IDs.

- `scripts/sync-tools.py` imports committed office/PDF/Cipher inputs, retaining
  snapshot ownership separately from small/media apps. Office snapshot: `ccaad8a`.
- `scripts/sync-small-tools.py` imports GIF/QR/Image and embedded helpers.
- `scripts/sync-media-tools.py` builds Audio/Video/Media in isolation from the
  explicit browser checkout; `adapt-media-tools.mjs`, `adapt-mediasplat.mjs` and
  `scripts/media/` apply desktop boundaries. Media snapshot: `eed7b56`.
- `scripts/prepare-core-assets.py` verifies the pinned AI model and bundles its
  runtime, licenses and `core-assets-manifest.json`. Never fetch app code at runtime.
- `scripts/check-assets.py` checks all four manifests, 1790 hashes, local engines,
  entry points and icons. Import committed files only; ignored developer caches
  previously caused an integrity failure before publication.

Office project saving/reopening, in-memory file handoffs, native chart/image
exports and Help remain qualified. Grid projects preserve sheet data, formulas
and formatting; save chart appearance as an image. ShowSplat explicitly saves
WebDeck HTML for browser presentation. Print exported HTML/PDF in a browser;
cloud-account workflows use browser editions. See `docs/OFFICE.md`.

## Evidence

- The exact candidate passed 150 Chromium/WebKit checks. One initial five-second
  CipherSplat cancellation assertion timed out; ten local WebKit repetitions and
  the full same-source CI rerun passed. Native encryption checks also passed.
- Each platform passed 157 native checks with actual Go output files and all
  fourteen engines. Linux native execution ran with networking disabled.
- Windows install/upgrade/uninstall, Linux install/removal and Mac archive/DMG
  integrity and universal-architecture checks passed. Mac native execution used
  Intel build runners; Apple-silicon physical qualification remains open.
- Go transfer race tests, policy tests, vulnerability scanning and five Python
  packaging tests passed in CI. Snapshot and engine hashes passed.
- All fourteen release files match public GitHub sizes/digests and SHA-256 sidecars.
  Linux/Windows package bytes came from the tagged CI artifacts; public sidecars
  and both Mac distributions were downloaded directly. Mac hashes also match
  checksum records read from its qualified CI artifact.
- The downloaded Linux binary served the production security policy and passed
  another 80 Chromium/WebKit office/PDF/Cipher/home/media interface checks.
  These use loopback browser automation; native webviews were exercised in CI.
- Standalones retain their earlier qualification: 84 files verified against
  public metadata/checksums, with all native/platform checks passing.

Ignored receipts are under `output/native-proof/rc15/`, `output/pre-release/` and
`output/public/v1.0.0-rc.15-verified.json`. The local runtime used isolated WebKit
libraries in `output/toolchain/host-runtime/` for the loopback check. Go 1.27.4
and Wails 2.17.1 are available; pkg-config and GTK/WebKit development headers are
absent, so native compilation and package installation ran in CI.

The website catalogue and short guide live in `data/desktop-apps.json` and
`docs/desktop-apps.md` in the sibling checkout. Both explain the Home chooser,
fourteen apps and further desktop work. School privacy/agreement resources stay
at https://splatworks.org/schools/ . Preserve the user's unrelated untracked
`pages/audit_instructions.md` in that checkout.

## CipherSplat and PDF compatibility

CipherSplat retains its name, CS4/legacy formats, CipherEnc-derived automatic input
detection, local OpenPGP key import/fingerprints, compressed and verified saves,
empty-directory restoration, and static Help. Cancelled/failed results stay open
for retry; mode changes and replacement protect unsaved work. PDFsplat retains
editable web/file links and internal destinations, stable painted thumbnails
during page edits, and local English/Spanish OCR. Covers are not secure redaction.

## Qualification boundaries

Automated editing, native saves, lifecycle, package integrity and delivery checks
PASS. Actual file pickers, screen readers, touch, capture/recording permissions,
representative physical devices, publisher signing and notarization remain
NOT_RUN. The security checks are scoped evidence, not a complete security audit;
school deployment still requires institution-specific review.

Decision: CONDITIONAL for unsigned evaluation candidates. Do not publish stable
releases or set physical-approval flags without evidence from `docs/SIGNING.md`
and `docs/VALIDATION.md`. Never promote a candidate merely by dropping its suffix.
