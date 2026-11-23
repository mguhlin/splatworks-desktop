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
manifest=json.loads((web/'source-manifest.json').read_text(encoding='utf-8'))
errors=[]
manifests=[manifest,json.loads((web/'core-assets-manifest.json').read_text(encoding='utf-8')),json.loads((web/'standalone-manifest.json').read_text(encoding='utf-8')),json.loads((web/'media-manifest.json').read_text(encoding='utf-8'))]
for name,expected in [(k,v) for m in manifests for k,v in m['files'].items()]:
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
for tool in json.loads((root/'tools.json').read_text()):
    if not (web/tool['source']/'index.html').is_file(): errors.append('Missing registered app: '+tool['id'])
    if not (web/tool['icon']).is_file(): errors.append('Missing app icon: '+tool['id'])
office=[tool['source']+'/index.html' for tool in json.loads((root/'tools.json').read_text()) if tool['source'].startswith('splatworks/')]
for rel in office+['index.html','solutions/pdfsplat/index.html','solutions/CipherSplat/index.html','solutions/gifsplat/index.html','solutions/qrsplat/index.html','solutions/imagesplat/index.html','solutions/audiosplat/index.html','solutions/videosplat/index.html','solutions/mediasplat/index.html']:
    parser=Assets(web/rel);parser.feed((web/rel).read_text(encoding='utf-8'))
for rel in ['vendor/pdf.worker.min.js','solutions/pdfsplat/vendor/ocr/eng.traineddata','solutions/pdfsplat/vendor/ocr/spa.traineddata','desktop/native-smoke.js','desktop/theme.js','desktop/theme.css']:
    if not (web/rel).is_file(): errors.append('Missing engine: '+rel)
for file in (web/'solutions/pdfsplat/src').glob('*.js'):
    text=file.read_text(encoding='utf-8')
    if file.name=='webdeck-runtime.js':continue
    for match in re.finditer(r'\.getDocument\(\{',text):
        if not text[match.end():].startswith('isEvalSupported:false,'):errors.append('PDF.js evaluation mitigation missing: '+str(file.relative_to(web)))
# Maintenance labels must not return through desktop templates or packaging.
pattern=re.compile(r'\b(?:last updated|last modified|generated on|checked on|reviewed on)\s*:?',re.I)
for folder in ['desktop']:
    for file in (web/folder).rglob('*'):
        if file.suffix in ['.html','.js','.css'] and pattern.search(file.read_text(encoding='utf-8')): errors.append('Maintenance timestamp label: '+str(file.relative_to(root)))
ai=root/'ai-runtime/vendor'
for name,record in json.loads((ai/'checksums.json').read_text()).items():
    if not (ai/name).is_file() or hashlib.sha256((ai/name).read_bytes()).hexdigest()!=record['sha256']:errors.append('AI runtime mismatch: '+name)
if errors: raise SystemExit('\n'.join(errors))
print(f'Verified {sum(len(m["files"]) for m in manifests)} snapshot hashes and all HTML runtime assets.')
