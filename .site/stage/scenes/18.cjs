'use strict';
const {C,esc,g,rect,line,arrow,qBadge,magnifier}=require('../art.cjs');
const {label,put,scene,chapter,cover,references,exercise}=require('../lesson.cjs');
const R=require('../venue-records.cjs');
const success=R.cases[0],missing=R.cases[1],venues=success.trace[0].result;
const box=(words,w=530,h=230,fill=C.blue,size=46)=>rect(-w/2,-h/2,w,h,{fill,r:14})+label(words,0,C.ink,size);
const paper=(title,words)=>rect(-275,-165,550,330,{fill:C.white,r:12})+line(-240,-65,240,-65,{sw:3})+label(title,-115,C.tealInk,44)+label(words,45,C.ink,46);
function pair(out,s,a,b){out.push(put(a,s,'left',[300,280],[400,220]),put(b,s,'right',[900,280],[400,660],{d:140}));}
function note(out,s,words){out.push(put(label(words,0,C.tealInk,44),s,'scope',[600,665],[400,940]));}
const task=()=>paper('活动条件',['本学期 · 周二 15—16 点','投影仪 · 必须有坡道']);
const candidate=i=>paper(venues[i].venue_id+' · '+venues[i].name,['本学期 · 周二 15—17 点','时间依据：'+venues[i].hours_source]);
const detail=unknown=>paper('E1 · 科学活动室',['投影仪：'+(unknown?'未知':'有'),'坡道：有']);
function checklist(after){
 const e=R.evidence(success,'V1',after?2:1);
 let art=g(label('V1 · 条件清单',0,C.tealInk,44),{x:400,y:25});
 [['本学期','period'],['周二 15—16 点','time'],['投影仪','equipment'],['必须有坡道','ramp']].forEach(([title,key],i)=>{
  const y=150+i*220,known=e[key]===true,source=known?(i<2?e.hoursSource:e.detailsSource):'待查';
  art+=g(rect(-370,-80,740,160,{fill:known?C.mint:C.cream,r:12})+g(label(title,0,C.ink,46),{x:-120})+g(label(known?'已确认 · '+source:'未知',0,known?C.tealInk:C.coralInk,44),{x:220}),{x:400,y});
 });return art;
}
function checklistBeat(out,s,after){
 out.push(put(checklist(after),s,'checklist',[300,20,.67],[0,0],{only:'l'}),put(checklist(after),s,'checklist',[0,0],[0,0],{only:'p'}));
}
function opening(){const out=[];
 pair(out,0,task(),box(['只给建议','不要预约'],530,240,C.mint,50));
 pair(out,1,paper('已查到',['场地开放时间']),box(['投影仪？','坡道？'],530,240,C.cream,52));note(out,1,'时间合适，还需要核对其余条件');
 pair(out,2,box(['虚构学校','固定资料'],530,240,C.blue,50),box(['预先写好的规则','逐步补齐依据'],530,240,C.mint,46));return scene('open',out);
}
function candidates(){const out=[];chapter(out,0,magnifier(110),['查到候选','还没满足所有条件']);
 pair(out,1,task(),box(['任务边界','只建议，不预约'],550,240,C.mint,48));
 pair(out,2,candidate(0),candidate(1));note(out,2,'Q1 · 查时期、星期与起止时间');
 const timeline=()=>rect(-500,-165,1000,330,{fill:C.white,r:14})+label('候选开放：15—17 点',-110,C.tealInk,46)+line(-390,35,390,35,{sw:8})+rect(-390,2,390,66,{fill:C.mint,r:8})+g(label('15',95,C.ink,44),{x:-390})+label('16',95,C.ink,44)+g(label('17',95,C.ink,44),{x:390})+g(label('活动 15—16 点',-40,C.ink,42),{x:-190});
 out.push(put(timeline(),3,'time',[600,300],[400,430,.72]));note(out,3,['活动 15—16 点','包含在两个候选的开放时段内']);
 pair(out,4,box(['时间已确认','S1 / S2'],530,240,C.mint,48),box(['设备：未知','坡道：未知'],530,240,C.cream,48));note(out,4,'未知条件，不能直接打勾');
 checklistBeat(out,5,false);return scene('candidates',out);
}
function chainArt(p){
 const words=[['Q1 · 查场地','时期 / 星期','起止时间'],['返回候选','V1 · S1','V2 · S2'],['Q2 · 读详情','带入编号 V1'],['返回 E1','投影仪：有','坡道：有']];let art='';
 words.forEach((w,i)=>{const x=p?400:150+i*300,y=p?110+i*250:300;
  art+=g(box(w,p?700:250,p?200:240,i%2?C.mint:C.blue,p?44:38),{x,y});
  if(i<3)art+=arrow(p?[[x,y+110],[x,y+140]]:[[x+140,y],[x+160,y]],{sw:5,head:p?18:12});
 });return art;
}
function chainBeat(out,s){out.push(put(chainArt(false),s,'chain',[0,0],[0,0],{only:'l'}),put(chainArt(true),s,'chain',[0,0],[0,0],{only:'p'}));}
function chain(){const out=[];chapter(out,0,g(detail(false),{s:.8}),['用上一次返回','补下一步的依据']);
 pair(out,1,paper('预设查找顺序',['按 V1、V2 顺序查详情','满足全部条件就停止']),paper('Q2 · 读场地详情',['场地编号：V1']));
 pair(out,2,detail(false),paper('证据分工',['S1：时期与时间','E1：投影仪与坡道']));
 pair(out,3,paper('建议：科学活动室',['依据：S1 ＋ E1','四项条件已有支持']),box(['本任务完成','未进行预约'],550,240,C.mint,48));
 chainBeat(out,4);
 checklistBeat(out,5,true);return scene('chain',out);
}
function modelLoop(p){
 const nodes=p?[[230,110],[230,390],[620,390],[230,710],[620,710]]:[[190,150],[630,150],[1050,150],[630,480],[190,480]];
 const words=[['模型','提出请求'],['请求有效','且允许？'],['不执行','说明问题'],['程序','执行工具'],['结果','交回模型']];let art='';
 const w=p?310:300,h=160;
 nodes.forEach(([x,y],i)=>art+=g(box(words[i],w,h,i===2?C.peach:i===4?C.mint:C.blue,p?44:40),{x,y}));
 const link=(pts)=>arrow(pts,{sw:5,head:18});
 if(p){art+=link([[230,200],[230,300]])+link([[395,390],[455,390]])+g(label('否',0,C.coralInk,44),{x:425,y:340})+link([[230,480],[230,620]])+g(label('是',0,C.tealInk,44),{x:170,y:550})+link([[395,710],[455,710]])+link([[620,620],[790,620],[790,15],[230,15],[230,20]]);art+=g(label(['任务、已有结果、可用工具','进入下一轮判断'],0,C.tealInk,44),{x:400,y:940});}
 else{art+=link([[350,150],[470,150]])+link([[790,150],[890,150]])+g(label('否',0,C.coralInk,40),{x:840,y:100})+link([[630,240],[630,390]])+g(label('是',0,C.tealInk,40),{x:570,y:315})+link([[470,480],[350,480]])+link([[190,390],[190,240]]);art+=g(label('任务、已有结果、可用工具进入下一轮判断',0,C.tealInk,44),{x:600,y:665});}
 return art;
}
function chooser(){const out=[];chapter(out,0,qBadge(110),'下一步，可以由谁决定');
 pair(out,1,box(['本地演示','预设规则安排顺序'],550,240,C.cream,46),box(['先查时间，再查详情','满足条件或缺资料时停'],570,240,C.mint,44));
 out.push(put(modelLoop(false),2,'loop',[0,0],[0,0],{only:'l'}),put(modelLoop(true),2,'loop',[0,0],[0,0],{only:'p'}));
 pair(out,3,paper('ReAct 研究',['思路、行动、环境反馈','交替继续']),box(['一种代表性方法','本地演示没有调用模型'],570,240,C.cream,44));return scene('chooser',out);
}
const routeNames=['条件满足','设备信息缺失','重复请求被拦','达到一步上限'];
function stopsArt(p){let art='';R.cases.forEach((c,i)=>{const s=R.summarize(c),x=p?400:(i%2?900:300),y=p?110+i*240:(i<2?150:500),w=p?740:550;
 const desc=i===0?'建议 V1 · S1 ＋ E1':i===1?'投影仪未知 · 不给建议':i===2?'设备、坡道仍待查':'设备、坡道仍待查';
 art+=g(rect(-w/2,-90,w,180,{fill:i===0?C.mint:C.cream,r:12})+label(routeNames[i]+' · '+s.calls+' 次',-35,C.tealInk,p?44:40)+label(desc,45,C.ink,p?42:36),{x,y});});return art;}
