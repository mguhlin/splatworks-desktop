#!/usr/bin/env python3
"""Verify every release artifact against its adjacent SHA-256 file."""
import hashlib,pathlib,sys
root=pathlib.Path(sys.argv[1]);count=0
for file in root.iterdir():
    if file.is_file() and not file.name.endswith('.sha256'):
        checksum=file.with_name(file.name+'.sha256')
        expected,name=checksum.read_text(encoding='utf-8').strip().split('  ')
        assert name==file.name and hashlib.sha256(file.read_bytes()).hexdigest()==expected,file.name
        count+=1
assert count,'No distribution artifacts found'
print(f'Verified {count} release artifact checksums.')
