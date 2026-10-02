import {PARAMETERS,TOKENS,forward,prefixDifference} from './t8-engine.js';
const $=id=>document.getElementById(id),f=(x,n=6)=>x.toFixed(n),vec=a=>'['+a.map(x=>f(x)).join(', ')+']';
let text='ABCABC',position=2,enabled=true,lastDifference=null;
const stages=[['x','X：字符 + 位置','embedding 与位置向量相加'],['n1','LN₁(X)','同一位置四维归一化'],['q','Q','LN₁(X) × Wq'],['k','K','LN₁(X) × Wk'],['v','V','LN₁(X) × Wv'],['mixed','加权混合','Σ 权重 × V；尚未乘 Wo'],['attention','注意力分支 A','加权混合 × Wo；关闭时为零'],['u','第一次残差 U','X + A'],['n2','LN₂(U)','第二次逐位置归一化'],['ff','前馈分支 F','ReLU(NW₁+b₁)W₂+b₂'],['h','最终状态 H','U + F']];
function render(){const r=forward(text,enabled),i=position,n=text.length;
 $('position').innerHTML=[...text].map((token,j)=>`<option value="${j}"${j===position?' selected':''}>位置 ${j+1} · ${token}</option>`).join('');$('position').value=String(position);
 $('length-value').textContent=`${n} / 6`;$('sum-value').textContent=f(r.weights[i].reduce((s,x)=>s+x,0));$('probability-value').textContent=f(r.probabilities[i].reduce((s,x)=>s+x,0));$('prefix-value').textContent=n===1?'无前缀':lastDifference===null?'待比较':lastDifference===0?'0.000000':lastDifference.toExponential(2);
 $('status').textContent=`固定参数重算完成；注意力${enabled?'已接入':'未接入'}，未训练`;
 $('block-summary').textContent=`序列 ${text}；跟踪位置 ${i+1} (${text[i]})；${enabled?'注意力参与残差':'注意力候选权重仅作对照，分支贡献为 0'}`;
 $('trace-caption').textContent=`位置 ${i+1}（${text[i]}）的完整前向路径；以下向量均为四维`;
 $('stages-body').innerHTML=stages.map(([key,name,meaning])=>`<tr><th scope="row">${name}</th><td>${vec(r[key][i])}</td><td>${meaning}</td></tr>`).join('');
 let svg='<title>因果注意力矩阵</title><desc>未来位置的权重为零。当前选中位置的行有绿色边框。</desc><text x="375" y="25" text-anchor="middle">读取的 key 位置 / 字符</text>';
 const size=Math.min(68,270/n),left=(700-size*n)/2+30,top=65;
 for(let j=0;j<n;j++)svg+=`<text x="${left+(j+.5)*size}" y="49" text-anchor="middle">${j+1}:${text[j]}</text>`;
 for(let a=0;a<n;a++){svg+=`<text x="${left-12}" y="${top+(a+.58)*size}" text-anchor="end">${a+1}:${text[a]}</text>`;
 for(let b=0;b<n;b++){const w=r.weights[a][b],masked=b>a;svg+=`<rect x="${left+b*size}" y="${top+a*size}" width="${size-3}" height="${size-3}" rx="3" fill="${masked?'#e8ebef':`rgb(${Math.round(235-w*200)},${Math.round(245-w*130)},${Math.round(253-w*90)})`}" stroke="${a===i?'#087f82':'#cbd9e6'}" stroke-width="${a===i?2:1}" opacity="${enabled?1:.55}"/><text x="${left+(b+.5)*size-1.5}" y="${top+(a+.58)*size}" text-anchor="middle" style="fill:${w>.65&&enabled?'white':'#10273e'};font-size:12px">${masked?'×':f(w,2)}</text>`;}}
 $('block-chart').innerHTML=svg;
 let bars='<title>未训练的输出分布</title><desc>三个值来自当前状态的线性输出头和 softmax；不是经过验证的预测。</desc>';
 r.probabilities[i].forEach((p,j)=>{bars+=`<text x="38" y="${44+j*51}" text-anchor="middle">${TOKENS[j]}</text><rect x="62" y="${22+j*51}" width="500" height="31" fill="#e8eef5" rx="4"/><rect x="62" y="${22+j*51}" width="${p*500}" height="31" fill="#155bd7" rx="4"/><text x="581" y="${44+j*51}">${f(p*100,2)}%</text>`;});$('probability-chart').innerHTML=bars;
 $('probability-summary').textContent=`logits = ${vec(r.logits[i])}；softmax = ${vec(r.probabilities[i])}`;
 $('result-summary').textContent=lastDifference===null?'点击“轮换最后一个字符”，实际比较修改前后各前缀位置的 H。':n===1?'当前只有一个字符，没有更早位置可比较。':`修改最后一个字符后，前 ${n-1} 个位置的 H 最大绝对差为 ${lastDifference}。${lastDifference===0?'这次干预未改变前缀输出，符合因果结构。':''}`;
}
function valid(){const value=$('sequence').value;if(!/^[ABC]{1,6}$/.test(value)){$('error').hidden=false;$('error').textContent='请输入 1–6 个大写 A、B 或 C。当前展示仍是上一次有效输入的结果。';$('sequence').setAttribute('aria-invalid','true');$('change-last').disabled=true;return false;}$('error').hidden=true;$('sequence').setAttribute('aria-invalid','false');$('change-last').disabled=false;return true;}
$('sequence').addEventListener('input',()=>{if(!valid())return;text=$('sequence').value;position=Math.min(position,text.length-1);lastDifference=null;render();});
$('position').addEventListener('change',()=>{position=Number($('position').value);render();});
$('attention').addEventListener('input',()=>{enabled=$('attention').checked;lastDifference=null;render();});
$('change-last').addEventListener('click',()=>{if(!valid())return;const before=forward(text,enabled),last=text.at(-1);text=text.slice(0,-1)+TOKENS[(TOKENS.indexOf(last)+1)%3];$('sequence').value=text;lastDifference=prefixDifference(before,forward(text,enabled));render();});
$('reset').addEventListener('click',()=>{text='ABCABC';position=2;enabled=true;lastDifference=null;$('sequence').value=text;$('attention').checked=true;valid();render();});$('parameters').textContent=JSON.stringify(PARAMETERS,null,2);render();
