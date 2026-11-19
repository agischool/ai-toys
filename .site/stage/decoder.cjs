'use strict';
/* 第 10 篇：编号、表示、概率均为作者设定的独立示意；没有实现或训练 Transformer。 */
const {addMatching}=require('./residual.cjs');
const sentence=Object.freeze(['今天','下雨','了','。']);
const entries=Object.freeze([
  Object.freeze({token:'今天',id:17,embedding:Object.freeze([.2,.4]),position:Object.freeze([0,.1])}),
  Object.freeze({token:'下雨',id:42,embedding:Object.freeze([.6,-.2]),position:Object.freeze([.1,0])})
]);
const rounds=Object.freeze([
  Object.freeze([Object.freeze({token:'了',p:.60}),Object.freeze({token:'吗',p:.25}),Object.freeze({token:'，',p:.15})]),
  Object.freeze([Object.freeze({token:'。',p:.80}),Object.freeze({token:'，',p:.20})])
]);
function mask(size=3) {
  if (!Number.isInteger(size) || size<1 || size>16) throw new Error('遮罩尺寸须为 1—16 的整数');
  return Array.from({length:size},(_,r)=>Array.from({length:size},(_,c)=>c<=r));
}
function trainingRows(sequence=sentence) {
  if (!Array.isArray(sequence) || sequence.length<2 || sequence.length>17 || !sequence.every(t=>typeof t==='string' && t.length)) throw new Error('训练序列须有 2—17 个非空片段');
  const allowed=mask(sequence.length-1);
  return sequence.slice(0,-1).map((input,i)=>({input,target:sequence[i+1],readable:sequence.slice(0,i+1),allowed:allowed[i]}));
}
function representation(index) {
  if (!Number.isInteger(index) || index<0 || index>=entries.length) throw new Error('未知的示意位置');
  const e=entries[index];
  return {...e,combined:addMatching(e.embedding,e.position)};
}
function append(context,token) {
  if (!Array.isArray(context) || !context.length || !context.every(t=>typeof t==='string' && t.length) || typeof token!=='string' || !token.length) throw new Error('上下文与新片段须为非空文字');
  return [...context,token];
}
function generation() {
  let context=sentence.slice(0,2);
  return rounds.map(candidates=>{
    const next=candidates.reduce((a,b)=>a.p>=b.p?a:b);
    const before=[...context]; context=append(context,next.token);
    return {before,candidates,next:next.token,after:[...context],stop:next.token==='。'};
  });
}
module.exports={sentence,entries,rounds,mask,trainingRows,representation,append,generation};
