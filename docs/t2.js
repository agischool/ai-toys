import {makeDataset,initParams,logit,predict,bceFromLogit,lossAndGrads,trainStep,confusion} from './t2-engine.js';
const $=id=>document.getElementById(id), text=(id,value)=>{$(id).textContent=value;};
let state;
const fmt=(v,n=3)=>Math.abs(v)<10**(-n)/2?(0).toFixed(n):v.toFixed(n);
function restart(defaults=false){if(defaults){$('threshold').value='.5';$('overlap').value='.8';$('inspect').value='0';}const overlap=+$('overlap').value;state={p:initParams(),steps:0,train:makeDataset(42,48,overlap),test:makeDataset(1042,48,overlap)};render();}
function map(threshold,index){
 const points=[...state.train,...state.test],extent=Math.max(2,...points.flatMap(q=>q.x.map(Math.abs)))+.25;
 const left=48,top=14,w=632,h=366,px=x=>left+(x+extent)/(2*extent)*w,py=y=>top+(extent-y)/(2*extent)*h;
 let s='<title id="map-title">逻辑回归概率与当前阈值分界</title><desc id="map-desc">底色为类别1的概率；圆代表真实0，菱形代表真实1。表格提供全部测试点的判断统计。</desc>';
 for(let r=0;r<30;r++)for(let c=0;c<42;c++){const prob=predict([-extent+(c+.5)/42*2*extent,extent-(r+.5)/30*2*extent],state.p),a=[219,232,249],b=[253,224,194],rgb=a.map((v,i)=>Math.round(v+(b[i]-v)*prob));s+=`<rect x="${left+c*w/42}" y="${top+r*h/30}" width="${w/42+.4}" height="${h/30+.4}" fill="rgb(${rgb})"/>`;}
 for(let i=-2;i<=2;i++){let v=i*extent/2;s+=`<path d="M${px(v)},${top}V${top+h} M${left},${py(v)}H${left+w}" stroke="#ffffff" stroke-opacity=".5"/><text x="${px(v)}" y="${top+h+24}" text-anchor="middle">${fmt(v,1)}</text><text x="${left-8}" y="${py(v)+4}" text-anchor="end">${fmt(v,1)}</text>`;}
 const [a,b]=state.p.w,k=Math.log(threshold/(1-threshold))-state.p.b,intersections=[];
 function add(x,y){if(Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x)<=extent+1e-8&&Math.abs(y)<=extent+1e-8&&!intersections.some(q=>Math.hypot(q[0]-x,q[1]-y)<1e-8))intersections.push([x,y]);}
 if(Math.abs(b)>1e-10){add(-extent,(k+a*extent)/b);add(extent,(k-a*extent)/b);}if(Math.abs(a)>1e-10){add((k+b*extent)/a,-extent);add((k-b*extent)/a,extent);}
 if(intersections.length>=2)s+=`<line x1="${px(intersections[0][0])}" y1="${py(intersections[0][1])}" x2="${px(intersections[1][0])}" y2="${py(intersections[1][1])}" stroke="#153a4b" stroke-width="2.5"/>`;
 state.test.forEach((q,i)=>{const x=px(q.x[0]),y=py(q.x[1]);s+=q.y?`<path d="M${x},${y-5}l5,5 -5,5 -5,-5Z" fill="#bd571a" stroke="#fff"/>`:`<circle cx="${x}" cy="${y}" r="4.5" fill="#2764b0" stroke="#fff"/>`;if(i===index)s+=`<circle cx="${x}" cy="${y}" r="10" fill="none" stroke="#132d41" stroke-width="2.5"/>`;});
 s+=`<text x="${left+w}" y="${top+h+43}" text-anchor="end">x₁</text><text x="14" y="16">x₂</text>`;$('probability-map').innerHTML=s;
}
function render(){
 const t=+$('threshold').value,i=+$('inspect').value,cm=confusion(state.test,state.p,t),train=lossAndGrads(state.train,state.p).loss,test=lossAndGrads(state.test,state.p).loss;
 text('threshold-value',t.toFixed(2));text('inspect-value',`${i+1} / 48`);text('steps',`${state.steps} / 500`);text('train-loss',fmt(train,4));text('test-loss',fmt(test,4));text('test-score',`${cm[0][0]+cm[1][1]} / 48`);['tn','fp','fn','tp'].forEach((id,k)=>text(id,cm.flat()[k]));
 text('equation',`z = ${fmt(state.p.w[0],2)}x₁ + ${fmt(state.p.w[1],2)}x₂ + ${fmt(state.p.b,2)}`);
 const q=state.test[i],z=logit(q.x,state.p),p=predict(q.x,state.p),prediction=Number(p>=t);
 text('sample-detail',`点 ${i+1}：x₁ = ${fmt(q.x[0])}，x₂ = ${fmt(q.x[1])}，真实类别 ${q.y}。加权分数 z = ${fmt(z)} → 概率 p = ${fmt(p,4)} → 预测 ${prediction}（${prediction===q.y?'判对':'判错'}）。这个点的交叉熵 = ${fmt(bceFromLogit(z,q.y),4)}。`);
 text('threshold-summary',`阈值 ${t.toFixed(2)} 下，${cm[0][1]+cm[1][1]} 个测试点被判为 1，其中误判 ${cm[0][1]} 个；另有 ${cm[1][0]} 个真实的 1 被漏掉。`);
 text('status',state.steps?`已真实更新 ${state.steps} 步；阈值 ${t.toFixed(2)}`:'第 0 步：所有概率都是 0.5，先点“学习 100 步”');
 $('run').disabled=state.steps>=500;$('step').disabled=state.steps>=500;map(t,i);
}
function learn(n){const end=Math.min(500,state.steps+n);while(state.steps<end){trainStep(state.train,state.p,.15);state.steps++;}render();}
$('threshold').addEventListener('input',render);$('inspect').addEventListener('input',render);$('overlap').addEventListener('change',()=>restart());$('run').addEventListener('click',()=>learn(100));$('step').addEventListener('click',()=>learn(1));$('reset').addEventListener('click',()=>restart(true));restart(true);
