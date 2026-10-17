from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, math, shutil

ROOT = Path(__file__).resolve().parent
OUT = ROOT / '发布图片'
FONTROOT = ROOT.parent / '制作记录' / 'fonts'
W,H = 1440,1920
CREAM='#FFF8E8'; INK='#142C42'; BLUE='#2466E8'; RED='#F37365'; YELLOW='#FFCD44'; MUTED='#50677A'
PALE_BLUE='#E8EFFD'; PALE_RED='#FFE5DC'; WHITE='#FFFEF9'
audit=[]

def font(size, bold=False, hand=False):
    p=FONTROOT/('LXGWWenKai-Medium.ttf' if hand else 'NotoSansSC[wght].ttf')
    f=ImageFont.truetype(str(p),size)
    if not hand: f.set_variation_by_axes([800 if bold else 500])
    return f

def text(s,x,y,size=60,fill=INK,bold=False,hand=False,align='left'):
    f=font(size,bold,hand)
    box=d.textbbox((0,0),s,font=f,anchor='lt')
    width=box[2]-box[0]
    if align=='center': x-=width/2
    if align=='right': x-=width
    if x<55 or x+width>W-55: raise ValueError(f'横向出界: {s}, {x}, {width}')
    if y+box[3]>H-55: raise ValueError(f'纵向出界: {s}')
    d.text((x,y),s,font=f,fill=fill,anchor='lt')
    audit.append({'page':page,'text':s,'size':size,'bbox':[x,y,x+width,y+box[3]]})

def lines(arr,x,y,size=60,step=None,**kw):
    for i,s in enumerate(arr): text(s,x,y+i*(step or size*1.45),size,**kw)

def rr(box,fill,radius=28,outline=None,width=3):
    d.rounded_rectangle(box,radius,fill,outline,width)

def block(x,y,shape,color,r=76):
    # A face-on shape with a small cast shadow; counts stay exact and obvious.
    box=(x-r,y-r,x+r,y+r)
    shadow=(x-r+9,y-r+12,x+r+9,y+r+12)
    if shape=='circle':
        d.ellipse(shadow,fill='#D9D6C9');d.ellipse(box,fill=color,outline=INK,width=5)
        d.arc((x-r+18,y-r+18,x+r-18,y+r-18),205,280,fill=WHITE,width=6)
    else:
        rr(shadow,'#D9D6C9',10);rr(box,color,10,INK,5)
        d.line((x-r+18,y-r+23,x+r-20,y-r+23),fill=WHITE,width=6)

def arrow(x1,y1,x2,y2,color=INK,width=6):
    d.line((x1,y1,x2,y2),fill=color,width=width)
    a=math.atan2(y2-y1,x2-x1)
    pts=[(x2,y2)]+[(x2-23*math.cos(a+t),y2-23*math.sin(a+t)) for t in (-.55,.55)]
    d.polygon(pts,fill=color)

def base(n,kicker):
    global im,d,page
    page=n; im=Image.new('RGB',(W,H),CREAM);d=ImageDraw.Draw(im)
    # Restrained notebook markings, outside the reading area.
    for x in range(1010,1380,42):
        for y in range(150,430,42): d.ellipse((x,y,x+3,y+3),fill='#D9D9D0')
    d.rectangle((84,73,104,121),fill=BLUE)
    text('少年 AI 观察室',128,73,40,bold=True)
    text('第 02 期 / '+kicker.split(' / ')[-1],1354,77,34,fill=MUTED,align='right')
    d.line((84,1765,1356,1765),fill='#D6D6CB',width=2)
    text('手写规则示意 · 非真实模型测评',86,1802,42,fill=MUTED)
    text(f'{n:02d} / 05',1355,1805,38,fill=MUTED,align='right')

def save(n): im.save(OUT/f'{n:02d}.png',optimize=True)

OUT.mkdir(exist_ok=True)

