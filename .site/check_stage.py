"""Check complete storyboards, reproducible HTML, resource paths and the stage size budget."""
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import subprocess
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
SERIAL = ROOT / '青少年AI科普连载'
HTML_LIMIT = 512 * 1024


class Page(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.resources = []
        self.links = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'a' and attrs.get('href'):
            self.links.append(attrs['href'])
        for key in ('src', 'href'):
            if attrs.get(key) and not (tag == 'a' and key == 'href'):
                self.resources.append(attrs[key])


def main():
    boards = sorted(SERIAL.glob('[0-9][0-9]_*/分镜.json'))
    if not boards:
        raise AssertionError('No storyboards found')
    # Compile in memory: testing must detect stale output, never silently repair it.
    script = """
const fs = require('node:fs'), crypto = require('node:crypto');
const { compileOne } = require('./.site/render_stage.cjs');
const folders = JSON.parse(fs.readFileSync(0, 'utf8'));
process.stdout.write(JSON.stringify(folders.map(folder => {
  const { html, ...stats } = compileOne(folder);
  return { ...stats, hash: crypto.createHash('sha256').update(html).digest('hex') };
})));
"""
    results = json.loads(subprocess.check_output(
        ['node', '-e', script], input=json.dumps([p.parent.name for p in boards]).encode(), cwd=ROOT))
    for board, result in zip(boards, results):
        assert result['complete'], f'Incomplete storyboard: {board}'
        assert result['consumed'] == result['total'], f'Missing source units: {board}'
        output = board.with_name('互动版.html')
        raw = output.read_bytes()
        assert hashlib.sha256(raw).hexdigest() == result['hash'], f'Stale stage HTML: {output}; run npm run build'
        assert len(raw) <= HTML_LIMIT, f'Stage HTML exceeds 512 KiB: {output}'
        page = Page(raw.decode('utf-8'))
        source = board.with_name('正文.md').read_text(encoding='utf-8')
        for link in page.links:
            parsed = urlsplit(link)
            if parsed.scheme or parsed.netloc:
                assert parsed.scheme == 'https' and link in source, f'Unexpected external link: {link}'
        for value in page.resources + page.links:
            parsed = urlsplit(value)
            if parsed.scheme == 'data':
                continue
            if parsed.scheme or parsed.netloc:
                assert value in page.links, f'External runtime request: {value}'
                continue
            assert not parsed.path.startswith('/'), f'Path breaks Pages subdirectory: {value}'
            target = (output.parent / unquote(parsed.path)).resolve() if parsed.path else output
            assert target.is_relative_to(ROOT) and target.is_file(), f'Missing local resource: {value}'
        print(f"PASS: stage {board.parent.name[:2]}: {result['beats']} beats, "
              f"{result['total']}/{result['total']} source units, {len(raw) / 1024:.0f} KiB; links/resources OK")


if __name__ == '__main__':
    main()
