"""Prepare image-post fields matching the editor in the user's screenshot."""
from pathlib import Path
import hashlib, html, json, shutil, zipfile
from 内容脚本 import EPISODES
from 阅读补充 import READING
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'公众号贴图_直接使用'
OUT.mkdir(exist_ok=True)
items=[]
for e in EPISODES:
 n=e['n']; r=READING[n]; name=f'{n:02d}_{e["slug"]}'; src=ROOT/name; dst=OUT/name
 (dst/'上传图片').mkdir(parents=True,exist_ok=True)
 title=e['title']
 desc=f'少年 AI 观察室 · 第 {n:02d} 期\n\n{e["intro"]}\n\n{r["takeaway"]}\n\n想一想：{e["question"]}\n\n说明：{r["limit"]}\n首图为 AI 辅助生成的概念插画，第 2—5 张为按规则绘制的图解。'
 (dst/'标题.txt').write_text(title,encoding='utf-8')
 (dst/'描述.txt').write_text(desc,encoding='utf-8')
 (dst/'编辑备查_不用粘贴.txt').write_text('本文件只供编辑核对，不放进标题或描述框。\n\n互动题参考思路\n'+r['answer']+'\n\n'+(src/'资料来源.txt').read_text(),encoding='utf-8')
 for i in range(1,6): shutil.copy2(src/'发布图片'/f'{i:02d}.png',dst/'上传图片'/f'{i:02d}.png')
 items.append(dict(n=n,folder=name,title=title,description=desc,title_chars=len(title),description_chars=len(desc)))
