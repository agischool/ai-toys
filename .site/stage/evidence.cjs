'use strict';
/* 对人工标注的构造公告作规则核对；不解析自然语言，不是自动事实核查器。
 * 三个事实字段都限定在同一图书馆的周日，学校与适用期另作精确比较。 */
const scope=Object.freeze({school:'本校',period:'本周'});
const fields=Object.freeze(['sundayOpen','closeHour','reservationRequired']);
const source=facts=>Object.freeze({...scope,facts:Object.freeze(facts)});
const sources=Object.freeze({open:source({sundayOpen:true}),closed:source({sundayOpen:false}),weekday:source({}),timed:source({sundayOpen:true,closeHour:18})});
const claims=Object.freeze([
  Object.freeze({...scope,field:'sundayOpen',value:true,label:'周日开放'}),
  Object.freeze({...scope,field:'closeHour',value:21,label:'晚上九点关门'}),
  Object.freeze({...scope,field:'reservationRequired',value:false,label:'无需预约'})
]);
const groups=Object.freeze([Object.freeze({label:'A 类 · 常规时刻表',total:90,correct:90}),Object.freeze({label:'B 类 · 临时变更',total:10,correct:0})]);
function validateScope(record){if(!record||typeof record.school!=='string'||!record.school.trim()||typeof record.period!=='string'||!record.period.trim())throw new Error('须明确学校与适用期');}
function validateFact(field,value){
  if(!fields.includes(field))throw new Error('未知事实字段');
  if(field==='closeHour'?!Number.isInteger(value)||value<0||value>24:typeof value!=='boolean')throw new Error('事实值类型或范围无效');
}
function assess(document,claim){
  validateScope(document);validateScope(claim);
  if(!document.facts||typeof document.facts!=='object'||Array.isArray(document.facts))throw new Error('须提供已标注的事实对象');
  for(const [field,value] of Object.entries(document.facts))validateFact(field,value);
  validateFact(claim.field,claim.value);
  if(document.school!==claim.school||document.period!==claim.period)return 'inapplicable';
  if(!Object.hasOwn(document.facts,claim.field))return 'unknown';
  return document.facts[claim.field]===claim.value?'supports':'contradicts';
}
function summarize(records){
  if(!Array.isArray(records)||records.length===0)throw new Error('须提供分组记录');
  const byGroup=Array.from(records,record=>{
    if(!record||typeof record.label!=='string'||!record.label.trim()||!Number.isSafeInteger(record.total)||!Number.isSafeInteger(record.correct)||record.total<0||record.correct<0||record.correct>record.total)throw new Error('题数与答对数须为有效非负整数');
    return {...record,rate:record.total?record.correct/record.total:null};
  });
  const total=byGroup.reduce((n,r)=>n+r.total,0),correct=byGroup.reduce((n,r)=>n+r.correct,0);
  if(!Number.isSafeInteger(total)||!Number.isSafeInteger(correct))throw new Error('合计超出安全整数范围');
  return {total,correct,rate:total?correct/total:null,groups:byGroup};
}
module.exports={scope,sources,claims,groups,assess,summarize};
