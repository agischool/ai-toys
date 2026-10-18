export const MAX_STEPS = 200;
export const STOP_MSE = 1e8;
export const DEFAULT = Object.freeze({lr:.1,noise:.08,n:32,seed:42});
export const truth = x => 1.7*x+.4+.18*x*x;
export function validateConfig(input){
  const c={lr:Number(input.lr),noise:Number(input.noise),n:Number(input.n),seed:Number(input.seed)};
  if(!Number.isFinite(c.lr)||Math.abs(c.lr*100-Math.round(c.lr*100))>1e-9||Math.abs(c.noise*100-Math.round(c.noise*100))>1e-9||c.lr<0||c.lr>1.2||!Number.isFinite(c.noise)||c.noise<0||c.noise>.4||![8,16,32,64,128].includes(c.n)||![7,42,2026].includes(c.seed))throw new RangeError('参数超出支持范围');
  return c;
}
export function makeData(fixtures,config){
  const c=validateConfig(config),d=fixtures.datasets[c.seed],a=d.train[c.n],t=d.test;
  return {x:[...a.x],y:a.x.map((x,i)=>truth(x)+c.noise*a.z[i]),xt:[...t.x],yt:t.x.map((x,i)=>truth(x)+c.noise*t.z[i])};
}
export function lossGrads(x,y,w,b){
  let mse=0,dw=0,db=0;
  for(let i=0;i<x.length;i++){const e=w*x[i]+b-y[i];mse+=e*e;dw+=2*e*x[i];db+=2*e;}
  const n=x.length;return {mse:mse/n,dw:dw/n,db:db/n};
}
export function newState(data){const mse=lossGrads(data.x,data.y,0,0).mse;return {w:0,b:0,steps:0,history:[mse],reason:'ready'};}
export function advance(state,data,lr){
  if(!Number.isFinite(lr)||lr<0||lr>1.2)throw new RangeError('学习率超出支持范围');
  if(state.steps>=MAX_STEPS||['diverged','nonfinite'].includes(state.reason))return false;
  const {dw,db}=lossGrads(data.x,data.y,state.w,state.b);
  const w=state.w-lr*dw,b=state.b-lr*db,mse=lossGrads(data.x,data.y,w,b).mse;
  if(![w,b,mse].every(Number.isFinite)){state.reason='nonfinite';return false;}
  state.w=w;state.b=b;state.steps++;state.history.push(mse);
  state.reason=mse>STOP_MSE?'diverged':state.steps===MAX_STEPS?'complete':'ready';
  return !['diverged','complete'].includes(state.reason);
}
export function finish(data,lr){const state=newState(data);while(advance(state,data,lr)){}return state;}
export function results(state,data){return {w:state.w,b:state.b,steps:state.steps,train_mse:state.history.at(-1),test_mse:lossGrads(data.xt,data.yt,state.w,state.b).mse,initial_mse:state.history[0],reason:state.reason};}
