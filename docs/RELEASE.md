SplatWorks Desktop release candidate: PDFsplat and CipherSplat for Linux, Windows,
and Mac. This candidate completes the automated engineering and packaging work;
developer signing credentials and physical-device release validation remain.

- Warn before closing unsaved work or replacing an edited PDF; block closing during processing and saving.
- Wait for native writes before reporting success. Cancellation and failure preserve unsaved work, including newer edits made while an earlier save is pending.
- Add a Windows per-user setup executable with shortcuts, uninstall registration, upgrade support, and Microsoft's included offline WebView2 runtime installer.
- Preserve user-created files during Windows uninstall; restore encrypted folders into new directories.
- Restrict restoration using Go's rooted filesystem API, keep bounded native write capabilities, and disable PDF.js JavaScript evaluation.
- Exercise PDF editing/export, English/Spanish OCR, CS4 file encryption, Unicode text vaults, wrong-password/tamper rejection, and OpenPGP public/private-key round trips.
- Prepare signing for Windows applications/installers/uninstallers and Mac hardened runtime, signing, notarization, and stapling. Stable releases fail without credentials and physical validation approval.

Download the package matching your platform and its `.sha256` file. Windows users
can choose `-setup.exe` or the portable ZIP. Linux users can choose a `.deb` or
portable archive. Mac users can choose a universal DMG or ZIP for Intel and Apple
silicon.

This candidate has **no verified Windows publisher signature or Apple Developer
ID/notarization**. Publisher warnings remain expected. Mac candidates use ad hoc
hardened-runtime signing for automated compatibility checks. Credentials must be
configured and signed downloads validated before a full release.

Automated checks cover all three build platforms, Windows install/upgrade/
uninstall, Linux install/removal, Mac disk-image/archive integrity, and Linux
editing/OCR/encryption without networking. Actual file pickers, screen readers,
Gatekeeper/SmartScreen behavior, offline Windows installation without a preexisting
runtime, and representative physical hardware remain human validation work.

Live camera and screen capture are outside the desktop 1.0 feature contract; use
the browser edition for those workflows. Existing-photo scanning is included.
PDF visual covers are not secure redaction. Existing document memory and
conversion limits still apply.

See `docs/SIGNING.md`, `docs/VALIDATION.md`, and `SECURITY.md` in the source
repository. Notices and installation instructions are included in the archives;
corresponding source is available in the repository and source archives.
