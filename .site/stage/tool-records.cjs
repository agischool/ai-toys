'use strict';
/* 读取配套实验已保存的结果；本模块只核对记录，不执行工具或调用模型。 */
const snapshot=require('../../Python实现/source/campus_agent_lab/outputs/reference/episode17/result.json');
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
const cases=freeze(JSON.parse(JSON.stringify(snapshot.cases)));
function summarize(event){
  if(!event||typeof event.request_id!=='string'||!event.request_id.trim()||typeof event.tool!=='string'||!event.tool.trim()||!event.args||typeof event.args!=='object'||Array.isArray(event.args)||typeof event.executed!=='boolean')throw new Error('工具记录字段无效');
  const base={id:event.request_id,executed:event.executed,status:event.status,matches:null};
  if(event.status==='ok'){
    if(!event.executed||!Array.isArray(event.result))throw new Error('正常记录须有执行与结果列表');
    for(const item of Array.from(event.result))if(!item||typeof item.doc_id!=='string'||!item.doc_id.trim()||['title','period','text','publisher'].some(k=>typeof item[k]!=='string'||!item[k].trim()))throw new Error('公告记录无效');
    return {...base,matches:event.result.length,outcome:event.result.length?'found':'empty'};
  }
  if(!['invalid_args','unknown_tool','tool_error'].includes(event.status)||typeof event.result!=='string'||!event.result.trim())throw new Error('未知状态或错误记录无效');
  if(event.executed!==(event.status==='tool_error'))throw new Error('错误状态与执行标记不一致');
  return {...base,outcome:event.status==='tool_error'?'failed':'invalid'};
}
module.exports={cases,summarize};
