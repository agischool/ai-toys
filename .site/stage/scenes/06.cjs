'use strict';
/* 两路、分叉、相加与反向传递分别布线；所有数值来自 residual.cjs。 */
const { C, g, rect, circle, line, txt, arrow, pill, knob, qBadge, magnifier } = require('../art.cjs');
const { label, put, scene, chapter, cover, references, exercise } = require('../lesson.cjs');
const R = require('../residual.cjs');
const fmt = value => typeof value==='number' ? String(Number(value.toFixed(6))).replace('-','−') : value;
const plus = (r=50) => circle(0,0,r,{fill:C.mint}) + line(-r*.42,0,r*.42,0,{sw:6}) + line(0,-r*.42,0,r*.42,{sw:6});
function node(w,h,title,value,fill=C.white) {
  const size=typeof value==='number'||String(value).length<4?56:40;
  return rect(-w/2,-h/2,w,h,{fill,r:18}) + label(title,-h*.25,C.ink,36) + label(fmt(value),h*.23,C.ink,size);
}
function mini() {
  return arrow([[-270,0],[-170,0]],{sw:6,head:18}) + circle(-170,0,6,{fill:C.ink,sw:0}) +
    arrow([[-170,0],[-170,-145],[170,-145],[170,-60]],{stroke:C.teal,sw:6,head:18}) +
    arrow([[-170,0],[-110,0]],{sw:6,head:18}) + rect(-90,-65,180,130,{fill:C.blue}) + label('F',0,C.ink,68) +
    arrow([[105,0],[115,0]],{sw:6,head:12}) + g(plus(40),{x:170}) + arrow([[225,0],[290,0]],{sw:6,head:18}) +
    label('保留原值',-215,C.tealInk,48) + label('加上修正',190,C.ink,52);
}
function pair(out,step,a,b) {
  out.push(put(a,step,'left',[300,315],[400,235]));
  out.push(put(b,step,'right',[900,315],[400,725],{d:140}));
}
function route(out,step,{input='x',correction='F(x)',output='x＋F(x)',note='输出 ＝ 输入 ＋ F（输入）',delta=false,reverse=false}={}) {
  const flow=(points,teal=false)=>arrow(reverse?[...points].reverse():points,{stroke:teal?C.teal:C.ink,sw:6,head:18});
  const inTitle=reverse?'反向':delta?'输入变化':'输入', outTitle=reverse?'来自损失':delta?'输出变化':'输出';
  const fTitle=reverse?'F 分支':delta?'F 的变化':'F（输入）';
  const direct=reverse?'恒等路径':delta?'直通变化':'原值';
  const l = g(node(200,110,inTitle,input),{x:140,y:330}) + flow([[260,330],[340,330]]) + circle(340,330,6,{fill:C.ink,sw:0}) +
    flow([[340,330],[340,130],[890,130],[890,265]],true) + txt(610,70,reverse?direct:direct+' '+fmt(input),{size:46,fill:C.tealInk}) +
    flow([[340,330],[445,330]]) + g(node(250,160,fTitle,correction,C.blue),{x:600,y:330}) +
    flow([[745,330],[825,330]]) + g(plus(),{x:890,y:330}) + flow([[955,330],[995,330]]) +
    g(node(180,110,outTitle,output),{x:1100,y:330}) + txt(600,610,note,{size:50,fill:C.tealInk});
  const p = g(node(300,110,inTitle,input),{x:400,y:100}) + flow([[400,170],[400,250]]) + circle(400,250,6,{fill:C.ink,sw:0}) +
    flow([[400,250],[730,250],[730,720],[475,720]],true) + txt(600,420,direct,{size:46,fill:C.tealInk}) +
    (reverse?'':txt(600,500,fmt(input),{size:56,fill:C.tealInk})) + flow([[400,250],[250,250],[250,370]]) +
    g(node(300,180,fTitle,correction,C.blue),{x:250,y:480}) + flow([[250,590],[250,720],[325,720]]) +
    g(plus(55),{x:400,y:720}) + flow([[400,790],[400,825]]) + g(node(300,110,outTitle,output),{x:400,y:910});
  out.push(put(l,step,'route',[0,0],[0,0],{only:'l'}));
  out.push(put(p,step,'route',[0,0],[0,0],{only:'p'}));
}
const numericRoute = (out,step,result,note) => route(out,step,{...result,note});
function chain(out,step) {
  ['变换 1','变换 2','变换 3'].forEach((word,i)=>{
    out.push(put(rect(-140,-100,280,200,{fill:i===1?C.mint:C.blue}) + label(word,0,C.ink,54),step,'layer.'+i,[240+i*360,315],[400,180+i*310]));
    if(i<2) out.push(put(arrow([[0,0],[38,0]],{sw:6,head:16}),step,'link.'+i,[400+i*360,315],[400,325+i*310,1,90]));
  });
}
function vector(values,cell=110) {
  return values.map((v,i)=>rect((i-values.length/2)*cell,-cell/2,cell,cell,{fill:C.white,r:0,sw:4}) +
    txt((i-(values.length-1)/2)*cell,0,fmt(v),{size:52})).join('');
}
function sampleTable(rows) {
  const xs=[-235,0,235], names=['输入','F 的修正','输出'];
  return names.map((s,i)=>txt(xs[i],-190,s,{size:44})).join('') + rows.map((r,i)=>{
    const y=-60+i*135;
    return [r.input,r.correction,r.output].map((v,j)=>g(rect(-85,-45,170,90,{fill:j===1?C.blue:j===2?C.mint:C.white,r:12,sw:4}) + label(fmt(v),0,C.ink,58),{x:xs[j],y})).join('');
  }).join('');
}
function opening() {
  const out=[];
  pair(out,0,vector([3,0,0]) + label('上一层留下响应',200,C.ink,48),rect(-180,-120,360,240,{fill:C.blue}) + label('下一层继续处理',0,C.ink,46));
  chain(out,1);
  out.push(put(knob(100) + g(qBadge(58),{x:210,y:-110}) + label(['结构能做，不等于训练找得到','还要找到合适的参数'],285,C.ink,50),2,'training'));
  out.push(put(mini(),3,'residual'));
  out.push(put(mini() + label('先看主线 · 再看选读',325,C.tealInk,50),4,'reading-tip'));
  return scene('open',out);
}
function deep() {
  const out=[];
  chapter(out,0,knob(110) + g(qBadge(58),{x:210,y:-100}),'层数增加 · 训练仍可能更难');
  chain(out,1);
  out.push(put(knob(115) + label(['希望新加的计算保持原样','仍要找到合适参数'],295,C.ink,52),2,'identity'));
  out.push(put(label('ResNet · 2015',-175,C.tealInk,68) + label(['论文指定的实验中','有些更深的普通网络','训练错误也更高'],110,C.ink,48),3,'paper'));
  pair(out,4,label(['泛化问题','练习做好了','换题可能失灵'],0,C.ink,54),label(['退化问题','练习本身','也没做好'],0,C.ink,54));
  return scene('deep',out);
}
function residual() {
  const out=[];
  chapter(out,0,mini(),'原值保留下来 · 再加需要的修正');
  out.push(put(sampleTable(R.constant(1)),1,'targets',[600,315],[400,480]));
  out.push(put(pill(260,120,'输入 10',{fill:C.tealInk,size:58}),2,'direct.input',[180,315],[400,180]));
  out.push(put(rect(-160,-90,320,180,{fill:C.blue}) + label('直接变换',0,C.ink,52),2,'direct.function',[600,315],[400,500]));
  out.push(put(pill(260,120,'输出 11',{fill:C.tealInk,size:58}),2,'direct.output',[1020,315],[400,820]));
  [0,1].forEach(i=>out.push(put(arrow([[-35,0],[35,0]],{sw:6,head:18}),2,'direct.link.'+i,[375+i*450,315],[400,340+i*320,1,90])));
  numericRoute(out,3,R.constant(1)[0]);
  route(out,4);
  numericRoute(out,5,R.constant(1)[1]);
  out.push(put(sampleTable(R.constant(1)) + label('这三个样本都需要修正 1',320,C.tealInk,50),6,'corrections',[600,290],[400,450]));
  out.push(put(rect(-180,-120,360,240,{fill:C.blue}) + label('F：可学习的计算',0,C.ink,46) + g(knob(50),{x:245,y:20}) +
    label(['本例都需要 1','不表示 F 是一个固定数字'],285,C.ink,50),7,'function'));
  numericRoute(out,8,R.constant(0)[0],'修正为 0，原值便保持不变');
  pair(out,9,label(['残差','目标变换相对输入','需要补上的差别'],0,C.ink,50),label(['损失','评价预测','错得有多远'],0,C.ink,50));
  out.push(put(mini() + label(['这里比较的是计算路线','不代表训练已找到答案'],310,C.ink,50),10,'scope'));
  return scene('residual',out);
}
function matched(out,step) {
  const values=[R.inputs,[1,1,1],R.addMatching(R.inputs,[1,1,1])], names=['输入 · 1×3','修正 · 1×3','输出 · 1×3'];
  values.forEach((v,i)=>{
    out.push(put(vector(v,100) + label(names[i],-130,C.ink,44),step,'vector.'+i,[210+i*390,350],[400,180+i*320]));
    if(i<2) out.push(put(label(i===0?'＋':'＝',0,C.tealInk,64),step,'op.'+i,[405+i*390,350],[400,285+i*320]));
  });
}
function conditions() {
  const out=[];
  chapter(out,0,mini(),'两路都要计算 · 结果仍要检查');
  numericRoute(out,1,R.constant(1)[0],'F 照常计算，两路共同参与');
  matched(out,2);
  pair(out,3,vector(R.inputs,115) + label('三个位置',210,C.ink,48),vector([1,1],115) + label(['这里只有两个位置','先匹配形状，再逐位相加'],210,C.ink,46));
  out.push(put(label('ResNet · 原始论文',-160,C.tealInk,64) + label(['实际实验展示了改善','结论有指定条件'],125,C.ink,58),4,'evidence'));
  out.push(put(label(['结构 · 数据 · 参数初始值','更新方法 · 计算预算'],0,C.ink,56) + label('加上残差，不保证所有任务更好',250,C.tealInk,50),5,'limits'));
  out.push(put(label('＋1    0    −1',-80,C.tealInk,88) + label(['修正可以为正、为负或为 0','接下来选读：两路怎样传递变化'],180,C.ink,50),6,'signs'));
  return scene('conditions',out);
}
const QUIZ=[
  {id:'keep',question:'输入 10、20、30，输出保持原样，F 应给多少？',answer:'修正分别为 0、0、0',front:['输出保持原样','F 应给多少？'],back:R.constant(0).map(r=>r.correction).join('、'),reason:['输入加 0','保持原样']},
  {id:'less',question:'输入 10、20、30，输出各少 1，F 应给多少？',answer:'修正分别为负 1、负 1、负 1',front:['输出都少 1','F 应给多少？'],back:R.constant(-1).map(r=>fmt(r.correction)).join('、'),reason:['输入减 1','得到目标']},
  {id:'branch',question:'如果修正为零，就删掉 F 分支吗？',answer:'两路仍然计算，改变的是 F 要学的修正',front:['修正为 0','能删掉 F 吗？'],back:'F 仍然保留',reason:['修正可正、可负','也可以为 0']}
].map(q=>({...q,
  front:p=>label(q.front,p?-25:-45,C.ink,p?48:40) + label('点击核对',p?85:165,C.tealInk,36),
  back:p=>label(q.back,p?-40:-55,C.tealInk,p?62:44) + label(p?q.reason.join('，'):q.reason,p?55:100,C.ink,p?38:36)
}));
function changes() {
  const out=[];
  chapter(out,0,mini(),'选读 · 变化量也会走两路');
  numericRoute(out,1,R.point(2),'本节约定：F（输入）＝ 输入 × 0.5');
  numericRoute(out,2,R.point(2.1),'本节约定：F（输入）＝ 输入 × 0.5');
  const change=R.change(2,.1);
  [3,4].forEach(step=>route(out,step,{input:change.deltaInput,correction:change.deltaF,output:change.deltaOutput,delta:true,note:'0.1 ＋ 0.05 ＝ 0.15'}));
  out.push(put(label('1 ＋ 0.5 ＝ '+fmt(change.rate),-80,C.tealInk,78) + label(['这个线性例子的变化率','等于两路变化率相加'],180,C.ink,54),5,'rates'));
  [6,7].forEach(step=>route(out,step,{input:'两路汇合',correction:'计入 F 影响',output:'传回影响',reverse:true,note:step===6?'从损失往前看，两路贡献都计入':'恒等路径：原样传递输入的路径'}));
  out.push(put(mini() + g(qBadge(55),{x:280,y:-190}) + label('不保证梯度永远合适',315,C.ink,54),8,'gradient-limit'));
  route(out,9,{input:'x',correction:'−x',output:0,note:'F（输入）＝ −输入，两路正好抵消'});
  pair(out,10,label(['梯度困难','过小或过大'],0,C.ink,58),label(['退化问题','训练错误反而更高'],0,C.ink,54));
  return scene('changes',out);
}
module.exports=ctx=>[
  cover(ctx,mini() + g(qBadge(52),{x:260,y:-175}),'多一层，就一定更好吗'),
  opening(),deep(),residual(),conditions(),exercise(QUIZ),changes(),
  references(ctx,['〔1〕ResNet · 原始论文','〔2〕恒等映射 · 原始论文'],'两路算例用于说明原理，不代表训练结果')
];
module.exports.thumbnail=section=>{
  const icons=[g(mini(),{s:.62}),knob(110),g(mini(),{s:.62}),g(plus(95)),g(mini(),{s:.62})];
  return '<svg class="toc-thumb" viewBox="-230 -190 460 380" aria-hidden="true" focusable="false">' +
    (section.mark==='源'?magnifier(105):icons[section.num])+'</svg>';
};
