// Unit-level DOM adapter tests; these do not claim browser or visual validation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../docs/index.html',import.meta.url),'utf8');
class Element{
 constructor(id){this.id=id;this.value='';this.textContent='';this.handlers={};this.attrs={};this.hidden=false;this.disabled=false;this._html='';}
 set innerHTML(x){this._html=x;this.textContent=x.replace(/<[^>]*>/g,'');} get innerHTML(){return this._html;}
 addEventListener(name,fn){(this.handlers[name]??=[]).push(fn);}
 setAttribute(k,v){this.attrs[k]=v;}
 getBoundingClientRect(){return {width:this.id==='loss-chart'?1040:720};}
 dispatch(name){for(const f of this.handlers[name]||[])f();}
}
const elements={};for(const m of html.matchAll(/id="([^"]+)"/g))elements[m[1]]=new Element(m[1]);
const registered=new Map();const frames=new Map();let frameID=0,t=10;
globalThis.document={getElementById:id=>{assert.ok(elements[id],`Missing ID ${id}`);return elements[id];},modelContext:{registerTool(tool){registered.set(tool.name,tool);}}};
globalThis.location={pathname:'/',search:'',hash:''};
globalThis.history={replaceState(a,b,url){location.hash=url.includes('#')?'#'+url.split('#')[1]:'';}};
globalThis.window={addEventListener(){}};
globalThis.requestAnimationFrame=fn=>{frames.set(++frameID,fn);return frameID;};
globalThis.cancelAnimationFrame=id=>frames.delete(id);
const tick=()=>{t+=35;const queued=[...frames.values()];frames.clear();for(const fn of queued)fn(t);};
const advanceTime=n=>{for(let i=0;i<n;i++)tick();};
const click=id=>{assert.ok(!elements[id].disabled,`${id} disabled`);elements[id].dispatch('click');};
const input=(id,value)=>{elements[id].value=String(value);elements[id].dispatch('input');};
await import('../docs/app.js');
const read=()=>registered.get('read_regression_experiment').execute({});
const configure=input=>registered.get('configure_regression_experiment').execute(input);
assert.equal(elements['train-value'].textContent,'0.006264');assert.equal(elements['test-value'].textContent,'0.007891');
click('run');advanceTime(10);click('run');const paused=read().steps;advanceTime(20);assert.equal(read().steps,paused);assert.equal(read().running,false);
click('step');assert.equal(read().steps,paused+1);
click('run');click('reset');advanceTime(50);assert.equal(read().steps,0);
for(let i=0;i<9;i++)click('run');click('reset');advanceTime(20);assert.equal(read().steps,0);assert.equal(frames.size,0);
input('lr',0);click('step');assert.equal(read().w,0);assert.equal(read().train_mse,read().initial_mse);
input('lr',1.2);click('run');advanceTime(300);assert.equal(read().reason,'diverged');assert.equal(elements.warning.hidden,false);assert.equal(frames.size,0);
click('reset');input('noise',.4);input('samples',128);input('seed',2026);assert.deepEqual(read().config,{lr:.1,noise:.4,n:128,seed:2026});
click('run');advanceTime(300);assert.equal(read().steps,200);assert.equal(read().running,false);
const first=read();input('noise',0);input('samples',8);input('seed',7);assert.equal(read().steps,0);click('step');assert.equal(read().steps,1);
configure(first.config);click('run');advanceTime(300);assert.equal(read().train_mse,first.train_mse);
const before=read();assert.throws(()=>configure({...before.config,lr:NaN}));assert.deepEqual(read(),before);assert.throws(()=>configure({...before.config,n:999}));assert.deepEqual(read(),before);
input('noise',-1);assert.deepEqual(read().config,before.config);
click('reset');click('run');advanceTime(300);assert.equal(read().steps,200);assert.equal(elements['train-value'].textContent,'0.006264');
assert.equal(registered.size,2);assert.equal(registered.get('read_regression_experiment').annotations.readOnlyHint,true);
console.log('PASS: DOM adapter state checks for pause/resume, single-step, repeated run/reset cancellation, zero rate, divergence, noise/sample/seed extrema, reproducibility, invalid input non-mutation, max 200 steps, and WebMCP action semantics. Actual browser validation remains separate.');
