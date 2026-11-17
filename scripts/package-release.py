#!/usr/bin/env python3
"""Package an already-built platform application with notices and checksums."""
import argparse
from macos_dmg import create_image
import json
import os
import re
import hashlib
from pathlib import Path
import shutil
import subprocess
import tarfile
import zipfile

root=Path(__file__).resolve().parents[1]
appinfo=json.loads((root/'frontend/app.json').read_text(encoding='utf-8'))
appname=appinfo['name'];binary=appinfo['binary'];slug=appinfo['slug']
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--platform',choices=['linux','windows','macos'],required=True)
p.add_argument('--version',required=True)
a=p.parse_args()
if not re.fullmatch(r'\d+\.\d+\.\d+(?:-[A-Za-z0-9.]+)?',a.version):p.error('Expected a semantic release version')
out=root/'output/release';out.mkdir(parents=True,exist_ok=True)
name=f'{binary}-{a.version}-{a.platform}-'+('universal' if a.platform=='macos' else 'amd64')
stage=root/'output/package'/name
shutil.rmtree(stage,ignore_errors=True);stage.mkdir(parents=True)
for file in ['README.md','LICENSE','COPYING','NOTICE.md','THIRD-PARTY-NOTICES.md','SECURITY.md']:
    shutil.copy2(root/file,stage/file)
shutil.copytree(root/'licenses',stage/'licenses')
shutil.copytree(root/'docs',stage/'docs')
if a.platform=='macos':
    source=root/'build/bin'/(binary+'.app')
    if not source.exists(): source=root/'build/bin'/(slug+'.app')
    shutil.copytree(source,stage/(appname+'.app'),symlinks=True)
    subprocess.run(['ditto','-c','-k','--sequesterRsrc','--keepParent',str(stage),str(out/(name+'.zip'))],check=True)
    # The DMG preserves the native bundle's symlinks and executable permissions.
    (stage/'Applications').symlink_to('/Applications')
    create_image(stage,out/(name+'.dmg'),appname)
    if os.environ.get('SIGN_RELEASE')=='true':subprocess.run(['python3',str(root/'scripts/sign-macos.py'),str(out/(name+'.dmg'))],check=True)
elif a.platform=='windows':
    shutil.copy2(root/'build/bin'/(binary+'.exe'),stage/(binary+'.exe'))
    with zipfile.ZipFile(out/(name+'.zip'),'w',zipfile.ZIP_DEFLATED) as z:
        for file in stage.rglob('*'):
            if file.is_file(): z.write(file,file.relative_to(stage.parent))
    runtime=root/'output/toolchain/WebView2RuntimeInstallerX64.exe'
    if not runtime.is_file():raise SystemExit('Run scripts/prepare-windows.ps1 before packaging Windows')
    installer=out/(name+'-setup.exe')
    cleanup=root/'output/package/uninstall-files.nsh'
    # Remove only files shipped by this installer, preserving additional user
    # files even inside subdirectories of the application installation.
    lines=[]
    for file in stage.rglob('*'):
        if file.is_file():lines.append('Delete "$INSTDIR\\'+str(file.relative_to(stage)).replace('/','\\').replace('$','$$')+'"')
    for directory in sorted((p for p in stage.rglob('*') if p.is_dir()),key=lambda p:len(p.parts),reverse=True):lines.append('RMDir "$INSTDIR\\'+str(directory.relative_to(stage)).replace('/','\\').replace('$','$$')+'"')
    cleanup.write_text('\n'.join(lines)+'\n',encoding='utf-8')
    command=['makensis',f'/DVERSION={a.version}',f'/DAPPNAME={appname}',f'/DBINARY={binary}',f'/DSLUG={slug}',f'/DAPPREGISTRY={appinfo["registry"]}',f'/DAPPKEY={appinfo["settingsKey"]}',f'/DNUMERIC_VERSION={a.version.split("-")[0]}.0',f'/DOUTPUT={installer}',f'/DSTAGE={stage}',f'/DRUNTIME={runtime}',f'/DUNINSTALL_FILES={cleanup}']
    if os.environ.get('SIGN_RELEASE')=='true':command.append(f'/DSIGN_SCRIPT={root/"scripts/sign-windows.ps1"}')
    subprocess.run(command+[str(root/'build/windows/setup.nsi')],check=True)
    if os.environ.get('SIGN_RELEASE')=='true':subprocess.run(['powershell','-NoProfile','-File',str(root/'scripts/sign-windows.ps1'),'-Path',str(installer)],check=True)
    shutil.copy2(runtime.parent/'runtime.json',out/(name+'-webview2.json'))
else:
    executable=stage/binary;shutil.copy2(root/'build/bin'/binary,executable);executable.chmod(0o755)
    with tarfile.open(out/(name+'.tar.gz'),'w:gz') as tar: tar.add(stage,arcname=name)
    deb=root/'output/deb';shutil.rmtree(deb,ignore_errors=True)
    (deb/'DEBIAN').mkdir(parents=True)
    # The epoch lets stable releases upgrade legacy rc packages whose raw
    # hyphenated versions sorted after 1.0.0. Tilde sorts new previews first.
    deb_version=('1:' if appinfo['id']=='desktop' else '')+a.version.replace('-', '~', 1)
    (deb/'DEBIAN/control').write_text(f'Package: {slug}\nVersion: {deb_version}\nArchitecture: amd64\nMaintainer: Miguel Guhlin <drawsplat@gmail.com>\nDepends: libgtk-3-0 (>= 3.24) | libgtk-3-0t64, libwebkit2gtk-4.1-0\nSection: utils\nPriority: optional\nHomepage: https://github.com/mguhlin/splatworks-desktop\nDescription: {appname} local desktop tools\n {appinfo["description"]}\n')
    app=deb/'opt'/slug;shutil.copytree(stage,app)
    bindir=deb/'usr/bin';bindir.mkdir(parents=True);(bindir/slug).symlink_to('/opt/'+slug+'/'+binary)
    desktop=deb/'usr/share/applications';desktop.mkdir(parents=True)
    (desktop/(slug+'.desktop')).write_text(f'[Desktop Entry]\nType=Application\nName={appname}\nComment=Local SplatWorks tools\nExec={slug}\nIcon={slug}\nTerminal=false\nCategories=Office;Utility;\n')
    icons=deb/'usr/share/icons/hicolor/512x512/apps';icons.mkdir(parents=True);shutil.copy2(root/'build/appicon.png',icons/(slug+'.png'))
    subprocess.run(['dpkg-deb','--root-owner-group','--build',str(deb),str(out/(name+'.deb'))],check=True)
for file in out.iterdir():
    if file.is_file() and file.name.startswith(name) and not file.name.endswith('.sha256'):
        (out/(file.name+'.sha256')).write_text(hashlib.sha256(file.read_bytes()).hexdigest()+'  '+file.name+'\n')
print('Packaged '+name)
