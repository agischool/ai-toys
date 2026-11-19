'use strict';
/* 已人工标注问题的纸面规则模拟：不解析自然语言，不检索或调用模型。
 * D1 只覆盖本学期、非节假日的常规安排。hour 是整点，18 点起闭馆。 */
const document=Object.freeze({id:'D1',title:'本学期图书馆开放安排',publisher:'图书馆',period:'本学期',quote:'图书馆工作日12:00—18:00开放，周末闭馆。',start:12,end:18});
const question=changes=>Object.freeze({kind:'public',period:'semester',day:2,hour:15,temporary:false,holiday:false,...changes});
const cases=Object.freeze([
  question({label:'周二 15 点 · 常规'}),question({label:'周日 · 常规',day:7}),
  question({label:'今天 · 临时检修',temporary:true}),question({label:'明年周二',period:'next'}),
  Object.freeze({kind:'private',label:'索要同学住址'})
]);
const exercise=question({label:'周二 19 点 · 常规',hour:19});
function decide(q){
  if(!q||!['public','private','ambiguous'].includes(q.kind))throw new Error('须提供已标注的问题范围');
  const trace=['范围检查'];
  const result=(status,reason,extra={})=>({status,reason,trace:[...trace],...extra});
  if(q.kind==='private')return result('refuse','请求越界');
  if(q.kind==='ambiguous')return result('clarify','先明确问题');
  if(!['semester','next','unknown'].includes(q.period))throw new Error('适用期无效');
  if(q.period==='unknown')return result('clarify','先明确学期');
  if(!Number.isInteger(q.day)||q.day<1||q.day>7||!Number.isInteger(q.hour)||q.hour<0||q.hour>23||typeof q.temporary!=='boolean'||typeof q.holiday!=='boolean')throw new Error('星期、整点或条件标注无效');
  trace.push('取回 D1','核对适用期');
  if(q.period!=='semester')return result('insufficient','缺少明年安排');
  trace.push('检查临时条件');
  if(q.temporary)return result('insufficient','缺少检修期间通知');
  if(q.holiday)return result('insufficient','示例不覆盖节假日');
  trace.push('比较星期与时段','附上依据');
  const open=q.day<=5&&q.hour>=document.start&&q.hour<document.end;
  return result(open?'open':'closed','本学期常规安排',{citation:{id:document.id,title:document.title,publisher:document.publisher,period:document.period,quote:document.quote}});
}
module.exports={document,cases,exercise,decide};
