#!/usr/bin/env python3
"""Check bundled hashes, required engines, and local HTML dependency paths."""
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import urlparse, unquote

root=Path(__file__).resolve().parents[1]
web=root/'frontend'
manifest=json.loads((web/'source-manifest.json').read_text())
errors=[]
for name,expected in manifest['files'].items():
    file=web/name
    if not file.is_file() or hashlib.sha256(file.read_bytes()).hexdigest()!=expected:
        errors.append('Snapshot mismatch: '+name)
class Assets(HTMLParser):
    def __init__(self,file): super().__init__(); self.file=file
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        value=attrs.get('src') if tag in ['script','img','iframe'] else attrs.get('href') if tag=='link' else None
        if not value or value.startswith(('data:','blob:','#')): return
        url=urlparse(value)
        if url.scheme or url.netloc:
            errors.append('Remote runtime asset: '+value); return
        target=web/unquote(url.path.lstrip('/')) if value.startswith('/') else self.file.parent/unquote(url.path)
        if not target.exists(): errors.append(f'Missing HTML asset in {self.file.relative_to(web)}: {value}')
for rel in ['index.html','solutions/pdfsplat/index.html','solutions/CipherSplat/index.html']:
    parser=Assets(web/rel);parser.feed((web/rel).read_text())
for rel in ['vendor/pdf.worker.min.js','solutions/pdfsplat/vendor/ocr/eng.traineddata','solutions/pdfsplat/vendor/ocr/spa.traineddata','desktop/native-smoke.js']:
    if not (web/rel).is_file(): errors.append('Missing engine: '+rel)
# Maintenance labels must not return through desktop templates or packaging.
pattern=re.compile(r'\b(?:last updated|last modified|generated on|checked on|reviewed on)\s*:?',re.I)
for folder in ['desktop']:
    for file in (web/folder).rglob('*'):
        if file.suffix in ['.html','.js','.css'] and pattern.search(file.read_text()): errors.append('Maintenance timestamp label: '+str(file.relative_to(root)))
if errors: raise SystemExit('\n'.join(errors))
print(f'Verified {len(manifest["files"])} snapshot hashes and all HTML runtime assets.')
