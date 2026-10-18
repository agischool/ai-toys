/** Actual scaled dot-product attention, with optional causal mask. */
export const KEYS=Object.freeze([[1,0],[0,1],[-1,0],[0,-1]].map(Object.freeze));
export const DEFAULT=Object.freeze({row:1,qx:0,qy:1,lastValue:10,causal:true});
export function softmax(values){const finite=values.filter(Number.isFinite);if(!finite.length)throw new RangeError('至少保留一个位置');const max=Math.max(...finite),e=values.map(x=>x===-Infinity?0:Math.exp(x-max)),sum=e.reduce((a,b)=>a+b,0);return e.map(x=>x/sum);}
export function attention(q,k,v,causal=true){
 if(!q.length||!k.length||k.length!==v.length||!q[0].length)throw new RangeError('矩阵维度错误');
 const dim=q[0].length;if([...q,...k].some(r=>r.length!==dim||r.some(x=>!Number.isFinite(x)))||v.some(x=>!Number.isFinite(x)))throw new RangeError('输入必须有限且维度一致');
 const scores=q.map(row=>k.map(key=>row.reduce((a,x,j)=>a+x*key[j],0)/Math.sqrt(dim)));
 const weights=scores.map((row,i)=>softmax(row.map((x,j)=>causal&&j>i?-Infinity:x)));
 return {scores,weights,outputs:weights.map(row=>row.reduce((s,w,j)=>s+w*v[j],0))};
}
export function experiment(config=DEFAULT){const c={...DEFAULT,...config};if(!Number.isInteger(c.row)||c.row<0||c.row>3||![c.qx,c.qy,c.lastValue].every(Number.isFinite)||Math.abs(c.qx)>4||Math.abs(c.qy)>4||Math.abs(c.lastValue)>20||typeof c.causal!=='boolean')throw new RangeError('参数超出范围');const q=KEYS.map(a=>[...a]);q[c.row]=[c.qx,c.qy];const values=[2,6,-2,c.lastValue];return {config:c,q,keys:KEYS,values,...attention(q,KEYS,values,c.causal)};}
