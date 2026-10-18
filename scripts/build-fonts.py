"""Optional font refresh: python -m pip install fonttools brotli."""
from pathlib import Path
from io import BytesIO
from fontTools.ttLib import TTFont
from fontTools import subset
import hashlib,re
root=Path(__file__).resolve().parent.parent
site=root/'dist'
font=TTFont(site/'vi/fonts/SourceHanSansCN-VF.woff2',recalcTimestamp=False)
supported=set(font.getBestCmap())
required=set(range(32,256))
for p in site.rglob('*'):
 if p.suffix in ['.html','.js','.json'] and 'vendor' not in p.parts and 'fonts' not in p.parts:
  text=p.read_text();required.update(ord(c) for c in text)
  for match in re.finditer(r'\\u(?:\{([0-9a-fA-F]+)\}|([0-9a-fA-F]{4}))',text):
   required.add(int(match.group(1) or match.group(2),16))
required &= supported
options=subset.Options();options.name_IDs=['*'];options.layout_features=['*']
subsetter=subset.Subsetter(options=options);subsetter.populate(unicodes=required);subsetter.subset(font)
for record in font['name'].names:
 if record.nameID in [1,4,6,16,21]:record.string=('OrocoaDemoHan' if record.nameID==6 else 'orocoa Demo Han').encode(record.getEncoding())
font.flavor='woff2';buffer=BytesIO();font.save(buffer);data=buffer.getvalue()
actual=set(TTFont(BytesIO(data)).getBestCmap())
assert not(required-actual),'Missing font characters'
name='DemoHan.'+hashlib.sha256(data).hexdigest()[:16]+'.woff2'
(site/'vi/fonts'/name).write_bytes(data)
p=site/'vi/fonts.css';s=p.read_text()
s=re.sub(r'(?<=/vi/fonts/)(?:SourceHanSansCN-VF|DemoHan\.[a-f0-9]+)\.woff2',name,s)
p.write_text(s)
print('Subset covers',len(required),'characters;',len(data),'bytes;',name)
