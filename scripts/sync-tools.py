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
all_tools = json.loads((ROOT / 'tools.json').read_text(encoding='utf-8'))
registry = [t for t in all_tools if t['source'].startswith('splatworks/') or t['id'] in ['pdfsplat','ciphersplat']]
ignored = shutil.ignore_patterns('node_modules', 'downloads', 'test-results', 'playwright-report', '.DS_Store', '*.zip', 'integrity.json', 'dist', '.vite', '*.tsbuildinfo', '__pycache__', '*.pyc', '*.pyo', '.pytest_cache', '.git')

# Import committed inputs only; a developer's ignored caches are not release assets.
tracked=set(subprocess.check_output(['git','-C',str(source),'ls-files','-z'],text=True).split('\0'))
tracked_dirs={str(parent) for name in tracked if name for parent in Path(name).parents}
def ignore_local(folder,names):
    denied=set(ignored(folder,names))
    for name in names:
        rel=(Path(folder)/name).relative_to(source).as_posix()
        if rel not in tracked and rel not in tracked_dirs:denied.add(name)
    return denied

def copy_file(rel):
    if rel not in tracked:raise SystemExit('Source asset is not committed: '+rel)
    target = dest / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source / rel, target)

for tool in registry:
    rel = tool['source']
    shutil.rmtree(dest / rel, ignore_errors=True)
    shutil.copytree(source / rel, dest / rel, ignore=ignore_local)

# Office applications share importers, bundled fonts, media decoders and widgets.
for rel in ['vendor','splatworks/shared','assets/backgrounds','solutions/mediasplat/ffmpeg']:
    shutil.rmtree(dest/rel,ignore_errors=True)
    shutil.copytree(source/rel,dest/rel,ignore=ignore_local)
# Bundle the exact images offered by the publication background picker.
for item in json.loads((source/'splatworks/layoutsplat/whiteboard-catalog.json').read_text()):
    copy_file(item['path'])
for name in ['assets/smithsonian-animals/README.md','assets/coloring-book/README.md']:
    copy_file(name)
# Keep redistribution notices alongside the compiled office engines. The lockfiles
# select versions; dependency code is never downloaded by the installed app.
for app in ['gridsplat','writesplat']:
    folder=source/'splatworks'/app
    notices=dest/'splatworks'/app/'dependency-notices'
    shutil.rmtree(notices,ignore_errors=True)
    records=[]
    for rel,record in json.loads((folder/'package-lock.json').read_text())['packages'].items():
        if not rel or record.get('dev'):continue
        package=folder/rel
        files=[file for file in package.iterdir() if file.is_file() and re.match(r'(?i)^(license|licence|copying|notice)(?:[.\-_]|$)',file.name)]
        if not files:
            # Older npm releases put their notice in README and package metadata.
            files=[file for file in package.iterdir() if file.is_file() and (file.name.lower().startswith('readme') or file.name=='package.json')]
        if not files:raise SystemExit('Missing runtime notices: '+str(package))
        name=rel.removeprefix('node_modules/').replace('/node_modules/','__').replace('/','__')
        for file in files:
            target=notices/name/file.name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(file,target)
        records.append({'package':rel,'version':record.get('version'),'license':record.get('license'),'source':record.get('resolved')})
    if app=='gridsplat':shutil.copy2(ROOT/'licenses/office/Saxes-5.0.1-LICENSE',notices/'Saxes-5.0.1-LICENSE')
    (notices/'packages.json').write_text(json.dumps(records,indent=2)+'\n')
copy_file('assets/brand/SplatWorks_logo.png')
copy_file('scripts/build-pdfsplat.mjs')
for name in ['app-language.js', 'pdf-ui-strings.js', 'pdf-language-loader.js', 'action-cards.js', 'widget-i18n.js']:
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
for name in ['pdfsplat-save-as.md', 'pdfsplat-ocr.md', 'pdfsplat-odt-toolbar.md', 'pdfsplat-fillable-forms.md']:
    copy_file('docs/' + name)

