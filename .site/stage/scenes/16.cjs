'use strict';
const {C,g,rect,line,arrow,qBadge,magnifier}=require('../art.cjs');
const {label,put,scene,chapter,cover,references,exercise}=require('../lesson.cjs');
const M=require('../campus.cjs');
const names={open:'按常规开放',closed:'按常规闭馆',insufficient:'资料不足',refuse:'请求越界',clarify:'先澄清'};
const tint=s=>s==='refuse'?C.peach:s==='insufficient'||s==='clarify'?C.cream:C.mint;
const box=(words,w=530,h=230,fill=C.blue,size=48)=>rect(-w/2,-h/2,w,h,{fill,r:14})+label(words,0,C.ink,size);
const paper=(title,words)=>rect(-275,-165,550,330,{fill:C.white,r:12})+line(-240,-65,240,-65,{sw:3})+label(title,-115,C.tealInk,44)+label(words,45,C.ink,46);
const d1=()=>paper('D1 · 图书馆 · 本学期',['工作日 12:00—18:00','周末闭馆']);
function pair(out,s,a,b){out.push(put(a,s,'left',[300,280],[400,220]));out.push(put(b,s,'right',[900,280],[400,660],{d:140}));}
function note(out,s,words){out.push(put(label(words,0,C.tealInk,44),s,'scope',[600,665],[400,940]));}
function trio(out,s,words,annotation){words.forEach((w,i)=>out.push(put(box(w,340,180,i===2?C.mint:C.blue,44),s,'item.'+i,[210+i*390,280],[400,140+i*310])));if(annotation)note(out,s,annotation);}
function flow(p){
 const x=p?210:340,y=p?[110,440,790]:[100,345,620],right=p?610:930,w=p?300:410,h=140;
 let art='';
 const node=(cx,cy,words,fill)=>g(box(words,w,h,fill,38),{x:cx,y:cy});
 art+=node(x,y[0],['公开服务','范围内？'],C.blue)+node(right,y[0],['越界','立即停止'],C.peach);
 art+=node(x,y[1],['查核准资料','有适用依据？'],C.blue)+node(right,y[1],['资料不足','说明缺口'],C.cream);
 art+=node(x,y[2],['有据组织回答','附公告与原句'],C.mint);
 for(let i=0;i<2;i++){
  art+=arrow([[x+w/2+8,y[i]],[right-w/2-8,y[i]]],{sw:5,head:18})+g(label('否',-35,C.coralInk,36),{x:(x+right)/2,y:y[i]});
  art+=arrow([[x,y[i]+h/2+6],[x,y[i+1]-h/2-8]],{sw:5,head:18})+g(label('是',0,C.tealInk,36),{x:x-60,y:(y[i]+y[i+1])/2});
 }
 art+=g(label(p?['问题含糊：先澄清','再回到范围检查']:['含糊时先澄清','再回到范围检查'],0,C.tealInk,36),{x:right,y:y[2]});
 return art;
}
function flowBeat(out,s){out.push(put(flow(false),s,'route',[0,0],[0,0],{only:'l'}));out.push(put(flow(true),s,'route',[0,0],[0,0],{only:'p'}));}
function opening(){const out=[];
 pair(out,0,box(['周二 · 下午三点','图书馆开门吗？']),qBadge(95));note(out,0,['临时检修？明年？','相同时间不保证相同依据']);
 pair(out,1,paper('上一期',['检查已经写好的回答']),paper('这一期',['先核对范围与资料','再决定如何回答']));
 pair(out,2,box(['只答公开服务信息','不读学生档案'],550,250,C.mint,46),box(['虚构方案 · 纸面推演','没有运行真实助手'],560,250,C.cream,44));
 return scene('open',out);}
