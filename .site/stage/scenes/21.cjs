'use strict';
const {C,esc,g,rect,line,arrow,qBadge,magnifier}=require('../art.cjs');
const {label,put,scene,chapter,cover,references,exercise}=require('../lesson.cjs');
const R=require('../sft-records.cjs'),measured=R.summary();
const box=(words,w=540,h=230,fill=C.blue,size=46)=>rect(-w/2,-h/2,w,h,{fill,r:14})+label(words,0,C.ink,size);
const paper=(title,words)=>rect(-275,-165,550,330,{fill:C.white,r:12})+line(-240,-65,240,-65,{sw:3})+label(title,-115,C.tealInk,44)+label(words,45,C.ink,46);
function pair(out,s,a,b){out.push(put(a,s,'left',[300,280],[400,220]),put(b,s,'right',[900,280],[400,660],{d:140}));}
function note(out,s,words){out.push(put(label(words,0,C.tealInk,44),s,'scope',[600,665],[400,940]));}
function dual(out,s,n,draw){out.push(put(draw(false),s,n,[0,0],[0,0],{only:'l'}),put(draw(true),s,n,[0,0],[0,0],{only:'p'}));}
const copying=()=>paper('复制练习',['要求：抄写 abcd','示范：abcd']);
function opening(){const out=[];
 pair(out,0,paper('这次要求',['原样抄写 abcd']),qBadge(100));
 pair(out,1,paper('却接着写',['“抄写要保持字迹工整”']),box(['句子读得通','四个字母没有拿到'],550,240,C.cream,46));
 pair(out,2,copying(),box(['给它看什么？','又给哪几片打分？'],550,240,C.mint,46));return scene('open',out);
}
function textChain(p){const tokens=['今天','下雨','了','。'];let art='';tokens.forEach((t,i)=>{const x=p?400:150+i*300,y=p?110+i*245:300;art+=g(box([t],p?650:250,p?175:230,C.blue,60),{x,y});if(i<3)art+=arrow(p?[[x,y+100],[x,y+135]]:[[x+140,y],[x+160,y]],{sw:5,head:p?18:12});});return art;}
function predict(){const out=[];chapter(out,0,magnifier(110),['从文本里','取得下一片的目标']);
 pair(out,1,paper('先给已有文字',['盖住后面的内容']),box(['先猜下一片','再揭开原文核对'],550,240,C.blue,46));
 dual(out,2,'tokens',textChain);
 pair(out,3,paper('原文下一片是“了”',['给它的概率很小','这一猜损失就较大']),box(['根据损失调整参数','再用于计算预测'],560,250,C.mint,46));
 pair(out,4,paper('大量文本',['这样取得下一片目标']),box(['这条路线的预训练','学习词句与格式规律'],570,250,C.blue,44));
 pair(out,5,paper('材料包含多种写法',['问答 · 故事 · 错误说法']),box(['接一段抄写议论','也可能在文字上通顺'],570,250,C.cream,44));return scene('predict',out);
}
function sampleTypes(p){const items=[['普通文本',['今天 / 下雨 / 了 / 。','从已有文本取得目标']],['指令配示范',['要求：抄写 abcd','示范回答：abcd']]];let art='';
 items.forEach(([title,words],i)=>art+=g(paper(title,words),{x:p?400:300+i*600,y:p?220+i*450:280}));return art;}
