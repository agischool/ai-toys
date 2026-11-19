'use strict';
const {C,esc,g,rect,line,arrow,qBadge,magnifier}=require('../art.cjs');
const {label,put,scene,chapter,cover,references,exercise}=require('../lesson.cjs');
const R=require('../cache-records.cjs'),saved=R.summary();
const box=(words,w=550,h=240,fill=C.blue,size=46)=>rect(-w/2,-h/2,w,h,{fill,r:14})+label(words,0,C.ink,size);
const paper=(title,words)=>rect(-275,-165,550,330,{fill:C.white,r:12})+line(-240,-65,240,-65,{sw:3})+label(title,-115,C.tealInk,44)+label(words,45,C.ink,46);
function pair(out,s,a,b){out.push(put(a,s,'left',[300,280],[400,220]),put(b,s,'right',[900,280],[400,660],{d:140}));}
function note(out,s,words){out.push(put(label(words,0,C.tealInk,44),s,'scope',[600,665],[400,940]));}
function dual(out,s,n,draw){out.push(put(draw(false),s,n,[0,0],[0,0],{only:'l'}),put(draw(true),s,n,[0,0],[0,0],{only:'p'}));}
const cacheIcon=()=>rect(-180,-130,360,260,{fill:C.mint,r:14})+label('留住 K / V',-70,C.tealInk,44)+label(['旧位置存下','新位置追加'],35,C.ink,46);
function opening(){const out=[];
 pair(out,0,paper('文字接回前文',['已有文字 → 下一片','下一轮的输入更长']),qBadge(100));
 pair(out,1,paper('本期固定模型参数',['只看运行时计算']),box(['这里的一片是 token','不一定是一个汉字'],560,240,C.blue,44));
 pair(out,2,cacheIcon(),box(['哪些算式的结果','下一轮可以直接用？'],560,250,C.cream,46));return scene('open',out);
}
function strips(p){let art='';[6,7,8].forEach((length,j)=>{const cx=p?400:600,cy=p?170+j*310:100+j*200,gap=p?78:105;let row=label(length+' 个输入位置',-70,C.tealInk,44);
 R.prefix(length).forEach(({token},i)=>{const x=(i-(length-1)/2)*gap;row+=g(rect(-gap*.42,-20,gap*.84,80,{fill:i<6?C.blue:C.mint,r:8})+label(token,20,C.ink,48),{x});});
 art+=g(row,{x:cx,y:cy});});return art;
}
function routeComparison(p){let art='';const rows=[['完整重算',['旧六个位置再算','再算新位置 a']],['保留历史 K/V',['旧六份 K/V 留下','只追加 a 的 K/V']]];
 rows.forEach(([title,words],i)=>{art+=g(paper(title,words),{x:p?400:300+i*600,y:p?240+i*440:280});});return art;
}
function prefixScene(){const out=[];chapter(out,0,qBadge(110),['添一个字母','旧位置会变吗']);
 pair(out,1,paper('教学复制任务',['给定 <abce|','希望接出 abce>']),box(['六个字符，六个位置','本例每符号一个 token'],570,250,C.mint,44));
 pair(out,2,paper('第一轮已读',['<abce|','六个位置']),box(['为下一片算分','选出 a 后再接回'],550,240,C.blue,46));
 dual(out,3,'prefixes',strips);note(out,3,['教学接龙示意','与保存实验分开']);
 pair(out,4,paper('前缀＝目前已有文字',['第二轮：<abce|a']),box(['完整重算七个位置','其中旧六个又处理一次'],570,250,C.cream,44));
 pair(out,5,paper('因果 Transformer',['只读取自己和更早位置']),box(['末尾添新 token','不会反过来改旧位置'],570,250,C.mint,44));
 pair(out,6,paper('复用前要保持相同',['模型参数 · 前缀','位置规则']),box(['计算设置可复现','旧位置结果才可沿用'],570,250,C.cream,44));
 dual(out,7,'routes',routeComparison);return scene('prefix',out);
}
function kvRows(p,length=6){let art='';const gap=p?96:135,cell=p?84:110;
 ['K','V'].forEach((kind,j)=>{const y=p?250+j*340:200+j*260;art+=g(label(kind+' · '+length+' 个位置',-90,C.tealInk,48),{x:p?400:600,y});
 for(let i=0;i<length;i++){const x=(p?400:600)+(i-(length-1)/2)*gap;art+=g(rect(-cell/2,-25,cell,100,{fill:kind==='K'?C.blue:C.mint,r:10})+label(kind+i,25,C.ink,p?40:44),{x,y});}});return art;
}
function queryFlow(p){const nodes=[['新位置的 Q',['本步重新查询'],C.blue],['历史及新增 K',['比较，重算权重'],C.mint],['历史及新增 V',['按新权重组合'],C.mint]];let art='';
 nodes.forEach(([title,words,fill],i)=>{const x=p?400:200+i*400,y=p?150+i*330:310;art+=g(box([title,...words],p?700:350,p?200:250,fill,p?46:36),{x,y});if(i<2)art+=arrow(p?[[x,y+116],[x,y+200]]:[[x+185,y],[x+215,y]],{head:18,sw:5});});return art;
}
function cache(){const out=[];chapter(out,0,cacheIcon(),['把算过的','两组数留下']);
 pair(out,1,paper('K 键 / V 值',['K：供别的位置匹配','V：可供取用的信息']),box(['新位置还会计算 Q','用查询匹配各个键'],570,250,C.blue,44));
 pair(out,2,cacheIcon(),box(['键值缓存','KV Cache'],550,240,C.mint,50));
 dual(out,3,'old-kv',p=>kvRows(p));note(out,3,['K0 / V0 标明位置','向量用方框示意，不是实测值']);
 pair(out,4,paper('新来的 a',['位置接在旧六个之后','新算 Q、K、V']),box(['把新 K、V 追加','旧六份 K、V 仍保留'],570,250,C.mint,44));
 dual(out,5,'query-history',queryFlow);
 pair(out,6,paper('每步重新算',['新位置的 Q','本轮注意力权重']),box(['不照搬上一轮权重','逐项比较候选分数','事先约定数值容差'],570,290,C.cream,42));return scene('cache',out);
}
function scoreExample(p){let art='';const sets=[['完整路线',R.counterexample.full],['另一路线',R.counterexample.cached]];
 sets.forEach(([title,values],i)=>{const x=p?400:300+i*600,y=p?210+i*420:300,w=p?700:550;let row=rect(-w/2,-155,w,310,{fill:C.white,r:12})+label(title,-105,C.tealInk,44);
 values.forEach((v,j)=>{const cx=(j-1)*(p?200:155);row+=g(label(['a','b','c'][j],-20,C.ink,44)+rect(-58,30,116,75,{fill:j===0?C.mint:C.cream,r:8})+label(v,68,C.ink,48),{x:cx});});art+=g(row,{x,y});});return art;
}
function verify(){const out=[];chapter(out,0,magnifier(110),['留下来的数','还能接着用吗']);
 dual(out,1,'same-top',scoreExample);note(out,1,['构造反例：首选同为 a','其他分数不同，非保存模型输出']);
 pair(out,2,paper('本仓库逐项数值对照',['同参数、前缀与位置','误差接近浮点量级']),box(['支持本例的复用实现','没有证明写得更好'],570,250,C.mint,44));
 pair(out,3,paper('六个位置已用过',['从 0 起编号','0、1、2、3、4、5']),box(['新位置编号应为 6','不能再次从 0 开始'],570,250,C.mint,44));
 pair(out,4,paper('故意把位置重置为 0',['候选分数明显不同']),box(['参数换了、前缀改了','都需重新核对缓存'],570,250,C.cream,44));return scene('verify',out);
}
function countBars(p){const c=saved.counts;let art='';[['完整重算',c.full,C.blue],['缓存追加',c.incremental,C.mint]].forEach(([title,value,fill],i)=>{const x=p?90:180,y=p?220+i*390:190+i*260,w=(p?620:900)*value/c.full;art+=g(label(title,-80,C.tealInk,46),{x:p?400:600,y});art+=rect(x,y,w,100,{fill,r:10})+g(label(value,50,C.ink,48),{x:x+w/2,y});});return art;
}
function counts(){const out=[];chapter(out,0,cacheIcon(),['十二个前缀','先数处理位置']);
 pair(out,1,paper('长度 1 → 12',['每步增加一个位置']),box(['K 投影：从位置表示','算出该位置的键','V 投影另计同样一份'],570,280,C.blue,42));
 pair(out,2,paper('完整前缀 K 投影',['1＋2＋…＋12',String(saved.counts.full)+' 次位置处理']),box(['每轮把已有位置','全部重新投影'],550,240,C.blue,46));
 dual(out,3,'projection-counts',countBars);note(out,3,['K 的 78 / 12','V 也各自计数']);
 pair(out,4,paper('78 ÷ 12 ＝ '+saved.counts.ratio,['只是位置投影计数比']),box(['新位置仍读取历史','缓存存取也有开销','没有测实际耗时'],570,280,C.cream,42));
 pair(out,5,paper('本例核对的账',['K/V 投影位置次数','K/V 数组净字节']),box(['没有计算总 FLOPs','没有测整机内存','没有测硬件加速倍数'],570,280,C.cream,42));return scene('counts',out);
}
const practice=R.projections(4),practiceSpace=R.storage(4);
const CARDS=[['full',['四个前缀','完整路线的 K？'],String(practice.full)+' 次','1＋2＋3＋4'],['cached',['四个前缀','缓存路线的 K？'],String(practice.incremental)+' 次','每步只投影新位置'],['bytes',['保留四个位置','K/V 净空间？'],practiceSpace.total.toLocaleString('en-US')+' 字节','2 × 4 × 16 × 8']].map(([id,q,a,b])=>({id,question:q.join('，'),answer:a,front:p=>label(q,p?-25:-40,C.ink,p?46:36)+label('点击核对',p?90:165,C.tealInk,36),back:p=>label(a,p?-25:-40,C.tealInk,p?48:38)+label(b,p?65:110,C.ink,p?40:30)}));
function space(){const out=[];chapter(out,0,cacheIcon(),['计算少重复','空间却要多留']);
 pair(out,1,paper('单层、单头，本例设置',['K / V 各 16 个数','float64 每数 8 字节']),box(['一个位置，两组向量','2 × 16 × 8','净增 '+saved.space.perPosition+' 字节'],570,280,C.mint,44));
 pair(out,2,paper('十二个位置',['12 × 256','净占 '+saved.space.total.toLocaleString('en-US')+' 字节']),box(['仅 K/V 数组','参数、临时数组另计','真实模型设置会不同'],570,280,C.cream,42));
 pair(out,3,paper('换成四个前缀',['完整 K？缓存 K？']),qBadge(100));note(out,3,'也算一算：四个位置的 K/V 净空间');
 pair(out,4,paper('缓存是中间计算结果',['依赖特定参数、前缀','与位置规则']),box(['跨会话长期保存资料','仍需另设存储与检索'],570,250,C.cream,44));
 pair(out,5,paper('本期的取舍',['少做部分重复计算','多付空间与读取开销']),box(['下一期：同一片文字','要经过全部专家吗？'],570,250,C.mint,44));return scene('space',out);
}
function links(p){const items=[['训练、缓存与专家路由实验说明','../../Python实现/source/continuation_mechanisms/README.md'],['固定结果的 kv_cache 字段','../../Python实现/source/continuation_mechanisms/outputs/reference/result.json']];return items.map(([title,href],i)=>g('<a class="hit" href="'+esc(href)+'" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-label="'+esc(title)+'，打开本地文件">'+box([title,'点击打开本地记录'],p?740:980,190,C.mint,p?38:44)+'</a>',{x:p?400:600,y:p?300+i*360:200+i*330})).join('');}
function lab(){const out=[];chapter(out,0,magnifier(110),['选读：配套程序','具体比较了什么']);
 pair(out,1,paper('保存实验的固定输入',[saved.input,'长度 1 至 12 的前缀']),box([saved.models+' 个模型 × '+saved.length+' 个前缀',saved.comparisons+' 组候选分数对照','两随机模型＋一历史模型'],570,280,C.blue,42));note(out,1,'这条输入与开场教学接龙分开');
 pair(out,2,paper('正确位置规则',['最大 logits 差',saved.maxError.toExponential(2)]),paper('错误重置位置',['负例最大差',saved.wrongPositionError.toFixed(2)]));note(out,2,['保存的 float64 数值对照','不是质量得分']);
 pair(out,3,paper('本次没有测',['续写质量','设备实际耗时']),box(['只支持本例数值比较','不能外推全部实现'],570,250,C.cream,44));
 dual(out,4,'local-records',links);return scene('lab',out);
}
module.exports=ctx=>[cover(ctx,g(cacheIcon(),{s:.9}),'哪些结果可以留下？'),opening(),prefixScene(),cache(),verify(),counts(),space(),exercise(CARDS),lab(),references(ctx,['〔1〕GPT-2 历史 K/V 与位置实现','〔2〕查询、键、值与因果遮罩'],['比较候选原始分数','没有测续写质量或硬件性能'])];
module.exports.thumbnail=section=>{const icons=[qBadge(110),qBadge(110),cacheIcon(),magnifier(110),cacheIcon(),cacheIcon(),magnifier(110)];return '<svg class="toc-thumb" viewBox="-230 -190 460 380" aria-hidden="true" focusable="false">'+(section.mark==='源'?magnifier(110):icons[section.num])+'</svg>';};
