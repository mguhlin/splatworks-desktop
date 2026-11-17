#!/usr/bin/env python3
"""Check synthetic smoke results and the actual files written by the native app."""
import hashlib,json,pathlib,sys
root=pathlib.Path(sys.argv[1]);report=json.loads((root/'native-smoke.json').read_text(encoding='utf-8'))
assert report['passed'] and not report.get('errors'),report
if report.get('profile'):
    import struct,xml.etree.ElementTree as ET
    profile=report['profile'];assert len(report['checks'])>=10,report
    if profile in ['audiosplat','videosplat']:
        if profile=='audiosplat':
            import wave
            wav=next(root.glob('*.wav'))
            with wave.open(str(wav),'rb') as audio:
                assert audio.getnchannels()>=1 and audio.getnframes()>100
                assert any(audio.readframes(audio.getnframes())), 'Silent synthetic export'
            mp3=next(root.glob('*.mp3'));assert mp3.stat().st_size>100
            project=json.loads(next(root.glob('*.audiosplat.json')).read_text())
            assert project['project']['app']=='AudioSplat' and project['project']['tracks'][0]['clips']
            assert project['sources'][0]['dataUrl'].startswith('data:audio/')
        else:
            data=(root/'native.mp4').read_bytes();assert data[4:8]==b'ftyp' and b'mdat' in data
            project=json.loads(next(root.glob('*.videosplat.json')).read_text())
            assert project['schema']=='videosplat-project' and len(project['assets'])==1
            assert project['embeddedMedia'][project['assets'][0]['id']].startswith('data:image/png;base64,')
        assert not list(root.glob('.splatworks-*')), 'Unfinished output remains'
        print(f'Native {profile} report, portable project, and encoded media verified: {root}');sys.exit()
    if profile=='ciphersplat':
        assert (root/'sample.txt.csplat').read_bytes().startswith(b'CSPCS4!!')
        assert (root/'decrypted-message.txt').read_text()=='Standalone OpenPGP round trip'
        restored=list(root.glob('CipherSplat-restored-*/nested/sample.txt'));assert restored
        assert restored[0].read_text()=='Standalone Unicode: español 日本語'
        assert restored[0].with_name('empty.txt').stat().st_size==0
    elif profile=='gifsplat':
        data=(root/'GIFsplat-animation.gif').read_bytes();assert data[:6]==b'GIF89a' and data[-1:]==b';'
        assert struct.unpack('<HH',data[6:10])==(80,60)
        # Parse the GIF block structure, counting image descriptors and timing.
        pos=13+(3*(2**((data[10]&7)+1)) if data[10]&128 else 0);frames=0;delays=[]
        def blocks(pos):
            while data[pos]:pos+=1+data[pos]
            return pos+1
        while data[pos]!=59:
            tag=data[pos];pos+=1
            if tag==33:
                label=data[pos];pos+=1
                if label==249:delays.append(struct.unpack('<H',data[pos+2:pos+4])[0])
                pos=blocks(pos)
            elif tag==44:
                flags=data[pos+8];pos+=9
                if flags&128:pos+=3*2**((flags&7)+1)
                pos=blocks(pos+1);frames+=1
            else:raise AssertionError('Invalid GIF block')
        assert frames==2 and delays==[20,20],(frames,delays)
    elif profile=='qrsplat':
        svg=ET.parse(root/'native-qr.svg');assert svg.getroot().tag.endswith('svg')
        data=(root/'native-qr.png').read_bytes();assert data[:8]==b'\x89PNG\r\n\x1a\n'
        assert min(struct.unpack('>II',data[16:24]))>=128
    elif profile=='imagesplat':
        for name,size in [('ImageSplat.png',(80,60)),('ImageSplat-cutout.png',(80,60))]:
            data=(root/name).read_bytes();assert data[:8]==b'\x89PNG\r\n\x1a\n'
            assert struct.unpack('>II',data[16:24])==size
    else:raise AssertionError(profile)
    if profile!='ciphersplat':
        project=json.loads((root/(profile+'.'+profile)).read_text())
        assert project['format']=='SplatWorks-project' and project['tool']==profile and project['version']==1
        if profile=='qrsplat':assert not project['data'].get('wifiPassword')
    assert not list(root.glob('.splatworks-*')),'Unfinished output remains'
    print(f'Native {profile} report and actual export files verified: {root}');sys.exit()
assert len(report['checks'])>=23,report
pdf=root/'desktop-lesson-edited.pdf';assert pdf.read_bytes().startswith(b'%PDF-')
restored=list(root.glob('CipherSplat-restored-*/classroom/lesson.pdf'));assert restored,'Missing restored PDF'
assert any(hashlib.sha256(file.read_bytes()).digest()==hashlib.sha256(pdf.read_bytes()).digest() for file in restored),'Restored bytes differ from the saved PDF'
assert (root/'desktop-lesson.pdf.csplat').read_bytes().startswith(b'CSPCS4!!')
assert (root/'decrypted-message.txt').read_text(encoding='utf-8')=='OpenPGP desktop round trip'
assert not (root/'cancelled-output.bin').exists(),'Cancelled output was published'
assert not list(root.glob('.splatworks-*')),'Unfinished output remains after normal shutdown'
print(f'Native report and actual PDF/encrypted/restored output verified: {root}')
