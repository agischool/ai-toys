from pathlib import Path
from zipfile import ZipFile
from html.parser import HTMLParser
from docx import Document
import re,json,hashlib,base64

root=Path(__file__).resolve().parent.parent
class ArticleParser(HTMLParser):
    def __init__(self):super().__init__();self.active=False;self.depth=0;self.text=[];self.images=[]
    def handle_starttag(self,tag,attrs):
        at=dict(attrs)
        if tag=='section' and at.get('id')=='article':self.active=True;self.depth=1;return
        if not self.active:return
        if tag=='section':self.depth+=1
        if tag=='img':self.images.append(at['src'])
    def handle_endtag(self,tag):
        if self.active and tag=='section':
            self.depth-=1
            if self.depth==0:self.active=False
    def handle_data(self,data):
        if self.active:self.text.append(data)
def norm(s):return re.sub(r'\s+','',s)
records=[]
for d in sorted(root.glob('[0-9][0-9]_*')):
    md=(d/'公众号_排版用.md').read_text();lines=[x.strip() for x in md.splitlines() if x.strip()]
    body=[re.sub(r'^## |^> ','',x).strip('*') for x in lines if not x.startswith(('# ','!['))]
    doc=Document(next(d.glob('*.docx')))
    actual=[p.text for p in doc.paragraphs if p.text][2:]
    assert actual==body,(d.name,'docx mismatch')
    parser=ArticleParser();parser.feed((d/'公众号_排版.html').read_text())
    htmlbody=norm(''.join(parser.text))
    series=norm(f'青少年 AI 科普连载 · {d.name[:2]} / 16')
    expected=series+norm(lines[0][2:])+norm(''.join(body))
    assert htmlbody==expected,(d.name,'html mismatch')
    image_names=re.findall(r'!\[.*?\]\((.*?)\)',md)
    assert len(image_names)==len(parser.images)==len(doc.inline_shapes)
    for name,src in zip(image_names,parser.images):
        assert (d/name).read_bytes()==base64.b64decode(src.split(',',1)[1])
    with ZipFile(next(d.glob('*.docx'))) as z:
        hashes={hashlib.sha256(z.read(n)).hexdigest() for n in z.namelist() if n.startswith('word/media/')}
        assert all(hashlib.sha256((d/name).read_bytes()).hexdigest() in hashes for name in image_names)
    main,refs=md.split('## 资料来源')
    used={int(n) for group in re.findall(r'〔([\d,]+)〕',main) for n in group.split(',')}
    defined={int(n) for n in re.findall(r'〔(\d+)〕',refs)}
    assert used==defined,(d.name,used,defined)
    records.append({'article':d.name[:2],'text_agrees':True,'images_agree':True,'references_agree':True,'figures':len(image_names),'body_hanzi':len(re.findall(r'[\u4e00-\u9fff]',main))})
for line in (root/'公众号发布信息总表.md').read_text().splitlines():
    if re.match(r'\| \d\d \|',line):assert len(line.split('|')[3].strip())<=120
(root/'.publishing/content_checks.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
print('PASS: all 16 article texts, image bytes, citation numbering and summary lengths')
