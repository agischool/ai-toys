'use strict';
/* 手写规则贯穿全篇：训练同分 → 换色分流 → 补样本 → 保留独立测试。
 * 正文只放字幕；算例由 blocks.cjs 计算，无模型训练或外部请求。 */
const { C, esc, el, g, rect, circle, path, line, txt, arrow, pill, tagCard, qBadge, checkBadge, robot, knob, modelMachine, person, magnifier } = require('../art.cjs');
const E = require('../blocks.cjs');
const DESK = { l: [0, 0, 1200, 720], p: [0, 0, 800, 1000] };
const label = (text, y = 0, fill = C.ink, size = 48) => txt(0, y, text, { size, fill });
const put = (art, step, n, l = [600, 350], p = [400, 480], opts = {}) => el(art, { at: step, until: step + 1, kind: 'pop', n, l, p, ...opts });
const scene = (id, svg) => ({ id, cams: { desk: DESK }, svg: svg.join('') });
const block = (color, shape, r = 70) => shape === 'circle'
  ? circle(0, 0, r, { fill: color === 'red' ? C.coral : C.blue })
  : rect(-r, -r, r * 2, r * 2, { fill: color === 'red' ? C.coral : C.blue, r: 8 });
const outline = (shape, r = 50) => shape === 'circle'
  ? circle(0, 0, r, { fill: C.white }) : rect(-r, -r, r * 2, r * 2, { fill: C.white, r: 5 });
const wrong = (r = 25) => circle(0, 0, r, { fill: C.coralInk, sw: 4 }) +
  path(`M${-r * .35} ${-r * .35} L${r * .35} ${r * .35} M${r * .35} ${-r * .35} L${-r * .35} ${r * .35}`, { stroke: C.white, sw: 5 });

function tray(items, title, { columns = 4, marks = null, labels = false } = {}) {
  const rows = Math.ceil(items.length / columns), dx = 112, dy = labels ? 165 : 135;
  const w = Math.max(480, columns * dx + 50), h = rows * dy + 170;
  return rect(-w / 2, -h / 2, w, h, { fill: C.white, r: 28 }) + label(title, -h / 2 + 65, C.ink, 44) +
    items.map((item, i) => {
      const x = (i % columns - (columns - 1) / 2) * dx, y = -h / 2 + 190 + Math.floor(i / columns) * dy;
      return g(block(item.color, item.shape, 39), { x, y }) +
        (labels ? txt(x, y + 75, item.shape === 'circle' ? '圆' : '方', { size: 36 }) : '') +
        (marks ? g(marks(item) ? checkBadge(19) : wrong(19), { x: x + 32, y: y + 34 }) : '');
    }).join('');
}
function rulePanel(rule, result = null) {
  const color = rule === 'A', words = color ? ['红 → 圆', '蓝 → 方'] : ['圆 → 圆', '方 → 方'];
  return rect(-250, -185, 500, 370, { fill: color ? C.peach : C.mint }) +
    label(`${rule} · 看${color ? '颜色' : '轮廓'}`, -115) + label(words, -8, C.ink, 52) +
    (result ? label(`${result.correct}÷${result.total}＝${result.percent}%`, 125, C.tealInk, 52) : label(color ? '先看颜色' : '不管颜色', 128, C.muted, 44));
}
const score = (set, rule) => E.evaluate(E[set], rule);
const formula = (set, rule) => { const s = score(set, rule); return `${s.correct}÷${s.total}＝${s.percent}%`; };
const answer = (set, rule) => { const s = score(set, rule); return `${s.correct} / ${s.total} · ${s.percent}%`; };
function scorePair(set, step, out, show = true) {
  out.push(put(rulePanel('A', show ? score(set, 'A') : null), step, 'rule.A', [300, 350], [400, 260]));
  out.push(put(rulePanel('B', show ? score(set, 'B') : null), step, 'rule.B', [900, 350], [400, 760], { d: 160 }));
}
function chapter(out, step, art, note) {
  out.push(put(art, step, 'chapter.art', [600, 275], [400, 370]));
  out.push(put(label(note, 0, C.tealInk, 54), step, 'chapter.note', [600, 635], [400, 880], { d: 140 }));
}

