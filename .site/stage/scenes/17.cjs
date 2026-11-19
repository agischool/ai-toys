'use strict';
const {C,esc,g,rect,line,arrow,qBadge,magnifier}=require('../art.cjs');
const {label,put,scene,chapter,cover,references,exercise}=require('../lesson.cjs');
const R=require('../tool-records.cjs'),summary=R.cases.map(c=>R.summarize(c.event));
const D1=R.cases[0].event.result[0],Q1=R.cases[0].event;
const box=(words,w=530,h=230,fill=C.blue,size=48)=>rect(-w/2,-h/2,w,h,{fill,r:14})+label(words,0,C.ink,size);
const paper=(title,words)=>rect(-275,-165,550,330,{fill:C.white,r:12})+line(-240,-65,240,-65,{sw:3})+label(title,-115,C.tealInk,44)+label(words,45,C.ink,46);
const ticket=()=>paper(Q1.request_id+' · 查公告',['设施：'+Q1.args.facility,'适用期：'+Q1.args.period]);
const notice=()=>paper(D1.doc_id+' · '+D1.period,['工作日 12:00—18:00','周末闭馆']);
function pair(out,s,a,b){out.push(put(a,s,'left',[300,280],[400,220]));out.push(put(b,s,'right',[900,280],[400,660],{d:140}));}
function note(out,s,words){out.push(put(label(words,0,C.tealInk,44),s,'scope',[600,665],[400,940]));}
function trio(out,s,words,annotation){words.forEach((w,i)=>out.push(put(box(w,340,180,i===2?C.mint:C.blue,44),s,'item.'+i,[210+i*390,280],[400,140+i*310])));if(annotation)note(out,s,annotation);}
function opening(){const out=[];pair(out,0,paper('一句回答',['“我查到了”','周二下午开放']),qBadge(100));note(out,0,'遮住回答，翻开这次查找的记录');return scene('open',out);}
function roleArt(p){
 const there=[['用户','提问题'],['模型角色','预设请求'],['执行程序','校验与调用'],['公告工具','查找资料']];
 const back=[['用户','接收回答'],['模型角色','规则填回答'],['执行程序','交回结果'],['公告工具','返回材料']];
 const w=p?300:250,h=p?130:160;let art='';
 const point=(i,ret)=>p?[ret?610:210,140+i*230]:[150+i*300,ret?500:170];
 [there,back].forEach((items,ret)=>items.forEach((word,i)=>{const [x,y]=point(i,ret);art+=g(box(word,w,h,ret?C.mint:C.blue,40),{x,y});if(i<3){const [nx,ny]=point(i+1,ret),margin=p?80:140;const a=p?[[x,y+margin],[nx,ny-margin]]:[[x+margin,y],[nx-margin,ny]];art+=arrow(ret?[...a].reverse():a,{sw:5,head:p?18:13});}}));
 const [x,y]=point(3,0),[nx,ny]=point(3,1);
 art+=arrow(p?[[x+w/2+8,y],[nx-w/2-8,ny]]:[[x,y+h/2+8],[nx,ny-h/2-8]],{sw:5,head:18});
 art+=p?g(label('请求去程',0,C.tealInk,40),{x:210,y:25})+g(label('结果回程',0,C.tealInk,40),{x:610,y:25}):g(label('提出问题与请求',0,C.tealInk,42),{x:600,y:30})+g(label('结果经执行程序返回，由规则填写回答',0,C.tealInk,40),{x:600,y:665});
 return art;
}
function roleBeat(out,s){out.push(put(roleArt(false),s,'roles',[0,0],[0,0],{only:'l'}),put(roleArt(true),s,'roles',[0,0],[0,0],{only:'p'}));}
function roles(){const out=[];chapter(out,0,magnifier(110),'一句回答，还要有查找记录');
 pair(out,1,notice(),box(['本学期普通周二 15 点','按常规安排开门吗？'],570,240,C.blue,44));
 pair(out,2,paper('同学甲',['刚读过 D1','回答：开放']),paper('同学乙',['记得上学期的安排','回答：开放']));note(out,2,'答案相同，不能看出有没有核对');
 roleBeat(out,3);
 pair(out,4,box(['请求与回答','由规则代演模型'],550,240,C.cream,46),box(['校验、查找与返回','由本地程序实际执行'],570,240,C.mint,44));
 return scene('roles',out);}
