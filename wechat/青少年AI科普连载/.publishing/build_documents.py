from pathlib import Path
import re, json, html, base64, sys
from urllib.parse import quote
from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from PIL import Image

ROOT=Path(__file__).resolve().parent.parent
dirs=sorted(p for p in ROOT.iterdir() if p.is_dir() and re.match(r'^\d\d_',p.name))
titles=json.loads((ROOT/'.publishing/titles.json').read_text())
escape=html.escape
summaries={}
for line in (ROOT/'公众号发布信息总表.md').read_text().splitlines():
    if re.match(r'\| \d\d \|',line):
        f=line.split('|');summaries[int(f[1])]=f[3].strip()

def font(style,size,bold=False,color='000000'):
    style.font.name='Noto Sans CJK SC';style.font.size=Pt(size);style.font.bold=bold
    style.font.color.rgb=RGBColor.from_string(color)
    rf=style.element.get_or_add_rPr().rFonts
    for attr in list(rf.attrib):
        if 'Theme' in attr:del rf.attrib[attr]
    rf.set(qn('w:eastAsia'),'Noto Sans CJK SC')

def inline(text):
    return re.sub(r'(〔[\d,]+〕)',r'<span style="color:#b15b21;">\1</span>',escape(text))

for i,d in enumerate(dirs,1):
    if len(sys.argv)>1 and str(i) not in sys.argv[1:]:continue
    text=(d/'公众号_排版用.md').read_text()
    doc=Document()
    for border in doc.styles.element.xpath('.//w:pBdr'):
        border.getparent().remove(border)
    section=doc.sections[0];section.page_width=Cm(21);section.page_height=Cm(29.7)
    section.top_margin=Cm(1.7);section.bottom_margin=Cm(1.7);section.left_margin=Cm(1.9);section.right_margin=Cm(1.9)
    font(doc.styles['Normal'],10.5)
    doc.styles['Normal'].paragraph_format.line_spacing=Pt(16.5)
    doc.styles['Normal'].paragraph_format.space_after=Pt(7)
    doc.styles['Normal'].paragraph_format.widow_control=True
    for name,size in [('Title',22),('Heading 1',14),('Heading 2',12)]:
        font(doc.styles[name],size,True)
        doc.styles[name].paragraph_format.space_before=Pt(12 if name!='Title' else 0)
        doc.styles[name].paragraph_format.space_after=Pt(8)
        doc.styles[name].paragraph_format.keep_with_next=True
    font(doc.styles['Caption'],9,False,'4B5563')
    doc.styles['Caption'].paragraph_format.space_after=Pt(9)
    font(doc.styles['Quote'],10,False,'334155')
    doc.styles['Quote'].font.italic=False
    doc.styles['Quote'].paragraph_format.line_spacing=Pt(16.5)
    doc.styles['Quote'].paragraph_format.space_after=Pt(8)
    for style in (doc.styles['Normal'],doc.styles['Title'],doc.styles['Heading 1'],doc.styles['Heading 2'],doc.styles['Quote'],doc.styles['Caption']):
        snap=OxmlElement('w:snapToGrid');snap.set(qn('w:val'),'0');style.element.get_or_add_pPr().append(snap)
    doc.core_properties.title=titles[i-1];doc.core_properties.subject='青少年 AI 科普连载';doc.core_properties.author=''
    doc.add_paragraph(f'青少年 AI 科普连载 · {i:02d} / 16').runs[0].font.size=Pt(9)
    blocks=[];references=False
    for raw in text.splitlines():
        line=raw.strip()
        if not line:continue
        if line.startswith('# '):
            title=line[2:]
            doc_title=re.sub(r'[“”「」]','',re.sub(r'[？?：:，,]',' ',title)).strip()
            doc.add_paragraph(doc_title,'Title')
            blocks.append(f'<section style="background:#14304A;color:#ffffff;padding:23px 20px;margin-bottom:26px;border-radius:6px;"><p style="font-size:12px;color:#BAD3E7;margin:0 0 12px;">青少年 AI 科普连载 · {i:02d} / 16</p><h1 style="font-size:25px;line-height:1.45;margin:0;">{escape(title)}</h1></section>')
        elif line.startswith('## '):
            heading=line[3:];references=heading=='资料来源'
            doc.add_paragraph(heading,'Heading 1')
            blocks.append(f'<h2 style="font-size:20px;line-height:1.5;color:#14304A;margin:32px 0 16px;font-weight:700;">{escape(heading)}</h2>')
        elif line.startswith('!['):
            name=re.fullmatch(r'!\[.*?\]\((.*?)\)',line).group(1);p=d/name
            w,h=Image.open(p).size
            max_height=3.5 if i==7 and name.startswith('02_') else (4.6 if i==11 and name.startswith('02_') else 5.7)
            dw=min(3.25,max_height*w/h)
            par=doc.add_paragraph();par.alignment=WD_ALIGN_PARAGRAPH.CENTER
            par.paragraph_format.line_spacing=1
            par.paragraph_format.keep_with_next=True
            par.paragraph_format.space_before=Pt(7);par.paragraph_format.space_after=Pt(4)
            run=par.add_run();shape=run.add_picture(str(p),width=Inches(dw))
            shape._inline.docPr.set('descr',p.stem)
            data=base64.b64encode(p.read_bytes()).decode()
            blocks.append(f'<p style="text-align:center;margin:24px 0 8px;"><img alt="{escape(p.stem)}" src="data:image/png;base64,{data}" style="width:100%;max-width:420px;height:auto;display:block;margin:0 auto;"/></p>')
        elif line.startswith('*') and line.endswith('*'):
            caption=line.strip('*')
            par=doc.add_paragraph(caption,'Caption');par.alignment=WD_ALIGN_PARAGRAPH.CENTER
            blocks.append(f'<p style="font-size:14px;line-height:1.65;color:#606b78;margin:0 0 24px;">{inline(caption)}</p>')
        elif line.startswith('> '):
            value=line[2:];p=doc.add_paragraph(value,'Quote')
            shading=OxmlElement('w:shd');shading.set(qn('w:fill'),'EEF2FB');p._p.get_or_add_pPr().append(shading)
            blocks.append(f'<section style="padding:14px 16px;background:#eef2fb;color:#334155;margin:22px 0;font-size:15px;line-height:1.8;">{inline(value)}</section>')
        elif line.startswith('https://'):
            p=doc.add_paragraph(line);p.paragraph_format.space_after=Pt(5);p.paragraph_format.line_spacing=Pt(11)
            for run in p.runs:run.font.size=Pt(8);run.font.color.rgb=RGBColor.from_string('265AAC')
            blocks.append(f'<p style="font-size:13px;line-height:1.65;word-break:break-all;overflow-wrap:anywhere;margin:4px 0 18px;"><a href="{escape(line)}" style="color:#265AAC;">{escape(line)}</a></p>')
        else:
            p=doc.add_paragraph(line)
            if references:
                p.paragraph_format.keep_with_next=True
                p.paragraph_format.line_spacing=Pt(12)
                p.paragraph_format.space_after=Pt(4)
                for run in p.runs:run.font.size=Pt(9)
            blocks.append(f'<p style="font-size:{14 if references else 17}px;line-height:{1.75 if references else 1.85};color:#303741;margin:0 0 18px;overflow-wrap:break-word;">{inline(line)}</p>')
    doc.save(next(d.glob('*.docx')))
    article='\n'.join(blocks)
    wrapper=f'''<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{escape(titles[i-1])}</title></head><body style="margin:0;background:#f2f3f5;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;">
<main style="max-width:680px;margin:0 auto;padding:18px 16px 40px;background:white;">
<aside style="background:#fff8ec;color:#66502c;padding:14px;font-size:14px;line-height:1.7;margin-bottom:20px;">
<a href="../发布入口.html">返回篇目目录</a>　<button onclick="selectArticle()" style="font-size:15px;padding:7px 14px;">选中正文</button><p style="margin-bottom:0;">选中后按⌘C或Ctrl+C，再到公众号编辑器粘贴。检查图片是否上传，并发送手机预览；未上传的图片请手动插入同目录PNG。</p></aside>
<section id="article">{article}</section></main>
<script>function selectArticle(){{const r=document.createRange();r.selectNodeContents(document.getElementById('article'));const s=window.getSelection();s.removeAllRanges();s.addRange(r);}}</script></body></html>'''
    (d/'公众号_排版.html').write_text(wrapper)

