'use strict';
/* 第 01 篇《AI 到底在做什么？从认猫开始》的场景。
 * 每个场景返回 { id, cams, svg }：
 *   cams：镜头名 → { l: 横屏矩形, p: 竖屏矩形 }，矩形是 [x, y, 宽, 高]（世界坐标）；
 *   svg：场景内容，元素用 el() 声明出现的步号、名字与横竖屏摆位。
 * 步号是场景自己的，分镜.json 里每一拍写明自己对应哪一步、用哪个镜头、聚焦哪些名字。
 * 文字只做短标签；正文句子由字幕卡显示，不在画面里重复。 */

const A = require('../art.cjs');
const {
  C, esc, el, rect, circle, path, line, txt, arrow, g, pill, bracket, catHead, dogHead, toyCat, cartoonCat,
  photoFrame, monitor, eye, qBadge, checkBadge, tagCard, numberGrid, modelMachine, scoreCompact, sofa,
  person, magnifier, robot, scoreCard, knob
} = A;

/* ---- 小工具 ---- */

/* n×n 的“猫脸亮度表”：按轮廓算出 0–9 的亮度，构建时固定。 */
function catGrid(n) {
  const rows = [];
  for (let r = 0; r < n; r++) {
    const row = [];
    for (let c = 0; c < n; c++) {
      const u = ((c + 0.5) / n) * 2 - 1, v = ((r + 0.5) / n) * 2 - 1;
      const head = (u / 0.9) ** 2 + ((v - 0.2) / 0.72) ** 2 <= 1;
      const ear = v < -0.22 && v > -0.95 && Math.abs(Math.abs(u) - 0.56) < (v + 0.95) * 0.46;
      const eyes = (Math.abs(u) - 0.4) ** 2 + (v - 0.06) ** 2 < 0.045;
      const nose = u * u + (v - 0.38) ** 2 < 0.03;
      let val = 9;
      if (head || ear) val = 3 + ((c * 3 + r * 5) % 2);
      if (eyes) val = 8;
      if (nose) val = 6;
      row.push(val);
    }
    rows.push(row);
  }
  return rows;
}

/* 相框里放一幅画：art 的原点放在内框中心。 */
function photo(w, h, art, { fill = C.blue, s = 1, dy = 0, bottom = 0 } = {}) {
  const iw = w - 32, ih = h - 32 - bottom;
  return photoFrame(w, h, g(art, { x: iw / 2, y: ih / 2 + dy, s }), { fill, bottom });
}

/* =========================================================
 * 封面（静默拍：不显示字幕卡）
 * ========================================================= */

function cover(ctx) {
  const unit = ctx.unit.name;
  const nth = `第 ${ctx.local} 篇 / 共 ${ctx.count} 篇`;
  const pw = unit.length * 34 + 72;
  const series = `<g transform="translate(${pw / 2} 31)">${pill(pw, 62, unit, { fill: C.tealInk, size: 32 })}</g>`;
  const nthTxt = txt(0, 0, nth, { size: 30, fill: C.muted, anchor: 'start', weight: 600 });
  const title = txt(0, 0, ctx.titleLines.filter(Boolean), { size: 100, anchor: 'start', lh: 1.26, weight: 800 });
  const rule = line(0, 0, 150, 0, { stroke: C.coral, sw: 10 });
  const polaroid = photo(400, 470, catHead(), { fill: C.blue, s: 1.35, dy: -8, bottom: 70 });
  return {
    id: 'cover',
    cams: { all: { l: [0, 0, 1600, 900], p: [0, 0, 900, 1500] } },
    svg: [
      el(`<ellipse cx="0" cy="0" rx="480" ry="520" fill="${C.mint}"/>`, { at: 0, kind: 'fade', bleed: true, l: [1240, 450], p: [700, 1220, 1.05] }),
      el(`<ellipse cx="0" cy="0" rx="320" ry="240" fill="${C.peach}"/>`, { at: 0, kind: 'fade', bleed: true, l: [160, 880], p: [60, 90] }),
      el(series, { at: 0, n: 'series', l: [110, 150], p: [70, 150] }),
      el(nthTxt, { at: 0, d: 80, n: 'nth', l: [110 + pw + 28, 181], p: [70, 262] }),
      el(title, { at: 0, d: 160, n: 'title', l: [110, 400], p: [70, 480, 0.78] }),
      el(rule, { at: 0, d: 260, kind: 'fade', n: 'rule', l: [114, 575], p: [74, 640] }),
      el(g(polaroid, { x: -200, y: -235 }), { at: 0, d: 220, kind: 'pop', n: 'polaroid', l: [1240, 400, 1, 4], p: [450, 1000, 0.95, -4] }),
      el(tagCard(190, 120, '猫'), { at: 0, d: 520, kind: 'pop', n: 'tag', l: [1130, 770, 1, -7], p: [640, 1330, 0.9, -7] }),
      el(robot(0, 0, 260), { at: 0, d: 380, kind: 'pop', n: 'robot', only: 'l', l: [110, 640] }),
      el(robot(0, 0, 300), { at: 0, d: 380, kind: 'pop', n: 'robot', only: 'p', p: [70, 1150] })
    ].join('')
  };
}

/* =========================================================
 * 开场：照片进、一个字出，中间是个问号
 * ========================================================= */

