'use strict';
const {C,g,rect,circle,line,txt,arrow,knob,magnifier}=require('../art.cjs');
const {label,put,scene,chapter,cover,references,exercise}=require('../lesson.cjs');
const E=require('../decoder.cjs');
const R=require('../residual.cjs');
const fmt=n=>String(Number(n.toFixed(3)));
const box=(word,w=290,h=120,fill=C.blue,size=48)=>rect(-w/2,-h/2,w,h,{fill,r:14})+label(word,0,C.ink,size);
function strip(words=['今天','下雨'],size=50) {
  return words.map((word,i)=>g(box(word,words.length>3?130:160,120,i===words.length-1?C.mint:C.white,size),{x:(i-(words.length-1)/2)*(words.length>3?145:180)})).join('');
}
function pair(out,step,a,b) {
  out.push(put(a,step,'left',[300,290],[400,180]));
  out.push(put(b,step,'right',[900,290],[400,660],{d:140}));
}
function mini() {
  return strip()+arrow([[0,95],[0,175]],{sw:6,head:18})+g(box('受限计算',400,110,C.blue,50),{y:255})+
    arrow([[0,335],[0,400]],{sw:6,head:18})+g(box('了',170,100,C.mint,58),{y:475});
}
function pipeline(out,step,words,{note='',fills=[]}={}) {
  const count=words.length;
  words.forEach((word,i)=>{
    const w=count>4?205:250;
    out.push(put(box(word,w,120,fills[i]||C.blue,count>4?36:42),step,'node.'+i,[1200/count*(i+.5),260],[400,100+i*(800/(count-1))]));
    if(i<count-1) {
      out.push(put(arrow([[0,0],[1200/count-w-20,0]],{sw:6,head:14}),step,'arrow.'+i,[1200/count*(i+.5)+w/2+10,260],[0,0],{only:'l'}));
      out.push(put(arrow([[0,0],[0,800/(count-1)-150]],{sw:6,head:14}),step,'arrow.'+i,[0,0],[400,175+i*(800/(count-1))],{only:'p'}));
    }
  });
  if(note) out.push(put(label(note,0,C.tealInk,44),step,'note',[600,570],[400,990]));
}
function overview(out,step) { pipeline(out,step,['文字表示','多层块','候选概率','选下一片'],{note:'模块路线示意 · 不含完整数值计算',fills:[C.white,C.blue,C.mint,C.cream]}); }
function embedding(out,step) {
  E.entries.forEach((entry,i)=>{
    const art=g(box(entry.token,190,120,C.white,48),{x:105})+
      arrow([[215,0],[240,0]],{sw:6,head:12})+g(box(entry.id,135,120,C.cream,52),{x:330})+
      arrow([[415,0],[450,0]],{sw:6,head:12})+g(box('['+entry.embedding.map(fmt).join(', ')+']',280,120,C.blue,44),{x:620});
    out.push(put(art,step,'lookup.'+i,[210,210+i*270],[10,210+i*430]));
  });
  out.push(put(label('token → 编号 → 查到向量',0,C.tealInk,48)+label('编号与数值均为任意示意',85,C.ink,42),step,'scope',[600,580],[400,880]));
}
function position(out,step) {
  const e=E.representation(0);
  const terms=[['词表示',e.embedding],['位置表示',e.position],['逐项相加',e.combined]];
  terms.forEach(([name,v],i)=>{
    const art=label(name,-115,C.ink,46)+box('['+v.map(fmt).join(', ')+']',310,130,i===2?C.mint:C.blue,48);
    out.push(put(art,step,'term.'+i,[220+i*380,290],[400,180+i*330]));
    if(i<2) out.push(put(label(i===0?'＋':'＝',0,C.ink,56),step,'op.'+i,[410+i*380,290],[400,340+i*330]));
  });
  out.push(put(label('以「今天」为例 · 数值不来自真实模型',0,C.tealInk,42),step,'scope',[600,600],[400,990]));
}
function layers(out,step) {
  ['甲','乙','丙'].forEach((v,i)=>{
    const art=box('块'+v,300,170,C.blue,56)+label('各自的参数',145,C.tealInk,42);
    out.push(put(art,step,'layer.'+i,[220+i*380,260],[400,120+i*310]));
    if(i<2) {
      out.push(put(arrow([[0,0],[40,0]],{sw:6,head:16}),step,'link.'+i,[390+i*380,260],[0,0],{only:'l'}));
      out.push(put(arrow([[0,0],[0,35]],{sw:6,head:14}),step,'link.'+i,[0,0],[400,300+i*310],{only:'p'}));
    }
  });
  out.push(put(label('多层按类似结构处理 · 通常不共用参数',0,C.ink,44),step,'scope',[600,580],[400,990]));
}
function feedForward(out,step) {
  ['今天','下雨','了'].forEach((word,i)=>{
    const x=140+i*260;
    const art=label(word,-205,C.ink,48)+arrow([[0,-145],[0,-95]],{sw:6,head:16})+box('同一前馈',230,130,C.blue,42)+
      arrow([[0,95],[0,155]],{sw:6,head:16})+g(box('新向量',230,100,C.mint,42),{y:235});
    out.push(put(art,step,'position.'+i,[250+i*350,290],[x,350]));
  });
  out.push(put(label(['含非线性 · 逐位置加工','本子层不直接混合不同位置'],0,C.tealInk,46),step,'scope',[600,650],[400,850]));
}
function residual() {
  const r=R.point(5,0,2);
  return g(box(r.input,170,90,C.white,58),{y:-200})+arrow([[0,-140],[0,-75]],{sw:6,head:18})+
    box('本次补 '+r.correction,310,110,C.blue,48)+arrow([[0,70],[0,130]],{sw:6,head:18})+
    arrow([[115,-200],[250,-200],[250,190],[65,190]],{sw:6,head:18})+txt(350,0,'保留 5',{size:42})+
    circle(0,190,45,{fill:C.cream})+label('＋',190,C.ink,58)+arrow([[0,250],[0,290]],{sw:6,head:18})+
    label('5 ＋ 2 ＝ '+r.output,350,C.tealInk,64);
}
function postLN(out,step) {
  const lNodes=[['块输入',125,65],['注意力',125,260],['＋',475,260],['归一化',850,260],['前馈',850,500],['＋',475,500],['归一化',125,500],['块输出',125,660]];
  let l=lNodes.map(([w,x,y])=>g(w==='＋'?circle(0,0,42,{fill:C.cream})+label(w,0,C.ink,58):box(w,w.startsWith('块')?190:250,w.startsWith('块')?75:100,C.blue,44),{x,y})).join('');
  for(const points of [[[125,120],[125,190]],[[270,260],[410,260]],[[540,260],[700,260]],[[850,335],[850,425]],[[700,500],[540,500]],[[410,500],[270,500]],[[125,575],[125,600]],[[245,65],[475,65],[475,195]],[[1000,260],[1130,260],[1130,590],[475,590],[475,565]]]) l+=arrow(points,{sw:6,head:16});
  l+=txt(660,65,'保留块输入',{size:40,fill:C.tealInk})+txt(870,660,'保留上一子层的结果',{size:40,fill:C.tealInk});
  const ys=[50,180,300,420,550,670,790,920];
  let p=lNodes.map(([w],i)=>g(w==='＋'?circle(0,0,35,{fill:C.cream})+label(w,0,C.ink,50):box(w,330,80,C.blue,46),{x:340,y:ys[i]})).join('');
  ys.slice(0,-1).forEach((y,i)=>{const end=ys[i+1]-55; p+=arrow([[340,y+55],[340,end]],{sw:6,head:14});});
  p+=arrow([[530,50],[650,50],[650,300],[395,300]],{sw:6,head:16})+arrow([[530,420],[710,420],[710,670],[395,670]],{sw:6,head:16});
  out.push(put(l,step,'block',[0,0],[0,0],{only:'l'}));
  out.push(put(p,step,'block',[0,0],[0,0],{only:'p'}));
}
function mark(allowed) {
  return allowed?line(-25,0,-5,25,{stroke:C.tealInk,sw:9})+line(-5,25,35,-30,{stroke:C.tealInk,sw:9}):label('×',0,C.white,64);
}
function maskIcon() {
  return E.mask().map((row,r)=>row.map((allowed,c)=>g(rect(-48,-42,96,84,{fill:allowed?C.mint:C.muted,r:8,sw:3})+g(mark(allowed),{s:.65}),{x:(c-1)*115,y:(r-1)*105})).join('')).join('');
}
function maskMatrix(out,step,selected=-1) {
  const rows=E.trainingRows();
  let l=txt(95,65,'输入行',{size:40})+txt(560,65,'可读取的位置',{size:42})+txt(1075,65,'预测下一片',{size:40});
  let p=txt(400,15,'列：可读取的位置',{size:44});
  rows.forEach((row,r)=>{
    l+=txt(95,215+r*160,row.input,{size:48,fill:r===selected?C.tealInk:C.ink})+g(box(row.target,220,105,C.cream,52),{x:1075,y:215+r*160})+arrow([[855,215+r*160],[935,215+r*160]],{sw:6,head:16});
    p+=txt(65,245+r*175,row.input,{size:44,fill:r===selected?C.tealInk:C.ink});
    if(r===selected) {l+=rect(215,140+r*160,610,150,{fill:'none',stroke:C.tealInk,sw:7,r:14});p+=rect(155,165+r*175,580,160,{fill:'none',stroke:C.tealInk,sw:7,r:14});}
    rows.forEach((col,c)=>{
      if(r===0) {l+=txt(330+c*200,125,col.input,{size:44});p+=txt(245+c*200,105,col.input,{size:44});}
      const cell=(w,h)=>rect(-w/2,-h/2,w,h,{fill:row.allowed[c]?C.mint:C.muted,r:10,sw:4})+mark(row.allowed[c]);
      l+=g(cell(160,120),{x:330+c*200,y:215+r*160});
      p+=g(cell(150,135),{x:245+c*200,y:245+r*175});
    });
    p+=g(box(row.input+'→'+row.target,240,100,C.cream,40),{x:145+r*255,y:930});
  });
  l+=txt(600,660,'浅绿可读 · 灰色不可读；不是权重大小',{size:42,fill:C.tealInk});
  p+=txt(400,735,'浅绿可读 · 灰色不可读',{size:44,fill:C.tealInk})+txt(400,825,'各输入行 → 预测紧接着的下一片',{size:40});
  out.push(put(l,step,'mask',[0,0],[0,0],{only:'l'}));
  out.push(put(p,step,'mask',[0,0],[0,0],{only:'p'}));
}
function rowMappings(out,step) {
  E.trainingRows().forEach((r,i)=>{
    const art=box(r.readable.join('／'),650,120,C.mint,46)+arrow([[360,0],[435,0]],{sw:6,head:18})+g(box(r.target,170,120,C.cream,54),{x:550});
    const p=label('读：'+r.readable.join('／'),-70,C.ink,46)+arrow([[0,0],[0,40]],{sw:6,head:16})+label('预测：'+r.target,110,C.tealInk,50);
    out.push(put(art,step,'row.'+i,[420,150+i*220],[0,0],{only:'l'}));
    out.push(put(p,step,'row.'+i,[0,0],[400,120+i*325],{only:'p'}));
  });
}
function generationLoop(out,step) {
  const names=['受限计算','候选概率','选下一片','接回上下文','满足停止条件？'];
  names.forEach((name,i)=>{
    out.push(put(box(name,210,120,i===4?C.cream:C.blue,i===4?29:36),step,'node.'+i,[110+i*245,260],[0,0],{only:'l'}));
    out.push(put(box(name,440,100,i===4?C.cream:C.blue,46),step,'node.'+i,[0,0],[310,70+i*165],{only:'p'}));
    if(i<4) {
      out.push(put(arrow([[0,0],[15,0]],{sw:6,head:10}),step,'link.'+i,[330+i*245-105,260],[0,0],{only:'l'}));
      out.push(put(arrow([[0,0],[0,35]],{sw:6,head:14}),step,'link.'+i,[0,0],[310,135+i*165],{only:'p'}));
    }
  });
  const l=arrow([[1090,175],[1090,90],[110,90],[110,175]],{sw:6,head:18,stroke:C.tealInk})+txt(600,40,'否 · 继续',{size:44,fill:C.tealInk})+
    arrow([[1090,345],[1090,475]],{sw:6,head:18})+txt(1000,410,'是',{size:46})+g(box('结束',210,100,C.mint,54),{x:1090,y:555});
  const p=arrow([[550,730],[700,730],[700,70],[550,70]],{sw:6,head:18,stroke:C.tealInk})+txt(615,365,['否','继续'],{size:42,fill:C.tealInk})+
    arrow([[310,800],[310,860]],{sw:6,head:18})+txt(215,835,'是',{size:46})+g(box('结束',240,90,C.mint,54),{x:310,y:935});
  out.push(put(l,step,'branches',[0,0],[0,0],{only:'l'}));
  out.push(put(p,step,'branches',[0,0],[0,0],{only:'p'}));
}
function distribution(index) {
  const choices=E.rounds[index];
  return label('作者设定 · 非模型实测',-230,C.tealInk,44)+choices.map((v,i)=>{
    const y=-100+i*180;
    return txt(-270,y-30,v.token,{size:56,anchor:'start'})+txt(270,y-30,v.p.toFixed(2),{size:52,anchor:'end',fill:C.tealInk})+
      rect(-270,y+25,540,45,{fill:C.white,r:0,sw:3})+rect(-270,y+25,540*v.p,45,{fill:i===0?C.mint:C.peach,r:0,sw:0});
  }).join('');
}
function opening() {
  const out=[];
  out.push(put(strip(E.sentence)+label('只多两片 · 经过哪些计算？',250,C.ink,50),0,'question'));
  overview(out,1);
  out.push(put(g(mini(),{s:1})+label('先走到句号 · 再核对各位置能读什么',-180,C.tealInk,44),2,'read',[600,180],[400,270]));
  return scene('open',out);
}
function representation() {
  const out=[];
  chapter(out,0,strip(),'先分片 · 再取得数字表示');
  out.push(put(strip()+label(['今天／下雨 · 仅为本例切分','真实分词器未必这样切'],270,C.tealInk,48),1,'tokens'));
  embedding(out,2);
  pair(out,3,strip(['猫','追','狗'])+label('猫追狗',200,C.ink,50),strip(['狗','追','猫'])+label('狗追猫',200,C.ink,50));
  position(out,4); layers(out,5); overview(out,6);
  return scene('representation',out);
}
function block() {
  const out=[];
  chapter(out,0,box('注意力 ＋ 前馈',570,160,C.blue,52),'联系上下文 · 加工当前位置');
  out.push(put(maskIcon()+label(['组合自身与前面的位置','不读取后文'],280,C.tealInk,50),1,'causal',[600,280],[400,350]));
  pair(out,2,box('同一条序列',480,130,C.mint,52)+label('「自」：信息来自这里',220,C.ink,44),box('多组组合 → 合并',520,130,C.blue,44)+label('「因果」：限制读取位置',220,C.ink,42));
  feedForward(out,3);
  out.push(put(residual(),4,'residual',[500,270],[340,360]));
  pipeline(out,5,['当前向量',['调整均值','与幅度'],'缩放与平移','新向量'],{note:'层归一化 ≠ 输出层的候选概率',fills:[C.white,C.blue,C.cream,C.mint]});
  postLN(out,6); postLN(out,7);
  pair(out,8,box('本篇：生成路线',510,150,C.mint,46)+label('只用解码器',230,C.tealInk,54),box('原论文：翻译',510,150,C.blue,46)+label('含编码器与解码器',230,C.ink,46));
  return scene('block',out);
}
function mask() {
  const out=[];
  chapter(out,0,maskIcon(),'遮住未来 · 每行预测下一片');
  pair(out,1,strip(['今天'])+label('预测：下雨',210,C.tealInk,52),strip(['下雨','了'])+label(['未来答案','不可进入这一行输入'],230,C.coralInk,44));
  pair(out,2,strip(['今天'])+label('→ 预测下雨',210,C.tealInk,52),strip(['今天','下雨'])+label('→ 预测了',210,C.tealInk,52));
  maskMatrix(out,3); maskMatrix(out,4,1);
  pipeline(out,5,['块甲 · 遮罩','块乙 · 遮罩','块丙 · 遮罩'],{note:'各层都受限 · 防止未来信息绕路漏入'});
  rowMappings(out,6);
  pair(out,7,strip(['今天','下雨'])+label('可读取的输入',230,C.tealInk,50),box('了',190,130,C.cream,62)+label(['只在核对答案侧','不能塞回这一行输入'],230,C.ink,44));
  return scene('mask',out);
}
const QUIZ=[
  {id:'row',front:['预测「了」','对应哪一输入行？'],back:'下雨',reason:'用这一行的结果预测下一片',answer:'下雨行预测了'},
  {id:'read',front:['这一行可以读取','哪些输入？'],back:'今天／下雨',reason:'自身及前面的位置',answer:'只能读取今天与下雨'},
  {id:'target',front:['目标「了」能放进','这一行的输入吗？'],back:'不能',reason:'正确答案只在比较结果侧',answer:'不能，不能提前读取目标'}
].map(q=>({...q,question:q.front.join(''),front:p=>label(q.front,p?-28:-45,C.ink,p?46:38)+label('点击核对',p?85:165,C.tealInk,36),
  back:p=>label(q.back,p?-40:-55,C.tealInk,p?60:52)+label(q.reason,p?55:110,C.ink,p?36:26)}));
