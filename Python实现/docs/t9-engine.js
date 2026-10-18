/** Six-slot external memory; controller choices are supplied, never trained. */
export const emptyMemory=()=>Array.from({length:6},()=>[0,0,0]);
export const populatedMemory=()=>[[1,0,0],[0,1,0],[0,0,1],[0,0,0],[0,0,0],[0,0,0]];
function matrix(m){if(!Array.isArray(m)||!m.length||!Array.isArray(m[0])||!m[0].length||m.some(r=>r.length!==m[0].length||r.some(x=>!Number.isFinite(x))))throw new RangeError('记忆矩阵必须非空且为有限数');}
function vector(v,n){if(!Array.isArray(v)||v.length!==n||!v.every(Number.isFinite))throw new RangeError('向量维度错误');}
function weights(w,n){vector(w,n);if(w.some(x=>x<0||x>1)||w.reduce((s,x)=>s+x,0)>1+1e-12)throw new RangeError('权重非负且总和不超过 1');}
function unit(v){const scale=Math.max(...v.map(Math.abs));if(!scale)return v.map(()=>0);const s=v.map(x=>x/scale),n=Math.hypot(...s);return s.map(x=>x/n);}
export function contentAddress(m,key,beta=8){matrix(m);vector(key,m[0].length);if(!Number.isFinite(beta)||beta<0)throw new RangeError('β 必须有限且非负');const u=unit(key),scores=m.map(r=>Math.max(-1,Math.min(1,unit(r).reduce((s,x,i)=>s+x*u[i],0)))),max=Math.max(...scores),e=scores.map(s=>Math.exp((s-max)*beta)),sum=e.reduce((s,x)=>s+x,0);return {scores,weights:e.map(x=>x/sum)};}
export function read(m,w){matrix(m);weights(w,m.length);return m[0].map((_,d)=>m.reduce((s,r,i)=>s+w[i]*r[d],0));}
export function write(m,w,erase,add){matrix(m);weights(w,m.length);vector(erase,m[0].length);vector(add,m[0].length);if(erase.some(x=>x<0||x>1))throw new RangeError('擦除量须在 0 与 1 之间');const out=m.map((row,i)=>row.map((x,d)=>x*(1-w[i]*erase[d])+w[i]*add[d]));matrix(out);return out;}
export const oneHot=(slot,slots=6)=>{if(!Number.isInteger(slot)||slot<0||slot>=slots)throw new RangeError('槽位错误');return Array.from({length:slots},(_,i)=>i===slot?1:0);};
