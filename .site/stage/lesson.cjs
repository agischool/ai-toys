'use strict';
/* 第 03—06 篇共用纸面框架；各篇的机制图由自己的场景模块绘制。 */
const { C, esc, el, g, rect, line, txt, pill, robot } = require('./art.cjs');
const DESK = { l: [0, 0, 1200, 720], p: [0, 0, 800, 1000] };
const label = (text, y = 0, fill = C.ink, size = 48) => txt(0, y, text, { size, fill });
const put = (art, step, n, l = [600, 350], p = [400, 480], opts = {}) => el(art, { at: step, until: step + 1, kind: 'pop', n, l, p, ...opts });
const scene = (id, svg) => ({ id, cams: { desk: DESK }, svg: svg.join('') });
function chapter(out, step, art, note) {
  out.push(put(art, step, 'chapter.art', [600, 275], [400, 370]));
  out.push(put(label(note, 0, C.tealInk, 54), step, 'chapter.note', [600, 635], [400, 880], { d: 140 }));
}
function cover(ctx, art, question) {
  return { id: 'cover', cams: { all: { l: [0, 0, 1600, 900], p: [0, 0, 900, 1500] } }, svg: [
    el('<ellipse cx="0" cy="0" rx="470" ry="520" fill="' + C.mint + '"/>', { n: 'wash', kind: 'fade', bleed: true, l: [1300, 500], p: [700, 1180] }),
    el(pill(480, 66, ctx.unit.name, { size: 36, fill: C.tealInk }), { n: 'series', l: [350, 155], p: [310, 170] }),
    el(txt(0, 0, '第 ' + ctx.local + ' 篇 / 共 ' + ctx.count + ' 篇', { size: 32, fill: C.muted, anchor: 'start' }), { n: 'nth', l: [110, 235], p: [70, 270] }),
    el(txt(0, 0, ctx.titleLines, { size: 76, anchor: 'start', lh: 1.35 }), { n: 'title', only: 'l', l: [110, 400] }),
    el(txt(0, 0, ctx.titleLines, { size: 66, anchor: 'start', lh: 1.4 }), { n: 'title', only: 'p', p: [70, 470] }),
    el(line(0, 0, 145, 0, { stroke: C.coral, sw: 10 }), { n: 'rule', l: [114, 555], p: [74, 625] }),
    el(art, { n: 'mechanism', l: [1240, 445, .85], p: [450, 990] }),
    el(robot(0, 0, 240), { n: 'robot', l: [105, 625], p: [70, 1160] }),
    el(pill(440, 76, question, { size: 40, fill: C.tealInk }), { n: 'question', l: [1230, 800], p: [620, 1350, .85] })
  ].join('') };
}
function references(ctx, titles, note) {
  if (ctx.references.length !== titles.length) throw new Error('资料链接数量已变，请核对短标签');
  const out = [put(label('资料来源', 0, C.ink, 62), 0, 'title', [600, 75], [400, 100]),
    put(label(note, 0, C.ink, 38), 0, 'scope', [600, 155], [400, 220])];
  ctx.references.forEach((href, i) => {
    const source = w => '<a class="hit" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-label="' + esc(titles[i]) + '，打开原始资料">' +
      rect(-w / 2, -42, w, 84, { fill: C.white, r: 14 }) + label(titles[i], 0, C.ink, 38) + '</a>';
    out.push(put(source(950), 0, 'source' + i, [600, 255 + i * 100], [400, 360 + i * 130], { only: 'l' }));
    out.push(put(source(750), 0, 'source' + i, [600, 255 + i * 100], [400, 360 + i * 130], { only: 'p' }));
  });
  const read = '<a class="hit" href="?read" data-action="read" tabindex="-1" aria-label="阅读全文与完整资料说明">' + pill(620, 80, '阅读全文与完整资料说明', { size: 42, fill: C.tealInk }) + '</a>';
  out.push(put(read, 0, 'read', [600, 665], [400, 950]));
  return scene('refs', out);
}
/* front/back 绘制分别传入横竖屏版本，内容由各篇定义。 */
function flipCard(item, portrait) {
  const w = portrait ? 690 : 350, h = portrait ? 250 : 430;
  const face = (fill, art) => rect(-w / 2, -h / 2, w, h, { fill }) + art(portrait);
  return '<g class="flip hit" data-flip="' + esc(item.id) + '" role="button" tabindex="-1" aria-pressed="false" aria-label="' + esc(item.question) + '，点击翻面" data-front-label="' + esc(item.question) + '，点击翻面" data-back-label="' + esc(item.answer) + '，点击翻回">' +
    '<g class="front" aria-hidden="true">' + face(C.white, item.front) + '</g>' +
    '<g class="back" aria-hidden="true">' + face(C.mint, item.back) + '</g></g>';
}
function exercise(items) {
  const out = [put(label('点击卡片可翻回题目', 0, C.tealInk, 36), 1, 'answer-note', [600, 50], [400, 22])];
  items.forEach((item, i) => {
    out.push(el(flipCard(item, false), { at: 0, until: 2, n: 'quiz.' + item.id, only: 'l', l: [210 + i * 390, 350] }));
    out.push(el(flipCard(item, true), { at: 0, until: 2, n: 'quiz.' + item.id, only: 'p', p: [400, 185 + i * 325] }));
  });
  return scene('exercise', out);
}
module.exports = { label, put, scene, chapter, cover, references, exercise };
