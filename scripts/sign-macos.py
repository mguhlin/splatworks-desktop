#!/usr/bin/env python3
"""Sign/notarize an app or DMG using developer-owned CI credentials."""
import argparse,base64,os,pathlib,secrets,subprocess,tempfile
p=argparse.ArgumentParser(description=__doc__);p.add_argument('path',type=pathlib.Path);a=p.parse_args()
required=['MACOS_CERTIFICATE_P12','MACOS_CERTIFICATE_PASSWORD','MACOS_SIGNING_IDENTITY','APPLE_API_KEY_P8','APPLE_API_KEY_ID','APPLE_API_ISSUER_ID']
if os.environ.get('SIGN_RELEASE')!='true':raise SystemExit('Signing must be explicitly enabled')
for name in required:
    if not os.environ.get(name):raise SystemExit('Missing signing credential: '+name)
def run(*args):
    # Do not let CalledProcessError echo credential-bearing command arguments.
    result=subprocess.run(args,stdout=subprocess.DEVNULL)
    if result.returncode:raise SystemExit(f'{args[0]} failed (exit {result.returncode}); inspect the tool diagnostic above.')
with tempfile.TemporaryDirectory(prefix='splatworks-sign-') as directory:
    temp=pathlib.Path(directory);p12=temp/'identity.p12';key=temp/'api-key.p8';chain=temp/'identity.keychain-db';password=secrets.token_hex(24)
    p12.write_bytes(base64.b64decode(os.environ['MACOS_CERTIFICATE_P12']));key.write_bytes(base64.b64decode(os.environ['APPLE_API_KEY_P8']));p12.chmod(0o600);key.chmod(0o600)
    try:
        run('security','create-keychain','-p',password,str(chain))
        run('security','unlock-keychain','-p',password,str(chain))
        run('security','import',str(p12),'-k',str(chain),'-P',os.environ['MACOS_CERTIFICATE_PASSWORD'],'-T','/usr/bin/codesign')
        run('security','set-key-partition-list','-S','apple-tool:,apple:,codesign:','-s','-k',password,str(chain))
        args=['codesign','--force','--timestamp','--keychain',str(chain),'--sign',os.environ['MACOS_SIGNING_IDENTITY']]
        if a.path.suffix=='.app':args+=['--options','runtime']
        run(*args,str(a.path));run('codesign','--verify','--deep','--strict',str(a.path))
        submission=a.path
        if a.path.suffix=='.app':
            submission=temp/'application.zip';run('ditto','-c','-k','--keepParent',str(a.path),str(submission))
        run('xcrun','notarytool','submit',str(submission),'--key',str(key),'--key-id',os.environ['APPLE_API_KEY_ID'],'--issuer',os.environ['APPLE_API_ISSUER_ID'],'--wait','--timeout','30m')
        run('xcrun','stapler','staple',str(a.path));run('xcrun','stapler','validate',str(a.path))
    finally:subprocess.run(['security','delete-keychain',str(chain)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
