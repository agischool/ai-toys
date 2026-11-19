'use strict';
/* 第 02 篇手写规则算例：不训练模型，不使用随机数。 */
const sample = (color, shape) => Object.freeze({ color, shape });
const repeat = (color, shape, n) => Array.from({ length: n }, () => sample(color, shape));
const training = Object.freeze([...repeat('red', 'circle', 4), ...repeat('blue', 'square', 4)]);
const switched = Object.freeze([...repeat('blue', 'circle', 2), ...repeat('red', 'square', 2)]);
const mixed = Object.freeze([sample('red', 'circle'), sample('blue', 'circle'), sample('red', 'square'), sample('blue', 'square')]);
const supplemented = Object.freeze([...training, sample('blue', 'circle'), sample('red', 'square')]);
const rules = { A: item => item.color === 'red' ? 'circle' : 'square', B: item => item.shape };
function evaluate(items, rule) {
  const correct = items.filter(item => rules[rule](item) === item.shape).length;
  return { correct, total: items.length, percent: 100 * correct / items.length };
}
module.exports = { training, switched, mixed, supplemented, rules, evaluate };
