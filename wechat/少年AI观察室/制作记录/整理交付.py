from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from 内容脚本 import EPISODES
from 阅读补充 import READING
import re,json,html,hashlib,zipfile

ROOT=Path(__file__).resolve().parent.parent
SHORT=['认猫背后|有计算','满分之后|换题再看','图片里的|数字密码','答错之后|调参数','小窗口|找线索','原值加上|一份修正','红伞线索|传下去','接一片|再接一片','这个“它”|到底指谁','下一片|怎样接出','存得下来|找得回来？','分数之外|还看条件','短规则|也要算账','认出物体|再看关系','有了链接|还要核对','证据不足|就说不知道']
BIG=[('图片 → 猫','先表示，再计算'),('看颜色','8/8 → 0/4'),('010\n111\n010','九格黑白图案'),('b＝0 → 1 → 2','输入与目标不变'),('3 × 3','同一模板，重复使用'),('10＋1＝11','原值＋修正'),('红 → 红 → 红','人为保留颜色线索'),('我 → 读书。','玩具生成路线之一'),('大 ↔ 小','上下文改变通常理解'),('前文 → 下一片','简化生成路线'),('第 2 格','地址不变，内容可变'),('质量 / 速度 / 成本','先明确使用条件'),('9 → 4 → 6','约定编码的长度示例'),('左边：1 → 2','物体不变，位置改变'),('支持？矛盾？','还是原文没有说明'),('来源＋范围','有依据，再作回答')]
HEAD='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>封面制作</title><style>*{box-sizing:border-box}</style></head>'
CSS='''<style>
@font-face{font-family:YouthSans;src:url('../制作记录/fonts/NotoSansSC[wght].ttf');font-weight:100 900}
body{margin:0;padding:30px;background:#DADDE0;font-family:YouthSans,sans-serif;color:#142C42}
.poster.wide,.poster.square{display:block;position:relative;isolation:isolate;background:#FFF8E8;padding:0;box-shadow:none;overflow:hidden;border-radius:0;margin:0 0 32px;flex:none}
.poster.wide{width:2100px;height:900px}.poster.square{width:1080px;height:1080px}
.y-brand{position:absolute;left:110px;top:82px;font-size:52px;font-weight:650;letter-spacing:5px}
.y-issue{position:absolute;right:105px;top:82px;font-size:52px;font-weight:650;color:#50677A}
.y-title{position:absolute;left:108px;top:252px;width:1280px;font-size:126px;font-weight:850;line-height:1.5;letter-spacing:-3px;margin:0}
.y-title span{display:block}.y-title span:last-child{color:#2466E8}
.y-relation{position:absolute;right:95px;top:260px;width:540px;height:415px;border-left:4px solid #142C42;padding:35px 0 0 70px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center}
.y-main{font-size:77px;font-weight:850;line-height:1.55;white-space:pre-line;word-break:keep-all}.y-caption{font-size:37px;line-height:1.5;margin-top:35px}
.y-foot{position:absolute;left:110px;bottom:76px;font-size:40px;color:#50677A;border-top:4px solid #FFCD44;padding-top:22px;width:1878px}
.square .y-brand{font-size:46px;left:82px;top:79px}.square .y-issue{font-size:46px;right:82px;top:79px}
.y-short{position:absolute;inset:280px 75px auto;text-align:center;font-size:159px;font-weight:850;line-height:1.55;letter-spacing:-5px}
.y-short span{display:block}.y-short span:last-child{color:#2466E8}.y-rule{position:absolute;left:240px;right:240px;bottom:215px;height:17px;background:#FFCD44}
.pair-preview{display:flex;gap:20px;align-items:center;background:#fff;padding:25px;width:1280px;box-sizing:border-box}.pair-preview img:first-child{width:840px;height:360px;object-fit:contain}.pair-preview img:last-child{width:360px;height:360px;object-fit:contain}
</style>'''