function open() {
  const pic = photo(400, 470, catHead(), { fill: C.blue, s: 1.35, dy: -4 });
  const mon = monitor(560, 420, txt(254, 168, '猫', { size: 230, weight: 800 }), { screen: C.white });
  /* 一条照片到屏幕的箭头始终在；第三拍在箭头上串起三个问号。 */
  return {
    id: 'open',
    cams: { all: { l: [60, 10, 1480, 760], p: [0, 0, 900, 1500] } },
    svg: [
      el(pic, { at: 0, kind: 'pop', n: 'photo', l: [120, 250, 1, -3], p: [250, 230, 1, -3] }),
      el(arrow([[0, 0], [340, 0]], { sw: 10, head: 32 }), { at: 0, d: 300, kind: 'fade', n: 'arrow', only: 'l', l: [552, 485] }),
      el(arrow([[0, 0], [0, 268]], { sw: 10, head: 32 }), { at: 0, d: 300, kind: 'fade', n: 'arrow', only: 'p', p: [450, 716] }),
      el(mon, { at: 0, d: 560, kind: 'pop', n: 'mon', l: [940, 260], p: [170, 1000] }),
      el(g(eye(), { s: 0.9 }), { at: 1, until: 2, kind: 'pop', n: 'eye', l: [320, 140], p: [450, 110] }),
      el(checkBadge(38), { at: 1, until: 2, d: 300, kind: 'pop', n: 'check', l: [500, 180], p: [620, 150] }),
      /* 箭头横跨 552–892，箭头尖在 860–892：三个问号全部放在 860 以内，不压尖。 */
      el(qBadge(34), { at: 2, kind: 'pop', n: 'q1', l: [630, 485], p: [450, 770, 0.9] }),
      el(qBadge(34), { at: 2, d: 140, kind: 'pop', n: 'q2', l: [712, 485], p: [450, 850, 0.9] }),
      el(qBadge(34), { at: 2, d: 280, kind: 'pop', n: 'q3', l: [794, 485], p: [450, 930, 0.9] })
    ].join('')
  };
}

/* =========================================================
 * 计算路线：整篇的枢纽。每节开头镜头回到这里。
 * 横屏：五站一行。竖屏：蛇形两列（左→右、下、右→左、下、左→右），逐站放大时每次只看一两站。
 * ========================================================= */

const PW = 320, PH = 420;
const LX = i => 140 + i * 430, LY = 280;
const PCOL = i => (Math.floor(i / 2) % 2 === 0 ? i % 2 : 1 - (i % 2));
const PXX = i => (PCOL(i) ? 440 : 40);
const PYY = i => 160 + Math.floor(i / 2) * 480;
const posL = i => [LX(i), LY];
const posP = i => [PXX(i), PYY(i)];

const STATIONS = [
  { name: '照片', art: () => photo(230, 210, catHead(), { s: 0.72 }), at: [45, 70] },
  { name: '数字', art: o => numberGrid(catGrid(5), 44, { digits: o.digits !== false, digitSize: 26 }), at: [50, 70] },
  { name: '模型', art: () => g(modelMachine({ label: '计算', labelSize: 72 }), { s: 0.64 }), at: [40, 84] },
  { name: '分数', art: () => scoreCompact().replaceAll('font-size="34"', 'font-size="46"'), at: [30, 112] },
  { name: '类别', art: () => tagCard(210, 128, '猫'), at: [160, 190] },
  { name: '核查', art: () => g(person(), { x: -14, y: -26, s: 0.9 }) + g(magnifier(54), { x: 66, y: 8 }), at: [160, 190] }
];

function plate(i, o = {}) {
  const st = STATIONS[i];
  return rect(0, 0, PW, PH, { fill: C.white, r: 38, sw: 6 }) +
    g(st.art(o), { x: st.at[0], y: st.at[1] }) +
    `<g transform="translate(160 ${PH - 56})">${pill(170, 64, st.name, { fill: C.tealInk, size: 48 })}</g>` +
    `<g transform="translate(40 40)">${circle(0, 0, 28, { fill: C.yellow, sw: 5 })}${txt(0, 2, String(i + 1), { size: 46, weight: 800 })}</g>`;
}

/* 还没出现的站：虚线空位。 */
const hole = () =>
  rect(0, 0, PW, PH, { fill: 'none', r: 38, stroke: C.muted, sw: 5, extra: 'stroke-dasharray="16 14"' }) +
  txt(PW / 2, PH / 2, '…', { size: 96, fill: C.muted });

const ring = () => rect(-10, -10, PW + 20, PH + 20, { fill: 'none', r: 46, stroke: C.coral, sw: 10 });

/* 站与站之间的箭头：返回两种摆位的元素（横屏一条，竖屏按蛇形转弯）。 */
function link(i, opts) {
  const out = [];
  out.push(el(arrow([[0, 0], [86, 0]], { sw: 9 }), { ...opts, only: 'l', n: `a${i}`, l: [LX(i) + PW + 12, LY + PH / 2] }));
  if (i % 2 === 0) {
    const dir = PCOL(i + 1) > PCOL(i) ? 1 : -1;
    const sx = dir > 0 ? PXX(i) + PW + 10 : PXX(i) - 10;
    out.push(el(arrow([[0, 0], [dir * 60, 0]], { sw: 8, head: 22 }), { ...opts, only: 'p', n: `a${i}`, p: [sx, PYY(i) + PH / 2] }));
  } else {
    out.push(el(arrow([[0, 0], [0, 40]], { sw: 8, head: 22 }), { ...opts, only: 'p', n: `a${i}`, p: [PXX(i) + PW / 2, PYY(i) + PH + 8] }));
  }
  return out.join('');
}

