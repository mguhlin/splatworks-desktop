#!/usr/bin/env python3
"""Bundle the pinned ImageSplat model and runtime for offline use in the suite."""
import hashlib,json,pathlib,shutil,subprocess,sys
root=pathlib.Path(__file__).resolve().parents[1];web=root/'frontend'
subprocess.run([sys.executable,str(root/'scripts/prepare-ai.py')],check=True)
spec=json.loads((root/'ai-runtime/model.json').read_text());owned=[]
for source,target in [(root/'ai-runtime/vendor',web/'solutions/backdropsplat/vendor'),(root/'output/toolchain/models'/spec['repository'],web/'solutions/backdropsplat/models'/spec['repository'])]:
    shutil.copytree(source,target,dirs_exist_ok=True)
    owned.extend(file for file in target.rglob('*') if file.is_file())
shutil.copy2(root/'ai-runtime/model.json',web/'solutions/backdropsplat/model-provenance.json');owned.append(web/'solutions/backdropsplat/model-provenance.json')
files={str(file.relative_to(web)):hashlib.sha256(file.read_bytes()).hexdigest() for file in owned}
(web/'core-assets-manifest.json').write_text(json.dumps({'model':spec,'files':dict(sorted(files.items()))},indent=2)+'\n')
print('Bundled verified offline image runtime and model.')
