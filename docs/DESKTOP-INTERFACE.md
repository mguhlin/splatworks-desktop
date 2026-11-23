# Desktop interface contract

The combined desktop app uses GridSplat's palette: white `#ffffff`, pale lavender
`#faf7ff`, purple `#7c3aed`, deep purple `#5b21b6`, orange `#faa634`, and ink
`#1f2937`. Secondary text and borders follow GridSplat's existing tokens. Use its
Inter/system font stack, clear orange focus rings and consistent form controls.

Office apps keep their own layouts, menus, icons and editing controls. Tool apps
share AudioSplat's DrawSplat™ Tools label and segmented rainbow band, while keeping
their own app names, icons, toolbars and controls. Theme only application chrome;
never recolor documents, spreadsheet cells, slides, PDF content, image canvases,
video previews or user-selected colors. Native styling stays in `frontend/desktop/`
and does not change the browser editions.

Recording setup must show a native device-consent prompt where the webview lacks
one. Denial stays recoverable: explain the action, offer retry, and allow choosing
a recording mode without requiring both a camera and microphone first. Synthetic
media-device tests establish the webview path, not physical-device qualification.
