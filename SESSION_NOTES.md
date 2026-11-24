# SplatWorks Desktop development handoff

The fourteen-app suite is published as `v1.0.0-rc.19`, source `0af1ab4`.
The six smaller standalone packages remain `tools-v1.0.0-rc.5`, source `ef4bf55`.
Stable publisher signing and physical-device qualification remain open.

## Published candidates

| Distribution | Release | Verified workflow |
| --- | --- | --- |
| Fourteen-app suite | [v1.0.0-rc.19](https://github.com/mguhlin/splatworks-desktop/releases/tag/v1.0.0-rc.19) | [Release checks and delivery](https://github.com/mguhlin/splatworks-desktop/actions/runs/45290400624) |
| Six standalone apps | [tools-v1.0.0-rc.5](https://github.com/mguhlin/splatworks-desktop/releases/tag/tools-v1.0.0-rc.5) | [Release checks and delivery](https://github.com/mguhlin/splatworks-desktop/actions/runs/45225214790) |

Home starts without loading an editor. All fourteen app choices surround the
central SplatWorks logo; a compact grid fits small screens. Home and app switching
retain mounted workspaces, unsaved state and active operations. Deep links can
open a specific tool. Single-app profiles still open their own editor directly.

The suite includes ListSplat, GridSplat, WriteSplat, ShowSplat, LayoutSplat,
PlanSplat, PDFsplat, CipherSplat, GIFsplat, QRSplat, ImageSplat, AudioSplat,
VideoSplat and MediaSplat. Office apps share GridSplat's palette. Tools share
AudioSplat's DrawSplat™ Tools header and rainbow band. App controls, layouts,
icons, document colors and the WriteSplat theme switch remain intact. Styling
lives in `frontend/desktop/theme.{css,js}` and activates only for the combined
suite. Browser app code and published standalone packages are unchanged.

VideoSplat can choose a recording mode before optional device setup. Denial has
clear retry/system-settings guidance. Linux has a native, deny-by-default
camera/microphone consent handler restricted to `wails://wails/`; device labels
remain unavailable until consent. Synthetic policy controls refuse production
calls. Capture and cropping prefer WebM where available and fall back to MP4,
with matching filenames. Avoid forcing a low H.264 level: it rejects normal
720p camera output. Debian packages declare all four GStreamer plugin sets
(good, bad, ugly and libav). Portable users need these system dependencies.

CipherSplat keeps its name and existing formats. Its native workspace is inert
until all input handlers load. This fixes an early-typing race between app.js and
browser.js that could leave the action button disabled. A delayed-script test
proves focus is blocked until initialization, then text input enables encryption.

ImageSplat bundles the pinned Fast model and runtime. MediaSplat has native
output/ZIP saves, independent output drafts, replacement/close warnings and
retryable saves. Snapshot tracking preserves newer settings and subtitle files.
Inputs are limited to 256 MiB and outputs to 512 MiB. Audio/Video retain portable
project saves. Speech models are optional explicit downloads or local files;
online connections default off. No automatic document, credential or recovery
persistence is allowed.

## Source ownership and rebuilds

Browser apps live in the sibling `drawsplat_github` repository. Keep adapters here.
The registry and bundled `frontend/tools.json` must stay identical with unique IDs.

- `scripts/sync-tools.py` imports committed office/PDF/Cipher inputs, retaining
  ownership separately from small/media apps. Office snapshot: `ccaad8a`.
- `scripts/sync-small-tools.py` imports GIF/QR/Image and embedded helpers.
- `scripts/sync-media-tools.py` builds Audio/Video/Media in isolation from the
  explicit browser checkout; `adapt-media-tools.mjs`, `adapt-mediasplat.mjs` and
  `scripts/media/` apply native boundaries. Media snapshot: `01ffa8b`.
- `scripts/prepare-core-assets.py` verifies the pinned AI model and bundles its
  runtime, licenses and `core-assets-manifest.json`. Never fetch app code at runtime.
- `scripts/check-assets.py` checks all four manifests, 1791 hashes, local engines,
  entry points and icons. Import committed files only; ignored developer caches
  previously caused an integrity failure before publication.

Office project saving/reopening, in-memory handoffs, native chart/image exports
and Help remain qualified. Grid projects preserve sheet data, formulas and
formatting; save chart appearance as an image. ShowSplat explicitly saves WebDeck
HTML for browser presentation. Print exported HTML/PDF in a browser; cloud-account
workflows use browser editions. See `docs/OFFICE.md`.

## Evidence

- All 188 Chromium/WebKit checks passed locally and in the tagged workflow.
  Forty repeated CipherSplat startup/lifecycle cases also passed. Startup tests
  wait for initialized handlers before entering synthetic data.
- Linux passed 163 native checks, including denied permission, retry, capture
  through VideoSplat's actual recording function, decoding the recorded video,
  and saving through Go. Windows and Mac each passed 157 native checks. Linux
  execution ran with networking disabled; the installed Debian app also passed.
- A Debian host and isolated Ubuntu 24.04 runtime independently passed native
  synthetic-device checks. Ubuntu's offline MP4 independently verified as H.264
  video at 1280×720 with AAC audio. Use normal 30 fps for three seconds in this
  test; very short 5 fps clips do not reliably flush the MP4 encoder.
- Windows install/upgrade/uninstall, Linux install/removal and Mac archive/DMG
  integrity and universal-architecture checks passed. Mac execution used Intel
  runners; Apple-silicon physical qualification remains open.
- Go policy/transfer race tests, vulnerability scanning, five Python packaging
  tests and all snapshot/engine hashes passed in CI.
- All fourteen release files were downloaded publicly and match GitHub sizes,
  digests and SHA-256 sidecars. All seven payload hashes also match checksum
  records read from the qualified CI artifacts.
- The publicly downloaded Linux binary served the production security policy
  and passed another 118 Chromium/WebKit interface checks. These use loopback
  browser automation; native webviews were exercised separately in CI. The
  companion source fixture must have an open log destination: an orphaned
  Python server with closed stdout caused six initial browser-reopen failures;
  restarting it produced a clean 118-case pass.
- Standalones retain their earlier qualification: 84 public files verified,
  with all native/platform checks passing.

Release receipts are under `output/native-proof/rc19/`,
`output/pre-release/rc19-*-checksums/` and
`output/public/v1.0.0-rc.19-verified.json`. Additional native reproduction receipts
are in `output/ubuntu-normal-fps/` and
`output/native-recording-verified-proof/`. The host uses isolated headers and
runtime libraries under `output/toolchain/` via `/tmp/splat-native-env.sh`.
Set TMPDIR and GOTMPDIR to `output/toolchain/go-tmp` because host /tmp is nearly
full. No host development packages were installed.

Earlier rc.16–rc.18 candidates were not published. Preserve their tags/history.
Linux setup downloads were slow on the hosted EC2 mirror; optional package
recommendations also pulled an unused speech model. The build helper installs
required codecs and xauth explicitly without recommendations. Its follow-up
mirror handling covers both source lists and `/etc/apt/apt-mirrors*.txt` files.
Failed native runs retain readable diagnostics; installed-app tests restore
output ownership on exit. Do not weaken release gates to bypass setup delays.

## Website and user guidance

The catalogue and short guide are in `data/desktop-apps.json` and
`docs/desktop-apps.md` in the sibling checkout, published in source `c90f063`.
Both explain the fourteen-app suite and further desktop work. The guide identifies
combined-desktop styling and recording setup explicitly. All 153 website checks
passed in CI, plus 15 live Chromium/Firefox/WebKit navigation checks. Clean and
.html download/wiki routes serve the expected content and links without
maintenance timestamps. School privacy/agreement resources remain at
https://splatworks.org/schools/ . Preserve that checkout's unrelated untracked
`pages/audit_instructions.md`.

## Compatibility and qualification boundaries

CipherSplat retains CS4/legacy compatibility, CipherEnc-derived automatic input
detection, local OpenPGP key import/fingerprints, compressed and verified saves,
empty-directory restoration and static Help. Cancelled/failed results remain
retryable; mode changes and replacement protect unsaved work. PDFsplat retains
editable web/file links and internal destinations, stable painted thumbnails
during page edits and local English/Spanish OCR. Covers are not secure redaction.

Automated editing, native saves, lifecycle, synthetic Linux recording, package
integrity and delivery checks PASS. Actual file pickers, interactive OS/native
consent dialogs, screen readers, touch, physical cameras/microphones, screen
sharing and representative physical devices remain NOT_RUN. Publisher signing
and notarization remain open. These checks are scoped evidence rather than a
complete security audit; schools still require institution-specific review.

Decision: CONDITIONAL for unsigned evaluation candidates. Do not publish stable
releases or set physical-approval flags without evidence from `docs/SIGNING.md`
and `docs/VALIDATION.md`. Never promote a candidate by dropping its suffix.
