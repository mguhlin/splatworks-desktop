#!/usr/bin/env python3
"""Check synthetic smoke results and the actual files written by the native app."""
import hashlib,json,pathlib,sys
root=pathlib.Path(sys.argv[1]);report=json.loads((root/'native-smoke.json').read_text(encoding='utf-8'))
assert report['passed'] and len(report['checks'])>=23,report
pdf=root/'desktop-lesson-edited.pdf';assert pdf.read_bytes().startswith(b'%PDF-')
restored=list(root.glob('CipherSplat-restored-*/classroom/lesson.pdf'));assert restored,'Missing restored PDF'
assert any(hashlib.sha256(file.read_bytes()).digest()==hashlib.sha256(pdf.read_bytes()).digest() for file in restored),'Restored bytes differ from the saved PDF'
assert (root/'desktop-lesson.pdf.csplat').read_bytes().startswith(b'CSPCS4!!')
assert (root/'decrypted-message.txt').read_text(encoding='utf-8')=='OpenPGP desktop round trip'
assert not (root/'cancelled-output.bin').exists(),'Cancelled output was published'
assert not list(root.glob('.splatworks-*')),'Unfinished output remains after normal shutdown'
print(f'Native report and actual PDF/encrypted/restored output verified: {root}')