# 02: Show the complete eight-item training set, then define both rules.
base(2,'满分谜题 / 看例子')
text('先看这 8 张图',84,208,112,bold=True)
text('任务：把圆形和正方形分开。',88,374,60)
rr((84,492,1356,1046),WHITE,32,INK,4)
text('最初的例子',126,532,46,bold=True)
for x in (270,566,862,1158): block(x,720,'circle',RED)
for x in (270,566,862,1158): block(x,932,'square',BLUE)
rr((84,1100,694,1448),PALE_RED,28)
rr((730,1100,1356,1448),PALE_BLUE,28)
text('A  看颜色',126,1145,66,bold=True)
text('B  看形状',772,1145,66,bold=True)
lines(['红色 → 答“圆”','蓝色 → 答“方”'],126,1258,53,step=80)
lines(['圆形 → 答“圆”','方形 → 答“方”'],772,1258,53,step=80)
rr((84,1504,1356,1620),YELLOW,20)
text('两条规则，都答对 8 / 8',720,1524,69,bold=True,align='center')
text('成绩相同，用的线索也相同吗？',720,1660,56,hand=True,align='center')
save(2)

# 03: A genuinely answerable quiz, with all four test shapes visible.
base(3,'满分谜题 / 猜一猜')
lines(['换个颜色，','再猜一次'],84,204,112,step=141,bold=True)
text('形状任务没变，只换了颜色搭配。',88,534,58)
rr((84,660,1356,1240),WHITE,32,INK,4)
rr((112,634,458,710),YELLOW,12)
text('4 个新例子',140,649,47,bold=True)
for x in (340,1094): block(x,846,'circle',BLUE,96)
for x in (340,1094): block(x,1102,'square',RED,96)
text('蓝色圆块',720,811,56,bold=True,align='center')
text('红色方块',720,1067,56,bold=True,align='center')
text('谁能把这 4 张图按形状分对？',84,1320,64,bold=True)
lines(['A  仍按颜色判断','B  仍按形状判断'],90,1450,62,step=98)
arrow(1040,1684,1312,1684,BLUE)
text('先想一想，再看下一张',88,1660,53,hand=True)
save(3)

# 04: Exact counts, decisions, and limited interpretation of the scores.
base(4,'满分谜题 / 揭晓')
lines(['同样的满分，','换搭配就不同了'],84,204,100,step=132,bold=True)
rr((84,546,1356,982),PALE_RED,30)
text('A  看颜色',128,590,63,bold=True)
text('答对 0 / 4',1293,580,75,bold=True,align='right')
block(218,760,'circle',BLUE,60);arrow(312,760,399,760)
text('答“方”',436,724,63,bold=True)
text('实际是圆',1290,736,52,align='right')
block(218,909,'square',RED,60);arrow(312,909,399,909)
text('答“圆”',436,873,63,bold=True)
text('实际是方',1290,885,52,align='right')
rr((84,1040,1356,1428),PALE_BLUE,30)
text('B  看形状',128,1089,63,bold=True)
text('答对 4 / 4',1293,1079,75,bold=True,align='right')
block(227,1285,'circle',BLUE,66)
block(450,1285,'square',RED,66)
lines(['按轮廓判断，','这 4 张图都认对。'],625,1207,57,step=86)
lines(['颜色规则在这组新搭配上失灵了。','但答对 4 次，也不保证以后一直对。'],90,1505,57,step=98)
save(4)

# 05: Give one transferable idea and preserve task-dependent boundaries.
base(5,'满分谜题 / 带走一个问题')
lines(['别只问“几分”，','还要问“怎么测的”'],84,207,100,step=132,bold=True)
text('一条线索是否有用，要看具体任务。',88,514,58)
rr((84,663,1356,1072),WHITE,30,INK,4)
text('按形状分类',140,709,58,bold=True)
text('按颜色分类',820,709,58,bold=True)
block(217,894,'circle',BLUE,69);block(422,894,'circle',RED,69)
block(883,894,'circle',BLUE,69);block(1103,894,'square',BLUE,69)
text('这两个是一类',140,993,52,fill=BLUE)
text('这两个是一类',820,993,52,fill=BLUE)
d.line((720,709,720,1032),fill='#D6D6CB',width=3)
rr((84,1152,1356,1434),YELLOW,28)
lines(['下次看到“训练成绩 100%”，','试着追问：换一种合理搭配，','它还能认对吗？'],128,1192,60,step=78,bold=True)
lines(['把蓝圆和红方补进测试，再问：','还能怎样换搭配，检查颜色这条“捷径”？'],88,1521,55,step=87)
save(5)

(ROOT/'排版检查.json').write_text(json.dumps({'canvas':[W,H],'generated_pages':[2,3,4,5],'text_boxes':audit,'note':'检查文本边界；不代表公众号后台手机预览已通过。封面为独立生成图，不在本脚本文本框检查范围。'},ensure_ascii=False,indent=2))
print('Rendered pages 02–05; checked text bounding boxes.')
