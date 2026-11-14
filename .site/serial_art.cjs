/* 17–24 inherit the original serial's palette, stroke diagrams and mascot.
 * Optional authoring: PLAYWRIGHT_MODULE=/path/to/playwright node .site/render_campus_visuals.cjs
 * Every PNG is exported from a portable editable SVG-in-HTML source. */
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const entries=require('./serial_visual_data.json');
const series=require('./serial_units.json');
const seriesFor=n=>series.find(s=>Number(n)>=s.from && Number(n)<=s.to);
const root=path.resolve(__dirname,'..','青少年AI科普连载');
const C={paper:'#fffdf6',ink:'#203845',muted:'#586e79',teal:'#168f94',mint:'#def3ee',coral:'#ee6a58',peach:'#ffe7df',yellow:'#ffcf62',cream:'#fff1d2',blue:'#e3efff',white:'#ffffff'};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const txt=(x,y,lines,size=54,color=C.ink,anchor='start',weight=650)=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}" dominant-baseline="hanging" font-weight="${weight}">${(Array.isArray(lines)?lines:[lines]).map((l,i)=>`<tspan x="${x}" dy="${i?size*1.38:0}">${esc(l)}</tspan>`).join('')}</text>`;
const rect=(x,y,w,h,fill=C.mint,r=38,stroke=C.ink,sw=6)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const box=(x,y,w,h,lines,fill=C.mint,size=54)=>{let a=Array.isArray(lines)?lines:[lines];return `<g data-node="true">`+rect(x,y,w,h,fill)+txt(x+w/2,y+(h-a.length*size*1.38)/2+5,a,size,C.ink,'middle')+`</g>`;};
const arrow=(points,color=C.ink,width=8)=>`<polyline points="${points}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round" marker-end="url(#arrow)"/>`;
const line=(x1,y1,x2,y2,color=C.ink,width=6)=>`<path d="M${x1},${y1} L${x2},${y2}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
const robot=(x=1152,y=1785,w=245)=>`<image href="../../../.site/assets/serial-robot.png" x="${x}" y="${y}" width="${w}" height="${w}" preserveAspectRatio="xMidYMid meet"/>`;
function svg(body,w=1440,h=2100){return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;font-family:'PingFang SC','Microsoft YaHei',sans-serif"><defs><marker id="arrow" viewBox="0 0 30 30" refX="25" refY="15" markerWidth="30" markerHeight="30" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M4 3 L25 15 L4 27" fill="none" stroke="${C.ink}" stroke-width="6"/></marker></defs><rect width="${w}" height="${h}" rx="52" fill="${C.paper}"/>${body}</svg>`;}
function figure(n,title,subtitle,body,lesson,note){return svg(rect(56,44,156,98,C.teal,54)+txt(134,64,String(Number(n)-seriesFor(n).from+1).padStart(2,'0'),54,C.white,'middle')+txt(255,60,title,72)+line(54,215,1386,215)+txt(60,247,subtitle,49,C.muted)+body+rect(56,1840,1328,180,C.mint,42,C.mint,0)+txt(96,1870,lesson,49)+robot()+txt(60,2050,note,32,C.muted));}
function tokens(values,x,y,w=1250,h=118,active=[]){const cw=w/values.length;return values.map((v,i)=>rect(x+i*cw,y,cw-10,h,active.includes(i)?C.yellow:C.blue,16,C.ink,3)+txt(x+i*cw+(cw-10)/2,y+34,v,43,C.ink,'middle')).join('');}
function table(x,y,width,rowHeight,rows,highCols=[]){const cw=width/rows[0].length;return rows.map((row,r)=>row.map((cell,c)=>rect(x+c*cw,y+r*rowHeight,cw,rowHeight,highCols.includes(c)?C.mint:(r===0?C.blue:C.paper),0,C.ink,3)+txt(x+c*cw+cw/2,y+r*rowHeight+rowHeight/2-22,cell,45,C.ink,'middle')).join('')).join('');}
function drawing(n,k){let b='';
 if(n==='17'&&k===0){
  b=box(330,370,780,160,['用户：本学期周二15点开吗？'],C.cream,51)+arrow('720,552 720,625')+box(250,655,940,190,['模型提出请求 Q1','查公告｜图书馆｜本学期'],C.blue)+arrow('720,867 720,940')+box(250,970,940,175,['执行程序：检查工具和参数'],C.mint,54)+arrow('720,1167 720,1240')+box(250,1270,940,180,['公告工具返回 D1','工作日12:00—18:00开放'],C.cream,52)+arrow('720,1472 720,1545')+box(330,1575,780,140,['按适用公告组织回答'],C.mint,54);
  return figure(n,'请求怎样变成一次查找','四个角色，各有自己负责的一步。',b,['一句“我查到了”，','还需要请求、执行与返回来支持。'],'规则演示：请求与回答预先安排，查找由本地程序执行');
 }
 if(n==='17'&&k===1){
  b=box(420,390,600,160,'查公告',C.blue,66)+arrow('720,575 720,700 240,700 240,820')+arrow('720,575 720,820')+arrow('720,700 1200,700 1200,820');
  const xs=[55,520,985],head=['找到 D1','零条匹配','读取失败'],body=[['常规时间有依据','检查时期再回答'],['查询完成','但没有明年安排'],['查询没有完成','不能说没有公告']];
  xs.forEach((x,i)=>{b+=box(x,850,400,180,head[i],[C.mint,C.cream,C.peach][i],56)+arrow(`${x+200},1050 ${x+200},1150`)+box(x,1180,400,270,body[i],[C.mint,C.cream,C.peach][i],46);});
  b+=txt(720,1610,'参数写错：在查找前拦下，不算执行过。',48,C.muted,'middle');
  return figure(n,'三种返回，三种解释','查找结束，不等于已经有了答案。',b,['“没有匹配”和“没有查完”，','需要分开说明。'],'固定公告与人为故障；不是实际服务的故障统计');
 }
 if(n==='18'&&k===0){
  b=box(180,370,1080,170,['任务：周二15—16点','投影仪、有坡道，只给建议'],C.cream)+arrow('720,562 720,630')+box(130,660,1180,180,['第1次｜查时间：S1、S2','V1、V2 都是周二15—17点开放'],C.blue,51)+arrow('720,862 720,930')+box(200,960,1040,180,['第2次｜读 V1 详情：E1','投影仪：有　坡道：有'],C.mint,55)+arrow('720,1162 720,1230')+box(165,1260,1110,200,['时期与时间 ✓　设备 ✓　坡道 ✓','建议 V1 科学活动室'],C.mint,53)+txt(720,1590,'S1 + E1 支持建议；没有进行预约。',52,C.muted,'middle');
  return figure(n,'查到时间，还要查什么','下一步使用前一步返回的场地编号。',b,['两次查询补齐不同条件。','记录变多，要带来新证据。'],'固定规则选择下一步；不代表模型自主规划');
 }
 if(n==='18'&&k===1){
  b=box(400,385,640,160,'查看当前结果与剩余条件',C.blue,53)+line(720,570,720,1390)+`<circle cx="720" cy="930" r="10" fill="${C.teal}"/><circle cx="720" cy="1390" r="10" fill="${C.teal}"/>`+arrow('720,930 675,930')+arrow('720,930 765,930')+arrow('720,1390 675,1390')+arrow('720,1390 765,1390');
  b+=box(75,790,580,280,['条件齐备','S1、E1 支持 V1','给出建议，未预约'],C.mint,51)+box(785,790,580,280,['设备未知','坡道已确认','仍不足以推荐'],C.cream,51);
  // Four independent exits branch from the same state; none leads into another.
  b+=box(75,1250,580,280,['重复相同请求','拦住重复查找','不增加执行次数'],C.peach,51)+box(785,1250,580,280,['达到步数上限','停止本次流程','说明尚未核实的条件'],C.cream,48);
  return figure(n,'停下来，也要说清原因','满足条件、缺资料与触及限制，要分开记。',b,['停止不一定是失败；','也不等于已经完成原任务。'],'本例成功执行2次；缺设备2次；重复和上限分支各1次');
 }
 if(n==='19'&&k===0){
  b=txt(70,370,'最初六张卡',52)+tokens(['C1坡道','C2时间','C3设备','C4场地','C5场地','C6不预约'],70,460,1300,125,[0,1,2,5]);
  b+=txt(70,660,'保留全文',50)+tokens(['C1','C2','C3','C4','C5','C6'],70,740,1300,110,[0,1,2,5]);
  b+=txt(70,925,'只留最后三张',50)+tokens(['×','×','×','C4','C5','C6'],70,1005,1300,110,[5]);
  b+=box(70,1240,615,270,['人工摘要','“必须有坡道”','可能保留，也可能漏掉'],C.cream,48)+box(755,1240,615,270,['按需读回条件','C1、C2、C3、C6','与 C4、C5 一起送入'],C.mint,48);
  return figure(n,'同一句要求，留在了哪里','黄色标出任务条件；蓝色是场地资料。',b,['场地“有坡道”，不等于','本轮还记着“必须有坡道”。'],'信息卡是教学单位，不等于真实模型的 token');
 }
 if(n==='19'&&k===1){
  b=box(250,390,940,200,['“必须有坡道”','进入本轮输入了吗？'],C.blue)+arrow('720,613 720,735 340,735 340,855')+arrow('720,735 1100,735 1100,855')+txt(250,755,'没有',48,C.coral)+txt(1050,755,'有',48,C.teal);
  b+=box(80,885,560,240,['先检查整理过程','截断、摘要或检索','哪一步漏了条件？'],C.peach,48)+box(790,885,570,240,['再看最终建议','回答是否满足','坡道这一要求？'],C.mint,48)+arrow('1075,1150 1075,1300');
  b+=box(650,1330,710,240,['保留条件 ≠ 用对条件','还需另外检查任务结果'],C.cream,52)+txt(80,1410,['本地程序能检查','要求有没有被保留。'],47,C.muted);
  return figure(n,'存过、读回，还要用对','先查输入有没有，再查回答是否满足。',b,['聊天页面还在，','不保证本轮输入完整或使用正确。'],'六卡规则实验不测真实模型的注意力或记忆能力');
 }
 if(n==='20'&&k===0){
  b=txt(70,375,'要求：本学期周二15—16点，有投影仪、有坡道',47)+table(70,510,1300,150,[['检查什么','V1 科学活动室','V2 阅览活动室'],['时间来源','S1：15—17点','S2：15—17点'],['设备来源','E1：投影仪有','E2：投影仪有'],['坡道','有 ✓','无 ×'],['建议','符合这些条件','不符合坡道要求']],[1]);
  b+=arrow('720,1300 720,1430')+box(220,1460,1000,220,['工具正常返回','仍要逐项比较条件'],C.cream,58);
  return figure(n,'工具成功，任务就成功吗','两间场地都读到了资料，结论却不同。',b,['完成与否，要看条件和依据。','不能只数“调用成功”有几次。'],'校园资料均为构造；建议不包含预约操作');
 }
 if(n==='20'&&k===1){
  b=box(100,400,540,220,['开发案例 × 6','用来发现和修复错误'],C.blue,52)+arrow('370,642 370,790')+box(100,820,540,220,['修改规则','重跑属于回归检查'],C.mint,51)+arrow('370,1062 370,1210')+box(100,1240,540,220,['记录每例结果','成功、恰当停止、错完成'],C.cream,46);
  b+=box(800,400,540,220,['预先保留案例 × 6','不据这些题修改规则'],C.cream,51)+arrow('1070,642 1070,790')+box(800,820,540,220,['方案确定后检查','再看新条件下的结果'],C.mint,51)+arrow('1070,1062 1070,1210')+box(800,1240,540,220,['若据结果又修改','需另补新的保留案例'],C.peach,48);
  b+=txt(720,1630,'本地公开的两组案例，都只作规则程序回归。',44,C.muted,'middle');
  return figure(n,'同一批题，能检查什么','改过的题再跑一遍，不是独立新证据。',b,['开发检查与保留检查分开；','公开规则成绩不是模型成功率。'],'两组各1例任务成功、5例恰当停止；故意错误建议另列');
 }
 if(n==='21'&&k===0){
  b=box(70,390,610,230,['普通文本','今天／下雨／了／。'],C.blue,54)+box(760,390,610,230,['指令配示范','要求：原样抄写 abcd'],C.cream,48)+arrow('375,642 375,790')+arrow('1065,642 1065,790')+box(70,820,610,280,['从文本取下一片','今天 → 下雨','今天／下雨 → 了'],C.mint,49)+box(760,820,610,280,['给定要求，示范回答','abcd','继续用这些样本训练'],C.mint,49);
  b+=arrow('375,1122 375,1280 720,1280 720,1400')+arrow('1065,1122 1065,1280 720,1280')+box(180,1430,1080,180,['都可以使用下一 token 预测','样本怎样组织、哪些位置计分，会改变训练目标。'],C.cream,45);
  return figure(n,'换一份怎样回答的示范','从续写文字，到学习按要求回答的样本。',b,['训练要实际调整参数。','只换提问方式，不是已经微调。'],'示范含错也会影响学习；监督微调不自动保证事实正确');
 }
 if(n==='21'&&k===1){
  const rows=[['位置','0','1','2','3','4','5','6','7','8','9'],['输入','<','a','b','c','d','|','a','b','c','d'],['目标','a','b','c','d','|','a','b','c','d','>'],['计分','0','0','0','0','0','1','1','1','1','1']];
  b=table(70,420,1300,130,rows,[6,7,8,9,10])+txt(720,1040,'在 | 这一行，预测回答的第一个 a。',51,C.teal,'middle')+arrow('720,1140 720,1290')+box(180,1320,1080,280,['一次参数更新，同样本损失','2.016741 → 2.010323','只验证这一次计算，不是能力前后测评。'],C.mint,51);
  return figure(n,'这次，哪些预测计入成绩','先把输入与目标对齐，再选回答区间。',b,['不直接计损失的输入，','仍可能通过计算影响回答。'],'字符与符号是玩具格式；计分掩码不同于因果遮罩');
 }
 if(n==='22'&&k===0){
  b=txt(75,380,'完整重算',56)+tokens(['旧前缀','a'],75,470,1270,135)+tokens(['旧前缀','a','b'],75,655,1270,135)+txt(720,850,'前面的 K、V 被反复计算。',48,C.muted,'middle');
  b+=line(70,970,1370,970,C.muted,3)+txt(75,1035,'保留缓存',56)+box(75,1150,580,200,['历史 K、V','保留，不重算'],C.blue,55)+box(840,1150,520,200,['新 token','算新 Q、K、V'],C.cream,53)+arrow('655,1250 730,1250 730,1470')+arrow('1100,1372 1100,1470 730,1470')+box(350,1510,780,180,['新 Q 读取可见历史 K、V'],C.mint,51);
  return figure(n,'哪些结果可以留到下一轮','参数、前缀、位置和计算设置要相同。',b,['少重复历史投影，','不等于新位置不再读取前文。'],'只比较因果模型的同一前缀；不是跨会话记事本');
 }
 if(n==='22'&&k===1){
  b=txt(70,385,'逐个追加12个位置，K投影分别处理：',51)+txt(70,540,'重算',48)+rect(280,520,1000,115,C.coral,20)+txt(1350,550,'78',56,C.ink,'end')+txt(70,735,'缓存',48)+rect(280,715,1000*12/78,115,C.teal,20)+txt(490,745,'12',56)+txt(720,950,'1＋2＋…＋12＝78　　只追加：12',50,C.ink,'middle')+txt(720,1050,'V投影另算一份，计数也是78与12。',46,C.muted,'middle')+box(130,1210,1180,330,['缓存空间：K 和 V 两组','2 × 12 × 16 × 8 = 3,072字节','单层、宽度16、每个数8字节'],C.blue,53);
  return figure(n,'少算的计算，多留的空间','先数清处理位置，再数保存的数值。',b,['78÷12 不是提速6.5倍。','本例没有测设备运行时间。'],'只计K/V数组净负载；不等于整机内存或总运算量');
 }
 if(n==='23'&&k===0){
  b=box(490,360,460,150,'输入 [1, 2]',C.cream,60)+arrow('720,532 720,620')+box(450,650,540,160,'路由：选第2、第3个',C.blue,51);
  [1,2,3,4].forEach((v,i)=>{const x=55+i*350,selected=v===2||v===3;b+=arrow(`720,832 720,900 ${x+140},900 ${x+140},990`,selected?C.teal:C.muted,selected?8:4)+box(x,1020,280,230,[`专家${v}`,`[${v}, ${2*v}]`],selected?C.mint:C.blue,53);if(selected)b+=arrow(`${x+140},1272 ${x+140},1370 720,1370 720,1450`);});
  b+=txt(195,1310,'未选',42,C.muted,'middle')+txt(1245,1310,'未选',42,C.muted,'middle')+txt(495,1310,'0.6',42,C.teal,'end')+txt(945,1310,'0.4',42,C.teal,'start');
  b+=box(200,1480,1040,210,['0.6 × [2,4] + 0.4 × [3,6]','= [2.4, 4.8]'],C.mint,56);
  return figure(n,'选了谁，还要怎么算','本例对选中的两项重新归一为0.6、0.4。',b,['“专家”是数值模块。','这里没有两个助手商量或投票。'],'固定路由与未训练线性专家；其他模型可用不同合并规则');
 }
 if(n==='23'&&k===1){
  [1,2,3,4].forEach((v,i)=>{const x=65+i*350,sel=v===2||v===3;b+=txt(x+140,410,`专家${v}`,54,C.ink,'middle')+table(x,530,280,125,[[String(v),'0'],['0',String(v)]],sel?[0,1]:[])+txt(x+140,850,sel?'本次选中':'本次未选',43,sel?C.teal:C.muted,'middle');});
  b+=box(170,1070,1100,200,['全部存储：4 × 4 = 16 个数'],C.blue,60)+arrow('720,1292 720,1400')+box(170,1430,1100,200,['本次选中：2 × 4 = 8 个数'],C.mint,60);
  return figure(n,'没选中，能把它删掉吗','矩阵里有零，仍按保存的四个数来计。',b,['这一次少用，不等于只需存这部分。','下一片可能会选择其他分支。'],'只计专家矩阵；未计路由、共享层或真实设备开销');
 }
 if(n==='24'&&k===0){
  b=series.map((item,i)=>box(140,365+i*280,1160,215,[item.name,`共 ${item.to-item.from+1} 篇`],[C.blue,C.mint,C.cream,C.peach,C.mint][i],52)).join('');
  return figure(n,'五套短系列，从哪套开始','挑一个你最想弄懂的问题。',b,['每套都可以从第 1 篇开始。','读到感兴趣的题目，动手试一试。'],'各系列独立编号');
 }
 if(n==='24'&&k===1){
  b=table(70,400,1300,205,[['练哪一题','回到哪一篇','在纸上做什么'],['原样抄写','本系列第1篇','圈出计分目标'],['复用旧键','本系列第2篇','数格子上的点'],['合并专家','本系列第3篇','把两列分别加权']],[1]);
  b+=arrow('720,1450 720,1550')+txt(720,1610,'先预测 → 只改一项 → 核对结果',56,C.teal,'middle');
  return figure(n,'先完成一个小任务','不必先收集一长串课程和工具。',b,['把纸递给同桌。','能说明为什么，就讲明白了。'],'三题任选其一；可在纸上完成');
 }
 throw Error('Unknown figure '+n+'-'+k);
}
function coverIcon(n){let b='';const d=(x,y,w,h)=>rect(x,y,w,h,C.white,12,C.ink,4)+line(x+20,y+40,x+w-20,y+40,C.teal,6)+line(x+20,y+75,x+w-35,y+75,C.coral,6);
 if(n==='17')b=d(30,25,155,210)+box(100,170,155,70,'查到了？',C.cream,24);
 if(n==='18')b=d(5,0,130,170)+d(155,65,130,170)+arrow('82,190 82,260 222,260 222,240',C.teal,5);
 if(n==='19')b=d(10,0,200,150)+d(30,35,200,150)+d(50,70,200,150)+rect(70,168,160,36,C.yellow,6,C.ink,3);
 if(n==='20')b=d(50,0,180,240)+txt(80,115,['时间 ✓','设备 ✓','坡道 ✓'],28,C.ink);
 if(n==='21')b=d(25,0,240,250)+box(45,100,200,50,'要求',C.blue,26)+box(45,170,200,50,'示范回答',C.mint,26);
 if(n==='22')b=box(5,25,125,80,'K',C.blue,40)+box(155,25,125,80,'V',C.mint,40)+line(67,130,67,175,C.teal,5)+line(217,130,217,175,C.teal,5)+line(67,175,217,175,C.teal,5)+arrow('142,175 142,210',C.teal,6)+box(45,220,200,60,'留到下一轮',C.cream,25);
 if(n==='23'){b=rect(112,0,70,70,C.yellow,20,C.ink,4);[0,1,2,3].forEach((v,i)=>{b+=line(147,85,25+i*80,155,v===1||v===2?C.teal:C.ink,4)+rect(i*80,175,55,85,v===1||v===2?C.mint:C.blue,14,C.ink,4);});}
 if(n==='24')b=line(150,5,150,270,C.ink,9)+box(10,25,255,60,'认识 AI →',C.blue,27)+box(35,110,255,60,'校园助手 →',C.mint,27)+box(10,195,255,60,'训练与运行 →',C.cream,27);
 return b;}