function source(){const out=[];chapter(out,0,g(d1(),{s:.8}),'先给助手一份核准的资料');
 pair(out,1,d1(),box(['周二、周日均在本学期','示例不涉及节假日'],570,250,C.mint,44));
 pair(out,2,paper('管理员核准入库',['标题 · 发布者','适用期 · 原文位置']),box(['未收录检修与明年安排','不能自行补上'],570,250,C.cream,44));
 pair(out,3,paper('限定资料库',['这里没有找到']),box(['不等于','世界上无人知道'],530,230,C.mint,48));
 pair(out,4,box(['没有学生档案入口','先删不必要的个人信息'],570,250,C.blue,44),box(['只记必要错误类型','不默认保存完整聊天'],570,250,C.mint,44));
 flowBeat(out,5);return scene('source',out);}
function process(){const out=[];chapter(out,0,magnifier(110),'先检查范围，再找适用依据');
 pair(out,1,box(['公开设施开放时间','可以继续'],550,240,C.mint,46),box(['索要同学住址','范围检查即停止'],550,240,C.peach,46));
 pair(out,2,qBadge(90)+label('“周二”指哪个学期？',230,C.ink,44),box(['问题含糊先澄清','再回到范围检查'],550,240,C.cream,46));
 const rag=(p)=>{const words=[['核准公告 D1','取回相关原句'],['问题 ＋ 原句','交给语言模型'],['根据原句','组织回答']];let art='';words.forEach((word,i)=>{const x=p?400:210+i*390,y=p?130+i*320:280;art+=g(box(word,340,180,i===2?C.mint:C.blue,40),{x,y});if(i<2)art+=p?arrow([[400,y+100],[400,y+210]],{sw:5,head:20}):arrow([[x+180,280],[x+205,280]],{sw:5,head:16});});return art;};
 out.push(put(rag(false),3,'rag',[0,0],[0,0],{only:'l'}),put(rag(true),3,'rag',[0,0],[0,0],{only:'p'}));note(out,3,'RAG：先检索，再依据材料生成');
 trio(out,4,[['发布者','核准来源'],['适用期','对应问题'],['每项事实','逐一有据']],['常规与临时状态','按问题条件分别核对']);
 pair(out,5,paper('有适用依据',['公告标题 · 适用期','相关原句']),box(['依据不足时指出缺口','建议用户向服务台核实'],570,250,C.cream,44));
 pair(out,6,box(['建议向服务台询问','由用户决定是否继续'],570,240,C.blue,44),box(['不自动转发','用户的原问题'],530,240,C.mint,48));
 return scene('process',out);}
function resultCard(q){const r=M.decide(q);return paper(names[r.status],r.status==='open'?['按 D1 常规安排开放','不是现场状态保证']:r.status==='closed'?['D1 明确周末闭馆','不照搬周二答案']:r.status==='insufficient'?(q.temporary?['缺少适用检修通知','向图书馆服务台核实']:['D1 只适用于本学期','不能确定明年安排']):['范围检查时就停止','不检索、不推测']);}
function casePair(out,s,index){const q=M.cases[index];pair(out,s,box(q.label,550,240,C.blue,48),resultCard(q));}
function results(){const out=[];chapter(out,0,g(d1(),{s:.8}),'五个问题，逐一走到结果');
 casePair(out,1,0);note(out,1,'工作日 · 12 ≤ 15 < 18');
 pair(out,2,d1(),resultCard(M.cases[0]));note(out,2,'回答保留：本学期 · 常规安排');
 casePair(out,3,1);pair(out,4,d1(),resultCard(M.cases[1]));
 casePair(out,5,2);note(out,5,['即使是周二 15 点','检修条件也不能跳过']);
 casePair(out,6,3);note(out,6,'已有本学期安排，不能确定明年');
 casePair(out,7,4);note(out,7,'拒绝发生在检索之前');
 const list=p=>{let art='';M.cases.forEach((q,i)=>{const r=M.decide(q);const yy=(p?80:60)+i*(p?180:125),ww=p?740:1040;art+=g(rect(-ww/2,-60,ww,120,{fill:tint(r.status),r:12})+g(label(q.label,0,C.ink,p?34:40),{x:p?-140:-250})+g(label(names[r.status],0,r.status==='refuse'?C.coralInk:C.tealInk,p?36:42),{x:p?230:310}),{x:p?400:600,y:yy});});return art;};
 out.push(put(list(false),8,'five',[0,0],[0,0],{only:'l'}),put(list(true),8,'five',[0,0],[0,0],{only:'p'}));
 trio(out,9,[['开放 / 闭馆','都有公告依据'],['检修 / 明年','缺适用资料'],['索要住址','请求越界']],['资料不足可补证据','隐私越界不能靠多搜解决']);
 return scene('results',out);}