function generation() {
  const out=[],trace=E.generation();
  chapter(out,0,strip(),'从最后一个位置 · 接出下一片');
  pipeline(out,1,['最后的表示','候选分数','softmax','候选概率','选择'],{fills:[C.white,C.blue,C.blue,C.mint,C.cream]});
  out.push(put(distribution(0),2,'first',[600,330],[400,400]));
  out.push(put(strip(trace[0].after)+label('本次贪心选择：了',240,C.tealInk,52),3,'append-first'));
  out.push(put(distribution(1),4,'second',[600,330],[400,400]));
  out.push(put(strip(trace[1].after)+label(['本玩具：句号后停止','两轮概率由作者指定'],255,C.tealInk,48),5,'stop'));
  generationLoop(out,6);
  pair(out,7,strip(trace[0].after)+label('若先选「了」',230,C.ink,48),strip(E.append(trace[0].before,'吗'))+label('若先选「吗」',230,C.tealInk,48));
  pair(out,8,strip(trace[0].after)+label('上下文增加了片段',230,C.ink,46),knob(100)+label('仍用已有参数',230,C.tealInk,50));
  pair(out,9,box('复用已算部分',510,150,C.blue,46),box('处理新增及依赖',510,150,C.mint,46));
  generationLoop(out,10);
  pair(out,11,strip(E.sentence)+label('文字怎样接出来',230,C.ink,48),magnifier(100)+label(['今天下雨了吗？','仍须外部证据'],250,C.tealInk,48));
  return scene('generation',out);
}
module.exports=ctx=>[cover(ctx,g(mini(),{s:.85,y:-160}),'跟着两片输入走到句号'),opening(),representation(),block(),mask(),exercise(QUIZ),generation(),
  references(ctx,['〔1〕Transformer · 原始论文','〔2〕生成式预训练 · 技术报告','〔3〕层归一化 · 原始论文'],'路线、数值与概率示意 · 不代表模型测评')];
module.exports.thumbnail=section=>{
  const icons=[g(strip(),{s:.8}),g(strip(),{s:.8}),g(box('块内计算',380,140,C.blue,52),{s:.9}),maskIcon(),g(strip(['了','。']),{s:.8})];
  return '<svg class="toc-thumb" viewBox="-230 -190 460 380" aria-hidden="true" focusable="false">'+(section.mark==='源'?magnifier(105):icons[section.num])+'</svg>';
};
