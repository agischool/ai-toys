'use strict';
/* 第 04 篇：固定样本、手动试数与总绝对误差；不冒充梯度下降演示。 */
const inputs = Object.freeze([1, 2, 3]);
const targets = Object.freeze([3, 4, 5]);
const predict = (input, b) => input + b;
function trial(b, answers = targets) {
  if (!Number.isFinite(b) || answers.length !== inputs.length || !answers.every(Number.isFinite)) throw new Error('参数与目标必须是有限数，目标数量须与样本一致');
  const rows = inputs.map((input, i) => {
    const prediction = predict(input, b), target = answers[i];
    return { input, prediction, target, error: Math.abs(prediction - target) };
  });
  return { b, rows, loss: rows.reduce((sum, row) => sum + row.error, 0) };
}
module.exports = { inputs, targets, predict, trial };