function cover(ctx) {
  const sampleArt = g(block('red', 'circle', 125), { x: -160, y: -125 }) +
    g(block('blue', 'circle', 125), { x: 125, y: 155 }) +
    g(arrow([[0, 0], [100, 65]], { stroke: C.coral, sw: 9 }), { x: -80, y: -10 }) + g(qBadge(50), { x: 250, y: 20 });
  return { id: 'cover', cams: { all: { l: [0, 0, 1600, 900], p: [0, 0, 900, 1500] } }, svg: [
    el(`<ellipse cx="0" cy="0" rx="470" ry="520" fill="${C.mint}"/>`, { n: 'wash', kind: 'fade', bleed: true, l: [1300, 500], p: [700, 1180] }),
    el(pill(480, 66, ctx.unit.name, { size: 36, fill: C.tealInk }), { n: 'series', l: [350, 155], p: [310, 170] }),
    el(txt(0, 0, `第 ${ctx.local} 篇 / 共 ${ctx.count} 篇`, { size: 32, fill: C.muted, anchor: 'start' }), { n: 'nth', l: [110, 235], p: [70, 270] }),
    el(txt(0, 0, ctx.titleLines, { size: 76, anchor: 'start', lh: 1.35 }), { n: 'title', only: 'l', l: [110, 400] }),
    el(txt(0, 0, ctx.titleLines, { size: 66, anchor: 'start', lh: 1.4 }), { n: 'title', only: 'p', p: [70, 470] }),
    el(line(0, 0, 145, 0, { stroke: C.coral, sw: 10 }), { n: 'rule', l: [114, 555], p: [74, 625] }),
    el(sampleArt, { n: 'blocks', l: [1240, 445, .85], p: [425, 990] }),
    el(robot(0, 0, 240), { n: 'robot', l: [105, 625], p: [70, 1160] }),
    el(pill(440, 76, '换个颜色，还认得吗', { size: 40, fill: C.tealInk }), { n: 'question', l: [1230, 800], p: [620, 1350, .85] })
  ].join('') };
}
function opening() {
  const out = [];
  out.push(put(tray(E.training, '八个训练例子'), 0, 'eight', [600, 300], [400, 400]));
  out.push(put(pill(380, 86, '8 / 8 · 全对', { fill: C.tealInk, size: 52 }), 0, 'perfect', [600, 620], [400, 850], { d: 180 }));
  [1, 2].forEach(step => {
    out.push(put(block('blue', 'circle', 115) + label('蓝色 · 圆', 190), step, 'input', [280, 310], [400, 230]));
    out.push(put(arrow([[0, 0], [210, 0]]), step, 'flow', [490, 310], [400, 490, .5, 90]));
    out.push(put(tagCard(300, 200, '方形', { fill: C.peach, size: 76 }) + g(wrong(38), { x: 140, y: -96 }), step, 'answer', [920, 310], [400, 720], { d: 140 }));
    if (step === 2) out.push(put(label('只换颜色，为什么答错？', 0, C.tealInk), step, 'question', [600, 640], [400, 940]));
  });
  [3, 4].forEach(step => scorePair('training', step, out));
  return scene('open', out);
}
function rules() {
  const out = [];
  chapter(out, 0, g(block('red', 'circle', 105), { x: -165 }) + g(block('blue', 'square', 105), { x: 165 }), '同样满分 · 两种线索');
  out.push(put(outline('circle', 110) + label('圆', 190), 1, 'circle', [300, 310], [400, 230]));
  out.push(put(outline('square', 110) + label('方', 190), 1, 'square', [900, 310], [400, 730]));
  out.push(put(tray(E.training, '图片 + 人给的标签', { labels: true }), 2, 'labels', [600, 280], [400, 400]));
  out.push(put(label('训练集：用于学习'), 2, 'definition', [600, 635], [400, 870]));
  out.push(put(tray(E.training, '红圆 × 4 · 蓝方 × 4'), 3, 'training'));
  out.push(put(g(block('red', 'circle', 90), { x: -160 }) + g(block('blue', 'square', 90), { x: 160 }) + label('颜色与形状总是一起出现', 200), 4, 'coupled'));
  out.push(put(g(person(), { y: -50 }) + label('先手写两条规则', 220), 5, 'handwritten'));
  [6, 7, 8, 9, 10].forEach(step => scorePair('training', step, out, step >= 8));
  out.push(put(pill(340, 76, '聚焦：颜色规则', { size: 40, fill: C.coralInk }), 6, 'focus', [300, 70], [400, 38]));
  out.push(put(pill(340, 76, '聚焦：轮廓规则', { size: 40, fill: C.tealInk }), 7, 'focus', [900, 70], [400, 538]));
  out.push(put(label('手写规则算例', 0, C.tealInk), 11, 'scope', [600, 95], [400, 110]));
  out.push(put(tray(E.switched, '下一组：刻意换色'), 11, 'next', [600, 390], [400, 580]));
  return scene('rules', out);
}
function testing() {
  const out = [];
  chapter(out, 0, tray(E.switched, '事先留出的四个例子'), '换搭配 · 差别出现');
  [1, 2].forEach(step => {
    out.push(put(tray(E.switched, '蓝圆 × 2 · 红方 × 2'), step, 'test', [600, 300], [400, 430]));
    if (step === 2) out.push(put(pill(510, 80, '测试集：未参与选择或调整', { size: 40, fill: C.tealInk }), step, 'heldout', [600, 635], [400, 880]));
  });
  [3, 4].forEach(step => {
    out.push(put(tray(E.switched, 'A · 按颜色判断', { marks: item => E.rules.A(item) === item.shape }), step, 'mistakes', [350, 340], [400, 300]));
    out.push(put(label(formula('switched', 'A'), 0, C.coralInk, 76), step, 'score', [930, 340], [400, 850]));
  });
  out.push(put(tray(E.switched, 'B · 按轮廓判断', { marks: item => E.rules.B(item) === item.shape }), 5, 'correct', [350, 340], [400, 300]));
  out.push(put(label(formula('switched', 'B'), 0, C.tealInk, 70), 5, 'score', [930, 340], [400, 850]));
  out.push(put(label('手写规则算例', -150, C.tealInk, 60) + g(person()) + label('没有训练神经网络', 240), 6, 'scope'));
  out.push(put(qBadge(80) + label(['刻意换色找弱点', '四题成绩有边界'], 230), 7, 'limits'));
  scorePair('mixed', 10, out);
  out.push(put(tray(E.mixed, ['红圆 · 蓝圆', '红方 · 蓝方']), 11, 'coverage', [600, 300], [400, 400]));
  out.push(put(label('成绩还要带上：测了什么'), 11, 'report', [600, 635], [400, 870]));
  out.push(put(block('blue', 'circle', 100) + g(checkBadge(42), { x: 120, y: -95 }) + label(['没见过的新例子', '同一任务仍能做好'], 240), 12, 'generalization'));
  scorePair('switched', 13, out);
  return scene('test', out);
}
const QUIZ = [
  { id: 'switched', front: ['换色四题', 'A 答对几题？'], back: [answer('switched', 'A'), '颜色与形状不再对应'], detail: ['颜色与形状', '不再对应'] },
  { id: 'mixed', front: ['混合四题', 'A 答对几题？'], back: [answer('mixed', 'A'), '只答对红圆与蓝方'], detail: ['只答对', '红圆与蓝方'] },
  { id: 'outline', front: ['这两张考卷', 'B 各答对几题？'], back: [answer('switched', 'B'), '按轮廓，两卷都全对'], detail: ['按轮廓判断', '两卷都全对'] }
];
function quizCard(item, portrait) {
  const w = portrait ? 690 : 350, h = portrait ? 250 : 430;
  const frame = fill => rect(-w / 2, -h / 2, w, h, { fill });
  const front = frame(C.white) + g(qBadge(40), { x: portrait ? -245 : 0, y: portrait ? 0 : -100 }) +
    txt(portrait ? 65 : 0, portrait ? -22 : 25, item.front, { size: 42 }) + label('点击翻面', portrait ? 85 : 165, C.tealInk, 38);
  const back = frame(C.mint) + label(item.back[0], portrait ? -35 : -45, C.tealInk, portrait ? 58 : 50) +
    label(portrait ? item.back[1] : item.detail, portrait ? 55 : 65, C.ink, 40);
  return `<g class="flip hit" data-flip="${item.id}" role="button" tabindex="-1" aria-pressed="false" aria-label="${item.front.join('，')}，点击翻面" data-front-label="${item.front.join('，')}，点击翻面" data-back-label="${item.back.join('，')}，点击翻回"><g class="front" aria-hidden="true">${front}</g><g class="back" aria-hidden="true">${back}</g></g>`;
}
function exercise() {
  const out = [];
  out.push(put(label('点击卡片可翻回题目', 0, C.tealInk, 36), 1, 'answer-note', [600, 50], [400, 22]));
  QUIZ.forEach((q, i) => {
    out.push(el(quizCard(q, false), { at: 0, until: 2, n: `quiz.${q.id}`, only: 'l', l: [210 + i * 390, 350] }));
    out.push(el(quizCard(q, true), { at: 0, until: 2, n: `quiz.${q.id}`, only: 'p', p: [400, 170 + i * 325] }));
  });
  return scene('exercise', out);
}
function shortcut() {
  const out = [];
  chapter(out, 0, g(block('red', 'circle', 100), { x: -170 }) + g(arrow([[0, 0], [150, 0]]), { x: -65 }) + g(outline('circle', 100), { x: 210 }), ['有用的线索', '也可能是捷径']);
  out.push(put(outline('circle', 110) + g(magnifier(70), { x: 125, y: 65 }) + label('按形状分类：看轮廓', 250), 1, 'task'));
  out.push(put(tray(E.training, ['训练里', '红圆 · 蓝方']), 2, 'shortcut', [600, 310], [400, 400]));
  out.push(put(label('看颜色也能全对', 0, C.coralInk), 2, 'shortcut.note', [600, 645], [400, 870]));
  out.push(put(g(block('red', 'circle', 95), { x: -155 }) + g(block('blue', 'circle', 95), { x: 155 }) + label(['图和标签可以都是真的', '对应关系未必一直成立'], 245), 3, 'spurious'));
  out.push(put(g(modelMachine({ label: '许多参数', labelSize: 54 }), { x: -180, y: -150 }) + label('实际模型：数值计算', 250), 4, 'model'));
  out.push(put(g(knob(90), { x: -155 }) + g(knob(90), { x: 155, r: 40 }) + label(['训练调整参数', '好用的线索可能被利用'], 235), 5, 'parameters'));
  ['数据', '模型', '训练'].forEach((s, i) => out.push(put(g(knob(74), { y: -40 }) + label(s, 130), 6, `lever${i}`, [250 + i * 350, 300], [400, 170 + i * 320])));
  out.push(put(g(block('blue', 'circle', 105), { x: -180 }) + g(wrong(55), { x: 170 }) + label(['换环境就失灵', '捷径学习'], 235), 7, 'shortcut-learning'));
  [8, 9].forEach(step => {
    out.push(put(g(block('red', 'circle', 85), { x: -100 }) + g(block('red', 'square', 85), { x: 100 }) + label('红色', 165), step, 'red', [300, 330], [400, 230]));
    out.push(put(g(block('blue', 'circle', 85), { x: -100 }) + g(block('blue', 'square', 85), { x: 100 }) + label('蓝色', 165), step, 'blue', [900, 330], [400, 730]));
    if (step === 9) out.push(put(label('任务变了：这次就该看颜色', 0, C.tealInk, 44), step, 'task-note', [600, 650], [400, 970]));
  });
  out.push(put(tray(E.training, ['新拍一批', '仍是红圆、蓝方']), 10, 'same-mix', [600, 300], [400, 400]));
  out.push(put(label('A 仍能拿到 100%', 0, C.coralInk), 10, 'perfect-again', [600, 635], [400, 870]));
  out.push(put(tray(E.switched, ['分开数据', '也要检查覆盖']), 11, 'separate'));
  return scene('shortcut', out);
}
function repair() {
  const out = [];
  chapter(out, 0, g(block('blue', 'circle', 105), { x: -160 }) + g(block('red', 'square', 105), { x: 160 }), '补齐搭配 · 再检验');
  out.push(put(tray(E.supplemented, ['八个原例子', '+ 两种缺失搭配'], { columns: 5 }), 1, 'more'));
  [2, 3].forEach(step => scorePair('supplemented', step, out));
  out.push(put(tray(E.training, ['重复拍很多', '搭配没增加']), 4, 'quantity', [600, 300], [400, 400]));
  out.push(put(label('数量更多 ≠ 情形更全', 0, C.coralInk), 4, 'not-coverage', [600, 635], [400, 870]));
  out.push(put(tray(E.mixed, ['四种搭配', '检查有没有漏']), 5, 'coverage'));
  out.push(put(g(modelMachine({ label: '重新训练', labelSize: 52 }), { x: -180, y: -150 }) + g(qBadge(52), { x: 245, y: -145 }) + label('补样本后，仍需检验', 250), 6, 'retrain'));
  out.push(put(tray(E.switched, '看过答案、用来改方案'), 7, 'used', [600, 300], [400, 400]));
  out.push(put(label('这批例子已经参与开发', 0, C.coralInk), 7, 'development', [600, 635], [400, 870]));
  out.push(put(g(checkBadge(65), { x: -155 }) + g(qBadge(65), { x: 155 }) + label(['重做旧题：检查修正', '还需要：新的独立测试'], 235), 8, 'old-new'));
  [['训练集', '调整参数'], ['验证集', '比较方案'], ['测试集', '定案后检查']].forEach((s, i) => out.push(put(rect(-170, -145, 340, 290, { fill: [C.blue, C.cream, C.mint][i] }) + label(s[0], -65, C.tealInk, 56) + label(s[1], 55, C.ink, 44), 9, `split${i}`, [210 + i * 390, 350], [400, 170 + i * 325])));
  out.push(put(g(tray(E.switched, '用过的答案'), { s: .95 }) + label('不能重新变成「没见过」', 285, C.coralInk), 10, 'used-answers'));
  out.push(put(block('blue', 'circle', 120) + rect(-145, -35, 290, 80, { fill: C.cream, r: 4 }) + label('轮廓被遮住', 240), 11, 'occlusion'));
  out.push(put(`<ellipse cx="0" cy="0" rx="110" ry="64" fill="${C.blue}" stroke="${C.ink}" stroke-width="6" transform="rotate(-25)"/>` + g(qBadge(64), { x: 190, y: -80 }) + label(['换角度 · 换环境', '仍要针对性检查'], 235), 12, 'limits'));
  out.push(put(block('blue', 'circle', 110) + label('轮廓？颜色？两者混合？', 245, C.tealInk, 48), 13, 'learned'));
  out.push(put(g(block('red', 'circle', 95), { x: -165 }) + g(block('blue', 'circle', 95), { x: 165 }) + label(['训练成绩 100%', '换种合理搭配，还能答对吗？'], 240, C.ink, 48), 14, 'closing'));
  return scene('repair', out);
}
function references(ctx) {
  const titles = ['〔1〕数据划分 · Stanford CS231n', '〔2〕泛化 · Google 机器学习课程', '〔3〕捷径学习 · Geirhos 等论文'];
  if (ctx.references.length !== titles.length) throw new Error('第 02 篇来源数量已变，请核对');
  const out = [put(label('资料来源', 0, C.ink, 62), 0, 'title', [600, 90], [400, 150]),
    put(label('手写规则算例，并非实际模型测评', 0, C.ink, 38), 0, 'scope', [600, 175], [400, 270])];
  ctx.references.forEach((href, i) => {
    const source = w => `<a class="hit" href="${esc(href)}" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-label="${esc(titles[i])}，打开原始资料">${rect(-w / 2, -45, w, 90, { fill: C.white, r: 14 })}${label(titles[i], 0, C.ink, 38)}</a>`;
    out.push(put(source(950), 0, `source${i}`, [600, 285 + i * 115], [400, 420 + i * 145], { only: 'l' }));
    out.push(put(source(750), 0, `source${i}`, [600, 285 + i * 115], [400, 420 + i * 145], { only: 'p' }));
  });
  const read = `<a class="hit" href="?read" data-action="read" tabindex="-1" aria-label="阅读全文与完整资料说明">${pill(620, 80, '阅读全文与完整资料说明', { size: 42, fill: C.tealInk })}</a>`;
  out.push(put(read, 0, 'read', [600, 655], [400, 900]));
  return scene('refs', out);
}
module.exports = ctx => [cover(ctx), opening(), rules(), testing(), exercise(), shortcut(), repair(), references(ctx)];
module.exports.thumbnail = section => {
  const icons = [g(block('blue', 'circle', 110)) + g(qBadge(45), { x: 130, y: -85 }),
    g(block('red', 'circle', 78), { x: -105 }) + g(block('blue', 'square', 78), { x: 105 }),
    g(block('blue', 'circle', 78), { x: -105 }) + g(block('red', 'square', 78), { x: 105 }),
    g(magnifier(105)) + g(block('red', 'circle', 60), { x: -70, y: -55 }),
    g(block('red', 'circle', 65), { x: -100, y: -60 }) + g(block('blue', 'square', 65), { x: 100, y: -60 }) +
      g(block('blue', 'circle', 65), { x: -100, y: 105 }) + g(block('red', 'square', 65), { x: 100, y: 105 })];
  return `<svg class="toc-thumb" viewBox="-230 -190 460 380" aria-hidden="true" focusable="false">${section.mark === '源' ? magnifier(105) : icons[section.num]}</svg>`;
};
