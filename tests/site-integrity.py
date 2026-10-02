"""Dependency-free static link and downloadable-source integrity checks."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import hashlib
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs'
class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(); self.ids=[]; self.links=[]; self.controls=[]; self.labels=[]
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if 'id' in attrs:self.ids.append(attrs['id'])
        for key in ('href','src'):
            if key in attrs:self.links.append(attrs[key])
        if tag in ('input','select','textarea'):self.controls.append(attrs)
        if tag=='label' and 'for' in attrs:self.labels.append(attrs['for'])
pages={path.name:Page(path.read_text()) for path in DOCS.glob('*.html')}
assert set(pages)=={'index.html','chapters.html',*(f't{i}.html' for i in range(2,11))}
links=0
for name,page in pages.items():
    assert len(page.ids)==len(set(page.ids)),f'{name}: duplicate IDs'
    for link in page.links:
        u=urlsplit(link)
        if u.scheme or u.netloc:continue
        assert not u.path.startswith('/'),f'{name}: project-subpath-breaking URL {link}'
        target=DOCS/unquote(u.path or name)
        assert target.is_file(),f'{name}: missing {link}'
        if u.fragment and target.suffix=='.html':
            assert unquote(u.fragment) in pages[target.name].ids,f'{name}: missing fragment {link}'
        links+=1
    for control in page.controls:
        assert control.get('id') in page.labels or control.get('aria-label') or control.get('aria-labelledby'),f'{name}: unlabeled control {control}'
for path in (ROOT/'source'/'web').iterdir():
    if path.is_file() and path.suffix in {'.html','.css','.js','.svg'}:
        assert path.read_bytes()==(DOCS/path.name).read_bytes(),f'stale build: {path.name}'
for path in DOCS.glob('*.js'):
    for dep in re.findall(r"(?:from\s*|import\s*)[\"'](\.[^\"']+)[\"']",path.read_text()):
        assert (path.parent/dep).is_file(),f'{path.name}: missing module {dep}'
for zipname,source,prefix in [('t1-sample-python.zip','t1_python','t1_python'),('ai-toys-python.zip','series_python','ai_toy_series')]:
    with zipfile.ZipFile(DOCS/zipname) as z:
        assert z.testzip() is None
        assert len(z.namelist())==len(set(z.namelist()))
        for name in z.namelist():
            rel=Path(name).relative_to(prefix)
            assert '..' not in rel.parts
            assert z.read(name)==(ROOT/'source'/source/rel).read_bytes(),name
        if source=='series_python':
            assert len([n for n in z.namelist() if '/toys/t' in n and n.endswith('.py')])==10
            assert any(n.endswith('/tests/test_t10_mdl.py') for n in z.namelist())
            assert any(n.endswith('/outputs/t08/metrics.json') for n in z.namelist())
for path in (ROOT/'source'/'series_python').rglob('*.md'):
    for link in re.findall(r'\[[^\]]*\]\(([^)]+)\)',path.read_text()):
        url=urlsplit(link)
        if url.scheme or url.netloc or not url.path:continue
        assert (path.parent/unquote(url.path)).exists(),f'{path}: missing Markdown target {link}'
print(f'PASS: {len(pages)} HTML pages, {links} internal links/resources, labels, unique IDs, ZIP CRC and source-byte equality')