function hub() {
  const L = [];
  /* step 0：任务——只区分猫和狗 */
  L.push(el(g(catHead(), { s: 1.7 }), { at: 0, until: 1, kind: 'pop', n: 'cat', only: 'l', l: [1080, 540] }));
  L.push(el(g(dogHead(), { s: 1.7 }), { at: 0, until: 1, d: 160, kind: 'pop', n: 'dog', only: 'l', l: [1620, 540] }));
  L.push(el(g(catHead(), { s: 1.4 }), { at: 0, until: 1, kind: 'pop', n: 'cat', only: 'p', p: [235, 660] }));
  L.push(el(g(dogHead(), { s: 1.4 }), { at: 0, until: 1, d: 160, kind: 'pop', n: 'dog', only: 'p', p: [665, 660] }));
  L.push(el(circle(0, 0, 54, { fill: C.coralInk, sw: 6 }) + txt(0, 2, '或', { size: 54, fill: C.white, weight: 800 }),
    { at: 0, until: 1, d: 280, kind: 'pop', n: 'or', l: [1350, 540], p: [450, 660] }));
  L.push(el(pill(380, 74, '只分两类', { fill: C.tealInk, size: 42 }), { at: 0, until: 1, d: 60, n: 'two', l: [1350, 200], p: [450, 330] }));
  L.push(el(tagCard(170, 106, '猫'), { at: 0, until: 1, d: 200, kind: 'pop', n: 'tag.cat', l: [1080, 790], p: [235, 940] }));
  L.push(el(tagCard(170, 106, '狗', { fill: C.coralInk, color: C.white }), { at: 0, until: 1, d: 320, kind: 'pop', n: 'tag.dog', l: [1620, 790], p: [665, 940] }));

  /* step 1：输入 → 计算 → 输出 = 图像分类器。2、4 站先是虚线空位，箭头从头连到尾。 */
  [0, 2, 4].forEach((i, k) => L.push(el(plate(i), { at: 1, d: k * 140, kind: 'pop', n: `p${i}`, l: posL(i), p: posP(i) })));
  [1, 3].forEach((i, k) => L.push(el(hole(), { at: 1, until: 2, d: 100 + k * 140, kind: 'fade', n: `h${i}`, l: posL(i), p: posP(i) })));
  for (let i = 0; i < 4; i++) L.push(link(i, { at: 1, d: 300 + i * 90, kind: 'fade' }));
  const bx1 = LX(0), bx2 = LX(4) + PW, by = LY - 60;
  L.push(el(bracket(bx1, bx2, by, { drop: 30 }) + `<g transform="translate(${(bx1 + bx2) / 2} ${by})">${pill(330, 66, '图像分类器', { fill: C.coralInk, size: 40 })}</g>`,
    { at: 1, d: 520, kind: 'fade', n: 'bracket', only: 'l' }));
  L.push(el(`<g transform="translate(400 ${PYY(0) - 62})">${pill(330, 66, '图像分类器', { fill: C.coralInk, size: 48 })}</g>`,
    { at: 1, d: 520, kind: 'fade', n: 'bracket', only: 'p' }));

  /* step 2：补上“数字”和“分数”，五站连成路线；机器人站在第 6 站的空位上 */
  [1, 3].forEach((i, k) => {
    const o = { at: 2, d: k * 160, kind: 'pop', n: `p${i}` };
    /* 「数字」站的方格里写着 0–9：横屏看得清；竖屏整条路线缩到 0.38 倍，数字只剩 7.7px，
     * 所以竖屏只画灰阶方块，数字留给第 2 节的特写。 */
    if (i === 1) {
      L.push(el(plate(i), { ...o, only: 'l', l: posL(i) }));
      L.push(el(plate(i, { digits: false }), { ...o, only: 'p', p: posP(i) }));
    } else L.push(el(plate(i), { ...o, l: posL(i), p: posP(i) }));
  });
  L.push(el(robot(0, 0, 190), { at: 2, until: 5, d: 500, kind: 'pop', n: 'robot', only: 'l', l: [LX(4) + PW - 190, LY + PH + 24] }));
  L.push(el(robot(0, 0, 250), { at: 2, until: 5, d: 500, kind: 'pop', n: 'robot', only: 'p', p: [PXX(5) + 36, PYY(5) + 120] }));

  /* step 3：图 1 的说明——旋钮就是“参数”。圈住三个旋钮；坐标是盘子内的局部坐标。 */
  L.push(el(rect(62, 186, 186, 68, { fill: 'none', r: 34, stroke: C.coral, sw: 8 }), { at: 3, until: 4, kind: 'fade', n: 'ring.knobs', l: posL(2), p: posP(2) }));
  /* 标签贴在机器右下角外侧：不盖住圆圈（盘内坐标：圆圈底 254），也不碰下面的站名（顶 332）。 */
  L.push(el(`<g transform="translate(240 294)">${pill(118, 46, '参数', { fill: C.coralInk, size: 36 })}</g>`,
    { at: 3, until: 4, d: 200, kind: 'pop', n: 'ring.knobs.tag', l: posL(2), p: posP(2) }));

  /* step 4：第 1 节标题——输入和输出由人先约定 */
  L.push(el(ring(), { at: 4, until: 5, kind: 'fade', n: 'ring.in', l: posL(0), p: posP(0) }));
  L.push(el(ring(), { at: 4, until: 5, d: 120, kind: 'fade', n: 'ring.out', l: posL(4), p: posP(4) }));
  L.push(el(pill(150, 60, '输入', { fill: C.coralInk, size: 36 }), { at: 4, until: 5, d: 200, kind: 'pop', n: 'tag.in', l: [LX(0) + PW - 20, LY - 10], p: [PXX(0) + PW - 20, PYY(0) - 6] }));
  L.push(el(pill(150, 60, '输出', { fill: C.coralInk, size: 36 }), { at: 4, until: 5, d: 320, kind: 'pop', n: 'tag.out', l: [LX(4) + PW - 20, LY - 10], p: [PXX(4) + PW - 20, PYY(4) - 6] }));
  L.push(el(plate(5), { at: 5, n: 'p5', kind: 'pop', l: posL(5), p: posP(5) }));
  L.push(link(4, { at: 5, kind: 'fade', d: 180 }));

  const row = [60, 130, 2220, 770];
  const stack = [0, 60, 800, 1500];
  return {
    id: 'hub',
    cams: {
      task: { l: [620, 90, 1460, 860], p: [0, 280, 900, 780] },
      route: { l: row, p: stack },
      full: { l: [60, 130, 2650, 770], p: stack },
      model: { l: [LX(2) - 150, 250, PW + 300, 470], p: [PXX(2) - 40, PYY(2) - 30, PW + 80, PH + 80] }
    },
    svg: L.join('')
  };
}

