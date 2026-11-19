'use strict';
/* 第 09 篇的人为加权算例：没有训练，也不把数值解释成指代答案。 */
const values=Object.freeze([2,10]);
const weights=Object.freeze({first:Object.freeze([.75,.25]),swapped:Object.freeze([.25,.75]),equal:Object.freeze([.5,.5])});
function combine(information,shares) {
  if (!Array.isArray(information) || !information.length || !Array.isArray(shares) || information.length!==shares.length) throw new Error('信息和权重的数量须相同且非空');
  if (!shares.every(v=>Number.isFinite(v) && v>=0) || Math.abs(shares.reduce((a,b)=>a+b,0)-1)>1e-10) throw new Error('权重须非负且总和为 1');
  const vectors=Array.isArray(information[0]);
  const rows=information.map(v=>vectors?v:[v]);
  const width=rows[0].length;
  if (!width || !rows.every(v=>Array.isArray(v) && v.length===width && v.every(Number.isFinite))) throw new Error('信息须为有限数或等长的有限数向量');
  const products=rows.map((v,i)=>v.map(n=>n*shares[i]));
  const result=Array.from({length:width},(_,j)=>products.reduce((sum,v)=>sum+v[j],0));
  return {products:vectors?products:products.map(v=>v[0]),result:vectors?result:result[0]};
}
function trial(name='first') {
  if (!Object.hasOwn(weights,name)) throw new Error('未知的权重方案');
  return {values:[...values],weights:[...weights[name]],...combine(values,weights[name])};
}
module.exports={values,weights,combine,trial};
