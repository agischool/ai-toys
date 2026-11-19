'use strict';
const {C,g,rect,circle,line,txt,arrow,qBadge,magnifier,knob}=require('../art.cjs');
const {label,put,scene,chapter,cover,references,exercise}=require('../lesson.cjs');
const E=require('../attention.cjs');
const box=(word,w=290,h=130,fill=C.blue,size=50)=>rect(-w/2,-h/2,w,h,{fill,r:16})+label(word,0,C.ink,size);
function pair(out,step,a,b) {
  out.push(put(a,step,'left',[300,290],[400,185]));
  out.push(put(b,step,'right',[900,290],[400,665],{d:140}));
}
function objects(small=false) {
  const r=95,w=170;
  return g(circle(0,0,r,{fill:C.yellow,stroke:small?C.ink:C.tealInk}),{x:-145})+g(rect(-w/2,-w/2,w,w,{fill:C.blue,r:8,stroke:small?C.tealInk:C.ink})+line(-w/2,-w/2,w/2,w/2,{sw:3})+line(-w/2,w/2,w/2,-w/2,{sw:3}),{x:150})+
    txt(-145,150,'小球',{size:48})+txt(150,150,'盒子',{size:48});
}
function meaning(small=false) {
  return label('因为它太'+(small?'小':'大')+'了',-155,C.ink,50)+objects(small)+
    arrow([[small?150:-145,195],[small?150:-145,220]],{stroke:C.teal,sw:6,head:18})+
    txt(small?150:-145,260,'通常指'+(small?'盒子':'小球'),{size:44,fill:C.tealInk});
}
function sumIcon(name='first') {
  const r=E.trial(name);
  return txt(-170,-80,'2 × '+r.weights[0],{size:48})+txt(170,-80,'10 × '+r.weights[1],{size:48})+
    arrow([[-170,-20],[-170,60],[-50,120]],{sw:6,head:18})+arrow([[170,-20],[170,60],[50,120]],{sw:6,head:18})+
    circle(0,185,72,{fill:C.mint})+label(r.result,185,C.tealInk,70);
}
function weighted(out,step,name,mode=2) {
  const r=E.trial(name);
  r.values.forEach((n,i)=>{
    const column=label('信息 '+n,-90,C.ink,52)+box('× '+r.weights[i],280,110,i?C.peach:C.mint,56)+
      (mode>0?arrow([[0,75],[0,145]],{sw:6,head:18})+label(r.products[i],205,C.tealInk,70):'');
    out.push(put(column,step,'term.'+i,[330+i*540,240],[200+i*400,205]));
  });
  const note=mode===0?'权重总和：'+r.weights.join(' ＋ ')+' ＝ 1':mode===1?'各份信息 · 分别乘上比重':r.products.join(' ＋ ')+' ＝ '+r.result;
  if(mode===2) {
    out.push(put(arrow([[330,500],[330,535],[520,535]],{sw:6,head:18})+arrow([[870,500],[870,535],[680,535]],{sw:6,head:18}),step,'join',[0,0],[0,0],{only:'l'}));
    out.push(put(arrow([[200,485],[200,590],[350,650]],{sw:6,head:18})+arrow([[600,485],[600,590],[450,650]],{sw:6,head:18}),step,'join',[0,0],[0,0],{only:'p'}));
  }
  out.push(put(label(note,0,C.tealInk,mode===2?66:46),step,'result',[600,mode===2?620:610],[400,mode===2?795:790]));
}
function range(out,step) {
  const l=line(150,340,1050,340,{sw:7})+['2','4','6','8','10'].map((v,i)=>g(circle(0,0,18,{fill:i===0||i===4?C.ink:C.tealInk,sw:0})+label(v,85,C.ink,58),{x:150+225*i,y:340})).join('');
  const p=line(90,410,710,410,{sw:7})+['2','4','6','8','10'].map((v,i)=>g(circle(0,0,14,{fill:i===0||i===4?C.ink:C.tealInk,sw:0})+label(v,90,C.ink,58),{x:90+155*i,y:410})).join('');
  out.push(put(l,step,'range',[0,0],[0,0],{only:'l'}));
  out.push(put(p,step,'range',[0,0],[0,0],{only:'p'}));
  out.push(put(label(['权重非负 · 总和为 1','结果落在 2 与 10 之间'],0,C.tealInk,50),step,'condition',[600,560],[400,820]));
}
function flow(out,step) {
  const words=[['查询 ＋ 键','算匹配分数'],['softmax','非负 · 总和 1'],['权重 × 值','加权组合']];
  words.forEach((w,i)=>{
    const art=box('',330,190,i===2?C.mint:C.blue)+label(w[0],-38,C.ink,46)+label(w[1],42,C.tealInk,40);
    out.push(put(art,step,'stage.'+i,[210+i*390,290],[400,160+i*310]));
    if(i<2) out.push(put(arrow([[-18,0],[18,0]],{sw:6,head:14}),step,'link.'+i,[405+i*390,290],[400,315+i*310,1,90]));
  });
}
function vector(values=[2,10],fill=C.blue) {
  return values.map((n,i)=>g(box(n,140,120,fill,54),{x:(i-(values.length-1)/2)*155})).join('');
}
function available(out,step,full) {
  const chunks=['小球没放进盒子','因为它','太大了'];
  chunks.forEach((w,i)=>{
    const art=box(w,i===0?430:270,130,i===2&&!full?C.peach:C.mint,46)+
      (i===2&&!full?label('尚未出现 · 不可用',150,C.coralInk,44):'');
    out.push(put(art,step,'chunk.'+i,[i===0?260:i===1?690:1020,290],[400,150+i*275]));
  });
  out.push(put(label(full?'处理整句：可利用后文线索':'从左往右续写：到「它」为止',0,C.tealInk,50),step,'scope',[600,590],[400,965]));
}
function opening() {
  const out=[];
  out.push(put(meaning(),0,'large',[600,280],[400,340]));
  out.push(put(meaning(true),1,'small',[600,280],[400,340]));
  out.push(put(sumIcon()+label('按比重 · 组合不同位置的信息',360,C.ink,50),2,'combine',[600,285],[400,480]));
  pair(out,3,box('乘法 ＋ 加法',500,150,C.mint,48),box('查询 · 键 · 值',500,150,C.blue,48));
  return scene('open',out);
}
function context() {
  const out=[];
  chapter(out,0,objects(),'一字变化 · 通常的指向会改变');
  pair(out,1,meaning(),meaning(true));
  out.push(put(objects()+label(['通常的理解','额外背景仍可能改变解释'],350,C.tealInk,50),2,'ordinary',[600,300],[400,350]));
  pair(out,3,meaning(),meaning(true));
  pair(out,4,vector([.2,-.7,.4])+label(['词句 → 向量','任意示意 · 非词句编码'],225,C.ink,44),sumIcon()+label('一种组合计算',300,C.ink,48));
  return scene('context',out);
}
function weights() {
  const out=[];
  chapter(out,0,sumIcon(),'相同信息 · 比重改变结果');
  pair(out,1,box(2,280,180,C.mint,88),box(10,280,180,C.peach,88));
  weighted(out,2,'first',0); weighted(out,3,'first'); weighted(out,4,'swapped');
  range(out,5);
  pair(out,6,objects()+label('句意例子：为什么用上下文',330,C.ink,42),sumIcon()+label('数值例子：怎样作组合',300,C.ink,42));
  const a=E.combine([[2,4],[10,8]],[.75,.25]);
  pair(out,7,vector([2,4])+label('第一份 · 权重 0.75',210,C.ink,46),vector([10,8],C.peach)+label('第二份 · 权重 0.25',210,C.ink,46));
  out.push(put(vector(a.result,C.mint)+label(['逐项结果：4 与 5','新增数值只作向量示意'],230,C.ink,48),8,'vector-result'));
  out.push(put(vector(a.result,C.mint)+arrow([[0,110],[0,220]],{sw:6,head:18})+g(box('后续模块',430,130,C.cream,52),{y:315})+label('一次乘加 · 还没有交出指代答案',-190,C.tealInk,46),9,'later',[600,270],[400,350]));
  out.push(put(sumIcon('equal')+label(['数值组合之后','仍须更多计算才能理解指代'],360,C.tealInk,44),10,'equal-scope',[600,265],[400,450]));
  return scene('weights',out);
}
const QUIZ=[
  {id:'equal',front:['两个权重均为 0.5','组合结果是多少？'],back:String(E.trial('equal').result),reason:'2 × 0.5 ＋ 10 × 0.5',answer:'结果为 6'},
  {id:'between',front:['非负权重，总和 1','结果会超出','2 到 10 吗？'],back:'不会',reason:'这里是加权平均',answer:'不会超出 2 到 10'},
  {id:'referent',front:['只靠数值组合','能判断「它」','指谁吗？'],back:'不能',reason:'还没有实现指代理解',answer:'不能，玩具只实现数值组合'}
].map(q=>({...q,question:q.front.join(''),front:p=>label(q.front,p?-28:-45,C.ink,p?45:36)+label('点击核对',p?85:165,C.tealInk,36),
  back:p=>label(q.back,p?-42:-55,C.tealInk,p?65:58)+label(q.reason,p?55:110,C.ink,p?36:32)}));
