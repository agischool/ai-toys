import {KERNELS,makeImage,inspectWindow} from './t4-engine.js';
const $=id=>document.getElementById(id),fmt=(x,d=3)=>Math.abs(x)<.00000001?'0.'+'0'.repeat(d):x.toFixed(d);
let config={pattern:'vertical',kernel:'vertical',position:3,index:14,bias:0},pixels=makeImage(),custom=false,running=false,frame=0,last=0;
const color=x=>x===0?'#fff':x>0?`rgba(21,91,215,${.1+.7*Math.min(x/3,1)})`:`rgba(168,61,18,${.1+.7*Math.min(-x/3,1)})`;
function draw(result) {
  let svg='<title id="cnn-title">输入像素与全部有效窗口的未激活响应</title><desc id="cnn-desc">橙色框显示当前三乘三输入窗口与对应输出位置。逐项乘积在图后提供。</desc><text x="24" y="22">输入像素</text><text x="390" y="22">原始响应（未做 tanh）</text>';
  const cell=29,left=24,top=42;
  pixels.forEach((row,r)=>row.forEach((v,c)=>{svg+=`<rect x="${left+c*cell}" y="${top+r*cell}" width="28" height="28" rx="2" fill="${v?'#155bd7':'#fff'}" stroke="#c7d2df"/><text x="${left+c*cell+14}" y="${top+r*cell+19}" text-anchor="middle" style="fill:${v?'#fff':'#50667a'}">${v}</text>`;}));
  svg+=`<rect x="${left+result.col*cell-2}" y="${top+result.row*cell-2}" width="89" height="89" fill="none" stroke="#ad5700" stroke-width="3"/><text x="316" y="149" text-anchor="middle" style="font-size:27px">→</text><text x="316" y="174" text-anchor="middle">同一个核</text>`;
  result.response.forEach((row,r)=>row.forEach((v,c)=>{let x=390+c*35,y=top+r*35;svg+=`<rect x="${x}" y="${y}" width="34" height="34" rx="2" fill="${color(v)}" stroke="#c7d2df"/><text x="${x+17}" y="${y+22}" text-anchor="middle" style="fill:#10273e;font-size:12px">${config.kernel==='average'?v.toFixed(1):v}</text>`;}));
  svg+=`<rect x="${388+result.col*35}" y="${top+result.row*35-2}" width="38" height="38" fill="none" stroke="#ad5700" stroke-width="3"/><text x="24" y="299">当前窗口左上角：(${result.row}, ${result.col})</text><text x="390" y="278">输出边长 8 − 3 + 1 = 6</text>`;
  $('cnn-chart').innerHTML=svg;
}
function renderEditor() {
  $('pixel-editor').innerHTML=pixels.flatMap((row,r)=>row.map((v,c)=>`<button type="button" data-row="${r}" data-col="${c}" aria-pressed="${Boolean(v)}" aria-label="第 ${r} 行第 ${c} 列，当前 ${v}，点击切换">${v}</button>`)).join('');
}
function render() {
  const result=inspectWindow(pixels,KERNELS[config.kernel],config.index,config.bias);
  for(const [id,value] of [['pattern',config.pattern],['kernel',config.kernel],['position',config.position],['window',config.index],['bias',config.bias]]) $(id).value=String(value);
  $('position-value').textContent=String(config.position);$('window-value').textContent=`${config.index+1} / 36`;$('bias-value').textContent=config.bias.toFixed(1);
  $('window-coordinate').textContent=`${result.row} / ${result.col}`;$('response-value').textContent=fmt(result.sum);$('activation-value').textContent=fmt(result.value);$('pooled-value').textContent=fmt(result.mean);
  const kernelNumber=x=>config.kernel==='average'?'1/9':String(x);
  $('products').innerHTML=result.products.flat().map(({pixel,weight,product})=>`<span>${pixel} × (${kernelNumber(weight)})<br>= ${fmt(product)}</span>`).join('');
  $('sum-equation').textContent=`Σ 九项贡献 = ${fmt(result.sum)}；加偏置后 z = ${fmt(result.z)}`;
  $('live-explanation').textContent=`选中的窗口给出 ${fmt(result.sum)}，加上偏置 ${config.bias.toFixed(1)}，变成 ${fmt(result.z)}。tanh 后是 ${fmt(result.value)}。整张图的激活平均是 ${fmt(result.mean)}。`;
  $('result-summary').textContent=`${custom?'自定义像素图':'预设图案'}；手工核的全部 36 个响应已重新计算。改变窗口只改变观察位置，不改变整张图的池化值。`;
  $('next').disabled=config.index===35;$('scan').textContent=running?'暂停扫描':'从左上扫描';
  draw(result);
  const buttons=$('pixel-editor').querySelectorAll?.('button')||[];
  buttons.forEach(button=>{const r=Number(button.dataset.row),c=Number(button.dataset.col);button.classList.toggle('in-window',r>=result.row&&r<result.row+3&&c>=result.col&&c<result.col+3);});
}
function stop() {running=false;cancelAnimationFrame(frame);frame=0;}
function scanTick(time) {
  if(!running) return;
  if(!last||time-last>=300) {
    last=time;
    if(config.index>=35) {stop();$('status').textContent='36 个窗口扫描完成';render();return;}
    config.index++;render();
  }
  frame=requestAnimationFrame(scanTick);
}
for(const id of ['pattern','kernel','position','window','bias']) $(id).addEventListener('input',()=>{
  stop();const raw=$(id).value;
  if(id==='pattern'&&['vertical','horizontal','cross','blank'].includes(raw)) config.pattern=raw;
  else if(id==='kernel'&&Object.hasOwn(KERNELS,raw)) config.kernel=raw;
  else if(id==='position'&&Number.isInteger(Number(raw))&&Number(raw)>=0&&Number(raw)<=7) config.position=Number(raw);
  else if(id==='window'&&Number.isInteger(Number(raw))&&Number(raw)>=0&&Number(raw)<=35) config.index=Number(raw);
  else if(id==='bias'&&Number.isFinite(Number(raw))&&Number(raw)>=-2&&Number(raw)<=2) config.bias=Number(raw);
  else {render();return;}
  if(id==='pattern'||id==='position') {pixels=makeImage(config.pattern,config.position);custom=false;renderEditor();}
  $('status').textContent='参数已更新；没有执行训练';render();
});
$('pixel-editor').addEventListener('click',event=>{
  const button=event.target.closest?.('button[data-row]');if(!button) return;
  const r=Number(button.dataset.row),c=Number(button.dataset.col);if(!Number.isInteger(r)||!Number.isInteger(c)||r<0||r>7||c<0||c>7)return;
  stop();pixels[r][c]=1-pixels[r][c];custom=true;button.textContent=String(pixels[r][c]);button.setAttribute('aria-pressed',String(Boolean(pixels[r][c])));button.setAttribute('aria-label',`第 ${r} 行第 ${c} 列，当前 ${pixels[r][c]}，点击切换`);$('status').textContent=`已修改第 ${r} 行第 ${c} 列像素`;render();
});
$('next').addEventListener('click',()=>{stop();config.index=Math.min(35,config.index+1);$('status').textContent='已移到下一格';render();});
$('scan').addEventListener('click',()=>{
  if(running){stop();$('status').textContent='扫描已暂停';render();return;}
  running=true;config.index=0;last=0;$('status').textContent='正在依次检查 36 个有效窗口';render();frame=requestAnimationFrame(scanTick);
});
$('reset').addEventListener('click',()=>{stop();config={pattern:'vertical',kernel:'vertical',position:3,index:14,bias:0};pixels=makeImage();custom=false;renderEditor();$('status').textContent='已恢复默认：竖线与竖线模板';render();});
window.addEventListener('pagehide',stop);
renderEditor();render();$('status').textContent='已算好全部响应；试着移动橙色窗口';
