// A one-image, one-filter mechanism experiment. This is not the trained Python CNN.
function matrix(value, name) {
  if (!Array.isArray(value) || !value.length || !Array.isArray(value[0]) || !value[0].length) throw new TypeError(`${name} must be a nonempty matrix`);
  const width = value[0].length;
  if (value.some(row => !Array.isArray(row) || row.length !== width || row.some(x => !Number.isFinite(x)))) throw new TypeError(`${name} must be rectangular and finite`);
  return [value.length, width];
}
export const KERNELS = Object.freeze({
  vertical: [[0,1,0],[0,1,0],[0,1,0]],
  horizontal: [[0,0,0],[1,1,1],[0,0,0]],
  edge: [[-1,0,1],[-1,0,1],[-1,0,1]],
  average: Array.from({length:3},()=>[1/9,1/9,1/9])
});
export function makeImage(pattern='vertical', position=3) {
  if (!['vertical','horizontal','cross','blank'].includes(pattern) || !Number.isInteger(position) || position<0 || position>7) throw new RangeError('Invalid pattern or line position');
  const image=Array.from({length:8},()=>Array(8).fill(0));
  for(let i=1;i<7;i++) {
    if(pattern==='vertical'||pattern==='cross') image[i][position]=1;
    if(pattern==='horizontal'||pattern==='cross') image[position][i]=1;
  }
  return image;
}
export function correlate2d(input,kernel) {
  const [h,w]=matrix(input,'input'),[kh,kw]=matrix(kernel,'kernel');
  if(kh>h||kw>w) throw new RangeError('Kernel must fit input');
  return Array.from({length:h-kh+1},(_,r)=>Array.from({length:w-kw+1},(_,c)=>{
    let sum=0; for(let u=0;u<kh;u++) for(let v=0;v<kw;v++) sum+=input[r+u][c+v]*kernel[u][v];
    return sum;
  }));
}
export function correlate2dBackward(input,kernel,upstream) {
  const [h,w]=matrix(input,'input'),[kh,kw]=matrix(kernel,'kernel'),[oh,ow]=matrix(upstream,'upstream');
  if(oh!==h-kh+1||ow!==w-kw+1) throw new RangeError('Incorrect upstream shape');
  const dx=Array.from({length:h},()=>Array(w).fill(0)),dk=Array.from({length:kh},()=>Array(kw).fill(0));
  for(let r=0;r<oh;r++) for(let c=0;c<ow;c++) for(let u=0;u<kh;u++) for(let v=0;v<kw;v++) {
    dx[r+u][c+v]+=upstream[r][c]*kernel[u][v];
    dk[u][v]+=upstream[r][c]*input[r+u][c+v];
  }
  return {dx,dk};
}
export function inspectWindow(input,kernel,index=0,bias=0) {
  if(!Number.isFinite(bias)) throw new TypeError('Bias must be finite');
  const response=correlate2d(input,kernel),width=response[0].length;
  if(!Number.isInteger(index)||index<0||index>=response.length*width) throw new RangeError('Invalid window index');
  const row=Math.floor(index/width),col=index%width;
  const products=kernel.map((kr,u)=>kr.map((weight,v)=>({pixel:input[row+u][col+v],weight,product:input[row+u][col+v]*weight})));
  const activation=response.map(r=>r.map(x=>Math.tanh(x+bias)));
  const mean=activation.flat().reduce((a,b)=>a+b,0)/activation.flat().length;
  return {row,col,products,response,activation,mean,sum:response[row][col],z:response[row][col]+bias,value:activation[row][col]};
}
