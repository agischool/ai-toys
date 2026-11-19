'use strict';
const {C,g,rect,line,txt,arrow,pill,knob,qBadge,magnifier}=require('../art.cjs');
const {label,put,scene,chapter,cover,references,exercise}=require('../lesson.cjs');
const E=require('../recurrent.cjs');
const fmt=n=>String(Number(n.toFixed(5)));
function umbrella(blue=false) {
  return '<path d="M-150 0 A150 150 0 0 1 150 0 Q112 -35 75 0 Q38 -35 0 0 Q-38 -35 -75 0 Q-112 -35 -150 0Z" fill="'+(blue?C.blue:C.coral)+'" stroke="'+C.ink+'" stroke-width="6" stroke-linejoin="round"/>' +
    '<path d="M0 -150 Q-65 -85 -75 0 M0 -150 Q65 -85 75 0 M0 -150 V155 Q0 205 -50 205 Q-95 205 -95 165" fill="none" stroke="'+C.ink+'" stroke-width="6" stroke-linecap="round"/>';
}
function note(word,subtitle='便签') {
  return rect(-185,-130,370,260,{fill:C.cream,r:12}) + line(-135,-70,135,-70,{sw:3}) + label(subtitle,-100,C.ink,38) + label(word,25,C.tealInk,64);
}
function pair(out,step,a,b) {
  out.push(put(a,step,'left',[300,315],[400,170]));
  out.push(put(b,step,'right',[900,315],[400,670],{d:140}));
}
function vector() {
  return [0.2,-0.7,0.4].map((n,i)=>rect(-225+i*150,-65,150,130,{fill:C.blue,r:0,sw:4}) + txt(-150+i*150,0,n,{size:54})).join('') +
    label('任意示意数值 · 非颜色编码',190,C.ink,44);
}
function trace(out,step,{changed=false}={}) {
  const events=changed?[...E.story,E.exchange]:E.story;
  const a=E.trace(changed?'first':'latest',events), b=E.trace('color',events);
  const indices=changed?[2,3]:[0,1,2];
  indices.forEach((idx,i)=>{
    const x=changed?370+i*460:240+i*360, y=changed?300+i*410:180+i*290;
    const body=label(events[idx].text,-135,C.ink,44) + rect(-130,-75,260,105,{fill:C.peach,r:12}) + label(a[idx].state,-22,C.ink,52) +
      rect(-130,70,260,105,{fill:C.mint,r:12}) + label(b[idx].state,123,C.tealInk,52);
    const portrait=label(events[idx].text,-110,C.ink,46) + rect(-275,-55,240,110,{fill:C.peach,r:12}) + txt(-155,0,a[idx].state,{size:54}) +
      rect(35,-55,240,110,{fill:C.mint,r:12}) + txt(155,0,b[idx].state,{size:54,fill:C.tealInk});
    out.push(put(body,step,'time.'+idx,[x,340],[400,y],{only:'l'}));
    out.push(put(portrait,step,'time.'+idx,[x,340],[400,y],{only:'p'}));
    if(i<indices.length-1) {
      out.push(put(arrow([[-25,0],[25,0]],{sw:6,head:16}),step,'link.'+i,[changed?600:420+i*360,315],[0,0],{only:'l'}));
      out.push(put([-155,155].map(x=>arrow([[x,85],[x,(changed?410:290)-85]],{sw:6,head:16})).join(''),step,'link.'+i,[0,0],[400,y],{only:'p'}));
    }
  });
  const descriptions=changed?['只留第一次的颜色','换伞时更新颜色']:['只留最新一句','保留伞的颜色'];
  out.push(put(label('上：'+descriptions[0],0,C.ink,42) + label('下：'+descriptions[1],65,C.tealInk,42),step,'legend',[600,640],[0,0],{only:'l'}));
  out.push(put(label('左：'+descriptions[0],0,C.ink,42) + label('右：'+descriptions[1],65,C.tealInk,42),step,'legend',[0,0],[400,930],{only:'p'}));
}
function chain(out,step) {
  ['读红伞','读阴天','读到风','问颜色'].forEach((word,i)=>{
    const art=rect(-115,-90,230,180,{fill:C.blue,r:16}) + label('同一计算',-38,C.ink,36) + label(word,36,C.ink,46);
    out.push(put(art,step,'cell.'+i,[150+i*300,325],[400,100+i*230]));
    if(i<3) out.push(put(arrow([[-20,0],[20,0]],{sw:6,head:15}),step,'state.'+i,[300+i*300,325],[400,215+i*230,1,90]));
  });
  out.push(put(label('展开后的四步 · 共用同一套参数',0,C.tealInk,44),step,'shared',[600,600],[400,980]));
}
function updateFlow(out,step) {
  const l=rect(-180,-100,360,200,{fill:C.blue}) + label('状态更新',0,C.ink,60) +
    txt(-400,0,'旧状态',{size:48}) + arrow([[-285,0],[-205,0]],{sw:6,head:18}) +
    txt(400,0,'新状态',{size:48}) + arrow([[205,0],[285,0]],{sw:6,head:18}) +
    label('当前输入',-265,C.ink,50) + arrow([[0,-210],[0,-125]],{sw:6,head:18}) + label('结构与参数决定更新方式',260,C.tealInk,46);
  const p=rect(-180,-100,360,200,{fill:C.blue}) + label('状态更新',0,C.ink,60) +
    label('旧状态',-300,C.ink,52) + arrow([[0,-240],[0,-125]],{sw:6,head:18}) +
    label('新状态',300,C.ink,52) + arrow([[0,125],[0,230]],{sw:6,head:18}) +
    txt(285,-280,'当前输入',{size:44}) + arrow([[285,-220],[285,0],[205,0]],{sw:6,head:18});
  out.push(put(l,step,'flow',[600,320],[400,480],{only:'l'}));
  out.push(put(p,step,'flow',[600,320],[350,480],{only:'p'}));
}
function numeric(out,step,retain=.5) {
  const r=E.update(2,retain,1);
  const parts=[['旧状态',fmt(r.previous),C.blue],['保留系数',fmt(r.retain),C.cream],['新写入量',fmt(r.write),C.mint]];
  parts.forEach(([name,value,fill],i)=>{
    const art=rect(-150,-90,300,180,{fill,r:16}) + label(name,-35,C.ink,40) + label(value,35,C.tealInk,60);
    out.push(put(art,step,'term.'+i,[220+i*380,190],[400,95+i*245]));
    if(i<2) out.push(put(label(i===0?'×':'＋',0,C.ink,60),step,'op.'+i,[410+i*380,190],[400,220+i*245]));
  });
  out.push(put(label('2 × '+fmt(retain)+' ＋ 1 ＝ '+fmt(r.next),0,C.tealInk,66) + label('保留 '+fmt(r.kept)+' · 写入 1',110,C.ink,44),step,'result',[600,510],[400,875]));
}
function opening() {
  const out=[];
  pair(out,0,umbrella() + label('小岚带红伞',300,C.ink,52),note('阴天 · 风','后来读到'));
  pair(out,1,umbrella() + label('伞是什么颜色？',300,C.ink,50),note('红','前文线索'));
  out.push(put(note('留下什么？') + g(qBadge(55),{x:250,y:-150}) + label('每次只看一句 · 只留一张便签',315,C.ink,48),2,'challenge'));
  return scene('open',out);
}
function notes() {
  const out=[];
  chapter(out,0,note('红'),'相同故事 · 两种更新规则');
  pair(out,1,note('最新一句','人为规则 A'),note('伞的颜色','人为规则 B'));
  pair(out,2,umbrella() + label('第一步 · 带红伞',300,C.ink,48),note('红伞'));
  pair(out,3,note('阴天','第二步'),note('风','第三步'));
  out.push(put(note('风') + g(qBadge(55),{x:245,y:-140}) + label('只留最新一句 · 颜色已丢失',300,C.ink,50),4,'lost'));
  out.push(put(note('红') + label('换规则：天气不覆盖颜色',300,C.tealInk,50),5,'keep'));
  trace(out,6);
  pair(out,7,note('红','留下的线索'),pill(360,120,'回答：红色',{fill:C.tealInk,size:52}));
  trace(out,8);
  trace(out,9);
  out.push(put(note('人规定') + label(['已经知道最后问颜色','没有训练模型'],300,C.ink,50),10,'scope'));
  pair(out,11,note('红'),qBadge(85) + label(['问：有没有风？','这一字便签不够用'],250,C.ink,48));
  return scene('notes',out);
}
function states() {
  const out=[];
  chapter(out,0,vector(),'从纸面便签 · 换成数值状态');
  out.push(put(vector() + label('RNN · 循环神经网络',-200,C.tealInk,56),1,'state'));
  out.push(put(vector() + label(['信息可能分散在多个数及其组合中','示意数值不对应红色'],330,C.ink,46),2,'distributed',[600,310],[400,400]));
  updateFlow(out,3);
  out.push(put(knob(110) + label(['参数：一组可调的数','决定怎样更新状态'],300,C.ink,52),4,'parameters'));
  chain(out,5);
  pair(out,6,label(['训练时','调整参数'],0,C.ink,62),label(['通常使用时','参数固定 · 状态更新'],0,C.tealInk,48));
  pair(out,7,umbrella() + label('红伞故事 · 一种状态',300,C.ink,46),umbrella(true) + label('蓝伞故事 · 另一种状态',270,C.ink,46));
  updateFlow(out,8);
  out.push(put(vector() + label(['一次次更新后','线索可能削弱或混合'],310,C.ink,52),9,'mixed'));
  out.push(put(vector() + g(qBadge(50),{x:290,y:-135}) + label('有路径 · 不保证永远记得',310,C.ink,50),10,'limits'));
  return scene('state',out);
}
function gates() {
  const out=[];
  chapter(out,0,knob(110),'保留多少 · 写入多少');
  out.push(put(knob(110) + label(['LSTM · 长短期记忆网络','专门的状态通道与可调的门'],300,C.ink,50),1,'lstm'));
  pair(out,2,knob(85) + label(['遗忘门','旧状态保留多少'],245,C.ink,50),knob(85) + label(['输入门','新内容写入多少'],245,C.ink,50));
  [0,.5,1].forEach((v,i)=>out.push(put(g(knob(75),{r:-90+180*v}) + label(fmt(v),190,C.tealInk,62),3,'coefficient.'+i,[240+360*i,300],[400,130+i*320])));
  numeric(out,4);
  out.push(put(label(['新状态 ＝','旧状态 × 保留系数','＋ 新写入量'],0,C.tealInk,62) + label('只说明乘加关系 · 非完整 LSTM',330,C.ink,44),5,'formula'));
  numeric(out,6);
  numeric(out,7);
  out.push(put(label('2 → 2',-115,C.tealInk,98) + label(['保留下的 1 ＋ 新写入的 1','数值相同 · 仍发生了更新'],140,C.ink,52),8,'same'));
  numeric(out,9,.9);
  pair(out,10,label(['保留系数 0.5','旧状态留下 1'],0,C.ink,52),label(['保留系数 0.9','旧状态留下 1.8'],0,C.tealInk,52));
  pair(out,11,vector() + label('保留的数值状态',310,C.ink,48),label(['输出门','调节当前输出'],0,C.ink,56));
  pair(out,12,label(['当前输入','先前状态'],0,C.ink,58),knob(100) + label('已学参数',255,C.ink,52));
  out.push(put(knob(110) + label(['门：数值调节的比喻','门值来自计算'],300,C.ink,52),13,'metaphor'));
  return scene('gates',out);
}
function fading() {
  const out=[];
  chapter(out,0,knob(100),'连续保留一半 · 影响逐渐衰减');
  E.decay(2,.5).forEach((v,i)=>{
    out.push(put(rect(-110,-80,220,160,{fill:i===0?C.blue:C.mint,r:14}) + label(fmt(v),0,C.ink,64),1,'value.'+i,[150+300*i,300],[400,120+230*i]));
    if(i<3) out.push(put(arrow([[-20,0],[20,0]],{sw:6,head:14}),1,'link.'+i,[300+300*i,300],[400,235+230*i,1,90]));
  });
  out.push(put(label('每步 ×0.5 · 没有新写入',0,C.tealInk,46),1,'rule',[600,590],[400,980]));
  out.push(put(label('1 → 0.5 → 0.25',-95,C.tealInk,72) + label(['这是数值影响的衰减','不能换算成还记得多少故事'],165,C.ink,50),2,'scope'));
  return scene('fade',out);
}
const QUIZ=[
  {id:'color',question:'换成蓝伞后，现在带的伞是什么颜色？',answer:'蓝色，应随换伞更新记录',front:['换成蓝伞后','现在是什么颜色？'],back:'蓝色',reason:'换伞时更新颜色'},
  {id:'freeze',question:'永远保留第一次写下的红，还能答对吗？',answer:'不能，记得牢不等于永不改写',front:['永远保留红','还能答对吗？'],back:'不能',reason:'保留与改写都需要'},
  {id:'model',question:'便签答对，能证明真实 LSTM 一定答对吗？',answer:'不能，便签是人为规则，模型还受训练和任务限制',front:['便签练习答对','模型也一定对吗？'],back:'不能保证',reason:'仍需训练与检验'}
].map(q=>({...q,front:p=>label(q.front,p?-25:-45,C.ink,p?48:40) + label('点击核对',p?85:165,C.tealInk,36),
  back:p=>label(q.back,p?-40:-55,C.tealInk,p?64:54) + label(q.reason,p?55:100,C.ink,p?38:36)}));
