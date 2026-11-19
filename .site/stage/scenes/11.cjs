'use strict';
const {C,g,rect,circle,line,txt,arrow,knob,qBadge,magnifier}=require('../art.cjs');
const {label,put,scene,chapter,cover,references,exercise}=require('../lesson.cjs');
const E=require('../storage.cjs');
const D=E.demonstration();
const box=(word,w=340,h=130,fill=C.blue,size=50)=>rect(-w/2,-h/2,w,h,{fill,r:14})+label(word,0,C.ink,size);
function pair(out,step,a,b) {
  out.push(put(a,step,'left',[300,280],[400,190]));
  out.push(put(b,step,'right',[900,280],[400,665],{d:140}));
}
function book(values=['红','蓝','黄'],compact=false) {
  const h=compact?340:480,top=compact?-105:-140,gap=compact?105:145;
  return rect(-215,-h/2,430,h,{fill:C.white,r:20})+line(-155,-h/2+20,-155,h/2-20,{sw:5,stroke:C.coral})+
    values.map((word,i)=>txt(-100,top+i*gap,i+1,{size:46})+g(box(word,225,compact?80:100,word==='绿'?C.mint:C.blue,58),{x:60,y:top+i*gap})).join('');
}
function cells(values,portrait=false,selected=0) {
  return values.map((value,i)=>{
    const w=portrait?126:170,x=(i-2)*(portrait?150:205);
    return g(label(i+1,-110,C.ink,46)+rect(-w/2,-65,w,130,{fill:i+1===selected?C.mint:value===null?C.white:C.blue,r:12,stroke:i+1===selected?C.tealInk:C.ink,sw:i+1===selected?8:5})+
      label(value===null?'空':value,0,value===null?C.muted:C.ink,portrait?50:58),{x});
  }).join('');
}
function memory(out,step,values,{selected=0,request='',result=null,note=''}={}) {
  out.push(put(cells(values,false,selected),step,'cells',[600,260],[0,0],{only:'l'}));
  out.push(put(cells(values,true,selected),step,'cells',[0,0],[400,290],{only:'p'}));
  if(request) out.push(put(label(request,0,C.ink,48),step,'request',[600,65],[400,75]));
  if(result!==null) {
    const x=600+(selected-3)*205,px=400+(selected-3)*150;
    out.push(put(arrow([[x,350],[x,405],[600,405],[600,450]],{sw:6,head:18}),step,'read',[0,0],[0,0],{only:'l'}));
    out.push(put(arrow([[px,385],[px,485],[400,485],[400,565]],{sw:6,head:18}),step,'read',[0,0],[0,0],{only:'p'}));
    out.push(put(box('读出：'+result,430,120,C.mint,56),step,'result',[600,530],[400,670]));
  }
  if(note) out.push(put(label(note,0,C.tealInk,44),step,'note',[600,665],[400,925]));
}
function route(out,step,words,note='',connect=true) {
  words.forEach((word,i)=>{
    out.push(put(box(word,310,150,i===words.length-1?C.mint:C.blue,46),step,'part.'+i,[210+i*390,265],[400,120+i*340]));
    if(connect && i<words.length-1) {
      out.push(put(arrow([[0,0],[40,0]],{sw:6,head:16}),step,'link.'+i,[385+i*390,265],[0,0],{only:'l'}));
      out.push(put(arrow([[0,0],[0,130]],{sw:6,head:18}),step,'link.'+i,[0,0],[400,220+i*340],{only:'p'}));
    }
  });
  if(note) out.push(put(label(note,0,C.tealInk,44),step,'scope',[600,595],[400,960]));
}
function roles(out,step) {
  [['模型参数','通常使用时不变'],['内部状态','承接当前信息'],['外部存储','按位置或内容查找']].forEach(([title,note],i)=>{
    out.push(put(box(title,330,150,i===2?C.mint:C.blue,50)+label(note,180,C.tealInk,40),step,'role.'+i,[210+i*390,255],[400,100+i*305]));
  });
}
function controller(out,step) {
  const l=box('控制器',320,160,C.blue,58)+g(box('记忆矩阵',350,220,C.mint,54),{x:700})+
    arrow([[190,-45],[490,-45]],{sw:6,head:18})+txt(340,-100,'安排写入',{size:42,fill:C.tealInk})+
    arrow([[490,65],[190,65]],{sw:6,head:18})+txt(340,125,'读取结果',{size:42,fill:C.tealInk})+
    label('输入与内部状态',-185,C.ink,42)+txt(350,330,'可训练的读写安排 · 此处只画结构',{size:44});
  const p=box('控制器',430,160,C.blue,58)+g(box('记忆矩阵',500,190,C.mint,54),{y:570})+
    arrow([[-100,110],[-100,440]],{sw:6,head:18})+txt(-215,280,['安排','写入'],{size:42,fill:C.tealInk})+
    arrow([[100,440],[100,110]],{sw:6,head:18})+txt(220,280,['读取','结果'],{size:42,fill:C.tealInk})+
    label('输入与内部状态',-170,C.ink,44)+label('只画结构 · 没有训练 NTM',760,C.ink,42);
  out.push(put(l,step,'loop',[250,280],[0,0],{only:'l'}));
  out.push(put(p,step,'loop',[0,0],[400,180],{only:'p'}));
}
function weighted(out,step,showResult=false) {
  const r=E.weightedRead();
  r.values.forEach((n,i)=>{
    const art=label('位置 '+(i+1),-110,C.ink,46)+box(n,260,140,i?C.peach:C.blue,76)+label('× '+r.weights[i],150,C.ink,58)+
      (showResult?label(r.products[i],280,C.tealInk,66):'');
    out.push(put(art,step,'value.'+i,[320+i*560,220],[200+i*400,200]));
  });
  if(showResult) {
    out.push(put(arrow([[320,545],[320,570],[515,570]],{sw:6,head:16})+arrow([[880,545],[880,570],[685,570]],{sw:6,head:16}),step,'join',[0,0],[0,0],{only:'l'}));
    out.push(put(arrow([[200,545],[200,620],[340,700]],{sw:6,head:18})+arrow([[600,545],[600,620],[460,700]],{sw:6,head:18}),step,'join',[0,0],[0,0],{only:'p'}));
    out.push(put(label(r.products.join(' ＋ ')+' ＝ '+r.result,0,C.tealInk,66),step,'result',[600,655],[400,840]));
  } else out.push(put(label('连续读取权重 · 相加为 1',0,C.tealInk,46),step,'scope',[600,580],[400,790]));
}
function opening() {
  const out=[];
  out.push(put(book()+label('第二个是什么？',365,C.tealInk,56),0,'ask',[600,290],[400,350]));
  pair(out,1,book(undefined,true)+label('另设存储区',245,C.tealInk,50),qBadge(85)+label(['写错或读错位置','仍然会答错'],245,C.ink,48));
  pair(out,2,box('前篇：接出下一片',530,150,C.blue,44),book(undefined,true)+label('本篇：另外留一份记录',290,C.tealInk,44));
  route(out,3,['写入','定位与读取','更新'], '存储变大 · 仍须安排各项操作');
  pair(out,4,book(undefined,true)+label('先看五格的读写',245,C.ink,50),box('加权组合',460,180,C.mint,58)+label('再看连续权重',240,C.tealInk,50));
  return scene('open',out);
}
function types() {
  const out=[];
  chapter(out,0,book(),'参数 · 状态 · 存储，作用不同');
  out.push(put(knob(120)+label(['模型参数','通常使用时保持不变'],300,C.tealInk,52),1,'parameters',[600,285],[400,400]));
  pair(out,2,box('控制器',430,160,C.blue,58)+label('根据输入安排读写',235,C.ink,46),box('内部状态',430,160,C.mint,58)+label('承接任务中的当前信息',235,C.tealInk,44));
  out.push(put(book()+label(['外部：相对于控制网络','不一定联网或在另一台电脑'],365,C.tealInk,44),3,'external',[600,280],[400,350]));
  roles(out,4);
  return scene('types',out);
}
function store() {
  const out=[];
  chapter(out,0,book(),['格号是地址','颜色词是内容标签']);
  memory(out,1,D.empty,{note:'五格从空开始'});
  memory(out,2,D.red,{selected:1,request:'写第 1 格：红'});
  memory(out,3,D.blue,{selected:2,request:'写第 2 格：蓝'});
  memory(out,4,D.written,{selected:3,request:'写第 3 格：黄',note:'标签示意 · 实际可以用编码保存'});
  memory(out,5,D.written,{selected:2,request:'第一次读取：第 2 格',result:D.first});
  memory(out,6,D.written,{selected:2,request:'读出蓝后，五格内容不变',note:'读取不会拿走该格内容'});
  memory(out,7,D.overwritten,{selected:2,request:'覆盖第 2 格：蓝 → 绿',note:'地址仍是 2 · 旧蓝已不在该格'});
  memory(out,8,D.overwritten,{selected:2,request:'第二次读取：仍是第 2 格',result:D.second});
  const recap=[['写入','红／蓝／黄'],['读 2','蓝'],['覆盖 2','蓝 → 绿'],['再读 2','绿']];
  recap.forEach(([name,value],i)=>{
    out.push(put(box(name,250,120,C.blue,46)+label(value,155,C.tealInk,46),9,'recap.'+i,[150+i*300,250],[0,0],{only:'l'}));
    out.push(put(box('',560,180,C.blue)+label(name,-45,C.ink,46)+label(value,45,C.tealInk,46),9,'recap.'+i,[0,0],[400,110+i*240],{only:'p'}));
    if(i<3) {
      out.push(put(arrow([[0,0],[26,0]],{sw:6,head:12}),9,'recap-link.'+i,[285+i*300,250],[0,0],{only:'l'}));
      out.push(put(arrow([[0,0],[0,30]],{sw:6,head:12}),9,'recap-link.'+i,[0,0],[400,220+i*240],{only:'p'}));
    }
  });
  pair(out,10,book(D.overwritten.slice(0,3),true)+label('这里按手写规则操作',245,C.ink,44),knob(105)+label(['学会安排读写','还需要训练'],270,C.tealInk,50));
  return scene('store',out);
}
function errors() {
  const out=[];
  chapter(out,0,qBadge(105),'内容还在 · 也可能没有找对');
  memory(out,1,D.overwritten,{selected:3,request:'要求读 2，却定位到 3',result:D.wrong,note:['绿仍在第 2 格','这次没有被取出']});
  pair(out,2,box('增加空格',460,150,C.white,56)+label('扩大容量',235,C.ink,50),qBadge(90)+label(['没有修正','定位到第 3 格的错误'],255,C.coralInk,44));
  memory(out,3,D.overwritten,{selected:2,request:'请求恢复最初的蓝',note:'仅凭当前五格 · 没有历史版本可查'});
  route(out,4,['存多少','怎样定位','怎样留历史'],'容量、定位与历史版本要分别设计',false);
  route(out,5,['何时保留','何时清空','允许写什么'],'可能只是一次任务的临时工作区',false);
  return scene('errors',out);
}
function weights() {
  const out=[];
  chapter(out,0,box('NTM',410,180,C.blue,82),['从指定格号','到连续读写权重']);
  controller(out,1);
  pair(out,2,box('读：加权组合',530,150,C.mint,46)+label('组合各位置的向量',235,C.ink,44),box(['写：按权重','擦除与增加'],530,170,C.blue,46));
  route(out,3,['比较任务目标','计算参数影响','更新参数'],'读写安排需要训练');
  weighted(out,4);weighted(out,5,true);
  pair(out,6,box(E.weightedRead().result,260,170,C.mint,88)+label(['加权组合的结果','不是原来某一格的值'],250,C.tealInk,44),box('2 或 10',440,170,C.peach,64)+label(['若随机只抽中一格','才会取出某个原值'],250,C.ink,44));
  pair(out,7,box(['这次算式','只展示加权读取'],540,190,C.mint,44),box(['完整 NTM','计算权重与匹配','学习读写次序'],540,240,C.blue,42)+label('还须训练与检验',265,C.tealInk,44));
  return scene('weights',out);
}
function kinds() {
  const out=[];
  chapter(out,0,magnifier(115),['同叫记忆','技术与规则仍须分清']);
  route(out,1,['问题','检索资料','利用取回文字'],'RAG：文档库与生成模型结合');
  pair(out,2,box(['RAG','检索文档'],510,180,C.blue,52),box(['NTM','连续加权读写'],510,180,C.mint,48));
  pair(out,3,magnifier(95)+label(['联网搜索','核对及时性与可信度'],210,C.ink,46),book(undefined,true)+label(['产品记忆','另有保存与删除规则'],250,C.tealInk,44));
  route(out,4,['是否存下','是否找对','是否用对'],'分别核对内容、位置与使用方式');
  return scene('kinds',out);
}
const QUIZ=[
  {id:'third',front:['覆盖为绿后','先读第 3 格？'],back:D.requests[0].value,reason:'第 3 格没有被覆盖',answer:'先读第 3 格得到黄'},
  {id:'second',front:['再读第 2 格','会拿到什么？'],back:D.requests[1].value,reason:'第 2 格当前存的是绿',answer:'再读第 2 格得到绿'},
  {id:'history',front:['只用现有五格','能恢复最初的蓝吗？'],back:'不能',reason:'没有另存历史版本',answer:'不能仅靠当前五格恢复蓝'}
].map(q=>({...q,question:q.front.join(''),front:p=>label(q.front,p?-28:-45,C.ink,p?46:36)+label('点击核对',p?85:165,C.tealInk,36),
  back:p=>label(q.back,p?-42:-55,C.tealInk,p?68:64)+label(q.reason,p?55:110,C.ink,p?36:29)}));