const coverTitles={17:['AI说“查到了”，','真的查了吗？'],18:['查一次还不够，','AI助手怎样接着做？'],19:['聊天记录越长，','AI就越不容易忘吗？'],20:['AI助手完成了任务，','怎样证明它做对了？'],21:['从续写到按要求回答，','中间训练了什么？'],22:['接出下一片文字时，','哪些计算可以复用？'],23:['每片文字，为什么','只交给部分“专家”？'],24:['读懂原理之后，','下一步怎样选？']};
function cover(e,square){const h=square?1080:460,pastel=Number(e.n)%2?C.mint:C.peach;let b=`<ellipse cx="${square?890:1000}" cy="${square?710:180}" rx="${square?640:425}" ry="${square?620:500}" fill="${pastel}"/>`;
 b+=txt(44,square?58:35,seriesFor(e.n).name,square?33:25,C.teal)+txt(1036,square?58:35,(Number(e.n)-seriesFor(e.n).from+1)+' / '+(seriesFor(e.n).to-seriesFor(e.n).from+1),square?31:25,C.muted,'end');
 b+=txt(square?65:44,square?165:108,coverTitles[e.n],square?68:44)+line(square?65:44,square?390:265,square?180:125,square?390:265,C.coral,8);
 b+=txt(square?65:44,square?440:346,e.subtitle,square?33:27,C.muted);
 b+=`<g transform="translate(${square?275:645},${square?580:105}) scale(${square?1.4:.83})">${coverIcon(e.n)}</g>`;
 b+=`<image href="../../../.site/assets/serial-robot.png" x="${square?780:930}" y="${square?810:288}" width="${square?245:125}" height="${square?245:125}"/>`;
 return svg(b,1080,h);}
