'use strict';
/* 显式给定教学 token；不调用分词器，不在页面重新训练模型。 */
const snapshot=require('../../Python实现/source/continuation_mechanisms/outputs/reference/result.json');
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
const record=freeze(JSON.parse(JSON.stringify(snapshot.sft_loss_mask)));
const sample='<abcd|abcd>';
function align(tokens,firstScored=0){
  if(!Array.isArray(tokens)||tokens.length<2||Array.from(tokens).some(t=>typeof t!=='string'||!t.length)||!Number.isInteger(firstScored)||firstScored<0||firstScored>=tokens.length-1)throw new Error('教学 token 或计分起点无效');
  return tokens.slice(0,-1).map((input,index)=>({index,input,target:tokens[index+1],prefix:tokens.slice(0,index+1),score:index>=firstScored?1:0}));
}
function visible(position,length){
  if(!Number.isInteger(length)||length<1||!Number.isInteger(position)||position<0||position>=length)throw new Error('因果位置无效');
  return Array.from({length},(_,i)=>i<=position);
}
function summary(saved=record){
  const rows=align(Array.from(sample),sample.indexOf('|')),selected=rows.filter(r=>r.score).map(r=>r.index);
  if(!saved||!Array.isArray(saved.selected_target_positions)||JSON.stringify(saved.selected_target_positions)!==JSON.stringify(selected))throw new Error('保存的计分位置与样本不一致');
  const keys=['one_step_loss_before','one_step_loss_after','parameter_delta_l2','masked_logit_gradient_max'];
  if(keys.some(k=>typeof saved[k]!=='number'||!Number.isFinite(saved[k]))||saved.one_step_loss_before<0||saved.one_step_loss_after<0||saved.parameter_delta_l2<0||saved.masked_logit_gradient_max<0)throw new Error('保存的实验数值无效');
  return {sample,rows,selected,before:saved.one_step_loss_before,after:saved.one_step_loss_after,parameterDelta:saved.parameter_delta_l2,maskedLogitGradient:saved.masked_logit_gradient_max};
}
module.exports={sample,record,align,visible,summary};
