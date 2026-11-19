'use strict';
const {C,g,rect,circle,line,txt,arrow,knob,qBadge,magnifier}=require('../art.cjs');
const {label,put,scene,chapter,cover,references,exercise}=require('../lesson.cjs');
const E=require('../selection.cjs');
const box=(word,w=330,h=140,fill=C.blue,size=48)=>rect(-w/2,-h/2,w,h,{fill,r:14})+label(word,0,C.ink,size);
function pair(out,step,a,b) {
  out.push(put(a,step,'left',[300,280],[400,195]));
  out.push(put(b,step,'right',[900,280],[400,665],{d:140}));
}
function clock() {return circle(0,0,100,{fill:C.cream})+line(0,0,0,-65,{sw:9})+line(0,0,48,30,{sw:9});}
function choices() {
  return E.candidates.map((c,i)=>g(box(c.name+' · '+c.seconds+' 秒',420,105,i===2?C.cream:C.blue,48),{y:(i-1)*145})).join('');
}
function trio(out,step,words,{note='',connect=false}={}) {
  words.forEach((word,i)=>{
    out.push(put(box(word,320,150,i===2?C.mint:C.blue,46),step,'item.'+i,[210+i*390,270],[400,120+i*335]));
    if(connect && i<2) {
      out.push(put(arrow([[0,0],[38,0]],{sw:6,head:15}),step,'arrow.'+i,[388+i*390,270],[0,0],{only:'l'}));
      out.push(put(arrow([[0,0],[0,130]],{sw:6,head:18}),step,'arrow.'+i,[0,0],[400,220+i*335],{only:'p'}));
    }
  });
  if(note) out.push(put(label(note,0,C.tealInk,42),step,'scope',[600,610],[400,960]));
}
function table(out,step,{scenario=null,prefer=false,note='同一批 100 题 · 完全虚构方案'}={}) {
  const r=scenario?E.evaluate(E.scenarios[scenario]):null;
  if(r) out.push(put(label('成本≤'+r.limits.budget+'点 · 时间≤'+r.limits.seconds+'秒',0,C.ink,44),step,'limits',[600,65],[400,60]));
  E.candidates.forEach((c,i)=>{
    const row=r&&r.rows[i],fill=row?(row.feasible?C.mint:C.peach):C.blue;
    const status=row?(row.feasible?(prefer&&r.best===c.name?'可行 · 优先选':'可行'):row.failed):'虚构方案';
    const l=rect(-165,-190,330,380,{fill,r:14})+label(c.name,-120,C.ink,72)+label(c.correct+' 题',-20,C.ink,56)+label(c.seconds+' 秒',65,C.ink,50)+label(c.cost+' 点',145,C.ink,50)+
      (r?label(status,265,row.feasible?C.tealInk:C.coralInk,42):'');
    const p=rect(-345,-110,690,220,{fill,r:14})+txt(-265,0,c.name,{size:66})+txt(-65,-55,c.correct+'题',{size:46})+txt(170,-55,c.seconds+'秒',{size:46})+
      txt(-65,45,c.cost+'点',{size:46})+txt(170,45,status,{size:42,fill:row?(row.feasible?C.tealInk:C.coralInk):C.muted});
    out.push(put(l,step,'candidate.'+c.name,[210+i*390,330],[0,0],{only:'l'}));
    out.push(put(p,step,'candidate.'+c.name,[0,0],[400,230+i*290],{only:'p'}));
  });
  out.push(put(label(note,0,C.tealInk,40),step,'scope',[600,690],[400,990]));
}
function pipeline(out,step) {
  const schedule=E.forwardSchedule(),batch=['甲','乙','丙'],fills=[C.blue,C.mint,C.cream];
  let l=txt(660,35,'推进步（示意）',{size:42}),p=txt(400,40,'推进步（示意）',{size:42});
  for(let t=0;t<5;t++) {l+=txt(350+t*170,105,t+1,{size:44});p+=txt(210+t*130,135,t+1,{size:44});}
  schedule.forEach((row,s)=>{
    l+=txt(95,220+s*170,['设备 '+(s+1),'层段 '+(s+1)],{size:42});
    p+=txt(75,300+s*200,['设备 '+(s+1),'层段 '+(s+1)],{size:42});
    row.forEach((b,t)=>{
      const cell=(w,h)=>rect(-w/2,-h/2,w,h,{fill:b===null?C.white:fills[b],sw:3,r:8})+(b===null?'':label(batch[b],0,C.ink,48));
      l+=g(cell(140,120),{x:350+t*170,y:220+s*170});
      p+=g(cell(100,110),{x:210+t*130,y:300+s*200});
    });
  });
  l+=txt(650,675,'甲、乙、丙为小批次 · 仅画前向，省略反向与更新',{size:38,fill:C.tealInk});
  p+=txt(400,850,'甲、乙、丙为小批次',{size:44,fill:C.tealInk})+txt(400,950,'仅画前向 · 省略反向与更新',{size:42,fill:C.tealInk});
  out.push(put(l,step,'schedule',[0,0],[0,0],{only:'l'}));
  out.push(put(p,step,'schedule',[0,0],[0,0],{only:'p'}));
}
function researchComparison(out,step,accuracy=false) {
  E.research.models.forEach((m,i)=>{
    const art=rect(-265,-155,530,310,{fill:i?C.blue:C.mint,r:14})+label(m.name,-90,C.ink,48)+label('参数 '+m.parametersYi+' 亿',0,C.ink,46)+
      label(accuracy?m.accuracy.toFixed(1)+'%':m.training,95,accuracy?C.tealInk:C.ink,accuracy?62:40);
    out.push(put(art,step,'research.'+i,[300+i*600,270],[400,205+i*435]));
  });
  out.push(put(label(accuracy?['MMLU · 每题前 5 个示例','57 项任务平均准确率 · 表 6']:['近似相同训练计算预算','两者训练配置不同'],0,C.tealInk,44),step,'conditions',[600,610],[400,925]));
}
function opening() {
  const out=[];
  E.candidates.forEach((c,i)=>out.push(put(box(c.name+' · '+c.seconds+' 秒',320,150,C.blue,52),0,'speed.'+i,[210+i*390,270],[400,120+i*335])));
  out.push(put(label(['同一套题 · C 答对最多','就一定选它吗？'],0,C.tealInk,44),0,'question',[600,605],[400,950]));
  pair(out,1,clock()+label(['时限与费用','都会影响选择'],260,C.ink,48),magnifier(100)+label('还要看错的是哪些题',250,C.tealInk,44));
  pair(out,2,knob(100)+label('参数更多就更合适吗？',245,C.ink,44),qBadge(90)+label('先说清楚比较尺度',255,C.tealInk,48));
  pair(out,3,box(['参数 · 数据','计算量'],520,190,C.blue,52),box(['先算三方案','选读再看研究'],520,190,C.mint,50));
  return scene('open',out);
}
function scales() {
  const out=[];
  chapter(out,0,knob(115),'参数、数据、计算量要分清');
  trio(out,1,['收到题目','模型计算','给出答案'],{connect:true});
  out.push(put(knob(120)+label(['参数：可在练习中调整的数','参数量：这些数值的个数'],300,C.tealInk,46),2,'parameters',[600,275],[400,370]));
  trio(out,3,[['训练时处理的','token 数'],['数据覆盖','与质量'],'重复程度'],{note:'token 不一定等于一个字'});
  out.push(put(box('数值运算',530,180,C.blue,64)+label(['训练计算量','记录训练做了多少数值运算'],265,C.tealInk,46),4,'compute',[600,260],[400,350]));
  pair(out,5,knob(100)+label('增加参数',245,C.ink,52),box('更多训练数据',510,160,C.mint,50)+label('都要考虑计算预算',245,C.tealInk,44));
  return scene('scales',out);
}
function compare() {
  const out=[];
  chapter(out,0,choices(),'同题比较 · 再加资源条件');
  table(out,1);table(out,2,{note:'成本点不是真实价格'});table(out,3,{note:'A、B、C 不按参数量排序'});
  table(out,4,{scenario:'standard'});table(out,5,{scenario:'standard'});table(out,6,{scenario:'standard',prefer:true,note:'可行方案中 · 优先答对题数更多者'});
  table(out,7,{scenario:'fast',prefer:true,note:'预算不变 · 时限改成 2 秒'});
  pair(out,8,box(['3 点 · 5 秒','可行 A / B','优先选 B'],530,250,C.mint,48),box(['3 点 · 2 秒','只有 A 可行','选择 A'],530,250,C.blue,48));
  const d=E.delta();
  trio(out,9,['多答对 '+d.correct+' 题','多等 '+d.seconds+' 秒','多花 '+d.cost+' 点'],{note:'B → C · 仅在这组虚构成绩中'});
  pair(out,10,box('总成绩',430,150,C.blue,58),magnifier(100)+label(['多答对哪些题？','错误后果有多大？'],260,C.tealInk,46));
  trio(out,11,[['输入与输出','长度'],'硬件','并发请求'],{note:'真实等待时间会变化'});
  trio(out,12,[['尽量统一','比较条件'],['观察特别慢','的时候'],['固定数值','只属本例']]);
  return scene('compare',out);
}
function resources() {
  const out=[];
  chapter(out,0,clock(),'内存、电量与长期费用也要算');
  trio(out,1,['内存','电量','总费用'],{note:'硬件与运行方式也会影响表现'});
  pair(out,2,box(['训练一次','的成本'],500,200,C.blue,52),box(['长期服务','多次请求的成本'],530,200,C.mint,48));
  pipeline(out,3);
  pair(out,4,box(['GPipe','安排训练任务'],520,190,C.blue,50)+label('设备间传递也有代价',250,C.ink,44),qBadge(85)+label(['不保证聊天更快','不保证每个回答更准'],250,C.tealInk,44));
  pair(out,5,magnifier(105)+label(['接近用途的新例子','检索或人工复核'],265,C.ink,46),box(['平均占优','不等于各类都占优'],540,210,C.cream,46));
  trio(out,6,['什么任务','允许等多久','多少资源'],{note:'在质量、速度与资源限制间选方案'});
  return scene('resources',out);
}
const challengeResult=E.evaluate(E.scenarios.challenge);
const QUIZ=challengeResult.rows.map(c=>({
  id:c.name,question:'方案 '+c.name+' 满足新条件吗？',answer:'方案 '+c.name+' 不合格：'+c.failed.join('、'),
  front:p=>label(['方案 '+c.name,c.correct+'题 / '+c.seconds+'秒 / '+c.cost+'点','满足新条件吗？'],p?-25:-40,C.ink,p?44:34)+label('点击核对',p?88:165,C.tealInk,36),
  back:p=>label('不合格',p?-42:-55,C.coralInk,p?60:52)+label(c.failed,p?55:110,C.ink,p?42:34)
}));
function quiz() {
  const s=exercise(QUIZ);
  s.svg+=put(label('≤6点 · ≤5秒 · ≥91题',0,C.ink,38),0,'new-limits',[600,50],[400,22]);
  return s;
}
function challenge() {
  const out=[];
  chapter(out,0,qBadge(110),'同时满足全部条件 · 再作选择');
  trio(out,1,['成本≤6点','时间≤5秒','答对≥91题']);
  out.push(put(box('没有合格方案',700,200,C.cream,68)+label(['三项要求都保留','不能为了选出一个而放宽条件'],260,C.tealInk,46),2,'none',[600,270],[400,350]));
  return scene('challenge',out);
}
function research() {
  const out=[];
  chapter(out,0,box('训练投入',480,160,C.blue,60),['选读：训练规模','与语言预测表现']);
  trio(out,1,['参数量','数据量','训练计算量'],{note:'研究范围内 · 与预测损失有经验关系'});
  out.push(put(box('交叉熵损失',650,190,C.blue,62)+label('论文衡量语言预测表现的指标',270,C.tealInk,46),2,'metric',[600,260],[400,340]));
  pair(out,3,box(['真实下一 token','获分配的概率 ↑'],540,210,C.mint,48),box(['交叉熵损失','↓'],540,210,C.blue,58));
  pair(out,4,box('语言预测表现',530,160,C.mint,50),qBadge(90)+label(['不是诚实程度','也不是所有能力的总分'],255,C.ink,44));
  pair(out,5,box(['具体实验','估计资源收益'],520,190,C.blue,48),magnifier(100)+label(['数据、结构或任务变了','关系可能改变'],265,C.tealInk,44));
  researchComparison(out,6);researchComparison(out,7,true);researchComparison(out,8,true);
  pair(out,9,box(['特定训练配置','特定测试表现'],530,210,C.mint,50),qBadge(90)+label(['不能只凭参数量','推出小模型总会赢'],255,C.ink,46));
  return scene('research',out);
}
module.exports=ctx=>[cover(ctx,g(choices(),{s:.9,y:-60}),'先写清选择条件'),opening(),scales(),compare(),resources(),challenge(),quiz(),research(),
  references(ctx,['〔1〕缩放规律 · 原始论文','〔2〕Chinchilla · 研究论文','〔3〕GPipe · 原始论文'],'虚构算例与论文结果分开 · 保留研究条件')];
module.exports.thumbnail=section=>{
  const icons=[g(choices(),{s:.65}),g(knob(100),{s:1.1}),g(choices(),{s:.65}),clock(),qBadge(105),g(box('训练投入',390,140,C.blue,52),{s:.9})];
  return '<svg class="toc-thumb" viewBox="-230 -190 460 380" aria-hidden="true" focusable="false">'+(section.mark==='源'?magnifier(105):icons[section.num])+'</svg>';
};
