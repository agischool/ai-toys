from pathlib import Path
from PIL import Image
from 内容脚本 import EPISODES
import hashlib,json,re
ROOT=Path(__file__).resolve().parent.parent
checks=[]
def ck(name,actual,expected):
 assert actual==expected,(name,actual,expected)
 checks.append({'check':name,'result':actual,'passed':True})

# Recompute educational examples from their rules, independently of rendering.
train=[('red','circle')]*4+[('blue','square')]*4
test=[('blue','circle')]*2+[('red','square')]*2
def scores(items):return [sum(('circle'if c=='red'else'square')==s for c,s in items),sum(s in ['circle','square']for c,s in items)]
ck('02/训练两规则答对数',scores(train),[8,8]);ck('02/新搭配两规则答对数',scores(test),[0,4])
grid=[[0,1,0],[1,1,1],[0,1,0]]
ck('03/按行编码',''.join(str(v)for row in grid for v in row),'010111010')
grid[1][1]=0;ck('03/修改中心',''.join(str(v)for row in grid for v in row),'010101010')
ck('04/总绝对误差',[sum(abs(x+b-y)for x,y in [(1,3),(2,4),(3,5)])for b in [0,1,2]],[6,3,0])
kernel=[[0,1,0]]*3
def response(a):return sum(a[i][j]*kernel[i][j]for i in range(3)for j in range(3))
ck('05/竖线与全黑响应',[response([[0,1,0]]*3),response([[1,1,1]]*3)],[3,3])
def slide(a):return[response([row[j:j+3]for row in a])for j in range(3)]
ck('05/平移响应',[slide([[0,1,0,0,0]]*3),slide([[0,0,1,0,0]]*3)],[[3,0,0],[0,3,0]])
ck('06/两路相加',[10+1,10+0],[11,10])
ck('08/候选概率总和',0.6+0.4,1.0)
ck('09/两组加权结果',[2*.75+10*.25,2*.25+10*.75],[4.0,8.0])
ck('10/候选概率总和',0.60+0.25+0.15,1.0)
ck('10/遮罩每行可读数',[sum(j<=i for j in range(3))for i in range(3)],[1,2,3])
memory=['红','蓝','黄',None,None];ck('11/第一次读2号',memory[1],'蓝');memory[1]='绿';ck('11/覆盖后读2号',memory[1],'绿')
models=[('A',80,1,1),('B',90,4,3),('C',92,8,6)]
for limit,ans in [(5,['A','B']),(2,['A'])]:ck(f'12/时限{limit}秒预算3点',[n for n,score,t,c in models if t<=limit and c<=3],ans)
def decode(s):
 if s[0]=='L':return s[1:]
 out=list(s[2:4]*int(s[1]))
 for i in range(4,len(s),2):out[int(s[i])-1]=s[i+1]
 return ''.join(out)
ck('13/重复规则还原',decode('R4AB'),'ABABABAB');ck('13/例外还原',decode('R4AB8C'),'ABABABAC')
ck('13/编码长度',[len('LABABABAB'),len('R4AB'),len('R4AB8C'),len('R4AB2C4C8C')],[9,4,6,10])
ck('14/蓝方左边对象数',[['红圆','蓝方','绿三角'].index('蓝方'),['红圆','绿三角','蓝方'].index('蓝方')],[1,2])
ck('16/15点处于常规开放时段',12<=15<18,True)

assets=[]
for e in EPISODES:
 ep=ROOT/f'{e["n"]:02d}_{e["slug"]}'
 for i in range(1,6):
  p=ep/'发布图片'/f'{i:02d}.png';im=Image.open(p);im.verify();im=Image.open(p)
  ck(f'{e["n"]:02d}/{i:02d}比例',im.width*4,im.height*3)
  assets.append({'file':str(p.relative_to(ROOT)),'dimensions':list(im.size),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'origin':'builtin-imagegen'if i==1 else'programmatic-educational-diagram'})
 for name,dim in [('公众号主封面_21x9.png',(2100,900)),('公众号分享封面_1x1.png',(1080,1080))]:
  p=ep/name;ck(f'{e["n"]:02d}/{name}尺寸',tuple(Image.open(p).size),dim)
  assets.append({'file':str(p.relative_to(ROOT)),'dimensions':list(dim),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'origin':'authored-cover-typography'})
 for name in ['发布文案.txt','资料来源.txt','图片文字稿.txt','公众号图文预览.html']:
  assert(ep/name).is_file()and(ep/name).stat().st_size>0,(ep,name)
ck('正文图片总数',sum('/发布图片/'in a['file']for a in assets),80)
ck('全部成品图片数',len(assets),112)
original=Path('/Users/advance/Downloads/青少年AI科普连载_16篇正文与配图')
before=json.loads((ROOT/'制作记录'/'原文章_制作前SHA256.json').read_text())
after={str(p.relative_to(original)):hashlib.sha256(p.read_bytes()).hexdigest()for p in original.rglob('*')if p.is_file()and'.git'not in p.parts}
delta={'modified':[x for x in before.keys()&after.keys()if before[x]!=after[x]],'added':sorted(after.keys()-before.keys()),'removed':sorted(before.keys()-after.keys())}
ck('原文章内容与文件清单保持不变',before==after,True)
report={'passed':True,'checks':checks,'assets':assets,'original_files':len(after),'original_delta':delta,'published':False,'platform_preview_verified':False,'limits':['公众号后台压缩、裁切和真机显示尚未验证','视觉检查为模型逐页查看与程序校验，不是读者可用性实验','没有声称通过 cy-carousel 原有正式稿风格指标']}
(ROOT/'制作记录'/'最终核查.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'checks_passed':len(checks),'body_images':80,'cover_images':32,'original_files_unchanged':len(after),'published':False},ensure_ascii=False))
