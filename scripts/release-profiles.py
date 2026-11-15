#!/usr/bin/env python3
"""Build, exercise, and package each independently installable offline tool."""
import argparse,json,os,pathlib,shutil,subprocess,sys
root=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--platform',choices=['linux','windows','macos'],required=True);p.add_argument('--version',required=True);a=p.parse_args()
profiles=json.loads((root/'profiles.json').read_text());target={'linux':'linux/amd64','windows':'windows/amd64','macos':'darwin/universal'}[a.platform]
def run(args,cwd):subprocess.run([str(x) for x in args],cwd=cwd,check=True,timeout=600)
release=root/'output/standalone-release';release.mkdir(parents=True,exist_ok=True)
for id,info in profiles.items():
    run([sys.executable,root/'scripts/build-profile.py','--profile',id,'--version',a.version,'--platform',target],root)
    stage=root/'output/profiles'/id;native=stage/'output/native';native.mkdir(parents=True)
    if a.platform=='linux':
        binary=stage/'build/bin'/info['binary']
        run(['sudo','-E','unshare','--net','--','bash','-c','ip link set lo up; xvfb-run -a dbus-run-session -- timeout 240 "$1" --smoke-test "$2"','_',binary,native],stage)
        run(['sudo','chown','-R',f'{os.getuid()}:{os.getgid()}',stage/'output'],stage)
    elif a.platform=='windows':
        binary=stage/'build/bin'/(info['binary']+'.exe')
        if os.environ.get('SIGN_RELEASE')=='true':run(['powershell','-NoProfile','-File',stage/'scripts/sign-windows.ps1','-Path',binary],stage)
        run([binary,'--smoke-test',native],stage)
        shutil.copytree(root/'output/toolchain',stage/'output/toolchain',dirs_exist_ok=True)
    else:
        bundle=next((stage/'build/bin').glob('*.app'))
        run(['codesign','--force','--sign','-','--options','runtime',bundle],stage)
        if os.environ.get('SIGN_RELEASE')=='true':run([sys.executable,stage/'scripts/sign-macos.py',bundle],stage)
        binary=next((bundle/'Contents/MacOS').iterdir());run([binary,'--smoke-test',native],stage)
    run([sys.executable,stage/'scripts/verify-native.py',native],stage)
    run([sys.executable,stage/'scripts/package-release.py','--platform',a.platform,'--version',a.version],stage)
    installer={'linux':['bash','scripts/test-linux-install.sh'],'windows':['powershell','-NoProfile','-File','scripts/test-windows-install.ps1'],'macos':[sys.executable,'scripts/test-macos-package.py']}[a.platform]
    run(installer,stage)
    run([sys.executable,stage/'scripts/verify-packages.py',stage/'output/release'],stage)
    for file in (stage/'output/release').iterdir():shutil.copy2(file,release/file.name)
    evidence=root/'output/standalone-native'/id;evidence.mkdir(parents=True,exist_ok=True)
    for file in native.glob('*.json'):shutil.copy2(file,evidence/file.name)
print('All standalone applications passed native and installer checks.')
