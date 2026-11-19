'use strict';
const {C,g,rect,circle,line,qBadge,magnifier}=require('../art.cjs');
const {label,put,scene,chapter,cover,references,exercise}=require('../lesson.cjs');
const E=require('../evidence.cjs'),scores=E.summarize(E.groups);
const VERDICTS={supports:'得到支持',contradicts:'与材料矛盾',unknown:'材料未说明',inapplicable:'不适用'};
const tint=v=>v==='supports'?C.mint:v==='contradicts'?C.peach:C.cream;
const box=(word,w=530,h=220,fill=C.blue,size=48)=>rect(-w/2,-h/2,w,h,{fill,r:14})+label(word,0,C.ink,size);
const paper=(title,words)=>rect(-270,-165,540,330,{fill:C.white,r:12})+line(-235,-65,235,-65,{sw:3})+label(title,-115,C.tealInk,44)+label(words,45,C.ink,48);
function pair(out,step,a,b){out.push(put(a,step,'left',[300,280],[400,230]));out.push(put(b,step,'right',[900,280],[400,680],{d:140}));}
function note(out,step,words){out.push(put(label(words,0,C.tealInk,44),step,'scope',[600,665],[400,945]));}
function trio(out,step,words,annotation=''){
  words.forEach((w,i)=>out.push(put(box(w,340,170,i===2?C.mint:C.blue,46),step,'item.'+i,[210+i*390,280],[400,130+i*320])));
  if(annotation)note(out,step,annotation);
}
function verdictArt(key,words){return box([VERDICTS[key],...words],530,240,tint(key),46);}
function judgment(out,step,sourceId,quote){
  const v=E.assess(E.sources[sourceId],E.claims[0]);
  pair(out,step,paper('本校 · 本周公告',quote),verdictArt(v,['主张：周日开放']));
  note(out,step,sourceId==='weekday'?['未说明，不能当成开放','也不能当成闭馆']:'在同一学校与适用期内对照');
}
function verdicts(out,step){
  const data=[['open',['周日开放']],['closed',['周日闭馆']],['weekday',['只列周一至周五']]];
  data.forEach(([id,quote],i)=>{
    const v=E.assess(E.sources[id],E.claims[0]);
    const art=p=>rect(-(p?690:350)/2,-(p?200:310)/2,p?690:350,p?200:310,{fill:tint(v),r:14})+label(quote,p?-40:-65,C.ink,p?46:36)+label(VERDICTS[v],p?45:65,v==='contradicts'?C.coralInk:C.tealInk,p?48:42);
    out.push(put(art(false),step,'verdict.'+i,[210+i*390,290],[0,0],{only:'l'}));
    out.push(put(art(true),step,'verdict.'+i,[0,0],[400,160+i*310],{only:'p'}));
  });
  note(out,step,['学校与适用期已核准','核对主张“周日开放”']);
}
function opening(){
  const out=[];
  pair(out,0,paper('助手回答',['周日开放','还附有公告链接']),paper('点开原始公告',['周日闭馆']));
  note(out,0,['虚构例子：有来源','还要核对是否支持']);
  pair(out,1,magnifier(110)+label('追到原文',240,C.tealInk,50),box(['上一期：挪动对象','本期：对照回答与材料'],560,240,C.mint,46));
  return scene('open',out);
}
function trace(){
  const out=[];chapter(out,0,magnifier(110),'沿着每一句话 · 找到适用证据');
  trio(out,1,['本校图书馆','本周日','开放'],['地点 · 时间 · 开放状态','先把要查的主张拆清楚']);
  pair(out,2,paper('另一所学校',['周日开放']),paper('本校去年公告',['周日开放']));note(out,2,'学校或适用期不符 · 不能直接套用');
  verdicts(out,3);
  judgment(out,4,'weekday',['只列周一至周五','没有说明周日']);
  pair(out,5,paper('现有时刻表',['只列周一至周五']),box(['资料缺口','没有说明周日安排'],550,250,C.cream,46));
  verdicts(out,6);
  pair(out,7,paper('公告只说',['周日开放']),box(['开到晚上九点？','无需预约？'],530,240,C.cream,48));note(out,7,'一条引用 · 未必支持整段回答');
  trio(out,8,['回答流畅','事实正确','引用有效'],'分别检查 · 不能互相作保证');
  pair(out,9,paper('核准来源',['谁发布 · 哪天发布','适用期 · 更新通知']),magnifier(110)+label('追到原始发布',240,C.tealInk,48));
  pair(out,10,box(['多处转抄','可能同出一份旧文'],530,240,C.blue,48),box(['原始材料冲突','指出冲突 · 向发布者确认'],570,240,C.cream,44));
  return scene('trace',out);
}
function confidence(){
  const out=[];chapter(out,0,qBadge(110),'语气再肯定 · 也要独立核查');
  pair(out,1,box(['再确认一下','可能仍是重复错误'],530,240,C.blue,48),paper('独立对照材料',['核对时间','人物与出处']));
  pair(out,2,box(['屏幕上的','“可信度 90%”'],530,240,C.blue,54),qBadge(90)+label(['分数从何而来？','怎样计算与验证？'],250,C.ink,46));
  trio(out,3,[['内部','分数'],['其他程序','评分'],['生成的','一句话']],['没有说明验证方式','不能直接当作本次正确概率']);
  pair(out,4,box(['报为约 90% 的','一批分类预测'],540,250,C.blue,48),box(['对照实际正确比例','是否约 90%？'],550,250,C.mint,48));note(out,4,['校准：检查一批适当样本','预测把握与正确率的对应']);
  pair(out,5,paper('所引论文的任务',['图像分类','文档分类等']),box(['不能直接当作','聊天答案已校准的证据'],570,250,C.cream,44));
  pair(out,6,box(['一批样本的对应','不替单个答案免检'],550,240,C.blue,48),box(['换了使用环境','对应关系也可能改变'],550,240,C.cream,46));
  pair(out,7,paper('只查到的材料',['本学期安排']),box(['缺少明年安排','不能据此确定明年'],550,240,C.mint,46));note(out,7,'“不知道”也要说清 · 缺的是什么');
  return scene('confidence',out);
}
function grid(){
  let art='';for(let i=0;i<scores.total;i++)art+=circle(-225+(i%10)*50,-225+Math.floor(i/10)*50,16,{fill:i<scores.correct?C.mint:C.peach,stroke:i<scores.correct?C.tealInk:C.coralInk,sw:4});
  return art;
}
function total(out,step){
  out.push(put(grid(),step,'examples',[320,280,.85],[400,320]));
  const summary=box([scores.correct+' / '+scores.total+' 题答对','总正确率 '+scores.rate*100+'%'],520,250,C.blue,54);
  out.push(put(summary,step,'summary',[910,280],[400,760]));note(out,step,'人为设定的 100 题 · 不是产品测评');
}
function grouped(out,step){
  const cards=scores.groups.map(r=>paper(r.label,[r.correct+' / '+r.total+' 题答对','正确率 '+r.rate*100+'%']));
  pair(out,step,...cards);note(out,step,'总分 90% · 遮不住临时变更组的 0%');
}
function scoring(){
  const out=[];chapter(out,0,g(grid(),{s:.65}),'一个总分 · 看不见所有盲点');
  total(out,1);grouped(out,2);grouped(out,3);
  pair(out,4,box(['某组只有两三题','百分比可能大起大落'],550,240,C.cream,46),box(['同时记下样本数','检查错误后果'],530,240,C.mint,48));
  trio(out,5,[['重要','情形'],['样本','数量'],['错误','后果']]);
  pair(out,6,box(['某种表达少见','可能更常被误解'],540,240,C.blue,48),box(['调查数据与任务','也检查使用方式'],540,240,C.mint,48));note(out,6,'发现差异 · 不能直接归咎于使用者');
  trio(out,7,['批判判断','人的权利','人的责任'],'UNESCO 2024 年框架 · 背景参考');
  return scene('scores',out);
}
function challenge(){
  const out=[];chapter(out,0,qBadge(110),'给一段回答 · 逐句找依据');
  pair(out,1,paper('本校 · 本周公告',['周日','12:00—18:00 开放']),paper('助手的三个说法',['开放 · 九点关门','无需预约']));
  note(out,1,['支持、矛盾、未说明','三个说法分别判断']);
  out.push(put(box(['无需预约','材料没有说明'],540,240,C.cream,48),2,'left',[300,280],[400,200]));
  out.push(put(qBadge(90)+label(['既不能判定无需预约','也不能断定必须预约'],250,C.ink,44),2,'right',[900,280],[400,550],{d:140}));
  note(out,2,'核查的结果 · 可以保留未知');
  return scene('challenge',out);
}
const CARDS=E.claims.map((claim,i)=>{
  const v=E.assess(E.sources.timed,claim);
  return {id:'claim'+i,question:claim.label+'，公告支持吗？',answer:VERDICTS[v],front:p=>label(claim.label,p?-25:-40,C.ink,p?50:38)+label('点击核对',p?90:165,C.tealInk,36),back:p=>label(VERDICTS[v],p?-25:-40,v==='contradicts'?C.coralInk:C.tealInk,p?50:42)+label(i===0?'公告写明开放':i===1?'公告为 18:00 关闭':'公告未提预约',p?65:110,C.ink,p?42:34)};
});
function privacy(){
  const out=[];chapter(out,0,paper('查公开开馆时间',['通常无需','个人资料']),'核查也要遵守隐私边界');
  trio(out,1,['姓名','家庭住址','健康信息'],'查公开开馆时间 · 不必顺手全上传');
  pair(out,2,paper('教学与试验',['优先使用虚构材料']),box(['确需个人信息时','核准用途、权限与安排'],570,240,C.mint,44));
  pair(out,3,box(['删掉姓名','未必足够匿名'],530,240,C.blue,48),box(['班级 · 时间 · 地点','仍可能认出某个人'],550,240,C.cream,46));
  pair(out,4,box(['故事灵感','核查投入随用途决定'],550,240,C.blue,46),box(['健康、升学、处分','正式来源与人工复核'],550,240,C.cream,46));note(out,4,['后果越重要','越需要负有责任的人复核']);
  pair(out,5,paper('回到原句',['本校 · 本周日开放']),verdictArt('supports',['适用公告确实支持']));
  note(out,5,['语气、链接与总分','放回来源与适用范围检查']);
  return scene('privacy',out);
}
module.exports=ctx=>[cover(ctx,magnifier(130),'逐句对照 · 允许未知'),opening(),trace(),confidence(),scoring(),challenge(),exercise(CARDS),privacy(),references(ctx,['〔1〕生成回答的引用研究','〔2〕分类模型的校准研究','〔3〕UNESCO 学生能力框架'],'构造公告与计数示意 · 非真实产品测评')];
module.exports.thumbnail=section=>{
 const icons=[magnifier(110),g(paper('公告',['逐句核对']),{s:.65}),qBadge(110),g(grid(),{s:.6}),qBadge(110),g(paper('公开资料',['只用必要信息']),{s:.65})];
 return '<svg class="toc-thumb" viewBox="-230 -190 460 380" aria-hidden="true" focusable="false">'+(section.mark==='源'?magnifier(110):icons[section.num])+'</svg>';
};
