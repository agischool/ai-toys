'use strict';
const {C,esc,g,rect,line,arrow,qBadge,magnifier}=require('../art.cjs');
const {label,put,scene,chapter,cover,references,exercise}=require('../lesson.cjs');
const R=require('../acceptance-records.cjs'),good=R.groups.development.cases[0];
const box=(words,w=540,h=230,fill=C.blue,size=46)=>rect(-w/2,-h/2,w,h,{fill,r:14})+label(words,0,C.ink,size);
const paper=(title,words)=>rect(-275,-165,550,330,{fill:C.white,r:12})+line(-240,-65,240,-65,{sw:3})+label(title,-115,C.tealInk,44)+label(words,45,C.ink,46);
function pair(out,s,a,b){out.push(put(a,s,'left',[300,280],[400,220]),put(b,s,'right',[900,280],[400,660],{d:140}));}
function note(out,s,words){out.push(put(label(words,0,C.tealInk,44),s,'scope',[600,665],[400,940]));}
const requirement=()=>paper('原始任务',['本学期 · 周二','15—16 点 · 投影仪','必须有坡道']);
function dual(out,s,n,draw){out.push(put(draw(false),s,n,[0,0],[0,0],{only:'l'}),put(draw(true),s,n,[0,0],[0,0],{only:'p'}));}
function opening(){const out=[];
 pair(out,0,paper('最终建议',['阅览活动室 V2']),qBadge(100));note(out,0,'说完成了，用什么证明？');
 pair(out,1,paper('原始要求',['必须有坡道']),box(['E2 · V2 坡道：无','调用正常，任务仍做错'],570,250,C.cream,44));
 pair(out,2,requirement(),paper('把记录连起来',['要求 → 资料 → 建议']));return scene('open',out);
}
function matrix(p){const a=R.audit(good).checks,b=R.audit(R.faultCase).checks;
 const rows=[['适用期','本学期','本学期'],['周二 15—16','S1 · 覆盖','S2 · 覆盖'],['投影仪','E1 · 有','E2 · 有'],['坡道',a.ramp?'E1 · 有':'未通过',b.ramp?'E2 · 有':'E2 · 无'],['同场地来源','S1 / E1','S2 / E2']];
 const x=p?400:600,w=p?750:1080,cols=p?[-245,30,260]:[-360,0,350];let art=['验收项目','V1','V2'].map((s,j)=>g(label(s,0,C.tealInk,p?38:42),{x:x+cols[j],y:p?45:40})).join('');
 rows.forEach((r,i)=>{const y=(p?170:140)+i*(p?170:110);art+=g(rect(-w/2,-(p?66:42),w,p?132:84,{fill:i===3?C.cream:C.white,r:12})+r.map((s,j)=>g(label(s,0,i===3&&j===2?C.coralInk:C.ink,p?38:40),{x:cols[j]})).join(''),{x,y});});return art;
}
function task(){const out=[];chapter(out,0,g(requirement(),{s:.8}),'先写清楚什么算完成');
 pair(out,1,requirement(),box(['只给建议','不要预约'],540,240,C.mint,48));
 pair(out,2,paper('V1 · 科学活动室',['S1 · 周二 15—17 点']),paper('V2 · 阅览活动室',['S2 · 周二 15—17 点']));note(out,2,'两张时间表适用于本学期');
 pair(out,3,paper('E1 · V1 设备表',['投影仪：有','坡道：有']),paper('E2 · V2 设备表',['投影仪：有','坡道：无']));note(out,3,'编号是本例的构造标签');
 dual(out,4,'conditions',matrix);
 pair(out,5,paper('可以推荐 V1',['S1 支持时期与时段','E1 支持设备与坡道']),box(['建议 + 对应依据','没有预约'],550,250,C.mint,46));
 pair(out,6,paper('回答又写：',['“已预约成功”']),box(['超出只建议的边界','也没有预约操作证据'],570,250,C.cream,44));return scene('task',out);
}
function trio(p,items){let art='';items.forEach((item,i)=>{const x=p?400:210+i*390,y=p?150+i*335:300,w=p?700:350,h=p?250:350;art+=g(rect(-w/2,-h/2,w,h,{fill:item[2]||C.blue,r:12})+label(item[0],p?-65:-100,C.tealInk,p?48:40)+label(item[1],p?30:45,C.ink,p?44:38),{x,y});});return art;}
const outcomeItems=[['任务成功',['条件有证据','完成推荐'],C.mint],['恰当停止',['说明缺口','未完成推荐'],C.blue],['错误完成',['条件不符','仍宣称完成'],C.cream]];
function plan(){const out=[];chapter(out,0,magnifier(110),'把检查办法也提前写好');
 dual(out,1,'parts',p=>trio(p,[['原始任务',['推荐的条件','只建议不预约']],['环境与权限',['可查的资料','可做的操作']],['验收条件',['逐项对证据','核对最终结果']]]));
 pair(out,2,requirement(),paper('检查者拿到',['时间表与设备表','逐项验收 · 只建议']));
 pair(out,3,paper('测试之前写清',['任务、环境、验收条件']),box(['看过答案再改要求','会让成绩失去意义'],570,250,C.cream,44));note(out,3,'资料缺失时，不能要求凭空猜中');
 pair(out,4,paper('拿错例试检查办法',['V2 无坡道仍被推荐']),box(['出现“完成”两字','不能直接放行'],550,240,C.cream,46));
 pair(out,5,paper('两种相同的建议',['“可以考虑科学活动室”','“建议科学活动室”']),box(['核对内容和依据','说法不同不应判错'],550,240,C.mint,46));return scene('plan',out);
}
function outcomes(){const out=[];chapter(out,0,qBadge(110),'把三种结果分开记');
 pair(out,1,paper('任务成功 · D01',['V1 的 S1 + E1','所有条件逐项通过']),box(['完成推荐','查了几次另记'],540,240,C.mint,48));
 pair(out,2,paper('假设材料不足',['E1 坡道：未知','V2 坡道：无']),box(['说明缺口后停止','没有完成推荐'],550,250,C.blue,46));
 pair(out,3,paper('错误完成 · 故障演示',['E2 坡道：无','却把 V2 判为合格']),box(['工具正常返回','仍然用错了证据'],550,250,C.cream,46));
 dual(out,4,'outcomes',p=>trio(p,outcomeItems));
 pair(out,5,paper('D01 · 成功推荐',[good.run.tool_calls+' 次工具调用','V1 · S1 / E1']),paper('另设故障 · 错误完成',[R.fault.run.tool_calls+' 次工具调用','V2 · 坡道不符']));note(out,5,['过程、结果与花费分开看','本记录未提供耗时测量']);return scene('outcomes',out);
}
function loopArt(p){const items=[['发现错误','改规则'],['原题再跑','回归检查'],['核对过程','保留结果']];let art=trio(p,items.map(a=>[a[0],[a[1]],C.blue]));
 for(let i=0;i<2;i++)art+=arrow(p?[[400,285+i*335],[400,345+i*335]]:[[390+i*390,300],[420+i*390,300]],{sw:5,head:16});return art;}
