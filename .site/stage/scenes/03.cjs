'use strict';
/* 九格编码、通道数与平均缩小全部来自 pixels.cjs；不模拟模型测评。 */
const { C, g, rect, circle, path, line, txt, arrow, pill, catHead, qBadge, checkBadge, magnifier, modelMachine } = require('../art.cjs');
const { label, put, scene, chapter, cover, references, exercise } = require('../lesson.cjs');
const P = require('../pixels.cjs');

/* 原点在格子中心。二值图的 1 为墨色；灰度图的 0 才是黑色。 */
function grid(values, { columns = 3, cell = 100, mode = 'pattern', mark = -1 } = {}) {
  const rows = Math.ceil(values.length / columns), w = columns * cell, h = rows * cell;
  return values.map((v, i) => {
    const x = (i % columns) * cell - w / 2, y = Math.floor(i / columns) * cell - h / 2;
    const gray = mode === 'gray';
    const fill = gray ? 'rgb(' + [v, v, v].join(',') + ')' : mode === 'matrix' ? C.white : v ? C.ink : C.white;
    const color = gray ? v < 140 ? C.white : C.ink : mode === 'matrix' || !v ? C.ink : C.white;
    return rect(x, y, cell, cell, { fill, r: 0, sw: 4 }) +
      (mode !== 'pattern' ? txt(x + cell / 2, y + cell / 2, v, { size: gray ? 42 : 54, fill: color }) : '') +
      (i === mark ? rect(x + 5, y + 5, cell - 10, cell - 10, { fill: 'none', stroke: C.coral, r: 0, sw: 10 }) : '');
  }).join('');
}
const note = (out, step, words, fill = C.tealInk) => out.push(put(label(words, 0, fill, 44), step, 'note', [600, 650], [400, 950]));
function pair(out, step, a, b) {
  out.push(put(a, step, 'left', [300, 315], [400, 235]));
  out.push(put(b, step, 'right', [900, 315], [400, 725], { d: 140 }));
}
const namedGrid = (values, name, opts = {}) => grid(values, opts) + label(name, 225, C.ink, 44);
const sequence = (values, size = 68) => label(P.encode(values), 0, C.tealInk, size);
const cross = () => grid(P.cross);
const pixel = (value, size = 200) => grid([value], { columns: 1, cell: size, mode: 'gray' });