function qkv() {
  const out=[];
  chapter(out,0,knob(100),'由当前输入与学到的参数计算');
  pair(out,1,knob(95)+label('训练学到的参数',235,C.ink,50),box('当前输入',430,140,C.blue,54)+label('输入改变 · 权重可能改变',235,C.tealInk,42));
  const kinds=[['查询','要找什么'],['键','拿什么匹配'],['值','实际取用的内容']];
  kinds.forEach((v,i)=>out.push(put(box(v[0],310,140,i===2?C.mint:C.blue,58)+label(v[1],170,C.tealInk,42),2,'role.'+i,[220+380*i,275],[400,120+i*325])));
  flow(out,3);
  pair(out,4,label(['0.75','组合信息的比重'],0,C.tealInk,54),qBadge(85)+label(['≠ 75% 的指代把握','≠ 下一 token 候选概率'],245,C.ink,42));
  flow(out,5);
  const l=box('同一位置',280,120,C.white,46)+[-1,1].map(k=>arrow([[k*165,0],[k*245,0]],{sw:6,head:18})+g(box('一组计算',280,130,k===-1?C.blue:C.mint,44),{x:k*410})).join('')+label('多头：多组可训练变换',-180,C.tealInk,48)+arrow([[-410,90],[-410,180],[-200,270]],{sw:6,head:18})+arrow([[410,90],[410,180],[200,270]],{sw:6,head:18})+g(box('合在一起',360,100,C.cream,50),{y:300});
  const p=box('同一位置',310,120,C.white,50)+[-1,1].map(k=>arrow([[k*70,90],[k*195,215]],{sw:6,head:18})+g(box('一组计算',320,130,k===-1?C.blue:C.mint,44),{x:k*195,y:320})).join('')+
    arrow([[-195,410],[-195,480],[-70,550]],{sw:6,head:18})+arrow([[195,410],[195,480],[70,550]],{sw:6,head:18})+g(box('合在一起',360,120,C.cream,50),{y:650})+label('不保证每组都有清晰的语法标签',820,C.ink,40);
  out.push(put(l,6,'heads',[600,260],[0,0],{only:'l'}));
  out.push(put(p,6,'heads',[0,0],[400,80],{only:'p'}));
  return scene('qkv',out);
}
function scope() {
  const out=[];
  chapter(out,0,box('它 → 太大 / 太小',630,140,C.blue,48),'哪些位置能用 · 取决于任务限制');
  available(out,1,true); available(out,2,false);
  pair(out,3,label(['处理整句','后文可以成为线索'],0,C.ink,52),label(['从左向右生成','未来内容尚不可用'],0,C.tealInk,50));
  return scene('scope',out);
}
function evidence() {
  const out=[];
  pair(out,0,sumIcon()+label('观察组合方式',350,C.ink,46),qBadge(85)+label(['数值及后续计算','也会影响最终答案'],245,C.ink,46));
  pair(out,1,magnifier(100)+label('权重图：观察一步组合',255,C.ink,44),box('另行设计检验',480,140,C.cream,50)+label('断言某个词的因果影响',235,C.tealInk,44));
  out.push(put(sumIcon()+label(['为允许使用的信息算权重','再加权组合'],390,C.tealInk,50),2,'close',[600,260],[400,320]));
  return scene('evidence',out);
}
module.exports=ctx=>[cover(ctx,sumIcon(),'比重怎样改变组合结果'),opening(),context(),weights(),exercise(QUIZ),qkv(),scope(),evidence(),
  references(ctx,['〔1〕对齐与翻译 · 原始论文','〔2〕Transformer · 原始论文','〔3〕注意力解释边界 · 研究论文'],'人为算例与句意分析 · 不是模型测评')];
module.exports.thumbnail=section=>{
  const icons=[g(objects(),{s:.7}),g(objects(),{s:.7}),g(sumIcon(),{s:.65}),g(knob(100),{s:1.1}),g(box('可用位置',380,130,C.mint,52),{s:.9})];
  return '<svg class="toc-thumb" viewBox="-230 -190 460 380" aria-hidden="true" focusable="false">'+(section.mark==='源'?magnifier(105):icons[section.num])+'</svg>';
};