pages = [dest / tool['source'] / 'index.html' for tool in registry]
pages += list((dest / 'solutions/CipherSplat').glob('*.html'))
for page in dict.fromkeys(pages):
    text = page.read_text(encoding='utf-8')
    text = re.sub(r'<!-- splat-privacy:start -->.*?<!-- splat-privacy:end -->', '', text)
    text = re.sub(r'\s*<meta http-equiv="Content-Security-Policy"[^>]*>', '', text)
    # These files are adapted below. Integrity is verified for the complete
    # desktop snapshot by the manifest instead of stale upstream SRI values.
    text = re.sub(r' integrity="[^"]*"', '', text)
    text = text.replace('</head>', '<link rel="stylesheet" href="/desktop/frame.css"><script src="/desktop/frame.js"></script></head>')
    text = re.sub(r'<link rel="stylesheet" href="../../assets/css/(?:tool-launcher|launcher-trigger)\.css[^\"]*">', '', text)
    text = re.sub(r'<script[^>]+src="[^"]*(?:tool-launcher(?:-loader)?|layoutsplat-cache-recovery)\.js[^"]*"[^>]*></script>', '', text)
    text = re.sub(r'<a class="offline-download"[^>]*>.*?</a>', '', text)
    if page.parent.name == 'CipherSplat':
        text = text.replace('· Browser version', '· Desktop workspace').replace('CipherSplat browser encryption.', 'CipherSplat desktop encryption.')
    if page.parent.name == 'CipherSplat' and page.name in ['index.html','openpgp.html']:
        help_text = (source / 'solutions/CipherSplat/help.html').read_text(encoding='utf-8')
        main = re.search(r'<main\b.*?</main>', help_text, re.S).group(0)
        main = main.replace('<h1>', '<h1 id="helpPageTitle">', 1)
        text = text.replace('</body>', '<dialog id="workspaceHelp" aria-labelledby="helpPageTitle"><div class="help-close"><button id="closeWorkspaceHelp" type="button">Close help</button></div>' + main + '</dialog></body>')
    page.write_text(text, encoding='utf-8')

boot = dest / 'solutions/pdfsplat/src/boot.js'
text = boot.read_text(encoding='utf-8').replace("void load('../../assets/js/tool-launcher.js?v=2', true).catch(console.error);", '/* Desktop shell supplies the installed tool switcher. */')
boot.write_text(text, encoding='utf-8')

subprocess.run(['node', str(ROOT/'scripts/adapt-tools.mjs')], check=True)
subprocess.run(['npm', 'ci', '--prefix',str(dest/'solutions/pdfsplat')], check=True)
subprocess.run(['node',str(dest/'scripts/build-pdfsplat.mjs')],check=True)

# Export docs are kept as source material. The shell supplies a short offline
# help page instead of navigating away from an open document.
(dest / 'tools.json').write_text(json.dumps(all_tools, indent=2) + '\n', encoding='utf-8')
revision = subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip()
files = {}
owned = [t['source']+'/' for t in registry]+['vendor/','scripts/','docs/','assets/icons/','assets/brand/','assets/backgrounds/','assets/coloring-book/','assets/scratch-art/','assets/smithsonian-animals/','splatworks/shared/','solutions/mediasplat/ffmpeg/']
shared = {'LICENSE','NOTICE.md'} | {'splatworks/shared/'+n for n in ['google-drive.js','google-drive-auth.js','LICENSE.txt']} | {'assets/js/'+n for n in ['app-language.js','pdf-ui-strings.js','pdf-language-loader.js','action-cards.js','widget-i18n.js']} | {'assets/css/'+n for n in ['app-language.css','action-cards.css','action-icons.css']}
for file in sorted(dest.rglob('*')):
    rel=file.relative_to(dest).as_posix()
    if (rel in shared or any(rel.startswith(prefix) for prefix in owned)) and file.is_file() and 'node_modules' not in file.parts and file.relative_to(dest).parts[0] not in ['desktop'] and file.name not in ['index.html', 'source-manifest.json']:
        files[file.relative_to(dest).as_posix()] = hashlib.sha256(file.read_bytes()).hexdigest()
# Include adapted tool entry pages too, excluding only the shell entry page.
for tool in registry:
    name = tool['source'] + '/index.html'
    files[name] = hashlib.sha256((dest/name).read_bytes()).hexdigest()
manifest = {'repository':'https://github.com/mguhlin/drawsplat', 'revision':revision, 'tools':[t['id'] for t in registry], 'files':dict(sorted(files.items()))}
(dest/'source-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
shutil.copy2(source/'assets/brand/SplatWorks_logo.png', ROOT/'build/appicon.png')
print(f'Imported {len(registry)} tools from DrawSplat {revision[:12]} ({len(files)} bundled files).')
shutil.rmtree(dest/'solutions/pdfsplat/node_modules')
