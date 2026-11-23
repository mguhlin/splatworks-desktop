SplatWorks Desktop now brings eight apps together for Windows, Mac, and Linux:
**ListSplat, GridSplat, WriteSplat, ShowSplat, LayoutSplat, PlanSplat, PDFsplat,
and CipherSplat.** Choose an app from the Apps menu; switching keeps workspaces open.

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

Live camera and screen capture use the browser editions. Existing-photo scanning
is included. Existing document memory and format-conversion limits still apply.
Optional online connections remain off by default and can be revoked in Settings.

The six smaller standalone tools remain available in the separate tools release.
Source, component notices and qualification details:
https://github.com/mguhlin/splatworks-desktop (docs/OFFICE.md, docs/SIGNING.md,
docs/VALIDATION.md, THIRD-PARTY-NOTICES.md).
