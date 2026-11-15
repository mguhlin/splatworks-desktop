#!/usr/bin/env python3
"""Fetch the pinned, licensed default AI model for inclusion in installers."""
import hashlib,json,pathlib,urllib.request
root=pathlib.Path(__file__).resolve().parents[1];spec=json.loads((root/'ai-runtime/model.json').read_text());out=root/'output/toolchain/models'/spec['repository']
for record in spec['files']:
 file=out/record['path'];file.parent.mkdir(parents=True,exist_ok=True)
 if file.is_file() and hashlib.sha256(file.read_bytes()).hexdigest()==record['sha256']:continue
 url='https://huggingface.co/'+spec['repository']+'/resolve/'+spec['revision']+'/'+record['path'];temp=file.with_name(file.name+'.partial')
 try:
  with urllib.request.urlopen(url,timeout=180) as response,temp.open('wb') as target:
   while chunk:=response.read(1024*1024):target.write(chunk)
  if temp.stat().st_size!=record['size'] or hashlib.sha256(temp.read_bytes()).hexdigest()!=record['sha256']:raise SystemExit('Model integrity check failed: '+record['path'])
  temp.replace(file)
 finally:temp.unlink(missing_ok=True)
print('Verified bundled ORMBG model and configuration files.')
