#!/usr/bin/env python3
"""Build reviewed AudioSplat/VideoSplat sources with desktop-only adapters in isolation."""
import argparse, hashlib, json, pathlib, re, shutil, subprocess, tempfile
root = pathlib.Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('source', type=pathlib.Path)
a = p.parse_args(); source = a.source.resolve()
stage = pathlib.Path(tempfile.mkdtemp(prefix='splatworks-media-'))
(root/'output/media-source-path').write_text(str(stage))
ignore = shutil.ignore_patterns('node_modules', 'dist', 'assets', 'tests', '*.test.*', '*.spec.*', '.git', '__pycache__', '*.pyc', '*.pyo')
for name in ['audiosplat', 'videosplat', 'mediasplat', 'shared/subtitles', 'shared/video-handoff']:
    shutil.copytree(source/'solutions'/name, stage/'solutions'/name, ignore=ignore)
shutil.copytree(root/'frontend/splatworks/shared', stage/'splatworks/shared')
for name in ['audiosplat', 'videosplat', 'mediasplat']:
    deps = source/'solutions'/name/'node_modules'
    if not deps.is_dir():
        raise SystemExit('Run npm ci in the explicit browser checkout solutions/'+name+' first.')
    (stage/'solutions'/name/'node_modules').symlink_to(deps, target_is_directory=True)
(stage/'solutions/shared/subtitles/node_modules').symlink_to(source/'solutions/audiosplat/node_modules', target_is_directory=True)
subprocess.run(['node', str(root/'scripts/adapt-media-tools.mjs'), str(stage)], check=True)
subprocess.run(['node', str(root/'scripts/adapt-mediasplat.mjs'), str(stage)], check=True)
files = {}
for name in ['audiosplat', 'videosplat', 'mediasplat']:
    app = stage/'solutions'/name
    # Call Vite directly: upstream publication scripts must never modify the browser checkout.
    subprocess.run(['node', str(app/'node_modules/vite/bin/vite.js'), 'build'], cwd=app, check=True)
    dest = root/'frontend/solutions'/name
    shutil.rmtree(dest, ignore_errors=True); shutil.copytree(app/'dist', dest)
    for rel in ['src', 'package.json', 'package-lock.json', 'LICENSE.md']:
        if (app/rel).exists():
            if (app/rel).is_dir(): shutil.copytree(app/rel, dest/rel)
            else: shutil.copy2(app/rel, dest/rel)
    # The original dependency notices accompany the adapted source snapshot.
    notices = dest/'licenses'; notices.mkdir(exist_ok=True)
    for package in (app/'node_modules').iterdir():
        packages = package.iterdir() if package.name.startswith('@') else [package]
        for dep in packages:
            if not dep.is_dir(): continue
            for license in dep.glob('*'):
                if license.is_file() and re.match(r'(?i)^(licen[cs]e|copying|notice)', license.name):
                    shutil.copy2(license, notices/(dep.name+'-'+license.name))
    for file in dest.rglob('*'):
        if file.is_file(): files[str(file.relative_to(root/'frontend'))] = hashlib.sha256(file.read_bytes()).hexdigest()
# Bundle the video transcoder rather than fetching application code at runtime.
for rel in ['solutions/mediasplat/ffmpeg', 'solutions/shared/subtitles']:
    dest = root/'frontend'/rel
    shutil.rmtree(dest, ignore_errors=True)
    shutil.copytree(source/rel if 'ffmpeg' in rel else stage/rel, dest, ignore=shutil.ignore_patterns('node_modules','tests','*.test.*','*.spec.*'))
    for file in dest.rglob('*'):
        if file.is_file(): files[str(file.relative_to(root/'frontend'))] = hashlib.sha256(file.read_bytes()).hexdigest()
manifest = {'buildDependencies':{name:{dependency:json.loads((source/'solutions'/name/'node_modules'/dependency/'package.json').read_text())['version'] for dependency in ['vite','typescript']} for name in ['audiosplat','videosplat','mediasplat']}, 'repository':'https://github.com/mguhlin/drawsplat', 'revision':subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip(), 'files':dict(sorted(files.items()))}
(root/'frontend/media-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Imported AudioSplat, VideoSplat and MediaSplat with bundled media engines.')
