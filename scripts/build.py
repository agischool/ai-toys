"""Rebuild the ten-chapter static site and deterministic Python downloads, without npm deps."""
from pathlib import Path
import hashlib
import json
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'source' / 'web'
PYTHON = ROOT / 'source' / 't1_python'
SERIES = ROOT / 'source' / 'series_python'
DOCS = ROOT / 'docs'
PYTHON_SUFFIXES = {'.py', '.md', '.txt', '.json'}
IGNORED_PARTS = {'__pycache__', '.venv', 'outputs', 'node_modules'}


def python_files():
    for path in sorted(PYTHON.rglob('*')):
        rel = path.relative_to(PYTHON)
        if path.is_file() and path.suffix in PYTHON_SUFFIXES and not IGNORED_PARTS.intersection(rel.parts):
            if path.is_symlink():
                raise ValueError(f'Symlinks are not supported: {rel}')
            yield path, rel


def main():
    DOCS.mkdir(exist_ok=True)
    for path in sorted(WEB.iterdir()):
        if path.is_file() and path.suffix in {'.html', '.css', '.js', '.svg'}:
            shutil.copyfile(path, DOCS / path.name)
    fixtures = json.loads((PYTHON / 'fixtures.json').read_text(encoding='utf-8'))
    browser_fixtures = {key: fixtures[key] for key in ('version', 'seeds', 'counts', 'datasets')}
    (DOCS / 'fixture-data.js').write_text('export default ' + json.dumps(browser_fixtures, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    (DOCS / '.nojekyll').write_text('', encoding='utf-8')
    with zipfile.ZipFile(DOCS / 't1-sample-python.zip', 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path, rel in python_files():
            info = zipfile.ZipInfo('t1_python/' + rel.as_posix(), date_time=(2026, 10, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    # Preserve the complete previously verified NumPy implementation and its
    # measured artifacts. Reproducible ZIP metadata, no caches or virtualenvs.
    with zipfile.ZipFile(DOCS / 'ai-toys-python.zip', 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(SERIES.rglob('*')):
            rel = path.relative_to(SERIES)
            if not path.is_file() or IGNORED_PARTS.difference({'outputs'}).intersection(rel.parts) or path.suffix == '.pyc':
                continue
            if path.is_symlink():
                raise ValueError(f'Symlinks are not supported: {rel}')
            info = zipfile.ZipInfo('ai_toy_series/' + rel.as_posix(), date_time=(2026, 10, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    manifest = []
    for folder in (ROOT / 'source', ROOT / 'tests', ROOT / 'scripts', DOCS):
        for path in sorted(folder.rglob('*')):
            rel = path.relative_to(ROOT)
            if path.is_file() and not IGNORED_PARTS.difference({'outputs'}).intersection(rel.parts) and path.suffix != '.pyc':
                manifest.append((rel.as_posix(), hashlib.sha256(path.read_bytes()).hexdigest()))
    for name in ('.gitignore', 'README.md', 'VALIDATION.md', 'SCIENCE_REVIEW.md', 'package.json'):
        if (ROOT / name).exists():
            manifest.append((name, hashlib.sha256((ROOT / name).read_bytes()).hexdigest()))
    (ROOT / 'MANIFEST.sha256').write_text(''.join(f'{digest}  {name}\n' for name, digest in sorted(manifest)), encoding='utf-8')
    print(f'Built docs/ with {len(list(python_files()))} Python download files')


if __name__ == '__main__':
    main()
