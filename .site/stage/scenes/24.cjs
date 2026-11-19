'use strict';
const {C,esc,g,rect,line,qBadge}=require('../art.cjs');
const {label,put,scene,chapter,cover,exercise}=require('../lesson.cjs');
const S=require('../sft-records.cjs'),K=require('../cache-records.cjs'),M=require('../moe-records.cjs');
const units=require('../../serial_units.json');
const rows=S.summary().rows.filter(r=>r.score),counts=K.projections(4),outputs=M.summary().outputs;
const equal=M.combine(outputs,[.5,.5]).output,weighted=M.combine(outputs,[.6,.4]).output;
const vec=a=>'['+a.map(x=>Number(x.toFixed(3))).join(', ')+']';
const box=(words,w=550,h=240,fill=C.blue,size=46)=>rect(-w/2,-h/2,w,h,{fill,r:14})+label(words,0,C.ink,size);
const paper=(title,words)=>rect(-275,-165,550,330,{fill:C.white,r:12})+line(-240,-65,240,-65,{sw:3})+label(title,-115,C.tealInk,44)+label(words,45,C.ink,46);
function pair(out,s,a,b){out.push(put(a,s,'left',[300,280],[400,220]),put(b,s,'right',[900,280],[400,660],{d:140}));}
function note(out,s,words){out.push(put(label(words,0,C.tealInk,42),s,'scope',[600,665],[400,940]));}
function dual(out,s,n,draw){out.push(put(draw(false),s,n,[0,0],[0,0],{only:'l'}),put(draw(true),s,n,[0,0],[0,0],{only:'p'}));}
function reviewIcon(){return g(box('a',150,150,C.white,72),{x:-140,y:-60,r:-6})+g(box('K',150,150,C.blue,72),{x:30,y:60})+g(box('½',150,150,C.mint,72),{x:170,y:-60,r:6});}
function opening(){const out=[];
 pair(out,0,paper('抄写四个字母',['给哪一步打分？']),box(['哪些计算可以复用？','选中模块怎样合并？'],570,260,C.blue,44));
 pair(out,1,reviewIcon(),box(['选一道想讲给同桌的题','先写预测，再揭开核对'],570,250,C.mint,44));return scene('open',out);
}
function predict(){const out=[];chapter(out,0,qBadge(110),['遮住答案','第一分打在哪里']);
 pair(out,1,paper('纸上写下这道题',['<abcd|abcd>']),box(['竖线左边：题目','竖线右边：答案','末尾 >：写完了'],570,290,C.blue,44));
 pair(out,2,paper('当前只读到竖线',['< a b c d |']),box(['右边先遮住','写下你的下一猜'],570,240,C.cream,46));
 pair(out,3,paper('先猜，再揭开核对',['< a b c d | → a']),paper('读入这个 a 后',['< a b c d | a → b']));
 pair(out,4,paper('只给回答计分',['a   b   c   d   >']),box(['一共 '+rows.length+' 个目标','最后一项是停止标记'],570,250,C.mint,46));
 pair(out,5,paper('回看本系列第 1 篇',['训练时给哪些目标打分']),box(['首个回答不能提前读入','结束符也要计分'],570,250,C.mint,44));return scene('predict',out);
}
function dotRows(p,incremental){let art='';for(let i=1;i<=4;i++){
 const y=p?140+(i-1)*220:100+(i-1)*150,start=p?230:350,gap=p?125:155;
 art+=g(label('第 '+i+' 格',0,C.tealInk,42),{x:p?100:160,y});
 for(let j=0;j<i;j++)art+=g(rect(-45,-45,90,90,{fill:incremental&&j<i-1?C.white:C.mint,r:8})+label(incremental&&j<i-1?'K':'●',0,C.ink,40),{x:start+j*gap,y});
 }return art;}