function task() {
  const out=[];
  chapter(out,0,book(['红','绿','黄']),'换请求卡 · 先检查当前五格');
  memory(out,1,D.overwritten,{request:'覆盖之后的当前存储',note:'先读 3，再读 2；再找最初的蓝'});
  pair(out,2,box('读取顺序',470,150,C.blue,56)+label('先 3 → 再 2',235,C.ink,50),box('历史版本',470,150,C.cream,56)+label('旧蓝没有被另存',235,C.tealInk,46));
  return scene('task',out);
}
module.exports=ctx=>[cover(ctx,g(book(),{s:.85,y:-70}),'保存后，还要找对'),opening(),types(),store(),errors(),weights(),kinds(),task(),exercise(QUIZ),
  references(ctx,['〔1〕神经图灵机 · 原始论文','〔2〕检索增强生成 · 原始论文'],'手写读写与加权示意 · 不是模型测评')];
module.exports.thumbnail=section=>{
  const icons=[g(book(),{s:.65}),g(knob(95),{s:1.1}),g(book(),{s:.65}),g(qBadge(100),{s:1.1}),g(box('2 × 0.75',390,130,C.mint,54),{s:.9}),magnifier(110),g(book(['红','绿','黄']),{s:.65})];
  return '<svg class="toc-thumb" viewBox="-230 -190 460 380" aria-hidden="true" focusable="false">'+(section.mark==='源'?magnifier(105):icons[section.num])+'</svg>';
};