function opening() {
  const out = [];
  out.push(put(catHead() + g(qBadge(54), { x: 190, y: -100 }) + label('照片里没有算式', 230), 0, 'photo'));
  pair(out, 1, catHead() + label('照片', 220), namedGrid(P.cross, '网格里的颜色'));
  out.push(put(grid(P.cross, { cell: 140, mark: 4 }) + label('一个位置 · 一个像素', 300), 2, 'pixel'));
  out.push(put(cross() + label('先用九格做演示', 240), 3, 'nine'));
  return scene('open', out);
}
function binary() {
  const out = [];
  chapter(out, 0, cross(), '图案与数字 · 可以往返');
  out.push(put(cross() + label('3 行 × 3 列', 240), 1, 'cross'));
  pair(out, 2, rect(-105, -105, 210, 210, { fill: C.ink, r: 0 }) + label('黑 → 1', 200),
    rect(-105, -105, 210, 210, { fill: C.white, r: 0 }) + label('白 → 0', 200));
  pair(out, 3, namedGrid(P.cross, '图案'), namedGrid(P.cross, '矩阵', { mode: 'matrix' }));
  out.push(put(grid(P.cross, { mode: 'matrix', cell: 100 }), 4, 'matrix', [280, 315], [400, 260]));
  out.push(put(sequence(P.cross, 60) + label('从左到右 · 逐行读取', 120, C.ink, 44), 4, 'sequence', [860, 315], [400, 760]));
  out.push(put(sequence(P.cross) + label('3 × 3 ＝ 9 个数', 150), 5, 'length'));
  pair(out, 6, namedGrid([0,0,0,1,1,1,0,0,0], '横线 · 三个 1'), namedGrid([0,1,0,0,1,0,0,1,0], '竖线 · 三个 1'));
  pair(out, 7, namedGrid(P.down, '三个黑格'), namedGrid(P.up, '位置不同'));
  out.push(put(label(['010 | 111 | 010', '竖线只是分行标记'], 0, C.ink, 60), 8, 'separator'));
  pair(out, 9, label(['010', '111', '010'], 0, C.tealInk, 70) + label('按顺序填三行', 220, C.ink, 44), namedGrid(P.cross, '1 涂黑 · 0 留白', { mode: 'both' }));
  out.push(put(cross() + g(checkBadge(48), { x: 190, y: -160 }) + label('十字还原了', 240), 10, 'restored'));
  pair(out, 11, namedGrid(P.cross, '中心是 1', { mode: 'both', mark: 4 }), namedGrid(P.hollow, '中心改成 0', { mode: 'both', mark: 4 }));
  out.push(put(grid(P.hollow, { cell: 125, mark: 4 }) + label(P.encode(P.hollow), 290, C.tealInk, 64), 12, 'hollow'));
  out.push(put(cross() + label('还原也要带上约定', 250), 13, 'contract'));
  pair(out, 14, namedGrid(P.cross, '3 行 × 3 列'),
    grid(P.cross, { columns: 9, cell: 65 }) + label('1 行 × 9 列', 170, C.ink, 44));
  out.push(put(label(['尺寸：几行几列', '顺序：逐行还是逐列', '含义：哪个数表示黑'], 0, C.ink, 62), 15, 'metadata'));
  pair(out, 16, namedGrid(P.down, '保留左上到右下'), namedGrid(P.up, '保留右上到左下'));
  return scene('binary', out);
}
const QUIZ = [
  { id: 'down', values: P.down, question: '还原 100010001', answer: '从左上到右下的对角线', title: '左上 ↘ 右下' },
  { id: 'up', values: P.up, question: '还原 001010100', answer: '从右上到左下的对角线', title: '右上 ↙ 左下' },
  { id: 'hollow', values: P.hollow, question: '还原 010101010', answer: '中心留白的十字', title: '中心留白' }
].map(q => ({ ...q,
  front: portrait => label(P.encode(q.values), portrait ? -50 : -60, C.tealInk, portrait ? 58 : 48) +
    label('3 × 3 · 1 黑 0 白', portrait ? 20 : 30, C.ink, 38) + label('点击看图案', portrait ? 80 : 165, C.tealInk, 36),
  back: portrait => g(grid(q.values, { cell: portrait ? 62 : 74 }), { x: portrait ? -220 : 0, y: portrait ? 0 : -45 }) +
    txt(portrait ? 90 : 0, portrait ? 0 : 145, q.title, { size: 40 })
}));