function revised() {
  const out=[];
  chapter(out,0,umbrella(true),'该保留时保留 · 该改写时改写');
  pair(out,1,umbrella() + label('原来带红伞',300,C.ink,50),umbrella(true) + label('后来换蓝伞',270,C.ink,50));
  trace(out,2,{changed:true});
  out.push(put(knob(110) + label(['状态大小 · 数据 · 任务','仍会限制模型效果'],300,C.ink,50),3,'limits'));
  out.push(put(vector() + label(['记忆：不断更新的数值状态','检查每步怎样保留与改写'],320,C.ink,50),4,'close'));
  return scene('revised',out);
}
module.exports=ctx=>[cover(ctx,umbrella() + g(qBadge(50),{x:235,y:-125}),'红伞能传到故事结尾吗'),opening(),notes(),states(),gates(),fading(),revised(),exercise(QUIZ),
  references(ctx,['〔1〕RNN · 官方文档','〔2〕LSTM · 官方文档','〔3〕遗忘门 · 原始论文'],'人为便签与乘加算例 · 不代表训练结果')];
module.exports.thumbnail=section=>{
  const icons=[g(umbrella(),{s:.65}),g(note('红'),{s:.7}),g(vector(),{s:.65}),knob(100),g(knob(100),{r:90}),g(umbrella(true),{s:.65})];
  return '<svg class="toc-thumb" viewBox="-230 -190 460 380" aria-hidden="true" focusable="false">'+(section.mark==='源'?magnifier(105):icons[section.num])+'</svg>';
};
