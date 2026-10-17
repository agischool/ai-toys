"""Validate the review delivery, local references and retained illustrations."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
from collections import defaultdict
import hashlib, json, re, zipfile
ROOT = Path(__file__).resolve().parent.parent
RECORDS = ROOT / '制作记录'
episodes = sorted(p for p in ROOT.glob('[0-9][0-9]_*') if p.is_dir())
assert len(episodes) == 16
class References(HTMLParser):
    def __init__(self):
        super().__init__(); self.refs = []
    def handle_starttag(self, tag, attrs):
        self.refs.extend(v for k, v in attrs if k in ('href', 'src') and v)
def local_refs(text):
    parser = References(); parser.feed(text)
    refs = parser.refs + re.findall(r'url\([\'"]?([^\)\'\"]+)', text)
    return [unquote(urlsplit(v).path) for v in refs if not urlsplit(v).scheme and not v.startswith('#')]
html_files = [ROOT/'发布入口.html'] + [p for ep in episodes for p in ep.glob('*.html')]
local_count = 0
for p in html_files:
    for ref in local_refs(p.read_text()):
        assert (p.parent / ref).is_file(), (p, ref)
        local_count += 1
before = json.loads((RECORDS/'历史版本/打磨前_20261011_SHA256.json').read_text())
for ep in episodes:
    p = ep/'发布图片/01.png'
    assert hashlib.sha256(p.read_bytes()).hexdigest() == before[str(p.relative_to(ROOT))]
    source = next((RECORDS/'原文只读副本').glob(ep.name[:2]+'_*.md'))
    bibliography = source.read_text().split('## 资料来源', 1)[1].strip()
    assert bibliography in (ep/'资料来源.txt').read_text()
    assert bibliography in (ep/'发布文案.txt').read_text()
    assert '状态：审阅稿，未发布' in (ep/'发布文案.txt').read_text()
    page = (ep/'公众号图文预览.html').read_text()
    assert page.count('class="figure-text"') == 5
    assert page.count('class="answer"') == 1
    assert '<details open' not in page
boxes = json.loads((RECORDS/'全套排版检查.json').read_text())['text_boxes']
boxes += [dict(b, episode=2) for b in json.loads((ROOT/'02_满分就学会了吗/排版检查.json').read_text())['text_boxes']]
by_page = defaultdict(list)
for b in boxes:
    x0, y0, x1, y1 = b['bbox']
    assert 0 <= x0 <= x1 <= 1440 and 0 <= y0 <= y1 <= 1920, b
    by_page[b['episode'], b['page']].append(b)
for page, items in by_page.items():
    for i, a in enumerate(items):
        for b in items[i+1:]:
            ax, ay, ar, ab = a['bbox']; bx, by, br, bb = b['bbox']
            assert min(ar, br) <= max(ax, bx) or min(ab, bb) <= max(ay, by), (page, a, b)
assert len(by_page) == 64
root_names = ['打磨记录_20261011.txt','发布入口.html','发布说明.txt','发布信息总表.tsv','16期封面总览.jpg','系列策划.txt']
episode_names = ['公众号主封面_21x9.png','公众号分享封面_1x1.png','封面预览.html','发布文案.txt','图片文字稿.txt','资料来源.txt','公众号图文预览.html','五张图总览.jpg']
expected = set(root_names)
for ep in episodes:
    expected.update(f'{ep.name}/{name}' for name in episode_names)
    expected.update(f'{ep.name}/发布图片/{n:02d}.png' for n in range(1, 6))
package = ROOT/'公众号预热贴图_16期审阅包.zip'
with zipfile.ZipFile(package) as z:
    assert len(z.namelist()) == len(expected) == 214
    assert set(z.namelist()) == expected
    assert z.testzip() is None
    for name in z.namelist():
        data = z.read(name)
        assert data == (ROOT/name).read_bytes(), name
        if name.endswith('.html'):
            for ref in local_refs(data.decode()):
                target = (ROOT/Path(name).parent/ref).resolve().relative_to(ROOT)
                assert str(target) in expected, (name, ref)
report = dict(passed=True, html_files=len(html_files), local_references=local_count,
              inner_pages=len(by_page), text_boxes=len(boxes), text_box_overlaps=0,
              original_illustrations_unchanged=16, original_bibliographies_preserved=16,
              figure_descriptions=80, reference_answers=16,
              zip_files=len(expected), zip_matches_workspace=True,
              zip_sha256=hashlib.sha256(package.read_bytes()).hexdigest(),
              published=False, external_links_rechecked=False)
(RECORDS/'审阅核查_20261011.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False))
