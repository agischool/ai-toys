'use strict';
/* 人为指定的末片段查表生成器；没有训练，不是真实语言模型的测量。 */
const rules=Object.freeze({
  '我':Object.freeze([Object.freeze({token:'读书',p:.6}),Object.freeze({token:'画画',p:.4})]),
  '读书':Object.freeze([Object.freeze({token:'。',p:1})]),
  '画画':Object.freeze([Object.freeze({token:'。',p:1})])
});
function candidates(last) {
  if (!Object.hasOwn(rules,last)) throw new Error('玩具没有这个末片段的规则');
  return rules[last];
}
function sample(last,roll) {
  if (!Number.isFinite(roll) || roll<0 || roll>=1) throw new Error('抽取值须在 0（含）到 1（不含）之间');
  const choices=candidates(last);
  let cumulative=0;
  for (const choice of choices) { cumulative+=choice.p; if (roll<cumulative) return choice; }
  return choices.at(-1);
}
function ticket(number) {
  if (!Number.isInteger(number) || number<1 || number>10) throw new Error('卡号须为 1—10 的整数');
  return sample('我',(number-.5)/10);
}
const tickets=Object.freeze(Array.from({length:10},(_,i)=>Object.freeze({number:i+1,...ticket(i+1)})));
function generate(prefix=['我'], {method='greedy',number=8}={}) {
  if (!Array.isArray(prefix) || !prefix.length || !prefix.every(t=>typeof t==='string' && t.length)) throw new Error('前文须为非空片段数组');
  if (!['greedy','ticket'].includes(method)) throw new Error('未知选择方法');
  if (method==='ticket') ticket(number);
  const tokens=[...prefix], steps=[];
  let probability=1;
  while(tokens.at(-1)!=='。') {
    const last=tokens.at(-1), choices=candidates(last);
    const chosen=method==='greedy'?choices.reduce((a,b)=>a.p>=b.p?a:b):sample(last,(number-.5)/10);
    steps.push({context:[...tokens],last,token:chosen.token,p:chosen.p});
    tokens.push(chosen.token); probability*=chosen.p;
  }
  return {tokens,steps,probability};
}
function tally(numbers) {
  const counts={'读书':0,'画画':0};
  numbers.forEach(n=>counts[ticket(n).token]++);
  return counts;
}
const demonstrations=Object.freeze([
  Object.freeze([1,1,2,3,4,5,6,7,8,10]),
  Object.freeze([1,2,3,6,7,7,8,8,9,10])
]);
module.exports={rules,candidates,sample,ticket,tickets,generate,tally,demonstrations};
