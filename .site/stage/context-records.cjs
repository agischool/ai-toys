'use strict';
/* 只整理固定教学文本，不调用模型，不判断任意改写的意思或模型是否用对条件。 */
const snapshot=require('../../Python实现/source/campus_agent_lab/outputs/reference/episode19/result.json');
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
const originalCards=freeze(JSON.parse(JSON.stringify(snapshot.original_cards)));
const comparisons=freeze(JSON.parse(JSON.stringify(snapshot.comparisons)));
const phrases=freeze({ramp_required:'必须有坡道',time_and_period:'本学期周二15—16',projector_required:'需要投影仪',no_booking:'只给建议，不预约'});
function checkPhrases(text){
  if(typeof text!=='string')throw new Error('固定文本无效');
  return Object.fromEntries(Object.entries(phrases).map(([key,phrase])=>[key,text.includes(phrase)]));
}
function cardsValid(cards,withKind){
  if(!Array.isArray(cards))throw new Error('卡片记录无效');
  const ids=new Set();
  for(const c of Array.from(cards)){
    if(!c||typeof c.id!=='string'||!c.id.trim()||ids.has(c.id)||typeof c.text!=='string'||!c.text.trim()||(withKind&&!['requirement','observation'].includes(c.kind)))throw new Error('卡片记录无效');
    ids.add(c.id);
  }
}
function select(cards,mode){
  cardsValid(cards,true);
  let chosen;
  if(mode==='full')chosen=cards;
  else if(mode==='last_three')chosen=cards.slice(-3);
  else if(mode==='retrieve_requirements')chosen=[...cards.filter(c=>c.kind==='requirement'),...cards.filter(c=>c.kind==='observation')];
  else throw new Error('整理方式无效；人工摘要不由程序生成');
  return chosen.map(c=>({...c}));
}
function inspect(record){
  if(!record||typeof record.mode!=='string'||typeof record.input_text!=='string'||!Number.isInteger(record.characters))throw new Error('输入记录无效');
  cardsValid(record.input_cards,false);
  const text=record.input_cards.map(c=>c.text).join('\n'),present=checkPhrases(text);
  if(text!==record.input_text||Array.from(text).length!==record.characters)throw new Error('输入文字或字符数与卡片不一致');
  const saved=record.requirements_present;
  if(!saved||Object.keys(saved).length!==Object.keys(phrases).length||Object.keys(phrases).some(k=>saved[k]!==present[k]))throw new Error('固定短语检查与保存记录不一致');
  return {mode:record.mode,ids:record.input_cards.map(c=>c.id),characters:record.characters,present};
}
module.exports={originalCards,comparisons,phrases,checkPhrases,select,inspect};
