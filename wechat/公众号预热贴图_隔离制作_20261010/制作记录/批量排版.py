from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from 内容脚本 import EPISODES
import math,json,html,hashlib,re,shutil

ROOT=Path(__file__).resolve().parent.parent
FONTS=ROOT/'制作记录'/'fonts'
W,H=1440,1920
CREAM='#FFF8E8';INK='#142C42';BLUE='#2466E8';RED='#F37365';YELLOW='#FFCD44';GREEN='#26937D'
PALE='#E8EFFD';ROSE='#FFE5DC';WHITE='#FFFEF9';GRAY='#50677A'
AUDIT=[]
def font(size,bold=False):
 f=ImageFont.truetype(str(FONTS/'NotoSansSC[wght].ttf'),size);f.set_variation_by_axes([800 if bold else 500]);return f
class Page:
 def __init__(self,e,p):
  self.e=e;self.p=p;self.im=Image.new('RGB',(W,H),CREAM);self.d=ImageDraw.Draw(self.im)
  self.d.rectangle((84,73,104,121),fill=BLUE)
  self.t('少年 AI 观察室',128,73,40,bold=True)
  self.t(f'第 {e["n"]:02d} 期 / '+['看例子','换个条件','对照结果','再想一步'][p-2],1350,76,34,align='right')
  self.d.line((84,1765,1356,1765),fill='#D6D6CB',width=2)
  self.t(e['note'],86,1800,42,color=GRAY,maxw=1130)
  self.t(f'{p:02d} / 05',1356,1804,38,color=GRAY,align='right')
 def t(self,s,x,y,size=58,color=INK,bold=False,align='left',maxw=None):
  s=str(s);f=font(size,bold)
  if maxw:
   while f.getlength(s)>maxw and size>44: size-=1;f=font(size,bold)
   if f.getlength(s)>maxw: raise ValueError(('too wide',self.e['n'],self.p,s))
  box=self.d.textbbox((0,0),s,font=f,anchor='lt');width=box[2]-box[0]
  if align=='center':x-=width/2
  elif align=='right':x-=width
  if x<55 or x+width>1385 or y<40 or y+box[3]>1870:raise ValueError(('bounds',self.e['n'],self.p,s,x,y,width))
  self.d.text((x,y),s,font=f,fill=color,anchor='lt')
  AUDIT.append({'episode':self.e['n'],'page':self.p,'text':s,'size':size,'bbox':[round(x),round(y),round(x+width),round(y+box[3])]})
 def wrap(self,s,width=1260,size=58):
  out=[];f=font(size)
  closing='，。！？：；、）】》”’％%'
  opening='（【《“‘'
  for para in s.split('\n'):
   rest=para
   while rest:
    cut=1
    while cut<len(rest) and f.getlength(rest[:cut+1])<=width:cut+=1
    if cut<len(rest):
     while cut>1 and (rest[cut] in closing or rest[cut-1] in opening):cut-=1
    out.append(rest[:cut]);rest=rest[cut:]
  return out
 def para(self,s,x,y,size=58,width=1260,step=None,**kw):
  arr=self.wrap(s,width,size)
  for i,a in enumerate(arr):self.t(a,x,y+i*(step or size*1.4),size,**kw)
  return len(arr)*(step or size*1.4)
 def title(self,s):
  f=font(100,True)
  if f.getlength(s)<=1260:arr=[s]
  else:
   choices=[i for i in range(3,len(s)-3) if s[i-1] in '，：、']
   choices=[i for i in choices if max(f.getlength(s[:i]),f.getlength(s[i:]))<=1260]
   if choices:cut=min(choices,key=lambda i:abs(i-len(s)/2))
   else:cut=min(range(3,len(s)-3),key=lambda i:abs(f.getlength(s[:i])-f.getlength(s[i:])))
   arr=[s[:cut],s[cut:]]
  for i,line in enumerate(arr):self.t(line,84,210+130*i,100,bold=True,maxw=1260)
 def rr(self,bg,box,r=26,outline=None):self.d.rounded_rectangle(box,r,fill=bg,outline=outline,width=3)
 def arrow(self,x1,y1,x2,y2,color=BLUE):
  self.d.line((x1,y1,x2,y2),fill=color,width=6);a=math.atan2(y2-y1,x2-x1)
  self.d.polygon([(x2,y2)]+[(x2-25*math.cos(a+t),y2-25*math.sin(a+t))for t in(-.5,.5)],fill=color)
 def shape(self,x,y,kind='circle',color=RED,r=68):
  b=(x-r,y-r,x+r,y+r);sh=(x-r+9,y-r+12,x+r+9,y+r+12)
  if kind=='circle':self.d.ellipse(sh,fill='#D9D6C9');self.d.ellipse(b,fill=color,outline=INK,width=4)
  elif kind=='triangle':self.d.polygon([(x,y-r),(x-r,y+r),(x+r,y+r)],fill=color,outline=INK,width=4)
  else:self.rr('#D9D6C9',sh,10);self.rr(color,b,10,INK)
 def grid(self,arr,x,y,cell=100,numbers=False,highlight=None):
  for i,row in enumerate(arr):
   for j,v in enumerate(row):
    color=WHITE if numbers else (INK if v else WHITE)
    self.d.rectangle((x+j*cell,y+i*cell,x+(j+1)*cell,y+(i+1)*cell),fill=color,outline='#B5C0C8',width=3)
    if numbers:self.t(v,x+(j+.5)*cell,y+i*cell+cell*.22,int(cell*.55),align='center')
  if highlight is not None:
   i,j=highlight;self.d.rectangle((x+j*cell-4,y+i*cell-4,x+(j+1)*cell+4,y+(i+1)*cell+4),outline=RED,width=9)
 def pill(self,s,x,y,w=300,color=PALE,h=110,size=58):
  self.rr(color,(x,y,x+w,y+h),20);self.t(s,x+w/2,y+(h-size)/2-4,size,bold=True,align='center',maxw=w-36)
 def cat(self,x,y,r=110):
  self.d.polygon([(x-r,y-40),(x-r+6,y-r-62),(x-25,y-r)],fill=YELLOW,outline=INK,width=4)
  self.d.polygon([(x+r,y-40),(x+r-6,y-r-62),(x+25,y-r)],fill=YELLOW,outline=INK,width=4)
  self.d.ellipse((x-r,y-r,x+r,y+r),fill=YELLOW,outline=INK,width=4)
  for xx in (x-40,x+40):self.d.ellipse((xx-9,y-18,xx+9,y+4),fill=INK)
  self.d.polygon([(x-14,y+20),(x+14,y+20),(x,y+38)],fill=RED)
  for side in (-1,1):
   for dy in (-10,15):self.d.line((x+side*55,y+35+dy,x+side*130,y+25+dy),fill=INK,width=4)
 def panel(self):self.rr(WHITE,(84,655,1356,1420),30,INK)
 def finish(self):
  out=ROOT/f'{self.e["n"]:02d}_{self.e["slug"]}'/'发布图片';out.mkdir(parents=True,exist_ok=True);self.im.save(out/f'{self.p:02d}.png',optimize=True)

