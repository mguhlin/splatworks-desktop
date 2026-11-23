This preview fixes VideoSplat recording permissions in the combined desktop app
and gives its fourteen apps a consistent interface.

- Recording and cropping use MP4 when the system webview supports it instead of WebM, with matching file names.
- Linux packages install the GStreamer recording plugins required by WebKit.
- Linux camera/microphone requests now receive a native consent dialog instead of being silently denied. Device information remains unavailable until consent is granted.
- VideoSplat can open the recorder before optional device setup, so choosing a recording mode does not require a camera and microphone together. Denied access has clear retry and system-settings guidance.
- CipherSplat waits for its input handlers before accepting typing, preventing a startup race that could leave the action button disabled.
- Office apps share GridSplat's purple, orange, white and lavender palette. Tool apps share AudioSplat's DrawSplat™ Tools label and rainbow band. Each app retains its controls, icons, layouts and document colors.
- Native Linux checks exercise denied access, retry, synthetic camera/microphone capture, actual video encoding and saving. Physical devices, OS privacy settings and screen-sharing support still require platform qualification.

SplatWorks Desktop now brings fourteen apps together for Windows, Mac, and Linux:
**ListSplat, GridSplat, WriteSplat, ShowSplat, LayoutSplat, PlanSplat, PDFsplat,
CipherSplat, GIFsplat, QRSplat, ImageSplat, AudioSplat, VideoSplat, and MediaSplat.**

Home opens with the SplatWorks logo in the middle and the app choices around it. A compact grid fits small screens. Return Home or switch apps without closing workspaces.

- Create GIFs and QR codes, edit images, and remove photo backgrounds with the bundled Fast model.
- Edit audio and layered video with portable project saves and local exports.
- Use MediaSplat to trim, split, join, transcribe, and burn subtitles. Native saves retain outputs after cancellation or failure. MediaSplat accepts up to 256 MiB of source media and 512 MiB of outputs.
- Download speech models explicitly through Settings-enabled connections before using them offline.

- Save editable office work through native destination dialogs using the existing portable project formats. Browser editions can reopen those files.
- Preserve unsaved work after cancelled/failed saves, reject stale imports after newer edits, and warn before replacing work or closing. Unfinished planner forms also trigger the close warning.
- Keep document drafts and file handoffs in memory; no automatic recovery or presentation copies are written.
- Bundle office editors, fonts, import/export libraries, publication backgrounds, PDF/OCR engines, English/Spanish OCR models, and encryption engines.
- Save chart/picture-graph images through native dialogs. GridSplat project files preserve sheet data, formulas and formatting; save chart appearance separately as images.
- Export ShowSplat WebDeck HTML to present in a browser. Export HTML/PDF and print from a browser. Google Drive and Calendar connections use the browser editions.

CipherSplat retains its name and CS4/legacy compatibility, including its recent
CipherEnc usability improvements, compressed/verified encryption, local OpenPGP
key import, safe folder restoration, and Help that preserves work. PDFsplat retains
editable PDF links, painted thumbnails during page edits, and local OCR. PDF
visual covers are not secure redaction; OCR and conversion require review.

Choose the package for your platform:

- **Windows:** per-user setup executable with shortcuts, uninstall support, and Microsoft's full offline WebView2 installer; portable ZIP requires an existing WebView2 runtime.
- **Mac:** universal DMG or ZIP for Intel and Apple silicon.
- **Linux:** Debian package or portable archive; requires GTK3/WebKitGTK 4.1.

Adjacent SHA-256 files verify download integrity. Unsigned candidates have **no
verified Windows publisher signature or Apple Developer ID/notarization**. Mac
candidates use ad hoc hardened-runtime signing for automated compatibility.
Stable publisher signing and physical-device qualification remain required.

Release gates exercise real platform webviews and Go writes, office project
save/reopen, PDF/OCR/encryption, Linux execution without networking, Windows
install/upgrade/uninstall, Linux install/removal, Mac archive/disk-image integrity,
and package checksums. These are build-runner checks. Actual file pickers,
screen readers, Gatekeeper/SmartScreen behavior, offline Windows installation
without an existing runtime, and representative physical devices still require
human qualification before stable approval.

Camera and microphone recording depend on system privacy permissions and webview
support. Use the browser edition when a required screen-sharing mode is unavailable.
Existing-photo scanning is included. Existing document memory and format-conversion
limits still apply.
Optional online connections remain off by default and can be revoked in Settings.

The six smaller standalone tools remain available in the separate tools release.
Source, component notices and qualification details:
https://github.com/mguhlin/splatworks-desktop (docs/OFFICE.md, docs/SIGNING.md,
docs/VALIDATION.md, THIRD-PARTY-NOTICES.md).
