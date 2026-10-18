// Exact scalar forward and chain-rule sensitivity. No training or accuracy simulation.
export function scalarStack({x=2,a=.5,blocks=1,branch='linear',residual=true}={}) {
  if(!Number.isFinite(x)||!Number.isFinite(a)||Math.abs(x)>2||Math.abs(a)>1.5) throw new RangeError('x or a is outside the bounded experiment');
  if(!Number.isInteger(blocks)||blocks<1||blocks>12) throw new RangeError('Blocks must be an integer from 1 to 12');
  if(!['linear','tanh'].includes(branch)||typeof residual!=='boolean') throw new TypeError('Invalid branch or residual mode');
  const values=[x],factors=[],branches=[];
  for(let i=0;i<blocks;i++) {
    const h=values[i],t=branch==='tanh'?Math.tanh(h):h;
    const correction=a*t;
    const derivative=branch==='tanh'?a*(1-t*t):a;
    values.push((residual?h:0)+correction);
    branches.push(correction);factors.push((residual?1:0)+derivative);
  }
  const gradients=Array(blocks+1).fill(1);
  for(let i=blocks-1;i>=0;i--) gradients[i]=gradients[i+1]*factors[i];
  return {values,factors,branches,gradients,output:values[blocks],derivative:gradients[0]};
}
export function compareStacks(config) {
  return {residual:scalarStack({...config,residual:true}),plain:scalarStack({...config,residual:false})};
}
