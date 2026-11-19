'use strict';
/* 已保存的规则执行记录；只核对结构和已标注条件，不调用工具或语言模型。 */
const snapshot = require('../../Python实现/source/campus_agent_lab/outputs/reference/episode18/result.json');
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
const cases = freeze(JSON.parse(JSON.stringify(snapshot.cases)));
function summarize(route) {
  if (!route || typeof route.case !== 'string' || !Array.isArray(route.trace) || !route.trace.length || !Number.isInteger(route.tool_calls) || !Number.isInteger(route.max_steps) || route.max_steps < 1) throw new Error('场地路线记录无效');
  for (const e of Array.from(route.trace)) {
    if (!e || typeof e.request_id !== 'string' || !e.request_id.trim() || !['search_venues','read_details'].includes(e.tool) || !e.args || typeof e.args !== 'object' || typeof e.executed !== 'boolean' || !['ok','blocked_repeat','blocked_step_limit'].includes(e.status) || e.executed !== (e.status === 'ok')) throw new Error('场地请求记录无效');
  }
  const calls = route.trace.filter(e => e.executed).length;
  if (calls !== route.tool_calls || calls > route.max_steps) throw new Error('执行次数与记录不一致');
  if (!['suggested','insufficient_evidence','blocked_repeat','blocked_step_limit'].includes(route.status)) throw new Error('场地停止状态无效');
  const last = route.trace.at(-1);
  if (route.status.startsWith('blocked_') ? route.status !== last.status : last.status !== 'ok') throw new Error('停止状态与请求记录不一致');
  if ((route.status === 'suggested') !== (route.suggestion != null)) throw new Error('建议与停止状态不一致');
  return { name:route.case, status:route.status, requests:route.trace.length, calls, blocked:route.trace.filter(e=>!e.executed).map(e=>e.request_id) };
}
function evidence(route, venueId, through) {
  summarize(route);
  // 只读截至某张请求卡已出现的材料；中间清单不冒充另一条已执行路线。
  const limit = through == null ? route.trace.length : through;
  if (!Number.isInteger(limit) || limit < 0 || limit > route.trace.length) throw new Error('过程记录范围无效');
  const trace = route.trace.slice(0, limit);
  const t = route.task;
  if (!t || typeof t.period !== 'string' || typeof t.day !== 'string' || !Number.isInteger(t.start) || !Number.isInteger(t.end) || t.start < 0 || t.end > 24 || t.start >= t.end || typeof t.equipment !== 'string' || typeof t.ramp !== 'boolean' || typeof venueId !== 'string') throw new Error('场地条件标注无效');
  const search = trace.find(e=>e.executed && e.status==='ok' && e.tool==='search_venues');
  if (search && !Array.isArray(search.result)) throw new Error('候选结果无效');
  const v = search && search.result.find(v=>v.venue_id===venueId);
  const read = trace.find(e=>e.executed && e.status==='ok' && e.tool==='read_details' && e.args.venue_id===venueId);
  const detail = read && read.result;
  if (v && (typeof v.period !== 'string' || typeof v.day !== 'string' || !Number.isInteger(v.start) || !Number.isInteger(v.end) || v.start >= v.end || typeof v.hours_source !== 'string')) throw new Error('候选时间标注无效');
  if (read && (!detail || typeof detail !== 'object' || (detail.equipment!==null && (!Array.isArray(detail.equipment) || detail.equipment.some(x=>typeof x!=='string'))) || ![true,false,null].includes(detail.ramp) || typeof detail.source!=='string' || typeof detail.conflict!=='boolean')) throw new Error('详情标注无效');
  const usable = detail && !detail.conflict;
  return {
    period:v ? v.period===t.period : null,
    time:v ? v.day===t.day && v.start<=t.start && t.end<=v.end : null,
    equipment:usable && detail.equipment!==null ? detail.equipment.includes(t.equipment) : null,
    ramp:usable && detail.ramp!==null ? !t.ramp || detail.ramp : null,
    hoursSource:v ? v.hours_source : null,
    detailsSource:detail ? detail.source : null
  };
}
module.exports = { cases, summarize, evidence };
