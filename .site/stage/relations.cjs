'use strict';
/* 手工位置比较与计数，不是训练出来的关系网络。顺序不包含厘米尺度。 */
const objects=Object.freeze([
  Object.freeze({id:'red',name:'红圆',color:'红',shape:'圆'}),
  Object.freeze({id:'blue',name:'蓝方',color:'蓝',shape:'方'}),
  Object.freeze({id:'green',name:'绿三角',color:'绿',shape:'三角'})
]);
const arrangements=Object.freeze({first:Object.freeze(['red','blue','green']),swapped:Object.freeze(['red','green','blue'])});
function validate(order) {
  if(!Array.isArray(order)||order.length!==3||new Set(order).size!==3||!objects.every(o=>order.includes(o.id)))throw new Error('排列须完整且不重复地包含三个对象');
}
function targetIndex(order,target) {validate(order);const i=order.indexOf(target);if(i<0)throw new Error('未知目标对象');return i;}
function inventory(order) {validate(order);return objects.map(o=>({...o}));}
function count(order,target,direction='left') {
  const i=targetIndex(order,target);
  if(!['left','right'].includes(direction))throw new Error('方向只能为 left 或 right');
  return direction==='left'?i:order.length-1-i;
}
function edges(order) {
  validate(order);
  return order.flatMap((from,i)=>order.slice(i+1).map(to=>({from,to})));
}
function comparisons(order,target='blue',direction='left') {
  const i=targetIndex(order,target);
  if(!['left','right'].includes(direction))throw new Error('方向只能为 left 或 right');
  return order.map((id,j)=>({id,target,contributes:direction==='left'?j<i:j>i}));
}
function positions(order,coordinates=[0,1,2]) {
  validate(order);
  if(!Array.isArray(coordinates)||coordinates.length!==3||!Array.from(coordinates).every((x,i)=>Number.isFinite(x)&&(i===0||x>coordinates[i-1])))throw new Error('示意坐标须为三个严格递增的有限数');
  return order.map((id,i)=>({id,x:coordinates[i]}));
}
module.exports={objects,arrangements,inventory,count,edges,comparisons,positions};
