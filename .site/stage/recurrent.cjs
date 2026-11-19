'use strict';
/* 人为便签规则与简化的状态乘加，不是完整 RNN/LSTM，也不代表训练结果。 */
const story = Object.freeze([
  Object.freeze({text:'带红伞', latest:'红伞', color:'红'}),
  Object.freeze({text:'天转阴', latest:'阴天'}),
  Object.freeze({text:'刮起风', latest:'风'})
]);
const exchange = Object.freeze({text:'换蓝伞', latest:'蓝伞', color:'蓝'});
function trace(policy, events=story) {
  if (!['latest','color','first'].includes(policy)) throw new Error('未知便签规则');
  let state='';
  return events.map(event=>{
    if (policy==='latest') state=event.latest;
    else if (event.color && (policy==='color' || !state)) state=event.color;
    return {input:event.text,state};
  });
}
function update(previous, retain, write) {
  if (![previous,retain,write].every(Number.isFinite) || retain<0 || retain>1) throw new Error('状态与写入量须为有限数，保留系数须在 0—1 内');
  const kept=previous*retain;
  return {previous,retain,write,kept,next:kept+write};
}
function decay(initial, retain, steps=3) {
  if (!Number.isInteger(steps) || steps<0 || steps>20) throw new Error('步数须为 0—20 的整数');
  let state=update(initial,retain,0).previous;
  const values=[state];
  for(let i=0;i<steps;i++) { state=update(state,retain,0).next; values.push(state); }
  return values;
}
module.exports={story,exchange,trace,update,decay};
