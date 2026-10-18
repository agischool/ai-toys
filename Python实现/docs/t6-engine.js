/** Scalar mechanism microscope, not the trained 16-unit Python RNN. */
export const DEFAULT = Object.freeze({first:1,delay:8,recurrent:.5,distraction:0});
export function sequence(config=DEFAULT){
 const c={...DEFAULT,...config};
 if(![1,-1].includes(c.first)||!Number.isInteger(c.delay)||c.delay<1||c.delay>24||!Number.isFinite(c.recurrent)||c.recurrent<0||c.recurrent>1.8||!Number.isFinite(c.distraction)||c.distraction<0||c.distraction>1)throw new RangeError('参数超出范围');
 const inputs=[c.first,...Array.from({length:c.delay},(_,i)=>c.distraction*(i%2? -1:1))];
 let hidden=0,derivative=1;
 const steps=inputs.map((x,i)=>{const previous=hidden,pre=x+c.recurrent*previous; hidden=Math.tanh(pre);const local=1-hidden*hidden;derivative=i===0?local:derivative*c.recurrent*local;return {t:i+1,x,previous,pre,hidden,local,recurrentFactor:c.recurrent*local,derivative};});
 return {config:c,inputs,steps};
}
export function finiteDifference(config,epsilon=1e-5){
 const run=first=>{let h=0;for(const x of [first,...sequence(config).inputs.slice(1)])h=Math.tanh(x+config.recurrent*h);return h;};
 return (run(config.first+epsilon)-run(config.first-epsilon))/(2*epsilon);
}