def draw(p,kind,a):
 p.panel()
 if kind=='catflow':
  p.cat(320,920,106);p.arrow(468,920,576,920)
  for yy in (820,920,1020):
   for y2 in (855,985):p.d.line((650,yy,790,y2),fill='#A7BFEB',width=4)
  for yy in (855,985):p.d.line((790,yy,900,920),fill='#A7BFEB',width=4)
  for xx,ys in ((650,[820,920,1020]),(790,[855,985]),(900,[920])):
   for yy in ys:p.d.ellipse((xx-18,yy-18,xx+18,yy+18),fill=BLUE)
  p.arrow(946,920,1030,920);p.pill('猫',1060,855,215,YELLOW,130,83)
  for x,s in ((320,'图片 → 数字'),(780,'模型计算'),(1170,'类别')):p.t(s,x,1160,52,bold=True,align='center',maxw=370)
  p.t('接收什么 → 怎样计算 → 输出什么',720,1320,52,color=BLUE,align='center')
 elif kind in ('checklist','taskcards'):
  for i,(head,body)in enumerate(a['items']):
   y=708+i*221;p.pill(f'{i+1:02d}',126,y,115,[YELLOW,PALE,ROSE][i],115,60)
   p.t(head,290,y+2,63,bold=True,maxw=1000);p.t(body,290,y+95,51,color=GRAY,maxw=990)
 elif kind=='trainuse':
  for i,(head,items)in enumerate([('训练时',['做预测','比较目标','调整参数']),('通常使用时',['新图片','已有参数','算出结果'])]):
   y=720+i*330;p.t(head,126,y,56,bold=True)
   for j,s in enumerate(items):
    x=126+j*417;p.pill(s,x,y+109,355,ROSE if i==0 else PALE,145,56)
    if j<2:p.arrow(x+368,y+183,x+400,y+183)
 elif kind=='gridpair':
  mode=a['mode'];p.grid(a['left'],190,832,125);p.arrow(637,1018,762,1018)
  p.grid(a['right'],868,832,125,numbers=mode=='encode',highlight=(1,1)if mode=='change'else None)
  labs={'encode':('黑白格','数字表'),'change':('010111010','010101010'),'position':('横着排','竖着排')}[mode]
  p.t(labs[0],377,730,60,bold=True,align='center');p.t(labs[1],1055,730,60,bold=True,align='center')
  p.t({'encode':'3 行 × 3 列＝9 个位置','change':'只有中心格变成了白色','position':'都是 3 个黑格，位置不同'}[mode],720,1298,57,bold=True,align='center')
 elif kind=='meaning':
  p.grid([[0,1,0],[1,1,1],[0,1,0]],564,735,104)
  p.arrow(720,1080,350,1195);p.arrow(720,1080,1080,1195)
  p.pill('加法符号？',139,1220,495,YELLOW,120,62);p.pill('路口标记？',800,1220,495,PALE,120,62)
 elif kind=='parameter':
  p.pill('输入',140,745,270,PALE);p.t('＋',460,760,70,bold=True);p.pill('参数 b',550,745,380,YELLOW);p.t('＝',977,760,70,bold=True);p.pill('预测',1080,745,220,ROSE)
  for i,(x,y)in enumerate([(1,3),(2,4),(3,5)]):
   yy=972+i*128;p.t(f'输入 {x}',180,yy,64,bold=True);p.arrow(502,yy+39,811,yy+39);p.t(f'目标 {y}',937,yy,64,bold=True)
 elif kind=='parameter_table':
  xs=[175,430,785,1165];heads=['参数 b','预测','目标','总误差']
  for x,s in zip(xs,heads):p.t(s,x,731,51,bold=True,align='center')
  rows=[['0','1、2、3','3、4、5','6'],['1','2、3、4','3、4、5','3'if a['reveal']else'?']]
  if a['reveal']:rows.append(['2','3、4、5','3、4、5','0'])
  for i,row in enumerate(rows):
   yy=882+i*163;p.rr([PALE,ROSE,'#FFF0BA'][i],(115,yy-22,1325,yy+115),17)
   for x,s in zip(xs,row):p.t(s,x,yy,61,bold=True,align='center')
  if not a['reveal']:p.t('绝对误差＝预测与目标相差的距离',720,1280,50,align='center')
 elif kind=='filter':
  v=a['variant'];left=[[0,1,0]]*3;right=left if v=='vertical'else[[1,1,1]]*3
  p.t('模板',340,728,62,bold=True,align='center');p.t('图块',1100,728,62,bold=True,align='center')
  p.grid(left,175,843,110,True);p.t('逐格乘',720,960,58,bold=True,align='center');p.grid(right,929,843,110)
  p.t('再相加 → '+('3'if v=='vertical'else'?'),720,1290,82,bold=True,align='center',color=BLUE)
 elif kind=='filtercompare':
  for x,arr,label in [(205,[[0,1,0]]*3,'竖线'),(911,[[1,1,1]]*3,'全黑')]:
   p.grid(arr,x,828,106);p.t(label,x+159,731,60,bold=True,align='center');p.pill('得分 3',x,1195,318,YELLOW,116,62)
  p.t('同一个模板',720,980,49,bold=True,align='center',maxw=260)
 elif kind=='slide':
  for i,(arr,nums)in enumerate([([[0,1,0,0,0]]*3,['3','0','0']),([[0,0,1,0,0]]*3,['0','3','0'])]):
   y=750+i*320;p.grid(arr,145,y,80);p.arrow(625,y+120,802,y+120)
   for j,n in enumerate(nums):p.pill(n,871+j*140,y+70,118,YELLOW if n=='3'else PALE,118,66)
  p.t('步长 1，不补边；结果按窗口位置排列',720,1330,49,align='center')
 elif kind=='residual':
  p.pill(a['x'],127,993,210,PALE,140,92);p.pill('F 输出 '+a['f'],537,760,405,ROSE,140,66);p.pill(a['out'],1098,993,217,YELLOW,140,92)
  p.d.line((340,1063,435,1063,435,830,530,830),fill=BLUE,width=6);p.arrow(460,830,530,830)
  p.d.line((944,830,1010,830,1010,1030),fill=BLUE,width=6);p.arrow(1010,990,1010,1030)
  p.arrow(345,1063,966,1063);p.t('＋',996,1040,58,bold=True,align='center');p.arrow(1040,1063,1090,1063)
  p.t('原值直通',664,1122,56,bold=True,align='center');p.t('两路相加',720,1306,61,bold=True,align='center',color=BLUE)
 elif kind=='story':
  items=[('红伞出门',RED),('天色变阴',PALE),('路上起风',YELLOW)]
  for i,(s,c)in enumerate(items):
   x=130+i*414;p.rr(c,(x,835,x+345,1134),24);p.t(s,x+172,940,56,bold=True,align='center',maxw=310)
   if i<2:p.arrow(x+351,980,x+398,980)
  p.t('最后问：伞是什么颜色？',720,1288,64,bold=True,align='center')
 elif kind=='notes':
  keep=a['mode']=='keep';vals=['红','红','红']if keep else['红伞','阴天','起风']
  for i,s in enumerate(vals):
   x=130+i*414;p.rr(YELLOW,(x,830,x+345,1190),10);p.t(f'第 {i+1} 步',x+172,870,46,align='center');p.t(s,x+172,1000,100,bold=True,align='center')
   if i<2:p.arrow(x+350,1004,x+398,1004)
  p.t('留下颜色线索'if keep else'新记录覆盖旧记录',720,1298,62,bold=True,align='center',color=BLUE)
 elif kind=='state':
  p.pill('上一刻状态',142,754,495,PALE,145,64);p.pill('当前输入',805,754,495,YELLOW,145,64)
  p.arrow(390,931,668,1130);p.arrow(1052,931,773,1130);p.pill('计算并更新状态',385,1152,670,ROSE,156,70)
  p.t('规则由参数决定',720,1350,48,align='center')
 elif kind in ('tokens','tokenloop'):
  mode=a.get('mode','loop')
  if mode=='loop':
   for x,s in [(130,'已有文字'),(552,'计算候选'),(974,'接上一片')]:p.pill(s,x,924,338,PALE if x!=974 else YELLOW,170,58)
   p.arrow(474,1008,541,1008);p.arrow(902,1008,965,1008);p.d.line((1145,1118,1145,1290,300,1290,300,1120),fill=BLUE,width=7);p.arrow(300,1210,300,1120)
   p.t('新片段加入上下文',720,1190,58,bold=True,align='center')
  else:
   p.pill('我',130,925,250,YELLOW,155,98)
   for y,s,prob,c in [(774,'读书','0.6',PALE),(1130,'画画','0.4',ROSE)]:
    p.arrow(405,1000,614,y+70);p.pill(s,646,y,315,c,145,80);p.t(prob,510,y-10 if prob=='0.6' else y+116,55,bold=True)
    p.arrow(981,y+70,1112,y+70);p.pill('。',1140,y,170,PALE,145,80)
   if mode=='greedy':p.t('每步选最大 → 我读书。',720,1325,60,bold=True,align='center')
   else:p.t('本例约定：接到句号就停止',720,1330,52,align='center')
 elif kind=='sampling':
  p.t('10 张等机会卡片：6 张读书，4 张画画',720,725,51,bold=True,align='center')
  for i in range(10):
   x=131+(i%5)*245;y=853+(i//5)*236
   p.rr(PALE if i<6 else ROSE,(x,y,x+208,y+186),16);p.t('读书'if i<6 else'画画',x+104,y+64,63,bold=True,align='center')
  p.t('每次抽后放回并洗匀，仍是这 10 张卡',720,1334,53,align='center')
 elif kind=='pronoun':
  mode=a['mode'];p.shape(373,952,'circle',RED,126);p.rr(PALE,(923,840,1193,1086),15,INK)
  p.t('小球',373,1160,66,bold=True,align='center');p.t('盒子',1058,1160,66,bold=True,align='center')
  target='太大'if mode=='big'else'太小';p.pill('它'+target,527,721,398,YELLOW,132,67)
  if mode!='smallquiz':p.arrow(720,870,420 if mode=='big'else 985,970)
  else:p.t('?',720,988,124,bold=True,align='center',color=BLUE)
  p.t('句意分析；大小只作示意',720,1320,52,align='center')
 elif kind=='weighted':
  for i,(expr,ans)in enumerate([('2 × 0.75 ＋ 10 × 0.25','4'),('2 × 0.25 ＋ 10 × 0.75','8')]):
   y=768+i*285;p.rr(PALE if i==0 else ROSE,(127,y,1313,y+219),20);p.t(expr,167,y+58,62,bold=True,maxw=865);p.t('＝'+ans,1262,y+51,81,bold=True,align='right')
  p.t('同样的数，不同的权重 → 不同结果',720,1340,54,align='center')
 elif kind=='transformer':
  for y,s,c in [(720,'文字 → 编号与数字表示',PALE),(930,'加入顺序信息，多层计算',ROSE),(1140,'得到下一片文字的候选',YELLOW)]:
   p.pill(s,200,y,1040,c,145,68)
   if y<1140:p.arrow(720,y+156,720,y+197)
 elif kind=='maskquiz':
  for x,s,c in [(150,'今天',PALE),(590,'下雨',PALE),(1030,'了',ROSE)]:p.pill(s,x,920,260,c,150,84)
  p.d.line((987,768,987,1290),fill=RED,width=9);p.t('已有前文',490,759,69,bold=True,align='center');p.t('要预测',1160,759,58,bold=True,align='center')
  p.t('后面的答案，要先遮住',720,1310,68,bold=True,align='center')
 elif kind=='mask':
  labs=['今天','下雨','了'];x0=557;y0=839;cell=155
  p.t('可读取的位置',790,714,56,bold=True,align='center')
  for j,s in enumerate(labs):p.t(s,x0+(j+.5)*cell,785,48,align='center')
  for i,s in enumerate(labs):
   p.t(s,390,y0+i*cell+45,60,bold=True,align='center')
   for j in range(3):
    p.rr(PALE if j<=i else'#E4E4E0',(x0+j*cell,y0+i*cell,x0+(j+1)*cell-10,y0+(i+1)*cell-10),14)
    p.t('可读'if j<=i else'遮住',x0+(j+.5)*cell-5,y0+i*cell+49,46,align='center')
  p.t('行＝当前输入位置；列＝能使用的信息',720,1337,49,align='center')
 elif kind=='candidate':
  p.pill('今天 / 下雨',218,727,1004,PALE,118,66)
  for i,(s,val,col)in enumerate([('了','0.60',BLUE),('吗','0.25',RED),('，','0.15',GREEN)]):
   y=922+i*130;p.t(s,208,y,68,bold=True);p.rr(col,(374,y,374+float(val)*1000,y+74),10);p.t(val,1197,y+4,60,bold=True,align='center')
  p.t('选最大 → 接上“了” → 再计算',720,1340,58,bold=True,align='center')
 elif kind=='memory':
  mode=a['mode'];vals=['红','蓝','黄','空','空']if mode=='read'else['红','绿','黄','空','空']
  for i,s in enumerate(vals):
   x=143+i*238;p.rr(YELLOW if i==1 else PALE,(x,889,x+206,1128),17,INK if i==1 else None);p.t(i+1,x+103,791,60,bold=True,align='center');p.t(s,x+103,968,78,bold=True,align='center')
  p.t('格号',139,711,48,bold=True)
  if mode=='overwrite':p.t('第 2 格：蓝 → 绿',720,1210,78,bold=True,align='center',color=BLUE)
  else:p.t('读第 2 格 → '+('蓝'if mode=='read'else'绿'),720,1210,78,bold=True,align='center',color=BLUE)
  p.t('地址相同，保存的内容可以变化',720,1340,51,align='center')
 elif kind=='models':
  mode=a['mode'];heads=['方案','答对 / 100','耗时 / 次','成本 / 次'];xs=[230,575,955,1200]
  for x,s in zip(xs,heads):p.t(s,x,731,47,bold=True,align='center')
  for i,row in enumerate([['A','80','1 秒','1 点'],['B','90','4 秒','3 点'],['C','92','8 秒','6 点']]):
   y=862+i*162;good=mode=='all'or(mode=='five'and i<2)or(mode=='two'and i==0)
   p.rr(PALE if good else'#E5E4DE',(127,y-23,1313,y+116),17)
   for x,s in zip(xs,row):p.t(s,x,y,65,bold=True,align='center',color=INK if good else GRAY)
  label={'all':'每次请求耗时、成本固定；数值均虚构','five':'5 秒、3 点内 → A、B 可行','two':'2 秒、3 点内 → 只有 A 可行'}[mode]
  p.t(label,720,1343,52,bold=True,align='center',color=BLUE)
 elif kind=='compress':
  mode=a['mode']
  if mode=='basic':rows=[('直接模式','LABABABAB','9 单位'),('重复模式','R4AB','4 单位')]
  elif mode=='exception':rows=[('要还原','ABABABAC','末位改成 C'),('规则＋例外','R4AB8C','6 单位')]
  else:rows=[('3 个替换','4＋2×3','10 单位'),('直接记录：提示 L＋8 个原字符','1＋8','9 单位')]
  for i,(label,s,cost)in enumerate(rows):
   y=726+i*325;p.t(label,143,y,53,bold=True);p.rr(PALE if i==0 else ROSE,(127,y+92,1312,y+254),17)
   p.t(s,172,y+130,76,bold=True,maxw=773);p.t(cost,1270,y+142,55,bold=True,align='right',maxw=350)
  p.t('比较的是同一套编码里的总长度',720,1345,52,align='center')
 elif kind=='mdl':
  p.pill('描述规则',153,788,501,PALE,180,84);p.pill('补充例外',786,788,501,ROSE,180,84);p.t('＋',719,853,76,bold=True,align='center')
  p.arrow(403,1000,630,1150);p.arrow(1037,1000,810,1150);p.pill('一起比较总长度',336,1170,768,YELLOW,154,72)
 elif kind=='relation':
  mode=a['mode'];rows=[['circle','square','triangle']]if mode=='first'else[['circle','triangle','square']]
  if mode=='compare':rows=[['circle','square','triangle'],['circle','triangle','square']]
  for i,row in enumerate(rows):
   y=(895 if len(rows)==1 else 820+i*315)
   for j,s in enumerate(row):p.shape(314+j*399,y,s,{'circle':RED,'square':BLUE,'triangle':GREEN}[s],80)
   p.d.line((146,y+119,1295,y+119),fill=INK,width=5)
   label=('答案 1'if i==0 else'答案 2')if mode=='compare'else('答案 1'if mode=='first'else'答案 ?')
   p.t(label,720,y+153,68,bold=True,align='center',color=BLUE)
  if len(rows)==1:p.t('问题：蓝方左边有几个物体？',720,1257,58,bold=True,align='center')
 elif kind=='evidence':
  mode=a['mode']
  if mode=='three':
   rows=[('周日开放','支持',PALE),('周日闭馆','矛盾',ROSE),('只知工作日','未说明',YELLOW)]
   for i,(s,l,c)in enumerate(rows):
    y=747+i*207;p.pill(s,142,y,720,c,138,67);p.arrow(888,y+69,979,y+69);p.t(l,1160,y+35,66,bold=True,align='center')
  else:
   p.pill('回答：周日开放',135,745,1170,PALE,150,74)
   p.arrow(720,933,720,1024);p.rr(ROSE if mode=='conflict'else YELLOW,(136,1060,1305,1345),20)
   p.t('虚构公告原文' if mode=='conflict' else '已提供的工作日信息',185,1100,48,bold=True)
   p.t('“周末闭馆”'if mode=='conflict'else'“工作日开放”',720,1200,75,bold=True,align='center')
 elif kind=='library':
  mode=a['mode']
  if mode=='notice':
   p.t('D1 / 本学期常规安排',144,738,58,bold=True)
   p.pill('工作日 12:00—18:00 开放',132,883,1176,PALE,170,69)
   p.pill('周末闭馆',132,1133,1176,YELLOW,151,72)
  elif mode=='repair':
   p.pill('已有：常规安排',148,753,1144,PALE,145,73);p.pill('缺少：临时检修通知',148,965,1144,ROSE,145,73)
   p.t('不能据此确定现场状态',720,1244,70,bold=True,align='center')
  else:
   for y,head,ans,c in [(752,'明年周二也开放吗？','资料不足，不能确定',YELLOW),(1097,'告诉我同学的住址','请求越界，不能提供',ROSE)]:
    p.rr(c,(128,y,1311,y+245),20);p.t(head,173,y+35,65,bold=True);p.t(ans,173,y+137,58)
 else:raise ValueError(kind)

def main():
 for e in EPISODES:
  if e['n']==2:continue
  for pn,(title,deck,kind,args,bottom)in enumerate(e['pages'],2):
   p=Page(e,pn);p.title(title);p.para(deck,88,510,56,1260,78)
   draw(p,kind,args)
   y=1496
   for s in bottom:y+=p.para(s,88,y,55,1260,80)+18
   p.finish()
 (ROOT/'制作记录'/'全套排版检查.json').write_text(json.dumps({'generated_inner_pages':60,'text_boxes':AUDIT,'note':'文本边界已检查。原尺寸视觉与手机宽度预览须另行检查。'},ensure_ascii=False,indent=2))
 print('Rendered 60 inner pages.')
if __name__=='__main__':main()
