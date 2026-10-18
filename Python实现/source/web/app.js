import fixtures from './fixture-data.js';
import {DEFAULT,MAX_STEPS,STOP_MSE,truth,validateConfig,makeData,newState,advance,finish,results} from './engine.js';
const $=id=>document.getElementById(id);
const controls={lr:$('lr'),noise:$('noise'),n:$('samples'),seed:$('seed')};
let config={...DEFAULT},data,state,running=false,frame=0,token=0,lastTime=0,frameSteps=0,notice='';
try{const values=Object.fromEntries(new URLSearchParams(location.hash.slice(1)));if(Object.keys(values).length)config=validateConfig({...DEFAULT,...values});}catch{notice='链接中的参数无效，已恢复默认设置。';}
data=makeData(fixtures,config);state=finish(data,config.lr);
const fmt=n=>!Number.isFinite(n)?'超出范围':Math.abs(n)>=1e5?n.toExponential(3):n.toFixed(6);
function setControls(){for(const key in controls)controls[key].value=config[key];$('lr-value').textContent=config.lr.toFixed(2);$('noise-value').textContent=config.noise.toFixed(2);}
function storeConfig(){const hash=new URLSearchParams({lr:config.lr,noise:config.noise,n:config.n,seed:config.seed});history.replaceState(null,'',`${location.pathname}${location.search}#${hash}`);}
function cancel(){running=false;token++;cancelAnimationFrame(frame);}
function rebuild(next,{complete=false,message='参数已更新，从第 0 步重新开始。'}={}){const valid=validateConfig(next);cancel();config=valid;data=makeData(fixtures,config);state=complete?finish(data,config.lr):newState(data);notice=message;setControls();storeConfig();render();}
function chartSize(svg,minHeight,ratio){const width=Math.max(260,Math.round(svg.getBoundingClientRect().width||720)),height=Math.max(minHeight,Math.round(width*ratio));svg.setAttribute('viewBox',`0 0 ${width} ${height}`);return {width,height};}
function svgFrame(svg,title,desc,inner){svg.innerHTML=`<title>${title}</title><desc>${desc}</desc>${inner}`;svg.setAttribute('aria-label',`${title}。${desc}`);}
const gridLine=(x1,y1,x2,y2,cls='grid')=>`<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
const label=(x,y,text,anchor='middle')=>`<text x="${x}" y="${y}" text-anchor="${anchor}">${text}</text>`;
function fitChart(){
 const svg=$('fit-chart'),{width:W,height:H}=chartSize(svg,230,.47),L=43,R=15,T=18,B=32;
 const all=[...data.y,...data.yt,truth(-1.1),truth(1.1)],lo=Math.min(...all)-.25,hi=Math.max(...all)+.25;
 const X=x=>L+(x+1.1)/2.2*(W-L-R),Y=y=>T+(hi-y)/(hi-lo)*(H-T-B);
 let s=`<defs><clipPath id="plot-clip"><rect x="${L}" y="${T}" width="${W-L-R}" height="${H-T-B}"/></clipPath></defs>`;
 for(const x of [-1,-.5,0,.5,1])s+=gridLine(X(x),T,X(x),H-B)+label(X(x),H-10,x);
 for(let y=Math.ceil(lo);y<hi;y++)s+=gridLine(L,Y(y),W-R,Y(y))+label(L-10,Y(y)+4,y,'end');
 s+=gridLine(L,H-B,W-R,H-B,'axis')+label(W-R,H-10,'x','end')+label(L-15,T-3,'y');
 const curve=Array.from({length:80},(_,i)=>{const x=-1.1+2.2*i/79;return `${i?'L':'M'}${X(x)},${Y(truth(x))}`;}).join(' ');
 s+=`<g clip-path="url(#plot-clip)"><path class="truth-line" d="${curve}"/>`;
 for(let i=0;i<data.x.length;i++)s+=`<circle class="data-point" cx="${X(data.x[i])}" cy="${Y(data.y[i])}" r="${config.n>64?3:3.7}"/>`;
 for(let i=0;i<data.xt.length;i++){const x=X(data.xt[i]),y=Y(data.yt[i]);s+=`<path class="test-point" d="M${x-3.5},${y-3.5}l7,7m-7,0l7,-7"/>`;}
 // Exact intersection with the visible data rectangle, even while diverging.
 let xa=-1.1,xb=1.1;
 if(state.w!==0){const a=(lo-state.b)/state.w,b=(hi-state.b)/state.w;xa=Math.max(xa,Math.min(a,b));xb=Math.min(xb,Math.max(a,b));}
 if(xa<=xb&&(state.w!==0||(state.b>=lo&&state.b<=hi)))s+=`<path class="fit-line" d="M${X(xa)},${Y(state.w*xa+state.b)} L${X(xb)},${Y(state.w*xb+state.b)}"/>`;
 s+='</g>';
 svgFrame(svg,'训练点、独立测试点与当前直线',`圆点是 ${config.n} 个训练点，叉号是 16 个测试点。当前 w 为 ${state.w.toFixed(5)}，b 为 ${state.b.toFixed(5)}。`,s);
}
function lossChart(){
 const svg=$('loss-chart'),{width:W,height:H}=chartSize(svg,160,.18),L=59,R=19,T=20,B=33;
 const logs=state.history.map(n=>Math.log10(Math.max(n,1e-12))),lo=Math.floor(Math.min(...logs)-.12),hi=Math.max(lo+1,Math.ceil(Math.max(...logs)+.1));
 const X=x=>L+x/MAX_STEPS*(W-L-R),Y=v=>T+(hi-v)/(hi-lo)*(H-T-B);
 let s='';const stride=Math.max(1,Math.ceil((hi-lo)/4));
 for(let v=lo;v<=hi;v+=stride){const t=v===0?'1':v===1?'10':v>=-3&&v<0?Math.pow(10,v).toFixed(-v):`1e${v}`;s+=gridLine(L,Y(v),W-R,Y(v))+label(L-10,Y(v)+4,t,'end');}
 for(const n of [0,50,100,150,200])s+=gridLine(X(n),T,X(n),H-B)+label(X(n),H-10,n);
 const path=logs.map((v,i)=>`${i?'L':'M'}${X(i)},${Y(v)}`).join(' ');
 s+=`<path class="loss-line" d="${path}"/><circle cx="${X(state.steps)}" cy="${Y(logs.at(-1))}" r="4" fill="#155bd7"/>`+label(L,T-6,'MSE','start');
 svgFrame(svg,'训练均方误差随更新次数变化',`对数纵轴。第 0 步误差 ${fmt(state.history[0])}；第 ${state.steps} 步误差 ${fmt(state.history.at(-1))}。`,s);
}
function render(){
 const r=results(state,data),bad=['diverged','nonfinite'].includes(state.reason),growing=r.train_mse>r.initial_mse*2&&state.steps>=2;
 $('equation').textContent=`ŷ = ${Math.abs(state.w)>1e4?state.w.toExponential(2):state.w.toFixed(3)}x ${state.b<0?'−':'+'} ${Math.abs(state.b)>1e4?Math.abs(state.b).toExponential(2):Math.abs(state.b).toFixed(3)}`;
 $('step-value').innerHTML=`${state.steps}<span> / ${MAX_STEPS}</span>`;
 $('train-value').textContent=fmt(r.train_mse);$('test-value').textContent=fmt(r.test_mse);
 const reduction=(1-r.train_mse/r.initial_mse)*100;
 $('reduction-value').textContent=reduction>=0?`${reduction.toFixed(2)}%`:'误差增大';
 $('run').textContent=running?'暂停训练':bad||state.steps===MAX_STEPS?'从头看学习':state.steps?'继续训练':'开始训练';
 $('step').disabled=running||bad||state.steps===MAX_STEPS;
 $('status').textContent=running?`正在训练 · 第 ${state.steps} 步` :bad?`已停止 · 第 ${state.steps} 步`:notice|| (state.steps===MAX_STEPS?'本轮完成 · 200 次真实更新':`已暂停 · 第 ${state.steps} 步`);
 const warning=$('warning');warning.hidden=!bad&&!growing;
 warning.textContent=bad?`误差${state.reason==='nonfinite'?'超出数值范围':'超过 1 亿'}，已提前停止。试着减小学习率。当前数值保留最后一次有效更新。`:growing?'误差正在增大，当前直线可能超出图中范围。可以暂停，减小学习率后重试。':'';
 $('result-summary').textContent=`种子 ${config.seed} · ${config.n} 个训练点 / 16 个测试点。${config.lr===0?'学习率为 0，参数和误差保持不变。':bad?'步长过大时，更新不一定让误差变小。':`当前训练 MSE 为 ${fmt(r.train_mse)}；测试点从未参与参数更新。`}`;
 fitChart();lossChart();
}
function animate(){
 if(running){cancel();notice='';render();return;}
 if(state.steps===MAX_STEPS||['diverged','nonfinite'].includes(state.reason))state=newState(data);
 running=true;notice='';const ownToken=++token;lastTime=0;frameSteps=0;
 function tick(time){
  if(!running||ownToken!==token)return;
  if(!lastTime)lastTime=time;
  frameSteps+=Math.min(150,time-lastTime)/30;lastTime=time;
  let count=Math.floor(frameSteps);frameSteps-=count;
  while(count-->0){if(!advance(state,data,config.lr)){running=false;break;}}
  render();if(running)frame=requestAnimationFrame(tick);
 }
 render();frame=requestAnimationFrame(tick);
}
$('run').addEventListener('click',animate);
$('step').addEventListener('click',()=>{cancel();notice='';advance(state,data,config.lr);render();});
$('reset').addEventListener('click',()=>rebuild(DEFAULT,{message:'已恢复默认参数，回到第 0 步。'}));
for(const [key,el]of Object.entries(controls))el.addEventListener('input',()=>{try{rebuild({...config,[key]:Number(el.value)});}catch{notice='参数无效，请选择支持范围内的数值。';setControls();render();}});
window.addEventListener('resize',()=>{fitChart();lossChart();});
window.addEventListener('pagehide',cancel);
setControls();render();
// Progressive enhancement. The visible controls and these tools share state/actions.
if(document.modelContext?.registerTool){
 const lifecycle=new AbortController();
 const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
 register({name:'read_regression_experiment',title:'Read regression experiment',description:'Read current settings and numerical results without changing the page.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(){return {config:{...config},running,...results(state,data)};}});
 register({name:'configure_regression_experiment',title:'Configure regression experiment',description:'Set learning rate, noise, sample count and seed. Stops training and returns the page to step zero.',inputSchema:{type:'object',properties:{lr:{type:'number',minimum:0,maximum:1.2,multipleOf:.01},noise:{type:'number',minimum:0,maximum:.4,multipleOf:.01},n:{type:'integer',enum:[8,16,32,64,128]},seed:{type:'integer',enum:[7,42,2026]}},required:['lr','noise','n','seed'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){rebuild(validateConfig(input));return {config:{...config},...results(state,data)};}});
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