function revision(){const out=[];chapter(out,0,qBadge(110),'发现检修误答，修订检查流程');
 pair(out,1,paper('旧纸面规则',['只比星期和时间','检修题被误答为开放']),paper('修订后的规则',['先检查临时变化','缺通知则不作定论']));
 pair(out,2,box(['同样五题再复核','结果已修订'],550,240,C.mint,46),box(['同组案例复核','不能称为独立测试'],550,240,C.cream,46));
 trio(out,3,[['未参与设计','另备新例子'],['公告冲突','过期与遗漏'],['已有引用','仍可能误用']],['真实开发需另作验证','五题复核不代表 100% 可靠']);
 trio(out,4,[['图书馆','负责公告'],['管理员','来源与权限'],['服务负责人','处理错误 / 暂停']]);
 pair(out,5,paper('新的临时通知',['先核准来源','再核准适用期']),box(['核准后再更新资料库','来信不自动成为规定'],570,240,C.mint,44));
 return scene('revision',out);}
const cardWords=[['这道题的范围？','公开服务信息','可以继续'],['有适用依据吗？','D1 本学期常规安排','已有依据'],['周二 19 点结果？','18 点起已闭馆','按常规闭馆']];
const CARDS=cardWords.map((w,i)=>({id:'route'+i,question:w[0],answer:w[2],front:p=>label(w[0],p?-25:-40,C.ink,p?48:36)+label('点击核对',p?90:165,C.tealInk,36),back:p=>label(w[2],p?-25:-40,C.tealInk,p?50:42)+label(w[1],p?65:110,C.ink,p?42:32)}));
function challenge(){const out=[];chapter(out,0,g(d1(),{s:.8}),'周二 19 点：该走哪一条路？');
 pair(out,1,box(['本学期 · 周二 19 点','只问常规安排'],570,250,C.blue,46),d1());note(out,1,['范围外、缺少资料，','还是已有依据？']);
 pair(out,2,paper('D1 有适用依据',['工作日开放到 18 点']),box(['周二 19 点','按本学期常规已闭馆'],570,250,C.mint,44));
 pair(out,3,box(['19 点 · 常规安排','已有依据：闭馆'],550,240,C.mint,46),box(['15 点 · 临时检修','缺通知：资料不足'],550,240,C.cream,46));note(out,3,'是否缺证据，取决于问题条件');
 out.push(put(qBadge(100)+label(['根据哪份公告？','问的是哪一天？'],240,C.ink,46),4,'left',[300,280],[400,180]));
 out.push(put(d1(),4,'right',[900,280],[400,710],{d:140}));
 pair(out,5,paper('把 D1 递给同学',['再出一道题']),box(['指出依据在哪一行','或说清为什么不能答'],570,240,C.mint,44));
 return scene('challenge',out);}
module.exports=ctx=>[cover(ctx,g(d1(),{s:.85}),'查范围 · 查依据 · 查时效'),opening(),source(),process(),results(),revision(),challenge(),exercise(CARDS),references(ctx,['〔1〕UNESCO 学生能力框架','〔2〕RAG 原始论文','〔3〕生成回答的引用研究'],'虚构校园 · 规则纸面推演')];
module.exports.thumbnail=section=>{const icons=[g(d1(),{s:.65}),g(d1(),{s:.65}),magnifier(110),g(box(['五题','逐一核对'],330,230,C.mint,62),{s:1}),qBadge(110),g(d1(),{s:.65})];return '<svg class="toc-thumb" viewBox="-230 -190 460 380" aria-hidden="true" focusable="false">'+(section.mark==='源'?magnifier(110):icons[section.num])+'</svg>';};