function cache(){const out=[];chapter(out,0,box('K',220,220,C.mint,110),['写到第四格','重复算了多少']);
 pair(out,1,paper('第一格点一下',['算这个位置的 K']),box(['后面的文字','会拿它来匹配'],570,240,C.blue,46));
 dual(out,2,'full-projections',p=>dotRows(p,false));
 pair(out,3,paper('完整重算',['1 ＋ 2 ＋ 3 ＋ 4','＝ '+counts.full+' 下']),paper('旧 K 留下',['每次只点新格','共 '+counts.incremental+' 下']));
 dual(out,4,'incremental-projections',p=>dotRows(p,true));note(out,4,['实心点表示这步新算','K 表示已经算过、继续保留']);
 pair(out,5,paper('旧 K 不变的前提',['相同参数、前缀与位置','只读当前位置和前文']),box(['在末尾添字','不会改变旧格子的 K'],570,250,C.blue,44));
 pair(out,6,paper('新格仍要匹配旧格',['本题只数 K 投影位置']),box(['10 / 4 不是整机加速比','不等于省掉其他计算'],570,250,C.cream,42));return scene('cache',out);
}
function merge(){const out=[];chapter(out,0,box('½ ＋ ½',400,200,C.mint,66),['两个模块输出','逐列合在一起']);
 pair(out,1,paper('仍是选中的两个模块',outputs.map(vec)),box(['各占一半','先遮住右列，只看 2 和 3'],570,250,C.blue,42));
 pair(out,2,paper('第一列先预测',['2 × 0.5 ＋ 3 × 0.5','＝ ？']),box(['在 2 和 3 之间','先写下你的答案'],570,250,C.cream,44));
 pair(out,3,paper('第一项',['2 × 0.5 ＋ 3 × 0.5','＝ '+equal[0]]),paper('再算第二项',['4 × 0.5 ＋ 6 × 0.5','＝ '+equal[1]]));
 pair(out,4,paper('两列都算完',[vec(equal)]),box(['两个数分别核算','不是把整列拼接起来'],570,240,C.mint,44));
 pair(out,5,paper('把权重改回 0.6 / 0.4',['2 × 0.6 ＋ 3 × 0.4','＝ '+Number(weighted[0].toFixed(3))]),box(['给 2 更多比重','第一项向 2 靠近'],570,240,C.mint,46));return scene('merge',out);
}
const CARDS=[['target',['刚读到竖线 |','下一片先猜什么？'],'a','读入 a 后才轮到 b'],['cache',['四个前缀的 K','重算 / 留下，各几下？'],counts.full+' / '+counts.incremental,'只数 K 投影的位置'],['merge',['[2,4] 与 [3,6]','各半合并是多少？'],vec(equal),'第一列、第二列分别算']].map(([id,q,a,b])=>({id,question:q.join('，'),answer:a,front:p=>label(q,p?-25:-40,C.ink,p?46:36)+label('点击核对',p?90:165,C.tealInk,36),back:p=>label(a,p?-25:-40,C.tealInk,p?48:38)+label(b,p?65:110,C.ink,p?40:30)}));
function lab(){const out=[];
 const href='../../Python实现/source/continuation_mechanisms/README.md';
 out.push(put('<a class="hit" href="'+esc(href)+'" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-label="训练、缓存与专家路由实验，打开本地说明">'+box(['训练、缓存与专家路由','点击打开实验说明'],740,260,C.mint,46)+'</a>',0,'experiment',[600,300],[400,420]));note(out,0,'找刚才做过的那道题');
 pair(out,1,reviewIcon(),box(['想换一个问题？','从五套独立系列中选'],570,250,C.blue,46));return scene('lab',out);
}
function learningMap(){const out=[];out.push(put(label('下一套，从感兴趣的问题开始',0,C.tealInk,44),0,'map-title',[600,40],[400,40]));
 units.forEach((unit,i)=>{const art='<a class="hit" href="../'+unit.id+'.html" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-label="'+esc(unit.name)+'，打开系列目录">'+box([unit.name,'从第 1 篇起 · 共 '+(unit.to-unit.from+1)+' 篇'],unit.id==='training'?700:560,130,i===4?C.mint:C.white,36)+'</a>';
 const l=i<4?[i%2?900:300,140+Math.floor(i/2)*175]:[600,500];
 out.push(put(art,0,'series.'+unit.id,l,[400,140+i*170],{only:'l'}));
 const phone='<a class="hit" href="../'+unit.id+'.html" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-label="'+esc(unit.name)+'，打开系列目录">'+box([unit.name,'从第 1 篇起 · 共 '+(unit.to-unit.from+1)+' 篇'],740,130,i===4?C.mint:C.white,38)+'</a>';
 out.push(put(phone,0,'series.'+unit.id,l,[400,140+i*170],{only:'p'}));});
 out.push(put('<a class="hit" href="?read" data-action="read" tabindex="-1" aria-label="阅读全文与纸面练习">'+box('阅读全文与纸面练习',620,76,C.mint,42)+'</a>',0,'read',[600,665],[400,960]));return scene('map',out);
}
module.exports=ctx=>[cover(ctx,reviewIcon(),'选一道，讲给同桌听'),opening(),predict(),cache(),merge(),exercise(CARDS),lab(),learningMap()];
module.exports.thumbnail=section=>'<svg class="toc-thumb" viewBox="-230 -190 460 380" aria-hidden="true" focusable="false">'+[reviewIcon(),qBadge(110),box('K',220,220,C.mint,100),box('½',220,220,C.mint,100)][section.num]+'</svg>';