help_text='''微信公众号贴图｜直接使用说明

适用页面：用户提供截图中的图片贴图编辑页，上方排列 5 张图，下方为标题和“填写描述信息，让大家了解更多内容”。
当前仅整理本地材料，未修改公众号后台、未保存后台草稿、未发布。

每期只需要三样
1. “上传图片”文件夹：按 01.png、02.png、03.png、04.png、05.png 的顺序上传，确认第一张为本期概念插画。
2. “标题.txt”：全文复制到标题框，不带文件名。
3. “描述.txt”：全文复制到描述框，不带文件名。描述已经包含栏目期号、导语、要点、互动问题、示例限制和图片说明，不需要再从旧文案里拼接。

最方便的操作
双击“打开这里_复制标题和描述.html”，选择期数，分别点击“复制标题”和“复制描述”，回到公众号后台的对应字段粘贴。
若浏览器阻止复制，按钮会选中文本；按 Command+C（Windows 为 Ctrl+C）复制，再到后台粘贴。
也可以直接打开每期的两个 TXT 文件，全文复制。
上传图片仍需在后台选择本期文件夹中的 5 张 PNG；复制文本不会自动上传图片。

当前截图的第 01 期
截图已显示 5 张图片和标题“AI 认出了猫，它怎么算出来的？”。确认上传的是本次打磨后的 01—05 图片后，只需粘贴第 01 期的“描述.txt”。无需把图片重复上传一遍。

这一贴图页面的素材选择
直接使用 5 张竖图。横版和方形封面是另一套图文材料，本包没有混入；五张图总览也不上传。
“编辑备查_不用粘贴.txt”包含互动题参考思路和原稿资料来源，供核对或回复读者时取用。描述正文没有提前附上完整答案。

粘贴后的检查
确认标题无缺字，描述保留分段，图片为 5 张且顺序正确。点击截图中的“预览”查看；暂不发布时使用“保存为草稿”。实际发布由用户决定。
本包的文案字符数是本地统计，不是平台限额；本轮无法读取后台字段限制，未把材料写入后台验证。

其他文件
原始审阅目录、配套封面、原文章和制作记录仍保留在原位置。本包是为贴图编辑页单独整理的版本。
压缩包用于转交或备份；当前电脑可直接使用文件夹。解压后入口页也可离线打开。
'''
(OUT/'使用说明.txt').write_text(help_text,encoding='utf-8')
options=''.join(f'<option value="{i}">第 {e["n"]:02d} 期 · {html.escape(e["title"])}</option>' for i,e in enumerate(items))
payload=json.dumps(items,ensure_ascii=False).replace('</','<\\/')
page='''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>公众号贴图 · 复制标题和描述</title><style>
*{box-sizing:border-box}body{margin:0;background:#fff8e8;color:#142c42;font:16px/1.75 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}main{max-width:1060px;margin:auto;padding:40px 24px}h1{font-size:32px;line-height:1.4;margin:8px 0 16px}h2{font-size:20px;margin:0}p{margin:10px 0}.muted{color:#526879;font-size:14px}select,textarea{font:inherit;width:100%;color:inherit;border:1px solid #bac3c6;border-radius:8px;background:white;padding:12px}select{margin:12px 0 20px}textarea{resize:vertical;line-height:1.85}#title{min-height:76px}#description{min-height:460px}section{background:white;border:1px solid #dedfd8;border-radius:12px;padding:22px;margin:18px 0}.row{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:12px}button{font:inherit;background:#2466e8;color:white;border:0;border-radius:7px;padding:9px 18px;cursor:pointer}a{color:#2466e8;text-underline-offset:3px}button:focus-visible,a:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid #e6a900;outline-offset:3px}.images{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.images a{text-decoration:none;text-align:center;font-size:13px}.images img{width:100%;height:auto;display:block;border:1px solid #eee;border-radius:4px}.status{min-height:28px;color:#166a4e;font-size:14px}.path{overflow-wrap:anywhere;font-size:14px}.badge{font-size:13px;color:#526879;border:1px solid #c8cabb;border-radius:20px;padding:5px 12px;display:inline-block}footer{font-size:14px;color:#526879;padding:12px 0 30px}@media(max-width:600px){main{padding:22px 14px}h1{font-size:26px}section{padding:16px}.images{gap:6px}#description{min-height:580px}.row{gap:8px}button{padding:8px 12px}}
</style></head><body><main><span class="badge">贴图素材 · 尚未发布</span><h1>选一期，复制标题和描述。</h1><p>对应公众号后台的图片、标题和描述三个位置。两个文本框里都是可直接粘贴的正文。</p><label for="episode">选择期数</label><select id="episode">OPTIONS</select>
<section><div class="row"><h2>1. 上传 5 张图片</h2><a id="folder" href="#">打开图片文件夹</a></div><p class="path" id="path"></p><div class="images" id="images"></div><p class="muted">按 01—05 顺序上传。已经上传本期 5 张图时，可直接继续填写文字。</p></section>
<section><div class="row"><h2>2. 标题</h2><button type="button" data-copy="title">复制标题</button></div><textarea id="title" readonly aria-label="可复制的标题"></textarea><p class="muted" id="title-count"></p></section>
<section><div class="row"><h2>3. 描述</h2><button type="button" data-copy="description">复制描述</button></div><textarea id="description" readonly aria-label="可复制的描述"></textarea><p class="muted" id="description-count"></p></section>
<p id="status" class="status" role="status" aria-live="polite"></p><p><a id="title-file">标题 TXT</a> · <a id="description-file">描述 TXT</a> · <a id="reference">编辑备查（不用粘贴）</a> · <a href="使用说明.txt">使用说明</a></p><footer>复制只包含对应文本框的内容。若复制受限，文本会被选中，按 Command+C / Ctrl+C 即可。图片需要另行上传。本地字符数不代表平台限额；粘贴后请检查完整性，再使用后台的“预览”或“保存为草稿”。</footer></main>
<script>
const items=PAYLOAD;
const pick=document.getElementById('episode');
function show(){const e=items[Number(pick.value)];for(const key of ['title','description']){document.getElementById(key).value=e[key];document.getElementById(key+'-count').textContent=Array.from(e[key]).length+' 个字符（含标点、空格与换行）';}const base=encodeURIComponent(e.folder)+'/';document.getElementById('folder').href=base+'上传图片/';document.getElementById('path').textContent=e.folder+'/上传图片/';document.getElementById('title-file').href=base+'标题.txt';document.getElementById('description-file').href=base+'描述.txt';document.getElementById('reference').href=base+'编辑备查_不用粘贴.txt';document.getElementById('images').innerHTML=[1,2,3,4,5].map(n=>{const name=String(n).padStart(2,'0')+'.png';return '<a href="'+base+'上传图片/'+name+'"><img src="'+base+'上传图片/'+name+'" alt="第 '+e.n+' 期第 '+n+' 张图片">'+name+'</a>'}).join('');document.getElementById('status').textContent='';location.hash=String(e.n).padStart(2,'0');}
pick.addEventListener('change',show);
for(const b of document.querySelectorAll('[data-copy]'))b.addEventListener('click',async()=>{const input=document.getElementById(b.dataset.copy);let ok=false;try{await navigator.clipboard.writeText(input.value);ok=true;}catch(e){input.focus();input.select();try{ok=document.execCommand('copy');}catch(e){}}document.getElementById('status').textContent=ok?'已复制'+(b.dataset.copy==='title'?'标题':'描述')+'，可粘贴到公众号对应字段。':'文本已选中，请按 Command+C / Ctrl+C 复制。';});
const requested=Number(location.hash.slice(1));pick.value=String(requested>=1&&requested<=16?requested-1:0);show();
</script></body></html>'''.replace('OPTIONS',options).replace('PAYLOAD',payload)
(OUT/'打开这里_复制标题和描述.html').write_text(page,encoding='utf-8')
report=dict(episodes=16,images=80,fields=[],published=False,backend_modified=False)
for e in items:
 dst=OUT/e['folder'];src=ROOT/e['folder']
 assert (dst/'标题.txt').read_text()==e['title']
 assert (dst/'描述.txt').read_text()==e['description']
 for i in range(1,6):
  name=f'{i:02d}.png';assert (dst/'上传图片'/name).read_bytes()==(src/'发布图片'/name).read_bytes()
 report['fields'].append({k:e[k] for k in ['n','title_chars','description_chars']})
zip_path=ROOT/'公众号贴图_直接使用.zip'
files=sorted(p for p in OUT.rglob('*') if p.is_file())
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED,compresslevel=5) as z:
 for p in files:z.write(p,p.relative_to(ROOT))
with zipfile.ZipFile(zip_path) as z:
 assert z.testzip() is None
 for p in files:assert z.read(str(p.relative_to(ROOT)))==p.read_bytes()
report.update(package_files=len(files),zip_sha256=hashlib.sha256(zip_path.read_bytes()).hexdigest())
(ROOT/'制作记录/贴图材料核查.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False))
