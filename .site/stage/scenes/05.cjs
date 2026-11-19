'use strict';
/* 分数来自同一确定性计算；窗口不翻转，不将手写模板称作训练结果。 */
const { C, g, rect, txt, arrow, pill, person, qBadge, magnifier, catHead } = require('../art.cjs');
const { label, put, scene, chapter, cover, references, exercise } = require('../lesson.cjs');
const W = require('../window.cjs');
function grid(values, { columns=3, cell=100, matrix=false, mark=-1, window=-1 }={}) {
  const w=columns*cell, h=Math.ceil(values.length/columns)*cell;
  return values.map((v,i) => {
    const x=i%columns*cell-w/2, y=Math.floor(i/columns)*cell-h/2;
    return rect(x,y,cell,cell,{fill:matrix?C.white:v?C.ink:C.white,r:0,sw:4}) +
      (matrix && v!==null ? txt(x+cell/2,y+cell/2,String(v).replace('-', '−'),{size:Math.max(40,cell*.52),fill:v<0?C.coralInk:C.ink}) : '') +
      (mark===i?rect(x+5,y+5,cell-10,cell-10,{fill:'none',stroke:C.coral,r:0,sw:9}):'');
  }).join('') + (window<0?'':rect(-w/2+window*cell+4,-h/2+4,3*cell-8,h-8,{fill:'none',stroke:C.coral,r:0,sw:10}));
}
const kernel = (weights=W.vertical, cell=100) => grid(weights,{matrix:true,cell});
const named = (art, words, y=220) => art + label(words,y,C.ink,44);
function pair(out,step,a,b,py=[235,725]) {
  out.push(put(a,step,'left',[300,315],[400,py[0]]));
  out.push(put(b,step,'right',[900,315],[400,py[1]],{d:140}));
}
const feature = (values, mark=-1, cell=100) => grid(values,{columns:values.length,cell,matrix:true,mark});
const scored = (values, name, weights=W.vertical) => grid(values) + label(name,-190,C.ink,46) + label('响应 '+W.response(values,weights).score,225,C.tealInk,52);
function opening() {
  const out=[];
  pair(out,0,named(grid(W.lineImage(1),{columns:5,cell:100}),'竖线在第 2 列'),named(grid(W.lineImage(2),{columns:5,cell:100}),'竖线在第 3 列'));
  out.push(put(grid(W.lineImage(2),{columns:5,cell:120,window:1}) + g(qBadge(55),{x:325,y:-170}) + label('位置变了 · 检查方法呢？',290,C.ink,52),1,'question'));
  pair(out,2,named(kernel(),'局部计算'),named(kernel(),'权重共享'));
  out.push(put(kernel() + label('先让小窗口算一次',260,C.tealInk,54),3,'window'));
  return scene('open',out);
}
function score() {
  const out=[];
  chapter(out,0,kernel(),'逐格相乘 · 再把九项相加');
  pair(out,1,rect(-95,-95,190,190,{fill:C.ink,r:0}) + label('黑 ＝ 1',190),rect(-95,-95,190,190,{fill:C.white,r:0}) + label('白 ＝ 0',190));
  out.push(put(kernel() + label('中间一列 1 · 两侧 0',250,C.ink,48),2,'template'));
  out.push(put(kernel() + label('权重：各个位置怎样参与计算',260,C.ink,46),3,'weights'));
  out.push(put(kernel(W.response(W.vertical).products) + label(['以竖线图块为例','逐格相乘后的九个乘积'],-240,C.ink,46) + label('把这九项相加',240,C.tealInk,54),4,'products'));
  [W.vertical,W.dot,W.horizontal].forEach((values,i) => {
    const result=W.response(values);
    pair(out,5+i,named(grid(values),['竖线图块','中心黑点','横线图块'][i]),
      kernel(result.products) + label('乘积相加 ＝ '+result.score,225,C.tealInk,52));
  });
  const values=[W.vertical,W.dot,W.horizontal,W.black], names=['竖线','黑点','横线','全黑'];
  values.forEach((v,i) => {
    const art=grid(v,{cell:70}) + label(names[i],-165,C.ink,44) + label(W.response(v).score+' 分',175,C.tealInk,52);
    out.push(put(art,8,'sample.'+i,[165+i*290,325],[205+i%2*390,220+Math.floor(i/2)*500]));
  });
  out.push(put(pill(340,130,'响应 3 分',{fill:C.tealInk,size:62}) + g(qBadge(58),{x:265,y:-100}) + label('得分 ≠ 已经认出竖线',255,C.ink,54),9,'not-recognition'));
  pair(out,10,scored(W.vertical,'竖线'),scored(W.black,'全黑'));
  out.push(put(grid(W.black) + rect(-46,-146,92,292,{fill:'none',stroke:C.coral,r:0,sw:10}) + label(['只检查中间一列','两侧空不空？属于什么物体？'],270,C.ink,50),11,'missing'));
  out.push(put(kernel(W.response(W.dot).products) + label('先乘再加 · 卷积层也会这样计算',260,C.ink,46),12,'multiply-sum'));
  out.push(put(kernel() + label(['深度学习常称「卷积」','这里不翻转模板'],265,C.ink,50),13,'correlation'));
  return scene('score',out);
}
function scanAt(out,step,column,left,{all=false}={}) {
  const source=W.lineImage(column), windows=W.slide(source,5);
  out.push(put(named(grid(source,{columns:5,cell:100,window:left}),'原图 · 竖线在第 '+(column+1)+' 列',205),step,'input',[330,250],[400,235]));
  out.push(put(named(kernel(W.vertical,90),'同一模板',190),step,'template',[930,230],[200,680]));
  const values=windows.map((w,i)=>all||i<=left?w.score:null);
  out.push(put(feature(values,left,90) + label('特征图',-80,C.ink,46),step,'feature',[560,610],[595,650]));
  out.push(put(label(['窗口 '+(left+1),windows[left].score+' 分'],0,C.tealInk,52),step,'current',[970,610],[595,835]));
}
function locatedMap(column) {
  const image=W.lineImage(column), scores=W.slide(image,5).map(w=>w.score);
  return label('原图第 '+(column+1)+' 列',-185,C.ink,44) + g(grid(image,{columns:5,cell:80}),{y:-20}) +
    arrow([[0,115],[0,130]],{sw:5,head:12}) + g(feature(scores,column-1,90),{y:180});
}
function scan() {
  const out=[];
  chapter(out,0,grid(W.lineImage(1),{columns:5,cell:105,window:0}),'换一个位置 · 沿用同一模板');
  out.push(put(grid(W.lineImage(1),{columns:5,cell:120}) + label('3 行 × 5 列',290,C.ink,52),1,'wide'));
  [0,1,2].forEach((left,i)=>scanAt(out,2+i,1,left));
  out.push(put(feature(W.slide(W.lineImage(1),5).map(w=>w.score),0,150) + label('分数按窗口位置排列',230,C.ink,54),5,'map'));
  scanAt(out,6,1,2,{all:true});
  out.push(put(label('步长 1 · 不补边',0,C.tealInk,44),6,'rules-note',[600,45],[400,950]));
  scanAt(out,7,2,1,{all:true});
  pair(out,8,locatedMap(1),locatedMap(2),[245,735]);
  out.push(put(grid(W.lineImage(1),{columns:5,cell:115,window:0}) + label(['每次右移 1 格','窗口始终留在图内'],290,C.ink,52),9,'rules'));
  out.push(put(label(['步长与补边是规则的一部分','规则变了，特征图也可能变'],0,C.ink,54),10,'other-rules'));
  pair(out,11,named(kernel(),'三个位置 · 同一组数'),feature([3,0,0],0,130) + label('特征图',200,C.ink,48));
  out.push(put(kernel() + label(['本例始终共用九个权重','不会为每个窗口另存一套'],275,C.tealInk,52),12,'shared'));
  return scene('scan',out);
}
function training(out,step) {
  ['做预测','比较损失','更新权重'].forEach((s,i)=>{
    out.push(put(rect(-145,-90,290,180,{fill:[C.blue,C.mint,C.cream][i]}) + label(s,0,C.ink,54),step,'train.'+i,[240+i*360,300],[400,190+i*300]));
    if(i<2) out.push(put(arrow([[0,0],[36,0]],{sw:6,head:16}),step,'arrow.'+i,[400+i*360,300],[400,325+i*300,1,90]));
  });
  out.push(put(arrow([[960,415],[960,550],[240,550],[240,415]],{stroke:C.teal,sw:6,head:18}) + txt(600,615,'再做一轮',{size:44,fill:C.tealInk}),step,'loop',[0,0],[0,0],{only:'l'}));
  out.push(put(arrow([[560,790],[700,790],[700,190],[560,190]],{stroke:C.teal,sw:6,head:18}),step,'loop',[0,0],[0,0],{only:'p'}));
}
function learn() {
  const out=[];
  chapter(out,0,kernel(),'手工填数 · 还没有学习');
  out.push(put(kernel() + g(person(),{x:270,y:-50,s:.8}) + label(['当前模板由人填写','训练可以调整这些数'],275,C.ink,54),1,'manual'));
  out.push(put(kernel() + label('滤波器 · 里面是一组权重',260,C.ink,52),2,'filter'));
  training(out,3);
  out.push(put(kernel(W.contrast) + label(['权重可以为负，也可以是小数','多个位置共同影响更新'],275,C.ink,50),4,'values'));
  pair(out,5,pill(300,125,'正权重',{fill:C.tealInk,size:58}) + label('增加某种响应',200,C.ink,48),
    pill(300,125,'负权重',{fill:C.coralInk,size:58}) + label('可以抵消响应',200,C.ink,48));
  pair(out,6,named(kernel(W.half),'三个 1 改成 0.5'),label(['竖线：'+W.response(W.vertical,W.half).score+' 分','黑点：'+W.response(W.dot,W.half).score+' 分'],0,C.tealInk,64));
  out.push(put(label(['换模板，分数的尺度也会变','分数更大 ≠ 判断更可靠'],0,C.ink,58),7,'not-confidence'));
  [W.vertical,W.horizontal].forEach((weights,i)=>{
    const scores=W.slide(W.lineImage(1),5,weights).map(w=>w.score);
    out.push(put(named(kernel(weights,80),'滤波器 '+(i+1),175),8,'filter.'+i,[260,145+i*350],[200,210+i*440]));
    out.push(put(feature(scores,-1,90) + label('特征图 '+(i+1),145,C.ink,44),8,'map.'+i,[910,145+i*350],[595,210+i*440]));
    out.push(put(arrow([[0,0],[250,0]],{sw:6,head:18}),8,'link.'+i,[435,145+i*350],[345,210+i*440,.32]));
  });
  out.push(put(label('同一张原图',0,C.tealInk,44),8,'same-input',[910,30],[400,30]));
  out.push(put(catHead() + g(qBadge(55),{x:205,y:-105}) + label(['没有固定的「认猫清单」','表示取决于数据、结构与任务'],285,C.ink,48),9,'no-checklist'));
  out.push(put(label('AlexNet · 2012',-140,C.tealInk,70) + label(['多层卷积网络用于图像分类','远比一张模板复杂'],140,C.ink,54),10,'research'));
  return scene('learn',out);
}
const QUIZ=[
  {id:'line',question:'中间为 1、两侧为负 1 的新模板给竖线多少分？',answer:'居中竖线仍为 3 分',values:W.vertical,title:'竖线得几分？',answerText:W.response(W.vertical,W.contrast).score+' 分',reason:['两侧白格乘负 1','仍为 0']},
  {id:'black',question:'新模板给全黑图块多少分？',answer:'全黑为 3 减 6，等于负 3 分',values:W.black,title:'全黑得几分？',answerText:'3 − 6 ＝ '+String(W.response(W.black,W.contrast).score).replace('-','−'),reason:['两侧六个黑格','各贡献负 1']},
  {id:'training',question:'手动改模板以后，能说训练已经成功吗？',answer:'仍是人设计的算例，不能据此说训练成功',title:'训练成功了吗？',answerText:'仍是手工算例',reason:['不能保证处理','所有线条']}
].map(q=>({...q,
  front:p=>(q.values?g(grid(q.values,{cell:p?60:72}),{x:p?-215:0,y:p?0:-45}):g(kernel(W.contrast,p?60:72),{x:p?-215:0,y:p?0:-45})) +
    txt(p?100:0,p?-35:115,q.title,{size:p?44:40}) + txt(p?100:0,p?55:175,'点击核对',{size:36,fill:C.tealInk}),
  back:p=>label(q.answerText,p?-40:-55,C.tealInk,p?62:44) + label(p?q.reason.join('，'):q.reason,p?55:100,C.ink,p?38:36)
}));
function bounds() {
  const out=[];
  chapter(out,0,grid(W.black) + g(qBadge(55),{x:240,y:-140}),'局部分数 · 不能回答一切');
  pair(out,1,scored(W.vertical,'竖线'),scored(W.black,'全黑'));
  out.push(put(kernel() + label(['更多滤波器 · 更大范围','有没有帮助，还要训练与测试'],275,C.ink,50),2,'more'));
  pair(out,3,named(grid(W.lineImage(0),{columns:5,cell:105}),'移到边缘，响应也会变'),
    feature(W.slide(W.lineImage(2),5,W.vertical,2).map(w=>w.score),-1,150) + label('原图第 3 列',-165,C.ink,44) + label(['步长 2 · 采两次','可能错过高分位置'],220,C.ink,48));
  out.push(put(grid(W.horizontal) + label(['旋转 · 缩放 · 噪声','权重共享不保证所有变化都认对'],280,C.ink,48),4,'limits'));
  out.push(put(grid(W.lineImage(2),{columns:5,cell:110,window:1}) + label(['各处重复计算 · 按位置记响应','训练再调整权重'],280,C.tealInk,50),5,'summary'));
  out.push(put(kernel() + g(magnifier(65),{x:250,y:40}) + label('沿着计算，看看线索从何而来',275,C.tealInk,50),6,'closing'));
  return scene('bounds',out);
}
module.exports=ctx=>[
  cover(ctx,grid(W.vertical,{cell:120}) + rect(-50,-175,100,350,{fill:'none',stroke:C.coral,r:0,sw:10}) + g(qBadge(52),{x:245,y:-140}),'同一窗口，怎样找线索'),
  opening(),score(),scan(),learn(),bounds(),exercise(QUIZ),
  references(ctx,['〔1〕Conv2d · PyTorch','〔2〕卷积网络 · Stanford CS231n','〔3〕AlexNet · 原始论文'],'全部数值来自手工模板，不代表训练结果')
];
module.exports.thumbnail=section=>{
  const icons=[grid(W.vertical,{cell:90}),kernel(W.vertical,90),grid(W.lineImage(1),{columns:5,cell:70,window:0}),kernel(W.half,90),grid(W.black,{cell:90})+g(qBadge(50),{x:165,y:-100})];
  return '<svg class="toc-thumb" viewBox="-230 -190 460 380" aria-hidden="true" focusable="false">' +
    (section.mark==='源'?magnifier(105):icons[section.num])+'</svg>';
};