cards=[]
for i,d in enumerate(dirs,1):
    href=quote(d.name)+'/公众号_排版.html';word=quote(d.name)+'/'+quote(next(d.glob('*.docx')).name)
    cover=quote(d.name)+'/00_封面图_横版2.35.png'
    level='含进阶内容' if i in (6,10,13) else '基础阅读'
    cards.append(f'<article><a href="{href}"><img src="{cover}" alt="第{i}篇封面"></a><div class="copy"><small>第{i:02d}篇 · {level}</small><h2><a href="{href}">{escape(titles[i-1])}</a></h2><p>{escape(summaries[i])}</p><nav><a href="{href}">打开排版稿</a><a href="{word}">Word 文件</a><a href="{quote(d.name)}/公众号_排版用.md">Markdown 源文</a></nav></div></article>')
index='''<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>青少年 AI 科普连载 · 发布入口</title><style>*{box-sizing:border-box}body{margin:0;background:#f2f3f5;color:#263445;font:16px/1.75 -apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif}main{max-width:1100px;margin:auto;padding:36px 20px}h1{font-size:30px;line-height:1.4}header{margin-bottom:30px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}article{background:white;border-radius:10px;overflow:hidden}img{width:100%;display:block}.copy{padding:20px}small{color:#5d6d7f}h2{font-size:21px;line-height:1.45;margin:10px 0}a{color:#174776;text-decoration:none}nav{display:flex;gap:18px;flex-wrap:wrap;font-size:14px}p{margin:10px 0 18px}aside{background:#fff8ec;padding:16px;border-radius:7px}footer{margin-top:30px}@media(max-width:650px){.grid{grid-template-columns:1fr}main{padding:20px 14px}}</style></head><body><main><header><small>2026-10-09 图文精修版 · 全16篇</small><h1>青少年 AI 科普连载</h1><p>从认猫开始，逐步看懂模型怎样学习、生成与接受核查。主线面向初中及以上读者，无需编程基础。</p><aside>打开当篇排版稿 → 点击“选中正文” → 复制到公众号编辑器。发布前检查图片上传情况，并发送手机预览。第6、10、13篇含进阶内容。</aside></header><div class="grid">'''+''.join(cards)+'''</div><footer><a href="配图总览.html">新版配图总览</a> · <a href="公众号发布信息总表.md">查看标题、摘要与发布说明</a> · <a href="阅读说明与篇目索引.txt">阅读说明</a> · <a href="修订说明.txt">修订说明与备份位置</a></footer></main></body></html>'''
(ROOT/'发布入口.html').write_text(index)
print('Built 16 HTML previews, 16 DOCX files and publishing index')
