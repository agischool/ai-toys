"""从排版 HTML 导出公众号导入用 Word 文件。依赖 beautifulsoup4 和 python-docx。"""
import base64
import io
from pathlib import Path

from bs4 import BeautifulSoup
from docx import Document
from docx.shared import Inches


def main():
    output_dir = Path(__file__).resolve().parent
    series_dir = output_dir.parent / '青少年AI科普连载'
    for page in sorted(series_dir.glob('[0-9]*/*排版.html')):
        article = BeautifulSoup(page.read_text(encoding='utf-8'), 'html.parser').select_one('#article')
        if not article:
            raise ValueError(f'缺少正文: {page}')
        document = Document()
        for tag in article.find_all(['p', 'h1', 'h2', 'h3']):
            image = tag.find('img')
            if image:
                header, data = image['src'].split(',', 1)
                if not header.startswith('data:image/') or not header.endswith(';base64'):
                    raise ValueError(f'需要嵌入式图片: {page}')
                document.add_picture(io.BytesIO(base64.b64decode(data, validate=True)), width=Inches(6))
            elif tag.name.startswith('h'):
                document.add_heading(tag.get_text(), level=int(tag.name[1]))
            else:
                document.add_paragraph(tag.get_text())
        document.save(output_dir / f'{page.parent.name}.docx')


if __name__ == '__main__':
    main()
