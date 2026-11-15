SplatWorks Desktop: PDFsplat and CipherSplat for Linux, Windows, and Mac.
Automated engineering and packaging checks cover the supported build platforms.
Stable release tags require developer signing and physical-device approval.

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

Unsigned candidates have **no verified Windows publisher signature or Apple
Developer ID/notarization** and can show publisher warnings. Mac unsigned
candidates use ad hoc hardened-runtime signing for automated compatibility
checks. Signed candidate workflows use configured developer identities; stable
workflows require signing and human validation approval. Verify the downloaded
file signature and use the release tag to identify the intended build.

Automated checks cover all three build platforms, Windows install/upgrade/
uninstall, Linux install/removal, Mac disk-image/archive integrity, and Linux
editing/OCR/encryption without networking. Actual file pickers, screen readers,
Gatekeeper/SmartScreen behavior, offline Windows installation without a preexisting
runtime, and representative physical hardware require human validation before
stable approval.

Live camera and screen capture are outside the desktop 1.0 feature contract; use
the browser edition for those workflows. Existing-photo scanning is included.
PDF visual covers are not secure redaction. Existing document memory and
conversion limits still apply.

See `docs/SIGNING.md`, `docs/VALIDATION.md`, and `SECURITY.md` in the source
repository. Notices and installation instructions are included in the archives;
corresponding source is available in the repository and source archives.

Debian packages use prerelease ordering that upgrades cleanly to a stable version. An epoch preserves upgrade compatibility with earlier desktop release candidates. The shared shell also supports separately installable GIFsplat, CipherSplat, QRSplat and ImageSplat previews; these are distributed in the standalone-tools release.

This candidate adds a default-off, revocable online-services setting and retains
strict webview connection rules. Standalone tools share browser editing/project
code; ImageSplat includes its default AI model and runtime for first-launch
offline photo removal. See the paired standalone release for these apps.
