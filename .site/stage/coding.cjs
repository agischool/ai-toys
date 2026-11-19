'use strict';
/* 第 13 篇的约定编码：字符单位不是字节，不搜索所有可能的程序。 */
function sourceString(source) {
  if(typeof source!=='string' || (source.length>8 || /[^ABC]/.test(source))) throw new Error('原串只含 A/B/C，长度不超过 8');
  return source;
}
function decode(code) {
  if(typeof code!=='string') throw new Error('编码须为字符串');
  if(code.startsWith('L')) return sourceString(code.slice(1));
  const m=/^R([1-4])([ABC]{2})((?:[1-8][ABC])*)$/.exec(code);
  if(!m || m[0]!==code) throw new Error('重复编码须为 R、1—4 次、两字母块及成对例外');
  const base=m[2].repeat(Number(m[1])),result=[...base],seen=new Set();
  for(let i=0;i<m[3].length;i+=2) {
    const position=Number(m[3][i]);
    if(position>base.length || seen.has(position)) throw new Error('例外位置须在展开串内且不能重复');
    seen.add(position); result[position-1]=m[3][i+1];
  }
  return result.join('');
}
function literal(source) {return 'L'+sourceString(source);}
function repeated(times,block,changes=[]) {
  if(!Number.isInteger(times)||times<1||times>4||typeof block!=='string'||(block.length!==2 || /[^ABC]/.test(block))||!Array.isArray(changes)) throw new Error('重复规则参数无效');
  const tail=Array.from(changes,c=>{
    if(!c||!Number.isInteger(c.position)||c.position<1||c.position>8||typeof c.letter!=='string'||(c.letter.length!==1 || /[^ABC]/.test(c.letter))) throw new Error('例外记录无效');
    return String(c.position)+c.letter;
  }).join('');
  const code='R'+times+block+tail; decode(code); return code;
}
function inspect(code) {
  const decoded=decode(code),repeat=code.startsWith('R');
  return {code,decoded,length:code.length,kind:repeat?'repeat':'literal',ruleLength:repeat?4:1,remainderLength:code.length-(repeat?4:1)};
}
function compare(source) {
  sourceString(source);
  const candidates=[inspect(literal(source))];
  if(source.length>=2 && source.length%2===0) {
    for(const a of 'ABC') for(const b of 'ABC') {
      const block=a+b,base=block.repeat(source.length/2);
      const changes=[...source].flatMap((letter,i)=>letter===base[i]?[]:[{position:i+1,letter}]);
      candidates.push(inspect(repeated(source.length/2,block,changes)));
    }
  }
  const minLength=Math.min(...candidates.map(c=>c.length));
  return {source,candidates,minLength,best:candidates.filter(c=>c.length===minLength).map(c=>c.code)};
}
module.exports={decode,literal,repeated,inspect,compare};
