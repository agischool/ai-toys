"""Generate file://-friendly publication pages from the existing Markdown and PNGs."""
from html import escape
from pathlib import Path
from urllib.parse import quote
import os
import re

ROOT = Path(__file__).resolve().parents[1]
WECHAT = ROOT / 'wechat'
SERIES = (
    ('少年AI观察室', '少年 AI 观察室', '用 5 张图，沿着一条计算路线观察 AI。', '正文'),
    ('青少年AI科普连载', '青少年 AI 科普连载', '从认猫开始，逐篇读懂 AI 的计算、训练与边界。', '摘要'),
)


def url(page, target):
    return quote(os.path.relpath(target, page.parent).replace(os.sep, '/'), safe='/')


def link(page, target, label, css=''):
    return f'<a class="{css}" href="{url(page, target)}">{escape(label)}</a>'


def read_posts(folder):
    posts = []
    for directory in sorted(folder.iterdir()):
        if not directory.is_dir() or not re.match(r'^\d{2}_', directory.name):
            continue
        text = (directory / '发布文案.md').read_text(encoding='utf-8')
        fields = dict(re.findall(r'^## ([^\n]+)\n+```text\n(.*?)\n```', text, re.M | re.S))
        if set(fields) not in ({'标题', '正文'}, {'标题', '摘要'}):
            raise ValueError(f'Unexpected publication fields: {directory}')
        covers = sorted(directory.glob('*横版*.png')) or sorted(directory.glob('*主封面*.png'))
        if len(covers) != 1:
            raise ValueError(f'Expected one wide cover: {directory}')
        posts.append({'directory': directory, 'number': directory.name[:2],
                      'title': fields['标题'], 'fields': fields, 'cover': covers[0]})
    if len(posts) != 16:
        raise ValueError(f'Expected 16 posts: {folder}, got {len(posts)}')
    return posts


def write_page(page, title, eyebrow, intro, body, series=None):
    css = url(page, ROOT / 'source/library/library.css')
    js = url(page, ROOT / 'source/library/library.js')
    nav = link(page, ROOT / 'index.html', '首页') + link(page, WECHAT / 'index.html', '公众号')
    if series:
        nav += link(page, series / 'index.html', '本系列目录')
    else:
        nav += link(page, ROOT / 'docs/chapters.html', '互动实验')
    readme = page.parent / 'README.md'
    footer = link(page, readme if readme.exists() else page.parent / '发布文案.md', '查看 Markdown 原稿', 'text-link')
    page.write_text(f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(title)} · 看得见的 AI</title><meta name="description" content="{escape(intro, quote=True)}">
