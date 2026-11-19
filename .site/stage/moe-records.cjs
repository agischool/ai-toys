'use strict';
/* 固定的未训练线性模块：复算选择和合并，不调用模型或测量硬件。 */
const snapshot=require('../../Python实现/source/continuation_mechanisms/outputs/reference/result.json');
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
const record=freeze(JSON.parse(JSON.stringify(snapshot.moe)));
function vector(v){if(!Array.isArray(v)||!v.length||Array.from(v).some(x=>typeof x!=='number'||!Number.isFinite(x)))throw new Error('数值向量无效');return v;}
function shape(m){
  if(!Array.isArray(m)||!m.length||Array.from(m).some(r=>!Array.isArray(r)))throw new Error('专家矩阵无效');
  m.forEach(vector);if(m.some(r=>r.length!==m[0].length))throw new Error('专家矩阵形状不一致');
  return [m.length,m[0].length];
}
function softmax(scores){vector(scores);const max=Math.max(...scores),e=scores.map(x=>Math.exp(x-max)),sum=e.reduce((a,b)=>a+b,0);return e.map(x=>x/sum);}
function select(scores,k=2){
  vector(scores);if(!Number.isInteger(k)||k<1||k>scores.length)throw new Error('选中数量无效');
  return scores.map((score,id)=>({score,id})).sort((a,b)=>b.score-a.score||a.id-b.id).slice(0,k).map(r=>r.id);
}
function project(input,matrix){
  vector(input);const [rows,cols]=shape(matrix);if(input.length!==rows)throw new Error('输入与专家形状不一致');
  const out=Array.from({length:cols},(_,j)=>input.reduce((sum,x,i)=>sum+x*matrix[i][j],0));vector(out);return out;
}
function combine(outputs,weights){
  vector(weights);if(!Array.isArray(outputs)||outputs.length!==weights.length||weights.some(w=>w<0)||Math.abs(weights.reduce((a,b)=>a+b,0)-1)>1e-12)throw new Error('合并权重无效');
  outputs.forEach(vector);if(outputs.some(v=>v.length!==outputs[0].length))throw new Error('专家输出形状不一致');
  const contributions=outputs.map((row,i)=>row.map(x=>x*weights[i]));
  const output=outputs[0].map((_,j)=>contributions.reduce((sum,row)=>sum+row[j],0));vector(output);
  return {contributions,output};
}
function run(input,matrices,scores,k=2){
  vector(input);vector(scores);if(!Array.isArray(matrices)||matrices.length!==scores.length)throw new Error('专家清单无效');
  const shapes=Array.from(matrices,m=>shape(m));
  if(shapes.some(([r,c])=>r!==input.length||c!==shapes[0][1]))throw new Error('专家形状不一致');
  const selected=select(scores,k),weights=softmax(selected.map(id=>scores[id]));
  // 验证所有形状，随后只执行选中的矩阵投影。
  const outputs=selected.map(id=>project(input,matrices[id]));
  const merged=combine(outputs,weights);
  const sizes=shapes.map(([r,c])=>r*c);
  return {selected,weights,outputs,...merged,stored:sizes.reduce((a,b)=>a+b,0),used:selected.reduce((sum,id)=>sum+sizes[id],0)};
}
function close(actual,expected){
  if(Array.isArray(actual)){if(!Array.isArray(expected)||actual.length!==expected.length)throw new Error('保存的数值形状不一致');actual.forEach((x,i)=>close(x,expected[i]));}
  else if(typeof expected!=='number'||!Number.isFinite(expected)||Math.abs(actual-expected)>1e-12)throw new Error('保存的数值不一致');
}
function summary(saved=record){
  if(!saved)throw new Error('保存的专家记录无效');
  const result=run(saved.input,saved.all_expert_matrices,saved.router_logits);
  if(JSON.stringify(result.selected)!==JSON.stringify(saved.selected_expert_ids_zero_based)||result.stored!==saved.expert_parameters_stored||result.used!==saved.expert_parameters_used_for_this_token)throw new Error('保存的选择或参数计数不一致');
  close(result.weights,saved.renormalized_weights);close(result.outputs,saved.selected_expert_outputs);close(result.output,saved.output);
  const routerWeights=softmax(saved.router_logits);close(routerWeights,saved.router_probabilities);
  return {...result,routerWeights};
}
module.exports={record,select,softmax,project,combine,run,summary};
