'use strict';
/* 对固定结构的保存记录重算验收；不解析自然语言，不执行工具或调用模型。 */
const {isDeepStrictEqual:eq}=require('node:util');
const snapshot=require('../../Python实现/source/campus_agent_lab/outputs/reference/episode20/result.json');
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
const groups=freeze(JSON.parse(JSON.stringify(snapshot.groups)));
const fault=freeze(JSON.parse(JSON.stringify(snapshot.fault_demo)));
const faultCase=freeze({environment:groups.development.cases[0].environment,task:groups.development.cases[0].task,expected_status:'suggested',run:fault.run});
const statuses=['suggested','insufficient_evidence','no_qualified_venue','no_match','conflicting_evidence','tool_error'];
function audit(c){
  const r=c&&c.run,e=c&&c.environment,t=c&&c.task;
  if(!r||!e||!t||!Array.isArray(e.venues)||!e.details||!Array.isArray(r.trace)||!statuses.includes(r.status)||!statuses.includes(c.expected_status)||!Object.hasOwn(r,'suggestion'))throw new Error('验收记录无效');
  if(typeof t.period!=='string'||typeof t.day!=='string'||!Number.isInteger(t.start)||!Number.isInteger(t.end)||t.start<0||t.end>24||t.start>=t.end||typeof t.equipment!=='string'||typeof t.ramp!=='boolean')throw new Error('任务条件无效');
  if(!Number.isInteger(r.tool_calls)||r.tool_calls<0||r.trace.some(x=>!x||typeof x.tool!=='string'||typeof x.executed!=='boolean'||typeof x.status!=='string'||!x.args||typeof x.args!=='object')||r.trace.filter(x=>x.executed).length!==r.tool_calls)throw new Error('工具执行记录无效');
  if(r.suggestion===null){
    // 停止原因仅与预先标注的案例标签核对；不是任意情形的停止判定器。
    const appropriate=c.expected_status!=='suggested'&&r.status===c.expected_status;
    return {outcome:appropriate?'appropriate_stop':'incorrect_result',task_completed:false,checks:{stop_reason_matches_case:appropriate}};
  }
  const s=r.suggestion;
  if(!s||typeof s.venue_id!=='string'||typeof s.hours_source!=='string'||typeof s.details_source!=='string')throw new Error('建议记录无效');
  const venue=e.venues.find(v=>v.venue_id===s.venue_id),details=e.details[s.venue_id];
  const checks={
    task_unchanged:eq(r.task,t),known_venue:!!venue,
    period:!!venue&&venue.period===t.period,day:!!venue&&venue.day===t.day,
    time:!!venue&&venue.start<=t.start&&t.start<t.end&&t.end<=venue.end,
    equipment:!!details&&Array.isArray(details.equipment)&&details.equipment.includes(t.equipment),
    ramp:!!details&&(!t.ramp||details.ramp===true),unconflicted:!!details&&details.conflict===false,
    hours_evidence:false,details_evidence:false,
    only_advice:r.trace.every(x=>['search_venues','read_details'].includes(x.tool))
  };
  for(const x of r.trace){
    if(!x.executed||x.status!=='ok')continue;
    if(x.tool==='search_venues'&&venue){
      if(!Array.isArray(x.result))throw new Error('时间表返回记录无效');
      checks.hours_evidence ||= x.result.some(v=>eq(v,venue))&&s.hours_source===venue.hours_source;
    }
    if(x.tool==='read_details'&&details)checks.details_evidence ||= x.args.venue_id===s.venue_id&&eq(x.result,details)&&s.details_source===details.source;
  }
  const passed=Object.values(checks).every(Boolean);
  return {outcome:passed?'task_success':'incorrect_completion',task_completed:passed,checks};
}
function tally(cases){
  if(!Array.isArray(cases))throw new Error('案例列表无效');
  const counts={task_success:0,appropriate_stop:0,incorrect_completion:0,incorrect_result:0};
  for(const c of Array.from(cases))counts[audit(c).outcome]++;
  return counts;
}
module.exports={groups,fault,faultCase,audit,tally};
