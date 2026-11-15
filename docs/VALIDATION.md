# Physical-device release validation

Automated native tests run on Linux, Windows, and macOS build runners. They use
synthetic files and bypass native destination dialogs. Installer tests cover
Linux package installation/removal, Windows setup/upgrade/uninstall, and Mac
archive signatures, disk-image structure, and universal architectures. This
document records the remaining human validation; passing CI does not complete it.

Linux has a positive user report for the preview. Recheck the release candidate's
new safeguards and actual dialogs before final approval. Windows user testing and
Mac testing remain pending. Credentials and signed-distribution validation remain
pending on Windows and Mac.

| Target | Required validation |
| --- | --- |
| Debian 13 / Ubuntu 24.04 or newer, x86-64 | Install using the package manager; use actual file/folder pickers, overwrite and cancel; verify menus, desktop integration, keyboard navigation and a screen reader. |
| Windows 11, x86-64 | Check publisher identity; install, launch, upgrade and uninstall as a normal user; use actual file/folder pickers, paths with spaces/non-Latin names, cancellation and overwrite. Validate setup on a machine missing WebView2 and while disconnected. |
| macOS 14 or newer, Intel and Apple silicon | Check Gatekeeper/notarization from a browser-downloaded DMG; drag the app to Applications, launch and upgrade; test actual pickers, keyboard navigation and VoiceOver on both architectures. |

On each target, edit and save a representative classroom PDF, reopen it in an
independent PDF viewer, try English and Spanish OCR, encrypt and decrypt a file
and folder, and compare restored contents with the originals. Try wrong passwords,
closing with unsaved work, closing during a save, read-only destinations, and low
disk space. Disconnect networking and repeat the ordinary editing/OCR/encryption
workflow. The result must remain usable without a development toolchain.

Live camera and screen capture are intentionally outside the desktop 1.0 feature
contract. Importing existing photos is supported. Physical validation must not
turn an untested capture capability into a support claim.

Record the tested release tag, OS version, architecture, result, and any issues
without maintenance timestamps. Approve `PHYSICAL_VALIDATION_APPROVED` only when
the applicable checks pass. An issue found during validation can require another
release candidate.
