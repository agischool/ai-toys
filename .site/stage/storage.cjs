'use strict';
/* 第 11 篇：手写五格存储与独立加权示意，不是训练过的记忆网络。 */
const {combine}=require('./attention.cjs');
const initial=Object.freeze([null,null,null,null,null]);
function check(memory) {
  if(!Array.isArray(memory) || memory.length!==5 || Array.from(memory).some(v=>v!==null && (typeof v!=='string' || !v.length))) throw new Error('存储须为五个空值或非空文字');
}
function address(index) {
  if(!Number.isInteger(index) || index<1 || index>5) throw new Error('格号须为 1—5 的整数');
  return index-1;
}
function write(memory,index,value) {
  check(memory); const i=address(index);
  if(typeof value!=='string' || !value.length) throw new Error('写入内容须为非空文字');
  return memory.map((v,j)=>i===j?value:v);
}
function read(memory,index) {check(memory);return memory[address(index)];}
function demonstration() {
  const red=write(initial,1,'红'),blue=write(red,2,'蓝'),written=write(blue,3,'黄');
  const first=read(written,2),overwritten=write(written,2,'绿'),second=read(overwritten,2);
  return {empty:[...initial],red,blue,written,first,overwritten,second,wrong:read(overwritten,3),requests:[3,2].map(i=>({address:i,value:read(overwritten,i)}))};
}
function weightedRead() {
  const values=[2,10],weights=[.75,.25];
  return {values,weights,...combine(values,weights)};
}
module.exports={initial,write,read,demonstration,weightedRead};
