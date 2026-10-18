"""Stage the published site, including hidden runtime assets, and reject broken links."""
import argparse
from html.parser import HTMLParser
from pathlib import Path
import shutil
import subprocess
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
PROJECTS = {'Python实现', '少年AI观察室', '青少年AI科普连载'}
ROOT_FILES = {'index.html', 'README.md', '.nojekyll'}
RUNTIME_FILES = {'.site/library.css', '.site/library.js'}


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.links = []
        self.ids = set()
        self.feed(path.read_text(encoding='utf-8'))

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.add(attrs['id'])
        for key in ('href', 'src'):
            value = attrs.get(key)
            if value is not None and not urlsplit(value).scheme and not urlsplit(value).netloc:
                self.links.append(value)


def validate_site(destination):
    required = [*ROOT_FILES, *RUNTIME_FILES, '.site/readmes/README.html']
    for name in PROJECTS:
        required.extend([f'{name}/index.html', f'.site/readmes/{name}/README.html'])
    for name in required:
        if not (destination / name).is_file():
            raise ValueError(f'Missing required site file: {name}')
    # source/web holds build templates; their downloadable assets are assembled
    # in docs/. Validate the rendered pages, not those source templates.
    pages = {path.resolve(): Page(path) for path in destination.rglob('*.html')
             if path.relative_to(destination).parts[:3] != ('Python实现', 'source', 'web')}
    links = 0
    for path, page in pages.items():
        for value in page.links:
            url = urlsplit(value)
            if url.path.startswith('/'):
                raise ValueError(f'URL breaks the repository subpath: {path}: {value}')
            target = (path.parent / unquote(url.path)).resolve() if url.path else path
            if not target.is_relative_to(destination) or not target.exists():
                raise ValueError(f'Broken local resource: {path}: {value}')
            if url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
                raise ValueError(f'Broken HTML anchor: {path}: {value}')
            links += 1
    if (destination / '.git').exists() or (destination / '.github').exists():
        raise ValueError('Git internals must not be published')
    print(f'Validated {len(pages)} HTML pages and {links} local resources/anchors')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('destination', type=Path, help='New staging folder outside this checkout')
    args = parser.parse_args()
    destination = args.destination.resolve()
    if destination.is_relative_to(ROOT):
        parser.error('Use a new temporary directory outside this checkout')
    destination.mkdir(parents=True, exist_ok=False)
    tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode('utf-8').split('\0')
    count = 0
    for name in filter(None, tracked):
        rel = Path(name)
        publish = (name in ROOT_FILES or name in RUNTIME_FILES
                   or name.startswith('.site/readmes/') or rel.parts[0] in PROJECTS)
        if not publish or any(part in {'.gitignore', '__pycache__', '.DS_Store'} for part in rel.parts):
            continue
        source = ROOT / rel
        if source.is_symlink() or not source.is_file():
            raise ValueError(f'Expected a regular tracked file: {name}')
        target = destination / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        count += 1
    validate_site(destination)
    print(f'Staged {count} files at {destination}')


if __name__ == '__main__':
    main()
