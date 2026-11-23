# Desktop security boundaries

Documents, passwords, private keys, and recovery content are not persisted to
native preferences or automatically sent to a server. CipherSplat save bookkeeping uses change counters
instead of copies of plaintext, so clearing the workspace leaves no saved-state
copy of its text. Explicit saves use destinations chosen by native dialogs. The
application does not overwrite an original until staged output has
been successfully written and synchronized. Folder restoration creates a new
directory and rejects traversal, absolute paths, device names, duplicate files,
and conflicting paths. Go's rooted filesystem API prevents restoration writes
from following symlinks out of the private staging directory.

Native write capabilities use unpredictable tokens, bounded chunks, a limit on
unfinished sessions, cancellation, and cleanup on normal shutdown. Frontend
operations prevent ordinary closing while saving or processing. Force-killing a
process can leave partial staging output in a destination explicitly selected for
saving; the app does not claim secure deletion or protection against a compromised
device or another process running as the user.

The desktop origin blocks cross-origin connections, inline JavaScript, JavaScript
evaluation and embedded objects. Camera/screen/microphone APIs are limited to the application origin and still require platform support and user permission. Bundled
WebAssembly remains enabled for OCR and Argon2id. Explicit HTTPS links open in
the system browser. Untrusted Office/ebook imports exclude external resources and
scripts using the inherited import filters. PDF visual covers do not remove
underlying content and are not secure redaction.

The bundled classic PDF.js engine uses Mozilla's documented
[`isEvalSupported:false` mitigation for CVE-2024-4367](https://github.com/mozilla/pdf.js/security/advisories/GHSA-wgrm-67xf-hhpq)
on every desktop loading entry point. The snapshot checker rejects loaders without
that option; CSP separately prohibits JavaScript evaluation. The renderer's
existing format/size limitations remain in force. A future engine migration must
preserve these boundaries and pass the native render/export/OCR suite.

Regression coverage includes chunked binary/Unicode/empty-file saves, cancellation,
failed writes preserving originals, restored paths and symlink escapes, modified,
truncated and appended CS4 data, wrong passwords, Unicode text vaults, and OpenPGP
public/private-key round trips. Go dependencies are checked with `govulncheck` in
CI. These checks are a targeted engineering review, not independent certification
of the cryptography or application.

Report a suspected vulnerability privately through the repository's GitHub
security reporting channel where available, or the maintainer contact listed in
LICENSE. Include synthetic reproduction files; never publish sensitive documents,
keys, or passwords in a public issue.

Optional network access defaults off. Explicitly enabling it permits HTTPS
requests through a revocable native gateway with size/time limits, public-address
checks, TLS verification, and no forwarded cookies or authorization headers.
Disabling it cancels active external requests. Editable QR services receive the
destination and service key explicitly supplied for that operation; model
downloads and image-background requests do not upload the source photo. Only the
permission preference is persisted by the native shell. Bundled model and runtime
files are pinned and verified; no remote application updater executes code.


AudioSplat and VideoSplat keep project media and generated transcripts in memory.
The desktop snapshots replace browser autosave/checkpoint storage with volatile
workspaces; users explicitly save portable projects and exports through the native
writer. Playback/import still decodes untrusted media using the platform codecs
and bundled processing engines. Portable video projects validate the manifest and
all embedded media sizes before replacing the session data. Large sources and
codec limitations remain application constraints.

## Desktop media permissions

The Linux WebKitGTK adapter handles camera/microphone requests only while the
main webview uses the bundled `wails://wails/` origin. Production requests use a
native, deny-by-default dialog. Device information is released only after device
consent in that webview session. Other permission classes retain their platform
handling; remote top-level origins are denied. No device is opened at startup.
The explicit command-line smoke session uses synthetic WebKit devices and guarded
allow/deny controls. Production renderers cannot enable those test controls.
