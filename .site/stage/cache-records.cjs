'use strict';
/* 读取保存的数值对照；计数与显式 token 示意不运行模型，也不测硬件。 */
const snapshot=require('../../Python实现/source/continuation_mechanisms/outputs/reference/result.json');
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
const record=freeze(JSON.parse(JSON.stringify(snapshot.kv_cache)));
const teaching=Object.freeze(Array.from('<abce|ab'));
const measuredInput='<abcde|edcba';
const counterexample=freeze({full:[5,4,1],cached:[5,1,0]});
function integer(n,min=1){if(!Number.isSafeInteger(n)||n<min)throw new Error('计数必须是有效整数');return n;}
function projections(length){
  integer(length);const full=length*(length+1)/2;
  if(!Number.isSafeInteger(full))throw new Error('计数超出精确整数范围');
  return {full,incremental:length,ratio:full/length};
}
function storage(length,width=16,bytesPerScalar=8){
  integer(length,0);integer(width);integer(bytesPerScalar);
  const perPosition=2*width*bytesPerScalar,total=length*perPosition;
  if(!Number.isSafeInteger(perPosition)||!Number.isSafeInteger(total))throw new Error('空间超出精确整数范围');
  return {length,width,bytesPerScalar,components:2,perPosition,total};
}
function prefix(length){
  integer(length);if(length>teaching.length)throw new Error('教学前缀超出范围');
  return teaching.slice(0,length).map((token,position)=>({token,position}));
}
function compare(full,cached,tolerance=1e-10){
  if(!Array.isArray(full)||!Array.isArray(cached)||!full.length||full.length!==cached.length||
      [...Array.from(full),...Array.from(cached)].some(x=>typeof x!=='number'||!Number.isFinite(x))||
      typeof tolerance!=='number'||!Number.isFinite(tolerance)||tolerance<0)throw new Error('候选分数或容差无效');
  const errors=full.map((x,i)=>Math.abs(x-cached[i]));
  const top=a=>a.reduce((best,x,i)=>x>a[best]?i:best,0);
  const maxError=Math.max(...errors);
  return {errors,maxError,sameTop:top(full)===top(cached),withinTolerance:maxError<=tolerance};
}
function summary(saved=record){
  if(!saved)throw new Error('缓存记录无效');
  const {models_checked:models,prefixes_per_model:length,cache_components:c}=saved;
  integer(models);integer(length);
  if(length!==Array.from(measuredInput).length||!c||!c.K||!c.V||c.K.tokens!==length||c.V.tokens!==length||c.K.width!==c.V.width)throw new Error('缓存形状与固定输入不一致');
  integer(c.K.width);integer(c.bytes_per_scalar);
  const counts=projections(length),space=storage(length,c.K.width,c.bytes_per_scalar);
  if(saved.full_prefix_kv_token_projections!==counts.full||saved.incremental_kv_token_projections!==counts.incremental||saved.final_kv_cache_bytes_per_model!==space.total)throw new Error('缓存记录与计数不一致');
  const maxError=saved.float64_max_logit_error,wrongPositionError=saved.wrong_position_negative_control_error;
  if([maxError,wrongPositionError].some(x=>typeof x!=='number'||!Number.isFinite(x)||x<0))throw new Error('保存的误差无效');
  return {models,length,comparisons:models*length,input:measuredInput,counts,space,maxError,wrongPositionError,tolerance:1e-10};
}
module.exports={record,teaching,measuredInput,counterexample,projections,storage,prefix,compare,summary};
