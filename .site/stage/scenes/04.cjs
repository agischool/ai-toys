'use strict';
/* 输入、目标的摆位始终一致；旋钮只改变 b，预测和损失从同一算例计算。 */
const { C, g, rect, circle, line, txt, arrow, pill, knob, qBadge, person, magnifier } = require('../art.cjs');
const { label, put, scene, chapter, cover, references, exercise } = require('../lesson.cjs');
const E = require('../parameter.cjs');
const list = values => values.join('、');
const dial = (b, r = 90) => g(knob(r), { r: -90 + b * 45 }) + label('b ＝ ' + b, r + 75, C.tealInk, 56);
const formula = () => label('预测 ＝ 输入 ＋ b', 0, C.ink, 66);
function pair(out, step, a, b, portraitY = [240,730]) {
  out.push(put(a,step,'left',[300,320],[400,portraitY[0]]));
  out.push(put(b,step,'right',[900,320],[400,portraitY[1]],{d:140}));
}
function samples() {
  return rect(-270,-235,540,470,{fill:C.white}) + txt(-125,-160,'输入',{size:48}) + txt(125,-160,'目标',{size:48}) +
    E.inputs.map((x,i) => txt(-125,-50+i*100,x,{size:64}) + txt(125,-50+i*100,E.targets[i],{size:64,fill:C.tealInk})).join('');
}
function table(result, changed = false) {
  const xs = [-225,-75,75,225], names = ['输入','预测','目标','差距'];
  return rect(-340,-225,680,445,{fill:C.white}) + names.map((n,i) => txt(xs[i],-170,n,{size:44})).join('') +
    result.rows.map((row,i) => {
      const y = -70 + i * 110;
      return rect(xs[0]-56,y-40,112,80,{fill:C.blue,r:10,sw:0}) + rect(xs[2]-56,y-40,112,80,{fill:changed?C.peach:C.mint,r:10,sw:0}) +
        [row.input,row.prediction,row.target,row.error].map((v,j) => txt(xs[j],y,v,{size:54,fill:j===1?C.tealInk:C.ink})).join('');
    }).join('');
}
function showTrial(out,step,b,{changed=false}={}) {
  const result = E.trial(b,changed?E.inputs:E.targets);
  out.push(put(dial(b),step,'parameter',[190,300],[400,120]));
  out.push(put(table(result,changed),step,'table',[800,300],[400,590]));
  out.push(put(pill(540,80,(changed?'换目标后：':'总绝对误差 ＝ ') + result.loss,{fill:changed?C.coralInk:C.tealInk,size:48}),step,'loss',[800,625],[400,940]));
}
function overview(out,step,bs=[0,1,2]) {
  bs.forEach((b,i) => out.push(put(rect(-160,-150,320,300,{fill:b===2?C.mint:C.white}) + label('b ＝ ' + b,-105,C.ink,48) +
    g(knob(50),{y:-15,r:-90+b*45}) + label('损失 ' + E.trial(b).loss,105,C.tealInk,56),step,'trial.'+b,
    [230+i*370,330],[400,190+i*315])));
}
function graph() {
  const bs=[0,1,2,3], xs=[-270,-90,90,270], ys=bs.map(b=>160-E.trial(b).loss*50);
  return arrow([[-340,220],[340,220]],{sw:5,head:18}) + label('b 的取值',315,C.ink,44) +
    line(xs[0],ys[0],xs[1],ys[1],{stroke:C.teal,sw:8}) + line(xs[1],ys[1],xs[2],ys[2],{stroke:C.teal,sw:8}) + line(xs[2],ys[2],xs[3],ys[3],{stroke:C.coral,sw:8}) +
    bs.map((b,i) => circle(xs[i],ys[i],13,{fill:b===2?C.teal:C.coral,sw:4}) + txt(xs[i],ys[i]-90,'损失'+E.trial(b).loss,{size:44}) + txt(xs[i],265,b,{size:48})).join('');
}
function opening() {
  const out=[];
  out.push(put(dial(0,110) + g(qBadge(55),{x:220,y:-100}) + label('错了以后，改哪里？',300,C.ink,54),0,'question'));
  out.push(put(formula() + label('先只留一个可调参数',160),1,'one-parameter'));
  pair(out,2,label(['输入固定','1、2、3'],0,C.ink,60),label(['目标固定','3、4、5'],0,C.tealInk,60));
  return scene('open',out);
}
function model() {
  const out=[];
  chapter(out,0,dial(0,100),'把可调的位置留给 b');
  out.push(put(samples(),1,'samples',[600,320],[400,450]));
  out.push(put(samples() + label('先不直接告诉模型「加 2」',320,C.tealInk,48),2,'not-answer',[600,300],[400,400]));
  out.push(put(formula() + label('先选定计算形式',175),3,'formula'));
  out.push(put(dial(0,120) + label('统一加多少',320,C.ink,54),4,'dial'));
  pair(out,5,label(['三个输入','共用同一个 b'],0,C.ink,60),dial(1,100));
  out.push(put(formula() + g(person(),{x:-250,y:160,s:.8}) + txt(100,265,['人选形式','训练找参数'],{size:48}),6,'design'));
  showTrial(out,7,0);
  pair(out,8,label(['预测','1、2、3'],0,C.ink,64),label(['目标','3、4、5'],0,C.tealInk,64));
  showTrial(out,9,0);
  return scene('model',out);
}
function loss() {
  const out=[];
  chapter(out,0,g(graph(),{s:.8,y:-20}),'给差距一个可比较的数');
  showTrial(out,1,0);
  out.push(put(label(['先算逐题差距','不计正负，再相加'],0,C.ink,62),2,'definition'));
  pair(out,3,label(['预测 1 · 目标 3','差距 2'],0,C.ink,56),label(['预测 5 · 目标 3','差距也是 2'],0,C.ink,56));
  out.push(put(label('绝对误差：只计距离',0,C.tealInk,64),4,'absolute'));
  out.push(put(label(['2 ＋ 2 ＋ 2 ＝ 6','本例选总绝对误差作为损失'],0,C.ink,58),5,'sum'));
  out.push(put(label(['比较之前先约定算法','还可以用平均误差、平方误差'],0,C.ink,54),6,'choices'));
  showTrial(out,7,0);
  showTrial(out,8,1);
  showTrial(out,9,1);
  showTrial(out,10,2);
  overview(out,11);
  pair(out,12,label(['输入仍是','1、2、3'],0,C.ink,60),label(['目标仍是','3、4、5'],0,C.tealInk,60));
  out.push(put(dial(2,110) + label('改的是参数，不是目标',300,C.tealInk,54),13,'unchanged-goals'));
  out.push(put(graph(),14,'v-curve',[600,295],[400,430]));
  showTrial(out,15,0,{changed:true});
  out.push(put(label(['损失是 0','但比较标准已经换了'],0,C.coralInk,64),16,'moved-goals'));
  return scene('loss',out);
}
const b3=E.trial(3);
const QUIZ=[
  {id:'predictions',question:'b 等于 3 时，三个预测是多少？',answer:'预测是 '+list(b3.rows.map(r=>r.prediction)),front:['b ＝ 3','预测是多少？'],back:[list(b3.rows.map(r=>r.prediction)),'输入 ＋ 3']},
  {id:'errors',question:'b 等于 3 时，每题绝对误差是多少？',answer:'逐题误差是 '+list(b3.rows.map(r=>r.error)),front:['b ＝ 3','每题差多少？'],back:[list(b3.rows.map(r=>r.error)),'每题都比目标大 1']},
  {id:'sum',question:'b 等于 3 时，总绝对误差是多少？',answer:'总绝对误差为 '+b3.loss,front:['b ＝ 3','总损失是多少？'],back:['1＋1＋1＝'+b3.loss,'比 b＝2 时更大']}
].map(q=>({...q,front:portrait=>label(q.front,portrait?-25:-45,C.ink,portrait?48:44) + label('点击核对',portrait?85:165,C.tealInk,38),
  back:portrait=>label(q.back[0],portrait?-40:-50,C.tealInk,portrait?64:54) + label(q.back[1],portrait?55:95,C.ink,38)}));
