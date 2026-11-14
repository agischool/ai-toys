"""Check WeChat output against Markdown, publication titles and local images."""
import base64
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]


class Text(HTMLParser):
    def __init__(self, markup):
        super().__init__()
        self.text = []
        self.images = []
        self.feed(markup)

    def handle_data(self, data):
        self.text.append(data)

    def handle_starttag(self, tag, attrs):
        if tag == 'img':
            self.images.append(dict(attrs)['src'])

    def normalized(self):
        return re.sub(r'\s+', '', ''.join(self.text))


def main():
    sources = sorted((ROOT / '青少年AI科普连载').glob('[0-9][0-9]_*/正文.md'))
    if not sources:
        raise AssertionError('No article sources found')
    script = """
const fs=require('node:fs'), md=new (require('./.site/vendor/markdown-it.cjs'))({html:false,linkify:true});
const files=JSON.parse(fs.readFileSync(0,'utf8'));
process.stdout.write(JSON.stringify(files.map(f=>md.render(fs.readFileSync(f,'utf8')))));
"""
    rendered = json.loads(subprocess.check_output(
        ['node', '-e', script], input=json.dumps([str(p) for p in sources]).encode(), cwd=ROOT))
    image_count = 0
    for source, expected_html in zip(sources, rendered):
        html = source.with_name('公众号_排版.html').read_text()
        # Compare only the copyable article; the series label precedes its h1.
        body = html.split('<section id="article">', 1)[1].split('</section></main>', 1)[0]
        body = body[body.index('<h1'):]
        expected, actual = Text(expected_html), Text(body)
        if expected.normalized() != actual.normalized():
            raise AssertionError(f'Markdown/HTML text mismatch: {source}')
        if len(expected.images) != len(actual.images):
            raise AssertionError(f'Missing image: {source}')
        for local, embedded in zip(expected.images, actual.images):
            data = base64.b64decode(embedded.split(',', 1)[1], validate=True)
            if data != (source.parent / unquote(local)).read_bytes():
                raise AssertionError(f'Embedded image differs: {source}: {local}')
            image_count += 1
        title = re.search(r'^# (.+)$', source.read_text(), re.M).group(1)
        copy = source.with_name('发布文案.md').read_text()
        published_title = re.search(r'## 标题\s+```text\n(.+?)\n```', copy, re.S).group(1)
        if title != published_title:
            raise AssertionError(f'Publication title differs: {source}')
    print(f'PASS: {len(sources)} WeChat articles match Markdown and publication titles; '
          f'{image_count} embedded images match source bytes')


if __name__ == '__main__':
    main()
