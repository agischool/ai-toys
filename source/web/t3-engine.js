/** Real 2→4→1 forward/backward and Adam; four pedagogical XOR points. */
import {sigmoid, bceFromLogit, normalFactory} from './t2-engine.js';
export const XOR = [{x:[-1,-1],y:0},{x:[-1,1],y:1},{x:[1,-1],y:1},{x:[1,1],y:0}];
export function initialize(seed = 42) {
  const normal = normalFactory(seed);
  return {W1:Array.from({length:8},()=>normal()*.35),b1:[0,0,0,0],W2:Array.from({length:4},()=>normal()*.25),b2:[0]};
}
export function forward(x,p,nonlinear=true) {
  const a = p.b1.map((b,j)=>x[0]*p.W1[j]+x[1]*p.W1[4+j]+b);
  const h = a.map(v=>nonlinear?Math.tanh(v):v);
  const z = h.reduce((s,v,j)=>s+v*p.W2[j],p.b2[0]);
  return {a,h,z,probability:sigmoid(z)};
}
export function lossAndGrads(data,p,nonlinear=true) {
  const grads=Object.fromEntries(Object.entries(p).map(([k,v])=>[k,v.map(()=>0)]));
  let loss=0;
  for (const {x,y} of data) {
    const {h,z,probability}=forward(x,p,nonlinear), dz=(probability-y)/data.length;
    loss+=bceFromLogit(z,y)/data.length; grads.b2[0]+=dz;
    for(let j=0;j<4;j++) { grads.W2[j]+=h[j]*dz; const da=dz*p.W2[j]*(nonlinear?1-h[j]*h[j]:1); grads.b1[j]+=da; grads.W1[j]+=x[0]*da; grads.W1[4+j]+=x[1]*da; }
  }
  return {loss,grads};
}
export function createAdam(p) {
  const zeros=()=>Object.fromEntries(Object.entries(p).map(([k,v])=>[k,v.map(()=>0)]));
  return {m:zeros(),v:zeros(),step:0};
}
export function trainStep(data,p,optimizer,nonlinear=true,lr=.03) {
  const {grads}=lossAndGrads(data,p,nonlinear); optimizer.step++;
  const b1=.9,b2=.999,t=optimizer.step;
  for(const k of Object.keys(p)) for(let j=0;j<p[k].length;j++) {
    const g=grads[k][j]; optimizer.m[k][j]=b1*optimizer.m[k][j]+(1-b1)*g;
    optimizer.v[k][j]=b2*optimizer.v[k][j]+(1-b2)*g*g;
    const m=optimizer.m[k][j]/(1-b1**t),v=optimizer.v[k][j]/(1-b2**t);
    p[k][j]-=lr*m/(Math.sqrt(v)+1e-8);
  }
  return p;
}
export function accuracy(data,p,nonlinear=true) { return data.filter(({x,y})=>Number(forward(x,p,nonlinear).probability>=.5)===y).length/data.length; }
export function collapsedLinear(p) {
  return {w:[0,1].map(i=>p.W2.reduce((s,v,j)=>s+p.W1[i*4+j]*v,0)),b:p.b1.reduce((s,v,j)=>s+v*p.W2[j],p.b2[0])};
}