def split_title(t):
 if '，'in t:return t.split('，',1)
 return [t[:len(t)//2],t[len(t)//2:]]

def covers():
 for e in EPISODES:
  ep=ROOT/f'{e["n"]:02d}_{e["slug"]}';parts=split_title(e['title']);big,caption=BIG[e['n']-1]
  # Topic copy and short title are authored independently; no image crops.
  main_size=60 if e['n']==3 else (77 if len(big.split('\n')[0])<9 else 56)
  main=f'<section class="poster wide" id="wide"><div class="y-brand">少年 AI 观察室</div><div class="y-issue">{e["n"]:02d} / 16</div><h1 class="y-title">'+''.join(f'<span>{html.escape(x)}</span>'for x in parts)+f'</h1><div class="y-relation"><div class="y-main" style="font-size:{main_size}px">{html.escape(big)}</div><div class="y-caption">{html.escape(caption)}</div></div><div class="y-foot">{html.escape(e["note"])}</div></section>'
  square=f'<section class="poster square" id="square"><div class="y-brand">少年 AI 观察室</div><div class="y-issue">{e["n"]:02d}</div><div class="y-short">'+''.join(f'<span>{html.escape(s)}</span>'for s in SHORT[e['n']-1].split('|'))+'</div><div class="y-rule"></div></section>'
  pair='<section class="pair-preview"><img src="公众号主封面_21x9.png"><img src="公众号分享封面_1x1.png"></section>'
  (ep/'封面制作.html').write_text(HEAD.replace('</head>',CSS+'</head>')+'<body>'+main+square+pair+'</body></html>')
 print('Prepared 16 standalone paired-cover source HTML files.')

def proofs():
 out=ROOT/'制作记录'/'逐期校样';out.mkdir(exist_ok=True)
 coversheet=Image.new('RGB',(1480,1980),'#D8D9DA')
 for e in EPISODES:
  ep=ROOT/f'{e["n"]:02d}_{e["slug"]}';pages=sorted((ep/'发布图片').glob('0[1-5].png'))
  assert len(pages)==5,(ep,len(pages))
  sheet=Image.new('RGB',(1480,1980),'#D8D9DA')
  for i,p in enumerate(pages[1:]):
   im=Image.open(p);im.thumbnail((720,960));sheet.paste(im,((i%2)*740+10,(i//2)*980+10))
  sheet.save(out/(ep.name+'.jpg'),quality=94)
  mini=Image.open(pages[0]);mini.thumbnail((350,467));idx=e['n']-1;coversheet.paste(mini,((idx%4)*370+10,(idx//4)*495+10))
  strip=Image.new('RGB',(1848,520),'#D8D9DA');dr=ImageDraw.Draw(strip)
  for i,p in enumerate(pages):
   im=Image.open(p);im.thumbnail((360,480));strip.paste(im,(8+i*368,8))
  strip.save(ep/'五张图总览.jpg',quality=94)
 coversheet.save(ROOT/'16期封面总览.jpg',quality=94)
 print('Refreshed all proofs and contact sheets.')

def esc(s): return html.escape(s, quote=True)

def source_html(s):
 # Keep the original bibliography text and make its actual URLs clickable.
 return '<br>'.join(re.sub(r'https?://[^\s<>]+',lambda m: '<a href="'+m[0]+'" target="_blank" rel="noopener noreferrer">'+m[0]+'</a>',esc(line)) for line in s.splitlines())

PAGE_CSS="""body{margin:0;background:#edf0f2;color:#142c42;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif}*{box-sizing:border-box}a{color:#2466e8;text-underline-offset:3px}nav,article{max-width:760px;margin:auto}nav{padding:20px;display:flex;gap:14px;flex-wrap:wrap;font-size:14px;line-height:1.7}article{background:#fff;padding:30px}h1{font-size:28px;line-height:1.5;margin:12px 0 20px}h2{font-size:19px;margin:0 0 12px}p{line-height:1.85;overflow-wrap:anywhere}figure{margin:28px 0}figure img{display:block;width:100%;height:auto}figcaption{padding:10px 2px;color:#50677a;font-size:13px}details{background:#f5f7f8;border-radius:8px;padding:12px 16px;line-height:1.8}summary{cursor:pointer;color:#2466e8;font-weight:600}details p{margin:12px 0 0}.question{background:#fff8e8;padding:22px;border-left:4px solid #ffcd44}.takeaway{font-size:18px;font-weight:600}.note,.refs{font-size:14px;color:#50677a}.refs{overflow-wrap:anywhere;line-height:1.9;border-top:1px solid #ddd;padding-top:24px;margin-top:24px}.status{font-size:13px;color:#50677a}.tools{display:flex;gap:14px;flex-wrap:wrap;font-size:14px;padding:20px 0}a:focus-visible,summary:focus-visible{outline:3px solid #e5a800;outline-offset:4px}@media(max-width:480px){article{padding:20px 16px}h1{font-size:25px}figure{margin:24px -16px}figcaption,figure details{margin-left:16px;margin-right:16px}.question{padding:16px}nav{padding:16px}}"""

def package_docs():
 audit=json.loads((ROOT/'制作记录'/'全套排版检查.json').read_text())['text_boxes']
 audit2=json.loads((ROOT/'02_满分就学会了吗'/'排版检查.json').read_text())['text_boxes']
 summaries=[];cards=[]
 for e in EPISODES:
  n=e['n'];r=READING[n];ep=ROOT/f'{n:02d}_{e["slug"]}'
  src=next((ROOT/'制作记录'/'原文只读副本').glob(f'{n:02d}_*.md'))
  sources=src.read_text().split('## 资料来源',1)[1].strip()
  note=r['limit'];credits='正文首图为 AI 辅助生成的概念插画；第 2—5 张图按核对过的文字与规则绘制。'
  text=f'第 {n:02d} 期｜{e["title"]}\n状态：审阅稿，未发布\n\n导语\n{e["intro"]}\n\n图片顺序\n发布图片/01.png → 02.png → 03.png → 04.png → 05.png\n\n本期带走\n{r["takeaway"]}\n\n互动问题\n{e["question"]}\n\n参考思路（供审阅，可按互动需要另行使用）\n{r["answer"]}\n\n文末说明\n{note}\n\n{credits}\n\n延伸阅读资料\n{sources}\n'
  (ep/'发布文案.txt').write_text(text)
  (ep/'资料来源.txt').write_text('衍生内容对应原稿：'+src.name+'\n\n'+sources+'\n\n以上书目信息沿用原稿，本轮未重新核验外部网页的可访问性。\n插画来源：原制作阶段的内置图像生成工具；本轮保留。未使用外部人物照片或论文截图。字体许可证保留在项目制作记录/fonts。\n')
  tx=[v for v in audit if v['episode']==n] if n!=2 else audit2
  texts={pn:'\n'.join(v['text'] for v in tx if v['page']==pn) for pn in range(2,6)}
  transcript=e['title']+'\n\n说明：图意是阅读辅助；第 1 张为概念插画描述，并非逐字转写。第 2—5 张另附绘制文字。\n'
  body=''
  for pn,desc in enumerate(r['figures'],1):
   transcript+=f'\n第 {pn} 张｜图意\n{desc}\n'
   if pn>1:transcript+='\n绘制文字\n'+texts[pn]+'\n'
   body+=f'<figure><a href="发布图片/{pn:02d}.png" aria-label="查看第 {pn} 张原图"><img src="发布图片/{pn:02d}.png" alt="{esc(desc)}" width="{1086 if pn==1 else 1440}" height="{1448 if pn==1 else 1920}"></a><figcaption>{pn:02d} / 05 · 点击图片可查看原图</figcaption><details class="figure-text"><summary>图解文字</summary><p>{esc(desc)}</p></details></figure>'
  (ep/'图片文字稿.txt').write_text(transcript)
  nav='<a href="../发布入口.html">16 期目录</a><span>审阅稿 · 未发布</span>'
  seq=''
  for offset,label in [(-1,'上一篇'),(1,'下一篇')]:
   if 1<=n+offset<=16:
    other=EPISODES[n+offset-1]
    seq+=f'<a href="../{other["n"]:02d}_{other["slug"]}/公众号图文预览.html">{label}：{esc(other["title"])}</a>'
  page=f'<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{esc(e["title"])}</title><style>{PAGE_CSS}</style></head><body><nav>{nav}</nav><article><p class="status">少年 AI 观察室 · 第 {n:02d} 期</p><h1>{esc(e["title"])}</h1><p>{esc(e["intro"])}</p>{body}<section class="question"><h2>想一想</h2><p>{esc(e["question"])}</p><details class="answer"><summary>展开参考思路</summary><p>{esc(r["answer"])}</p></details></section><p class="takeaway">{esc(r["takeaway"])}</p><p class="note">{esc(note)}</p><p class="note">{esc(credits)}</p><section class="refs"><h2>延伸阅读资料</h2>{source_html(sources)}<p>书目信息沿用原稿，本轮未重新核验外部网页的可访问性。</p></section><div class="tools"><a href="封面预览.html">查看配套封面</a><a href="图片文字稿.txt">完整图片文字稿</a><a href="发布文案.txt">本期文案</a></div></article><nav>{seq}</nav></body></html>'
  (ep/'公众号图文预览.html').write_text(page)
  (ep/'封面预览.html').write_text(f'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>第 {n:02d} 期配套封面</title><style>body{{background:#fff8e8;color:#142c42;font-family:sans-serif;margin:24px}}main{{max-width:1000px;margin:auto}}img{{display:block;max-width:100%;height:auto}}.sq{{width:360px}}a{{color:#2466e8}}p{{line-height:1.8}}</style><main><a href="公众号图文预览.html">返回本期</a><p>配套封面 · 审阅稿</p><h2>主封面 21:9</h2><img src="公众号主封面_21x9.png" alt="{esc(e["title"])}的横版主封面"><h2>分享封面 1:1</h2><img class="sq" src="公众号分享封面_1x1.png" alt="{esc(e["title"])}的方形分享封面"></main></html>')
  summaries.append(f'{n:02d}\t{e["title"]}\t{e["intro"]}\t{src.stem}\t审阅稿')
  cards.append(f'<a class="item" href="{ep.name}/公众号图文预览.html"><img src="{ep.name}/发布图片/01.png" alt="" width="1086" height="1448"><span><small>第 {n:02d} 期</small><strong>{esc(e["title"])}</strong><em>{esc(r["takeaway"])}</em></span></a>')
 (ROOT/'发布信息总表.tsv').write_text('期数\t标题\t摘要建议\t对应原文章\t状态\n'+'\n'.join(summaries)+'\n')
 groups=[('从图片到学习','先明确任务，再看数字表示、测试和参数。'),('线索怎样留下来','观察局部线索、计算路径、状态和生成规则。'),('信息怎样参与回答','从上下文与遮罩，走到存储、查找和方案选择。'),('回答为什么可信','检查描述成本、物体关系、引用证据和服务边界。')]
 sections=''.join(f'<section><h2>{i+1:02d} · {title}</h2><p>{desc}</p><div class="grid">'+''.join(cards[i*4:i*4+4])+'</div></section>' for i,(title,desc) in enumerate(groups))
 idx='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>少年 AI 观察室｜16 期审阅稿</title><style>*{box-sizing:border-box}body{margin:0;background:#fff8e8;color:#142c42;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}header,main,footer{max-width:1184px;margin:auto;padding:32px}h1{font-size:40px;line-height:1.35;max-width:700px;margin:20px 0}p{line-height:1.85}header{padding-top:60px}header>p{max-width:780px}.badge{display:inline-block;border:1px solid #c7c9bc;border-radius:20px;padding:5px 12px;font-size:13px}.links{display:flex;gap:12px 22px;flex-wrap:wrap}a{color:#2466e8;text-underline-offset:3px}section{margin:0 0 48px}section>h2{font-size:25px;margin:0}section>p{color:#50677a}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}.item{color:inherit;text-decoration:none;background:#fff;border:1px solid #d8d9d6;border-radius:10px;overflow:hidden}.item:hover{border-color:#2466e8}.item img{display:block;width:100%;height:auto}.item span{display:block;padding:16px}.item small{color:#2466e8}.item strong{display:block;font-size:19px;line-height:1.6;margin:8px 0}.item em{font-size:14px;font-style:normal;color:#50677a;line-height:1.8;display:block}footer{font-size:14px;color:#50677a;border-top:1px solid #d8d9d6}a:focus-visible{outline:3px solid #e5a800;outline-offset:4px}@media(max-width:850px){.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}header,main,footer{padding:24px 18px}h1{font-size:31px}}@media(max-width:380px){.item span{padding:11px}.item strong{font-size:17px}.item em{font-size:13px}section>h2{font-size:22px}}</style></head><body><header><span class="badge">审阅稿 · 未发布 · 2026.10.11</span><p>少年 AI 观察室 / 公众号预热系列</p><h1>16 个问题，<br>把每一步讲明白。</h1><p>每期 5 张图：从能观察、能动手的例子出发，换一个条件，再检查结论。可以按顺序读，也可以先选一个感兴趣的问题。</p><p>正文预览附有可展开的图解文字和互动题参考思路。小屏幕上可点开原图，或展开文字阅读。</p><p class="links"><a href="打磨记录_20261011.txt">本轮打磨记录</a><a href="发布说明.txt">审阅与文件说明</a><a href="16期封面总览.jpg">封面总览</a><a href="发布信息总表.tsv">标题与摘要总表</a></p></header><main>'+sections+'</main><footer><p>当前只做本地审阅，未上传、未发布，也未安排自动发布。原文章和配图保留不动。入口与文案沿用原文件名，状态以页面中的“审阅稿”为准。</p></footer></body></html>'
 (ROOT/'发布入口.html').write_text(idx)
 (ROOT/'发布说明.txt').write_text('少年 AI 观察室｜16 期审阅稿\n\n当前状态：只做本地内容与视觉打磨。未上传、未发布，也未安排发布时间或自动发布任务。\n\n阅读方式\n打开“发布入口.html”选择一期，按 01—05 阅读。每张图可点开原图，也可展开图解文字；互动题的参考思路默认折叠。原有“发布”字样的文件名为兼容保留，不表示已经发布。\n\n文件内容\n每期含 5 张正文图、横版和方形封面、文案、完整图片文字稿、资料来源与本地预览。文案中的参考思路是审阅辅助，后续是否随正文使用可另行决定。审阅压缩包可解压后离线打开，不包含制作脚本和历史备份；这些保留在工作目录。\n\n图片尺寸\n正文首图为原生 1086×1448 的概念插画；第 2—5 张为 1440×1920 的精确排版图。主封面为 2100×900，分享封面为 1080×1080。图解中的数字、表格和关系以内页为准。\n\n检查范围\n本轮检查算例、文字边界、图文一致性、本地链接与浏览器窄屏阅读。外部书目沿用原稿；没有重新核验网页，也没有进行公众号后台、平台压缩或真机验收。\n\n后续发布前再做\n先确定文案和封面，再到公众号编辑器上传图片并发送手机预览，核对压缩、裁切和实际阅读效果。本地 HTML 不保证复制后自动上传图片。\n\n栏目与原稿\n“少年 AI 观察室”为拟定栏目名。16 期与原文章一一对应，日期和间隔尚未设定。原 16 篇文章与配图没有改动；本轮前的制作文件与核查结果保存在制作记录/历史版本。\n')
 (ROOT/'系列策划.txt').write_text('少年 AI 观察室｜16 期审阅稿\n\n目的：用可观察的例子提出问题，为完整文章连载建立兴趣。每期 5 张图，先看例子、换条件、对照结果，再追问一步。参考思路与解释范围用于审阅，不把玩具算例当作真实产品测评。\n\n'+ '\n\n'.join(f'{i+1}. {t}\n{d}\n对应第 {i*4+1:02d}—{i*4+4:02d} 期。' for i,(t,d) in enumerate(groups))+'\n\n逐期要点\n'+'\n'.join(f'{e["n"]:02d} {e["title"]}\n   {READING[e["n"]]["takeaway"]}' for e in EPISODES)+'\n\n排期：未确定；本轮不发布。\n制作沿革：原制作借鉴 cy-carousel 的分页叙事，以及 guizang-social-card-skill 的双尺寸封面方法；本轮保留视觉风格，重审解释规则、文案与阅读辅助。\n')
 print('Generated 16 review drafts with descriptions, answers, boundaries and navigation.')

def zip_delivery():
 zipname=ROOT/'公众号预热贴图_16期审阅包.zip'
 rootfiles=['打磨记录_20261011.txt','发布入口.html','发布说明.txt','发布信息总表.tsv','16期封面总览.jpg','系列策划.txt']
 files=[ROOT/x for x in rootfiles]
 for e in EPISODES:
  ep=ROOT/f'{e["n"]:02d}_{e["slug"]}'
  files+=list((ep/'发布图片').glob('*.png'))
  files += [ep/x for x in ['公众号主封面_21x9.png','公众号分享封面_1x1.png','封面预览.html','发布文案.txt','图片文字稿.txt','资料来源.txt','公众号图文预览.html','五张图总览.jpg']]
 with zipfile.ZipFile(zipname,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=5)as z:
  for p in files:assert p.exists(),p;z.write(p,p.relative_to(ROOT))
 print('Packaged',len(files),'files;',round(zipname.stat().st_size/1024/1024,1),'MiB')

if __name__=='__main__':
 import sys
 {'covers':covers,'proofs':proofs,'docs':package_docs,'zip':zip_delivery}[sys.argv[1]]()