/* =========================================================
 * 第 1 节：先说清楚要它做什么——四张“算不算猫”的照片
 * 横屏四张一行，静止的镜头，逐张出现；竖屏四张竖排，镜头逐张下移。
 * ========================================================= */

/* 竖屏的摆法：c0 独占一屏，c1、c2 紧挨着同屏，c3 再独占一屏；屏与屏之间留足间隔，
 * 这样镜头移走之后，上一张卡不会在屏幕边缘露出一条边。 */
const CW = 360, CH = 460;
const cardL = i => [100 + i * 470, 230];
const CARD_PY = [150, 900, 1420, 2200];
const cardP = i => [270, CARD_PY[i]];

function card(art, text, o = {}) {
  const frame = photo(CW, CH, art, { fill: o.fill || C.blue, s: o.s || 1, dy: o.dy || 0, bottom: 64 });
  return frame + txt(CW / 2, CH - 46, text, { size: 36, weight: 700 });
}

function task() {
  const twoCats = g(catHead(), { x: -34, y: 4, s: 0.95 }) + g(catHead({ fill: C.cream }), { x: 76, y: 70, s: 0.5 });
  const ear = path('M-44 0 L0 -100 L44 0 Z', { fill: C.yellow, sw: 6 });
  const peek = g(g(ear, { x: -30, y: -2 }) + g(sofa({ fill: C.teal }), { x: -180, y: -34 }), { s: 0.8, y: 28 });
  const items = [
    { art: twoCats, text: '一只还是几只', fill: C.blue, s: 1, dy: -8, at: 0 },
    { art: toyCat(), text: '玩具猫', fill: C.mint, s: 1.15, dy: -8, at: 1 },
    { art: cartoonCat(), text: '卡通猫', fill: C.cream, s: 1.15, dy: -8, at: 1 },
    { art: peek, text: '只露一只耳朵', fill: C.peach, s: 1.05, dy: 6, at: 2 }
  ];
  const tilt = [-3, 2, -2, 3];
  const L = [];
  items.forEach((it, i) => {
    const d = i === 2 ? 160 : 0;
    L.push(el(card(it.art, it.text, it), { at: it.at, until: 3, d, kind: 'pop', n: `c${i}`, l: [...cardL(i), 1, tilt[i]], p: [...cardP(i), 1, tilt[i]] }));
    L.push(el(qBadge(40), { at: it.at, until: 3, d: 420 + d, kind: 'pop', n: `c${i}.q`, l: [cardL(i)[0] + CW - 6, cardL(i)[1] - 12], p: [cardP(i)[0] + CW - 6, cardP(i)[1] - 12] }));
  });
  /* 横屏：镜头跟着当前出现的卡走（卡宽 360，间隔 470），以卡中心为镜头中心。 */
  const dcam = cx => [cx - 500, 140, 1000, 700];
  const mid = (a, b) => (cardL(a)[0] + cardL(b)[0] + CW) / 2;
  return {
    id: 'task',
    cams: {
      c1: { l: dcam(cardL(0)[0] + CW / 2), p: [180, 100, 540, 620] },
      c23: { l: dcam(mid(1, 2)), p: [180, 840, 540, 1040] },
      c4: { l: dcam(cardL(3)[0] + CW / 2), p: [180, 2180, 540, 560] },
      desk: DESK
    },
    svg: L.join('') + taskTail()
  };
}

