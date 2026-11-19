'use strict';
/* 互动版的画法：调色板、描边与圆角沿用 .site/serial_art.cjs，场景全部由代码绘制。
 * 所有函数返回 SVG 片段字符串；坐标单位是场景的局部像素。
 * 约定：带 class="s" 的元素由运行时用 CSS transform 控制出现，
 * 所以版面变换（translate/rotate/scale）只能写在它的子元素上。 */

const C = {
  paper: '#fffdf6', ink: '#203845', muted: '#586e79', teal: '#168f94', mint: '#def3ee',
  coral: '#ee6a58', peach: '#ffe7df', yellow: '#ffcf62', cream: '#fff1d2', blue: '#e3efff', white: '#ffffff',
  /* 白字压在色块上时用这两个：原色青、珊瑚与白字只有 3.9 / 3.1 比 1，镜头缩小后字更小，到不了 4.5 比 1。
   * 同色相压深，白字 5.0 比 1；其余键与 serial_art.cjs 的 C 逐项相同（单测核对）。 */
  tealInk: '#137a7f', coralInk: '#d42c16'
};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n2 = v => Math.round(v * 100) / 100;

/* 描边：线宽 6，圆角连接。 */
const line6 = (w = 6) => `stroke="${C.ink}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

const g = (inner, { x = 0, y = 0, s = 1, r = 0 } = {}) =>
  `<g transform="translate(${n2(x)} ${n2(y)}) rotate(${n2(r)}) scale(${n2(s)})">${inner}</g>`;

const rect = (x, y, w, h, { fill = C.mint, r = 24, stroke = C.ink, sw = 6, extra = '' } = {}) =>
  `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" rx="${r}" fill="${fill}"` +
  (stroke ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"` : '') + `${extra ? ' ' + extra : ''}/>`;

const circle = (cx, cy, r, { fill = C.white, stroke = C.ink, sw = 6 } = {}) =>
  `<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(r)}" fill="${fill}"` + (stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : '') + '/>';

const path = (d, { fill = 'none', stroke = C.ink, sw = 6, extra = '' } = {}) =>
  `<path d="${d}" fill="${fill}"` + (stroke ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"` : '') + `${extra ? ' ' + extra : ''}/>`;

const line = (x1, y1, x2, y2, { stroke = C.ink, sw = 6, dash = '' } = {}) =>
  `<path d="M${n2(x1)} ${n2(y1)} L${n2(x2)} ${n2(y2)}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;

/* 文字：y 是垂直中线；多行时整体居中。 */
const txt = (x, y, lines, { size = 44, fill = C.ink, anchor = 'middle', weight = 700, lh = 1.32, extra = '' } = {}) => {
  const rows = Array.isArray(lines) ? lines : [lines];
  const top = y - ((rows.length - 1) * size * lh) / 2;
  return `<text x="${n2(x)}" y="${n2(top)}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="${weight}" dominant-baseline="central"${extra ? ' ' + extra : ''}>` +
    rows.map((l, i) => `<tspan x="${n2(x)}" dy="${i ? n2(size * lh) : 0}">${esc(l)}</tspan>`).join('') + '</text>';
};

/* 箭头：直线或折线，箭头三角形画在终点。points = [[x,y],...] */
function arrow(points, { stroke = C.ink, sw = 8, head = 26 } = {}) {
  const pts = points.map(([x, y]) => [x, y]);
  const [ax, ay] = pts[pts.length - 2];
  const [bx, by] = pts[pts.length - 1];
  const a = Math.atan2(by - ay, bx - ax);
  const back = [bx - Math.cos(a) * head * 0.5, by - Math.sin(a) * head * 0.5];
  pts[pts.length - 1] = back;
  const d = 'M' + pts.map(([x, y]) => `${n2(x)} ${n2(y)}`).join(' L');
  const wing = (t) => [bx - Math.cos(a + t) * head, by - Math.sin(a + t) * head];
  const [w1x, w1y] = wing(0.5), [w2x, w2y] = wing(-0.5);
  return `<g fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="${d}"/><path d="M${n2(w1x)} ${n2(w1y)} L${n2(bx)} ${n2(by)} L${n2(w2x)} ${n2(w2y)}"/></g>`;
}

/* ---- 角色与道具（原点在中心，除非另有说明） ---- */

/* 猫头：宽约 240，高约 200。 */
function catHead({ fill = C.yellow, inner = C.coral, marks = true } = {}) {
  const o = line6(6);
  return [
    `<path d="M-96 -28 L-88 -100 L-34 -64 Z" fill="${fill}" ${o}/>`,
    `<path d="M96 -28 L88 -100 L34 -64 Z" fill="${fill}" ${o}/>`,
    `<path d="M-85.5 -44.2 L-81.1 -83.8 L-51.4 -64 Z" fill="${inner}"/>`,
    `<path d="M85.5 -44.2 L81.1 -83.8 L51.4 -64 Z" fill="${inner}"/>`,
    `<ellipse cx="0" cy="6" rx="102" ry="84" fill="${fill}" ${o}/>`,
    marks ? `<path d="M0 -70 L0 -50 M-20 -66 L-15 -50 M20 -66 L15 -50" fill="none" stroke="${C.coral}" stroke-width="5" stroke-linecap="round"/>` : '',
    `<ellipse cx="-40" cy="0" rx="10" ry="14" fill="${C.ink}"/><ellipse cx="40" cy="0" rx="10" ry="14" fill="${C.ink}"/>`,
    `<circle cx="-36.5" cy="-6" r="4" fill="${C.white}"/><circle cx="43.5" cy="-6" r="4" fill="${C.white}"/>`,
    `<path d="M-10 20 L10 20 L0 32 Z" fill="${C.coral}" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/>`,
    `<path d="M0 32 C-3 46 -20 50 -30 41 M0 32 C3 46 20 50 30 41" fill="none" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>`,
    `<path d="M-62 30 L-128 20 M-64 44 L-130 48 M62 30 L128 20 M64 44 L130 48" fill="none" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>`
  ].join('');
}

/* 狗头：垂耳、浅色脸、白嘴套。 */
function dogHead({ fill = C.cream, ear = C.teal } = {}) {
  const o = line6(6);
  return [
    `<ellipse cx="-96" cy="-2" rx="34" ry="64" transform="rotate(14 -96 -2)" fill="${ear}" ${o}/>`,
    `<ellipse cx="96" cy="-2" rx="34" ry="64" transform="rotate(-14 96 -2)" fill="${ear}" ${o}/>`,
    `<ellipse cx="0" cy="0" rx="88" ry="82" fill="${fill}" ${o}/>`,
    `<ellipse cx="0" cy="32" rx="48" ry="34" fill="${C.white}" ${line6(5)}/>`,
    `<ellipse cx="0" cy="14" rx="18" ry="12" fill="${C.ink}"/>`,
    `<path d="M0 26 L0 44 M0 44 C-8 56 -26 56 -32 46 M0 44 C8 56 26 56 32 46" fill="none" stroke="${C.ink}" stroke-width="4.5" stroke-linecap="round"/>`,
    `<path d="M-2 52 C-2 70 18 70 18 54 Z" fill="${C.coral}" stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"/>`,
    `<circle cx="-38" cy="-18" r="10" fill="${C.ink}"/><circle cx="38" cy="-18" r="10" fill="${C.ink}"/>`,
    `<circle cx="-35" cy="-22" r="3.6" fill="${C.white}"/><circle cx="41" cy="-22" r="3.6" fill="${C.white}"/>`
  ].join('');
}

/* 相框：原点在左上角，白边，内框填色。content 的坐标原点是内框左上，内容要自己控制在内框以内
 * （不用 clipPath：同一份画面会为横竖屏各生成一遍，重复的 id 在 display:none 的 SVG 里不可靠）。 */
function photoFrame(w, h, content = '', { fill = C.mint, bottom = 0 } = {}) {
  const m = 16, iw = w - m * 2, ih = h - m * 2 - bottom;
  return [
    rect(0, 0, w, h, { fill: C.white, r: 14 }),
    `<rect x="${m}" y="${m}" width="${iw}" height="${ih}" rx="6" fill="${fill}" stroke="${C.ink}" stroke-width="4"/>`,
    `<g transform="translate(${m} ${m})">${content}</g>`
  ].join('');
}

/* 显示器：原点在左上角。content 画在屏幕内，坐标原点是屏幕左上；屏幕尺寸 = (w-52) × (h-90)。 */
function monitor(w, h, content = '', { screen = C.white } = {}) {
  const m = 26, sw = w - m * 2, sh = h - m * 2 - 38;
  return [
    rect(w / 2 - 28, h - 6, 56, 52, { fill: C.teal, r: 8, sw: 5 }),
    rect(w / 2 - 110, h + 34, 220, 28, { fill: C.teal, r: 12, sw: 5 }),
    rect(0, 0, w, h, { fill: C.blue, r: 28 }),
    `<rect x="${m}" y="${m}" width="${sw}" height="${sh}" rx="12" fill="${screen}" stroke="${C.ink}" stroke-width="4"/>`,
    `<g transform="translate(${m} ${m})">${content}</g>`,
    circle(w / 2, h - 22, 8, { fill: C.coral, sw: 3 })
  ].join('');
}

/* 眼睛：宽约 190。 */
function eye() {
  return [
    path('M-92 0 C-52 -62 52 -62 92 0 C52 62 -52 62 -92 0 Z', { fill: C.white }),
    circle(0, 0, 34, { fill: C.teal, sw: 5 }),
    circle(0, 0, 15, { fill: C.ink, stroke: null }),
    circle(-10, -11, 7, { fill: C.white, stroke: null }),
    path('M-44 -76 L-56 -100 M0 -84 L0 -112 M44 -76 L56 -100', { sw: 5 })
  ].join('');
}

/* 问号徽章：按可见笔画居中，避免全角字形的侧边留白与字体基线造成偏移。 */
const qBadge = (r = 38, fill = C.coralInk) =>
  circle(0, 0, r, { fill, sw: 5 }) + g(
    path('M-10 -7 C-10 -21 10 -21 10 -7 C10 0 0 0 0 7', { stroke: C.white, sw: 5 }) +
    circle(0, 16, 3.5, { fill: C.white, stroke: null }),
    { y: r / 152, s: r / 38 }
  );

/* 打勾徽章。 */
const checkBadge = (r = 30, fill = C.teal) =>
  circle(0, 0, r, { fill, sw: 5 }) + path(`M${-r * 0.42} ${r * 0.02} L${-r * 0.1} ${r * 0.34} L${r * 0.46} ${-r * 0.3}`, { stroke: C.white, sw: 7 });

/* 序号徽章（章节标记）。 */
const numBadge = (label, r = 34, fill = C.coralInk) =>
  circle(0, 0, r, { fill, sw: 5 }) + txt(0, 2, String(label), { size: r * 1.15, fill: C.white, weight: 800 });

/* 标签牌：圆角黄牌 + 大字。原点在中心。 */
function tagCard(w, h, label, { fill = C.yellow, size = h * 0.56, color = C.ink } = {}) {
  return rect(-w / 2, -h / 2, w, h, { fill, r: 26 }) + txt(0, 3, label, { size, fill: color, weight: 800 });
}

/* 亮度 0–9 对应的灰阶：0 最暗（墨色），9 最亮（纸色），按 sRGB 线性混合。 */
function shade(v) {
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const a = hex(C.ink), b = hex(C.paper), t = Math.max(0, Math.min(9, v)) / 9;
  return '#' + a.map((x, i) => Math.round(x + (b[i] - x) * t).toString(16).padStart(2, '0')).join('');
}

/* 方格表：用于“照片变成数字”。rows 是 0–9 的二维数组，数字越大越亮。 */
function numberGrid(rows, cell = 46, { digits = true, digitSize = cell * 0.46 } = {}) {
  let out = '';
  rows.forEach((row, r) => row.forEach((v, c) => {
    out += `<rect x="${c * cell}" y="${r * cell}" width="${cell}" height="${cell}" fill="${shade(v)}" stroke="${C.ink}" stroke-width="2.5"/>`;
    if (digits) out += txt(c * cell + cell / 2, r * cell + cell / 2 + 1, String(v), { size: digitSize, weight: 700, fill: v >= 5 ? C.ink : C.paper });
  }));
  out += `<rect x="0" y="0" width="${cell * rows[0].length}" height="${cell * rows.length}" fill="none" stroke="${C.ink}" stroke-width="6" stroke-linejoin="round"/>`;
  return out;
}

/* 药丸标签：原点在中心。 */
function pill(w, h, label, { fill = C.coralInk, color = C.white, size = h * 0.56, weight = 800 } = {}) {
  return rect(-w / 2, -h / 2, w, h, { fill, r: h / 2, sw: 5 }) + txt(0, 2, label, { size, fill: color, weight });
}

/* 括号：水平大括号线，两端下折，用来圈住一串步骤。 */
function bracket(x1, x2, y, { drop = 26, stroke = C.coral, sw = 7 } = {}) {
  return path(`M${n2(x1)} ${n2(y + drop)} L${n2(x1)} ${n2(y)} L${n2(x2)} ${n2(y)} L${n2(x2)} ${n2(y + drop)}`, { stroke, sw });
}

/* 人像：胸像，原点在头部中心；高约 230。 */
function person({ skin = C.cream, shirt = C.teal } = {}) {
  return [
    path('M-82 150 C-82 78 -44 56 0 56 C44 56 82 78 82 150 Z', { fill: shirt }),
    circle(0, 0, 54, { fill: skin }),
    path('M-52 -14 C-48 -64 -8 -70 18 -62 C40 -56 52 -40 52 -14 C34 -34 -26 -34 -52 -14 Z', { fill: C.ink, sw: 3 }),
    circle(-19, 8, 5.5, { fill: C.ink, stroke: null }), circle(19, 8, 5.5, { fill: C.ink, stroke: null }),
    path('M-14 28 C-6 38 6 38 14 28', { sw: 4.5 })
  ].join('');
}

/* 放大镜：原点在镜圈中心，手柄朝右下。 */
function magnifier(r = 62) {
  const d = r * 0.72;
  return [
    line(d, d, d + r * 0.9, d + r * 0.9, { sw: 16 }),
    line(d, d, d + r * 0.9, d + r * 0.9, { sw: 8, stroke: C.coral }),
    circle(0, 0, r, { fill: 'rgba(222,243,238,.7)', sw: 7 }),
    path(`M${-r * 0.55} ${-r * 0.1} C${-r * 0.45} ${-r * 0.5} ${-r * 0.15} ${-r * 0.7} ${r * 0.15} ${-r * 0.68}`, { stroke: C.white, sw: 6 })
  ].join('');
}

/* 旋钮：原点在中心，指针朝上；旋转由运行时的 data-pose 控制。 */
function knob(r = 44, fill = C.yellow) {
  return circle(0, 0, r, { fill, sw: 5 }) + line(0, -r * 0.18, 0, -r * 0.82, { sw: 7 }) + circle(0, 0, r * 0.12, { fill: C.ink, stroke: null });
}

/* 模型机器：原点在左上角，宽 360 高 300；旋钮的圆心在 (90,210) (180,210) (270,210)。 */
function modelMachine({ label = '已训练模型', knobs = true, labelSize = 40 } = {}) {
  return [
    rect(0, 0, 360, 300, { fill: C.blue, r: 30 }),
    rect(34, 32, 292, 92, { fill: C.white, r: 16, sw: 5 }),
    txt(180, 79, label, { size: labelSize }),
    knobs ? [90, 180, 270].map(x => `<g transform="translate(${x} 210)">${knob(36)}</g>`).join('') : '',
    line(40, 272, 120, 272, { sw: 5 }), line(150, 272, 230, 272, { sw: 5 }), line(260, 272, 320, 272, { sw: 5 })
  ].join('');
}

/* 紧凑分数卡：原点在左上角，宽 260 高 170，放进路线上的小盘子里也看得清；条长 = 分数 × 140。 */
function scoreCompact({ cat = 0.8, dog = 0.2 } = {}) {
  const bar = (y, label, v, fill) =>
    txt(30, y + 24, label, { size: 34 }) +
    rect(58, y, 140 * v, 48, { fill, r: 12, sw: 5 }) +
    txt(58 + 140 * v + 14, y + 26, String(v), { size: 34, anchor: 'start', weight: 800 });
  return rect(0, 0, 260, 170, { fill: C.cream, r: 26 }) + bar(26, '猫', cat, C.teal) + bar(96, '狗', dog, C.coral);
}

/* 分数卡：原点在左上角，宽 560 高 230；条长 = 分数 × 300。
 * 两根条各自标记 id，场景里可以让它们在不同的拍长出来。 */
function scoreCard({ cat = 0.8, dog = 0.2 } = {}) {
  const bar = (y, label, v, fill, cls) =>
    txt(56, y + 28, label, { size: 44, anchor: 'middle' }) +
    `<g class="${cls}">` + rect(100, y, 300 * v, 56, { fill, r: 14, sw: 5 }) +
    txt(100 + 300 * v + 18, y + 30, String(v), { size: 40, anchor: 'start', weight: 800 }) + '</g>';
  return rect(0, 0, 560, 230, { fill: C.cream, r: 28 }) + bar(36, '猫', cat, C.teal, 'bar-cat') + bar(128, '狗', dog, C.coral, 'bar-dog');
}

/* 沙发：原点在左上角，宽 360 高 170。 */
function sofa({ fill = C.teal } = {}) {
  return [
    rect(0, 20, 360, 150, { fill, r: 34 }),
    rect(-18, 76, 70, 94, { fill, r: 26 }),
    rect(308, 76, 70, 94, { fill, r: 26 }),
    rect(58, 96, 244, 74, { fill: C.mint, r: 18, sw: 5 })
  ].join('');
}

/* 小猫轮廓（卡通版）：白底描边，没有颜色。 */
function cartoonCat() {
  const o = line6(7);
  return [
    `<path d="M-96 -28 L-88 -100 L-34 -64 Z" fill="${C.white}" ${o}/>`,
    `<path d="M96 -28 L88 -100 L34 -64 Z" fill="${C.white}" ${o}/>`,
    `<ellipse cx="0" cy="6" rx="102" ry="84" fill="${C.white}" ${o}/>`,
    `<circle cx="-38" cy="-2" r="9" fill="${C.ink}"/><circle cx="38" cy="-2" r="9" fill="${C.ink}"/>`,
    `<path d="M-8 22 L8 22 L0 32 Z" fill="${C.ink}" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/>`,
    `<path d="M0 32 C-3 44 -18 48 -26 40 M0 32 C3 44 18 48 26 40" fill="none" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/>`
  ].join('');
}

/* 玩具猫：蓝灰布料 + 缝线 + 纽扣眼。 */
function toyCat() {
  const o = line6(6);
  return [
    `<path d="M-96 -28 L-88 -100 L-34 -64 Z" fill="${C.blue}" ${o}/>`,
    `<path d="M96 -28 L88 -100 L34 -64 Z" fill="${C.blue}" ${o}/>`,
    `<ellipse cx="0" cy="6" rx="102" ry="84" fill="${C.blue}" ${o}/>`,
    `<path d="M-60 -52 L-44 -44 M-30 -64 L-22 -46 M60 -52 L44 -44" fill="none" stroke="${C.ink}" stroke-width="4" stroke-dasharray="3 8" stroke-linecap="round"/>`,
    `<circle cx="-40" cy="0" r="15" fill="${C.white}" ${line6(5)}/><circle cx="40" cy="0" r="15" fill="${C.white}" ${line6(5)}/>`,
    `<path d="M-46 -6 L-34 6 M-34 -6 L-46 6 M34 -6 L46 6 M46 -6 L34 6" fill="none" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>`,
    `<path d="M-10 20 L10 20 L0 32 Z" fill="${C.coral}" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/>`,
    `<path d="M-30 46 L30 46" fill="none" stroke="${C.ink}" stroke-width="4" stroke-dasharray="3 8" stroke-linecap="round"/>`
  ].join('');
}

/* ---- 出现时机与摆位 ----
 * el() 把一块画面包成「第 at 步起出现、第 until 步前消失」的元素。at/until 是场景自己的步号（0 起），
 * 每一拍在分镜里声明自己对应哪一步，所以同一个场景可以隔开几拍再回来。
 * 结构：外层 <g class="s"> 只管出现动画；内层 <g class="pos"> 只管摆位。两层的 transform 不能混写。
 * 摆位 l / p = [x, y, 缩放, 旋转度]，分别用于横屏与竖屏；省略 p 时竖屏沿用 l。
 * kind：pop 缩放出现 / rise 上浮出现（默认）/ fade 只淡入。d 是延迟毫秒，用来错开同一拍里的先后。 */
function el(inner, { at = 0, until = null, kind = 'rise', d = 0, l = [0, 0], p = null, only = '', bleed = false, n = '' } = {}) {
  const pl = l, pp = p || l;
  const vars = (k, a) => `--${k}x:${n2(a[0])}px;--${k}y:${n2(a[1])}px;--${k}s:${a[2] == null ? 1 : a[2]};--${k}r:${a[3] || 0}deg`;
  /* bleed：装饰性底色，允许伸出画面边缘；布局审计不检查它。n：元素名，审计报告里用。 */
  const cls = `s ${kind}` + (only ? ` only-${only}` : '') + (bleed ? ' bleed' : '');
  const attrs = `class="${cls}" data-at="${at}"` + (until != null ? ` data-until="${until}"` : '') + (n ? ` data-n="${esc(n)}"` : '') + (d ? ` style="--d:${d}ms"` : '');
  return `<g ${attrs}><g class="pos" style="${vars('l', pl)};${vars('p', pp)}">${inner}</g></g>`;
}

/* 连载机器人：原图朝左指，宽高比 480:439。href 相对于 互动版.html 所在的文章目录。 */
const ROBOT_HREF = '../../.site/assets/serial-robot-480.png';
const robot = (x, y, w = 300) =>
  `<image href="${ROBOT_HREF}" x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(w * 439 / 480)}" preserveAspectRatio="xMidYMid meet"/>`;

module.exports = {
  el, robot, ROBOT_HREF,
  C, esc, n2, line6, g, rect, circle, path, line, txt, arrow,
  catHead, dogHead, cartoonCat, toyCat, photoFrame, monitor, eye, qBadge, checkBadge, numBadge,
  tagCard, shade, numberGrid, pill, bracket, person, magnifier, knob, modelMachine, scoreCard, scoreCompact, sofa
};
