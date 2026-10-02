import {XOR,initialize,forward,lossAndGrads,createAdam,trainStep,collapsedLinear} from './t3-engine.js';
const $=id=>document.getElementById(id),text=(id,value)=>{$(id).textContent=value;},fmt=(v,n=3)=>(Math.abs(v)<10**(-n)/2?0:v).toFixed(n);
let state;
function reset(){ $('mode').value='tanh';$('x1').value='-1';$('x2').value='1';const a=initialize(42),b=initialize(42);state={steps:0,tanh:{p:a,o:createAdam(a),nonlinear:true,history:[]},linear:{p:b,o:createAdam(b),nonlinear:false,history:[]}};record();render(); }
function record(){for(const key of ['tanh','linear']){const q=state[key];q.history.push(lossAndGrads(XOR,q.p,q.nonlinear).loss);}}
function learn(n){const end=Math.min(1200,state.steps+n);while(state.steps<end){for(const key of ['tanh','linear']){const q=state[key];trainStep(XOR,q.p,q.o,q.nonlinear);}state.steps++;record();}render();}
function map(q,x){
 const left=48,top=12,w=630,h=350,extent=1.6,px=v=>left+(v+extent)/(2*extent)*w,py=v=>top+(extent-v)/(2*extent)*h;
 let s='<title id="xor-title">XOR训练点与模型概率</title><desc id="xor-desc">圆形为真实0，菱形为真实1；标注数值为p(1)，十字是当前查看点。</desc>';
 for(let r=0;r<30;r++)for(let c=0;c<44;c++){let prob=forward([-extent+(c+.5)/44*2*extent,extent-(r+.5)/30*2*extent],q.p,q.nonlinear).probability,a=[210,229,252],b=[255,218,180],rgb=a.map((v,j)=>Math.round(v+(b[j]-v)*prob));s+=`<rect x="${left+c*w/44}" y="${top+r*h/30}" width="${w/44+.4}" height="${h/30+.4}" fill="rgb(${rgb})"/>`;}
 for(const v of [-1,0,1])s+=`<path d="M${px(v)},${top}V${top+h} M${left},${py(v)}H${left+w}" stroke="#fff" stroke-opacity=".6"/><text x="${px(v)}" y="${top+h+23}" text-anchor="middle">${v}</text><text x="${left-8}" y="${py(v)+5}" text-anchor="end">${v}</text>`;
 XOR.forEach(point=>{const sx=px(point.x[0]),sy=py(point.x[1]),p=forward(point.x,q.p,q.nonlinear).probability;s+=point.y?`<path d="M${sx},${sy-9}l9,9 -9,9 -9,-9Z" fill="#bd571a" stroke="#fff" stroke-width="2"/>`:`<circle cx="${sx}" cy="${sy}" r="8" fill="#2764b0" stroke="#fff" stroke-width="2"/>`;s+=`<text x="${sx}" y="${sy+27}" text-anchor="middle" style="fill:#17364d;font-weight:700">${p.toFixed(3)}</text>`;});
 s+=`<path d="M${px(x[0])-12},${py(x[1])}h24 M${px(x[0])},${py(x[1])-12}v24" stroke="#10273e" stroke-width="2"/><text x="${left+w}" y="${top+h+43}" text-anchor="end">x₁</text><text x="14" y="16">x₂</text>`;$('xor-map').innerHTML=s;
}
function losses(){const max=Math.max(.75,...state.tanh.history,...state.linear.history)*1.08,left=48,top=13,w=375,h=170;let s='<title id="loss-title">四点训练交叉熵</title><desc id="loss-desc">蓝色实线tanh，橙色虚线无tanh，横轴更新次数，纵轴交叉熵。</desc>';
 for(let j=0;j<=3;j++){const v=max*j/3,y=top+h*(1-j/3);s+=`<path d="M${left},${y}h${w}" class="grid"/><text x="${left-6}" y="${y+4}" text-anchor="end">${v.toFixed(2)}</text>`;}
 for(const [key,color,dash]of[['tanh','#155bd7',''],['linear','#b75520','stroke-dasharray="5 4"']]){const hst=state[key].history,d=hst.map((v,i)=>`${i?'L':'M'}${left+i/Math.max(1,state.steps)*w},${top+h-v/max*h}`).join(' ');s+=`<path d="${d}" fill="none" stroke="${color}" stroke-width="2.3" ${dash}/>`;if(hst.length===1)s+=`<circle cx="${left}" cy="${top+h-hst[0]/max*h}" r="3" fill="${color}"/>`;}
 s+=`<text x="${left}" y="${top+h+23}">0</text><text x="${left+w}" y="${top+h+23}" text-anchor="end">${state.steps} 步</text>`;$('loss-chart').innerHTML=s;
}
function network(q,x,r){
 let s='<title id="network-title">2→4→1实际前向计算</title><desc id="network-desc">连线颜色表示权重正负，隐藏单元显示当前h值；完整参数在下方表格。</desc>';const iy=[100,200],hy=[39,113,187,261];
 for(let i=0;i<2;i++)for(let j=0;j<4;j++){const v=q.p.W1[i*4+j];s+=`<line x1="101" y1="${iy[i]}" x2="301" y2="${hy[j]}" stroke="${v>=0?'#407ec9':'#c47740'}" stroke-opacity=".6" stroke-width="${1+Math.min(3,Math.abs(v))}"/>`;}
 for(let j=0;j<4;j++){let v=q.p.W2[j];s+=`<line x1="369" y1="${hy[j]}" x2="576" y2="150" stroke="${v>=0?'#407ec9':'#c47740'}" stroke-opacity=".65" stroke-width="${1+Math.min(3,Math.abs(v))}"/>`;}
 for(let i=0;i<2;i++)s+=`<circle cx="70" cy="${iy[i]}" r="31" fill="#fff" stroke="#9cb1c4"/><text x="70" y="${iy[i]-4}" text-anchor="middle">x${i+1}</text><text x="70" y="${iy[i]+15}" text-anchor="middle" style="fill:#10273e;font-weight:700">${x[i].toFixed(1)}</text>`;
 for(let j=0;j<4;j++)s+=`<circle cx="335" cy="${hy[j]}" r="33" fill="${r.h[j]>=0?'#e3efff':'#fbead9'}" stroke="#98aabd"/><text x="335" y="${hy[j]-6}" text-anchor="middle">h${j+1}</text><text x="335" y="${hy[j]+13}" text-anchor="middle" style="fill:#10273e;font-weight:700">${fmt(r.h[j],2)}</text>`;
 s+=`<circle cx="617" cy="150" r="40" fill="#fff" stroke="#087f82" stroke-width="2"/><text x="617" y="143" text-anchor="middle">p(1)</text><text x="617" y="164" text-anchor="middle" style="fill:#087f82;font-weight:700">${fmt(r.probability)}</text><text x="617" y="214" text-anchor="middle">z = ${fmt(r.z,2)}</text>`;$('network').innerHTML=s;
 $('parameter-table').innerHTML=r.h.map((h,j)=>`<tr><th scope="row">h${j+1}</th><td>${fmt(q.p.W1[j])}</td><td>${fmt(q.p.W1[4+j])}</td><td>${fmt(q.p.b1[j])}</td><td>${fmt(r.a[j])}</td><td>${fmt(h)}</td><td>${fmt(q.p.W2[j])}</td></tr>`).join('');text('output-bias',`输出偏置 c = ${fmt(q.p.b2[0],5)}；表中共 16 个参数，加上 c，共 17 个。a 和 h 是当前输入算出的中间值，不是额外参数。`);
}
function render(){const mode=$('mode').value,q=state[mode],x=[+$('x1').value,+$('x2').value],r=forward(x,q.p,q.nonlinear);text('x1-value',x[0].toFixed(1));text('x2-value',x[1].toFixed(1));text('steps',`${state.steps} / 1200`);text('nonlinear-loss',state.tanh.history.at(-1).toFixed(4));text('linear-loss',state.linear.history.at(-1).toFixed(4));text('inspect-prob',r.probability.toFixed(4));text('map-heading',q.nonlinear?'有 tanh 的概率地图':'去掉 tanh：线性版概率地图');text('network-mode',`当前查看：${q.nonlinear?'有 tanh':'线性版'}`);
 text('status',state.steps?`两个模型各更新 ${state.steps} 步；只使用四个训练点`:'第 0 步：配对模型已经准备好');
 $('xor-table').innerHTML=XOR.map(point=>`<tr><th scope="row">(${point.x.join(', ')})</th><td>${point.y}</td><td>${forward(point.x,state.tanh.p,true).probability.toFixed(4)}</td><td>${forward(point.x,state.linear.p,false).probability.toFixed(4)}</td></tr>`).join('');
 let detail=`当前位置 (${x.map(v=>v.toFixed(1)).join(', ')})：先得到 a = [${r.a.map(v=>fmt(v,2)).join(', ')}]，${q.nonlinear?'经过 tanh 得到 h':'不经过 tanh，因此 h = a'}，最后 z = ${fmt(r.z)}，p = ${fmt(r.probability,4)}。`;
 if(!q.nonlinear){const c=collapsedLinear(q.p);detail+=` 合并后的分数就是 ${fmt(c.w[0])}x₁ + ${fmt(c.w[1])}x₂ + ${fmt(c.b)}。`;}
 text('inspect-detail',detail);$('run').disabled=state.steps>=1200;$('step').disabled=state.steps>=1200;map(q,x);losses();network(q,x,r);
}
for(const id of ['x1','x2'])$(id).addEventListener('input',render);$('mode').addEventListener('change',render);$('run').addEventListener('click',()=>learn(100));$('step').addEventListener('click',()=>learn(1));$('reset').addEventListener('click',reset);reset();
