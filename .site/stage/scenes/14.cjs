'use strict';
const {C,g,rect,circle,line,txt,arrow,qBadge,magnifier}=require('../art.cjs');
const {label,put,scene,chapter,cover,references,exercise}=require('../lesson.cjs');
const E=require('../relations.cjs'),A=E.arrangements;
const box=(word,w=520,h=190,fill=C.blue,size=50)=>rect(-w/2,-h/2,w,h,{fill,r:14})+label(word,0,C.ink,size);
const name=id=>E.objects.find(o=>o.id===id).name;
function object(id,{names=true,selected=false}={}) {
  const art=id==='red'?circle(0,0,65,{fill:C.coral}):id==='blue'?rect(-70,-70,140,140,{fill:C.blue,r:5}):'<polygon points="0,-80 78,65 -78,65" fill="'+C.mint+'" stroke="'+C.ink+'" stroke-width="6" stroke-linejoin="round"/>';
  return (selected?rect(-100,-110,200,220,{fill:'none',stroke:C.tealInk,sw:6,r:16}):'')+art+(names?label(name(id),140,C.ink,46):'');
}
function objects(order,{spacing=350,names=true,selected=null}={}) {return order.map((id,i)=>g(object(id,{names,selected:id===selected}),{x:(i-1)*spacing})).join('');}
function note(out,step,text) {out.push(put(label(text,0,C.tealInk,44),step,'scope',[600,675],[400,945]));}
function pair(out,step,a,b) {
  out.push(put(a,step,'left',[300,270],[400,220]));
  out.push(put(b,step,'right',[900,270],[400,680],{d:140}));
}
function trio(out,step,words,noteText='') {
  words.forEach((word,i)=>out.push(put(box(word,320,150,i===2?C.mint:C.blue,46),step,'item.'+i,[210+i*390,270],[400,120+i*335])));
  if(noteText)note(out,step,noteText);
}
function row(out,step,order,{y=270,py=340,n='objects',selected=null,names=true,title='',result=null,spacing=350,pspacing=260}={}) {
  out.push(put(objects(order,{spacing,names,selected}),step,n,[600,y],[0,0],{only:'l'}));
  out.push(put(objects(order,{spacing:pspacing,names,selected}),step,n,[0,0],[400,py],{only:'p'}));
  if(title)out.push(put(label(title,0,C.ink,46),step,n+'.title',[600,y-170],[400,py-185]));
  if(result!==null)out.push(put(box(result,650,115,C.mint,52),step,n+'.result',[600,y+260],[400,py+280]));
}
function compare(out,step) {
  row(out,step,A.first,{y:200,py:240,n:'before',names:false,title:'交换前 · 蓝方左侧 '+E.count(A.first,'blue')+' 个'});
  row(out,step,A.swapped,{y:520,py:690,n:'after',names:false,title:'交换后 · 蓝方左侧 '+E.count(A.swapped,'blue')+' 个'});
  note(out,step,'形状与颜色相同 · 位置关系改变');
}
function inventory() {
  return rect(-250,-210,500,420,{fill:C.white,r:16})+label('清单（没有位置）',-150,C.ink,44)+E.objects.map((o,i)=>g(g(object(o.id,{names:false}),{s:.42,x:-165})+txt(20,0,o.name+' × 1',{size:46}),{y:-40+i*100})).join('');
}
function graph(out,step,order,{targetOnly=false}={}) {
  const all=E.edges(order).filter(e=>!targetOnly||e.to==='blue');
  for(const portrait of [false,true]) {
    const xs=portrait?[140,400,660]:[210,600,990],y=portrait?300:230;
    let art=label('',0);
    order.forEach((id,i)=>{art+=g(object(id,{names:false,selected:targetOnly&&id==='blue'}),{x:xs[i],y})+txt(xs[i],y-150,name(id),{size:46});});
    all.forEach(({from,to})=>{
      const i=order.indexOf(from),j=order.indexOf(to),color=targetOnly?C.tealInk:C.ink;
      const points=j-i===1?[[xs[i]+105,y],[xs[j]-105,y]]:[[xs[i],y+115],[xs[i],portrait?650:470],[xs[j],portrait?650:470],[xs[j],y+125]];
      art+=arrow(points,{stroke:color,sw:6,head:18});
    });
    art+=txt(portrait?400:600,portrait?820:610,targetOnly?'指向蓝方的左关系：'+E.count(order,'blue')+' 条':'也包括不相邻的红圆 → 绿三角',{size:44,fill:C.tealInk});
    out.push(put(art,step,'edges',[0,0],[0,0],{only:portrait?'p':'l'}));
  }
  out.push(put(label(targetOnly?'只画指向蓝方的左关系':'甲 → 乙：甲在乙左边',0,C.ink,44),step,'meaning',[600,25],[400,30]));
}
function directionArt(reverse=false) {
  return g(object('red',{names:false}),{x:-140,s:.78})+g(object('blue',{names:false}),{x:140,s:.78})+arrow(reverse?[[65,0],[-65,0]]:[[-65,0],[65,0]],{sw:6,head:18,stroke:reverse?C.coralInk:C.tealInk})+
    txt(-140,120,'红圆',{size:44})+txt(140,120,'蓝方',{size:44})+label(reverse?'不成立':'成立',235,reverse?C.coralInk:C.tealInk,56);
}
function coordinates(out,step) {
  row(out,step,A.first,{py:280,title:'示意横坐标 · 不表示厘米'});
  E.positions(A.first).forEach((o,i)=>out.push(put(label('x = '+o.x,0,C.ink,48),step,'coordinate.'+o.id,[250+i*350,525],[140+i*260,600])));
  note(out,step,['也可以比较坐标大小','图示不等于所有 AI 的内部形态']);
}
function network(out,step,manual=false) {
  const rows=manual?E.comparisons(A.swapped,'blue'):null;
  const words=manual?rows.map(r=>[name(r.id),'在左边？',(r.contributes?'是 · 1':'否 · 0')]):[['一组','对象对'],['另一组','对象对'],['更多组','对象对']];
  for(const portrait of [false,true]) {
    const xs=portrait?[140,400,660]:[210,600,990],center=portrait?400:600,y=portrait?350:250,h=portrait?240:210;
    let art=txt(center,portrait?60:30,manual?'问题：蓝方左边有几个？':'同一个问题信息',{size:46});
    xs.forEach((x,i)=>{
      art+=arrow([[center,portrait?125:80],[center,portrait?170:105],[x,portrait?170:105],[x,y-h/2-20]],{sw:5,head:15});
      art+=g(box(words[i],portrait?210:310,h,manual&&rows[i].contributes?C.mint:C.blue,46),{x,y});
      art+=arrow([[x,y+h/2+20],[x,portrait?620:430],[center,portrait?620:430],[center,portrait?665:465]],{sw:5,head:15});
    });
    art+=g(box(manual?'合计 '+rows.reduce((n,r)=>n+Number(r.contributes),0)+' 个':'汇总多组结果 · 产生回答',portrait?650:780,140,C.mint,48),{x:center,y:portrait?755:555});
    art+=txt(center,portrait?945:690,manual?'手工计数示意 · 没有训练论文模型':'结构示意 · 没有训练论文模型',{size:42,fill:C.tealInk});
    out.push(put(art,step,'network',[0,0],[0,0],{only:portrait?'p':'l'}));
  }
}
function regions() {
  let art=rect(-175,-175,350,350,{fill:C.white,r:10});
  for(let y=0;y<3;y++)for(let x=0;x<3;x++)art+=rect(-150+x*100,-150+y*100,100,100,{fill:x===1&&y===1?C.mint:C.blue,sw:3});
  return art+label('图像区域表示',270,C.ink,48);
}
function opening() {
  const out=[];
  row(out,0,A.first,{title:'颜色、形状都认对了'});note(out,0,'蓝方左边有几个物体？');
  pair(out,1,box(['上期','能完整还原原串'],530,220,C.blue,50),box(['本期','够不够回答眼前的问题'],550,220,C.mint,46));
  compare(out,2);
  return scene('open',out);
}
function arrange() {
  const out=[];
  chapter(out,0,g(objects(A.first,{spacing:230,names:false}),{s:.7}),'同一份清单 · 可以有不同答案');
  row(out,1,A.first,{title:'按图上的左右 · 不改变观察视角'});
  row(out,2,A.first,{selected:'blue',title:'哪个物体是蓝色的？',result:'答案：蓝方'});
  pair(out,3,g(object('blue'),{s:1.15}),box(['蓝色 · 方形','是单个对象的属性'],540,220,C.mint,48));
  row(out,4,A.first,{selected:'blue',title:'蓝方左边有几个？',result:'左边 '+E.count(A.first,'blue')+' 个：红圆'});
  row(out,5,A.swapped,{selected:'blue',title:'交换蓝方与绿三角',result:'左边 '+E.count(A.swapped,'blue')+' 个：红圆、绿三角'});
  compare(out,6);
  pair(out,7,inventory(),qBadge(85)+label(['只剩清单','分不清两种排列'],240,C.tealInk,46));
  pair(out,8,inventory(),box(['有没有蓝方：能回答','左边有几个：缺位置'],550,230,C.cream,44));
  note(out,8,'保存的信息 · 要由任务决定');
  return scene('arrange',out);
}
function relations() {
  const out=[];
  chapter(out,0,g(directionArt(),{s:.75}),'给关系画箭头 · 先说清含义');
  for(const portrait of [false,true]) {
    const x=portrait?400:600,y=portrait?350:260,gap=portrait?200:250;
    const art=g(circle(0,0,75,{fill:C.blue})+label('甲',0,C.ink,64),{x:x-gap,y})+g(circle(0,0,75,{fill:C.mint})+label('乙',0,C.ink,64),{x:x+gap,y})+arrow([[x-gap+105,y],[x+gap-105,y]],{sw:7,head:20});
    out.push(put(art,1,'meaning',[0,0],[0,0],{only:portrait?'p':'l'}));
  }
  note(out,1,['甲 → 乙：甲在乙左边','方向与含义 · 一起说清楚']);
  graph(out,2,A.first);graph(out,3,A.swapped,{targetOnly:true});
  out.push(put(directionArt(),4,'left',[300,270],[400,220]));
  out.push(put(directionArt(true),4,'right',[900,270],[400,590],{d:140}));
  note(out,4,'仍用第一种排列 · 方向不能颠倒');
  row(out,5,A.swapped,{selected:'blue',title:'换成问蓝方右边有几个？',result:'左侧 '+E.count(A.swapped,'blue')+' 个 · 右侧 '+E.count(A.swapped,'blue','right')+' 个'});
  coordinates(out,6);
  return scene('graph',out);
}
function model() {
  const out=[];chapter(out,0,magnifier(110),'把对象联系纳入计算');
  network(out,1);network(out,2,true);
  pair(out,3,box(['论文模块','学习的是数值运算'],540,220,C.blue,50),qBadge(85)+label(['中间结果未必写成','“左边”“右边”这些词'],245,C.ink,44));
  pair(out,4,regions(),box(['加入位置信息','后续计算学习有用关系'],550,220,C.mint,46));
  pair(out,5,box(['先从图中取得信息','可能漏掉蓝方'],550,220,C.cream,46),box(['再组合信息比较','也可能因此失效'],540,220,C.blue,48));
  pair(out,6,box(['关系网络','只是其中一种途径'],530,220,C.mint,50),qBadge(85)+label(['手工图示','没有复现论文模型'],245,C.ink,46));
  return scene('model',out);
}
function evidence() {
  const out=[];chapter(out,0,magnifier(110),'答对一个关系题 · 说明多少？');
  trio(out,1,['视觉问答','文字问答','物理系统'],['特定任务的证据','不能推出全部生活中的关系理解']);
  pair(out,2,box(['哪个最近？','需要距离信息'],530,220,C.blue,50),box(['为什么被挪？','需要动作与原因证据'],550,220,C.cream,46));
  trio(out,3,['物体数目','排列','问题'],'变化之后 · 仍要检查答案依据');
  row(out,4,A.first,{selected:'blue',title:'对象认对了 · 关系也处理对了吗？',result:'蓝方左边：'+E.count(A.first,'blue')+' 个'});
  return scene('evidence',out);
}
const CARDS=[
  {id:'distance',question:'仅靠左右顺序能确定厘米距离吗？',answer:'不能',front:p=>label(['只知道左右顺序','能确定厘米距离吗？'],p?-25:-40,C.ink,p?46:34)+label('点击核对',p?90:165,C.tealInk,36),back:p=>label('不能',p?-30:-50,C.ink,p?68:60)+label('顺序不提供厘米尺度',p?65:110,C.tealInk,p?42:32)},
  {id:'missing',question:'要回答相距几厘米，还缺什么？',answer:'带单位的距离信息',front:p=>label(['要回答相距几厘米','还缺什么？'],p?-25:-40,C.ink,p?46:34)+label('点击核对',p?90:165,C.tealInk,36),back:p=>label(['带单位的','距离信息'],p?-10:-30,C.ink,p?52:44)},
  {id:'count',question:'这能只归为数错了吗？',answer:'不能，缺少必要信息',front:p=>label(['这能只归为','“数错了”吗？'],p?-25:-40,C.ink,p?46:34)+label('点击核对',p?90:165,C.tealInk,36),back:p=>label('不能',p?-30:-50,C.ink,p?68:60)+label('缺少必要信息',p?65:110,C.tealInk,p?44:36)}
];
function challenge() {
  const out=[];chapter(out,0,qBadge(110),'换个问题 · 检查表示够不够用');
  row(out,1,A.swapped,{selected:'green',title:'绿三角右边有几个物体？',result:'右边 '+E.count(A.swapped,'green','right')+' 个：蓝方'});
  row(out,2,A.swapped,{title:'绿三角与蓝方相距几厘米？'});note(out,2,'仅凭这份左右顺序 · 能回答吗？');
  row(out,3,A.swapped,{y:200,py:240,n:'near',names:false,spacing:220,pspacing:180,title:'可以摆得近一些'});
  row(out,3,A.swapped,{y:520,py:690,n:'far',names:false,spacing:390,pspacing:280,title:'也可以摆得远一些'});
  note(out,3,'顺序相同 · 距离可不同 · 图示无厘米尺度');
  pair(out,4,box(['还需补充','带单位的距离信息'],550,220,C.mint,48),qBadge(85)+label(['缺少信息','不能只归为“数错了”'],245,C.ink,44));
  return scene('challenge',out);
}
module.exports=ctx=>[cover(ctx,g(objects(A.first,{spacing:170,names:false}),{s:.95}),'认出对象 · 还要看关系'),opening(),arrange(),relations(),model(),evidence(),challenge(),exercise(CARDS),references(ctx,['〔1〕关系网络 · 原始论文'],'手工关系与计数示意 · 未训练论文模型')];
module.exports.thumbnail=section=>{
  const icons=[g(objects(A.first,{spacing:160,names:false}),{s:.9}),g(objects(A.swapped,{spacing:160,names:false}),{s:.9}),g(directionArt(),{s:.72,y:-60}),magnifier(105),magnifier(105),qBadge(105)];
  return '<svg class="toc-thumb" viewBox="-230 -190 460 380" aria-hidden="true" focusable="false">'+(section.mark==='源'?magnifier(105):icons[section.num])+'</svg>';
};