/* 新章节共用的工作台；横屏并置、竖屏上下排。镜头只适配画面区，字幕另留位置。 */
const DESK = { l: [0, 0, 1200, 720], p: [0, 0, 800, 1000] };
const label = (s, y = 0, fill = C.ink) => txt(0, y, s, { size: 52, fill });
const placed = (art, step, name, l, p, more = {}) => el(art, { at: step, until: step + 1, n: name, kind: 'pop', l, p, ...more });
const centeredPhoto = (art, fill = C.blue) => g(photo(320, 300, art, { s: .88, fill }), { x: -160, y: -150 });
const machine = (label = '计算') => g(modelMachine({ label, labelSize: Math.min(52, Math.floor(260 / [...label].length)) }), { x: -180, y: -150 });
const clock = () => circle(0, 0, 108, { fill: C.cream }) + line(0, 0, 0, -72) + line(0, 0, 52, 25) +
  line(-70, -116, -112, -78, { sw: 16 }) + line(70, -116, 112, -78, { sw: 16 });

function taskTail() {
  const L = [];
  const contract = rect(-300, -200, 600, 400, { fill: C.white }) +
    label('任务约定', -120) + g(catHead(), { x: -130, y: 25, s: .65 }) +
    g(dogHead(), { x: 130, y: 25, s: .65 }) + label('主体：猫 或 狗', 142);
  L.push(placed(contract, 3, 'contract', [600, 350], [400, 480]));
  L.push(placed(g(checkBadge(55), { x: 270, y: -185 }), 3, 'stamp', [600, 350], [400, 480], { d: 300 }));
  L.push(placed(contract, 4, 'contract', [600, 350], [400, 480]));
  L.push(placed(catHead() + rect(-160, -140, 320, 260, { fill: 'none', stroke: C.coral, r: 8 }) + label(['位置？', '品种？', '饿了吗？'], 280), 5, 'other', [600, 235], [400, 330]));
  [6, 7].forEach(step => {
    L.push(placed(clock() + label('按预设响铃', 210), step, 'clock', [300, 300], [400, 220]));
    L.push(placed(machine('从样本学习') + label('图片分类器', 210), step, 'learner', [900, 300], [400, 650], { d: 160 }));
    L.push(placed(label('自动 ≠ 同一种做法'), step, 'distinction', [600, 640], [400, 950], { d: 300 }));
  });
  L.push(placed(machine('机器学习') + label('AI 的一种实现路线', 245), 8, 'route', [600, 300], [400, 430]));
  return L.join('');
}

function pixels() {
  const L = [];
  L.push(placed(centeredPhoto(catHead()) + label('照片', 210), 0, 'photo', [300, 310], [400, 240]));
  L.push(placed(g(numberGrid(catGrid(8), 48, { digits: false }), { x: -192, y: -192 }) + label('数字表示', 245), 0, 'grid', [900, 310], [400, 720], { d: 180 }));
  L.push(placed(numberGrid(catGrid(8), 64), 1, 'digits', [344, 74], [144, 180]));
  L.push(placed(label('亮暗 → 数字（0—9 示意）'), 1, 'encoding', [600, 650], [400, 815]));
  L.push(placed(g(numberGrid(catGrid(3), 88), { x: -132, y: -132 }) + label('数字', 215), 2, 'input', [280, 320], [400, 235]));
  L.push(placed(machine() + label('进入模型', 215), 2, 'model', [900, 320], [400, 740], { d: 180 }));
  L.push(placed(arrow([[0, 0], [190, 0]]), 2, 'flow', [500, 320], [400, 490, .4, 90]));
  L.push(placed(machine('参数') + label('可调数值', 245), 3, 'parameters', [600, 280, 1.3], [400, 400, 1.25]));
  L.push(placed(g(catHead(), { s: 1.5 }) + g(magnifier(72), { x: 130, y: 30 }) + label('轮廓 · 纹理', 245), 4, 'features', [600, 330], [400, 420]));
  const features = [-180, -60, 60, 180].map((x, i) => g(path(i % 2 ? 'M-30 -40 L30 0 L-30 40' : 'M-35 25 Q0 -55 35 25', { sw: 12, stroke: i % 2 ? C.coral : C.teal }), { x })).join('');
  L.push(placed(features + label('未必能逐项命名', 185), 5, 'unnamed', [600, 330], [400, 430]));
  L.push(placed(g(scoreCard(), { x: -280, y: -115 }) + label('各类别的分数', 225), 6, 'scores', [600, 310], [400, 420]));
  L.push(placed(g(scoreCard(), { x: -280, y: -115 }), 7, 'scores', [380, 330], [400, 300]));
  L.push(placed(tagCard(260, 170, '猫') + label('选择最高分', 160), 7, 'choice', [990, 330], [400, 740], { d: 280 }));
  L.push(placed(arrow([[0, 0], [140, 0]]), 7, 'flow', [710, 330], [400, 485, 1, 90]));
  return { id: 'pixels', cams: { desk: DESK }, svg: L.join('') };
}

