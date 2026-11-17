# SplatWorks Desktop development handoff

The PDF/Cipher suite and all six standalone apps have been hardened toward 1.0.
The core candidate is published and its downloads are verified. The standalone
candidate is still completing its release workflow. Final stable 1.0 publication
requires publisher signing and physical-device validation; neither was supplied.
The user requested that this session be wrapped up with work saved for continuation.

## Source and releases

Repository: https://github.com/mguhlin/splatworks-desktop

| Item | Source or status |
| --- | --- |
| Main development commit | `329f451` — Intel Mac runner selection and standalone candidate defaults |
| Main hardening commit | `a05a23a` — project/dialog fixes, packaging safeguards, 1.0 contract |
| Codec test correction | `c9155d5` — avoid unsafe hardware probing in headless WebKit tests |
| Core PDF/Cipher candidate | [v1.0.0-rc.8](https://github.com/mguhlin/splatworks-desktop/releases/tag/v1.0.0-rc.8), source `c9155d5`; published and verified |
| Standalone candidate | `tools-v1.0.0-rc.3`, source `329f451`; inspect [release workflow](https://github.com/mguhlin/splatworks-desktop/actions/runs/44109530102) before continuing |
| Existing standalone downloads | [tools-v0.3.0-preview.1](https://github.com/mguhlin/splatworks-desktop/releases/tag/tools-v0.3.0-preview.1) remain available |

The six standalone apps are GIFsplat, CipherSplat, QRSplat, ImageSplat, AudioSplat
and VideoSplat. Each has a separate executable, icon, installer registration and
Mac bundle identity. The standalone workflow builds universal Mac packages on
`macos-15-intel`. At handoff, all three jobs were building/verifying applications.
The workflow can finish publishing after this session; inspect its actual result
before retrying, rebuilding, or claiming publication.

## Engineering completed

- Corrected the VideoSplat recorder adapter's nested React hook, which crashed
  the recorder dialog. Browser and native smoke checks now open and close it.
- Protected unsaved recordings from backdrop dismissal and kept transcript drafts
  independent of saving the editable timeline. Model changes, caption deletion,
  save cancellation and rejected dialog closure retain the appropriate warning.
- Fixed AudioSplat project reopening: a local Map shadowed the saved-state helper.
  Incoming audio is decoded independently of existing cached source IDs. Imports
  validate mixer/project state, source records and duration, and reject external
  media URLs and duplicate source IDs before replacing the workspace.
- Captured unblurred AudioSplat project names on keyboard save. Native VideoSplat
  commands now synchronize with visible React state, avoiding stale/empty saves
  immediately after import. Embedded video media checksums are validated before
  committing an imported project. Project imports participate in close protection.
- Kept media workspaces and transcript checkpoints in memory. Portable projects,
  exports and their source media are written only through explicit saves.
- Excluded unrelated AudioSplat/VideoSplat engines from the core PDF/Cipher binary.
  Standalone staging restores an appropriate `all:frontend` Go embed directive.
- Added bounded retries for temporary Mac disk-image service contention. Permanent
  failures still stop packaging. Package verification requires all platform formats,
  including the DMG, and CI artifact uploads tolerate retrying the same job.
- Added [the 1.0 contract](docs/1.0.md) and `scripts/release-readiness.py`.

## Verification and evidence

The full local browser suite passed **92 Chromium/WebKit checks** before the
headless codec probe was revised. The corrected two-engine codec tests also passed.
The published core release's CI subsequently passed the full **92-check suite**,
all three native/platform package checks, and the five Python packaging regression
tests. The source asset checker verifies **743 hashes**.

Real timeline MP4 composition is tested in Chromium. The WebKit codec test
explicitly simulates unavailable encoding/capture APIs and checks the error path;
it does not establish real WebKit hardware codec support. Actual recording,
permissions, screen readers, codec availability and Apple-silicon device behavior
still need physical qualification.

All seven public core artifacts and their adjacent checksum files were downloaded
and matched against SHA-256, GitHub digests and recorded sizes. The downloaded
Linux DEB was extracted and its real binary launched with `--serve`; identity,
registered tools, bundled scripts, CSP and unrelated-media exclusions passed.

Local evidence remains in ignored `output/`:

- `1.0-browser-tests.log` and `1.0-codec-tests.log`
- `1.0-public/v1.0.0-rc.8/verification.json` and `runtime-verification.json`
- `1.0-core-public.log` and `1.0-readiness.json`
- `verify-1.0-public.py` and `check-1.0-runtime.py`, helpers for the remaining
  public-download and extracted-runtime checks

These ignored helpers/evidence are available in this workspace, not a fresh clone.

## Resume here

1. Inspect standalone run `44109530102`. If successful, confirm the
   [standalone candidate release](https://github.com/mguhlin/splatworks-desktop/releases/tag/tools-v1.0.0-rc.3)
   is public and contains 84 files: 42 distribution artifacts and 42 checksums.
2. In this workspace, complete independent public verification:

   ```sh
   python3 output/verify-1.0-public.py tools-v1.0.0-rc.3 --expected 42
   python3 output/check-1.0-runtime.py output/1.0-public/tools-v1.0.0-rc.3
   ```

   With a fresh clone, download the release with `gh release download` into a clean
   directory and use `python3 scripts/verify-packages.py <directory>`. Confirm the
   full expected artifact set and exercise the extracted Linux apps with `--serve`.
3. If a job failed, inspect its logs and annotations before retrying. Do not move
   published tags or relabel a candidate as stable. Earlier unpublished candidate
   workflows were superseded; they are not the current release targets.
4. Run `python3 scripts/release-readiness.py`. Configure signing secrets directly
   in GitHub following [SIGNING.md](docs/SIGNING.md), never in chat or source.
   Obtain the results required by [VALIDATION.md](docs/VALIDATION.md), then run
   signed candidates before considering stable `v1.0.0` / `tools-v1.0.0` tags.

## Release constraints and development boundaries

No signing secrets, signing identity variables, or physical-approval variables were
configured. An asynchronous request for hardware results and signing configuration
was sent; no answer had arrived. Do not set approval flags or claim hardware tests
on the user's behalf. Passing automation does not establish publisher trust.

Mac ARM runner capacity caused the superseded standalone candidate job to expire
without running. The explicit Intel runner avoids that pool while preserving
universal binaries. A prior Mac disk-image `Resource busy` failure motivated the
new retry helper. Source and tests were not weakened to bypass these conditions.

Browser tool changes belong upstream in `mguhlin/drawsplat`; desktop adapters,
registries, installers and native capabilities belong here. The sibling browser
checkout was not edited. The media importer uses isolated temporary source copies
and commits adapted source, production bundles, notices and hashes. Native release
builds consume that committed snapshot without requiring a browser checkout.

The local filesystem presents files as executable and lacks symlink support;
repo-local `core.filemode=false` suppresses permission-only noise. Media import
staging uses `/tmp`. Keep public material, generated output and project notes free
of maintenance timestamps. Preserve third-party notices and functional file dates.
