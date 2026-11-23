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

Exercise shared camera, screen-capture and video workflows where the system
webview exposes the required APIs. Confirm permission prompts and clear recovery
when a device/API is unavailable. Importing existing photos remains supported.
Check first-launch Fast photo removal without networking, optional model downloads,
turning connections off during a download, FontSplat insertion, and project
interchange with the browser tools. Do not treat automated builds as device approval.

Record the tested release tag, OS version, architecture, result, and any issues
without maintenance timestamps. Approve `PHYSICAL_VALIDATION_APPROVED` only when
the applicable checks pass. An issue found during validation can require another
release candidate.

For AudioSplat, import representative WAV/MP3 sources, edit multiple tracks, apply
an effect, undo it, record from an actual microphone, and export WAV/MP3. Listen
in an independent player and reopen the portable project with networking off.
For VideoSplat, combine video, audio, still images, titles and captions; check
trimming, playback synchronization and a short exported video in another player.
Reopen a portable project on another machine and confirm its embedded media is
present. Test native save cancellation and edits made while a destination dialog
is open. Check that closing an unsaved recording or transcript warns independently
of saving the timeline. Verify optional model-download refusal when connections
are off and local GGML transcription without networking.

For the combined suite, start on Home and check all fourteen choices with a keyboard and screen reader. Return Home with unsaved work and verify that reopening an app retains it. In MediaSplat, trim, split and join representative files, save individual outputs and ZIPs, cancel or fail a save and retry, then generate and review captions with a locally available speech model. Verify close warnings for unsaved outputs and transcripts.