const samplePair = () => centeredPhoto(catHead()) + g(tagCard(150, 82, '猫'), { y: 195 });
function training() {
  const L = [];
  L.push(placed(machine('参数从哪来') + g(qBadge(58), { x: 220, y: -140 }), 0, 'question', [600, 340], [400, 430]));
  [1, 2].forEach(step => {
    L.push(placed(samplePair(), step, 'cat', [300, 310], [400, 230]));
    L.push(placed(centeredPhoto(dogHead(), C.mint) + g(tagCard(150, 82, '狗', { fill: C.coralInk, color: C.white }), { y: 195 }), step, 'dog', [900, 310], [400, 730], { d: 160 }));
  });
  [3, 4].forEach(step => {
    const guess = g(catHead(), { s: .85 }) + label('预测：狗', 155);
    const compare = tagCard(210, 130, '猫') + label('对照标签', 155);
    const tune = g(knob(90), { r: step === 3 ? -35 : 35 }) + label('调整参数', 155);
    [guess, compare, tune].forEach((art, i) => L.push(placed(art, step, ['guess', 'compare', 'tune'][i], [220 + 380 * i, 300], [400, 155 + 315 * i], { d: i * 160 })));
    L.push(placed(arrow([[0, 0], [80, 0]]), step, 'forward', [390, 270], [400, 355, .5, 90]));
    L.push(placed(arrow([[0, 0], [80, 0]]), step, 'forward2', [770, 270], [400, 665, .3, 90]));
    L.push(placed(arrow([[960, 0], [960, 90], [200, 90], [200, 0]], { stroke: C.coral }), step, 'loop', [0, 560], [0, 0], { only: 'l' }));
    L.push(placed(arrow([[250, 800], [120, 800], [120, 150], [250, 150]], { stroke: C.coral }), step, 'loop', [0, 0], [0, 0], { only: 'p' }));
  });
  L.push(placed(person() + label('方法 · 数据 · 目标', 245), 5, 'design', [300, 280], [400, 195]));
  L.push(placed(machine('训练调参数') + label('具体参数', 245), 5, 'process', [900, 280], [400, 700], { d: 180 }));
  [6, 7].forEach(step => {
    L.push(placed(g(knob(100), { r: -35 }) + label('训练：改变参数', 230), step, 'train', [300, 290], [400, 200]));
    L.push(placed(machine('推断') + label('使用：利用已有参数', 230), step, 'use', [900, 290], [400, 700], { d: 180 }));
  });
  L.push(placed(centeredPhoto(catHead()) + label('新照片', 225), 8, 'new', [300, 300], [400, 220]));
  L.push(placed(machine('已有参数') + label('算一次结果', 225), 8, 'fixed', [900, 300], [400, 720], { d: 180 }));
  const strings = [-60, 0, 60].map(x => line(x, -100, x, 100, { stroke: C.teal })).join('');
  L.push(placed(strings + g(knob(46), { x: 0, y: -150, r: 30 }) + label('调音：改设置', 225), 9, 'tuning', [300, 300], [400, 215]));
  L.push(placed(strings + path('M-110 0 Q-80 -80 -50 0 T10 0 T70 0 T130 0', { stroke: C.coral }) + label('演奏：用设置', 225), 9, 'playing', [900, 300], [400, 720], { d: 180 }));
  [10, 11, 12].forEach(step => {
    const box = rect(-240, -180, 480, 360, { fill: C.blue }) +
      g(centeredPhoto(catHead({ fill: C.cream })), { x: -90, y: -15, s: .68, r: -6 }) +
      g(centeredPhoto(dogHead()), { x: 85, y: 20, s: .68, r: 6 }) + label('独立测试图片', 260);
    L.push(placed(box, step, 'test', [600, 300], [400, 420]));
    if (step > 10) L.push(placed(g(checkBadge(55), { x: 225, y: -180 }), step, 'heldout', [600, 300], [400, 420], { d: 250 }));
  });
  return { id: 'train', cams: { desk: DESK }, svg: L.join('') };
}

