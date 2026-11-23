#!/usr/bin/env python3
"""Stage a small, independently named application using the shared Go shell."""
import argparse,json,pathlib,shutil,subprocess,sys,re
root=pathlib.Path(__file__).resolve().parents[1]
profiles=json.loads((root/'profiles.json').read_text())
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--profile',choices=profiles,required=True);p.add_argument('--version',default='1.0.0-rc.4');p.add_argument('--platform');p.add_argument('--prepare-only',action='store_true');a=p.parse_args()
info=profiles[a.profile];stage=root/'output/profiles'/a.profile
shutil.rmtree(stage,ignore_errors=True);stage.mkdir(parents=True)
ignore=shutil.ignore_patterns('bin','node_modules','__pycache__','test-results','tests')
def copy(src,dest):
    dest.parent.mkdir(parents=True,exist_ok=True)
    if src.is_dir():shutil.copytree(src,dest,ignore=ignore,dirs_exist_ok=True)
    else:shutil.copy2(src,dest)
for file in root.glob('*.go'):copy(file,stage/file.name)
main=stage/'main.go';main.write_text(re.sub(r'//go:embed[^\n]+','//go:embed all:frontend',main.read_text()))
for name in ['go.mod','go.sum','LICENSE','COPYING','NOTICE.md','THIRD-PARTY-NOTICES.md','SECURITY.md','internal','scripts','licenses','docs','build']:
    copy(root/name,stage/name)
web=stage/'frontend';web.mkdir()
for name in ['index.html','desktop','assets','LICENSE','NOTICE.md']:
    copy(root/'frontend'/name,web/name)
copy(root/'frontend/splatworks/shared',web/'splatworks/shared')
for file in (web/'desktop').glob('native-smoke*.js'):
    if file.name!=info['smoke']:file.unlink()
catalog=json.loads((root/'tools.json').read_text())+json.loads((root/'standalone-tools.json').read_text())
tool=next(t for t in catalog if t['id']==a.profile)
copy(root/'frontend'/tool['source'],web/tool['source'])
if a.profile in ['audiosplat','videosplat']:
    copy(root/'frontend/solutions/shared/subtitles',web/'solutions/shared/subtitles')
    copy(root/'frontend/media-manifest.json',web/'media-manifest.json')
    if a.profile=='videosplat':copy(root/'frontend/solutions/mediasplat/ffmpeg',web/'solutions/mediasplat/ffmpeg')
if a.profile=='imagesplat':
    copy(root/'frontend/solutions/fontsplat',web/'solutions/fontsplat')
    copy(root/'frontend/splatworks/layoutsplat/fonts',web/'splatworks/layoutsplat/fonts')
    copy(root/'frontend/solutions/backdropsplat',web/'solutions/backdropsplat')
    subprocess.run([sys.executable,str(root/'scripts/prepare-ai.py')],check=True)
    copy(root/'ai-runtime/vendor',web/'solutions/backdropsplat/vendor')
    for notice in (root/'ai-runtime/vendor').glob('*'):
        if 'LICENSE' in notice.name or 'ThirdParty' in notice.name:copy(notice,stage/'licenses/AI'/notice.name)
    for notice in (root/'frontend/splatworks/layoutsplat/fonts').glob('*'):
        if notice.suffix.lower() in ['.txt','.md']:copy(notice,stage/'licenses/fonts'/notice.name)
    copy(root/'ai-runtime/model.json',stage/'licenses/AI/model.json')
    copy(root/'output/toolchain/models',web/'solutions/backdropsplat/models')
    copy(root/'frontend/vendor/jszip.min.js',web/'vendor/jszip.min.js')
(web/'tools.json').write_text(json.dumps([tool],indent=2)+'\n')
if a.profile=='imagesplat':info={**info,'bundledModels':True}
(web/'app.json').write_text(json.dumps(info,indent=2)+'\n')
page=web/'index.html';page.write_text(page.read_text().replace('href="/solutions/pdfsplat/pdfsplat.png"','href="/'+info['icon']+'"'))
config=json.loads((root/'wails.json').read_text());config.update(name=info['slug'],outputfilename=info['binary']);config['info'].update(productName=info['name'],productVersion=a.version.split('-')[0],comments=info['description']);(stage/'wails.json').write_text(json.dumps(config,indent=2)+'\n')
icon=root/'frontend'/info['icon']
if not icon.is_file():raise SystemExit('Missing generated profile icon: '+str(icon))
copy(icon,stage/'build/appicon.png')
plist=stage/'build/darwin/Info.plist';plist.write_text(plist.read_text().replace('org.splatworks.desktop','org.splatworks.'+info['slug']))
(stage/'README.md').write_text('# '+info['name']+' Desktop\n\n'+info['description']+'\n\n'+ '\n\n'.join(info['help'])+'\n\nOpen or import local files with the tool controls. Saves use native destination dialogs. The app warns before closing unsaved work and blocks closing during operations.\n\nUnsigned previews have no verified publisher signature or Apple notarization. Stable releases require developer signing and physical-device approval. Linux requires GTK3/WebKitGTK4.1; Windows setup includes Microsoft WebView2; the portable Windows ZIP requires an existing runtime. Mac packages contain Intel and Apple silicon builds.\n\nSource and releases: https://github.com/mguhlin/splatworks-desktop\n\nAGPL-3.0-or-later; bundled dependencies retain their own notices. See LICENSE, COPYING, THIRD-PARTY-NOTICES.md, and docs/.\n')
if not a.prepare_only:
    command=['wails','build']
    if a.platform:command+=['-platform',a.platform]
    if (a.platform or sys.platform).startswith('linux'):command+=['-tags','webkit2_41']
    command+=['-ldflags','-X main.version='+a.version]
    subprocess.run(command,cwd=stage,check=True)
print(stage)
