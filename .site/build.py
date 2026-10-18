"""Build all three project entrypoints and collect the repository checksums."""
from pathlib import Path
import hashlib
import subprocess
import sys
import build_library

ROOT = Path(__file__).resolve().parents[1]
PYTHON = ROOT / 'Python实现'


def main():
    subprocess.run([sys.executable, str(PYTHON / 'scripts/build.py')], check=True)
    pages = build_library.build()
    manifest = []
    for entry in (PYTHON / 'MANIFEST.sha256').read_text(encoding='utf-8').splitlines():
        digest, name = entry.split('  ', 1)
        manifest.append(('Python实现/' + name, digest))
    files = [*pages, *[p for p in (ROOT / '.site').iterdir() if p.is_file()],
             PYTHON / 'MANIFEST.sha256', ROOT / 'README.md', ROOT / 'package.json',
             ROOT / '.gitignore', ROOT / '.nojekyll']
    for slug, _, _, _ in build_library.SERIES:
        files.append(ROOT / slug / 'README.md')
    for path in files:
        manifest.append((path.relative_to(ROOT).as_posix(), hashlib.sha256(path.read_bytes()).hexdigest()))
    (ROOT / 'MANIFEST.sha256').write_text(''.join(f'{digest}  {name}\n' for name, digest in sorted(manifest)), encoding='utf-8')
    print(f'Built {len(pages)} pages for three parallel projects')


if __name__ == '__main__':
    main()
