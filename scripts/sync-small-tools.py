#!/usr/bin/env python3
"""Import the small offline tool editions from an explicit DrawSplat checkout."""
import argparse,hashlib,json,pathlib,re,shutil,subprocess
root=pathlib.Path(__file__).resolve().parents[1];web=root/'frontend'
p=argparse.ArgumentParser(description=__doc__);p.add_argument('source',type=pathlib.Path);a=p.parse_args();source=a.source.resolve()
tools=json.loads((root/'standalone-tools.json').read_text())
added=set()
def copy(rel):
    src=source/rel;dst=web/rel
    dst.parent.mkdir(parents=True,exist_ok=True)
    if src.is_dir():
        shutil.rmtree(dst,ignore_errors=True);shutil.copytree(src,dst,ignore=shutil.ignore_patterns('node_modules','tests','backend','downloads','*.zip'))
        added.update(str(f.relative_to(web)).replace('\\','/') for f in dst.rglob('*') if f.is_file())
    else:shutil.copy2(src,dst);added.add(rel)
for tool in tools:copy(tool['source'])
for rel in ['assets/js/widget-i18n.js','assets/js/gif-encoder.js','assets/js/mp4-muxer.js','assets/brand/DrawSplat_logo.png','assets/brand/DrawSplat_logo_transparent.png','assets/favicons/tools.svg','assets/favicons/splatimage-studio.svg','splatworks/shared/project-files.js','splatworks/shared/project-files.css','splatworks/shared/photo-blur.js','splatworks/shared/fontsplat-launcher.js']:
    copy(rel)
copy('solutions/fontsplat')
copy('splatworks/layoutsplat/fonts')
fontpage=web/'solutions/fontsplat/index.html';fontpage.write_text(re.sub(r'<!-- splat-privacy:start -->.*?<!-- splat-privacy:end -->','',fontpage.read_text(),flags=re.S).replace('<head>','<head><link rel="stylesheet" href="/desktop/frame.css"><script src="/desktop/frame.js"></script>'))
for name in ['processor.mjs','pixels.mjs','backgrounds.mjs','background-source.mjs','worker.mjs','backgrounds']:
    copy('solutions/backdropsplat/'+name)
for tool in tools:
    page=web/tool['source']/'index.html';text=page.read_text(encoding='utf-8')
    text=re.sub(r'<!-- splat-privacy:start -->.*?<!-- splat-privacy:end -->','',text,flags=re.S)
    text=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>','',text)
    text=re.sub(r'<link[^>]+rel="manifest"[^>]*>','',text)
    text=re.sub(r'<link[^>]+(?:tool-launcher|launcher-trigger)\.css[^>]*>','',text)
    text=re.sub(r'<script[^>]+(?:tool-launcher|consent-banner)\.js[^>]*>\s*</script>','',text)
    count=0
    def extract(match):
        global count
        attrs,body=match.groups()
        if 'src=' in attrs or not body.strip():return match.group(0)
        count+=1;filename=f'desktop-entry-{count}.js';path=page.parent/filename
        path.write_text(body,encoding='utf-8');added.add(str(path.relative_to(web)).replace('\\','/'))
        return '<script'+attrs+' src="'+filename+'"></script>'
    text=re.sub(r'<script([^>]*)>(.*?)</script>',extract,text,flags=re.S)
    text=text.replace('<head>','<head><link rel="stylesheet" href="/desktop/frame.css"><script src="/desktop/frame.js"></script>')
    page.write_text(text,encoding='utf-8')
subprocess.run(['node',str(root/'scripts/adapt-small-tools.mjs')],check=True)
for tool in tools:
    readme=web/tool['source']/'README.md'
    if readme.is_file():readme.write_text('# '+tool['name']+' Desktop\n\n'+tool['description']+'\n\nThis is the adapted offline desktop snapshot. Desktop features, limitations, native packaging, signing and validation are documented in `docs/STANDALONE.md` in the repository root. Browser sources and their original documentation live at https://github.com/mguhlin/drawsplat .\n')

for name in added:(web/name).chmod(0o644)
manifest={'repository':'https://github.com/mguhlin/drawsplat','revision':subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip(),'files':{name:hashlib.sha256((web/name).read_bytes()).hexdigest() for name in sorted(added)}}
(web/'standalone-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Imported offline small tools:',', '.join(t['name'] for t in tools))
