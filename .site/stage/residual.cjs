'use strict';
/* 第 06 篇：原值加线性修正的手算示例；不代表训练或模型效果测评。 */
const inputs = Object.freeze([10,20,30]);
function point(input, factor=.5, offset=0) {
  if (![input,factor,offset].every(Number.isFinite)) throw new Error('输入与分支参数必须是有限数');
  const correction = factor*input + offset;
  return { input, correction, output: input+correction };
}
const constant = amount => inputs.map(input => point(input,0,amount));
function change(input, delta, factor=.5) {
  if (!Number.isFinite(delta)) throw new Error('变化量必须是有限数');
  const before=point(input,factor), after=point(input+delta,factor);
  return { before, after, deltaInput:after.input-before.input, deltaF:after.correction-before.correction,
    deltaOutput:after.output-before.output, rate:1+factor };
}
function addMatching(input, correction) {
  if (!Array.isArray(input) || !Array.isArray(correction) || !input.length || input.length!==correction.length ||
    !input.every(Number.isFinite) || !correction.every(Number.isFinite)) throw new Error('逐位相加必须是形状匹配的有限数向量');
  return input.map((v,i) => v+correction[i]);
}
module.exports = { inputs, point, constant, change, addMatching };
