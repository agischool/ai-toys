import {DEFAULT,sequence} from './t6-engine.js';
const $=id=>document.getElementById(id),f=(x,n=6)=>x.toFixed(n),s=x=>Math.abs(x)<.0001&&x!==0?x.toExponential(3):f(x);
let config={...DEFAULT},count=0,result=sequence(config);
function render(){
 const steps=result.steps.slice(0,count),last=steps.at(-1);
 for(const key of ['delay','recurrent','distraction'])$(key+'-value').textContent=key==='delay'?String(config[key]):f(config[key],2);
 $('time-value').textContent=`${count} / ${result.steps.length}`;$('hidden-value').textContent=last?f(last.hidden):'0.000000';$('gradient-value').textContent=last?s(last.derivative):'—';$('factor-value').textContent=last?f(last.recurrentFactor):'—';
 $('step').disabled=count===result.steps.length;$('finish').disabled=count===result.steps.length;
 $('status').textContent=count===result.steps.length?'递推完成：全部数字已展开':`已执行 ${count} 步；还剩 ${result.steps.length-count} 步`;
 $('current-step').textContent=last?`h${count} = tanh(${f(last.x,2)} + ${f(config.recurrent,2)} × ${f(last.previous)}) = ${f(last.hidden)}`:'h₀ = 0；点击“递推一步”输入第一个符号';
 $('trace-body').innerHTML=steps.length?steps.map(r=>`<tr${r.t===count?' class="selected"':''}><th scope="row">${r.t}</th><td>${f(r.x,2)}</td><td>${f(r.pre)}</td><td>${f(r.hidden)}</td><td>${s(r.derivative)}</td></tr>`).join(''):'<tr><td colspan="5">尚未执行。初始状态 h₀=0。</td></tr>';
 const x=t=>55+t/result.steps.length*620,y=h=>155-h*115;
 let svg='<title>隐状态随时间变化</title><desc>横轴为时间步，纵轴为隐状态；完整数字见下方表格。</desc>';
 for(const v of [-1,-.5,0,.5,1])svg+=`<line class="grid" x1="55" x2="675" y1="${y(v)}" y2="${y(v)}"/><text x="45" y="${y(v)+4}" text-anchor="end">${v}</text>`;
 svg+=`<line class="axis" x1="55" x2="675" y1="270" y2="270"/><text x="365" y="309" text-anchor="middle">时间步 t</text>`;
 for(let t=0;t<=result.steps.length;t++)if(t%Math.max(1,Math.ceil(result.steps.length/12))===0||t===result.steps.length)svg+=`<text x="${x(t)}" y="290" text-anchor="middle">${t}</text>`;
 const points=[[x(0),y(0)],...steps.map(r=>[x(r.t),y(r.hidden)])];svg+=`<polyline class="fit-line" points="${points.map(p=>p.join(',')).join(' ')}"/>`;
 svg+=points.map(([cx,cy])=>`<circle cx="${cx}" cy="${cy}" r="4.5" fill="#087f82"/>`).join('');$('state-chart').innerHTML=svg;
 $('result-summary').textContent=last?`此时首输入增加一个很小的 ε，状态的线性近似变化约为 ${s(last.derivative)} × ε。导数不表示分类正确率。`:'设置参数，再逐步观察状态和首输入的敏感度。';
}
for(const id of ['first','delay','recurrent','distraction'])$(id).addEventListener('input',()=>{config={first:Number($('first').value),delay:Number($('delay').value),recurrent:Number($('recurrent').value),distraction:Number($('distraction').value)};result=sequence(config);count=0;render();});
$('step').addEventListener('click',()=>{count=Math.min(count+1,result.steps.length);render();});$('finish').addEventListener('click',()=>{count=result.steps.length;render();});$('reset').addEventListener('click',()=>{config={...DEFAULT};for(const k of Object.keys(config))$(k).value=String(config[k]);result=sequence(config);count=0;render();});render();
