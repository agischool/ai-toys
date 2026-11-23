"""Prevent the homepage and series directories from hiding interactive reading again."""
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
SERIAL = ROOT / '青少年AI科普连载'


class Links(HTMLParser):
    def __init__(self, page):
        super().__init__()
        self.page = page
        self.links = {}
        self.redirect = None
        self.feed(page.read_text(encoding='utf-8'))

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta' and attrs.get('http-equiv', '').lower() == 'refresh':
            self.redirect = attrs.get('content', '').partition('url=')[2]
        if tag != 'a' or 'href' not in attrs:
            return
        value = urlsplit(attrs['href'])
        if value.scheme or value.netloc:
            return
        target = (self.page.parent / unquote(value.path)).resolve() if value.path else self.page.resolve()
        for cls in attrs.get('class', '').split():
            self.links.setdefault(cls, []).append(target)


def check(page, stages):
    links = Links(page).links
    assert links.get('reading-title') == stages, f'互动标题未按顺序直达：{page}'
    assert links.get('reading-material') == [p.with_name('index.html') for p in stages], f'素材入口缺失：{page}'
    assert all(p.is_file() for p in stages), f'互动页面缺失：{page}'


def main():
    folders = sorted(p for p in SERIAL.glob('[0-9][0-9]_*') if p.is_dir())
    assert len(folders) == 24, '应有 24 篇完整互动文章'
    stages = [p / '互动版.html' for p in folders]
    home = ROOT / 'library.html'
    check(home, stages)
    expected_entries = [home, ROOT / '少年AI观察室/index.html', ROOT / 'Python实现/index.html']
    assert Links(home).links.get('site-entry') == expected_entries, '全站总览应直接展示三个内容项目'
    check(SERIAL / 'index.html', stages)
    assert stages[0] in Links(home).links.get('button', []), '首屏主按钮应直达第 01 篇互动版'
    redirect = Links(ROOT / 'index.html').redirect
    assert redirect and (ROOT / unquote(urlsplit(redirect).path)).resolve() == stages[0], '网站根地址应直接进入第一篇'
    assert urlsplit(redirect).query == 'stage', '根地址应默认进入互动分镜'
    units = json.loads((ROOT / '.site/serial_units.json').read_text())
    for unit in units:
        check(SERIAL / (unit['id'] + '.html'), stages[unit['from'] - 1:unit['to']])
    for stage in stages:
        links = Links(stage.with_name('index.html')).links
        assert stage in links.get('button', []), f'素材页应直接打开互动版：{stage.parent}'
        assert Links(stage).links.get('reader-article') == stages, f'阅读器内应有完整选篇入口：{stage}'
        assert Links(stage).links.get('reader-site') == [home, home], f'分镜与全文均应能直达全站总览：{stage}'
    for page in [ROOT / '少年AI观察室/index.html', ROOT / 'Python实现/index.html', ROOT / '.site/readmes/README.html']:
        assert Links(page).links.get('brand') == [home], f'品牌入口应返回全站总览：{page}'
    print('阅读入口检查通过：默认互动阅读，全站总览展示三个项目，24 篇分镜与全文均可返回总览')


if __name__ == '__main__':
    main()
