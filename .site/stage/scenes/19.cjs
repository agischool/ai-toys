'use strict';
const {C,esc,g,rect,line,arrow,qBadge,magnifier}=require('../art.cjs');
const {label,put,scene,chapter,cover,references,exercise}=require('../lesson.cjs');
const R=require('../context-records.cjs'),byMode=Object.fromEntries(R.comparisons.map(c=>[c.mode,c]));
const box=(words,w=530,h=230,fill=C.blue,size=46)=>rect(-w/2,-h/2,w,h,{fill,r:14})+label(words,0,C.ink,size);
const paper=(title,words)=>rect(-275,-165,550,330,{fill:C.white,r:12})+line(-240,-65,240,-65,{sw:3})+label(title,-115,C.tealInk,44)+label(words,45,C.ink,46);
function pair(out,s,a,b){out.push(put(a,s,'left',[300,280],[400,220]),put(b,s,'right',[900,280],[400,660],{d:140}));}
function note(out,s,words){out.push(put(label(words,0,C.tealInk,44),s,'scope',[600,665],[400,940]));}
const ramp=()=>paper('C1 · 用户要求',['场地必须有坡道']);
const short={C1:['必须有坡道'],C2:['本学期周二','15—16 点'],C3:['需要投影仪'],C4:['V1 科学活动室','周二 15—17 点','投影仪有 · 坡道有'],C5:['V2 阅览活动室','周二 15—17 点','投影仪有 · 坡道无'],C6:['只给建议','不预约']};
function card(c,p,large=false){const w=large?(p?700:350):350,h=large?(p?250:350):270,size=p?40:38;
 return rect(-w/2,-h/2,w,h,{fill:c.kind==='requirement'?C.mint:C.blue,r:12})+label(c.id+' · '+(c.kind==='requirement'?'要求':'场地事实'),large&&!p?-120:-90,C.tealInk,p?42:38)+label(short[c.id],35,C.ink,size);
}
function grid(p,mode='full',ids){const selected=ids?R.originalCards.filter(c=>ids.includes(c.id)):R.select(R.originalCards,mode);let art='';
 const six=selected.length>3;
 selected.forEach((c,i)=>{const x=p?(six?210+(i%2)*380:400):210+i%3*390,y=p?(six?155+Math.floor(i/2)*315:170+i*310):(six?170+Math.floor(i/3)*330:310);
 art+=g(card(c,p,!six),{x,y});});
 if(mode==='last_three')art+=g(label('C1 / C2 / C3 未送入',0,C.coralInk,p?44:42),{x:p?400:600,y:p?970:655});
 return art;
}
function gridBeat(out,s,mode='full',ids){out.push(put(grid(false,mode,ids),s,'cards',[0,0],[0,0],{only:'l'}),put(grid(true,mode,ids),s,'cards',[0,0],[0,0],{only:'p'}));}
function opening(){const out=[];
 pair(out,0,ramp(),qBadge(100));note(out,0,'最早的要求，最后还看得见吗？');
 pair(out,1,paper('聊天页面',['记录越来越长','仍能翻到 C1']),box(['这一轮实际输入','也带上了 C1 吗？'],550,240,C.cream,46));
 pair(out,2,box(['六张信息卡','只检查输入材料'],550,240,C.blue,48),box(['整理方法改变','留下的内容会变化'],550,240,C.mint,46));return scene('open',out);
}
function storage(){const out=[];chapter(out,0,g(ramp(),{s:.8}),'先分清三个存放位置');
 pair(out,1,paper('模型参数',['训练时调整的数值','决定怎样处理输入']),paper('工具请求参数',['请求卡填写的条件','例如时期、场地编号']));note(out,1,'把要求写进聊天，改变的是这次材料');
 pair(out,2,paper('聊天页面',['完整记录']),box(['这一轮上下文','程序实际交给模型的输入'],570,240,C.mint,44));note(out,2,['任务要求、选定聊天、工具返回','可以组成这一轮输入']);
 pair(out,3,paper('外部文件',['单独保存 C1 原话']),box(['需要时找出来','放进这一轮输入'],550,240,C.mint,46));note(out,3,'文件里有，还要实际读回输入');
 pair(out,4,paper('页面仍能翻到 C1',['只说明原记录还在']),box(['先检查这一轮输入','是否实际包含 C1'],550,240,C.cream,46));return scene('storage',out);
}
function overview(p){const names=[['全文','六卡全部保留'],['末三卡','C4 / C5 / C6'],['人工摘要','完整、漏坡道两版'],['按条件检索','条件卡再附场地卡']];let art='';
 names.forEach((a,i)=>art+=g(box(a,p?740:550,p?180:230,i===1?C.cream:C.blue,p?44:42),{x:p?400:300+i%2*600,y:p?110+i*240:160+Math.floor(i/2)*350}));return art;
}
function overviewBeat(out,s){out.push(put(overview(false),s,'modes',[0,0],[0,0],{only:'l'}),put(overview(true),s,'modes',[0,0],[0,0],{only:'p'}));}
function cards(){const out=[];chapter(out,0,magnifier(110),['六张卡','装进不同的输入']);
 gridBeat(out,1,'full',['C1','C2','C3']);
 // 两张场地卡横竖屏分开摆，保留V1/V2与原编号。
 R.originalCards.filter(c=>['C4','C5'].includes(c.id)).forEach((c,i)=>out.push(put(card(c,false,true),2,'venue.'+c.id,[300+i*600,280],[0,0],{only:'l'}),put(card(c,true,true),2,'venue.'+c.id,[0,0],[400,230+i*450],{only:'p'})));
 gridBeat(out,3);gridBeat(out,4);gridBeat(out,5,'last_three');
 pair(out,6,paper('C4 / C5 · 场地事实',['V1 有坡道','V2 没坡道']),box(['C1 的硬性要求','没有送进来'],550,240,C.cream,48));note(out,6,'场地事实，不能代替用户的要求');
 pair(out,7,box(['只留最后三张','是特设的实验上限'],550,240,C.cream,46),box(['场地资料还在','挑选的要求少了一部分'],570,240,C.blue,44));
 overviewBeat(out,8);return scene('cards',out);
}
function summaryCard(mode,p){const a=R.inspect(byMode[mode]),good=a.present.ramp_required;
 const rows=['本学期周二 15—16 点','需要投影仪',good?'必须有坡道':'坡道要求：未写','只给建议，不预约'];
 let art=rect(-(p?740:550)/2,-(p?420:520)/2,p?740:550,p?420:520,{fill:good?C.mint:C.cream,r:12});
 art+=label((good?'H1 · 完整摘要':'H2 · 漏项摘要'),p?-160:-200,C.tealInk,44);
 rows.forEach((row,i)=>art+=label(row,(p?-65:-80)+i*(p?65:80),i===2&&!good?C.coralInk:C.ink,p?44:40));return art;
}
function summaryPair(out,s){out.push(put(summaryCard('manual_summary_good',false),s,'summary.good',[300,300],[0,0],{only:'l'}),put(summaryCard('manual_summary_missing_ramp',false),s,'summary.missing',[900,300],[0,0],{only:'l'}),put(summaryCard('manual_summary_good',true),s,'summary.good',[0,0],[400,230],{only:'p'}),put(summaryCard('manual_summary_missing_ramp',true),s,'summary.missing',[0,0],[400,720],{only:'p'}));}
function summary(){const out=[];chapter(out,0,g(paper('人工摘要',['回到原要求逐项核对']),{s:.8}),['摘要短了','条件可能跟着少了']);
 pair(out,1,paper('人工完整摘要 H1',['时期、时段、投影仪','必须有坡道、只建议']),box(['由人事先编写','不是模型压缩的实测'],570,240,C.cream,44));
 summaryPair(out,2);
 pair(out,3,paper('只问：坡道必须有吗？',['H1：保留了要求']),box(['H2：漏掉了要求','读起来顺仍不够'],550,240,C.cream,46));
 pair(out,4,paper('实际系统可能用模型',['压缩历史内容']),box(['怎样决定保留什么','仍要核对后续约束'],550,240,C.cream,46));return scene('summary',out);
}
function retrievalArt(p){const steps=[['外部原记录','保存六张卡'],['按 kind 字段','取回条件卡','C1 C2 C3 C6'],['附上场地','结果 C4 / C5'],['这一轮输入','六卡齐备']];let art='';
 steps.forEach((w,i)=>{const x=p?400:150+i*300,y=p?110+i*250:300;art+=g(box(w,p?700:250,p?200:240,i===3?C.mint:C.blue,p?44:38),{x,y});if(i<3)art+=arrow(p?[[x,y+110],[x,y+140]]:[[x+140,y],[x+160,y]],{sw:5,head:p?18:12});});return art;
}
function retrievalBeat(out,s){out.push(put(retrievalArt(false),s,'route',[0,0],[0,0],{only:'l'}),put(retrievalArt(true),s,'route',[0,0],[0,0],{only:'p'}));}
function retrieve(){const out=[];chapter(out,0,g(ramp(),{s:.8}),['从外部记录','把条件读回来']);
 pair(out,1,paper('先保存在外部',['保留原记录']),box(['做场地建议时','按规则检索任务条件'],550,240,C.mint,46));
 retrievalBeat(out,2);
 pair(out,3,ramp(),paper('C4 · 场地事实',['V1 有坡道']));note(out,3,['找到场地事实','不等于找到了用户硬性要求']);
 pair(out,4,paper('任务来源与适用范围',['这次活动的要求']),box(['旧活动的条件','需要另行区分'],550,240,C.cream,46));
 gridBeat(out,5,'retrieve_requirements');return scene('retrieve',out);
}
function layers(out,s){pair(out,s,box(['要求有没有进入输入','本例的文本检查'],570,240,C.mint,44),box(['建议有没有遵守要求','需要实际回答与任务验证'],570,240,C.cream,44));note(out,s,'两层问题，要分别检查');}
function use(){const out=[];chapter(out,0,qBadge(110),['信息还在','也不等于一定用对']);
 layers(out,1);
 const positions=['开头','中间','结尾'];positions.forEach((name,i)=>out.push(put(box(['相关材料在'+name],350,230,i===1?C.cream:C.blue,40),2,'position.'+i,[210+i*390,280],[0,0],{only:'l'}),put(box(['相关材料在'+name],700,220,i===1?C.cream:C.blue,44),2,'position.'+i,[0,0],[400,150+i*310],{only:'p'})));
 note(out,2,['Lost in the Middle','比较论文当时模型与任务']);
 pair(out,3,paper('多文档问答等设置',['材料在中间时','常较难利用']),box(['结果随任务、模型而异','部分键值查找接近满分'],570,240,C.cream,42));note(out,3,'不能外推到当前所有模型');
 layers(out,4);layers(out,5);return scene('use',out);
}
const CARDS=[['fact','V1 有坡道','这是场地事实','不能反推用户的硬性要求'],['requirement','C1 必须有坡道','这是任务要求','仍要检查本轮是否送入'],['booking','没有写预约','不能当作允许预约','回原记录核对操作边界']].map(([id,q,a,b])=>({id,question:q+'，能说明什么？',answer:a,front:p=>label(q,p?-25:-40,C.ink,p?48:36)+label('点击核对',p?90:165,C.tealInk,36),back:p=>label(a,p?-25:-40,C.tealInk,p?48:38)+label(b,p?65:110,C.ink,p?40:28)}));
function challenge(){const out=[];chapter(out,0,qBadge(110),['给下一轮','留一份可核对的记录']);
 pair(out,1,paper('短记录要能核对',['学期、日期与时段','设备、坡道硬性要求']),box(['允许做到哪一步？','只建议，不预约'],570,240,C.mint,46));
 pair(out,2,box(['先查本轮输入','条件有没有保留'],550,240,C.mint,46),paper('下一期',['连起任务、查询、建议','继续检查有没有遵守']));return scene('challenge',out);
}
const modeNames=['六卡全文','末三卡','完整人工摘要','漏坡道摘要','按条件检索'];
function savedArt(p){let art='';R.comparisons.forEach((c,i)=>{const r=R.inspect(c),w=p?740:1040,y=(p?110:90)+i*(p?175:135);art+=g(rect(-w/2,-(p?65:55),w,p?130:110,{fill:r.present.ramp_required?C.mint:C.cream,r:12})+g(label(modeNames[i],0,C.ink,p?42:40),{x:p?-190:-290})+g(label(r.ids.length+' 张 · '+(r.present.ramp_required?'保留坡道要求':'漏坡道要求'),0,r.present.ramp_required?C.tealInk:C.coralInk,p?40:40),{x:p?145:230}),{x:p?400:600,y});});return art;}
function lab(){const out=[];chapter(out,0,g(ramp(),{s:.8}),['看看这些卡片','怎样进入程序']);
 out.push(put(savedArt(false),1,'records',[0,0],[0,0],{only:'l'}),put(savedArt(true),1,'records',[0,0],[0,0],{only:'p'}));
 pair(out,2,paper('固定短语检查',['“必须有坡道”','等教学文本中的短语']),box(['只检查短语有没有留下','不判断任意改写的意思'],570,240,C.cream,44));
 pair(out,3,paper('卡片',['本例的计数办法']),box(['模型把文字切成 token','一张长卡可能有很多片'],570,240,C.blue,44));
 const full=R.inspect(byMode.full),retrieved=R.inspect(byMode.retrieve_requirements);
 pair(out,4,paper('全文输入',[full.ids.length+' 张卡',full.characters+' 个字符']),paper('检索后的输入',[retrieved.ids.length+' 张卡',retrieved.characters+' 个字符']));note(out,4,['字符不是 token','未测输入空间节省']);
 [['本地实验说明','../../Python实现/source/campus_agent_lab/README.md'],['保存的五组对照','../../Python实现/source/campus_agent_lab/outputs/reference/episode19/result.json']].forEach(([title,href],i)=>out.push(put('<a class="hit" href="'+esc(href)+'" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-label="'+title+'，打开本地文件">'+box([title,'点击打开'],570,250,C.mint,46)+'</a>',5,'experiment.'+i,[300+i*600,280],[400,220+i*440])));
 note(out,5,['人工摘要与固定规则','没有调用真实模型']);return scene('lab',out);
}
module.exports=ctx=>[cover(ctx,g(ramp(),{s:.85}),'记录还在，输入里呢？'),opening(),storage(),cards(),summary(),retrieve(),use(),challenge(),exercise(CARDS),lab(),references(ctx,['〔1〕上下文工程说明','〔2〕Lost in the Middle 论文'],['固定文本保留检查','不代表模型正确使用了材料'])];
module.exports.thumbnail=section=>{const icons=[qBadge(110),g(ramp(),{s:.65}),magnifier(110),g(paper('人工摘要',['逐项核对条件']),{s:.65}),g(ramp(),{s:.65}),qBadge(110),qBadge(110),g(ramp(),{s:.65})];return '<svg class="toc-thumb" viewBox="-230 -190 460 380" aria-hidden="true" focusable="false">'+(section.mark==='源'?magnifier(110):icons[section.num])+'</svg>';};
