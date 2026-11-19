'use strict';
/* 第 05 篇：单通道、3×3、不补边的互相关；权重由人指定，没有训练。 */
const vertical = Object.freeze([0,1,0, 0,1,0, 0,1,0]);
const dot = Object.freeze([0,0,0, 0,1,0, 0,0,0]);
const horizontal = Object.freeze([0,0,0, 1,1,1, 0,0,0]);
const black = Object.freeze(Array(9).fill(1));
const half = Object.freeze(vertical.map(v => v * .5));
const contrast = Object.freeze(vertical.map(v => v ? 1 : -1));
function finite(values, count) {
  if (!Array.isArray(values) || values.length !== count || !values.every(Number.isFinite)) throw new Error('输入和模板须为尺寸匹配的有限数数组');
}
function response(patch, weights = vertical) {
  finite(patch, 9); finite(weights, 9);
  const products = patch.map((v,i) => v * weights[i]);
  return { products, score: products.reduce((a,b) => a+b,0) };
}
function lineImage(column, columns = 5) {
  if (!Number.isInteger(columns) || columns < 3 || !Number.isInteger(column) || column < 0 || column >= columns) throw new Error('竖线位置必须在图内');
  return Object.freeze(Array.from({length:columns*3}, (_,i) => i % columns === column ? 1 : 0));
}
function slide(image, columns, weights = vertical, stride = 1) {
  if (!Number.isInteger(columns) || columns < 3 || !Number.isInteger(stride) || stride < 1) throw new Error('列数和步长必须是有效整数');
  finite(image, columns * 3); finite(weights, 9);
  const windows = [];
  for (let left = 0; left <= columns - 3; left += stride) {
    const patch = Array.from({length:9}, (_,i) => image[Math.floor(i/3)*columns + left + i%3]);
    windows.push({ left, patch, ...response(patch,weights) });
  }
  return windows;
}
module.exports = { vertical, dot, horizontal, black, half, contrast, response, lineImage, slide };
