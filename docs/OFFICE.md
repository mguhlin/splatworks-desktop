# Office apps in SplatWorks Desktop

The combined app includes six office editors alongside PDF, encryption, image and
media tools. The office editors reuse the committed browser engines; Go supplies the native window, connection gate and destination dialogs.
`frontend/source-manifest.json` identifies the browser revision and bundled hashes.

| Task | Support | Desktop behavior |
| --- | --- | --- |
| Edit office documents locally | SUPPORTED | Six bundled engines, fonts and import/export resources; no runtime checkout or CDN is needed for bundled features. |
| Save and reopen editable work | SUPPORTED | Existing List/Write/Show/Grid/Plan JSON and LayoutSplat ZIP formats, with native destination pickers. Browser editions accept these files. |
| Save spreadsheet charts | DEGRADED | Project files preserve sheet data, formulas and cell formatting. Export charts and picture graphs as images to preserve their appearance. |
| Cancel or fail a save | SUPPORTED | Work remains open and unsaved. A completed earlier save does not clear newer edits. |
| Replace a document or close | SUPPORTED | A dirty workspace needs an explicit decision; an import validates before replacing it and rejects late results after newer edits. Closing waits for active operations. |
| Route a file to another office app | SUPPORTED | In-memory handoff within the same window; no temporary IndexedDB transfer, disk copy or new browser tab. |
| Present ShowSplat slides | DEGRADED | Explicitly save WebDeck HTML and open it in a browser for presentation, notes and printing. No automatic presentation copy is stored. |
| Print office work | DEGRADED | Export HTML or PDF using the app, then print from a browser. Native print-dialog qualification remains open. |
| Google Drive and Calendar | UNSUPPORTED in this edition | Use the browser editions for account-based connections. Existing explicit exports work locally. |
| Automatic document recovery | UNSUPPORTED by design | Work stays in memory until an explicit save/export. Browser editions retain their own browser saving behavior. |
| Physical-device and assistive-technology qualification | UNKNOWN | Automated Chromium/WebKit and build-runner evidence does not qualify physical Windows/Mac/Linux devices or screen readers. |

The shell retains operation-scoped native save capabilities. Office adapters pass
bytes, names and workspace stamps; no arbitrary renderer file paths are accepted.
Existing per-format import limits still apply. Native image data-URL exports are
bounded to 64 MiB of encoded data. Optional online connections remain off by
default; enabling them is separate from document saving.

Synthetic checks cover local edits, native-save success/cancellation/failure,
project reopen, browser interoperability, unsaved-work decisions, late import/save
results, no persistent document drafts, and offline asset closure. Native CI must
add the platform webview, real Go writes, installer/archive and package checks.
Signing/notarization and physical-device approval remain separate release gates.