function settingPhoto(art, setting = 'grass') {
  const grass = [-130, -65, 0, 65, 130].map(x => path(`M${x - 12} 90 l12 -28 l12 28`, { stroke: C.teal, sw: 5 })).join('');
  const bg = setting === 'sofa' ? g(sofa(), { x: -145, y: -35, s: .8 }) :
    setting === 'snow' ? path('M-175 60 Q-80 10 0 70 T175 50 L175 130 L-175 130 Z', { fill: C.white, stroke: null }) : grass;
  return g(photoFrame(400, 340, g(bg + g(art, { y: -20, s: .85 }), { x: 184, y: 154 }), { fill: setting === 'grass' ? C.mint : C.blue }), { x: -200, y: -170 });
}
function bias() {
  const L = [];
  [0, 1].forEach(step => {
    L.push(placed(settingPhoto(catHead(), 'sofa') + label('猫 · 沙发', 240), step, 'sofa', [300, 310], [400, 210]));
    L.push(placed(settingPhoto(dogHead()) + label('狗 · 草地', 240), step, 'grass', [900, 310], [400, 720], { d: 180 }));
    if (step === 1) {
      L.push(placed(rect(-185, 45, 370, 95, { fill: 'none', stroke: C.coral, r: 12 }), step, 'background', [300, 310], [400, 210], { d: 300 }));
      L.push(placed(rect(-185, 45, 370, 95, { fill: 'none', stroke: C.coral, r: 12 }), step, 'background2', [900, 310], [400, 720], { d: 300 }));
    }
  });
  L.push(placed(settingPhoto(catHead()) + label('猫走进草地', 240), 2, 'swap', [300, 310], [400, 240]));
  L.push(placed(tagCard(230, 150, '狗', { fill: C.coralInk, color: C.white }) + label('可能误判', 170), 2, 'wrong', [900, 310], [400, 760], { d: 250 }));
  const husky = path('M-95 -15 L-90 -115 L-35 -65 L35 -65 L90 -115 L95 -15 Q110 85 0 100 Q-110 85 -95 -15 Z', { fill: C.blue }) +
    path('M-65 -10 Q-35 -45 0 5 Q35 -45 65 -10 L45 60 Q0 105 -45 60 Z', { fill: C.white, sw: 4 }) +
    circle(-37, 4, 8, { fill: C.ink, stroke: null }) + circle(37, 4, 8, { fill: C.ink, stroke: null }) +
    path('M-16 40 L16 40 L0 55 Z', { fill: C.ink }) + path('M0 55 L0 70 M-20 72 Q0 85 20 72', { sw: 4 });
  L.push(placed(settingPhoto(husky, 'snow') + label('狼 / 哈士奇实验', 240), 3, 'research', [600, 280], [400, 380]));
  L.push(placed(label('研究者刻意构造的背景线索'), 3, 'caveat', [600, 650], [400, 850]));
  [4, 5, 6].forEach(step => {
    L.push(placed(centeredPhoto(toyCat(), C.peach) + label('模糊玩具（示意）', 225), step, 'toy', [300, 310], [400, 215]));
    L.push(placed(g(scoreCard({ cat: .9, dog: .1 }), { x: -280, y: -115 }) + label('仍然二选一', 225), step, 'forced', [900, 310], [400, 720], { d: 200 }));
  });
  [7, 8].forEach(step => {
    L.push(placed(g(scoreCard(), { x: -280, y: -115 }), step, 'scores', [600, 220], [400, 300]));
    L.push(placed(label('0.8 ≠ 这次有八成把握'), step, 'meaning', [600, 530], [400, 650], { d: 180 }));
  });
  L.push(placed(g(scoreCard(), { x: -280, y: -115 }) + label('分数', 210), 9, 'scores', [300, 300], [400, 220]));
  const tally = [-120, -40, 40, 120].map((x, i) => g(i === 3 ? qBadge(30) : checkBadge(30), { x })).join('');
  L.push(placed(tally + label('独立数据 · 实际正确情况', 210), 9, 'verify', [900, 300], [400, 720], { d: 180 }));
  L.push(placed(settingPhoto(catHead()) + g(qBadge(60), { x: 200, y: -155 }) + label('陌生环境', 250), 10, 'shift', [600, 300], [400, 420]));
  L.push(placed(g(scoreCard({ cat: .1, dog: .9 }), { x: -280, y: -115 }) + g(catHead(), { x: -10, y: -260, s: .7 }) + label('高分也可能答错', 220), 11, 'confidence', [600, 370], [400, 500]));
  const care = catHead() + g(person(), { x: 260, y: -30 }) + path('M150 35 C125 0 82 10 90 45 C95 65 120 83 150 108 C180 83 205 65 210 45 C218 10 175 0 150 35 Z', { fill: C.peach });
  L.push(placed(g(care, { x: -110 }) + label('分类成绩 ≠ 照料常识', 250), 12, 'care', [600, 310], [400, 420]));
  L.push(placed(tagCard(240, 150, '猫') + label('这项任务', 220), 13, 'task', [300, 300], [400, 220]));
  L.push(placed(qBadge(90) + label('其他能力另行验证', 220), 13, 'other', [900, 300], [400, 720], { d: 180 }));
  return { id: 'bias', cams: { desk: DESK }, svg: L.join('') };
}

const album = () => rect(-170, -140, 340, 280, { fill: C.blue, r: 12 }) +
  line(0, -130, 0, 130) + g(catHead(), { x: -84, s: .48 }) + g(catHead({ fill: C.cream }), { x: 85, s: .48 });
const petDoor = () => rect(-150, -210, 300, 420, { fill: C.cream, r: 12 }) + circle(103, -5, 14, { fill: C.coral }) +
  rect(-92, 25, 184, 185, { fill: C.white, r: 12 }) + g(catHead(), { y: 135, s: .5 });