function cycle(out,step) {
  const words=[['算预测','使用当前参数'],['作比较','对照固定目标'],['调参数','按选定方法']];
  words.forEach((s,i)=>out.push(put(rect(-130,-105,260,210,{fill:[C.blue,C.mint,C.cream][i]}) + label(s[0],-40,C.ink,52) + label(s[1],45,C.ink,38),step,'cycle.'+i,[250+i*350,310],[400,180+i*320])));
  [0,1].forEach(i=>{
    out.push(put(arrow([[0,0],[42,0]],{head:16,sw:6}),step,'flow.'+i,[405+i*350,310],[400,325+i*320,1,90]));
  });
  out.push(put(arrow([[950,440],[950,550],[250,550],[250,435]],{stroke:C.teal,sw:6,head:18}) + txt(600,605,'下一轮',{size:44,fill:C.tealInk}),step,'return',[0,0],[0,0],{only:'l'}));
  out.push(put(arrow([[550,820],[690,820],[690,180],[550,180]],{stroke:C.teal,sw:6,head:18}),step,'return',[0,0],[0,0],{only:'p'}));
}
function search() {
  const out=[];
  chapter(out,0,dial(2,100),'从手动试数 · 走向自动更新');
  overview(out,1);
  cycle(out,2);
  out.push(put(dial(1,110) + label(['梯度下降：常用方法之一','看变化反应，定方向与步长'],310,C.ink,48),3,'gradient'));
  out.push(put(arrow([[-260,-60],[-50,-60]],{stroke:C.teal,sw:9}) + arrow([[-260,120],[260,120]],{stroke:C.coral,sw:9}) +
    label('步长并非越大越好',-190,C.ink,58) + label('更新也不保证每步都降损失',285,C.ink,48),4,'steps'));
  cycle(out,5);
  out.push(put(label('新输入 4',-160,C.ink,62) + formula() + label('4 ＋ 2 ＝ '+E.predict(4,2),165,C.tealInk,78),6,'inference'));
  out.push(put(dial(2,110) + label(['沿用已经确定的参数','使用时没有再调整 b'],310,C.ink,50),7,'fixed'));
  return scene('search',out);
}
function chair() {
  return rect(-70,-90,140,110,{fill:C.blue,r:12}) + rect(-85,25,170,40,{fill:C.mint,r:8}) + line(-60,65,-60,155,{sw:8}) + line(60,65,60,155,{sw:8});
}
function bounds() {
  const out=[];
  chapter(out,0,pill(420,130,'损失 ＝ 0',{fill:C.tealInk,size:72}),'样本全对 · 仍有问题要问');
  out.push(put(pill(420,115,'本例恰好能配上',{fill:C.tealInk,size:48}) + label(['真实数据可能有误差','模型形式也可能不合适'],240,C.ink,56),1,'fit'));
  out.push(put(pill(360,115,'三个样本全对',{fill:C.tealInk,size:48}) + g(qBadge(62),{x:265,y:-95}) + label('新输入就一定对吗？',240,C.ink,58),2,'generalize'));
  pair(out,3,label(['输入 4','预测 6'],0,C.ink,70),qBadge(95) + label('与可靠实际结果比较',230,C.ink,46));
  out.push(put(label(['模型形式','样本与适用范围'],0,C.ink,64),4,'scope'));
  out.push(put(label(['绝对误差同样计数','偏大 1 与偏小 1，均记 1'],0,C.ink,56),5,'symmetric'));
  out.push(put(g(person(),{y:-60}) + label('现实中的错误，代价未必相同',300,C.ink,54),6,'costs'));
  pair(out,7,g(chair(),{x:-110}) + g(person(),{x:150,y:-30,s:.8}) + label(['少估座位','可能有人无座'],240,C.ink,48),
    chair() + label(['多估座位','可能留下空位'],240,C.ink,48),[200,670]);
  out.push(put(g(person(),{y:-65}) + label(['怎样权衡，由人决定','一个数字不代表全部要求'],295,C.ink,54),8,'people'));
  cycle(out,9);
  out.push(put(label(['什么算错','哪种错误更严重'],0,C.ink,64),10,'criteria'));
  out.push(put(dial(2,105) + label(['损失怎样变小的？','在哪些例子上变好了？'],315,C.tealInk,54),11,'closing'));
  return scene('bounds',out);
}
module.exports=ctx=>[
  cover(ctx,dial(2,135) + g(qBadge(52),{x:230,y:-130}),'答错后，究竟改哪里'),
  opening(),model(),loss(),exercise(QUIZ),search(),bounds(),
  references(ctx,['〔1〕模型形式 · Google 课程','〔2〕损失 · Google 课程','〔3〕梯度下降 · Google 课程','〔4〕步长 · Google 课程'],'固定样本的手动试数，用于说明原理')
];
module.exports.thumbnail=section=>{
  const icons=[knob(110),knob(110)+label('b',170,C.tealInk,60),g(graph(),{s:.48}),g(knob(95),{r:45}),qBadge(105)];
  return '<svg class="toc-thumb" viewBox="-230 -190 460 380" aria-hidden="true" focusable="false">' +
    (section.mark==='源'?magnifier(105):icons[section.num])+'</svg>';
};