function sets(){const out=[];chapter(out,0,magnifier(110),['换一批题','才能问新的问题']);
 dual(out,1,'regression',loopArt);
 pair(out,2,paper('开发时用的题',['发现错误、修改规则']),box(['事先留出另一批','定下方案后再打开'],570,250,C.mint,46));
 pair(out,3,paper('原先留出的题',['看过后又据此改规则']),box(['也进入了练习过程','需重新说明使用边界'],570,250,C.cream,44));
 pair(out,4,paper('6 个开发案例',['现已公开']),paper('6 个保留案例',['现已公开']));note(out,4,['两组共同用于代码回归','不是未见盲测或独立模型评估']);
 pair(out,5,paper('若以后接入真实模型',['版本 · 材料 · 工具','另备合适的检查题']),box(['保留每一次尝试','只选最好一次会漏结果'],570,250,C.cream,44));return scene('sets',out);
}
function routeArt(p){const steps=[['原始任务','必须有坡道'],['Q1 返回','S1 / S2 时段'],['Q2 读 V2','E2 坡道：无'],['仍判 V2 合格','首次明确偏离']];let art='';
 steps.forEach((w,i)=>{const x=p?400:150+i*300,y=p?110+i*250:300;art+=g(box(w,p?700:260,p?200:250,i===3?C.cream:C.blue,p?46:38),{x,y});if(i<3)art+=arrow(p?[[x,y+110],[x,y+140]]:[[x+140,y],[x+160,y]],{sw:5,head:p?18:12});});return art;}
