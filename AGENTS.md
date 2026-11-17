# SplatWorks Desktop

Before resuming development, read `SESSION_NOTES.md` for release state, verification
and remaining 1.0 requirements.

Keep desktop integration here and the browser tools in mguhlin/drawsplat. Use
scripts/sync-tools.py to import an explicit DrawSplat checkout; review and commit
the resulting snapshot and manifest. Do not download application code at runtime.

Keep native capabilities in the shared shell and registered tools in tools.json.
Preserve CipherSplat formats and all upstream license and dependency notices.
Never persist passwords, document contents, or recovery copies automatically.

For solution changes, run appropriate checks, commit, push, and publish without
routine publication confirmation. Verify published downloads. Do not claim a
platform was tested on physical hardware unless it was. Keep public material free
of maintenance timestamps and dated status labels.