function html(body){return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>青少年 AI 科普连载素材</title><style>html,body{margin:0;padding:0;background:${C.paper}}main{width:fit-content}</style><body><main>${body}</main></body></html>`;}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});const page=await browser.newPage({viewport:{width:1440,height:2100},deviceScaleFactor:1});const report=[];
 for(const e of entries){const name=fs.readdirSync(root).find(n=>n.startsWith(e.n+'_'));if(!name)continue;const dir=path.join(root,name),sources=path.join(dir,'素材源');fs.mkdirSync(sources,{recursive:true});
  const assets=[...e.figures.map((f,i)=>[f,drawing(e.n,i)]),['00_封面图_横版2.35',cover(e,false)],['00_封面图_方形1x1',cover(e,true)]];
  for(const [name,body]of assets){const source=path.join(sources,name+'.html');fs.writeFileSync(source,html(body));await page.goto(pathToFileURL(source).href);await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('svg image')].map(i=>new Promise((r,j)=>{const img=new Image();img.onload=r;img.onerror=j;img.src=i.getAttribute('href')})))});await page.locator('main').screenshot({path:path.join(dir,name+'.png')});report.push(path.relative(root,path.join(dir,name+'.png')));}
 }
 await browser.close();console.log('Rendered '+report.length+' matched-style PNGs');})().catch(e=>{console.error(e);process.exit(1)});
