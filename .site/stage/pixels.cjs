'use strict';
/* 第 03 篇纸上算例；二值编码与 8 位灰度的含义刻意分开。 */
const cross = Object.freeze([0, 1, 0, 1, 1, 1, 0, 1, 0]);
const hollow = Object.freeze(cross.map((v, i) => i === 4 ? 0 : v));
const down = Object.freeze([1, 0, 0, 0, 1, 0, 0, 0, 1]);
const up = Object.freeze([0, 0, 1, 0, 1, 0, 1, 0, 0]);
const checker = Object.freeze([0, 255, 255, 0]);
const inverse = Object.freeze(checker.map(v => 255 - v));
const encode = values => values.join('');
const rows = (values, columns) => Array.from({ length: Math.ceil(values.length / columns) }, (_, i) => values.slice(i * columns, (i + 1) * columns));
const mean = values => values.reduce((a, b) => a + b, 0) / values.length;
const shrink = values => Math.round(mean(values));
const channelCount = (height, width, channels) => height * width * channels;
module.exports = { cross, hollow, down, up, checker, inverse, encode, rows, mean, shrink, channelCount };
