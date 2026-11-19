'use strict';
/* 第 12 篇：虚构方案的资源筛选；与文末论文结果分开保存，不能用来证明缩放规律。 */
const candidates=Object.freeze([
  Object.freeze({name:'A',correct:80,seconds:1,cost:1}),
  Object.freeze({name:'B',correct:90,seconds:4,cost:3}),
  Object.freeze({name:'C',correct:92,seconds:8,cost:6})
]);
const scenarios=Object.freeze({
  standard:Object.freeze({budget:3,seconds:5,minCorrect:0}),
  fast:Object.freeze({budget:3,seconds:2,minCorrect:0}),
  challenge:Object.freeze({budget:6,seconds:5,minCorrect:91})
});
function evaluate(limits=scenarios.standard) {
  if(!limits || !Number.isFinite(limits.budget) || limits.budget<0 || !Number.isFinite(limits.seconds) || limits.seconds<0 || !Number.isInteger(limits.minCorrect) || limits.minCorrect<0 || limits.minCorrect>100) throw new Error('条件须含非负有限预算、时限和 0—100 的整数题数');
  const rows=candidates.map(c=>{
    const withinCost=c.cost<=limits.budget,withinTime=c.seconds<=limits.seconds,enoughCorrect=c.correct>=limits.minCorrect;
    const failed=[...(!withinCost?['超预算']:[]),...(!withinTime?['超时']:[]),...(!enoughCorrect?['题数不足']:[])];
    return {...c,withinCost,withinTime,enoughCorrect,failed,feasible:!failed.length};
  });
  const feasible=rows.filter(r=>r.feasible);
  const best=feasible.reduce((a,b)=>!a||b.correct>a.correct?b:a,null);
  return {limits:{...limits},rows,feasible:feasible.map(r=>r.name),best:best?best.name:null};
}
function delta(from='B',to='C') {
  const a=candidates.find(c=>c.name===from),b=candidates.find(c=>c.name===to);
  if(!a||!b) throw new Error('未知方案');
  return {correct:b.correct-a.correct,seconds:b.seconds-a.seconds,cost:b.cost-a.cost};
}
/* 只是三段、三小批的前向流动示意，不含 GPipe 的反向传播和更新。 */
function forwardSchedule() {
  return Array.from({length:3},(_,stage)=>Array.from({length:5},(_,t)=>t-stage>=0&&t-stage<3?t-stage:null));
}
const research=Object.freeze({
  conditions:Object.freeze({benchmark:'MMLU',tasks:57,shots:5,compute:'近似相同训练计算预算',source:'表 6'}),
  models:Object.freeze([
    Object.freeze({name:'Chinchilla',parametersYi:700,accuracy:67.6,training:'更多训练 token'}),
    Object.freeze({name:'Gopher',parametersYi:2800,accuracy:60.0,training:'与前者训练配置不同'})
  ])
});
module.exports={candidates,scenarios,evaluate,delta,forwardSchedule,research};
