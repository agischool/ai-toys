'use strict';
const {C,esc,g,rect,line,arrow,qBadge,magnifier}=require('../art.cjs');
const {label,put,scene,chapter,cover,references,exercise}=require('../lesson.cjs');
const R=require('../moe-records.cjs'),saved=R.summary(),source=R.record;
const num=x=>Number(x.toFixed(3)).toString(),vec=a=>'['+a.map(num).join(', ')+']';
const box=(words,w=550,h=240,fill=C.blue,size=46)=>rect(-w/2,-h/2,w,h,{fill,r:14})+label(words,0,C.ink,size);
const paper=(title,words)=>rect(-275,-165,550,330,{fill:C.white,r:12})+line(-240,-65,240,-65,{sw:3})+label(title,-115,C.tealInk,44)+label(words,45,C.ink,46);
function pair(out,s,a,b){out.push(put(a,s,'left',[300,280],[400,220]),put(b,s,'right',[900,280],[400,660],{d:140}));}
function note(out,s,words){out.push(put(label(words,0,C.tealInk,44),s,'scope',[600,665],[400,940]));}
function dual(out,s,n,draw){out.push(put(draw(false),s,n,[0,0],[0,0],{only:'l'}),put(draw(true),s,n,[0,0],[0,0],{only:'p'}));}
function routerIcon(){return Array.from({length:4},(_,id)=>g(rect(-85,-50,170,100,{fill:saved.selected.includes(id)?C.mint:C.white,r:12})+label('E'+(id+1),0,saved.selected.includes(id)?C.tealInk:C.ink,46),{x:id%2?100:-100,y:id<2?-65:65})).join('');}
function opening(){const out=[];
 pair(out,0,paper('四个候选计算模块',['本次只请两个？']),qBadge(100));
 pair(out,1,paper('稀疏混合专家 MoE',['按输入选择部分模块']),box(['这里的专家是数值模块','不等同于人的学科'],570,250,C.mint,44));
 pair(out,2,routerIcon(),box(['输入、分数、模块均预设','没有训练专家','没有比较模型能力'],580,280,C.cream,42));return scene('open',out);
}
function outputTable(p){let art='';source.all_expert_matrices.forEach((m,id)=>{const x=p?(id%2?590:210):170+id*285,y=p?(id<2?240:650):310;art+=g(box(['模块 '+(id+1)+' · 各乘 '+(id+1),vec(R.project(source.input,m))],p?340:260,p?240:260,C.blue,p?38:34),{x,y});});return art;}
function experts(){const out=[];chapter(out,0,routerIcon(),['四个模块','先列算术核对表']);
 pair(out,1,paper('同一组输入',[vec(source.input)]),box(['四个模块分别','各乘 1 / 2 / 3 / 4'],570,250,C.blue,46));
 dual(out,2,'all-outputs',outputTable);note(out,2,['四项全列仅为核对算术','稀疏路线先选择，再执行选中项']);
 pair(out,3,paper('路由器',['给候选模块计算分数']),box(['真实路由可由训练得到','本例固定分数','只演示后续选择'],570,280,C.blue,42));
 pair(out,4,paper('路由分数',['用来选择计算模块']),box(['不是回答正确的概率','最高分不能推为最懂题目'],570,250,C.cream,44));return scene('experts',out);
}
function routeMap(p){let art='';const rx=p?400:600,ry=p?100:130;art+=g(box(['路由器','选择第二、第三个'],p?460:450,150,C.mint,40),{x:rx,y:ry});
 for(let id=0;id<4;id++){const x=p?(id%2?600:200):150+id*300,y=p?(id<2?380:700):460,active=saved.selected.includes(id);art+=g(rect(-115,-105,230,210,{fill:active?C.mint:C.white,r:14,stroke:active?C.tealInk:C.ink})+label('模块 '+(id+1),-60,C.ink,42)+label('分数 '+num(source.router_logits[id]),0,C.ink,34)+label(active?'本次选中':'未选，不执行',65,active?C.tealInk:C.ink,p?32:34),{x,y});}
 const paths=p?[[[400,190],[600,190],[600,260]],[[400,190],[65,190],[65,700],[75,700]]]:[[[600,220],[450,220],[450,340]],[[600,220],[750,220],[750,340]]];
 paths.forEach(points=>art+=arrow(points,{stroke:C.tealInk,sw:6,head:18}));return art;
}
function mergeFlow(p){let art='';const nodes=[['先选中',['第二、第三模块']],['只执行选中项',saved.outputs.map(vec)],['按权重合并',[vec(saved.output)]]];nodes.forEach(([title,words],i)=>{const x=p?400:200+i*400,y=p?160+i*330:300;art+=g(box([title,...words],p?700:350,p?220:270,i===2?C.mint:C.blue,p?44:36),{x,y});if(i<2)art+=arrow(p?[[x,y+125],[x,y+205]]:[[x+183,y],[x+215,y]],{sw:5,head:18});});return art;}
function route(){const out=[];chapter(out,0,routerIcon(),['选中两个','再把权重算清']);
 dual(out,1,'selected-route',routeMap);note(out,1,'只连向选中项，尚未执行模块');
 pair(out,2,paper('选中项内重新归一',['第二模块：'+num(saved.weights[0]),'第三模块：'+num(saved.weights[1])]),box(['0.6 ＋ 0.4 ＝ 1','第一、第四模块','不贡献本次输出'],570,280,C.mint,44));
 pair(out,3,paper('第一项',['2 × 0.6 ＋ 3 × 0.4','＝ '+num(saved.output[0])]),paper('第二项',['4 × 0.6 ＋ 6 × 0.4','＝ '+num(saved.output[1])]));
 pair(out,4,paper('合并后的输出',[vec(saved.output)]),box(['两项分别加权','得到一个数值向量'],550,240,C.mint,46));
 dual(out,5,'execution-order',mergeFlow);
 pair(out,6,paper('第二模块贡献',[vec(saved.outputs[0])+' × '+num(saved.weights[0]),'＝ '+vec(saved.contributions[0])]),paper('第三模块贡献',[vec(saved.outputs[1])+' × '+num(saved.weights[1]),'＝ '+vec(saved.contributions[1])]));note(out,6,'逐项相加得到 '+vec(saved.output));
 pair(out,7,paper('下一片的数字表示变了',['路由选择可能改变']),box(['也可能连续多片','继续选中同一组模块'],570,250,C.blue,44));
 pair(out,8,paper('两个模块分别算数值',['按权重合在一起']),box(['没有先商量再投票','与两个助手各写答案分开'],570,250,C.cream,44));
 pair(out,9,paper('本例的重新归一',['只在选中项间','令权重之和等于 1']),box(['其他路由可能约定不同','选中谁、怎样合并','都要分别检查'],570,280,C.cream,42));return scene('route',out);
}
function matrixGrid(p,highlight=false){let art='';source.all_expert_matrices.forEach((m,id)=>{const x=p?(id%2?590:210):165+id*290,y=p?(id<2?250:690):300,active=highlight&&saved.selected.includes(id),w=p?340:260;let tile=rect(-w/2,-155,w,310,{fill:active?C.mint:C.white,r:14})+label('模块 '+(id+1),-110,active?C.tealInk:C.ink,p?42:38);
 m.forEach((row,i)=>row.forEach((value,j)=>{tile+=g(label(value,0,C.ink,p?46:44),{x:j?65:-65,y:-20+i*80});}));
 if(highlight)tile+=label(active?'本次使用':'仍需保存',115,active?C.tealInk:C.ink,p?36:34);art+=g(tile,{x,y});});return art;}
