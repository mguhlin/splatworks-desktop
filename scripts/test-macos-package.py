#!/usr/bin/env python3
"""Verify DMG checksums and the archived universal app, handling mounted images."""
import json,pathlib,plistlib,subprocess,time
root=pathlib.Path(__file__).resolve().parents[1]
release=root/'output/release'
def checked(*args):subprocess.run(args,check=True)
for image in release.glob('*.dmg'):
    image=image.resolve()
    # hdiutil requires an exclusive handle for verify. Detach only our exact
    # image if the build/OS left it mounted; never touch unrelated volumes.
    info=plistlib.loads(subprocess.check_output(['hdiutil','info','-plist']))
    for mounted in info.get('images',[]):
        if pathlib.Path(mounted.get('image-path','')).resolve()==image:
            devices=[entry['dev-entry'] for entry in mounted.get('system-entities',[]) if entry.get('dev-entry')]
            if devices:checked('hdiutil','detach',devices[0])
    for attempt in range(5):
        result=subprocess.run(['hdiutil','verify',str(image)],capture_output=True,text=True)
        if result.returncode==0:
            print(result.stdout);break
        if 'Resource temporarily unavailable' not in result.stderr or attempt==4:
            raise SystemExit(result.stderr)
        time.sleep(2*(attempt+1))
archives=list(release.glob('*.zip'))
assert len(archives)==1,'Expected one Mac application archive'
unpacked=root/'output/unpacked';unpacked.mkdir(exist_ok=True)
checked('ditto','-x','-k',str(archives[0]),str(unpacked))
apps=list(unpacked.glob('*/*.app'));assert len(apps)==1,'Expected one application bundle'
metadata=plistlib.loads((apps[0]/'Contents/Info.plist').read_bytes(),fmt=plistlib.FMT_XML)
assert metadata['CFBundleIdentifier']=='org.splatworks.desktop','Unexpected application identity'
assert metadata['LSMinimumSystemVersion']=='14.0','Unexpected support baseline'
checked('codesign','--verify','--deep','--strict',str(apps[0]))
binaries=list((apps[0]/'Contents/MacOS').iterdir());assert len(binaries)==1
checked('lipo',str(binaries[0]),'-verify_arch','x86_64','arm64')
(root/'output/native/macos-package.json').write_text(json.dumps({'passed':True,'checks':['disk image verification','archived code signature','Intel and Apple silicon slices']},indent=2)+'\n')
