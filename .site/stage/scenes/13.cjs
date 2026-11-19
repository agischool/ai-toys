'use strict';
const {C,g,rect,circle,line,txt,arrow,knob,qBadge,magnifier}=require('../art.cjs');
const {label,put,scene,chapter,cover,references,exercise}=require('../lesson.cjs');
const E=require('../coding.cjs');
const PLAIN='ABABABAB',CHANGED='ABABABAC',RULE=E.repeated(4,'AB'),PATCH=E.repeated(4,'AB',[{position:8,letter:'C'}]),QUIZ=E.repeated(3,'AB',[{position:6,letter:'C'}]);
const box=(word,w=500,h=180,fill=C.blue,size=50)=>rect(-w/2,-h/2,w,h,{fill,r:14})+label(word,0,C.ink,size);
function pair(out,step,a,b) {
  out.push(put(a,step,'left',[300,270],[400,190]));
  out.push(put(b,step,'right',[900,270],[400,665],{d:140}));
}
function tiles(text,{cell=100,size=62,indices=false,marks=[],header=false}={}) {
  return [...text].map((c,i)=>g(rect(-cell*.44,-55,cell*.88,110,{fill:marks.includes(i)?C.peach:header&&i===0?C.mint:C.blue,r:8})+label(c,0,marks.includes(i)?C.coralInk:C.ink,size)+(indices?label(i+1,110,C.ink,42):''),{x:(i-(text.length-1)/2)*cell})).join('');
}
function row(out,step,text,{y=270,py=350,name='code',indices=false,marks=[],header=false}={}) {
  out.push(put(tiles(text,{indices,marks,header}),step,name,[600,y],[0,0],{only:'l'}));
  out.push(put(tiles(text,{cell:78,size:58,indices,marks,header}),step,name,[0,0],[400,py],{only:'p'}));
}
function note(out,step,text) {out.push(put(label(text,0,C.tealInk,44),step,'scope',[600,635],[400,935]));}
function clock() {return circle(0,0,100,{fill:C.cream})+line(0,0,0,-65,{sw:8})+line(0,0,50,35,{sw:8});}
function book() {return rect(-170,-170,340,340,{fill:C.cream,r:16})+line(-110,-150,-110,150,{stroke:C.coral,sw:5})+label('专用字典',-40,C.ink,50)+line(-60,40,115,40,{sw:5})+line(-60,95,115,95,{sw:5});}
function trio(out,step,words,noteText='') {
  words.forEach((word,i)=>out.push(put(box(word,320,150,i===2?C.mint:C.blue,46),step,'item.'+i,[210+i*390,270],[400,120+i*335])));
  if(noteText) note(out,step,noteText);
}
function decodeView(out,step,code,{noteText=''}={}) {
  const result=E.decode(code),base=code[0]==='R'?code.slice(2,4).repeat(Number(code[1])):result;
  row(out,step,code,{y:130,py:170,header:true});
  out.push(put(arrow([[0,0],[0,90]],{sw:6,head:18}),step,'decode',[600,225],[400,340]));
  row(out,step,result,{y:430,py:610,name:'decoded',indices:true,marks:[...result].flatMap((c,i)=>c!==base[i]?[i]:[])});
  if(noteText) note(out,step,noteText);
}
function mismatch(out,step) {
  row(out,step,CHANGED,{y:150,py:180,name:'wanted',marks:[7]});
  out.push(put(label('需要恢复的原串',0,C.ink,44),step,'wanted-title',[600,45],[400,65]));
  row(out,step,E.decode(RULE),{y:440,py:650,name:'actual',marks:[7]});
  out.push(put(label('只写 '+RULE+' 的解码结果',0,C.ink,44),step,'actual-title',[600,330],[400,490]));
  note(out,step,'末位 B ≠ C · 原串没有恢复');
}
function costPair(out,step,a,b,noteText='同一原串 · 同一套读法') {
  const left=E.inspect(a),right=E.inspect(b);
  if(left.decoded!==right.decoded) throw new Error('长度比较必须恢复同一个原串');
  pair(out,step,box([a,left.length+' 单位'],530,220,C.blue,52),box([b,right.length+' 单位'],530,220,C.mint,52));
  note(out,step,noteText);
}
function ledger(out,step) {
  [E.literal(PLAIN),RULE,PATCH].map(E.inspect).forEach((r,i)=>{
    const art=rect(-175,-190,350,380,{fill:i===2?C.cream:i===1?C.mint:C.blue,r:14})+label(r.code,-110,C.ink,43)+label(r.length+' 单位',0,C.ink,62)+label(i===2?'原串末位改为 C':'原串 '+PLAIN,115,C.ink,38);
    const phone=rect(-345,-120,690,240,{fill:i===2?C.cream:i===1?C.mint:C.blue,r:14})+label(r.code,-65,C.ink,50)+label(r.length+' 单位',10,C.ink,58)+label(i===2?'原串末位改为 C':'原串 '+PLAIN,85,C.ink,40);
    out.push(put(art,step,'ledger.'+i,[210+i*390,300],[0,0],{only:'l'}));
    out.push(put(phone,step,'ledger.'+i,[0,0],[400,150+i*290],{only:'p'}));
  });
  note(out,step,'末位改 C 后 · 直接记录仍需 9 单位');
}
function parts(out,step,left,right,total) {
  pair(out,step,box(left,520,190,C.blue,48),box(right,520,190,C.cream,48));
  out.push(put(label('+',0,C.ink,68),step,'plus',[600,270],[400,425]));
  out.push(put(box(total,700,Array.isArray(total)?170:140,C.mint,48),step,'total',[600,575],[400,900]));
}
function opening() {
  const out=[];
  row(out,0,PLAIN,{y:180,py:220,name:'source'});
  out.push(put(box('AB × 4',480,150,C.mint,68),0,'rule',[600,480],[400,690]));
  note(out,0,'同一个原串 · 两种描述');
  row(out,1,CHANGED,{indices:true,marks:[7]});note(out,1,['规则本身也要写','末位例外也不能漏']);
  pair(out,2,box(['4 个','约定编码字符'],520,220,C.mint,56),box(['需要先约定','怎样读懂它'],520,220,C.blue,52));
  pair(out,3,clock()+label('时间、费用',250,C.ink,48),box(['这一期只量','描述长度'],520,220,C.mint,54));
  trio(out,4,['9 单位','4 单位','6 单位'],'先算记录长度 · 再看模型选择');
  return scene('open',out);
}
function modes() {
  const out=[];
  chapter(out,0,g(tiles('LR',{cell:170,size:90,header:true}),{s:1.1}),'先约定读法 · 每个字符都计费');
  trio(out,1,['只含 A / B / C','原串长度≤8','每字符 1 单位'],'消息结束位置事先已知');
  row(out,2,E.literal(PLAIN),{header:true,indices:true});note(out,2,['L 提示直接照抄','1 个模式字符 + 8 个字母 = 9']);
  row(out,3,RULE,{header:true,indices:true});note(out,3,['R · 次数 4 · 字母块 AB','重复次数只允许 1—4']);
  pair(out,4,box(['L','照抄后面的原串'],530,220,C.blue,52),box(['R','按约定展开'],530,220,C.mint,52));
  note(out,4,'模式提示也要计入长度');
  pair(out,5,box('约定编码字符',520,180,C.mint,52),box(['不是直接比较','实际文件字节数'],530,220,C.cream,48));
  ledger(out,6);
  decodeView(out,7,RULE,{noteText:'解码一致 · 9 − 4 = 5 单位'});
  return scene('modes',out);
}
function exceptions() {
  const out=[];
  chapter(out,0,g(tiles('8C',{cell:150,size:80,marks:[1]}),{s:1.1}),'补一个例外 · 多计两个字符');
  mismatch(out,1);
  parts(out,2,['重复规则','R4AB'],['位置 + 替换字母','8C'],['位置不重复','不超出展开串']);
  decodeView(out,3,PATCH,{noteText:'先展开 AB 四次 · 再把第 8 位换成 C'});
  costPair(out,4,E.literal(CHANGED),PATCH,'4 + 2 = 6 · 比 9 省 3 单位');
  pair(out,5,box(['指定重复规则','4 + 2 × 3 = 10'],540,220,C.cream,48),box(['直接记录','1 + 8 = 9'],530,220,C.mint,52));
  note(out,5,['同一个八字母串 · 需 3 处替换','在这两个候选中 · 直接记录更省']);
  parts(out,6,'规则长度','全部例外长度','两部分一起计入总长度');
  return scene('exceptions',out);
}
function mdl() {
  const out=[];
  chapter(out,0,box('MDL',420,180,C.mint,100),['最小描述长度','把两部分加起来比较']);
  parts(out,1,['描述模型','需要的长度'],['知道模型后','描述剩余数据的长度'],'比较总描述长度');
  parts(out,2,['重复规则','R4AB：4 单位'],['补上例外','8C：2 单位'],['合计 6 单位','原串完整恢复']);
  out.push(put(knob(120)+label(['记录学到的参数','也需要信息'],300,C.tealInk,50),3,'parameter-cost',[600,260],[400,350]));
  pair(out,4,box(['不是简单数参数','不等于所有 AI 的训练法'],550,220,C.cream,44),box(['剩余数据','也可用概率编码'],530,220,C.blue,48));
  pair(out,5,box('X',240,180,C.blue,100)+label('一个字符代表全书？',260,C.ink,46),book()+label(['专为资料定制的字典','描述成本也应计入'],280,C.tealInk,44));
  parts(out,6,'可重复的规律','必要的例外和说明','短规则的价值来自完整交代');
  row(out,7,PLAIN,{y:180,py:230,name:'seen'});
  out.push(put(qBadge(85)+label('下一位仍须独立检验',170,C.tealInk,48),7,'future',[600,445],[400,650]));
  return scene('mdl',out);
}
const answer=E.inspect(QUIZ),direct=E.inspect(E.literal(answer.decoded));
const CARDS=[
  {id:'decode',question:'R3AB6C 解码得到什么？',answer:answer.decoded,front:p=>label(['R3AB6C','解码得到什么？'],p?-25:-40,C.ink,p?48:38)+label('点击核对',p?90:165,C.tealInk,36),back:p=>label(answer.decoded,p?-25:-45,C.ink,p?68:56)+label('先展开 · 再改第 6 位',p?65:100,C.tealInk,p?40:30)},
  {id:'cost',question:'R3AB6C 需要几个编码单位？',answer:answer.length+' 单位',front:p=>label(['R3AB6C','总共几单位？'],p?-25:-40,C.ink,p?48:38)+label('点击核对',p?90:165,C.tealInk,36),back:p=>label(answer.length+' 单位',p?-30:-50,C.ink,p?68:60)+label('4 + 2',p?65:110,C.tealInk,p?48:42)},
  {id:'saving',question:'比直接记录省几单位？',answer:(direct.length-answer.length)+' 单位',front:p=>label(['比直接记录','省几单位？'],p?-25:-40,C.ink,p?48:38)+label('点击核对',p?90:165,C.tealInk,36),back:p=>label((direct.length-answer.length)+' 单位',p?-30:-50,C.ink,p?68:60)+label(direct.length+' − '+answer.length+' = '+(direct.length-answer.length),p?65:110,C.tealInk,p?48:42)}
];
function quiz() {const s=exercise(CARDS);s.svg+=put(label(QUIZ,0,C.ink,44),0,'prompt',[600,50],[400,22]);return s;}
function challenge() {
  const out=[];chapter(out,0,qBadge(110),'先解码 · 再比较同一原串');
  row(out,1,QUIZ,{indices:true,header:true});note(out,1,'展开成什么？总长多少？省了多少？');
  costPair(out,2,E.literal(answer.decoded),QUIZ,'同样恢复 '+answer.decoded+' · 只省 1 单位');
  pair(out,3,magnifier(100)+label('先核对原串完整恢复',255,C.ink,44),box(['再按同一套读法','比较总长度'],530,220,C.mint,48));
  return scene('challenge',out);
}
function limits() {
  const out=[];chapter(out,0,book(),['选读：短规则','不代表所有事情都更省']);
  pair(out,1,box(['本例次数','只有一位：1—4'],530,220,C.blue,52),box(['更长整数与特殊符号','另定读法并计费'],550,220,C.cream,44));
  pair(out,2,box('描述很短',480,180,C.mint,60),clock()+label('运行仍可能很久',255,C.ink,48));
  trio(out,3,['描述长度','运行时间',['结构复杂性','指标']],'三把尺子 · 回答不同问题');
  pair(out,4,box(['有限候选中','找到较短写法'],530,220,C.mint,50),qBadge(90)+label(['不等于找到所有程序中','最短的程序'],255,C.ink,44));
  return scene('limits',out);
}
module.exports=ctx=>[cover(ctx,g(tiles('R4AB',{cell:120,size:68,header:true}),{s:1.05}),'规则与例外都要算'),opening(),modes(),exceptions(),mdl(),challenge(),quiz(),limits(),references(ctx,['〔1〕MDL · 教程论文','〔2〕权重描述长度 · 原始论文'],'约定字符单位 · 先核对解码一致')];
module.exports.thumbnail=section=>{
  const icons=[g(tiles('ABAB',{cell:95,size:58}),{s:.9}),g(tiles('LR',{cell:130,size:72,header:true}),{s:1.1}),g(tiles('8C',{cell:130,size:72,marks:[1]}),{s:1.1}),box('MDL',350,140,C.mint,80),qBadge(105),g(book(),{s:.8})];
  return '<svg class="toc-thumb" viewBox="-230 -190 460 380" aria-hidden="true" focusable="false">'+(section.mark==='源'?magnifier(105):icons[section.num])+'</svg>';
};
