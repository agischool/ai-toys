import {DEFAULT,KEYS,experiment} from './t7-engine.js';
const $=id=>document.getElementById(id),f=(x,n=4)=>x.toFixed(n);let config={...DEFAULT};
function render(){
 const r=experiment(config),i=config.row,w=r.weights[i],total=w.reduce((s,x)=>s+x,0),out=r.outputs[i];
 $('qx-value').textContent=f(config.qx,2);$('qy-value').textContent=f(config.qy,2);$('last-value-value').textContent=f(config.lastValue,1);
 $('allowed-value').textContent=String(config.causal?i+1:4);$('sum-value').textContent=f(total,6);$('output-value').textContent=f(out);$('maximum-value').textContent=f(Math.max(...w));
 $('row-summary').textContent=`位置 ${i+1}：Q=[${f(config.qx,1)}, ${f(config.qy,1)}] → 输出 ${f(out)}`;
 $('status').textContent=`已重新计算；${config.causal?'只能读自己与过去':'所有位置可见'}，未训练`;
 $('weights-body').innerHTML=w.map((a,j)=>`<tr><th scope="row">${j+1}</th><td>[${KEYS[j].join(', ')}]</td><td>${f(r.values[j],1)}</td><td>${f(r.scores[i][j])}</td><td>${config.causal&&j>i?'否（−∞）':'是'}</td><td>${f(a,6)}</td><td>${f(a*r.values[j])}</td></tr>`).join('');
 let svg='<title>注意力权重矩阵</title><desc>每行一个读取位置，每列一个被读位置。颜色越深权重越大。详细数值见表格。</desc><text x="355" y="24" text-anchor="middle">被读取的位置（key）</text>';
 for(let j=0;j<4;j++)svg+=`<text x="${205+j*105}" y="51" text-anchor="middle">${j+1}</text>`;
 for(let a=0;a<4;a++){
 svg+=`<text x="135" y="${100+a*62}" text-anchor="end">位置 ${a+1}${a===i?' ◀':''}</text>`;
 for(let b=0;b<4;b++){const v=r.weights[a][b],masked=config.causal&&b>a;svg+=`<rect x="${155+b*105}" y="${66+a*62}" width="99" height="56" rx="5" fill="${masked?'#e8ebef':`rgb(${Math.round(236-v*196)},${Math.round(245-v*133)},${Math.round(252-v*80)})`}" stroke="${a===i?'#087f82':'#c7d7e7'}" stroke-width="${a===i?2:1}"/><text x="${205+b*105}" y="${100+a*62}" text-anchor="middle" style="fill:${v>.65?'white':'#10273e'}">${masked?'×':f(v,3)}</text>`;}
 }$('attention-chart').innerHTML=svg;
 $('result-summary').textContent=`输出 = ${w.map((a,j)=>`${f(a,3)}×${r.values[j]}`).join(' + ')} ≈ ${f(out)}。改 V 会改输出，但本实验的 Q/K 不变，所以权重不变。`;
}
function read(){config={row:Number($('query-row').value),qx:Number($('qx').value),qy:Number($('qy').value),lastValue:Number($('last-value').value),causal:$('causal').checked};render();}
for(const id of ['qx','qy','last-value','causal'])$(id).addEventListener('input',read);
$('query-row').addEventListener('change',()=>{const k=KEYS[Number($('query-row').value)];$('qx').value=String(k[0]);$('qy').value=String(k[1]);read();});
$('equal').addEventListener('click',()=>{$('qx').value='0';$('qy').value='0';read();});
$('reset').addEventListener('click',()=>{config={...DEFAULT};$('query-row').value=String(config.row);$('qx').value=String(config.qx);$('qy').value=String(config.qy);$('last-value').value=String(config.lastValue);$('causal').checked=config.causal;render();});render();
