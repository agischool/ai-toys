const fs=require('fs'),path=require('path');
const {chromium}=require('/Users/advance/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'youth-art');fs.mkdirSync(out,{recursive:true});
const dirs=fs.readdirSync(root).filter(x=>/^\d\d_/.test(x)).sort();
const mascot='data:image/png;base64,'+fs.readFileSync(path.join(__dirname,'illustration-assets/science-guide.png')).toString('base64');
const C={ink:'#203745',teal:'#168d90',coral:'#e76c59',gold:'#ffc857',purple:'#8d82d8',paper:'#fffdf7',mint:'#def3ed',rose:'#ffe6de',blue:'#e3efff',cream:'#fff1d4',muted:'#556975',white:'#ffffff'};
const e=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const txt=(x,y,s,size=30,color=C.ink,weight=600,anchor='start')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}">${e(s)}</text>`;
const lines=(x,y,ss,size=30,color=C.ink,gap=44)=>ss.map((s,i)=>txt(x,y+i*gap,s,size,color,500)).join('');
const box=(x,y,w,h,fill=C.white,r=20,stroke=C.ink)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
const circle=(x,y,r,fill=C.gold)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${C.ink}" stroke-width="3"/>`;
const arrow=(x1,y1,x2,y2,color=C.ink,sw=5)=>`<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${color}" stroke-width="${sw}" fill="none" stroke-linecap="round" marker-end="url(#arr)"/>`;
const route=(d,color=C.teal,sw=7)=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" marker-end="url(#arr)"/>`;
const pill=(x,y,w,s,fill=C.gold,size=28)=>{const h=Math.max(48,size*1.55);return box(x,y,w,h,fill,h/2)+txt(x+w/2,y+h*.71,s,size,fill===C.teal?C.white:C.ink,700,'middle')};
const bubble=(x,y,w,ss,fill=C.white)=>box(x,y,w,ss.length*42+30,fill,20)+lines(x+18,y+40,ss,28);
const digit=(x,y,s,color=C.teal,size=56)=>txt(x,y,s,size,color,800,'middle');
const label=(x,y,s)=>txt(x,y,s,26,C.muted,500,'middle');
const object=(type,x,y,size=60)=>{
 const fill=type.startsWith('红')?C.coral:type.startsWith('蓝')?'#387ac5':'#54a87d';
 const shape=type.includes('圆')?circle(x,y,size/2,fill):type.includes('三角')?`<path d="M${x} ${y-size/2} L${x+size/2} ${y+size/2} L${x-size/2} ${y+size/2} Z" fill="${fill}" stroke="${C.ink}" stroke-width="3"/>`:box(x-size/2,y-size/2,size,size,fill,8);
 return shape;
};
const cat=(x,y,s=1,toy=false)=>`<g transform="translate(${x},${y}) scale(${s})"><path d="M-62 10 L-60 -60 L-25 -36 Q0 -52 26 -36 L60 -60 L64 12 Q55 65 0 64 Q-56 60 -62 10Z" fill="${toy?C.purple:C.gold}" stroke="${C.ink}" stroke-width="5"/><path d="M-46 -36 L-44 -13 L-26 -26 M44 -36 L44 -13 L26 -26" fill="${C.coral}"/><circle cx="-24" cy="9" r="6" fill="${C.ink}"/><circle cx="24" cy="9" r="6" fill="${C.ink}"/><path d="M-7 27 L7 27 L0 34 Z M0 34 Q-12 48 -21 37 M0 34 Q12 48 21 37" fill="none" stroke="${C.ink}" stroke-width="4"/><path d="M-44 29 L-83 22 M-43 40 L-82 45 M44 29 L83 22 M43 40 L82 45" stroke="${C.ink}" stroke-width="3"/>${toy?`<path d="M-42 -12 L-28 -6 M-38 -19 L-34 0" stroke="${C.ink}" stroke-width="3"/>`:''}</g>`;
const book=(x,y,w=120,h=110,color=C.teal)=>box(x,y,w,h,color,8)+`<path d="M${x+15} ${y}V${y+h} M${x+28} ${y+30}H${x+w-20} M${x+28} ${y+50}H${x+w-32}" stroke="${C.white}" stroke-width="5"/>`;
const magnify=(x,y,r=35)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${C.blue}" stroke="${C.ink}" stroke-width="7"/><path d="M${x+r*.7} ${y+r*.7}l35 35" stroke="${C.coral}" stroke-width="16" stroke-linecap="round"/>`;
const umbrella=(x,y,s=1)=>`<g transform="translate(${x},${y}) scale(${s})"><path d="M-70 0 Q0 -100 70 0 Q48 -22 24 0 Q0 -22 -24 0 Q-48 -22 -70 0Z" fill="${C.coral}" stroke="${C.ink}" stroke-width="4"/><path d="M0 -54 V70 Q0 95 -22 80" fill="none" stroke="${C.ink}" stroke-width="6" stroke-linecap="round"/></g>`;
const matrix=(x,y,rows,size=48,on=C.teal,numbers=true,highlight=-1)=>rows.map((row,r)=>[...row].map((v,c)=>box(x+c*size,y+r*size,size,size,v==='1'?on:C.white,0,C.ink)+(numbers?txt(x+c*size+size/2,y+r*size+size*.7,v,size*.59,v==='1'?C.white:C.ink,700,'middle'):'')).join('')).join('')+(highlight>=0?`<rect x="${x+highlight*size}" y="${y}" width="${size*3}" height="${rows.length*size}" fill="none" stroke="${C.coral}" stroke-width="7"/>`:'');
const tiles=(x,y,values,w=64,h=64,fill=C.blue)=>values.map((v,i)=>box(x+i*(w+8),y,w,h,fill,9)+txt(x+i*(w+8)+w/2,y+h*.68,v,Math.min(34,w*.6),C.ink,700,'middle')).join('');
const lock=(x,y)=>`<path d="M${x+12} ${y+30}v-15a23 23 0 0 1 46 0v15" fill="none" stroke="${C.ink}" stroke-width="7"/>`+box(x,y+25,70,60,C.gold,12)+circle(x+35,y+53,6,C.ink);
const check=(x,y,yes=true)=>txt(x,y,yes?'✓':'×',42,yes?C.teal:C.coral,800,'middle');
const robot=(x,y,w=110)=>`<image href="${mascot}" x="${x}" y="${y}" width="${w}" height="${w}" preserveAspectRatio="xMidYMid meet"/>`;
const figureSvg=(n,title,sub,body,tip,foot,h=930)=>`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="${h}" viewBox="0 0 720 ${h}" role="img"><defs><marker id="arr" markerUnits="userSpaceOnUse" markerWidth="22" markerHeight="22" viewBox="0 0 9 9" refX="7.5" refY="4.5" orient="auto-start-reverse"><path d="M1 1 L8 4.5 L1 8" stroke="${C.ink}" stroke-width="1.7" fill="none"/></marker></defs><style>text{font-family:'PingFang SC','Noto Sans CJK SC',sans-serif}</style><rect width="720" height="${h}" rx="28" fill="${C.paper}"/><path d="M26 108H694" stroke="${C.ink}" stroke-width="3"/>${pill(28,22,78,String(n).padStart(2,'0'),C.teal,27).replace(`fill="${C.ink}" font-weight="700"`,`fill="${C.white}" font-weight="700"`)}${txt(128,62,title,40,C.ink,800)}${txt(30,145,sub,28,C.muted,500)}${body}${box(28,h-142,664,92,C.mint,20,'none')}${lines(48,h-106,tip,27,C.ink,37)}${robot(575,h-169,118)}${txt(30,h-20,foot,23,C.muted,500)}</svg>`;
let figures=[];
function add(a,j,title,sub,body,tip,foot='原理示意 · 数值由本文设定',h=930){
 const dir=dirs[a-1],names=fs.readdirSync(path.join(root,dir)).filter(x=>x.endsWith('.png')&&!x.startsWith('00_')).sort();
 figures.push({a,j,name:names[j-1],dir,svg:figureSvg(a,title,sub,body,tip,foot,h)});
}

// 01: A picture becomes scores; use an actual illustrated input, not a text placeholder.
add(1,1,'认猫，要经过几站？','训练调参数；使用时按已有参数计算。',
 pill(34,176,140,'训练时',C.gold)+box(35,250,170,95,C.cream)+txt(120,289,'带标签',31,C.ink,700,'middle')+txt(120,326,'的图片',31,C.ink,700,'middle')+arrow(214,298,264,298)+box(281,250,160,95,C.rose)+lines(303,289,['比较预测','与标签'],29)+arrow(450,298,494,298)+box(510,250,172,95,C.mint)+lines(531,289,['调整参数','再试一次'],29)+route('M596 359V392H118V358',C.coral,4)+
 pill(34,419,140,'使用时',C.teal)+cat(120,549,.78)+arrow(205,553,271,553)+box(292,480,143,150,C.mint)+txt(363,533,'已训练',29,C.ink,700,'middle')+txt(363,575,'模型',35,C.ink,800,'middle')+arrow(444,553,493,553)+box(510,480,174,150,C.cream)+lines(527,535,['猫 0.8','狗 0.2'],34)+label(120,652,'新图片 → 数字')+pill(250,694,255,'选最高分 → 猫',C.gold),['参数先调好，再拿来用。','不是每来一张图就重训。']
);
add(1,2,'答得自信，也可能认错','看看这次送进来的，究竟是什么。',
 box(40,185,280,265,C.rose)+cat(177,296,1.2,true)+label(180,423,'模糊的毛绒玩具')+bubble(370,195,290,['只让我选猫或狗？','那我选……猫！'],C.cream)+robot(423,323,145)+arrow(338,369,376,369)+
 txt(44,508,'二选一的程序仍可能给出高分',32)+box(44,545,632,127,C.white)+txt(65,590,'猫',32)+box(120,567,420,32,C.teal,14,'none')+digit(614,597,'0.9',C.teal,42)+txt(65,640,'狗',32)+box(120,617,47,32,C.coral,14,'none')+digit(614,647,'0.1',C.coral,42)+pill(145,700,432,'输入已经超出约定范围',C.rose),['先检查输入是否适合任务，','再看分数有多高。'],'假设情景 · 并非真实模型测试');

// 02: the training/test examples stay countable and explicitly separate.
let train='';for(let i=0;i<4;i++)train+=object('红圆',93+i*78,284,49)+object('蓝方',93+i*78,363,49);
add(2,1,'满分，可能靠的是捷径','同样8个训练例子，两条规则都得满分。',
 pill(33,184,170,'训练集 8个',C.gold)+train+lines(410,269,['A 看颜色','红→圆  蓝→方','B 看轮廓','圆→圆  方→方'],29,C.ink,43)+pill(65,424,275,'A：8/8＝100%',C.cream)+pill(375,424,275,'B：8/8＝100%',C.mint)+
 txt(38,527,'换成4个没用过的测试例子',32)+object('蓝圆',103,600,64)+object('蓝圆',239,600,64)+object('红方',441,600,64)+object('红方',577,600,64)+label(169,666,'2个蓝圆')+label(509,666,'2个红方')+pill(50,704,286,'A：0/4＝0%',C.rose)+pill(374,704,297,'B：4/4＝100%',C.mint),['看颜色和看形状，','换个搭配就分出差别。'],'手写规则算例 · 测试刻意改变搭配');
add(2,2,'补齐搭配，捷径就露馅','更多样的例子，比重复拍同一种更有用。',
 box(45,192,630,345,C.white)+txt(198,236,'圆形',33,C.ink,700,'middle')+txt(513,236,'方形',33,C.ink,700,'middle')+object('红圆',142,307,62)+digit(257,324,'4个',C.ink,39)+object('红方',461,307,62)+digit(573,324,'1个',C.coral,39)+object('蓝圆',142,437,62)+digit(257,454,'1个',C.coral,39)+object('蓝方',461,437,62)+digit(573,454,'4个',C.ink,39)+pill(437,353,170,'新增',C.gold,25)+pill(120,481,170,'新增',C.gold,25)+
 box(44,574,301,152,C.rose)+lines(64,613,['A 按颜色','新增2个都答错'],28)+digit(193,700,'8/10＝80%',C.coral,38)+box(371,574,306,152,C.mint)+lines(391,613,['B 按轮廓','10个全答对'],28)+digit(524,700,'10/10＝100%',C.teal,34),['缺的搭配补进来，','才有机会暴露旧规则的问题。'],'手写规则计算 · 不是模型重训结果');

// 03: pixels and channels.
add(3,1,'把十字装进九个格子','约定黑格是1，白格是0。',
 matrix(55,204,['010','111','010'],62,C.ink,false)+arrow(264,296,387,296)+matrix(447,204,['010','111','010'],62,C.ink,true)+label(148,444,'看到的图案')+label(540,444,'记下的数字')+pill(118,493,484,'逐行读：010 | 111 | 010',C.gold,31)+
 txt(37,600,'第5个数：1 → 0',33)+matrix(439,585,['010','101','010'],50,C.ink,false)+lines(42,652,['只改中心，','就多出一个白洞。'],30),['读数顺序、尺寸和黑白约定，','必须和数字一起保存。'],'竖线用于分行 · 不属于数字序列',990);
add(3,2,'颜色也有自己的数字配方','灰度用1个数；RGB用3个通道数。',
 txt(42,204,'8位灰度：0—255，共256档',31)+[0,64,128,191,255].map((v,i)=>box(47+i*129,244,110,92,`rgb(${v},${v},${v})`,15)+txt(102+i*129,379,v,31,C.ink,700,'middle')).join('')+
 txt(42,443,'sRGB 每通道8位',32)+[['红','#ff0000','255','0','0'],['蓝','#0000ff','0','0','255'],['白','#ffffff','255','255','255']].map((r,i)=>box(47,477+i*87,80,61,r[1],13)+txt(159,519+i*87,r[0],30)+txt(299,519+i*87,`(${r[2]}, ${r[3]}, ${r[4]})`,34)).join(''),['3×3 的 RGB 小图：','3×3×3＝27个通道数值。'],'这里不含透明度等额外通道');

// 04: a physical dial and a descending stair show the parameter and loss.
add(4,1,'训练时，拧的是哪个旋钮？','模型形式固定：预测值＝输入值＋b。',
 box(42,184,286,128,C.blue)+lines(62,224,['输入不变','1、2、3'],34)+box(366,184,312,128,C.rose)+lines(387,224,['目标不变','3、4、5'],34)+
 circle(360,492,127,C.cream)+circle(360,492,79,C.gold)+txt(360,518,'b',76,C.ink,800,'middle')+route('M360 483L404 432',C.coral,11)+['0','1','2'].map((v,i)=>txt([234,360,489][i],[427,351,427][i],v,38,C.ink,800,'middle')).join('')+pill(131,669,458,'b：0 → 1 → 2',C.mint,40),['输入和答案不动，','三个预测会随着b一起变化。']);
let stairs='';[[110,420,6],[330,520,3],[550,620,0]].forEach(([x,y,v],i)=>{stairs+=box(x-80,y,160,92,[C.rose,C.cream,C.mint][i],10)+digit(x,y-20,v,[C.coral,C.ink,C.teal][i],60)+txt(x,y+44,`b＝${i}`,33,C.ink,700,'middle')});
add(4,2,'三次试数，错误一步步变小','同一组输入1、2、3；目标始终是3、4、5。',
 ['b＝0','b＝1','b＝2'].map((v,i)=>pill(38+i*228,184,208,v,[C.rose,C.cream,C.mint][i],31)+txt(142+i*228,296,['预测 1、2、3','预测 2、3、4','预测 3、4、5'][i],27,C.ink,600,'middle')).join('')+txt(37,359,'总绝对误差',32)+stairs+arrow(206,430,237,465)+arrow(426,530,457,565),['损失从6降到3，再到0。','这里用的是手动试数。'],'简化算例 · 不作为梯度下降推导');

// 05: a window scan, not just a table describing the scan.
add(5,1,'小窗口怎样给图块打分？','对应位置相乘，再把乘积加起来。',
 matrix(45,206,['010','010','010'],47)+txt(258,260,'固定模板',34)+lines(258,310,['中间一列为1','其余位置为0'],28)+
 [['竖线',['010','010','010'],3],['中心点',['000','010','000'],1],['横线',['000','111','000'],1],['全黑',['111','111','111'],3]].map(([s,m,v],i)=>{let x=42+(i%2)*336,y=410+Math.floor(i/2)*202;return box(x,y,300,182,i===3?C.rose:C.mint,20)+matrix(x+16,y+39,m,39)+txt(x+147,y+59,s,29)+txt(x+147,y+118,`得 ${v} 分`,33)}).join(''),['竖线和全黑都得3分。','一个分数还不能认定形状。'],'手工模板示意 · 1表示黑格',1030);
let windows='';[0,1,2].forEach((p,i)=>{const y=188+i*158;windows+=pill(34,y,82,String(i+1),C.gold,31)+matrix(137,y,['01000','01000','01000'],43,C.teal,true,p)+txt(401,y+39,`覆盖${p+1}—${p+3}列`,27)+txt(401,y+99,`响应 ${[3,0,0][i]}`,38)});
add(5,2,'同一个窗口，一格一格滑','原图的竖线在第2列。',windows+pill(42,697,296,'特征图：3  0  0',C.mint,30)+pill(371,697,302,'右移后：0  3  0',C.cream,30),['同一套权重反复使用。','竖线右移，高分位置也右移。'],'步长为1、不补边 · 红框表示窗口',970);

// 06: two genuinely drawn information paths.
add(6,1,'保留原值，另走一条修正路','残差结构：输出＝输入＋F（输入）。',
 pill(52,195,615,'直接变换：10 → 学习完整变换 → 11',C.blue,28)+circle(118,359,58,C.gold)+digit(118,379,'10',C.ink,44)+route('M118 423V592H283',C.teal,10)+txt(59,491,'直通',29,C.teal)+txt(142,541,'原值10',31,C.teal)+route('M181 359H471V435',C.coral,8)+box(370,450,258,111,C.rose)+txt(499,493,'F 分支',33,C.ink,700,'middle')+txt(499,535,'修正 ＋1',32,C.ink,700,'middle')+route('M499 575V624H403',C.coral,8)+circle(349,592,54,C.white)+digit(349,609,'＋',C.ink,50)+arrow(349,652,349,687)+pill(226,703,253,'10＋1＝11',C.mint,39),['F输出0时，就保留原值。','两条路都参与计算。'],'结构类比 · 不保证训练必然更好',970);
add(6,2,'输入动一点，两条路各出力','把输入从2调到2.1：增加了0.1。',
 pill(147,183,426,'输入：2 → 2.1',C.gold,39)+arrow(246,245,180,305)+arrow(473,245,543,305)+box(43,327,293,237,C.mint)+txt(189,373,'直通路径',33,C.ink,700,'middle')+txt(189,445,'2 → 2.1',39,C.ink,700,'middle')+digit(189,526,'＋0.1',C.teal,44)+box(379,327,298,237,C.rose)+txt(528,373,'F：乘以0.5',31,C.ink,700,'middle')+txt(528,445,'1 → 1.05',38,C.ink,700,'middle')+digit(528,526,'＋0.05',C.coral,44)+arrow(189,580,313,635)+arrow(528,580,409,635)+pill(97,664,526,'总变化：0.1＋0.05＝0.15',C.cream,31),['两路的变化在相加处汇合。','新输出：3 → 3.15。'],'线性算例 · 变化也可能抵消');

// 07: red umbrella, clouds, and two explicit record tracks.
add(7,1,'读到结尾，红伞还在吗？','同一段故事，可以留下不同的记录。',
 umbrella(139,263,.82)+`<path d="M310 272q-30-36 2-54q15-35 46-12q47-14 52 26q33 2 22 40Z" fill="${C.blue}" stroke="${C.ink}" stroke-width="4"/>`+`<path d="M518 225h100q25 0 10-24 M500 254h150q20 0 10 22 M528 294h60" fill="none" stroke="${C.teal}" stroke-width="6" stroke-linecap="round"/>`+label(139,375,'出门')+label(362,375,'天阴')+label(594,375,'起风')+
 pill(33,416,283,'只留最新一句',C.rose)+tiles(48,491,['红伞','天阴','起风'],186,70,C.rose)+txt(365,614,'问颜色 → 无法知道',34,C.coral,700,'middle')+
 pill(33,658,283,'专门保留颜色',C.mint)+tiles(48,727,['红','红','红'],186,70,C.mint)+txt(365,848,'问颜色 → 红色',34,C.teal,700,'middle'),['便签只作类比。真实RNN','传递的是一组数值状态。'],'人为设定的记录规则 · 不是模型实测',1050);
add(7,2,'门像旋钮，不只有开和关','保留系数可以在0到1之间连续变化。',
 box(55,190,221,151,C.blue)+txt(166,236,'旧状态',32,C.ink,700,'middle')+digit(166,308,'2')+arrow(290,262,393,262)+circle(512,263,79,C.gold)+txt(512,278,'×0.5',41,C.ink,800,'middle')+
 arrow(511,353,511,405)+box(401,427,228,109,C.mint)+txt(515,496,'留下 1',40,C.ink,700,'middle')+box(53,429,227,106,C.rose)+txt(166,469,'新写入量',30,C.ink,700,'middle')+digit(166,516,'1',C.coral,38)+arrow(166,548,326,587)+arrow(515,548,394,587)+circle(360,590,27,C.white)+txt(360,602,'＋',32,C.ink,800,'middle')+
 pill(121,642,478,'新状态：2×0.5＋1＝2',C.cream,33)+txt(360,753,'改为0.9：2×0.9＋1＝2.8',32,C.ink,600,'middle'),['结果同样是2，','不代表中间什么都没发生。'],'乘加关系示意 · 非完整LSTM');

// 08: physical probability cards and a loop of token tiles.
let cards='';for(let i=0;i<10;i++)cards+=box(44+(i%5)*129,429+Math.floor(i/5)*99,110,79,i<6?C.mint:C.rose,13)+txt(99+(i%5)*129,460+Math.floor(i/5)*99,i+1,23,C.muted,600,'middle')+txt(99+(i%5)*129,493+Math.floor(i/5)*99,i<6?'读书':'画画',27,C.ink,700,'middle');
add(8,1,'选最高分，还是抽一张？','开头给定“我”，下一片有两种选择。',
 box(43,181,296,119,C.mint)+txt(191,226,'读书',36,C.ink,700,'middle')+digit(191,279,'0.6',C.teal,43)+box(378,181,296,119,C.rose)+txt(526,226,'画画',36,C.ink,700,'middle')+digit(526,279,'0.4',C.coral,43)+pill(41,325,635,'贪心：每步选最高 → 我读书。',C.gold,30)+txt(43,408,'采样：10张卡片，等机会抽1张',30)+cards+`<rect x="${44+2*129-5}" y="523" width="120" height="89" rx="18" fill="none" stroke="${C.coral}" stroke-width="6"/>`+txt(360,678,'这次抽中8号 → 我画画。',34,C.coral,700,'middle'),['下一步都以概率1接句号。','采样也可能抽到“读书”。'],'手工概率示例 · 不是每10次必有6次读书');
add(8,2,'把新文字，接回下一轮','上一轮的结果，会成为下一轮的线索。',
 pill(162,183,396,'已有文字（第一轮：我）',C.gold,28)+arrow(352,281,352,321)+box(164,347,390,99,C.blue)+txt(359,409,'计算概率 → 选择一片',31,C.ink,700,'middle')+arrow(352,460,352,497)+tiles(136,521,['我','画画'],217,80,C.mint)+route('M584 566H663V241H455',C.coral,6)+txt(627,448,'再',26,C.coral)+txt(627,482,'来',26,C.coral)+txt(627,516,'一',26,C.coral)+txt(627,550,'轮',26,C.coral)+arrow(352,613,352,642)+pill(114,665,483,'下一步接句号：我画画。',C.cream,32),['没到停止条件，就继续。','本例特别约定遇到句号停止。'],'本例只查最后一片 · 真实模型可看更长上下文');

// 09: physical size mismatch and proportion bars.
const ballbox=(x,y,bigBall)=>{const bw=bigBall?100:58,bh=bigBall?112:67,bx=x+269,by=y+(bigBall?40:85);return circle(x+83,y+84,bigBall?68:47,C.coral)+box(bx,by,bw,bh,C.cream,8)+`<path d="M${bx+3} ${by+3}L${bx+17} ${by-20}H${bx+bw-14}L${bx+bw} ${by+3}" fill="${C.gold}" stroke="${C.ink}" stroke-width="3"/>`+arrow(x+163,y+91,x+237,y+91)};
add(9,1,'这个“它”，究竟指谁？','小球没放进盒子，因为……',
 box(35,184,650,242,C.blue)+ballbox(37,220,true)+bubble(450,226,211,['它太大了'],C.white)+txt(563,377,'通常指小球',28,C.coral,700,'middle')+
 box(35,463,650,242,C.cream)+ballbox(37,499,false)+bubble(450,505,211,['它太小了'],C.white)+txt(563,656,'通常指盒子',28,C.teal,700,'middle'),['一个字变了，通常理解也变。','额外背景仍可能改变解释。'],'句意示意 · 不是模型注意力的测量结果');
function mixrow(y,wa,wb,result){return circle(92,y+76,51,C.gold)+digit(92,y+93,'2',C.ink,40)+circle(624,y+76,51,C.coral)+digit(624,y+93,'10',C.white,40)+box(177,y+25,366,48,C.white,12)+box(177,y+25,366*wa,48,C.mint,12,'none')+box(177+366*wa,y+25,366*wb,48,C.rose,12,'none')+txt(359,y+60,`${wa} ＋ ${wb} ＝ 1`,27,C.ink,700,'middle')+arrow(145,y+94,285,y+157)+arrow(571,y+94,437,y+157)+pill(225,y+165,270,`组合结果 ${result}`,C.mint,33)+txt(360,y+258,`2×${wa}＋10×${wb}＝${result}`,32,C.ink,600,'middle')}
add(9,2,'同样的数，换个比重','注意力中的一步：按权重组合信息。',mixrow(174,.75,.25,4)+mixrow(478,.25,.75,8),['权重改变，组合结果也改变。','这里的2和10不是物品编码。'],'非负权重之和为1 · 加权计算示意',1020);

// 10: a machine route with an actual causal visibility board.
add(10,1,'下一片文字，怎样算出来？','沿一种简化的生成型Transformer走一遍。',
 tiles(72,188,['今天','下雨'],210,64,C.gold)+arrow(515,220,590,220)+txt(640,231,'…',50,C.coral,800,'middle')+
 box(66,295,588,100,C.blue)+txt(360,335,'① token编号 → 嵌入',31,C.ink,700,'middle')+txt(360,374,'再引入位置信息',30,C.ink,500,'middle')+arrow(360,408,360,436)+
 box(66,463,588,247,C.mint)+txt(360,503,'② 多个Transformer块',31,C.ink,700,'middle')+txt(360,548,'因果多头自注意力',32,C.teal,800,'middle')+txt(360,590,'残差相加 → 归一化',28,C.ink,500,'middle')+txt(360,637,'前馈网络',32,C.teal,800,'middle')+txt(360,679,'残差相加 → 归一化',28,C.ink,500,'middle')+
 arrow(360,721,360,750)+pill(47,777,625,'③ 候选分数 → 概率 → 选下一片',C.rose,30),['先取得表示，再结合前文，','最后选择下一片文字。'],'仅展示解码器流程及一种归一化顺序',1050);
let mask='';['今天','下雨','了'].forEach((s,r)=>{mask+=txt(116,301+r*116,s,32,C.ink,700,'middle');['今天','下雨','了'].forEach((ss,c)=>{mask+=box(202+c*158,248+r*116,137,96,c<=r?C.mint:'#e6e9ed',15);if(c<=r)mask+=check(270+c*158,307+r*116,true);else mask+=lock(237+c*158,254+r*116)})});
add(10,2,'后面的答案，先遮起来','每一行只能读取自身和前面的位置。',
 ['今天','下雨','了'].map((s,c)=>txt(270+c*158,220,s,31,C.ink,700,'middle')).join('')+mask+txt(42,648,'这一行 → 预测紧接着的下一片',31)+tiles(61,686,['今天→下雨','下雨→了','了→。'],192,62,C.cream),['训练可以并行算多行，','但每一行都不能偷看后文。'],'示意分词 · 绿色可读，锁住的位置不可读',960);

// 11: numbered drawers and weighted streams.
const drawers=(y,values,active=1)=>values.map((v,i)=>box(40+i*132,y,112,94,i===active?C.gold:C.blue,12)+txt(96+i*132,y+28,`${i+1}号`,23,C.muted,500,'middle')+txt(96+i*132,y+66,v,32,C.ink,700,'middle')+`<path d="M${77+i*132} ${y+82}h38" stroke="${C.ink}" stroke-width="4"/>`).join('');
add(11,1,'地址没变，内容换了','把外部存储想成五个编号抽屉。',
 txt(42,201,'① 写入“红、蓝、黄”',31)+drawers(223,['红','蓝','黄','空','空'])+pill(135,344,452,'② 读取2号 → 返回“蓝”',C.mint,31)+
 txt(42,450,'③ 第2格用“绿”覆盖',31)+drawers(472,['红','绿','黄','空','空'])+pill(135,601,452,'④ 再读2号 → 返回“绿”',C.mint,31)+txt(360,718,'读一次，不会把记录拿走。',32,C.ink,600,'middle'),['没保存历史版本，','就不能从2号找回旧的“蓝”。'],'离散读写规则示意 · 非真实模型实验');
add(11,2,'从两格里，读出一个组合','连续权重读取，不是随机抽中某一格。',
 box(47,196,248,135,C.blue)+txt(171,241,'位置A',29,C.ink,700,'middle')+digit(171,306,'2',C.teal,55)+box(428,196,248,135,C.rose)+txt(551,241,'位置B',29,C.ink,700,'middle')+digit(551,306,'10',C.coral,55)+
 route('M171 348V437H295V513',C.teal,17)+route('M551 348V437H425V513',C.coral,8)+pill(52,370,225,'权重 0.75',C.mint,30)+pill(445,370,225,'权重 0.25',C.cream,30)+circle(360,569,89,C.gold)+digit(360,591,'4',C.ink,69)+txt(360,721,'2×0.75＋10×0.25＝4',34,C.ink,700,'middle'),['读出的4是加权组合，','不等于存储里原有的2或10。'],'数值示意 · 不是NTM的完整结构');

// 12: different machines with explicit metrics, without equating size and capability.
let models='';[['A',80,1,1,C.blue],['B',90,4,3,C.mint],['C',92,8,6,C.rose]].forEach(([n,q,t,c,fill],i)=>{const x=39+i*229;models+=box(x,195,209,358,fill,22)+circle(x+105,260,40,C.white)+txt(x+105,276,n,43,C.ink,800,'middle')+txt(x+105,359,`${q}/100`,38,C.ink,800,'middle')+label(x+105,398,'答对题数')+txt(x+105,462,`${t}秒`,37,C.ink,700,'middle')+txt(x+105,518,`${c}点`,37,C.ink,700,'middle')});
add(12,1,'选模型，别只盯着一个分数','三个虚构方案，完成同一批100道题。',models+pill(149,594,422,'从 B 换到 C',C.gold,33)+lines(124,694,['多答对2题，但多等4秒、','多花3点。值不值，要看用途。'],31),['质量、速度和成本，','要放在一起比较。'],'全部数值虚构 · A/B/C不代表参数大小',950);
add(12,2,'时间收紧，选择也会改变','预算始终不超过3点。',
 box(40,185,640,252,C.cream)+txt(63,231,'关卡一：5秒内返回',35)+[['A','1秒 / 1点',true],['B','4秒 / 3点',true],['C','8秒 / 6点',false]].map(([n,v,yes],i)=>txt(83,292+i*56,n,34)+txt(170,292+i*56,v,31)+check(606,294+i*56,yes)).join('')+
 pill(160,469,396,'优先答对题数 → 选B',C.mint,31)+box(40,553,640,179,C.rose)+txt(63,605,'关卡二：2秒内返回',35)+txt(65,658,'A合格；B超时；C超时且超预算',29)+txt(360,709,'只剩 A',43,C.teal,800,'middle'),['“最好”的方案，','也要能满足实际限制。'],'虚构选型示例 · 真实耗时并非固定值');

// 13: literal tape and a compact instruction ticket.
const letters=(x,y,str,size=64,fill=C.blue)=>[...str].map((s,i)=>box(x+i*(size+6),y,size,size,fill,9)+txt(x+i*(size+6)+size/2,y+size*.71,s,size*.61,C.ink,800,'middle')).join('');
add(13,1,'规则省下的，例外要补回','每个编码字符算1单位，读法双方已知。',
 txt(40,200,'原串 ABABABAB',32)+letters(43,224,'LABABABAB',63,C.blue)+txt(360,338,'直接记录：9单位',32,C.ink,700,'middle')+letters(168,368,'R4AB',81,C.mint)+txt(360,499,'重复规则：4单位',33,C.teal,800,'middle')+
 txt(40,568,'末位改成C → ABABABAC',32)+txt(40,606,'直接：LABABABAC，仍为9单位',27)+letters(119,638,'R4AB8C',75,C.cream)+txt(360,774,'规则＋例外：6单位',33,C.coral,800,'middle'),['8C：把第8位改成C。','模式头L、R也要计入成本。'],'同一套受限编码 · 不是实际文件字节数',975);

// 14: clear spatial relations and explicit arrows to the target.
const relationRow=(y,order,count)=>box(42,y,636,219,C.white,20)+order.map((v,i)=>object(v,143+i*215,y+76,76)+label(143+i*215,y+139,v)).join('')+txt(360,y+196,`蓝方左边：${count}个`,37,C.teal,800,'middle');
add(14,1,'物体没变，答案为什么变？','问题始终是：蓝方左边有几个物体？',
 relationRow(196,['红圆','蓝方','绿三角'],1)+arrow(199,278,293,278)+txt(360,469,'交换蓝方与绿三角',30,C.coral,700,'middle')+relationRow(514,['红圆','绿三角','蓝方'],2)+arrow(408,597,509,597),['只有对象清单，还不够。','位置关系也必须留下来。'],'按图中左右判断 · 箭头仅辅助比较',970);

// 15: source checking and a 100-item chart.
add(15,1,'有链接，就有证据了吗？','核查主张：本校图书馆本周日开放。',
 magnify(109,251,55)+box(235,194,419,131,C.cream)+lines(255,244,['先确认：本校公告','并且适用于本周'],31)+
 [['公告写“周日开放”','支持',C.mint],['公告写“周日闭馆”','相矛盾',C.rose],['只列周一至周五','证据不足',C.blue]].map(([s,r,fill],i)=>box(42,369+i*124,636,103,fill,18)+txt(62,411+i*124,s,30)+txt(614,449+i*124,r,32,i===1?C.coral:C.teal,800,'end')).join(''),['可靠网站上的材料，','也要逐句看是否支持主张。'],'公告与主张均为构造示例');
let dots='';for(let i=0;i<100;i++)dots+=circle(75+(i%10)*62,267+Math.floor(i/10)*34,10,i<90?C.teal:C.coral);
add(15,2,'90分里，藏着哪一类错误？','把100个问题拆开看。',
 txt(40,209,'每个点代表1个问题',30)+dots+box(41,643,311,126,C.mint)+lines(59,681,['A类 常规安排','90/90＝100%'],29)+box(379,643,300,126,C.rose)+lines(399,681,['B类 临时变更','0/10＝0%'],29)+pill(130,815,460,'合计：90/100＝90%',C.gold,36),['临时检修问题，全答错了。','总分无法替代分组检查。'],'100个构造例子 · 非真实产品测评',1050);

// 16: safety gates are actual alternatives, not a guaranteed-correct pipeline.
add(16,1,'同一个助手，五种处理','校园公开服务问答的纸面推演。',
 [['本学期周二15点','按常规安排开放',C.mint],['本学期周日','按安排闭馆',C.blue],['临时检修','未知，向服务台核实',C.cream],['明年安排','未知，不据本学期外推',C.cream],['同学家庭住址','拒绝提供或推测',C.rose]].map(([q,a,c],i)=>box(40,183+i*116,640,99,c,17)+circle(80,233+i*116,22,C.white)+txt(80,242+i*116,i+1,27,C.ink,800,'middle')+txt(122,221+i*116,q,29)+txt(122,262+i*116,a,30,i===4?C.coral:C.ink,700)).join(''),['资料不足和隐私越界，','需要不同的处理办法。'],'同一组案例复核 · 非独立软件测试',975);
add(16,2,'先查范围，再查证据','检索到资料，不等于已经能回答。',
 pill(204,182,312,'收到问题',C.gold,34)+arrow(360,243,360,271)+box(211,298,298,91,C.blue)+txt(360,354,'范围检查',34,C.ink,700,'middle')+route('M510 343H624V412',C.coral,5)+pill(483,422,199,'越界 → 停止',C.rose,25)+arrow(360,404,360,431)+
 box(69,482,568,90,C.mint)+txt(352,537,'检索核准资料，检查来源与适用期',29,C.ink,700,'middle')+arrow(352,587,352,617)+route('M352 636H183V674',C.teal,5)+route('M352 636H544V674',C.coral,5)+
 box(34,699,316,126,C.mint)+lines(52,742,['证据足够','回答，并列出依据'],28)+box(379,699,307,126,C.cream)+lines(398,742,['不足或冲突','说明未知，建议问人'],28),['含糊先澄清；临时变化','不能只套用常规时间。'],'纸面设计 · 各环节实际效果仍须验证',1050);

async function main(){
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const page=await browser.newPage({viewport:{width:720,height:1100},deviceScaleFactor:2});
 const filter=new Set(process.argv.slice(2).map(Number));const results=[];
 for(const f of figures){if(filter.size&&!filter.has(f.a))continue;
  const src=path.join(out,`${String(f.a).padStart(2,'0')}-${f.j}.svg`);fs.writeFileSync(src,f.svg);
  await page.setContent('<html><style>body{margin:0}svg{display:block}</style>'+f.svg+'</html>');await page.evaluate(()=>document.fonts.ready);
  const overflow=await page.locator('svg').evaluate(s=>[...s.querySelectorAll('text')].filter(t=>{const b=t.getBBox();return b.x<0||b.x+b.width>720||b.y<0||b.y+b.height>s.viewBox.baseVal.height}).map(t=>t.textContent));
  if(overflow.length)throw Error(`${f.a}-${f.j} text outside canvas: ${overflow}`);
  await page.locator('svg').screenshot({path:path.join(root,f.dir,f.name)});
  results.push({article:f.a,file:f.name,overflow});
 }
 const checkPath=path.join(__dirname,'youth-figure-checks.json'); let combined=results; if(filter.size&&fs.existsSync(checkPath)){const prior=JSON.parse(fs.readFileSync(checkPath));const map=new Map(prior.map(r=>[r.article+':'+r.file,r]));results.forEach(r=>map.set(r.article+':'+r.file,r));combined=[...map.values()].sort((a,b)=>a.article-b.article||a.file.localeCompare(b.file));} fs.writeFileSync(checkPath,JSON.stringify(combined,null,2));
 await browser.close();console.log('Rendered',results.length,'youth illustrations');
}
module.exports={C,txt,lines,box,circle,arrow,route,pill,cat,book,magnify,umbrella,matrix,tiles,lock,robot,object,mascot};
if(require.main===module)main().catch(e=>{console.error(e);process.exit(1)});
