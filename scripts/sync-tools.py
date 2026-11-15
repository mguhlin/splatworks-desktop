#!/usr/bin/env python3
"""Import an explicit DrawSplat checkout; no remote code is fetched by the app."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path, help='local DrawSplat repository')
args = parser.parse_args()
source = args.source.resolve()
dest = ROOT / 'frontend'
registry = json.loads((ROOT / 'tools.json').read_text(encoding='utf-8'))
ignored = shutil.ignore_patterns('node_modules', 'downloads', 'test-results', 'playwright-report', '.DS_Store', '*.zip', 'integrity.json')

def copy_file(rel):
    target = dest / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source / rel, target)

for tool in registry:
    rel = tool['source']
    shutil.rmtree(dest / rel, ignore_errors=True)
    shutil.copytree(source / rel, dest / rel, ignore=ignored)

for name in ['pdf.min.js', 'pdf.worker.min.js', 'jszip.min.js']:
    copy_file('vendor/' + name)
for name in ['google-drive.js', 'google-drive-auth.js', 'LICENSE.txt']:
    copy_file('splatworks/shared/' + name)
copy_file('scripts/build-pdfsplat.mjs')
for name in ['app-language.js', 'pdf-ui-strings.js', 'pdf-language-loader.js', 'action-cards.js']:
    copy_file('assets/js/' + name)
for name in ['app-language.css', 'action-cards.css', 'action-icons.css']:
    copy_file('assets/css/' + name)
for name in ['actions', 'tools']:
    target = dest / 'assets/icons' / name
    shutil.rmtree(target, ignore_errors=True)
    shutil.copytree(source / 'assets/icons' / name, target)
for name in ['LICENSE', 'NOTICE.md']:
    copy_file(name)
    shutil.copy2(source / name, ROOT / name)
for name in ['pdfsplat-save-as.md', 'pdfsplat-ocr.md', 'pdfsplat-odt-toolbar.md']:
    copy_file('docs/' + name)

for tool in registry:
    page = dest / tool['source'] / 'index.html'
    text = page.read_text(encoding='utf-8')
    text = re.sub(r'<!-- splat-privacy:start -->.*?<!-- splat-privacy:end -->', '', text)
    text = re.sub(r'\s*<meta http-equiv="Content-Security-Policy"[^>]*>', '', text)
    # These files are adapted below. Integrity is verified for the complete
    # desktop snapshot by the manifest instead of stale upstream SRI values.
    text = re.sub(r' integrity="[^"]*"', '', text)
    text = text.replace('</head>', '<link rel="stylesheet" href="/desktop/frame.css"><script src="/desktop/frame.js"></script></head>')
    text = re.sub(r'<link rel="stylesheet" href="../../assets/css/(?:tool-launcher|launcher-trigger)\.css[^\"]*">', '', text)
    text = re.sub(r'<a class="offline-download"[^>]*>.*?</a>', '', text)
    page.write_text(text, encoding='utf-8')

boot = dest / 'solutions/pdfsplat/src/boot.js'
text = boot.read_text(encoding='utf-8').replace("void load('../../assets/js/tool-launcher.js?v=2', true).catch(console.error);", '/* Desktop shell supplies the installed tool switcher. */')
boot.write_text(text, encoding='utf-8')

cipher = dest / 'solutions/CipherSplat/app.js'
text = cipher.read_text(encoding='utf-8')
old = 'async function downloadResult(){if(resultFiles.length){'
assert text.count(old) == 1, 'Upstream folder download changed; review the adapter.'
text = text.replace(old, 'async function downloadResult(){if(resultFiles.length&&window.SplatDesktop?.native){try{await window.SplatDesktop.saveFolder(resultFiles)}catch(error){els.error.textContent=error.message}return}if(resultFiles.length){')
cipher.write_text(text, encoding='utf-8')

# Export docs are kept as source material. The shell supplies a short offline
# help page instead of navigating away from an open document.
(dest / 'tools.json').write_text(json.dumps(registry, indent=2) + '\n', encoding='utf-8')
revision = subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip()
files = {}
for file in sorted(dest.rglob('*')):
    if file.is_file() and file.relative_to(dest).parts[0] not in ['desktop'] and file.name not in ['index.html', 'source-manifest.json']:
        files[file.relative_to(dest).as_posix()] = hashlib.sha256(file.read_bytes()).hexdigest()
# Include adapted tool entry pages too, excluding only the shell entry page.
for tool in registry:
    name = tool['source'] + '/index.html'
    files[name] = hashlib.sha256((dest/name).read_bytes()).hexdigest()
manifest = {'repository':'https://github.com/mguhlin/drawsplat', 'revision':revision, 'tools':[t['id'] for t in registry], 'files':dict(sorted(files.items()))}
(dest/'source-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
shutil.copy2(source/'solutions/pdfsplat/pdfsplat.png', ROOT/'build/appicon.png')
print(f'Imported {len(registry)} tools from DrawSplat {revision[:12]} ({len(files)} bundled files).')
