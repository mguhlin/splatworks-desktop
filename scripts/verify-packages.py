#!/usr/bin/env python3
"""Verify artifact checksums and, when requested, the platform's complete package set."""
import argparse
import hashlib
import pathlib


def verify(root, platform=None, binary=None, version=None):
    if platform:
        suffix='universal' if platform=='macos' else 'amd64'
        base=f'{binary}-{version}-{platform}-{suffix}'
        endings={'linux':['.deb','.tar.gz'], 'windows':['-setup.exe','.zip','-webview2.json'], 'macos':['.dmg','.zip']}[platform]
        for ending in endings:
            artifact=root/(base+ending)
            assert artifact.is_file(), 'Missing required distribution artifact: '+artifact.name
            assert artifact.with_name(artifact.name+'.sha256').is_file(), 'Missing checksum: '+artifact.name
    count=0
    for file in root.iterdir():
        if file.is_file() and not file.name.endswith('.sha256'):
            checksum=file.with_name(file.name+'.sha256')
            expected,name=checksum.read_text(encoding='utf-8').strip().split('  ')
            assert name==file.name and hashlib.sha256(file.read_bytes()).hexdigest()==expected,file.name
            count+=1
    assert count,'No distribution artifacts found'
    return count


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory',type=pathlib.Path)
    parser.add_argument('--platform',choices=['linux','windows','macos'])
    parser.add_argument('--binary')
    parser.add_argument('--version')
    args=parser.parse_args()
    if args.platform and not (args.binary and args.version):parser.error('--platform requires --binary and --version')
    print(f'Verified {verify(args.directory,args.platform,args.binary,args.version)} release artifact checksums.')