function stopBeat(out,s){out.push(put(stopsArt(false),s,'stops',[0,0],[0,0],{only:'l'}),put(stopsArt(true),s,'stops',[0,0],[0,0],{only:'p'}));}
function exits(){const out=[];chapter(out,0,qBadge(110),['停下来','要说明不同的原因']);
 pair(out,1,detail(true),box(['设备没记录','先保留为未知'],530,240,C.cream,48));note(out,1,'不能推出有投影仪，也不能推出没有');
 pair(out,2,box(['V1 投影仪未知','按本例规则先停'],550,240,C.cream,46),paper('V2 阅览活动室',['详情尚未读取','目前依据不足']));note(out,2,'不能推断所有候选都不合格');
 pair(out,3,paper('若要继续查 V2',['另定查找规则','给下一步留出次数']),box(['更换继续规则','仍须核对全部条件'],550,240,C.mint,46));
 pair(out,4,paper('另一种可能：读取故障',['说明失败步骤','按约定决定是否重试']),box(['错误消息','不是场地说明'],550,240,C.cream,48));note(out,4,['本段讨论可能情况','不是第五条实测路线']);
 pair(out,5,paper('Q1 · 已完成',['查同一时期、时段','返回 V1 与 V2']),paper('Q2 · 相同查找请求',['资料未变 · 被拦','实际仍只执行 1 次']));note(out,5,'多一张请求卡，没有多出新依据');
 pair(out,6,paper('特设上限：执行 1 次',['已取回 V1 与 V2','不再执行读详情']),box(['设备未核实','坡道未核实'],550,240,C.cream,48));
 pair(out,7,box(['到上限退出','任务尚未完成'],550,240,C.cream,48),box(['全部条件有依据','才能建议场地'],550,240,C.mint,48));
 stopBeat(out,8);return scene('exits',out);
}
const CARDS=[['equipment','投影仪一栏空白','未知，不能打勾','E1 没有设备记录'],['ramp','E1 坡道写着有','坡道有依据','设备仍须单独核对'],['time','S1 支持活动时段','时间有依据','不能代替设备详情']].map(([id,q,a,b])=>({id,question:q+'，能确认什么？',answer:a,front:p=>label(q,p?-25:-40,C.ink,p?48:36)+label('点击核对',p?90:165,C.tealInk,36),back:p=>label(a,p?-25:-40,C.tealInk,p?48:38)+label(b,p?65:110,C.ink,p?40:28)}));
function challenge(){const out=[];chapter(out,0,qBadge(110),['少一份表','接下来怎么办']);
 pair(out,1,detail(true),box(['有人把投影仪、坡道','全部打勾并建议 V1'],570,240,C.peach,44));note(out,1,'哪一项没有肯定证据？');
 pair(out,2,paper('缺资料',['有其他详情来源','可按规则与预算继续查']),paper('任务含义不清',['时段或坡道含义不明','才需要向用户澄清']));note(out,2,'重问已写清的时间，补不出设备表');
 stopBeat(out,3);
 pair(out,4,paper('下一期',['最初要求：必须有坡道']),qBadge(95)+label(['下一轮实际输入里','还保留着吗？'],230,C.ink,44));return scene('challenge',out);
}
function lab(){const out=[];chapter(out,0,g(task(),{s:.8}),['沿着保存的四条路线','再走一遍']);
 stopBeat(out,1);
 pair(out,2,paper('成功 / 缺资料',['请求卡 2 张','实际执行 2 次']),paper('重复 / 一步上限',['请求卡 2 张','实际执行 1 次']));note(out,2,'被拦请求另记，不算已执行调用');
 [['本地实验说明','../../Python实现/source/campus_agent_lab/README.md'],['保存的四条路线','../../Python实现/source/campus_agent_lab/outputs/reference/episode18/result.json']].forEach(([title,href],i)=>out.push(put('<a class="hit" href="'+esc(href)+'" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-label="'+title+'，打开本地文件">'+box([title,'点击打开'],570,250,C.mint,46)+'</a>',3,'experiment.'+i,[300+i*600,280],[400,220+i*440])));
 note(out,3,['固定资料与预设规则','没有调用真实语言模型']);return scene('lab',out);
}
module.exports=ctx=>[cover(ctx,g(task(),{s:.85}),'先查时间，再补条件'),opening(),candidates(),chain(),chooser(),exits(),challenge(),exercise(CARDS),lab(),references(ctx,['〔1〕ReAct 论文'],['构造资料与规则程序','不代表模型能力测评'])];
module.exports.thumbnail=section=>{const icons=[qBadge(110),magnifier(110),g(detail(false),{s:.65}),qBadge(110),qBadge(110),g(detail(true),{s:.65}),g(task(),{s:.65})];return '<svg class="toc-thumb" viewBox="-230 -190 460 380" aria-hidden="true" focusable="false">'+(section.mark==='源'?magnifier(110):icons[section.num])+'</svg>';};