function gray() {
  const out = [];
  chapter(out, 0, g(pixel(0, 140), { x: -180 }) + pixel(128, 140) + g(pixel(255, 140), { x: 180 }), '数值有更多档 · 层次才留得下');
  pair(out, 1, namedGrid(P.cross, '二值 · 两种选择'),
    grid([0,64,128,64,128,192,128,192,255], { mode: 'gray', cell: 120 }) + label('灰度 · 更多层次', 260, C.ink, 44));
  [2, 3].forEach(step => {
    [0,128,255].forEach((v,i) => {
      const name = ['黑','一档中灰','白'][i];
      out.push(put(pixel(v,180) + label(name,165,C.ink,44),step,'gray.' + i,
        [260 + i * 340,300],[400,480],{only:'l'}));
      out.push(put(g(pixel(v,180),{x:145}) + txt(-165,0,name,{size:48}),step,'gray.' + i,
        [600,350],[400,170+i*300],{only:'p'}));
    });
    if (step === 2) note(out, step, '0—255 · 共 256 个整数');
  });
  pair(out, 4, rect(-110,-110,220,220,{fill:C.ink,r:0}) + label(['二值约定', '1 → 黑'], 220, C.ink, 48),
    pixel(0,220) + label(['灰度约定', '0 → 黑'], 220, C.ink, 48));
  out.push(put(label('数值的含义，取决于规则', 0, C.tealInk, 60), 5, 'meaning'));
  out.push(put(Array.from({length:8}, (_,i) => g(rect(-33,-45,66,90,{fill:C.white,r:8}) + label(i%2,0,C.ink,48), {x:(i-3.5)*90})).join('') +
    label('8 个二进制位', 180), 6, 'bits'));
  out.push(put(label(['2⁸ ＝ 256', '八个位置 · 每处两种选择'], 0, C.ink, 60), 7, 'combinations'));
  out.push(put(pixel(128,240) + label(['128 是一个数值档位', '不等于人眼的一半亮'], 260, C.ink, 48), 8, 'perception'));
  return scene('gray', out);
}
/* 真正的 sRGB 色值只用于色样；界面与结构继续沿用共用调色板。 */
const swatch = (rgb, name) => rect(-100,-100,200,200,{fill:'rgb(' + rgb.join(',') + ')',r:10}) + label(name,165,C.ink,48);
function rgb() {
  const out = [];
  out.push(put(g(swatch([255,0,0],'R'),{x:-220}) + swatch([0,255,0],'G') + g(swatch([0,0,255],'B'),{x:220}), 0, 'channels'));
  const colors = [[255,0,0],[0,0,255],[255,255,255]], names = ['红','蓝','白'];
  colors.forEach((v,i) => {
    out.push(put(swatch(v, '(' + v.join(',') + ')') + label(names[i],-160,C.ink,48), 1, 'sample.' + i,
      [240 + i * 360, 320], [400, 200 + i * 300], { only: 'l' }));
    const row = rect(-185,-85,170,170,{fill:'rgb(' + v.join(',') + ')',r:10}) +
      txt(-300,0,names[i],{size:48}) + txt(190,0,'(' + v.join(',') + ')',{size:46});
    out.push(put(row, 1, 'sample.' + i, [600,350], [400,200+i*300], { only: 'p' }));
  });
  out.push(put(g(circle(-130,0,110,{fill:'rgb(255,0,0)'})) + circle(130,0,110,{fill:'rgb(0,0,255)'}) +
    label(['RGB 描述光的颜色', '不是混颜料'], 255, C.ink, 48), 2, 'light'));
  pair(out, 3, namedGrid(P.cross,'二值：1 黑 0 白'), pixel(0,200) + label(['8 位灰度', '0 黑 · 255 白'],230,C.ink,48));
  pair(out,5,grid(Array(9).fill(0)) + rect(-50,-50,100,100,{fill:'rgb(255,0,0)',r:0,sw:8}) + label('同一位置 · 红像素',225,C.ink,44),
    ['R','G','B'].map((name,i) => g(rect(-75,-85,150,170,{fill:C.white,r:12}) + label(name,-135,C.ink,48) +
      label([255,0,0][i],0,C.tealInk,64),{x:(i-1)*180})).join('') + label('这个位置记录三个数',225,C.ink,44));
  out.push(put(label(['3 × 3 × 3 ＝ ' + P.channelCount(3,3,3), '行 × 列 × 通道'],0,C.ink,64),4,'count'));
  out.push(put(label(['还可能有透明度', '也可能采用其他颜色表示'],0,C.ink,58),6,'formats'));
  pair(out,7,pixel(0,200) + label('这里暗',180),pixel(255,200) + label('那里亮',180));
  out.push(put(rect(-190,-150,190,300,{fill:C.ink,r:0}) + rect(0,-150,190,300,{fill:C.white,r:0}) +
    line(0,-185,0,185,{stroke:C.coral,sw:10}) + label('亮暗变化 · 可能的边缘',260,C.ink,48),8,'edge'));
  out.push(put(catHead() + g(qBadge(58),{x:195,y:-100}) + label('找出变化 ≠ 认出含义',245,C.tealInk,48),9,'not-cat'));
  return scene('rgb',out);
}
function averaging(out,step,values) {
  out.push(put(grid(values,{columns:2,cell:140,mode:'gray'}),step,'input',[280,280],[400,230]));
  out.push(put(arrow([[0,0],[160,0]]),step,'mean-arrow',[495,280],[400,440,.6,90]));
  out.push(put(pixel(P.shrink(values),220),step,'result',[880,280],[400,700]));
  note(out,step,'平均 127.5 → 四舍五入 128');
}
function shrink() {
  const out = [];
  chapter(out,0,grid(P.checker,{columns:2,cell:150,mode:'gray'}),'缩小可以合并格子 · 也会丢信息');
  out.push(put(grid(P.checker,{columns:2,cell:150,mode:'gray'}) + label('四格取平均 → 一格',250),1,'rule'));
  out.push(put(grid(P.checker,{columns:2,cell:155,mode:'gray'}) + label('对角是 0 · 其余是 255',260,C.ink,44),2,'checker'));
  averaging(out,3,P.checker);
  averaging(out,4,P.inverse);
  pair(out,5,namedGrid(P.checker,'平均后 128',{columns:2,cell:140,mode:'gray'}),
    namedGrid(P.inverse,'平均后也是 128',{columns:2,cell:140,mode:'gray'}));
  out.push(put(pixel(128,260) + g(qBadge(52),{x:205,y:-135}) + label('仅凭 128，分不清原排列',280,C.ink,48),6,'ambiguous'));
  out.push(put(label(['这里只演示「取平均」', '其他软件可能采用不同算法'],0,C.ink,56),7,'scope'));
  pair(out,8,namedGrid(P.cross,'3 行 × 3 列'),grid(P.cross,{cell:130}) + label('放大格子 ≠ 补回细节',290,C.ink,44));
  out.push(put(label(['像素行列 · 对焦 · 噪声', '都会影响看到的细节'],0,C.ink,60),9,'sharpness'));
  return scene('shrink',out);
}
function meaning() {
  const out = [];
  chapter(out,0,cross(),'存下图案 · 还不等于理解它');
  out.push(put(cross() + label(['加号？路口？医院？', '还要看场景'],280,C.ink,54),1,'contexts'));
  pair(out,2,namedGrid(P.cross,'能重画'),qBadge(95) + label('能判断含义吗？',210));
  out.push(put(g(modelMachine({label:'继续计算',labelSize:54}),{x:-180,y:-150}) + label('利用训练中学到的线索',250,C.ink,48),3,'model'));
  out.push(put(pixel(128,240) + label(['关键细节已经丢失', '后续判断也受限制'],270,C.ink,50),4,'lost'));
  pair(out,5,rect(-160,-140,320,280,{fill:C.blue}) + label('PNG 文件',0,C.ink,50),namedGrid(P.cross,'读取时解码',{mode:'matrix'}));
  out.push(put(cross() + label(['表示规则保存颜色与位置', '先看输入还留下什么'],285,C.tealInk,50),6,'closing'));
  return scene('meaning',out);
}
module.exports = ctx => [
  cover(ctx,grid(P.cross,{cell:125,mode:'both'}) + g(qBadge(52),{x:245,y:-165}),'九个数，能重画吗'),
  opening(),binary(),exercise(QUIZ),gray(),rgb(),shrink(),meaning(),
  references(ctx,['〔1〕图像文件 · W3C PNG','〔2〕像素模式 · Pillow','〔2〕sRGB · W3C CSS Color','〔3〕图像分类 · TensorFlow'],'编码与缩小均为说明原理的算例')
];
module.exports.thumbnail = section => {
  const icons = [grid(P.cross,{cell:90,mode:'both'}),grid(P.cross,{cell:90}),pixel(128,220),
    grid(P.checker,{columns:2,cell:120,mode:'gray'}),qBadge(100)];
  return '<svg class="toc-thumb" viewBox="-230 -190 460 380" aria-hidden="true" focusable="false">' +
    (section.mark === '源' ? magnifier(105) : icons[section.num]) + '</svg>';
};