<link rel="stylesheet" href="{css}"><script src="{js}" defer></script></head>
<body><header><div class="header-inner">{link(page, ROOT / 'index.html', '◉  看得见的 AI', 'brand')}<nav aria-label="主导航">{nav}</nav></div></header>
<main><section class="hero"><p class="eyebrow">{escape(eyebrow)}</p><h1>{escape(title)}</h1><p class="intro">{escape(intro)}</p></section>
{body}</main><footer><span>看得见的 AI · 阅读与发布材料</span>{footer}</footer></body></html>
''', encoding='utf-8')


def series_card(page, folder, name, description, posts):
    return f'''<article class="card"><a href="{url(page, folder / 'index.html')}"><img src="{url(page, posts[0]['cover'])}" alt="{escape(name)}首期封面" loading="lazy"><div class="card-body"><p class="meta">16 期 · {'五图观察' if '观察' in name else '长文阅读'}</p><h2>{escape(name)}</h2><p>{escape(description)}</p><span class="go">进入系列 →</span></div></a></article>'''


def copy_panel(label, value, index):
    rows = min(19, max(4, len(value.splitlines()) + 2))
    return f'''<section class="copy-panel"><div class="copy-head"><h2><label for="copy-{index}">{escape(label)}</label></h2><button type="button" class="button" data-copy="copy-{index}" data-status="status-{index}">复制{escape(label)}</button></div><textarea id="copy-{index}" readonly rows="{rows}" spellcheck="false">{escape(value)}</textarea><p class="hint" id="status-{index}" role="status" aria-live="polite">复制后粘贴到公众号{ '描述' if label == '正文' else label }栏。</p></section>'''


def figure(page, path, title):
    href = url(page, path)
    return f'''<figure class="figure"><a href="{href}"><img src="{href}" alt="{escape(title)}" loading="lazy"></a><figcaption><span>{escape(title)}</span><a class="text-link" href="{href}" download="{escape(path.name)}">保存图片</a></figcaption></figure>'''


def build():
    catalog = [(WECHAT / slug, name, description, field, read_posts(WECHAT / slug))
               for slug, name, description, field in SERIES]
    page = ROOT / 'index.html'
    cards = ''.join(series_card(page, folder, name, desc, posts) for folder, name, desc, _, posts in catalog)
    body = f'<div class="section-head"><h2>公众号系列</h2><span class="meta">2 个系列 · 32 期内容</span></div><div class="grid two">{cards}</div>'
    body += f'''<div class="section-head"><h2>动手看一遍计算</h2><span class="meta">T1—T10</span></div><div class="grid two"><article class="card experiment"><a href="{url(page, ROOT / 'docs/chapters.html')}"><div class="experiment-art" aria-hidden="true">输入 <span>→</span> 计算 <span>→</span> 输出</div><div class="card-body"><h2>十个互动实验</h2><p>调整参数、观察结果，从线性回归走到注意力与最小描述长度。</p><span class="go">打开实验目录 →</span></div></a></article><article class="card"><div class="card-body"><p class="meta">NUMPY · PYTHON</p><h2>沿着代码继续探索</h2><p>阅读实现说明，下载十个完整实验、测试与随包实测输出。</p><div class="actions">{link(page, ROOT / 'source/series_python/README.md', '阅读说明', 'button secondary')}{link(page, ROOT / 'docs/ai-toys-python.zip', '下载 Python 包', 'button secondary')}</div></div></article></div>'''
    write_page(page, '理解 AI，从一张图开始。', '看得见的 AI / 内容首页', '读图、读文章，也亲手调整参数。选择一套系列开始阅读，或进入每期页面准备发布。', body)
    page = WECHAT / 'index.html'
    cards = ''.join(series_card(page, folder, name, desc, posts) for folder, name, desc, _, posts in catalog)
    body = f'<div class="grid two">{cards}</div><aside class="note"><h2>从阅读到发布</h2><p>进入一期，复制标题和正文或摘要，再保存所需图片。长文章使用原有排版页复制正文，粘贴后核对图片并发送手机预览。</p></aside>'
    write_page(page, '公众号内容目录', '阅读 / 预览 / 复制', '两套系列各 16 期。每期文案、正文图和封面集中在同一个发布页。', body)
    generated = [ROOT / 'index.html', page]
    for folder, name, description, field, posts in catalog:
        page = folder / 'index.html'
        cards = []
        for post in posts:
            entry = escape(post['number'] + ' ' + post['title'], quote=True)
            cards.append(f'''<article class="card" data-entry="{entry}"><a href="{url(page, post['directory'] / 'index.html')}"><img src="{url(page, post['cover'])}" alt="第 {post['number']} 期封面" loading="lazy"><div class="card-body"><p class="meta">第 {post['number']} 期</p><h2>{escape(post['title'])}</h2><span class="go">阅读与发布 →</span></div></a></article>''')
        body = '<div class="toolbar"><div class="search"><label for="search">查找一期</label><input type="search" id="search" data-search placeholder="输入标题关键词或期号" autocomplete="off"></div><span class="meta" id="result-count" role="status">16 / 16 期</span></div><div class="grid">' + ''.join(cards) + '</div><p class="empty" id="empty-state" hidden>没有找到匹配内容，请换个关键词。</p>'
        write_page(page, name, '系列目录 / 16 期', description, body)
        generated.append(page)
        for i, post in enumerate(posts):
            directory = post['directory']
            page = directory / 'index.html'
            body = ''
            if field == '摘要':
                body += '<div class="actions">' + link(page, directory / '公众号_排版.html', '阅读 / 复制排版正文', 'button') + link(page, directory / '正文.md', '查看正文 Markdown', 'button secondary') + '</div><p class="hint">打开排版页后点击「选中正文」，再复制到公众号正文编辑区。</p>'
            body += '<div class="section-head"><h2>发布文案</h2><span class="meta">点击按钮复制纯文本</span></div><div class="copy-grid">'
            body += copy_panel('标题', post['title'], 0) + copy_panel(field, post['fields'][field], 1) + '</div>'
            if field == '正文':
                pictures = sorted((directory / '发布图片').glob('*.png'))
            else:
                pictures = [p for p in sorted(directory.glob('*.png')) if not p.name.startswith('00_')]
            body += f'<div class="section-head"><h2>正文配图</h2><span class="meta">{len(pictures)} 张 · 点击图片查看原图</span></div><div class="gallery">'
            body += ''.join(figure(page, p, f'正文图 {n:02d}') for n, p in enumerate(pictures, 1)) + '</div>'
            square = sorted(directory.glob('*1x1.png'))
            if len(square) != 1:
                raise ValueError(f'Expected one square cover: {directory}')
            body += '<div class="section-head"><h2>封面</h2><span class="meta">横版主封面 / 方形分享封面</span></div><div class="covers">'
            body += figure(page, post['cover'], '横版主封面') + figure(page, square[0], '方形分享封面') + '</div>'
            body += '<aside class="note"><p>发布前核对本期文案和配图，按实际制作方式填写平台 AI 标识，并发送手机预览。</p></aside><nav class="pager" aria-label="期数导航">'
            body += link(page, posts[i - 1]['directory'] / 'index.html', '← 上一期：' + posts[i - 1]['title']) if i else '<span></span>'
            body += link(page, posts[i + 1]['directory'] / 'index.html', '下一期：' + posts[i + 1]['title'] + ' →') if i < len(posts) - 1 else link(page, folder / 'index.html', '返回系列目录 →')
            body += '</nav>'
            intro = '复制标题与描述，按顺序发布 5 张正文图。' if field == '正文' else '打开原有排版阅读全文，复制标题、摘要与排版正文。'
            write_page(page, post['title'], f'{name} / 第 {post["number"]} 期', intro, body, folder)
            generated.append(page)
    return generated


if __name__ == '__main__':
    print(f'Built {len(build())} reading and publishing pages')
