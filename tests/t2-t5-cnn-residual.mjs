import {installNativeSelects} from './native-select.mjs';
// Exact numerical mechanism tests and DOM adapter behavior. Browser rendering is checked separately.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {KERNELS,makeImage,correlate2d,correlate2dBackward,inspectWindow} from '../source/web/t4-engine.js';
import {scalarStack,compareStacks} from '../source/web/t5-engine.js';
const close=(actual,expected,tol=1e-9)=>assert.ok(Math.abs(actual-expected)<=tol,`${actual} != ${expected}`);
let count=0;
const test=(label,fn)=>{fn();count++;console.log(`PASS ${label}`);};
test('CNN manual vertical 3 / horizontal 1, no kernel reversal',()=>{
  assert.deepEqual(correlate2d(KERNELS.vertical,KERNELS.vertical),[[3]]);
  assert.deepEqual(correlate2d(KERNELS.horizontal,KERNELS.vertical),[[1]]);
  assert.deepEqual(correlate2d([[1,2],[3,4]],[[1,2],[3,4]]),[[30]]);
  assert.deepEqual(correlate2d([[1,2,3],[4,5,6]],[[1,0]]),[[1,2],[4,5]]);
});
test('CNN valid geometry, tanh, bias, pooling and nonmutation',()=>{
  const input=makeImage(),snapshot=JSON.stringify(input),r=inspectWindow(input,KERNELS.vertical,14,0);
  assert.equal(r.response.length,6);assert.equal(r.response[0].length,6);assert.equal(r.row,2);assert.equal(r.col,2);assert.equal(r.sum,3);close(r.value,Math.tanh(3));
  close(r.mean,r.activation.flat().reduce((a,b)=>a+b,0)/36);assert.equal(JSON.stringify(input),snapshot);
  assert.equal(inspectWindow(input,KERNELS.vertical,35).mean,r.mean);
  close(inspectWindow(makeImage('blank'),KERNELS.average,0,1).mean,Math.tanh(1));
  assert.equal(inspectWindow(makeImage('vertical',0),KERNELS.vertical).mean,0);
});
test('CNN backward overlapping windows accumulate',()=>{
  const ones=n=>Array.from({length:n},()=>Array(n).fill(1));
  const {dx,dk}=correlate2dBackward(ones(3),ones(2),ones(2));
  assert.deepEqual(dx,[[1,2,1],[2,4,2],[1,2,1]]);assert.deepEqual(dk,[[4,4],[4,4]]);
});
test('CNN full finite differences for all input and kernel cells',()=>{
  const x=[[.2,-.3,.5,.7],[-.2,.8,1,-.1],[.6,.4,-.7,.2]],k=[[.7,-.4],[.2,.8]],u=[[.3,-.2,.7],[-.8,.4,.1]];
  const grads=correlate2dBackward(x,k,u),loss=()=>correlate2d(x,k).flat().reduce((s,v,i)=>s+v*u.flat()[i],0),eps=1e-6;
  for(const [values,expected] of [[x,grads.dx],[k,grads.dk]])for(let r=0;r<values.length;r++)for(let c=0;c<values[r].length;c++){
    const original=values[r][c];values[r][c]=original+eps;const plus=loss();values[r][c]=original-eps;const minus=loss();values[r][c]=original;close((plus-minus)/(2*eps),expected[r][c],2e-10);
  }
});
test('CNN rejects malformed/nonfinite inputs and wrong upstream shapes',()=>{
  for(const fn of [()=>correlate2d([],[[1]]),()=>correlate2d([[1],[2,3]],[[1]]),()=>correlate2d([[NaN]],[[1]]),()=>correlate2d([[1]],[[1,2]]),()=>inspectWindow(makeImage(),KERNELS.vertical,36),()=>inspectWindow(makeImage(),KERNELS.vertical,-1),()=>inspectWindow(makeImage(),KERNELS.vertical,0,Infinity),()=>makeImage('invalid'),()=>makeImage('vertical',8),()=>correlate2dBackward([[1]],[[1]],[[1,2]])])assert.throws(fn);
});
test('Residual one-block manual example and linear chain formulas',()=>{
  const r=compareStacks({x:2,a:.5,blocks:1,branch:'linear'});assert.equal(r.residual.output,3);assert.equal(r.residual.derivative,1.5);assert.equal(r.plain.output,1);assert.equal(r.plain.derivative,.5);
  for(const a of [-1.5,-1,-.3,0,.2,.5,1.5])for(let blocks=1;blocks<=12;blocks++)for(const residual of [false,true]){
    const s=scalarStack({x:1.2,a,blocks,residual});close(s.output,1.2*((residual?1:0)+a)**blocks,1e-8);close(s.derivative,((residual?1:0)+a)**blocks,1e-8);assert.equal(s.gradients[blocks],1);
  }
});
test('Residual zero branch, cancellation and ordinary signed derivative',()=>{
  for(const branch of ['linear','tanh']){const {residual,plain}=compareStacks({x:-1.7,a:0,blocks:12,branch});assert.equal(residual.output,-1.7);assert.equal(residual.derivative,1);assert.equal(plain.output,0);assert.equal(plain.derivative,0);}
  for(const blocks of [1,2,3,12]){const s=compareStacks({x:2,a:-1,blocks});assert.equal(s.residual.derivative,0);assert.equal(s.residual.output,0);assert.equal(s.plain.derivative,(-1)**blocks);}
});
test('Residual nonlinear chain rule matches finite differences',()=>{
  // A smaller perturbation avoids nonlinear truncation error in the steep 12-block case.
  const eps=1e-7;
  for(const x of [-1.8,-.3,0,.4,1.8])for(const a of [-1.3,-.4,0,.3,1.2])for(const blocks of [1,3,8,12])for(const residual of [false,true]){
    const config={x,a,blocks,residual,branch:'tanh'},s=scalarStack(config),plus=scalarStack({...config,x:x+eps}).output,minus=scalarStack({...config,x:x-eps}).output;
    close(s.derivative,(plus-minus)/(2*eps),3e-7*Math.max(1,Math.abs(s.derivative)));
    for(let i=0;i<blocks;i++)close(s.gradients[i],s.factors[i]*s.gradients[i+1]);
  }
});
test('Residual invalid configurations fail before state changes',()=>{
  for(const config of [{x:NaN},{x:3},{a:Infinity},{a:1.6},{blocks:0},{blocks:1.5},{blocks:13},{branch:'relu'},{residual:1}])assert.throws(()=>scalarStack(config));
});
class Element {
  constructor(id){this.id=id;this.value='';this.textContent='';this.hidden=false;this.disabled=false;this.handlers={};this.attrs={};this.innerHTML='';}
  addEventListener(name,fn){(this.handlers[name]??=[]).push(fn);}
  setAttribute(name,value){this.attrs[name]=value;}
  dispatch(name,event={}){for(const fn of this.handlers[name]||[])fn(event);}
  querySelectorAll(){return [];}
}
function mockDOM(chapter){
  const html=fs.readFileSync(new URL(`../source/web/${chapter}.html`,import.meta.url),'utf8'),elements={};
  for(const m of html.matchAll(/id="([^"]+)"/g)){assert.ok(!elements[m[1]],`Duplicate id ${m[1]}`);elements[m[1]]=new Element(m[1]);}
  installNativeSelects(elements,html);
  globalThis.document={getElementById:id=>{assert.ok(elements[id],`Missing ${id}`);return elements[id];}};globalThis.window={addEventListener(){}};
  const frames=new Map();let id=0,time=0;
  globalThis.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
  return {elements,frames,click(id,event){assert.ok(!elements[id].disabled);elements[id].dispatch('click',event);},input(id,value){elements[id].value=String(value);elements[id].dispatch('input');},tick(n=1){for(let i=0;i<n;i++){time+=320;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(time));}}};
}
const cnn=mockDOM('t4');await import('../source/web/t4.js');
test('CNN DOM controls, defaults, scan completion, pause/reset cancellation',()=>{
  const e=cnn.elements;assert.equal(e['response-value'].textContent,'3.000');assert.equal(e['window-coordinate'].textContent,'2 / 2');
  cnn.click('scan');cnn.tick(4);cnn.click('scan');const paused=e['window-coordinate'].textContent;cnn.tick(10);assert.equal(e['window-coordinate'].textContent,paused);assert.equal(cnn.frames.size,0);
  cnn.click('scan');cnn.tick(50);assert.equal(e['window-coordinate'].textContent,'5 / 5');assert.equal(e.next.disabled,true);assert.equal(cnn.frames.size,0);
  cnn.click('scan');cnn.tick(5);cnn.click('reset');cnn.tick(50);assert.equal(e['window-coordinate'].textContent,'2 / 2');assert.equal(cnn.frames.size,0);
  for(let i=0;i<9;i++)cnn.click('scan');cnn.click('reset');assert.equal(cnn.frames.size,0);
  cnn.input('position',0);assert.equal(e['pooled-value'].textContent,'0.000');cnn.input('bias',1);assert.equal(e['pooled-value'].textContent,'0.762');
  cnn.input('kernel','average');cnn.input('window',35);assert.equal(e['window-coordinate'].textContent,'5 / 5');cnn.input('window',999);assert.equal(e['window-coordinate'].textContent,'5 / 5');
  cnn.click('reset');cnn.input('pattern','horizontal');assert.equal(e['response-value'].textContent,'1.000');cnn.click('reset');
});
test('CNN DOM pixel editing updates selected product without changing focus element',()=>{
  const button=new Element('pixel');button.dataset={row:'2',col:'3'};button.closest=()=>button;
  cnn.click('pixel-editor',{target:button});assert.equal(cnn.elements['response-value'].textContent,'2.000');assert.equal(button.attrs['aria-pressed'],'false');assert.match(cnn.elements['result-summary'].textContent,/自定义/);
  cnn.click('reset');assert.equal(cnn.elements['response-value'].textContent,'3.000');
});
const res=mockDOM('t5');await import('../source/web/t5.js');
test('Residual DOM presets, extrema, warning, invalid input and reset',()=>{
  const e=res.elements;assert.equal(e['residual-output'].textContent,'3.000');assert.equal(e['residual-gradient'].textContent,'1.500');
  res.click('preset-decay');assert.equal(e['plain-gradient'].textContent,'6.400e-5');assert.equal(e.warning.hidden,false);
  res.click('preset-zero');assert.equal(e['residual-output'].textContent,'2.000');assert.equal(e['residual-gradient'].textContent,'1.000');assert.equal(e['plain-gradient'].textContent,'0');
  res.click('preset-cancel');assert.equal(e['residual-gradient'].textContent,'0');assert.equal(e['plain-gradient'].textContent,'-1.000');assert.match(e.warning.textContent,/精确抵消/);
  res.click('preset-nonlinear');assert.match(e.equation.textContent,/tanh/);assert.ok(!/NaN|Infinity/.test(e['gradient-chart'].innerHTML));
  res.input('a',1.5);res.input('blocks',12);assert.ok(!/NaN|Infinity/.test(e['gradient-chart'].innerHTML));const before=e['residual-output'].textContent;res.input('blocks',99);assert.equal(e['residual-output'].textContent,before);
  res.click('reset');assert.equal(e['residual-output'].textContent,'3.000');assert.equal(e.warning.hidden,true);assert.equal((e['boundary-rows'].innerHTML.match(/<tr>/g)||[]).length,2);
});
console.log(`PASS: ${count} CNN/residual numerical and DOM adapter groups. No browser rendering claims are made by this suite.`);