const ACTIONS = [
  { id: 'infer', front: ['新照片', '交给模型算分'], back: ['推断', '利用已有参数'], art: () => centeredPhoto(catHead()) },
  { id: 'train', front: ['比较预测与标签', '调整参数'], back: ['训练', '改变参数'], art: () => knob(105) },
  { id: 'review', front: ['分错的照片', '交管理员核对'], back: ['人工核查', '另设训练才会改参数'], art: () => g(person(), { y: -35 }) + g(magnifier(55), { x: 90, y: 30 }) }
];
function actionCard(action, portrait) {
  const w = portrait ? 650 : 340, h = portrait ? 240 : 460;
  const front = rect(-w / 2, -h / 2, w, h, { fill: C.white }) +
    g(action.art(), { x: portrait ? -205 : 0, y: portrait ? 0 : -85, s: portrait ? .46 : .6 }) +
    txt(portrait ? 95 : 0, portrait ? -20 : 95, action.front, { size: 36 }) +
    txt(portrait ? 95 : 0, portrait ? 80 : 192, '点击翻面', { size: 32, fill: C.tealInk });
  const back = rect(-w / 2, -h / 2, w, h, { fill: C.mint }) +
    txt(0, portrait ? -35 : -40, action.back[0], { size: 58, fill: C.tealInk }) +
    txt(0, portrait ? 45 : 65, action.back[1], { size: action.id === 'review' ? 32 : 36 });
  return `<g class="flip hit" data-flip="${action.id}" role="button" tabindex="-1" aria-pressed="false" aria-label="${action.front.join('，')}，点击翻面" data-front-label="${action.front.join('，')}，点击翻面" data-back-label="${action.back.join('，')}，点击翻回"><g class="front" aria-hidden="true">${front}</g><g class="back" aria-hidden="true">${back}</g></g>`;
}
function human() {
  const L = [];
  L.push(placed(tagCard(260, 170, '猫') + g(arrow([[0, 0], [0, 150]]), { y: 130 }) + g(qBadge(70), { y: 385 }), 0, 'downstream', [600, 170], [400, 235]));
  [1, 2].forEach(step => {
    L.push(placed(album() + label('相册整理', 265), step, 'album', [300, 300], [400, 185]));
    L.push(placed(petDoor() + label('宠物门', 265), step, 'door', [900, 300], [400, 710], { d: 180 }));
    if (step === 2) L.push(placed(qBadge(60), step, 'risk', [1050, 90], [575, 500], { d: 300 }));
  });
  const choices = ['接收什么', '允许输出', '看不清时', '请人确认'].map((s, i) =>
    g(tagCard(310, 110, s, { size: 46, fill: i === 3 ? C.peach : C.mint }), { x: (i % 2) * 370 - 185, y: Math.floor(i / 2) * 180 })).join('');
  L.push(placed(g(person(), { y: -170 }) + g(choices, { y: 140 }), 3, 'rules', [600, 280], [400, 350]));
  L.push(placed(g(person(), { x: -110 }) + g(magnifier(90), { x: 140, y: 70 }) + label('核查 · 补救', 270), 4, 'review', [600, 290], [400, 380]));
  ACTIONS.forEach((action, i) => {
    L.push(el(actionCard(action, false), { at: 5, until: 7, n: `action.${action.id}`, only: 'l', l: [210 + i * 390, 350] }));
    L.push(el(actionCard(action, true), { at: 5, until: 7, n: `action.${action.id}`, only: 'p', p: [400, 180 + i * 320] }));
  });
  L.push(placed(g(person(), { y: -40 }) + label('核查材料', 225), 7, 'material', [300, 300], [400, 210]));
  L.push(placed(machine('另设训练流程') + label('才会调整参数', 225), 7, 'training', [900, 300], [400, 710], { d: 180 }));
  return { id: 'human', cams: { desk: DESK }, svg: L.join('') };
}

function references(ctx) {
  const titles = ['〔1〕图像分类 · TensorFlow', '〔1〕AlexNet · 原始论文', '〔2〕监督学习 · Google', '〔3〕背景线索 · LIME 论文', '〔4〕分数校准 · ICML 论文'];
  if (!ctx.references || ctx.references.length !== titles.length) throw new Error('第 01 篇资料来源数量已变，请核对来源场景');
  const L = [placed(label('资料来源'), 0, 'title', [600, 35], [400, 60]),
    placed(txt(0, 0, '算例与图解用于说明原理，并非实际模型测评', { size: 36 }), 0, 'note', [600, 105], [400, 145])];
  ctx.references.forEach((href, i) => {
    const draw = w => `<a class="hit" href="${esc(href)}" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-label="${esc(titles[i])}，打开原始资料">${rect(-w / 2, -37, w, 74, { fill: C.white, r: 14 })}${txt(0, 0, titles[i], { size: 36 })}</a>`;
    L.push(placed(draw(900), 0, `source${i}`, [600, 185 + i * 90], [400, 265 + i * 105], { only: 'l' }));
    L.push(placed(draw(730), 0, `source${i}`, [600, 185 + i * 90], [400, 265 + i * 105], { only: 'p' }));
  });
  const nav = `<a class="hit" href="?read" data-action="read" tabindex="-1" aria-label="阅读全文与完整资料说明">${pill(600, 80, '阅读全文与完整资料说明', { fill: C.tealInk, size: 40 })}</a>`;
  L.push(placed(nav, 0, 'read', [600, 655], [400, 860]));
  return { id: 'refs', cams: { desk: DESK }, svg: L.join('') };
}

module.exports = function build(ctx) {
  return [cover(ctx), open(), hub(), task(), pixels(), training(), bias(), human(), references(ctx)];
};

module.exports.thumbnail = function thumbnail(section) {
  const art = section.mark === '源' ? magnifier(100) : [
    centeredPhoto(catHead()),
    g(catHead(), { x: -100, s: .65 }) + g(dogHead(), { x: 100, s: .65 }),
    g(numberGrid(catGrid(4), 72, { digits: false }), { x: -144, y: -144 }),
    knob(105),
    settingPhoto(toyCat(), 'grass'),
    g(person(), { x: -50, y: -30 }) + g(magnifier(65), { x: 100, y: 30 })
  ][section.num];
  return `<svg class="toc-thumb" viewBox="-230 -190 460 380" aria-hidden="true" focusable="false">${art}</svg>`;
};
