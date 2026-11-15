#!/usr/bin/env python3
"""Package an already-built platform application with notices and checksums."""
import argparse
import os
import re
import hashlib
from pathlib import Path
import shutil
import subprocess
import tarfile
import zipfile

root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--platform',choices=['linux','windows','macos'],required=True)
p.add_argument('--version',required=True)
a=p.parse_args()
if not re.fullmatch(r'\d+\.\d+\.\d+(?:-[A-Za-z0-9.]+)?',a.version):p.error('Expected a semantic release version')
out=root/'output/release';out.mkdir(parents=True,exist_ok=True)
name=f'SplatWorks-Desktop-{a.version}-{a.platform}-'+('universal' if a.platform=='macos' else 'amd64')
stage=root/'output/package'/name
shutil.rmtree(stage,ignore_errors=True);stage.mkdir(parents=True)
for file in ['README.md','LICENSE','COPYING','NOTICE.md','THIRD-PARTY-NOTICES.md']:
    shutil.copy2(root/file,stage/file)
shutil.copytree(root/'licenses',stage/'licenses')
if a.platform=='macos':
    source=root/'build/bin/SplatWorks-Desktop.app'
    if not source.exists(): source=root/'build/bin/splatworks-desktop.app'
    shutil.copytree(source,stage/'SplatWorks Desktop.app',symlinks=True)
    subprocess.run(['ditto','-c','-k','--sequesterRsrc','--keepParent',str(stage),str(out/(name+'.zip'))],check=True)
    # The DMG preserves the native bundle's symlinks and executable permissions.
    (stage/'Applications').symlink_to('/Applications')
    subprocess.run(['hdiutil','create','-volname','SplatWorks Desktop','-srcfolder',str(stage),'-ov','-format','UDZO',str(out/(name+'.dmg'))],check=True)
    if os.environ.get('SIGN_RELEASE')=='true':subprocess.run(['python3',str(root/'scripts/sign-macos.py'),str(out/(name+'.dmg'))],check=True)
elif a.platform=='windows':
    shutil.copy2(root/'build/bin/SplatWorks-Desktop.exe',stage/'SplatWorks-Desktop.exe')
    with zipfile.ZipFile(out/(name+'.zip'),'w',zipfile.ZIP_DEFLATED) as z:
        for file in stage.rglob('*'):
            if file.is_file(): z.write(file,file.relative_to(stage.parent))
    runtime=root/'output/toolchain/WebView2RuntimeInstallerX64.exe'
    if not runtime.is_file():raise SystemExit('Run scripts/prepare-windows.ps1 before packaging Windows')
    installer=out/(name+'-setup.exe')
    command=['makensis',f'/DVERSION={a.version}',f'/DNUMERIC_VERSION={a.version.split("-")[0]}.0',f'/DOUTPUT={installer}',f'/DSTAGE={stage}',f'/DRUNTIME={runtime}']
    if os.environ.get('SIGN_RELEASE')=='true':command.append(f'/DSIGN_SCRIPT={root/"scripts/sign-windows.ps1"}')
    subprocess.run(command+[str(root/'build/windows/setup.nsi')],check=True)
    if os.environ.get('SIGN_RELEASE')=='true':subprocess.run(['powershell','-NoProfile','-File',str(root/'scripts/sign-windows.ps1'),'-Path',str(installer)],check=True)
    shutil.copy2(runtime.parent/'runtime.json',out/(name+'-webview2.json'))
else:
    executable=stage/'SplatWorks-Desktop';shutil.copy2(root/'build/bin/SplatWorks-Desktop',executable);executable.chmod(0o755)
    with tarfile.open(out/(name+'.tar.gz'),'w:gz') as tar: tar.add(stage,arcname=name)
    deb=root/'output/deb';shutil.rmtree(deb,ignore_errors=True)
    (deb/'DEBIAN').mkdir(parents=True)
    (deb/'DEBIAN/control').write_text(f'Package: splatworks-desktop\nVersion: {a.version.lstrip("v")}\nArchitecture: amd64\nMaintainer: Miguel Guhlin <drawsplat@gmail.com>\nDepends: libgtk-3-0 (>= 3.24) | libgtk-3-0t64, libwebkit2gtk-4.1-0\nSection: utils\nPriority: optional\nHomepage: https://github.com/mguhlin/splatworks-desktop\nDescription: Local PDFsplat and CipherSplat desktop tools\n Go desktop shell with offline PDF editing, OCR, and encryption.\n')
    app=deb/'opt/splatworks-desktop';shutil.copytree(stage,app)
    bindir=deb/'usr/bin';bindir.mkdir(parents=True);(bindir/'splatworks-desktop').symlink_to('/opt/splatworks-desktop/SplatWorks-Desktop')
    desktop=deb/'usr/share/applications';desktop.mkdir(parents=True)
    (desktop/'splatworks-desktop.desktop').write_text('[Desktop Entry]\nType=Application\nName=SplatWorks Desktop\nComment=Local PDF editing and encryption\nExec=splatworks-desktop\nIcon=splatworks-desktop\nTerminal=false\nCategories=Office;Utility;\n')
    icons=deb/'usr/share/icons/hicolor/512x512/apps';icons.mkdir(parents=True);shutil.copy2(root/'build/appicon.png',icons/'splatworks-desktop.png')
    subprocess.run(['dpkg-deb','--root-owner-group','--build',str(deb),str(out/(name+'.deb'))],check=True)
for file in out.iterdir():
    if file.is_file() and file.name.startswith(name) and not file.name.endswith('.sha256'):
        (out/(file.name+'.sha256')).write_text(hashlib.sha256(file.read_bytes()).hexdigest()+'  '+file.name+'\n')
print('Packaged '+name)
