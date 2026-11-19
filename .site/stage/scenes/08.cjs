'use strict';
const {C,g,rect,txt,arrow,pill,knob,qBadge,magnifier}=require('../art.cjs');
const {label,put,scene,chapter,cover,references,exercise}=require('../lesson.cjs');
const E=require('../generation.cjs');
const box=(word,w=240,h=110,fill=C.white,size=54)=>rect(-w/2,-h/2,w,h,{fill,r:16})+label(word,0,C.ink,size);
function strip(words=['我','读书','。'],size=58) {
  const count=words.length, cell=170;
  return words.map((word,i)=>g(box(word,155,120,i===count-1?C.mint:C.white,size),{x:(i-(count-1)/2)*cell})).join('');
}
function pair(out,step,a,b) {
  out.push(put(a,step,'left',[300,315],[400,175]));
  out.push(put(b,step,'right',[900,315],[400,675],{d:140}));
}
function mini() {
  return strip() + arrow([[255,0],[315,0],[315,190],[-170,190],[-170,90]],{sw:6,head:18,stroke:C.teal}) + label('接回已有文字',280,C.tealInk,50);
}
function probabilities() {
  return E.candidates('我').map((v,i)=>{
    const y=-100+i*210;
    return txt(-265,y-35,v.token,{size:52,anchor:'start'}) + rect(-265,y+15,530,45,{fill:C.white,r:0,sw:3}) +
      rect(-265,y+15,530*v.p,45,{fill:i===0?C.mint:C.peach,r:0,sw:0}) + txt(265,y-35,v.p,{size:56,anchor:'end',fill:C.tealInk});
  }).join('');
}
function branches(out,step) {
  const choices=E.candidates('我');
  let l=g(box('我',170,110,C.white),{x:110,y:330});
  let p=g(box('我',240,100,C.white),{x:400,y:90});
  choices.forEach((v,i)=>{
    const y=180+i*300, x=200+i*400;
    l+=arrow([[210,330],[320,330],[320,y],[425,y]],{sw:6,head:18}) + txt(350,i===0?100:575,v.p,{size:52,fill:C.tealInk}) +
      g(box(v.token,230,120,C.blue),{x:565,y}) + arrow([[700,y],[755,y]],{sw:6,head:18}) + txt(725,y-85,'1',{size:46}) +
      g(box('。',140,100,C.mint),{x:845,y}) + arrow([[935,y],[990,y]],{sw:6,head:18}) + txt(1080,y,'停止',{size:50});
    p+=arrow([[400,160],[400,200],[x,200],[x,315]],{sw:6,head:18}) + txt(i===0?80:720,270,v.p,{size:52,fill:C.tealInk}) +
      g(box(v.token,260,120,C.blue),{x,y:400}) + arrow([[x,480],[x,565]],{sw:6,head:18}) + txt(i===0?320:480,525,'1',{size:48}) +
      g(box('。',180,110,C.mint),{x,y:650}) + arrow([[x,725],[x,795]],{sw:6,head:18}) + txt(x,870,'停止',{size:52});
  });
  out.push(put(l,step,'branches',[0,0],[0,0],{only:'l'}));
  out.push(put(p,step,'branches',[0,0],[0,0],{only:'p'}));
}
function cards(out,step,selected=0) {
  E.tickets.forEach((v,i)=>{
    const fill=v.number===selected?C.tealInk:v.token==='读书'?C.mint:C.peach, ink=v.number===selected?C.white:C.ink;
    const face=(w,h)=>rect(-w/2,-h/2,w,h,{fill,r:12}) + label(v.number+' 号',-32,ink,38) + label(v.token,30,ink,46);
    out.push(put(face(170,150),step,'ticket.'+v.number,[200+i%5*200,190+Math.floor(i/5)*220],[0,0],{only:'l'}));
    out.push(put(face(260,130),step,'ticket.'+v.number,[0,0],[245+i%2*310,105+Math.floor(i/2)*180],{only:'p'}));
  });
  const result=selected?E.generate(['我'],{method:'ticket',number:selected}).tokens.join(''):'十张卡 · 每张被抽中的机会相同';
  out.push(put(label(selected?selected+' 号 → '+result:result,0,C.tealInk,46),step,'result',[600,650],[400,960]));
}
function frequency(out,step) {
  E.demonstrations.forEach((numbers,i)=>{
    const result=E.tally(numbers);
    const art=label('读书 '+result['读书']+' 次 · 画画 '+result['画画']+' 次',-120,C.ink,48) + numbers.map((n,j)=>
      g(rect(-42,-42,84,84,{fill:E.ticket(n).token==='读书'?C.mint:C.peach,r:8,sw:3})+label(n,0,C.ink,38),{x:-200+j%5*100,y:Math.floor(j/5)*115})).join('');
    out.push(put(art,step,'draws.'+i,[310+i*580,300],[400,180+i*510]));
  });
  out.push(put(label('预设的抽取序列 · 每次仍按 0.6 / 0.4',0,C.tealInk,42),step,'scope',[600,640],[400,980]));
}
function loop(out,step) {
  const words=['计算候选概率','选出一片','接回上下文','停止条件满足？'];
  words.forEach((word,i)=>{
    out.push(put(box(word,i===3?270:250,120,i===3?C.cream:C.blue,i===3?36:38),step,'node.'+i,[160+i*290,240],[0,0],{only:'l'}));
    out.push(put(box(word,420,110,i===3?C.cream:C.blue,46),step,'node.'+i,[0,0],[300,90+i*190],{only:'p'}));
    if(i<3) {
      out.push(put(arrow([[0,0],[26,0]],{sw:6,head:14}),step,'flow.'+i,[298+i*290,240],[0,0],{only:'l'}));
      out.push(put(arrow([[0,0],[0,40]],{sw:6,head:16}),step,'flow.'+i,[0,0],[300,165+i*190],{only:'p'}));
    }
  });
  const l=arrow([[1030,160],[1030,80],[160,80],[160,160]],{stroke:C.teal,sw:6,head:18}) + txt(600,30,'否 · 继续计算',{size:46,fill:C.tealInk}) +
    arrow([[1030,320],[1030,490]],{sw:6,head:18}) + txt(940,405,'是',{size:48}) + g(box('结束',220,100,C.mint),{x:1030,y:570});
  const p=arrow([[530,660],[700,660],[700,90],[530,90]],{stroke:C.teal,sw:6,head:18}) + txt(620,370,'否',{size:46,fill:C.tealInk}) + txt(620,435,'继续',{size:46,fill:C.tealInk}) +
    arrow([[300,740],[300,845]],{sw:6,head:18}) + txt(190,795,'是',{size:48}) + g(box('结束',280,100,C.mint),{x:300,y:930});
  out.push(put(l,step,'branches',[0,0],[0,0],{only:'l'}));
  out.push(put(p,step,'branches',[0,0],[0,0],{only:'p'}));
}
function prefixes(out,step) {
  pair(out,step,label('打开书本，',-130,C.ink,50)+strip(['我'])+label('只查最后的「我」',180,C.tealInk,46),
    label('拿起画笔，',-130,C.ink,50)+strip(['我'])+label('仍查最后的「我」',180,C.tealInk,46));
}
function opening() {
  const out=[];
  out.push(put(strip() + label('每次添一点 · 后文怎样接上？',270,C.ink,52),0,'question'));
  loop(out,1);
  out.push(put(mini() + label('自回归：前面的结果接回来',-190,C.ink,52),2,'autoregressive'));
  return scene('open',out);
}
function toy() {
  const out=[];
  chapter(out,0,strip(),'先缩小词表 · 只查最后一片');
  pair(out,1,strip(['我','读书']),strip(['画画','。'])+label('人为指定 · 没有训练',220,C.ink,46));
  out.push(put(strip(['我'])+label('由我们给定的开头',220,C.ink,52),2,'prefix'));
  branches(out,3);
  out.push(put(probabilities()+label('贪心选择：本步选较高概率',330,C.tealInk,48),4,'greedy'));
  out.push(put(strip(['我','读书'])+label('第一步 · 0.6 高于 0.4',230,C.tealInk,54),5,'first'));
  out.push(put(strip()+label('第二步 · 读书后接句号，概率 1',230,C.tealInk,48),6,'second'));
  out.push(put(strip()+label(['先选活动 · 再补句号','逐步计算，不是取整句卡片'],255,C.ink,50),7,'two-steps'));
  branches(out,8);
  return scene('toy',out);
}
function sampling() {
  const out=[];
  chapter(out,0,probabilities(),'按机会抽取 · 不只选最高');
  out.push(put(probabilities()+label('大于 0 的候选，也有机会被选中',330,C.tealInk,46),1,'probabilities'));
  cards(out,2); cards(out,3,8); cards(out,4,3);
  pair(out,5,label(['读书路线','0.6 × 1 ＝ 0.6'],0,C.ink,54),label(['画画路线','0.4 × 1 ＝ 0.4'],0,C.tealInk,54));
  frequency(out,6);
  out.push(put(probabilities()+label(['卡片只解释抽取规则','程序使用当前分布作数值抽取'],330,C.ink,48),7,'numeric'));
  return scene('sample',out);
}
function tokens() {
  const out=[];
  chapter(out,0,strip(['token'],48),'一片的大小 · 由分词器规则决定');
  out.push(put(label('token · 词元',-100,C.tealInk,78)+label('分词器得到的基本单位',145,C.ink,54),1,'name'));
  ['字','词的一部分','词','标点'].forEach((word,i)=>out.push(put(box(word,360,140,C.blue,48),2,'kind.'+i,[350+i%2*500,180+Math.floor(i/2)*300],[400,130+i*230])));
  out.push(put(strip(['读书'])+label('把读书当成一片 · 仅是本例约定',240,C.ink,48),3,'toy-token'));
  out.push(put(label(['100 个 token','≠','100 个汉字'],0,C.tealInk,66)+label('解码后连接成可见文字',300,C.ink,50),4,'not-character-count'));
  pair(out,5,label(['本玩具','句号后停止'],0,C.ink,56),label(['真实系统','结束标记 · 长度上限等','可包含多个句号'],0,C.tealInk,44));
  return scene('tokens',out);
}
function context() {
  const out=[];
  chapter(out,0,mini(),'一次添一片 · 线索可来自前文');
  prefixes(out,1);
  pair(out,2,label(['书本前文','仍为 0.6 / 0.4'],0,C.ink,52),label(['画笔前文','仍为 0.6 / 0.4'],0,C.ink,52));
  ['问题','前文','已生成部分'].forEach((word,i)=>out.push(put(box(word,300,150,C.blue,48),3,'source.'+i,[230+i*370,260],[400,140+i*270])));
  out.push(put(label('真实模型可利用的上下文',0,C.tealInk,50),3,'context-label',[600,580],[400,940]));
  pair(out,4,label(['一次选出的 token','短小的生成单位'],0,C.ink,50),label(['屏幕显示的一小段','还受传输与界面影响'],0,C.ink,48));
  pair(out,5,strip(['我','读书'])+label('上下文多了一片',220,C.ink,50),knob(100)+label('参数仍沿用',270,C.ink,52));
  loop(out,6); loop(out,7);
  return scene('context',out);
}
const QUIZ=[
  {id:'book',question:'打开书本，我后面采用玩具贪心规则，会接什么？',answer:'读书。只查最后的我，不使用更早线索',front:['打开书本，我','贪心会接什么？'],back:'读书。',reason:'只查最后的我'},
  {id:'brush',question:'拿起画笔，我后面采用相同玩具贪心规则，会接什么？',answer:'仍是读书。原规则没有使用画笔线索',front:['拿起画笔，我','贪心会接什么？'],back:'读书。',reason:'画笔没进入查表'},
  {id:'claim',question:'这能推断真实模型也给相同回答吗？',answer:'不能。练习只检查玩具实际使用了哪些信息',front:['两次都接读书','真实模型也一样吗？'],back:'不能推断',reason:'只检查本玩具规则'}
].map(q=>({...q,front:p=>label(q.front,p?-25:-45,C.ink,p?48:40)+label('点击核对',p?85:165,C.tealInk,36),
  back:p=>label(q.back,p?-40:-55,C.tealInk,p?64:54)+label(q.reason,p?55:100,C.ink,p?38:36)}));
