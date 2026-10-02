/** D=4, FF=6, one-head pre-LN decoder. All weights fixed and untrained. */
export const TOKENS=['A','B','C'];
export const PARAMETERS={
 embedding:[[1,0,.2,-.3],[0,1,-.3,.2],[-.4,.1,1,.3]],
 position:[[0,0,0,0],[.1,-.1,.05,0],[.2,-.2,0,.05],[.3,-.3,.05,.05],[.4,-.4,.1,0],[.5,-.5,0,.1]],
 Wq:[[.6,.1,0,-.2],[0,.5,.2,.1],[.1,-.1,.7,0],[.2,0,.1,.4]],
 Wk:[[.5,0,.1,.2],[.1,.6,-.1,0],[0,.2,.5,.1],[-.2,.1,0,.6]],
 Wv:[[.4,.1,0,.2],[0,.5,.2,0],[.1,0,.4,-.1],[.2,-.1,0,.3]],
 Wo:[[.5,.1,0,0],[0,.5,.1,0],[0,0,.5,.1],[.1,0,0,.5]],
 W1:[[.3,-.2,.1,.4,0,.2],[.1,.4,-.3,0,.2,-.1],[-.2,.1,.5,.1,-.3,.2],[.2,0,.1,-.2,.4,.3]],
 b1:[0,.1,0,-.1,0,.05],
 W2:[[.2,0,.1,-.1],[0,.2,-.1,.1],[.1,-.1,.2,0],[-.1,.1,0,.2],[.1,.1,-.1,0],[0,-.1,.1,.2]],
 b2:[0,0,0,0],head:[[.3,-.2,.1],[.1,.3,-.1],[-.1,.1,.3],[.2,0,-.2]]
};
export const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
export const mul=(a,m)=>m[0].map((_,j)=>a.reduce((s,x,i)=>s+x*m[i][j],0));
export const add=(a,b)=>a.map((x,i)=>x+b[i]);
export function norm(a){const mean=a.reduce((s,x)=>s+x,0)/a.length,variance=a.reduce((s,x)=>s+(x-mean)**2,0)/a.length;return a.map(x=>(x-mean)/Math.sqrt(variance+1e-5));}
export function softmax(a){const max=Math.max(...a),e=a.map(x=>Math.exp(x-max)),sum=e.reduce((s,x)=>s+x,0);return e.map(x=>x/sum);}
export function forward(text='ABCABC',useAttention=true){
 if(typeof text!=='string'||text.length<1||text.length>6||/[^ABC]/.test(text))throw new RangeError('输入须为 1–6 个 A/B/C');
 if(typeof useAttention!=='boolean')throw new TypeError('注意力开关必须为布尔值');
 const p=PARAMETERS,x=[...text].map((token,i)=>add(p.embedding[TOKENS.indexOf(token)],p.position[i]));
 const n1=x.map(norm),q=n1.map(a=>mul(a,p.Wq)),k=n1.map(a=>mul(a,p.Wk)),v=n1.map(a=>mul(a,p.Wv));
 const scores=q.map(a=>k.map(b=>dot(a,b)/2));
 const weights=scores.map((row,i)=>softmax(row.map((z,j)=>j<=i?z:-Infinity)));
 const mixed=weights.map(row=>v[0].map((_,d)=>row.reduce((s,w,j)=>s+w*v[j][d],0)));
 const attention=mixed.map(a=>useAttention?mul(a,p.Wo):[0,0,0,0]);
 const u=x.map((a,i)=>add(a,attention[i])),n2=u.map(norm),pre=n2.map(a=>add(mul(a,p.W1),p.b1)),relu=pre.map(a=>a.map(x=>Math.max(0,x)));
 const ff=relu.map(a=>add(mul(a,p.W2),p.b2)),h=u.map((a,i)=>add(a,ff[i])),logits=h.map(a=>mul(a,p.head)),probabilities=logits.map(softmax);
 return {text,useAttention,x,n1,q,k,v,scores,weights,mixed,attention,u,n2,pre,relu,ff,h,logits,probabilities};
}
export function prefixDifference(a,b){const n=Math.min(a.text.length,b.text.length)-1;return n<=0?0:Math.max(...a.h.slice(0,n).flatMap((row,i)=>row.map((x,j)=>Math.abs(x-b.h[i][j]))));}