function trace(){const out=[];chapter(out,0,qBadge(110),['找到第一次','偏离要求的位置']);
 dual(out,1,'route',routeArt);
 pair(out,2,paper('哪一步第一次偏离？',['读 V2？收到 E2？','还是把 V2 判为合格？']),qBadge(100));
 pair(out,3,paper('拿得出的依据',['原始要求：必须有坡道','E2：V2 没有坡道']),box(['条件与证据冲突','不能宣称合格'],550,240,C.cream,46));
 pair(out,4,paper('本地规则程序',['人预先写好步骤']),box(['换一条建议也照样核对','原要求 → 资料 → 结论'],570,250,C.mint,44));return scene('trace',out);
}
const CARDS=[['read','选择读 V2','仍可排查候选','读取本身没有违背任务'],['evidence','E2 写坡道无','拿到了不符证据','下一步应依此核对条件'],['decision','仍把 V2 判合格','首次明确偏离','与必须有坡道直接冲突']].map(([id,q,a,b])=>({id,question:q+'，是否已经偏离任务？',answer:a,front:p=>label(q,p?-25:-40,C.ink,p?48:36)+label('点击核对',p?90:165,C.tealInk,36),back:p=>label(a,p?-25:-40,C.tealInk,p?48:38)+label(b,p?65:110,C.ink,p?40:28)}));
const reasons={D01:'资料完整',D02:'缺设备表',D03:'均无坡道',D04:'缺明年资料',D05:'详情冲突',D06:'读取故障',H01:'时段不足',H02:'V2补齐坡道',H03:'坡道未知',H04:'缺周一资料',H05:'查询故障',H06:'资料过期'};
function table(p,key){const group=R.groups[key],x=p?400:600,w=p?750:1080;let art=g(label((key==='development'?'开发案例':'保留案例')+' · 现已公开',0,C.tealInk,46),{x,y:p?35:20});
 group.cases.forEach((c,i)=>{const a=R.audit(c),y=(p?145:110)+i*(p?142:105),success=a.task_completed;
 art+=g(rect(-w/2,-(p?52:43),w,p?104:86,{fill:success?C.mint:C.white,r:12})+g(label(c.case_id+' · '+reasons[c.case_id],0,C.ink,p?36:40),{x:p?-180:-300})+g(label(success?'任务成功':'恰当停止',0,success?C.tealInk:C.ink,p?38:40),{x:p?100:140})+g(label(c.run.tool_calls+' 次',0,C.ink,p?38:40),{x:p?290:430}),{x,y});});return art;}
function lab(){const out=[];chapter(out,0,magnifier(110),'想自己核对每一道题');
 dual(out,1,'development',p=>table(p,'development'));dual(out,2,'reserved',p=>table(p,'reserved'));
 const a=R.audit(R.faultCase),count=Object.values(a.checks).filter(Boolean).length;
 pair(out,3,paper('另设故障 · 逐项重算',[count+' 项通过 · 坡道不通过','不信“合格”的自报标志']),box(['判为错误完成','不计入两组六题分母'],570,250,C.cream,44));
 const dc=R.tally(R.groups.development.cases),hc=R.tally(R.groups.reserved.cases);
 pair(out,4,paper('每组分别记录',['开发：'+dc.task_success+' 成功 / '+dc.appropriate_stop+' 停止','保留：'+hc.task_success+' 成功 / '+hc.appropriate_stop+' 停止']),box(['公开构造题 · 固定规则','没有真实模型参与'],570,250,C.mint,44));note(out,4,'停止不是成功推荐，故障例另计');
 [['本地实验说明','../../Python实现/source/campus_agent_lab/README.md'],['两组题与故障记录','../../Python实现/source/campus_agent_lab/outputs/reference/episode20/result.json']].forEach(([title,href],i)=>out.push(put('<a class="hit" href="'+esc(href)+'" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-label="'+title+'，打开本地文件">'+box([title,'点击打开'],570,250,C.mint,46)+'</a>',5,'experiment.'+i,[300+i*600,280],[400,220+i*440])));
 note(out,5,['固定结构核对，不解析任意回答','停止原因对照预先案例标签']);return scene('lab',out);
}
module.exports=ctx=>[cover(ctx,g(requirement(),{s:.85}),'完成的证据，逐项核对'),opening(),task(),plan(),outcomes(),sets(),trace(),exercise(CARDS),lab(),references(ctx,['〔1〕评测任务与检查办法','〔2〕轨迹、状态与预算'],['公开教学案例 · 规则执行','不代表真实模型能力测评'])];
module.exports.thumbnail=section=>{const icons=[qBadge(110),g(requirement(),{s:.65}),magnifier(110),qBadge(110),magnifier(110),qBadge(110),magnifier(110)];return '<svg class="toc-thumb" viewBox="-230 -190 460 380" aria-hidden="true" focusable="false">'+(section.mark==='源'?magnifier(110):icons[section.num])+'</svg>';};
