import {compareStacks} from './t5-engine.js';
const $=id=>document.getElementById(id);
const format=x=>x===0?'0':(Math.abs(x)<.001||Math.abs(x)>=10000?x.toExponential(3):x.toFixed(3));
let config={x:2,a:.5,blocks:1,branch:'linear'};
function draw(result) {
  const sets=[result.residual,result.plain],nonzero=sets.flatMap(s=>s.gradients.map(Math.abs)).filter(x=>x>0);
  let low=Math.floor(Math.log10(Math.min(...nonzero))),high=Math.ceil(Math.log10(Math.max(...nonzero)));
  if(low===high){low--;high++;}
  const X=i=>72+i/config.blocks*610,Y=v=>v===0?293:244-(Math.log10(Math.abs(v))-low)/(high-low)*202;
  let svg='<title id="gradient-title">反向敏感度：相同输出端导数 1，经过不同路径</title><desc id="gradient-desc">实线圆点是残差，虚线方点是普通；反向从右往左。纵轴为导数绝对值的对数刻度，精确零单独标在底部。</desc>';
  const step=Math.max(1,Math.ceil((high-low)/5));
  for(let exp=low;exp<=high;exp+=step){const y=Y(10**exp);svg+=`<line x1="72" y1="${y}" x2="682" y2="${y}" class="grid"/><text x="59" y="${y+4}" text-anchor="end">10^${exp}</text>`;}
  svg+='<text x="72" y="21">|dy/dh|（对数刻度）</text><text x="682" y="21" text-anchor="end">← 反向从这里开始：1</text><line x1="72" y1="270" x2="682" y2="270" stroke="#a6b5c3" stroke-dasharray="2 5"/><text x="59" y="298" text-anchor="end">精确 0</text><line x1="72" y1="293" x2="682" y2="293" class="grid"/>';
  sets.forEach((series,k)=>{
    const color=k?'#b55427':'#087f82';
    svg+=`<polyline points="${series.gradients.map((v,i)=>`${X(i)},${Y(v)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="3" ${k?'stroke-dasharray="6 5"':''}/>`;
    series.gradients.forEach((v,i)=>{const x=X(i),y=Y(v);svg+=k?`<rect x="${x-4}" y="${y-4}" width="8" height="8" fill="#fff" stroke="${color}" stroke-width="2"/>`:`<circle cx="${x}" cy="${y}" r="5" fill="${color}"/>`;if(v===0)svg+=`<text x="${x}" y="${y+(k?20:-12)}" text-anchor="middle" style="fill:${color};font-size:11px">0</text>`;});
  });
  for(let i=0;i<=config.blocks;i++)svg+=`<text x="${X(i)}" y="332" text-anchor="middle">${i===0?'0 输入':i===config.blocks?`${i} 输出`:i}</text>`;
  $('gradient-chart').innerHTML=svg;
}
function render() {
  const result=compareStacks(config),r=result.residual,p=result.plain;
  for(const id of ['x','a','blocks','branch'])$(id).value=String(config[id]);
  $('x-value').textContent=config.x.toFixed(1);$('a-value').textContent=config.a.toFixed(2);$('blocks-value').textContent=String(config.blocks);
  $('residual-output').textContent=format(r.output);$('plain-output').textContent=format(p.output);$('residual-gradient').textContent=format(r.derivative);$('plain-gradient').textContent=format(p.derivative);
  $('equation').textContent=config.branch==='linear'?`N = ${config.blocks}；普通 dy/dx = (${config.a.toFixed(2)})ᴺ = ${format(p.derivative)}；残差 dy/dx = (1 + ${config.a.toFixed(2)})ᴺ = ${format(r.derivative)}`:`F(h) = ${config.a.toFixed(2)} × tanh(h)；每站先算 F′(h) = a × [1 − tanh²(h)]，残差再加 1，然后沿路相乘。`;
  $('boundary-rows').innerHTML=r.values.map((v,i)=>`<tr><th scope="row">${i}${i===0?' · 输入':i===config.blocks?' · 输出':''}</th><td>${format(v)}</td><td>${format(p.values[i])}</td><td>${i===config.blocks?'—':format(r.factors[i])}</td><td>${i===config.blocks?'—':format(p.factors[i])}</td><td>${format(r.gradients[i])}</td><td>${format(p.gradients[i])}</td></tr>`).join('');
  const warnings=[];
  if(r.derivative===0)warnings.push('残差的输入导数恰好为 0：这组参数下存在精确抵消，直达路不能保证导数非零。');
  if(Math.abs(r.derivative)>10)warnings.push('残差的输入敏感度已超过 10：变化被放大，残差连接也可能带来很大的梯度。');
  if(p.derivative!==0&&Math.abs(p.derivative)<.001)warnings.push('普通路径的输入敏感度小于 0.001，变化在多站传播中明显衰减。');
  $('warning').hidden=warnings.length===0;$('warning').textContent=warnings.join(' ');
  $('result-summary').textContent=`同样从输出端的 1 向前回传：残差到输入时为 ${format(r.derivative)}，普通为 ${format(p.derivative)}。${config.branch==='tanh'?'两种网络的中间输入不同，因此相同 a 也会得到不同的分支导数。':'线性模式中这些导数不依赖输入 x。'} 图和表是当前计算，不是训练成绩。`;
  draw(result);
}
for(const id of ['x','a','blocks','branch'])$(id).addEventListener('input',()=>{
  const candidate={...config,[id]:id==='branch'?$(id).value:Number($(id).value)};
  try{compareStacks(candidate);}catch{render();return;}
  config=candidate;render();$('status').textContent='两种路径均已重新计算';
});
function preset(next,label){config={...next};render();$('status').textContent=label;}
$('reset').addEventListener('click',()=>preset({x:2,a:.5,blocks:1,branch:'linear'},'已恢复手算例子：x = 2，a = 0.5，1 块'));
$('preset-decay').addEventListener('click',()=>preset({x:1,a:.2,blocks:6,branch:'linear'},'六块线性对照：观察多次相乘'));
$('preset-zero').addEventListener('click',()=>preset({x:2,a:0,blocks:6,branch:'linear'},'零分支：残差原样通过'));
$('preset-cancel').addEventListener('click',()=>preset({x:2,a:-1,blocks:3,branch:'linear'},'负一分支：残差两路完全抵消'));
$('preset-nonlinear').addEventListener('click',()=>preset({x:2,a:.5,blocks:6,branch:'tanh'},'非线性对照：每站倍率随输入改变'));
render();$('status').textContent='已算好手算例子；试着增加模块数';
