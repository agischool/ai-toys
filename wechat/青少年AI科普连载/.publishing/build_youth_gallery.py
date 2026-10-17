from pathlib import Path
from urllib.parse import quote
from html import escape
import json
root=Path(__file__).resolve().parent.parent
dirs=sorted(root.glob('[0-9][0-9]_*'))
sections=[]
for i,d in enumerate(dirs,1):
    title=(d/'公众号_排版用.md').read_text().splitlines()[0][2:]
    pngs=sorted(p for p in d.glob('*.png') if not p.name.startswith('00_'))
    cover=quote(d.name)+'/00_封面图_横版2.35.png'
    square=quote(d.name)+'/00_封面图_方形1x1.png'
    imgs=''.join(f'<a href="{quote(d.name)}/{quote(p.name)}" target="_blank"><img loading="lazy" src="{quote(d.name)}/{quote(p.name)}" alt="{escape(p.stem)}"></a>' for p in pngs)
    sections.append(f'<section id="a{i}"><div class="heading"><span>{i:02d}</span><h2>{escape(title)}</h2><a href="{quote(d.name)}/公众号_排版.html">阅读文章 →</a></div><div class="covers"><a href="{cover}"><img loading="lazy" src="{cover}" alt="横版封面"></a><a href="{square}"><img loading="lazy" src="{square}" alt="方形封面"></a></div><div class="figures">{imgs}</div></section>')
    
page='''<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>青少年AI科普 · 新版配图总览</title><style>*{box-sizing:border-box}body{margin:0;background:#f7f4ec;color:#203745;font:16px/1.7 -apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif}main{max-width:1120px;margin:auto;padding:34px 22px}h1{font-size:32px;line-height:1.3}header{margin-bottom:35px}small{color:#168d90;font-weight:700}a{color:#168d90;text-decoration:none}nav{display:flex;flex-wrap:wrap;gap:8px}nav a{border:1px solid #a7c6c5;border-radius:20px;padding:3px 15px}section{background:white;padding:22px;border-radius:16px;margin:28px 0}.heading{display:flex;gap:16px;align-items:center}.heading span{font-size:24px;font-weight:800;color:#168d90}.heading h2{font-size:23px;line-height:1.4;flex:1}.heading a{font-size:14px;white-space:nowrap}.covers{display:grid;grid-template-columns:2.35fr 1fr;gap:18px;max-width:720px;margin:18px 0 25px;align-items:start}.covers img{width:100%;border-radius:10px}.figures{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start}.figures img{width:100%;display:block;border-radius:14px}.hint{font-size:15px;color:#556975}@media(max-width:650px){main{padding:20px 10px}section{padding:14px}.figures{grid-template-columns:1fr}.heading{flex-wrap:wrap}.heading h2{font-size:20px}.covers{gap:10px}h1{font-size:27px}}</style></head><body><main><header><small>2026-10-09 · 全16篇配图升级</small><h1>把 AI 原理画得更好懂</h1><p>30张正文图解＋32张主题封面。用像素格、积木、红伞、抽卡和储物格，把抽象计算变成看得见的步骤。</p><p class="hint">点击图片可查看原图。数值与流程均为文章中的示意算例；机器人为象征性的阅读向导。</p><p><a href="发布入口.html">← 返回发布入口</a></p><nav>'''+''.join(f'<a href="#a{i}">{i:02d}</a>' for i in range(1,17))+'''</nav></header>'''+''.join(sections)+'''</main></body></html>'''
(root/'配图总览.html').write_text(page)
for p in [root/'发布入口.html',root/'.publishing/build_documents.py']:
    s=p.read_text()
    if '<a href="配图总览.html">' not in s:
        s=s.replace('<footer><a href="公众号发布信息总表.md">','<footer><a href="配图总览.html">新版配图总览</a> · <a href="公众号发布信息总表.md">')
    p.write_text(s)
print('Built illustration gallery for all 16 articles')