function request(){const out=[];chapter(out,0,g(ticket(),{s:.8}),'先写清工具与查找条件');
 pair(out,1,box(['工具：查公告']),paper('需要的两个条件',['设施','适用期']));
 pair(out,2,ticket(),box(['返回结果也带 Q1','连接同一张请求卡'],550,240,C.mint,46));note(out,2,'Q1 是这次示例安排的请求编号');
 trio(out,3,[['工具名称','查公告'],['设施','图书馆'],['适用期','本学期']],['按约定位置填写','程序不从聊天段落里猜']);
 pair(out,4,paper('CS329Z 教学作业',['设计请求格式','程序读取与检查']),box(['格式可以不同','共同点：把动作交给程序'],570,240,C.mint,44));
 return scene('request',out);}
function gateArt(p){const x=p?210:340,right=p?610:930,ys=p?[120,440,800]:[100,345,620],w=p?300:410;let art='';
 const node=(xx,yy,words,fill)=>g(box(words,w,140,fill,38),{x:xx,y:yy});
 art+=node(x,ys[0],['有这个','工具吗？'],C.blue)+node(right,ys[0],['工具未知','不执行查找'],C.peach);
 art+=node(x,ys[1],['查找条件','符合约定？'],C.blue)+node(right,ys[1],['参数无效','不执行查找'],C.peach);
 art+=node(x,ys[2],['通过检查','才调用工具'],C.mint);
 for(let i=0;i<2;i++){art+=arrow([[x+w/2+8,ys[i]],[right-w/2-8,ys[i]]],{sw:5,head:18})+g(label('否',-35,C.coralInk,36),{x:(x+right)/2,y:ys[i]});art+=arrow([[x,ys[i]+78],[x,ys[i+1]-78]],{sw:5,head:18})+g(label('是',0,C.tealInk,36),{x:x-60,y:(ys[i]+ys[i+1])/2});}
 return art;}
function gate(){const out=[];chapter(out,0,qBadge(110),'先检查卡片，再执行');
 out.push(put(gateArt(false),1,'gate',[0,0],[0,0],{only:'l'}),put(gateArt(true),1,'gate',[0,0],[0,0],{only:'p'}));
 pair(out,2,paper('不存在的工具',['“查全部资料”','返回工具未知']),paper('Q3 · 漏填设施',['返回参数无效','未执行工具']));note(out,2,'两种错误都拦在查找之前');
 pair(out,3,box(['检查通过','实际调用工具'],550,240,C.mint,46),box(['可能正常返回','也可能读取故障'],550,240,C.cream,46));
 pair(out,4,box(['请求写错了','改请求'],530,240,C.blue,48),box(['读取失败了','处理工具故障'],530,240,C.cream,48));note(out,4,'不能一律说成“没查到”');
 return scene('gate',out);}
function returnCard(index){const s=summary[index];return paper(s.id+(s.status==='ok'?' · 正常返回':' · 读取故障'),s.outcome==='found'?['找到 '+s.matches+' 份公告 · D1','有本学期常规安排']:s.outcome==='empty'?['0 条匹配','没有明年安排']:['查询没有完成','不能确认有没有公告']);}
function returns(){const out=[];chapter(out,0,g(notice(),{s:.8}),'查找完成，还要看返回了什么');
 pair(out,1,ticket(),returnCard(0));note(out,1,'按 D1 常规安排，周二 15 点开放');
 roleBeat(out,2);
 pair(out,3,paper('Q2 · 查公告',['设施：图书馆','适用期：明年']),returnCard(1));note(out,3,'正常完成查询，不代表找到了答案');
 pair(out,4,paper('现有资料',['只有本学期 D1']),box(['没有明年安排','不能拿本学期补结论'],550,240,C.cream,46));
 pair(out,5,paper('Q4 · 已调用工具',['人为安排的读取故障']),returnCard(3));note(out,5,'没查完，与查完后没有匹配要分开');
 [0,1,3].forEach((index,i)=>{const s=summary[index],title=s.id+(s.status==='ok'?' · 查找完成':' · 读取失败'),words=s.outcome==='found'?['有材料：1 份 D1']:s.outcome==='empty'?['无匹配：0 份']:['尚未查明'];const fill=s.outcome==='found'?C.mint:s.outcome==='failed'?C.peach:C.cream;
 const art=p=>rect(-(p?690:350)/2,-(p?220:320)/2,p?690:350,p?220:320,{fill,r:14})+label(title,p?-45:-75,C.tealInk,p?46:36)+label(words,p?45:65,C.ink,p?48:36);
 out.push(put(art(false),6,'return.'+i,[210+i*390,290],[0,0],{only:'l'}),put(art(true),6,'return.'+i,[0,0],[400,150+i*320],{only:'p'}));});note(out,6,'Q3 参数错误，查找之前已拦下');
 return scene('returns',out);}