function demos(){const out=[];chapter(out,0,g(copying(),{s:.8}),'换成“要求＋示范回答”');
 pair(out,1,copying(),box(['还可加入不同任务','翻译 · 概括 · 指定格式'],570,250,C.mint,44));
 pair(out,2,paper('预训练模型',['用指令与回答示范','继续训练并更新参数']),box(['监督微调的一种用法','SFT'],570,250,C.blue,46));
 dual(out,3,'sample-types',sampleTypes);note(out,3,['两种样本都能做下一片预测','不是换掉全部模型结构']);
 pair(out,4,paper('错误示范',['要求：抄写 abcd','却示范：dcba']),box(['模仿损失降低','不会自动发现违反要求'],570,250,C.cream,44));return scene('demos',out);
}
function predictionTable(p,all=false){let art='';const rows=all?R.align(Array.from(R.sample)):measured.rows;
 for(let group=0;group<2;group++){
  const w=p?740:550,x=p?400:300+600*group,y=p?210+480*group:300,first=group*5,gap=p?110:82,start=p?-185:-140,left=p?-310:-235;
  let inner=rect(-w/2,-180,w,360,{fill:C.white,r:12})+label('预测位置 '+first+'—'+(first+4),-145,C.tealInk,p?44:40);
  [['位置',-90],['输入',-30],['目标',45],['计分',120]].forEach(([t,cy])=>inner+=g(label(t,cy,C.ink,p?38:34),{x:left}));
  rows.slice(first,first+5).forEach((r,j)=>{const cx=start+j*gap,cw=p?90:66;
   inner+=g(label(r.index,-90,C.muted,p?36:34),{x:cx});
   inner+=g(rect(-cw/2,-62,cw,64,{fill:C.blue,r:8})+label(r.input,-30,C.ink,48),{x:cx});
   inner+=g(rect(-cw/2,13,cw,64,{fill:r.score?C.mint:C.blue,r:8})+label(r.target,45,C.ink,48),{x:cx});
   inner+=g(rect(-cw/2,92,cw,56,{fill:r.score?C.mint:C.cream,r:8})+label(r.score,120,r.score?C.tealInk:C.ink,40),{x:cx});
  });art+=g(inner,{x,y});
 }return art;
}
function nextPrediction(out,s,index,revealed){const r=measured.rows[index];
 pair(out,s,paper('截至位置 '+index+' · 已读',[r.prefix.join('')]),box(revealed?['下一片目标：'+r.target,'用它核对刚才的预测']:['先预测下一片','后面的内容尚未揭开'],570,250,revealed?C.mint:C.cream,44));
 note(out,s,index===5?(revealed?['答案揭开后','核对刚才的那一猜']:['输入停在竖线','首个回答尚未揭开']):'首个回答 a 已读入，下一片目标是 b');
}
function mask(){const out=[];chapter(out,0,qBadge(110),['哪些位置','直接计入损失']);
 pair(out,1,paper('一种常见设置',['指令照常读入','只给回答预测计损失']),box(['也有全序列计分设置','不是 SFT 的唯一做法'],570,250,C.cream,44));
 pair(out,2,paper('教学序列',[R.sample]),paper('本例的符号约定',['< 开头','| 分开给定与回答','> 结束']));note(out,2,'每符号一 token，不是产品统一格式');
 dual(out,3,'full-loss',p=>predictionTable(p,true));
 dual(out,4,'answer-loss',p=>predictionTable(p));
 nextPrediction(out,5,5,false);nextPrediction(out,6,5,true);nextPrediction(out,7,6,true);
 pair(out,8,paper('因果遮罩',['管“能看哪里”','不能看后续位置']),box(['损失掩码','管“哪一猜算成绩”'],550,240,C.mint,46));
 pair(out,9,paper('指令侧不计预测损失',['指令仍然作为输入','仍可经注意力影响回答']),box(['回答损失可沿计算','影响参与计算的参数'],570,250,C.blue,44));note(out,9,'不计分，不能推出可以删掉指令');return scene('mask',out);
}
function update(){const out=[];chapter(out,0,g(copying(),{s:.8}),['用同一条练习','再算一次损失']);
 pair(out,1,paper('第一遍',['算回答区间损失','按梯度调整参数']),paper('再做同一道题',['相同目标 abcd>','相同五个位置计分']));
 pair(out,2,paper('一次更新之前',['回答区间损失',measured.before.toFixed(3)]),paper('一次更新之后',['回答区间损失',measured.after.toFixed(3)]));note(out,2,'同一条样本，目标未改变');
 pair(out,3,paper('这次记录支持',['原题损失改善一点']),box(['没有完整预训练和 SFT','新指令完成率没有测'],570,250,C.cream,44));
 pair(out,4,paper('只改提示或上下文',['把问题说清楚','在输入中放几组示范']),box(['没有运行参数更新','不能称为已微调模型'],570,250,C.blue,44));return scene('update',out);
}
const CARDS=[['input',['指令侧不计损失','就能删掉指令？'],'不能这样推','计分开关不删除输入'],['prompt',['改了提示词','就完成 SFT？'],'还没有参数训练','只改变这次输入材料'],['generalize',['原题损失下降','新题都能答对？'],'不能据此外推','还需另出新题检查']].map(([id,q,a,b])=>({id,question:q.join('，'),answer:a,front:p=>label(q,p?-25:-40,C.ink,p?46:36)+label('点击核对',p?90:165,C.tealInk,36),back:p=>label(a,p?-25:-40,C.tealInk,p?48:38)+label(b,p?65:110,C.ink,p?40:28)}));
function challenge(){const out=[];chapter(out,0,qBadge(110),['遮掉的是成绩','还是输入']);
 pair(out,1,paper('检查三个判断',['删指令？改提示算 SFT？','原题变好能外推新题？']),qBadge(100));
 pair(out,2,paper('SFT 学习示范答法',['事实仍需证据核查','换问法也需要检查']),box(['偏好训练、RLHF','本实验没有运行'],570,250,C.cream,46));
 pair(out,3,paper('本篇的三件事',['资料组织 · 选择目标','据损失更新参数']),box(['下一期：模型运行时','哪些计算可以复用？'],570,250,C.mint,44));return scene('challenge',out);
}
function lab(){const out=[];chapter(out,0,magnifier(110),['选读：小实验','怎样留下记录']);
 dual(out,1,'record-mask',p=>predictionTable(p));
 pair(out,2,paper('固定记录 · 保留六位',['更新前：'+measured.before.toFixed(6),'更新后：'+measured.after.toFixed(6)]),box(['学习率 0.01','只更新一次参数'],550,240,C.mint,48));note(out,2,'字幕与原始文件保留完整数值');
 pair(out,3,paper('被遮预测的 logit',['直接损失梯度最大值',String(measured.maskedLogitGradient)]),box(['不代表输入完全无影响','回答损失仍可经注意力','影响参与计算的参数'],570,280,C.cream,42));
 const href='../../Python实现/source/continuation_mechanisms/README.md';
 out.push(put('<a class="hit" href="'+esc(href)+'" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-label="训练、缓存与专家路由实验说明，打开本地文件">'+box(['训练、缓存与专家路由','实验说明 · 点击打开'],700,270,C.mint,46)+'</a>',4,'experiment',[600,300],[400,420]));
 pair(out,5,paper('本实验未实现',['完整预训练与指令微调','回答比较 · 奖励模型','强化学习与 RLHF']),box(['不把整条研究路线结果','都归给 SFT','未测新指令完成率'],570,280,C.cream,42));return scene('lab',out);
}
module.exports=ctx=>[cover(ctx,g(copying(),{s:.85}),'给哪几片打分？'),opening(),predict(),demos(),mask(),update(),challenge(),exercise(CARDS),lab(),references(ctx,['〔1〕下一片预测与预训练','〔2〕示范与后续偏好训练','〔3〕SFT 的计分区间设置'],['固定样本的一次更新','不代表新指令能力测评'])];
module.exports.thumbnail=section=>{const icons=[qBadge(110),magnifier(110),g(copying(),{s:.65}),qBadge(110),g(copying(),{s:.65}),qBadge(110),magnifier(110)];return '<svg class="toc-thumb" viewBox="-230 -190 460 380" aria-hidden="true" focusable="false">'+(section.mark==='源'?magnifier(110):icons[section.num])+'</svg>';};
