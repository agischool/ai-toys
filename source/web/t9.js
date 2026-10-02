import {emptyMemory,populatedMemory,contentAddress,read,write,oneHot} from './t9-engine.js';
const $=id=>document.getElementById(id),f=(x,n=5)=>x.toFixed(n),vec=a=>'['+a.map(x=>f(x)).join(', ')+']',vectors={A:[1,0,0],B:[0,1,0],C:[0,0,1],zero:[0,0,0],replacement:[2,3,0]};
let memory=populatedMemory(),writes=0,last=null,message='初始矩阵已载入；控制器固定，未训练。';
function settings(){return {key:vectors[$('key').value],beta:Number($('beta').value),slot:Number($('slot').value),erase:Number($('erase').value),add:vectors[$('add').value],mode:$('write-mode').value};}
function render(){const c=settings(),address=contentAddress(memory,c.key,c.beta),w=address.weights,r=read(memory,w),maximum=Math.max(...w),winners=w.map((x,i)=>Math.abs(x-maximum)<1e-12?i+1:null).filter(x=>x!==null);
 $('beta-value').textContent=f(c.beta,1);$('erase-value').textContent=f(c.erase,2);$('sum-value').textContent=f(w.reduce((s,x)=>s+x,0),6);$('slot-value').textContent=winners.length===6?'全部并列':winners.join('、');$('maximum-value').textContent=f(maximum,6);$('writes-value').textContent=String(writes);$('read-vector').textContent=vec(r);$('read-summary').textContent=`键 ${$('key').value} → 软读取 ${vec(r)}`;$('status').textContent=message;$('write').disabled=writes>=100;
 let svg='<title>六槽外部记忆与软寻址权重</title><desc>三列为记忆向量，右侧是按当前记忆和键重新计算的读取权重。</desc><text x="230" y="27" text-anchor="middle">记忆值</text><text x="501" y="27" text-anchor="middle">当前软读权重</text>';
 for(let j=0;j<3;j++)svg+=`<text x="${149+j*83}" y="52" text-anchor="middle">维度 ${j+1}</text>`;
 for(let i=0;i<6;i++){svg+=`<text x="90" y="${89+i*47}" text-anchor="end">槽 ${i+1}</text>`;
 for(let j=0;j<3;j++){const value=memory[i][j],shade=Math.max(0,Math.min(1,value/3));svg+=`<rect x="${109+j*83}" y="${61+i*47}" width="78" height="42" rx="4" fill="rgb(${Math.round(236-shade*196)},${Math.round(245-shade*133)},${Math.round(252-shade*80)})"/><text x="${148+j*83}" y="${88+i*47}" text-anchor="middle" style="fill:${shade>.65?'white':'#10273e'}">${f(value,2)}</text>`;}
 svg+=`<rect x="386" y="${70+i*47}" width="171" height="22" rx="3" fill="#e1eaf3"/><rect x="386" y="${70+i*47}" width="${171*w[i]}" height="22" rx="3" fill="#087f82"/><text x="572" y="${88+i*47}">${f(w[i],4)}</text>`;}$('memory-chart').innerHTML=svg;
 $('trace-body').innerHTML=last?last.before.map((row,i)=>`<tr><th scope="row">${i+1}</th><td>${vec(row)}</td><td>${f(last.weights[i],6)}</td><td>${vec(last.after[i])}</td><td>${f(Math.hypot(...row.map((x,j)=>x-last.after[i][j])))}</td></tr>`).join(''):'<tr><td colspan="5">还没有执行写入。调整键和 β 只重新读取，不改变记忆。</td></tr>';
 $('trace-caption').textContent=last?`最近一次写入：e=${f(last.erase,2)}，a=${vec(last.add)}；下面保留写入时的权重`:'最近一次写入的前后对照';
 $('result-summary').textContent=last?`${message} 当前右侧软读取权重已根据更新后的矩阵重算。${writes>=100?'达到本轮 100 次上限，请重置后再写。':''}`:message;
}
function apply(weights,erase,add){const before=memory.map(r=>[...r]),after=write(before,weights,[erase,erase,erase],add);memory=after;last={before,after:after.map(r=>[...r]),weights:[...weights],erase,add:[...add]};writes++;}
for(const id of ['key','slot','beta','erase','add','write-mode'])$(id).addEventListener('input',()=>{message='读取已更新；参数修改没有执行写入。';render();});
$('write').addEventListener('click',()=>{if(writes>=100)return;const c=settings(),w=c.mode==='hard'?oneHot(c.slot):c.mode==='soft'?contentAddress(memory,c.key,c.beta).weights:[.6,.4,0,0,0,0];apply(w,c.erase,c.add);message=`完成第 ${writes} 次写入：${c.mode==='hard'?'硬寻址':c.mode==='soft'?'内容软寻址':'固定错误权重'}。`;render();});
$('clear').addEventListener('click',()=>{memory=emptyMemory();writes=0;last=null;message='矩阵已清空，写入次数归零；参数保持当前设置。';render();});
$('reset').addEventListener('click',()=>{memory=populatedMemory();writes=0;last=null;for(const [key,value]of Object.entries({key:'B',slot:'1',beta:'8',erase:'1',add:'replacement','write-mode':'hard'}))$(key).value=value;message='恢复初始矩阵和默认参数，写入次数归零。';render();});
for(const [id,w,name]of [['correct-example',oneHot(1),'正确覆盖槽 2'],['wrong-example',[.6,.4,0,0,0,0],'错误覆盖槽 1 和槽 2']])$(id).addEventListener('click',()=>{memory=populatedMemory();writes=0;apply(w,1,vectors.replacement);message=`从初始矩阵单独演示：${name}。`;render();});render();