function check(){const out=[];chapter(out,0,magnifier(110),'材料取回后，仍须检查怎么用');
 pair(out,1,notice(),box(['今天临时检修','D1 缺少检修安排'],550,240,C.cream,46));note(out,1,'常规开放时间，不保证临时现场状态');
 pair(out,2,paper('调用记录',['确认取回了 D1']),qBadge(95)+label(['能回答检修安排吗？'],230,C.ink,44));
 trio(out,3,[['有效请求','与执行结果？'],['返回材料','覆盖条件？'],['回答的事实','有原文支持？']]);
 pair(out,4,paper('公告 D1',['18 点闭馆']),box(['回答却写成','19 点闭馆'],530,240,C.peach,48));note(out,4,'工具调用成功，仍可能答错');return scene('check',out);}
const CARDS=[['promise','“我马上查”','只有查找意图','还没有请求或结果'],['request','通过检查的 Q1','请求可以处理','还没有看到返回材料'],['material','Q1 连着返回 D1','看到返回材料','还须核对是否支持回答']].map(([id,q,a,b])=>({id,question:q+'，说明哪一步？',answer:a,front:p=>label(q,p?-25:-40,C.ink,p?48:36)+label('点击核对',p?90:165,C.tealInk,36),back:p=>label(a,p?-25:-40,C.tealInk,p?48:38)+label(b,p?65:110,C.ink,p?40:28)}));
function challenge(){const out=[];chapter(out,0,qBadge(110),['三张卡','查找证据走到哪一步？']);
 trio(out,1,[['“我马上查”'],['检查通过的 Q1'],['Q1 ＋ 返回 D1']],['意图、可处理的请求、返回材料','分别说明哪一步？']);
 pair(out,2,returnCard(1),returnCard(3));note(out,2,['“没有匹配”与“查询未完成”','不能写成同一句结论']);
 pair(out,3,paper('下一期',['已知：场地开放时间']),box(['未知：设备条件','怎样接着查与停止？'],550,240,C.cream,46));return scene('challenge',out);}
function savedTable(p){let art='';R.cases.forEach((c,i)=>{const s=summary[i],w=p?740:1040,y=(p?110:80)+i*(p?230:150);art+=g(rect(-w/2,-(p?70:60),w,p?140:120,{fill:s.outcome==='found'?C.mint:s.outcome==='failed'?C.peach:C.cream,r:12})+g(label(s.id+' · '+s.status,0,C.ink,p?38:40),{x:p?-175:-250})+g(label(s.outcome==='found'?'1 份 D1':s.outcome==='empty'?'0 条匹配':s.outcome==='invalid'?'未执行':'读取故障',0,C.ink,p?38:42),{x:p?205:320}),{x:p?400:600,y});});return art;}
function lab(){const out=[];chapter(out,0,g(ticket(),{s:.8}),'翻开配套程序留下的记录');
 out.push(put(savedTable(false),1,'records',[0,0],[0,0],{only:'l'}),put(savedTable(true),1,'records',[0,0],[0,0],{only:'p'}));note(out,1,['故障用于检查分支','不是学校真实发生的故障']);
 pair(out,2,paper('查公告',['search_announcements']),paper('两个参数名',['facility：设施','period：适用期']));
 const links=[['本地实验说明','../../Python实现/source/campus_agent_lab/README.md'],['保存的输出','../../Python实现/source/campus_agent_lab/outputs/reference/episode17/result.json']];
 links.forEach(([title,href],i)=>out.push(put('<a class="hit" href="'+esc(href)+'" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-label="'+title+'，打开本地文件">'+box([title,'点击打开'],570,250,C.mint,46)+'</a>',3,'experiment.'+i,[300+i*600,280],[400,220+i*440])));
 note(out,3,'选读入口 · 可与正文、实际记录对照');return scene('lab',out);}
module.exports=ctx=>[cover(ctx,g(ticket(),{s:.85}),'看请求 · 看执行 · 看返回'),opening(),roles(),request(),gate(),returns(),check(),challenge(),exercise(CARDS),lab(),references(ctx,['〔1〕CS329Z 工具接口说明','〔1〕CS329Z 作业说明'],['构造资料与规则程序','不代表模型自主选工具的能力'])];
module.exports.thumbnail=section=>{const icons=[qBadge(110),magnifier(110),g(ticket(),{s:.65}),qBadge(110),g(notice(),{s:.65}),magnifier(110),qBadge(110),g(ticket(),{s:.65})];return '<svg class="toc-thumb" viewBox="-230 -190 460 380" aria-hidden="true" focusable="false">'+(section.mark==='源'?magnifier(110):icons[section.num])+'</svg>';};