function parameters(){const out=[];chapter(out,0,routerIcon(),['少用一部分','为什么还要存全部']);
 dual(out,1,'four-matrices',p=>matrixGrid(p));note(out,1,'每个 2 × 2 矩阵含零共四个数');
 dual(out,2,'stored-used',p=>matrixGrid(p,true));note(out,2,['四个专家共保存 '+saved.stored+' 个数','本次两个选中项包含 '+saved.used+' 个数']);
 pair(out,3,paper('本图的统计范围',['只计专家矩阵']),box(['路由器、共享层另计','保存量与本次选中量','分别呈现'],570,280,C.cream,44));
 pair(out,4,paper('完整模型还有其他计算',['注意力、路由、共享部分']),box(['某层只选一半专家','不能推出整机耗时','或内存必然减半'],570,280,C.cream,44));return scene('parameters',out);
}
function research(){const out=[];chapter(out,0,magnifier(110),['真实研究','比本例多了什么']);
 pair(out,1,paper('Mixtral 的相关层',['八个前馈专家','每 token 选择两个']),box(['不同层、不同 token','可选择不同专家','本例不作性能复现'],570,280,C.blue,44));
 pair(out,2,paper('本例没有研究',['专家与路由训练','分配不均、跨设备传输']),box(['Switch Transformers','采用选择一个专家','MoE 选法不只一种'],570,280,C.mint,42));return scene('research',out);
}
const practice=R.combine(saved.outputs,[.5,.5]);
const CARDS=[['first',['两模块各占 0.5','第一项是多少？'],num(practice.output[0]),'2 ÷ 2 ＋ 3 ÷ 2'],['second',['两模块各占 0.5','第二项是多少？'],num(practice.output[1]),'4 ÷ 2 ＋ 6 ÷ 2'],['quality',['2.5 比 2.4 大','就说明质量更好？'],'不能这样判断','还需任务目标与评测']].map(([id,q,a,b])=>({id,question:q.join('，'),answer:a,front:p=>label(q,p?-25:-40,C.ink,p?46:36)+label('点击核对',p?90:165,C.tealInk,36),back:p=>label(a,p?-25:-40,C.tealInk,p?48:38)+label(b,p?65:110,C.ink,p?40:30)}));
function practiceScene(){const out=[];chapter(out,0,qBadge(110),['改一个权重','自己复算']);
 pair(out,1,paper('还是第二、第三个模块',['输出 '+vec(saved.outputs[0]),'与 '+vec(saved.outputs[1])]),box(['现在各占 0.5','先算第一项、再算第二项'],570,250,C.blue,44));
 pair(out,2,paper('选中模块没变',['权重改变 → 输出改变']),box(['没有证明答案质量更好','还需任务目标和评测资料'],570,250,C.cream,44));note(out,2,['选了谁、怎样合并','最后是否有用，分别检查']);return scene('practice',out);
}
function lab(){const out=[];chapter(out,0,magnifier(110),['选读：到程序里','核对这组算式']);
 pair(out,1,paper('保存记录可核对',['路由分数 · 选中项','合并权重 · 四份矩阵']),box(['从 0 起的 ID 为 [1, 2]','图中对应第二、第三模块'],570,250,C.blue,42));
 pair(out,2,paper('保存数值按正文舍入',['选中权重 '+vec(saved.weights),'输出 '+vec(saved.output)]),box(['原始文件保留完整数值','可能有末位浮点误差'],570,250,C.mint,44));
 const href='../../Python实现/source/continuation_mechanisms/README.md';out.push(put('<a class="hit" href="'+esc(href)+'" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-label="训练、缓存与专家路由实验说明，打开本地文件">'+box(['训练、缓存与专家路由','实验说明 · 点击打开'],700,270,C.mint,46)+'</a>',3,'experiment',[600,300],[400,420]));
 pair(out,4,paper('本次没有进行',['路由器或专家的训练','硬件性能测量']),box(['16 / 8 仅为专家矩阵','其他模块另计','不是完整模型参数总量'],570,280,C.cream,42));return scene('lab',out);
}
module.exports=ctx=>[cover({...ctx,titleLines:['每片文字，为什么','只交给部分「专家」？']},g(routerIcon(),{s:1.05}),'选了谁，怎样合并？'),opening(),experts(),route(),parameters(),research(),practiceScene(),exercise(CARDS),lab(),references(ctx,['〔1〕Mixtral 相关层的选择与合并','〔2〕Switch 的单专家选择设计'],['未训练的构造算例','不作为模型能力或硬件性能测评'])];
module.exports.thumbnail=section=>{const icons=[qBadge(110),routerIcon(),routerIcon(),routerIcon(),magnifier(110),qBadge(110),magnifier(110)];return '<svg class="toc-thumb" viewBox="-230 -190 460 380" aria-hidden="true" focusable="false">'+(section.mark==='源'?magnifier(110):icons[section.num])+'</svg>';};