function quiz() {
  const out=[];
  chapter(out,0,strip(['我']),'换开头 · 检查用到了哪些信息');
  out.push(put(probabilities()+label('本练习不用于推断真实模型的回答',330,C.ink,46),1,'scope'));
  return scene('quiz',out);
}
function evidence() {
  const out=[];
  chapter(out,0,g(qBadge(85),{x:220})+g(strip(),{s:.65,x:-70}),'接得顺 · 仍要查事实');
  pair(out,1,label(['我读书。','玩具路线概率 0.6'],0,C.tealInk,54),qBadge(85)+label(['我是谁？','现实中发生了吗？'],240,C.ink,48));
  pair(out,2,label(['生成规则','接什么文字'],0,C.ink,58),magnifier(90)+label(['可靠资料','支持事情是否如此'],250,C.ink,46));
  out.push(put(mini()+label(['利用前文，帮助连贯','是否属实，另找证据核查'],-225,C.ink,50),3,'close'));
  return scene('evidence',out);
}
module.exports=ctx=>[cover(ctx,mini(),'下一片文字怎样接回来'),opening(),toy(),sampling(),tokens(),context(),quiz(),exercise(QUIZ),evidence(),
  references(ctx,['〔1〕自回归 · 作者文章','〔2〕生成策略 · 官方文档','〔3〕上下文 · 原始论文','〔4〕分词算法 · 官方文档'],'概率与卡片由作者设定 · 不代表模型测评')];
module.exports.thumbnail=section=>{
  const icons=[g(mini(),{s:.58}),g(strip(),{s:.7}),g(probabilities(),{s:.6}),g(strip(['token'],48),{s:.8}),g(mini(),{s:.58}),qBadge(85),magnifier(100)];
  return '<svg class="toc-thumb" viewBox="-230 -190 460 380" aria-hidden="true" focusable="false">'+(section.mark==='源'?magnifier(105):icons[section.num])+'</svg>';
};
