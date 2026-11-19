/* 互动版运行时的纯函数测试：手势限流、触摸判定、镜头、哈希、切句。
 * 不需要浏览器；时间戳全部由测试给出，所以结果与机器快慢无关。
 * 运行：node .site/tests/stage-unit.cjs */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const T = require('../stage/text.cjs');

/* 根 package.json 是 "type": "module"，.js 会被当成 ESM 加载，module.exports 不存在；
 * 浏览器里这是一份经典脚本。所以这里按经典脚本、在隔离环境里执行同一份字节，取它导出的纯函数。 */
const sandbox = { module: { exports: {} } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../stage/stage.js'), 'utf8'), sandbox, { filename: 'stage.js' });
const S = sandbox.module.exports;
assert.ok(S.createWheelGate && S.swipeStep, 'stage.js 没有导出纯函数');

let count = 0;
const test = (name, fn) => { fn(); count++; };
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

/* ---- 滚轮限流 ---- */

/* events = [[毫秒, 增量], ...]；返回触发翻页的 [毫秒, 方向] 列表。 */
function run(events, options) {
  const gate = S.createWheelGate(options);
  const fired = [];
  for (const [t, dy] of events) {
    const dir = gate.feed(dy, t);
    if (dir) fired.push([t, dir]);
  }
  return fired;
}

/* 触控板惯性：快速升到 peak，再按 decay 指数衰减到 1 以下。16ms 一帧，从 t0 开始。 */
function inertia(t0, peak = 180, decay = 0.93, sign = 1) {
  const out = [];
  let t = t0;
  for (const k of [0.15, 0.4, 0.75, 1]) { out.push([t, sign * peak * k]); t += 16; }
  for (let d = peak * decay; d > 1; d *= decay) { out.push([t, sign * d]); t += 16; }
  return out;
}
const lastTime = events => events[events.length - 1][0];

test('一格滚轮 → 翻一拍', () => assert.deepEqual(run([[0, 100]]), [[0, 1]]));
test('向上一格 → 后退一拍', () => assert.deepEqual(run([[0, -100]]), [[0, -1]]));
test('低于阈值的单个事件不翻', () => assert.deepEqual(run([[0, 10]]), []));
test('零增量事件被忽略', () => assert.deepEqual(run([[0, 0], [16, 0]]), []));

test('两格滚轮相隔 400ms → 翻两拍', () => {
  assert.deepEqual(run([[0, 100], [400, 100]]), [[0, 1], [400, 1]]);
});

test('一次触控板惯性（约 1 秒）只翻一拍', () => {
  const ev = inertia(0);
  assert.ok(lastTime(ev) > 800, `惯性应持续接近 1 秒，实际 ${lastTime(ev)}ms`);
  assert.deepEqual(run(ev), [[0, 1]].map(([t, d]) => [ev[0][0], d]));
});

test('惯性的方向相反的衰减尾巴不会反向翻页', () => {
  const ev = [...inertia(0), [900, -3], [916, -2]];
  assert.equal(run(ev).length, 1);
});

test('惯性结束、停顿后再甩一次 → 又翻一拍', () => {
  const a = inertia(0);
  const b = inertia(lastTime(a) + 700);
  const fired = run([...a, ...b]);
  assert.equal(fired.length, 2);
  assert.deepEqual(fired.map(f => f[1]), [1, 1]);
});

test('在惯性上又甩了一下（增量突增）→ 再翻一拍', () => {
  const a = inertia(0);
  const surge = [[500, 170], [516, 150], [532, 120]];
  const rest = a.filter(([t]) => t < 500 || t > 548);
  const fired = run([...rest.filter(([t]) => t < 500), ...surge, ...rest.filter(([t]) => t > 548)]);
  assert.equal(fired.length, 2);
  assert.ok(fired[1][0] >= 500 && fired[1][0] <= 532, `第二次应落在突增处，实际 ${fired[1][0]}`);
});

test('突增发生在锁定 350ms 内 → 不翻（同一次手势的加速段）', () => {
  const ev = [[0, 20], [16, 40], [32, 80], [48, 160], [64, 200], [80, 190]];
  assert.equal(run(ev).length, 1);
});

test('一次猛甩（3000px）也只翻一拍', () => {
  assert.deepEqual(run([[0, 3000], [16, 3000], [32, 2500], [48, 2000]]).length, 1);
});

test('匀速持续滚动 3 秒（滚轮一直转）→ 大约每秒一拍', () => {
  const ev = [];
  for (let t = 0; t <= 3000; t += 50) ev.push([t, 100]);
  const fired = run(ev);
  assert.ok(fired.length >= 3 && fired.length <= 4, `实际 ${fired.length} 拍`);
  for (let i = 1; i < fired.length; i++) assert.ok(fired[i][0] - fired[i - 1][0] >= 900, '相邻两拍至少隔 900ms');
});

test('同一手势里立刻反向的事件被忽略', () => {
  assert.deepEqual(run([[0, 100], [16, -100], [32, -100]]), [[0, 1]]);
});

test('停顿超过 130ms 视为新手势，可以反向', () => {
  assert.deepEqual(run([[0, 100], [400, -150]]), [[0, 1], [400, -1]]);
});

/* ---- 触摸滑动 ---- */

test('上滑 60px → 前进；下滑 60px → 后退', () => {
  assert.equal(S.swipeStep(0, -60, 500), 1);
  assert.equal(S.swipeStep(0, 60, 500), -1);
});
test('慢拖不到 48px 不翻；快速一划 24px 翻', () => {
  assert.equal(S.swipeStep(0, -30, 500), 0);
  assert.equal(S.swipeStep(0, -30, 150), 1);
  assert.equal(S.swipeStep(0, -20, 100), 0);
});
test('斜着划不算（横向分量太大）', () => {
  assert.equal(S.swipeStep(60, -50, 300), 0);
  assert.equal(S.swipeStep(40, -50, 300), 1);
});

/* ---- 镜头与版面 ---- */

test('fitCamera：等比放进画面区并居中', () => {
  const t = S.fitCamera([0, 0, 100, 50], { x: 0, y: 0, w: 200, h: 200 });
  near(t.s, 2); near(t.x, 0); near(t.y, 50);
  const u = S.fitCamera([100, 40, 300, 100], { x: 10, y: 20, w: 300, h: 300 });
  near(u.s, 1); near(u.x, 10 - 100); near(u.y, 20 + 100 - 40);
});

test('artArea：竖屏与横屏判定、字幕卡留白', () => {
  assert.equal(S.artArea(390, 844).portrait, true);
  assert.equal(S.artArea(1440, 900).portrait, false);
  assert.equal(S.artArea(700, 900).portrait, true);
  assert.equal(S.artArea(800, 900).portrait, false);
  assert.equal(S.artArea(390, 844, 0).h, 844 - 56 - 64);
  assert.equal(S.artArea(390, 844, 100).h, 844 - 56 - 114);
  assert.ok(S.artArea(300, 200, 400).h >= 120, '极矮的屏也要留出至少 120px');
});

test('dwell：按字数估读，下限 2.4 秒、上限 12 秒', () => {
  near(S.dwell(0), 2.4); near(S.dwell(10), 2.8); near(S.dwell(27), 5.18); near(S.dwell(500), 12);
});

test('visibleAt：[at, until) 半开区间', () => {
  assert.equal(S.visibleAt(2, 4, 1), false);
  assert.equal(S.visibleAt(2, 4, 2), true);
  assert.equal(S.visibleAt(2, 4, 3), true);
  assert.equal(S.visibleAt(2, 4, 4), false);
  assert.equal(S.visibleAt(2, null, 99), true);
});

test('focusHit：全等或 “名字.” 前缀', () => {
  assert.equal(S.focusHit(['p2', 'ring'], 'p2'), true);
  assert.equal(S.focusHit(['p2', 'ring'], 'ring.knobs.tag'), true);
  assert.equal(S.focusHit(['p2', 'ring'], 'p20'), false);
  assert.equal(S.focusHit(['p2', 'ring'], 'tag'), false);
  assert.equal(S.focusHit([], 'p2'), false);
});

test('哈希：#b3 ↔ 第 3 拍（下标 2），越界与格式错误返回 -1', () => {
  assert.equal(S.parseBeatHash('#b3', 13), 2);
  assert.equal(S.parseBeatHash('#b1', 13), 0);
  assert.equal(S.parseBeatHash('#b13', 13), 12);
  for (const bad of ['#b0', '#b14', '', '#x', '#b-1', '#b1.5', undefined, '#B3']) assert.equal(S.parseBeatHash(bad, 13), -1, String(bad));
  assert.equal(S.formatBeatHash(2), '#b3');
});

/* ---- 切句 ---- */

test('splitSentences：句号、问号、感叹号；右引号与脚注编号随句', () => {
  assert.deepEqual(T.splitSentences('把一张猫的照片交给电脑，屏幕上很快出现一个字：“猫”。我们认猫时，似乎看一眼就够了。'),
    ['把一张猫的照片交给电脑，屏幕上很快出现一个字：“猫”。', '我们认猫时，似乎看一眼就够了。']);
  assert.deepEqual(T.splitSentences('“真的吗？”他问。'), ['“真的吗？”', '他问。']);
  assert.deepEqual(T.splitSentences('中间经过的是信息表示和一连串计算。〔1〕下一句。'), ['中间经过的是信息表示和一连串计算。〔1〕', '下一句。']);
  assert.deepEqual(T.splitSentences('没有句号的尾巴'), ['没有句号的尾巴']);
  assert.deepEqual(T.splitSentences('  \n '), []);
});

test('splitSentences：拼回去与原文逐字相同（去掉空白后）', () => {
  const text = '训练方法、数据和目标由人安排，具体参数由训练过程调整。〔2〕训练和使用，是两个不同阶段。猫0.8？不能直接读成“八成把握”！好。';
  assert.equal(T.squash(T.splitSentences(text).join('')), T.squash(text));
});

test('splitCitation：把句末的〔n〕拆出来', () => {
  assert.deepEqual(T.splitCitation('计算。〔1〕'), { body: '计算。', cite: '〔1〕' });
  assert.deepEqual(T.splitCitation('计算。〔1,2〕'), { body: '计算。', cite: '〔1,2〕' });
  assert.deepEqual(T.splitCitation('没有脚注。'), { body: '没有脚注。', cite: '' });
});

test('splitTitle：在第一个全角标点后折行，两段各自不再断', () => {
  assert.deepEqual(T.splitTitle('AI 到底在做什么？从认猫开始'), ['AI 到底在做什么？', '从认猫开始']);
  assert.deepEqual(T.splitTitle('查一次还不够，AI 助手怎样接着做？'), ['查一次还不够，', 'AI 助手怎样接着做？']);
  assert.deepEqual(T.splitTitle('没有标点的标题'), ['没有标点的标题', '']);
  assert.deepEqual(T.splitTitle('标点在结尾？'), ['标点在结尾？', '']);
});

test('调色板：与连载图解 serial_art.cjs 的 C 逐项相同（深色变体除外）', () => {
  const art = require('../stage/art.cjs');
  const src = fs.readFileSync(path.join(__dirname, '../serial_art.cjs'), 'utf8');
  const body = src.match(/const C=\{([^}]*)\}/)[1];
  const theirs = Object.fromEntries([...body.matchAll(/(\w+):'(#[0-9a-fA-F]{6})'/g)].map(m => [m[1], m[2].toLowerCase()]));
  assert.ok(Object.keys(theirs).length >= 11, '没从 serial_art.cjs 读出调色板');
  for (const [k, v] of Object.entries(theirs)) assert.equal(String(art.C[k]).toLowerCase(), v, `调色板 ${k} 与 serial_art.cjs 不同`);
  for (const k of Object.keys(art.C)) if (!(k in theirs)) assert.ok(/Ink$/.test(k), `多出的颜色 ${k} 必须是压字用的 *Ink 变体`);
});

test('压字用的深色变体：白字压上去至少 4.5 比 1；青色字压在纸色上至少 4.5 比 1', () => {
  const art = require('../stage/art.cjs');
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  assert.ok(ratio(art.C.white, art.C.coralInk) >= 4.5, `白字压珊瑚深色 ${ratio(art.C.white, art.C.coralInk).toFixed(2)}`);
  assert.ok(ratio(art.C.white, art.C.tealInk) >= 4.5, `白字压青深色 ${ratio(art.C.white, art.C.tealInk).toFixed(2)}`);
  assert.ok(ratio(art.C.tealInk, art.C.paper) >= 4.5, `青深色字压纸色 ${ratio(art.C.tealInk, art.C.paper).toFixed(2)}`);
});

const { parseUnits, assemble } = require('../render_stage.cjs');
test('阅读提示去掉引用标记，文字与后续句子保持完整', () => {
  const source = '# 标题\n\n> 阅读提示：先看原值。再看选读。';
  assert.deepEqual(parseUnits(source,'test'), [{type:'h1',text:'标题'}, {type:'p',text:'阅读提示：先看原值。'}, {type:'p',text:'再看选读。'}]);
});
const sample = [{ type: 'h1', text: '标题' }, { type: 'p', text: '第一句。' }, { type: 'h2', text: '小节' }, { type: 'p', text: '第二句。' }];
const titleBeat = { take: 1, from: '标题' };
test('完整分镜不能遗漏正文', () => {
  assert.throws(() => assemble(sample, { complete: true, beats: [titleBeat] }, 'test'), /正文还剩/);
});
test('正文改动后 from 锁句必须失败', () => {
  assert.throws(() => assemble(sample, { beats: [{ take: 1, from: '旧标题' }] }, 'test'), /应从/);
});
test('消费数量必须是非负整数', () => {
  for (const take of [-1, .5, '1']) assert.throws(() => assemble(sample, { beats: [{ take, from: '标题' }] }, 'test'), /非负整数/);
});
test('一句正文不能把后面的小节标题并入同拍', () => {
  assert.throws(() => assemble(sample, { beats: [titleBeat, { take: 2, from: '第一句' }] }, 'test'), /标题要单独成拍/);
});
test('静默资料拍不消费正文，有独立目录且不增加正文章数', () => {
  const result = assemble(sample, { complete: true, beats: sample.map(u => ({ take: 1, from: u.text })).concat([{ take: 0, refs: true, quiet: true }]) }, 'test');
  assert.equal(result.consumed, sample.length);
  assert.equal(result.sectionCount, 1);
  assert.equal(result.sections[2].label, '资料来源');
  assert.equal(result.beats[4].section, 2);
});
test('资料来源不混入正文分镜单元', () => {
  assert.deepEqual(parseUnits('# 标题\n\n句子。\n\n## 资料来源\n\nhttps://example.org', 'test'), [{ type: 'h1', text: '标题' }, { type: 'p', text: '句子。' }]);
});

/* 第 02 篇的算分直接驱动画面；逐组核对分子、分母和百分数。 */
const blocks = require('../stage/blocks.cjs');
for (const [dataset, expected] of Object.entries({ training: [[8,8,100],[8,8,100]], switched: [[0,4,0],[4,4,100]], mixed: [[2,4,50],[4,4,100]], supplemented: [[8,10,80],[10,10,100]] })) {
  test('积木手写规则：' + dataset, () => {
    for (const [i, rule] of ['A', 'B'].entries()) {
      const result = blocks.evaluate(blocks[dataset], rule);
      assert.deepEqual([result.correct, result.total, result.percent], expected[i]);
    }
  });
}
test('颜色规则与轮廓规则在换色样本上逐项分歧，原训练数据不变', () => {
  const before = JSON.stringify(blocks.training);
  for (const item of blocks.switched) assert.notEqual(blocks.rules.A(item), blocks.rules.B(item));
  assert.equal(JSON.stringify(blocks.training), before);
  assert.deepEqual(blocks.supplemented.slice(0, 8), blocks.training);
  assert.deepEqual(blocks.supplemented.slice(8), [{ color: 'blue', shape: 'circle' }, { color: 'red', shape: 'square' }]);
});
const pixels = require('../stage/pixels.cjs');
test('九格按行编码，中心一格改变只影响第五位', () => {
  assert.equal(pixels.encode(pixels.cross), '010111010');
  assert.equal(pixels.encode(pixels.hollow), '010101010');
  assert.deepEqual(pixels.rows(pixels.cross, 3), [[0,1,0],[1,1,1],[0,1,0]]);
  assert.deepEqual(pixels.cross.flatMap((v,i) => v !== pixels.hollow[i] ? [i] : []), [4]);
});
test('两个对角线黑格数量相同但位置不同，练习答案可还原', () => {
  assert.equal(pixels.encode(pixels.down), '100010001');
  assert.equal(pixels.encode(pixels.up), '001010100');
  assert.equal(pixels.down.reduce((a,b) => a+b), 3);
  assert.equal(pixels.up.reduce((a,b) => a+b), 3);
  assert.notDeepEqual(pixels.rows(pixels.down,3), pixels.rows(pixels.up,3));
});
test('交换黑白对角线仍平均为 127.5，取整后同为 128，原数组不变', () => {
  for (const values of [pixels.checker, pixels.inverse]) {
    const before = [...values];
    assert.equal(pixels.mean(values), 127.5);
    assert.equal(pixels.shrink(values), 128);
    assert.deepEqual(values, before);
  }
  assert.notDeepEqual(pixels.checker, pixels.inverse);
});
test('同样九个像素，单通道为 9 个值，RGB 为 27 个值', () => {
  assert.equal(pixels.channelCount(3,3,1), 9);
  assert.equal(pixels.channelCount(3,3,3), 27);
});
const residual = require('../stage/residual.cjs');
test('修正为 1、0、负 1 时，同一组输入分别增加、保持和减少 1', () => {
  for (const amount of [1,0,-1]) {
    const rows = residual.constant(amount);
    assert.deepEqual(rows.map(r=>r.input), [10,20,30]);
    assert.deepEqual(rows.map(r=>r.correction), [amount,amount,amount]);
    assert.deepEqual(rows.map(r=>r.output), [10+amount,20+amount,30+amount]);
  }
});
test('F 为半倍输入时，两路变化 0.1 和 0.05 相加得到 0.15', () => {
  assert.deepEqual(residual.point(2), {input:2,correction:1,output:3});
  const result = residual.change(2,.1);
  near(result.after.correction,1.05); near(result.after.output,3.15);
  near(result.deltaInput,.1); near(result.deltaF,.05); near(result.deltaOutput,.15);
  near(result.deltaInput+result.deltaF,result.deltaOutput);
});
test('两路线性变化率相加；负一倍分支使输出与变化率抵消为零', () => {
  near(residual.change(2,.1,.5).rate,1.5);
  for (const x of [-10,0,2,2.1,30]) assert.equal(residual.point(x,-1).output,0);
  assert.equal(residual.change(2,.1,-1).deltaOutput,0);
  assert.equal(residual.change(2,.1,-1).rate,0);
});
test('形状匹配才能逐位相加，不广播、不修改原向量', () => {
  const input=[10,20,30], correction=[1,1,1];
  assert.deepEqual(residual.addMatching(input,correction), [11,21,31]);
  assert.deepEqual(input,[10,20,30]); assert.deepEqual(correction,[1,1,1]);
  for (const bad of [[1,1],[1],[],[1,1,NaN],[[1],[1],[1]]]) assert.throws(()=>residual.addMatching(input,bad),/形状匹配/);
});
test('残差算例拒绝非有限数，固定输入保持不可变', () => {
  for (const x of [Infinity,NaN,'2']) assert.throws(()=>residual.point(x),/有限数/);
  assert.throws(()=>residual.point(2,Infinity),/有限数/);
  assert.throws(()=>residual.change(2,NaN),/有限数/);
  assert.ok(Object.isFrozen(residual.inputs));
});
const recurrent = require('../stage/recurrent.cjs');
test('相同故事下，最新一句规则覆盖颜色，保留颜色规则不受天气覆盖', () => {
  assert.deepEqual(recurrent.trace('latest').map(r=>r.state), ['红伞','阴天','风']);
  assert.deepEqual(recurrent.trace('color').map(r=>r.state), ['红','红','红']);
});
test('换蓝伞后应更新颜色；永远保留第一次的红会得到不同记录', () => {
  const events=[...recurrent.story,recurrent.exchange];
  assert.equal(recurrent.trace('color',events).at(-1).state,'蓝');
  assert.equal(recurrent.trace('first',events).at(-1).state,'红');
  assert.deepEqual(recurrent.story.map(e=>e.text), ['带红伞','天转阴','刮起风']);
  assert.ok(Object.isFrozen(recurrent.story) && recurrent.story.every(Object.isFrozen));
});
test('简化状态更新同时计入旧状态保留量和新写入量', () => {
  assert.deepEqual(recurrent.update(2,.5,1), {previous:2,retain:.5,write:1,kept:1,next:2});
  near(recurrent.update(2,.9,1).kept,1.8);
  near(recurrent.update(2,.9,1).next,2.8);
  assert.equal(recurrent.update(2,0,1).next,1);
  assert.equal(recurrent.update(2,1,1).next,3);
});
test('无新写入时连续保留一半得到 2、1、0.5、0.25', () => {
  assert.deepEqual(recurrent.decay(2,.5), [2,1,.5,.25]);
  assert.deepEqual(recurrent.decay(2,1), [2,2,2,2]);
  assert.deepEqual(recurrent.decay(2,.5,0), [2]);
});
test('状态算例拒绝非法系数、非有限数、未知规则及过多步数', () => {
  for(const f of [-.1,1.1,NaN,Infinity,'0.5']) assert.throws(()=>recurrent.update(2,f,1),/有限数/);
  assert.throws(()=>recurrent.update(NaN,.5,1),/有限数/);
  assert.throws(()=>recurrent.update(2,.5,Infinity),/有限数/);
  assert.throws(()=>recurrent.trace('unknown'),/未知/);
  for(const n of [-1,.5,21]) assert.throws(()=>recurrent.decay(2,.5,n),/步数/);
});
const attention = require('../stage/attention.cjs');
test('固定信息 2 和 10，三组非负归一权重分别产生 4、8、6', () => {
  const expected=[['first',[1.5,2.5],4],['swapped',[.5,7.5],8],['equal',[1,5],6]];
  for (const [name,products,result] of expected) {
    const r=attention.trial(name);
    assert.deepEqual(r.values,[2,10]); assert.deepEqual(r.products,products); assert.equal(r.result,result);
    assert.equal(r.weights.reduce((a,b)=>a+b),1);
  }
});
test('加权组合逐项处理向量且不修改信息或权重', () => {
  const values=[[2,4],[10,8]], weights=[.75,.25];
  assert.deepEqual(attention.combine(values,weights),{products:[[1.5,3],[2.5,2]],result:[4,5]});
  assert.deepEqual(values,[[2,4],[10,8]]); assert.deepEqual(weights,[.75,.25]);
  assert.ok(Object.isFrozen(attention.values) && Object.isFrozen(attention.weights.first));
});
test('非负归一权重的组合始终处在原数的范围，端点权重也有效', () => {
  for(const w of [0,.1,.25,.5,.75,.9,1]) {
    const r=attention.combine([-4,12],[w,1-w]).result;
    assert.ok(r>=-4 && r<=12);
  }
  assert.equal(attention.combine([2,10],[1,0]).result,2);
  assert.equal(attention.combine([2,10],[0,1]).result,10);
});
test('加权计算拒绝负权重、非归一权重、非有限数与错形向量', () => {
  for(const w of [[-.1,1.1],[.5,.4],[NaN,1],[Infinity,0]]) assert.throws(()=>attention.combine([2,10],w),/权重/);
  for(const v of [[NaN,10],[[2,4],[10]],[[2,4],10],[2,[10,8]],['2',10]]) assert.throws(()=>attention.combine(v,[.5,.5]),/信息/);
  assert.throws(()=>attention.combine([],[]),/数量/);
  assert.throws(()=>attention.combine([2,10],[1]),/数量/);
  assert.throws(()=>attention.trial('unknown'),/未知/);
});
const generation = require('../stage/generation.cjs');
test('玩具贪心分两步接出读书和句号，并把新增片段接回上下文', () => {
  const r=generation.generate();
  assert.deepEqual(r.tokens,['我','读书','。']);
  assert.deepEqual(r.steps.map(s=>s.context),[['我'],['我','读书']]);
  assert.deepEqual(r.steps.map(s=>s.last),['我','读书']);
  assert.equal(r.probability,.6);
});
test('十张等机会卡片中六张读书四张画画，8 号画画、3 号读书', () => {
  assert.deepEqual(generation.tally(generation.tickets.map(t=>t.number)),{'读书':6,'画画':4});
  assert.deepEqual(generation.generate(['我'],{method:'ticket',number:8}).tokens,['我','画画','。']);
  assert.deepEqual(generation.generate(['我'],{method:'ticket',number:3}).tokens,['我','读书','。']);
  assert.equal(generation.generate(['我'],{method:'ticket',number:8}).probability,.4);
});
test('采样边界在 0.6 处切换，两条活动路线的下一片均为概率 1 的句号', () => {
  assert.equal(generation.sample('我',0).token,'读书');
  assert.equal(generation.sample('我',.599999).token,'读书');
  assert.equal(generation.sample('我',.6).token,'画画');
  assert.equal(generation.sample('我',.999999).token,'画画');
  for(const last of ['读书','画画']) assert.deepEqual(generation.candidates(last),[{token:'。',p:1}]);
});
test('玩具只查最后的我，两种更长前缀的贪心续写相同且不改原数组', () => {
  for(const context of [['打开书本','，','我'],['拿起画笔','，','我']]) {
    const before=[...context], r=generation.generate(context);
    assert.deepEqual(r.tokens.slice(context.length),['读书','。']);
    assert.deepEqual(context,before); assert.equal(r.steps[0].last,'我');
  }
  assert.ok(Object.isFrozen(generation.rules) && Object.isFrozen(generation.tickets));
});
test('预设的有放回抽取示意可出现七次或四次读书，六比四不是次数配额', () => {
  assert.deepEqual(generation.demonstrations.map(generation.tally),[{'读书':7,'画画':3},{'读书':4,'画画':6}]);
  assert.deepEqual(generation.generate(['我','读书','。']).steps,[]);
});
test('生成器拒绝错误卡号、采样值、选择方法与未知末片段', () => {
  for(const n of [0,11,2.5,NaN]) assert.throws(()=>generation.ticket(n),/卡号/);
  for(const roll of [-.1,1,NaN,Infinity,'0.5']) assert.throws(()=>generation.sample('我',roll),/抽取值/);
  assert.throws(()=>generation.generate(['我'],{method:'unknown'}),/未知/);
  assert.throws(()=>generation.generate(['我'],{method:'ticket',number:11}),/卡号/);
  assert.throws(()=>generation.generate(['未知']),/末片段/);
  assert.throws(()=>generation.generate([]),/前文/);
});
const windows = require('../stage/window.cjs');
test('同一竖线模板对竖线、黑点、横线、全黑分别响应 3、1、1、3', () => {
  assert.deepEqual([windows.vertical, windows.dot, windows.horizontal, windows.black].map(v => windows.response(v).score), [3,1,1,3]);
  assert.deepEqual(windows.response(windows.dot).products, windows.dot);
});
test('权重减半改变尺度，负权重手工模板能区分竖线和全黑', () => {
  assert.equal(windows.response(windows.vertical, windows.half).score, 1.5);
  assert.equal(windows.response(windows.dot, windows.half).score, .5);
  assert.equal(windows.response(windows.vertical, windows.contrast).score, 3);
  assert.equal(windows.response(windows.black, windows.contrast).score, -3);
});
test('步长 1 不补边恰好三窗，特征图高分随竖线移动', () => {
  const original = windows.slide(windows.lineImage(1), 5);
  const moved = windows.slide(windows.lineImage(2), 5);
  assert.deepEqual(original.map(w => w.left), [0,1,2]);
  assert.deepEqual(original.map(w => w.score), [3,0,0]);
  assert.deepEqual(moved.map(w => w.score), [0,3,0]);
  assert.deepEqual(original[0].patch, windows.vertical);
});
test('改变步长可能漏过高分，边缘的完整竖线也不保证高响应', () => {
  assert.deepEqual(windows.slide(windows.lineImage(1),5,windows.vertical,2).map(w => w.score), [3,0]);
  assert.deepEqual(windows.slide(windows.lineImage(2),5,windows.vertical,2).map(w => w.score), [0,0]);
  assert.deepEqual(windows.slide(windows.lineImage(0),5).map(w => w.score), [0,0,0]);
});
test('互相关不翻转模板，所有位置共用原权重且不改原图', () => {
  const image = Array.from({length:15}, (_,i) => i+1), before = [...image];
  const weights = [1,0,0,0,0,0,0,0,0], saved = [...weights];
  assert.deepEqual(windows.slide(image,5,weights).map(w => w.score), [1,2,3]);
  assert.deepEqual(image, before);
  assert.deepEqual(weights, saved);
  assert.ok(Object.isFrozen(windows.vertical));
});
test('滑窗拒绝错误尺寸、非有限数和非法步长', () => {
  assert.throws(() => windows.response([1,2,3]), /尺寸/);
  assert.throws(() => windows.response(Array(9).fill(Infinity)), /有限/);
  for (const stride of [0,1.5,NaN]) assert.throws(() => windows.slide(windows.lineImage(1),5,windows.vertical,stride), /步长/);
  assert.throws(() => windows.slide([1,2,3],5), /尺寸/);
});
const parameter = require('../stage/parameter.cjs');
test('固定输入与目标时，b 从 0 到 3 的预测、逐题误差和总损失正确', () => {
  const expected = [
    [[1,2,3], [2,2,2], 6], [[2,3,4], [1,1,1], 3],
    [[3,4,5], [0,0,0], 0], [[4,5,6], [1,1,1], 3]
  ];
  expected.forEach(([predictions, errors, loss], b) => {
    const result = parameter.trial(b);
    assert.deepEqual(result.rows.map(r => r.prediction), predictions);
    assert.deepEqual(result.rows.map(r => r.error), errors);
    assert.equal(result.loss, loss);
    assert.deepEqual(result.rows.map(r => r.input), [1,2,3]);
    assert.deepEqual(result.rows.map(r => r.target), [3,4,5]);
  });
});
test('改成预测值作为目标虽得零损失，但没有完成原任务，原数据不变', () => {
  assert.equal(parameter.trial(0, parameter.inputs).loss, 0);
  assert.equal(parameter.trial(0).loss, 6);
  assert.deepEqual(parameter.targets, [3,4,5]);
  assert.ok(Object.isFrozen(parameter.inputs) && Object.isFrozen(parameter.targets));
});
test('确定参数后可计算新输入，但不改变训练目标', () => {
  assert.equal(parameter.predict(4,2), 6);
  assert.deepEqual(parameter.trial(2).rows.map(r => r.target), [3,4,5]);
});
test('手动试数支持有限小数，拒绝无效参数和目标', () => {
  assert.equal(parameter.trial(1.5).loss, 1.5);
  for (const b of [NaN, Infinity, '2']) assert.throws(() => parameter.trial(b), /有限数/);
  for (const answers of [[3,4], [3,4,NaN]]) assert.throws(() => parameter.trial(2,answers), /目标/);
});
const decoder=require('../stage/decoder.cjs');
test('因果遮罩只允许自身和前文，拒绝非法尺寸',()=>{
  assert.deepEqual(decoder.mask(),[[true,false,false],[true,true,false],[true,true,true]]);
  for(const n of [0,17,1.5,NaN]) assert.throws(()=>decoder.mask(n),/尺寸/);
});
test('每行目标向后偏移一片，可读取前缀严格受限',()=>{
  const rows=decoder.trainingRows();
  assert.deepEqual(rows.map(r=>r.target),['下雨','了','。']);
  assert.deepEqual(rows.map(r=>r.readable),[['今天'],['今天','下雨'],['今天','下雨','了']]);
  rows.forEach((r,i)=>assert.deepEqual(r.allowed.map((v,j)=>v?j:-1).filter(j=>j>=0),Array.from({length:i+1},(_,j)=>j)));
  assert.throws(()=>decoder.trainingRows(['今天']),/序列/);
  assert.throws(()=>decoder.trainingRows(['今天','']),/序列/);
});
test('词向量与位置向量逐项相加，编号只作索引且原记录不变',()=>{
  assert.deepEqual(decoder.representation(0).combined,[.2,.5]);
  decoder.representation(1).combined.forEach((v,i)=>near(v,[.7,-.2][i]));
  assert.deepEqual(decoder.entries[0].embedding,[.2,.4]);
  assert.equal(decoder.representation(0).id,17);
  assert.ok(Object.isFrozen(decoder.entries[0].embedding));
  assert.throws(()=>decoder.representation(2),/位置/);
});
test('两轮人为分布均归一，贪心依次接了和句号再停止',()=>{
  const trace=decoder.generation();
  trace.forEach(r=>near(r.candidates.reduce((s,v)=>s+v.p,0),1));
  assert.deepEqual(trace.map(r=>r.next),['了','。']);
  assert.deepEqual(trace.map(r=>r.stop),[false,true]);
  assert.deepEqual(trace[1].before,trace[0].after);
  assert.deepEqual(trace[1].after,['今天','下雨','了','。']);
});
test('换选吗产生另一上下文，接回片段不修改原数组',()=>{
  const before=['今天','下雨'];
  assert.deepEqual(decoder.append(before,'吗'),['今天','下雨','吗']);
  assert.deepEqual(before,['今天','下雨']);
  for(const args of [[[],'了'],[before,''],[[1],'了']]) assert.throws(()=>decoder.append(...args),/文字/);
});
const relations=require('../stage/relations.cjs');
test('交换排列保留同一对象清单及颜色形状，冻结原始记录',()=>{
  const a=relations.arrangements;
  assert.deepEqual(relations.inventory(a.first),relations.inventory(a.swapped));
  assert.deepEqual(relations.objects.map(o=>[o.id,o.color,o.shape]),[['red','红','圆'],['blue','蓝','方'],['green','绿','三角']]);
  assert.ok(Object.isFrozen(a.first)&&Object.isFrozen(a.swapped)&&relations.objects.every(Object.isFrozen));
});
test('蓝方左侧由1变2，改问右侧与换目标都重新计数',()=>{
  const a=relations.arrangements;
  assert.equal(relations.count(a.first,'blue'),1);assert.equal(relations.count(a.swapped,'blue'),2);
  assert.equal(relations.count(a.swapped,'blue','right'),0);assert.equal(relations.count(a.swapped,'green','right'),1);
  assert.equal(relations.count(a.swapped,'red'),0);
});
test('完整左关系包含不相邻边，没有反向边和自身边',()=>{
  const edges=relations.edges(relations.arrangements.first);
  assert.deepEqual(edges,[{from:'red',to:'blue'},{from:'red',to:'green'},{from:'blue',to:'green'}]);
  assert.ok(!edges.some(e=>e.from===e.to||e.from==='blue'&&e.to==='red'));
});
test('全部六种排列的入边出边数都等于对应左右计数',()=>{
  const ids=['red','blue','green'];
  for(const a of ids)for(const b of ids.filter(v=>v!==a)){
    const order=[a,b,ids.find(v=>v!==a&&v!==b)],edges=relations.edges(order);
    for(const target of ids){
      assert.equal(edges.filter(e=>e.to===target).length,relations.count(order,target));
      assert.equal(edges.filter(e=>e.from===target).length,relations.count(order,target,'right'));
      assert.equal(relations.count(order,target)+relations.count(order,target,'right'),2);
    }
  }
});
test('手工逐对象比较汇总为2，自身不在自身左侧',()=>{
  const rows=relations.comparisons(relations.arrangements.swapped);
  assert.deepEqual(rows.map(r=>[r.id,r.contributes]),[['red',true],['green',true],['blue',false]]);
  assert.equal(rows.reduce((s,r)=>s+Number(r.contributes),0),2);
  assert.deepEqual(relations.comparisons(relations.arrangements.swapped,'green','right').filter(r=>r.contributes).map(r=>r.id),['blue']);
});
test('同一顺序可以对应不同坐标间隔，输出与传入数据均不共享可变状态',()=>{
  const order=[...relations.arrangements.first],xs=[0,1,2];
  const near=relations.positions(order,xs),far=relations.positions(order,[0,10,20]);
  assert.deepEqual(near.map(o=>o.id),far.map(o=>o.id));
  assert.notEqual(near[2].x-near[1].x,far[2].x-far[1].x);
  near[0].id='changed';relations.inventory(order)[0].color='changed';relations.edges(order)[0].to='changed';
  assert.deepEqual(xs,[0,1,2]);assert.deepEqual(order,['red','blue','green']);
  assert.equal(relations.positions(order)[0].id,'red');assert.equal(relations.objects[0].color,'红');
});
test('拒绝缺失重复对象、非法目标方向与无效坐标，不隐式补全或排序',()=>{
  const order=relations.arrangements.first;
  for(const bad of [null,[],['red','blue'],['red','blue','blue'],['red','blue','other'],Array(3)])assert.throws(()=>relations.edges(bad),/排列/);
  assert.throws(()=>relations.count(order,'other'),/目标/);
  assert.throws(()=>relations.comparisons(order,'blue','up'),/方向/);
  assert.throws(()=>relations.count(order,'blue','up'),/方向/);
  for(const xs of [null,[],[0,1],[0,0,2],[2,1,0],[0,NaN,2],[0,1,Infinity],Array(3)])assert.throws(()=>relations.positions(order,xs),/坐标/);
});
const coding=require('../stage/coding.cjs');
test('直接记录、重复规则和单例外均按字符计费并恢复完整原串',()=>{
  assert.deepEqual(['LABABABAB','R4AB','R4AB8C'].map(c=>[coding.decode(c),coding.inspect(c).length]),[['ABABABAB',9],['ABABABAB',4],['ABABABAC',6]]);
  assert.equal(coding.literal('ABABABAC'),'LABABABAC');
  assert.equal(coding.repeated(4,'AB',[{position:8,letter:'C'}]),'R4AB8C');
});
test('漏掉例外会恢复错误原串，三例外需10单位而直接模式为9',()=>{
  assert.notEqual(coding.decode('R4AB'),'ABABABAC');
  const c=coding.inspect('R4AB2C3B5C');
  assert.equal(c.decoded,'ACBBCBAB');assert.equal(c.length,10);
  assert.equal(coding.literal(c.decoded).length,9);
  assert.equal(coding.compare(c.decoded).minLength,9);
});
test('自查R3AB6C展开为ABABAC，总长6且只省1单位',()=>{
  const r=coding.inspect('R3AB6C');
  assert.equal(r.decoded,'ABABAC');assert.equal(r.length,6);
  assert.equal(r.ruleLength,4);assert.equal(r.remainderLength,2);
  assert.equal(coding.literal(r.decoded).length-r.length,1);
});
test('有限候选保留全部并列最短写法，不把候选最短称为所有程序最短',()=>{
  const r=coding.compare('AB');
  assert.deepEqual(r.best,['LAB']);assert.equal(r.candidates.length,10);
  assert.deepEqual(coding.compare('ABABABAC').best,['R4AB8C']);
  const tie=coding.compare('AAAABABA');
  assert.equal(tie.minLength,8);
  assert.deepEqual(tie.best,['R4AA5B7B','R4BA1A3A']);
  assert.equal(coding.compare('ABC').candidates.length,1);
});
test('所有长度0至8的ABC原串在每个候选中均往返一致，长度两部分之和正确',()=>{
  let total=0;
  function visit(source) {
    const r=coding.compare(source);
    r.candidates.forEach(c=>{assert.equal(coding.decode(c.code),source);assert.equal(c.length,c.ruleLength+c.remainderLength);total++;});
    if(source.length<8) for(const c of 'ABC')visit(source+c);
  }
  visit('');assert.equal(total,76261);
});
test('非法模式、次数、块、例外位置与重复修改均被拒绝',()=>{
  for(const code of [null,123,'','X','R0AB','R5AB','R4A','R4AB8C8A','R3AB7C','R4AB8','R4AB0C','LAD','LABCAB C','LABABABABA','LAB'+String.fromCharCode(10),'R4AB'+String.fromCharCode(10)]) assert.throws(()=>coding.decode(code));
  for(const args of [[0,'AB'],[1.5,'AB'],[4,'ABC'],[4,'AB',[{position:0,letter:'C'}]],[4,'AB',[{position:8,letter:'CC'}]],[4,'AB',Array(1)]]) assert.throws(()=>coding.repeated(...args));
});
test('例外记录和比较结果不修改调用方数据，也不在调用间共享结果',()=>{
  const changes=[{position:8,letter:'C'}];coding.repeated(4,'AB',changes);
  assert.deepEqual(changes,[{position:8,letter:'C'}]);
  const r=coding.compare('ABABABAC');r.candidates[0].decoded='C';r.best[0]='X';
  assert.deepEqual(coding.compare('ABABABAC').best,['R4AB8C']);
});
const selection=require('../stage/selection.cjs');
test('预算与时限筛选后优先答对数，缩短时限会改变方案',()=>{
  assert.deepEqual(selection.evaluate().feasible,['A','B']);
  assert.equal(selection.evaluate().best,'B');
  const fast=selection.evaluate(selection.scenarios.fast);
  assert.deepEqual(fast.feasible,['A']); assert.equal(fast.best,'A');
});
test('所有条件同时成立才合格，无解不放宽约束',()=>{
  const r=selection.evaluate(selection.scenarios.challenge);
  assert.deepEqual(r.feasible,[]); assert.equal(r.best,null);
  assert.deepEqual(r.rows.map(c=>c.failed),[['题数不足'],['题数不足'],['超时']]);
  assert.deepEqual(r.limits,{budget:6,seconds:5,minCorrect:91});
});
test('成本时限题数包括等号，失败原因可以同时出现',()=>{
  assert.deepEqual(selection.evaluate({budget:3,seconds:4,minCorrect:90}).feasible,['B']);
  assert.deepEqual(selection.evaluate({budget:6,seconds:8,minCorrect:92}).feasible,['C']);
  assert.deepEqual(selection.evaluate({budget:0,seconds:0,minCorrect:100}).rows[0].failed,['超预算','超时','题数不足']);
});
test('B到C差值和反向差值正确，返回副本不改原数据',()=>{
  assert.deepEqual(selection.delta(),{correct:2,seconds:4,cost:3});
  assert.deepEqual(selection.delta('C','B'),{correct:-2,seconds:-4,cost:-3});
  const r=selection.evaluate(); r.rows[0].correct=0; r.limits.budget=999;
  assert.equal(selection.candidates[0].correct,80); assert.equal(selection.scenarios.standard.budget,3);
  assert.ok(Object.isFrozen(selection.candidates[0]));
  assert.throws(()=>selection.delta('D'),/未知方案/);
});
test('筛选拒绝无效条件',()=>{
  for(const limits of [null,{},...[-1,Infinity,NaN,'3'].map(budget=>({budget,seconds:5,minCorrect:0})),...[-1,Infinity,NaN,'5'].map(seconds=>({budget:3,seconds,minCorrect:0})),...[-1,101,1.5,'90'].map(minCorrect=>({budget:3,seconds:5,minCorrect}))]) assert.throws(()=>selection.evaluate(limits),/条件/);
});
test('论文结果与虚构方案分开，并保留比较条件',()=>{
  const r=selection.research;
  assert.deepEqual(r.models.map(m=>[m.name,m.parametersYi,m.accuracy]),[['Chinchilla',700,67.6],['Gopher',2800,60]]);
  assert.deepEqual(r.conditions,{benchmark:'MMLU',tasks:57,shots:5,compute:'近似相同训练计算预算',source:'表 6'});
  assert.ok(r.models.every(m=>m.training.length>0 && Object.isFrozen(m)));
});
test('前向流水各小批依次经过三段，返回矩阵互不共享',()=>{
  const rows=selection.forwardSchedule();
  assert.equal(rows.length,3); assert.ok(rows.every(r=>r.length===5));
  rows.forEach(r=>assert.deepEqual(r.filter(v=>v!==null),[0,1,2]));
  for(let b=0;b<3;b++) assert.deepEqual(rows.map(r=>r.indexOf(b)),[b,b+1,b+2]);
  rows[0][0]=99; assert.equal(selection.forwardSchedule()[0][0],0);
});
const storage=require('../stage/storage.cjs');
test('五格依次写入红蓝黄，第四五格为空且原数组不变',()=>{
  const d=storage.demonstration();
  assert.deepEqual(d.red,['红',null,null,null,null]);
  assert.deepEqual(d.blue,['红','蓝',null,null,null]);
  assert.deepEqual(d.written,['红','蓝','黄',null,null]);
  assert.deepEqual(storage.initial,[null,null,null,null,null]);
  assert.ok(Object.isFrozen(storage.initial));
});
test('读取不取走内容，读空格得到空值',()=>{
  const d=storage.demonstration(),before=[...d.written];
  assert.equal(storage.read(d.written,2),'蓝');
  assert.equal(storage.read(d.written,2),'蓝');
  assert.equal(storage.read(d.written,4),null);
  assert.deepEqual(d.written,before);
});
test('覆盖只改第2格，先读3再读2得到黄绿而没有留下旧蓝',()=>{
  const d=storage.demonstration();
  assert.deepEqual(d.overwritten,['红','绿','黄',null,null]);
  assert.equal(d.first,'蓝'); assert.equal(d.second,'绿'); assert.equal(d.wrong,'黄');
  assert.deepEqual(d.requests,[{address:3,value:'黄'},{address:2,value:'绿'}]);
  assert.equal(d.written[1],'蓝');
  assert.ok(!d.overwritten.includes('蓝'));
});
test('加权读取组合为4，既不是2也不是10，逐项乘积可核对',()=>{
  const d=storage.weightedRead();
  assert.deepEqual(d.values,[2,10]);assert.deepEqual(d.weights,[.75,.25]);
  assert.deepEqual(d.products,[1.5,2.5]);assert.equal(d.result,4);
  assert.ok(!d.values.includes(d.result));
});
test('五格存储拒绝非法地址、形状与内容，不隐式扩容或换格',()=>{
  for(const n of [0,6,1.5,NaN,'2']) {
    assert.throws(()=>storage.read(storage.initial,n),/格号/);
    assert.throws(()=>storage.write(storage.initial,n,'绿'),/格号/);
  }
  for(const memory of [[],[null,null],Array(5),[1,null,null,null,null]]) assert.throws(()=>storage.read(memory,1),/存储/);
  for(const v of ['',null,1]) assert.throws(()=>storage.write(storage.initial,2,v),/内容/);
});

const evidence=require('../stage/evidence.cjs');
test('同一主张在适用公告中区分支持、矛盾和未说明',()=>{
  const claim=evidence.claims[0];
  assert.deepEqual(['open','closed','weekday'].map(id=>evidence.assess(evidence.sources[id],claim)),['supports','contradicts','unknown']);
});
test('未知不是相反事实，预约两种主张都不能从空白推断',()=>{
  const claim=evidence.claims[2];
  assert.equal(evidence.assess(evidence.sources.timed,claim),'unknown');
  assert.equal(evidence.assess(evidence.sources.timed,{...claim,value:true}),'unknown');
  assert.equal(evidence.assess({...evidence.scope,facts:{reservationRequired:false}},claim),'supports');
  assert.equal(evidence.assess({...evidence.scope,facts:{reservationRequired:true}},claim),'contradicts');
});
test('逐句判断不把开放公告当成整段答案的保证',()=>{
  assert.deepEqual(evidence.claims.map(c=>evidence.assess(evidence.sources.timed,c)),['supports','contradicts','unknown']);
  assert.equal(evidence.assess(evidence.sources.timed,{...evidence.claims[1],value:18}),'supports');
});
test('学校或适用期不符时不把碰巧相同的文字判为支持或矛盾',()=>{
  for(const change of [{school:'另一所学校'},{period:'去年'}]){
    for(const source of [evidence.sources.open,evidence.sources.closed])assert.equal(evidence.assess({...source,...change},evidence.claims[0]),'inapplicable');
  }
});
test('分组题数加权后总分90%，两组分别100%和0%，不平均百分比',()=>{
  const s=evidence.summarize(evidence.groups);
  assert.deepEqual([s.total,s.correct,s.rate],[100,90,.9]);
  assert.deepEqual(s.groups.map(g=>[g.total,g.correct,g.rate]),[[90,90,1],[10,0,0]]);
  const split=evidence.summarize([{label:'甲',total:45,correct:45},{label:'乙',total:45,correct:45},evidence.groups[1]]);
  assert.equal(split.rate,s.rate);
  assert.equal(evidence.summarize([...evidence.groups].reverse()).rate,s.rate);
  assert.equal(evidence.summarize([{label:'空组',total:0,correct:0}]).rate,null);
});
test('构造事实与成绩冻结，计算输出不修改或共享原始记录',()=>{
  assert.ok(Object.isFrozen(evidence.sources.timed.facts)&&evidence.claims.every(Object.isFrozen)&&evidence.groups.every(Object.isFrozen));
  const input=[{label:'一组',total:3,correct:2}],before=JSON.stringify(input),out=evidence.summarize(input);
  assert.equal(out.rate,2/3);out.groups[0].correct=0;
  assert.equal(JSON.stringify(input),before);assert.equal(evidence.groups[0].correct,90);
});
test('缺失范围、非法字段值与无效题数会报错，不补事实或截断数值',()=>{
  for(const change of [{school:''},{period:null}])assert.throws(()=>evidence.assess({...evidence.sources.open,...change},evidence.claims[0]),/学校与适用期/);
  for(const facts of [null,[],{sundayOpen:'true'},{reservationRequired:0},{closeHour:25},{closeHour:18.5},{unknown:true}])assert.throws(()=>evidence.assess({...evidence.scope,facts},evidence.claims[0]),/事实/);
  assert.throws(()=>evidence.assess(evidence.sources.open,{...evidence.claims[0],value:'true'}),/事实/);
  for(const records of [[],null,Array(1),[{label:'',total:1,correct:1}],[{label:'错',total:1,correct:2}],[{label:'负',total:-1,correct:0}],[{label:'小数',total:1.5,correct:1}],[{label:'布尔',total:true,correct:1}],[{label:'无穷',total:Infinity,correct:1}],[{label:'大',total:Number.MAX_SAFE_INTEGER,correct:1},{label:'加',total:1,correct:0}]])assert.throws(()=>evidence.summarize(records),/分组|题数|合计/);
});

const campus=require('../stage/campus.cjs');
test('校园纸面规则将五个问题分别送到开放、闭馆、缺证据和越界',()=>{
  assert.deepEqual(campus.cases.map(q=>campus.decide(q).status),['open','closed','insufficient','insufficient','refuse']);
  assert.deepEqual(campus.cases.slice(2,4).map(q=>campus.decide(q).reason),['缺少检修期间通知','缺少明年安排']);
});
test('常规时段按工作日12点含、18点不含判断，遍历整周整点',()=>{
  for(let day=1;day<=7;day++)for(let hour=0;hour<24;hour++){
    const r=campus.decide({...campus.cases[0],day,hour});
    assert.equal(r.status,day<=5&&hour>=12&&hour<18?'open':'closed');
    assert.equal(r.citation.id,'D1');
  }
  assert.equal(campus.decide(campus.exercise).status,'closed');
});
test('临时检修不被常规时间覆盖，明年与节假日不外推',()=>{
  for(const day of [2,7])for(const hour of [11,15,19]){
    assert.equal(campus.decide({...campus.cases[0],day,hour,temporary:true}).status,'insufficient');
    assert.equal(campus.decide({...campus.cases[0],day,hour,holiday:true}).status,'insufficient');
    assert.equal(campus.decide({...campus.cases[0],day,hour,period:'next'}).status,'insufficient');
  }
});
test('范围外与含糊请求先停止或澄清，不触发D1取回',()=>{
  for(const [q,status] of [[{kind:'private'},'refuse'],[{kind:'ambiguous'},'clarify'],[{kind:'public',period:'unknown'},'clarify']]){
    const r=campus.decide(q);assert.equal(r.status,status);assert.deepEqual(r.trace,['范围检查']);assert.equal(r.citation,undefined);
  }
});
test('有依据的开放与闭馆均附标题、发布者、适用期和原句',()=>{
  for(const q of [campus.cases[0],campus.cases[1],campus.exercise]){
    const r=campus.decide(q);
    assert.deepEqual(r.citation,{id:'D1',title:campus.document.title,publisher:'图书馆',period:'本学期',quote:campus.document.quote});
    assert.deepEqual(r.trace,['范围检查','取回 D1','核对适用期','检查临时条件','比较星期与时段','附上依据']);
  }
  for(const q of campus.cases.slice(2))assert.equal(campus.decide(q).citation,undefined);
});
test('规则输入、公告冻结，输出轨迹与引用不共享可变对象',()=>{
  assert.ok(Object.isFrozen(campus.document)&&Object.isFrozen(campus.cases)&&campus.cases.every(Object.isFrozen));
  const q={...campus.cases[0]},before=JSON.stringify(q),a=campus.decide(q);a.trace.push('改动');a.citation.quote='改动';
  assert.equal(JSON.stringify(q),before);assert.equal(campus.decide(q).trace.length,6);assert.equal(campus.decide(q).citation.quote,campus.document.quote);
});
test('校园规则拒绝无效标注，不猜星期、时间或临时条件',()=>{
  for(const q of [null,{},'周二三点开门吗',{kind:'other'}])assert.throws(()=>campus.decide(q),/范围/);
  for(const change of [{period:'去年'},{day:0},{day:8},{day:true},{day:2.5},{hour:24},{hour:-1},{hour:15.5},{hour:true},{hour:NaN},{temporary:undefined},{temporary:'false'},{holiday:0}])assert.throws(()=>campus.decide({...campus.cases[0],...change}),/适用期|标注/);
});

/* 字幕只读可见文字；原链接仍由全文和各篇入口保留。 */
test('正文链接的显示文字进入字幕，URL中的问号句号不参与切句',()=>{
  const u=parseUnits('# 标题\n\n看 [实验](../../lab/README.md?q=为什么？) 和 [结果](../../result.json)。下一句。','link');
  assert.deepEqual(u,[{type:'h1',text:'标题'},{type:'p',text:'看 实验 和 结果。'},{type:'p',text:'下一句。'}]);
  const result=assemble(u,{complete:true,beats:u.map(x=>({take:1,from:x.text}))},'link');
  assert.equal(result.beats[1].html,'看 实验 和 结果。');
});
test('行内代码、标识符和脚注的可见内容保留，不输出Markdown定界符',()=>{
  const tick=String.fromCharCode(96);
  const u=parseUnits('检查 '+tick+'tool_error'+tick+'，再看 search_announcements。〔1〕','inline');
  assert.deepEqual(u,[{type:'p',text:'检查 tool_error，再看 search_announcements。〔1〕'}]);
  assert.deepEqual(parseUnits(tick+']('+tick+'。','inline'),[{type:'p',text:'](。'}]);
  assert.match(assemble(u,{complete:true,beats:[{take:1,from:'检查'}]},'inline').beats[0].html,/tool_error.*<span class="cite">〔1〕<\/span>/);
});
test('链接显示文字中的问句和标签后的引号按现有边界完整消费',()=>{
  const u=parseUnits('看 [为什么？这样做。](https://example.org/a_(b))“继续。”','inline');
  assert.deepEqual(u.map(x=>x.text),['看 为什么？','这样做。','“继续。”']);
  assert.throws(()=>parseUnits('看 [未完成](地址','bad'),/Markdown/);
});
test('不支持的强调和图片混排仍报错，HTML可见文字在字幕中转义',()=>{
  for(const text of ['看 *强调*。','看 **加粗**。','看 _强调_。','看 ![图](a.png)。'])assert.throws(()=>parseUnits(text,'bad'),/Markdown/);
  const u=parseUnits('看 [<script>alert(1)</script>](https://example.org)。','inline');
  const html=assemble(u,{complete:true,beats:[{take:1,from:'看'}]},'inline').beats[0].html;
  assert.ok(html.includes('&lt;script&gt;')&&!html.includes('<script>'));
});
test('前16篇生成物在扩展字幕解析后仍逐字节一致',()=>{
  const {compileOne}=require('../render_stage.cjs');
  const root=path.join(__dirname,'../../青少年AI科普连载');
  for(const folder of fs.readdirSync(root).filter(n=>/^(0[1-9]|1[0-6])_/.test(n)))assert.equal(compileOne(folder).html,fs.readFileSync(path.join(root,folder,'互动版.html'),'utf8'),folder);
});
const records=require('../stage/tool-records.cjs');
test('配套四份记录分别是有材料、零匹配、未执行与故障',()=>{
  assert.deepEqual(records.cases.map(c=>records.summarize(c.event)),[
    {id:'Q1',executed:true,status:'ok',matches:1,outcome:'found'},
    {id:'Q2',executed:true,status:'ok',matches:0,outcome:'empty'},
    {id:'Q3',executed:false,status:'invalid_args',matches:null,outcome:'invalid'},
    {id:'Q4',executed:true,status:'tool_error',matches:null,outcome:'failed'}]);
});
test('画面使用的记录完整保留配套JSON中的请求、结果与回答',()=>{
  const saved=JSON.parse(fs.readFileSync(path.join(__dirname,'../../Python实现/source/campus_agent_lab/outputs/reference/episode17/result.json'),'utf8'));
  assert.deepEqual(records.cases,saved.cases);
  const c=records.cases[0];assert.equal(c.event.args.facility,c.event.result[0].facility);assert.equal(c.event.args.period,c.event.result[0].period);assert.equal(c.event.result[0].publisher,'图书馆');
});
test('空列表是正常完成；读取失败不伪造零份结果',()=>{
  assert.equal(records.summarize(records.cases[1].event).status,'ok');
  assert.equal(records.summarize(records.cases[1].event).matches,0);
  assert.equal(records.summarize(records.cases[3].event).matches,null);
  const unknown={...records.cases[2].event,status:'unknown_tool',tool:'查全部资料',result:'工具不存在'};
  assert.deepEqual(records.summarize(unknown),{id:'Q3',executed:false,status:'unknown_tool',matches:null,outcome:'invalid'});
});
test('取回公告不代表覆盖问题条件，记录摘要不判断答案正确性',()=>{
  const event=JSON.parse(JSON.stringify(records.cases[0].event));event.result[0].period='别的时期';
  assert.equal(records.summarize(event).outcome,'found');
  assert.ok(!Object.hasOwn(records.summarize(event),'answerCorrect'));
});
test('记录冻结，摘要与调用方均不改写保存的执行事实',()=>{
  assert.ok(Object.isFrozen(records.cases)&&Object.isFrozen(records.cases[0].event.args)&&Object.isFrozen(records.cases[0].event.result[0]));
  const event=JSON.parse(JSON.stringify(records.cases[0].event)),before=JSON.stringify(event),out=records.summarize(event);out.matches=99;
  assert.equal(JSON.stringify(event),before);assert.equal(records.summarize(event).matches,1);
});
test('无效记录与互相矛盾的执行状态会报错，不补全事实',()=>{
  const good=records.cases[0].event;
  for(const e of [null,{}, {...good,request_id:''},{...good,args:[]},{...good,executed:1},{...good,executed:false},{...good,result:null},{...good,result:Array(1)},{...good,result:[{doc_id:'D1'}]}, {...records.cases[2].event,executed:true},{...records.cases[3].event,executed:false},{...records.cases[3].event,result:[]},{...good,status:'other'}])assert.throws(()=>records.summarize(e),/记录|状态/);
});
const venueRecords=require('../stage/venue-records.cjs');
test('场地四条已保存路线保留状态、请求数和实际执行数',()=>{
  assert.deepEqual(venueRecords.cases.map(venueRecords.summarize),[
    {name:'success',status:'suggested',requests:2,calls:2,blocked:[]},
    {name:'missing_equipment',status:'insufficient_evidence',requests:2,calls:2,blocked:[]},
    {name:'repeated_call',status:'blocked_repeat',requests:2,calls:1,blocked:['Q2']},
    {name:'step_limit',status:'blocked_step_limit',requests:2,calls:1,blocked:['Q2']}]);
  const source=JSON.parse(fs.readFileSync(path.join(__dirname,'../../Python实现/source/campus_agent_lab/outputs/reference/episode18/result.json'),'utf8'));
  assert.deepEqual(venueRecords.cases,source.cases);
});
test('第二次用第一次返回的V1查详情，建议同时连着S1与E1',()=>{
  const r=venueRecords.cases[0],v=r.trace[0].result[0];
  assert.equal(r.trace[1].args.venue_id,v.venue_id);
  assert.equal(r.suggestion.hours_source,v.hours_source);
  assert.equal(r.suggestion.details_source,r.trace[1].result.source);
  assert.deepEqual(venueRecords.evidence(r,'V1'),{period:true,time:true,equipment:true,ramp:true,hoursSource:'S1',detailsSource:'E1'});
  assert.deepEqual(venueRecords.evidence(r,'V1',1),{period:true,time:true,equipment:null,ramp:null,hoursSource:'S1',detailsSource:null});
  assert.equal(venueRecords.evidence(r,'V1',0).time,null);
  assert.throws(()=>venueRecords.evidence(r,'V1',3),/范围/);
  assert.equal(r.action_scope,'仅建议；没有预约工具，也不执行预约');
  assert.ok(venueRecords.cases.every(c=>c.trace.every(e=>['search_venues','read_details'].includes(e.tool))));
});
test('设备未知与没有设备分开，未查V2不能判为全部不合格',()=>{
  const r=venueRecords.cases[1];
  assert.deepEqual(venueRecords.evidence(r,'V1'),{period:true,time:true,equipment:null,ramp:true,hoursSource:'S1',detailsSource:'E1'});
  assert.deepEqual(venueRecords.evidence(r,'V2'),{period:true,time:true,equipment:null,ramp:null,hoursSource:'S2',detailsSource:null});
  const no=JSON.parse(JSON.stringify(r));no.trace[1].result.equipment=[];
  assert.equal(venueRecords.evidence(no,'V1').equipment,false);
  no.trace[1].result.conflict=true;
  assert.equal(venueRecords.evidence(no,'V1').ramp,null);
});
test('重复与上限被拦都只执行一次，设备与坡道仍未知',()=>{
  for(const r of venueRecords.cases.slice(2)){
    assert.equal(r.trace[1].executed,false);
    assert.equal(venueRecords.summarize(r).calls,1);
    assert.equal(venueRecords.evidence(r,'V1').equipment,null);
    assert.equal(venueRecords.evidence(r,'V1').ramp,null);
    assert.equal(r.suggestion,null);
  }
  assert.deepEqual(venueRecords.cases[2].trace[0].args,venueRecords.cases[2].trace[1].args);
});
test('时期、时间、设备与坡道逐项比较，不互相代替',()=>{
  const original=venueRecords.cases[0];
  for(const [key,value,field] of [['period','明年','period'],['day','周三','time'],['start',14,'time'],['end',18,'time'],['equipment','音响','equipment']]){
    const r=JSON.parse(JSON.stringify(original));r.task[key]=value;
    assert.equal(venueRecords.evidence(r,'V1')[field],false);
  }
  const r=JSON.parse(JSON.stringify(original));r.task.end=17;
  assert.equal(venueRecords.evidence(r,'V1').time,true);
  r.trace[1].result.ramp=false;
  assert.equal(venueRecords.evidence(r,'V1').ramp,false);
  assert.equal(venueRecords.evidence(r,'V1').equipment,true);
});
test('场地记录深层冻结，摘要与条件核对不修改记录',()=>{
  assert.ok(Object.isFrozen(venueRecords.cases[0].trace[0].result[0]));
  assert.ok(Object.isFrozen(venueRecords.cases[0].task));
  const r=JSON.parse(JSON.stringify(venueRecords.cases[0])),before=JSON.stringify(r);
  const summary=venueRecords.summarize(r);summary.calls=99;
  const e=venueRecords.evidence(r,'V1');e.time=false;
  assert.equal(JSON.stringify(r),before);
  assert.equal(venueRecords.evidence(r,'V1').time,true);
});
test('不一致的执行数、状态和无效条件标注报错，不补造证据',()=>{
  const r=venueRecords.cases[0];
  for(const v of [null,{}, {...r,tool_calls:1},{...r,max_steps:1},{...r,status:'unknown'},{...r,status:'blocked_repeat'},{...r,suggestion:null},{...r,trace:[{...r.trace[0],executed:false}]}])assert.throws(()=>venueRecords.summarize(v),/记录|状态|次数/);
  for(const changes of [{start:true},{end:25},{start:16,end:15},{ramp:'有'}])assert.throws(()=>venueRecords.evidence({...r,task:{...r.task,...changes}},'V1'),/标注/);
});
const contextRecords=require('../stage/context-records.cjs');
test('五组输入对照与源记录一致，保留标志和字符数可复核',()=>{
  const saved=JSON.parse(fs.readFileSync(path.join(__dirname,'../../Python实现/source/campus_agent_lab/outputs/reference/episode19/result.json'),'utf8'));
  assert.deepEqual(contextRecords.originalCards,saved.original_cards);assert.deepEqual(contextRecords.comparisons,saved.comparisons);
  const inspected=contextRecords.comparisons.map(contextRecords.inspect);
  assert.deepEqual(inspected.map(r=>r.ids.length),[6,3,1,1,6]);
  assert.deepEqual(inspected.map(r=>r.characters),[83,58,50,37,83]);
  assert.deepEqual(inspected.map(r=>Object.values(r.present)),[[true,true,true,true],[false,false,false,true],[true,true,true,true],[false,true,true,true],[true,true,true,true]]);
});
test('全文、末三卡和按kind取回的顺序与保存输入逐卡一致',()=>{
  for(const mode of ['full','last_three','retrieve_requirements'])assert.deepEqual(contextRecords.select(contextRecords.originalCards,mode),contextRecords.comparisons.find(c=>c.mode===mode).input_cards);
  assert.deepEqual(contextRecords.select(contextRecords.originalCards,'last_three').map(c=>c.id),['C4','C5','C6']);
  assert.deepEqual(contextRecords.select(contextRecords.originalCards,'retrieve_requirements').map(c=>c.id),['C1','C2','C3','C6','C4','C5']);
});
test('场地有坡道不能替代硬要求，固定短语检查不冒充语义理解',()=>{
  const c=contextRecords.originalCards;
  assert.equal(contextRecords.checkPhrases(c[0].text).ramp_required,true);
  assert.equal(contextRecords.checkPhrases(c[3].text).ramp_required,false);
  assert.equal(contextRecords.checkPhrases('场地一定要配备坡道').ramp_required,false);
  assert.equal(contextRecords.checkPhrases('并非必须有坡道').ramp_required,true);
  assert.equal(contextRecords.checkPhrases('允许预约').no_booking,false);
});
test('两版摘要由人预写，条件保留不等于场地事实齐全或模型用对',()=>{
  for(const mode of ['manual_summary_good','manual_summary_missing_ramp'])assert.throws(()=>contextRecords.select(contextRecords.originalCards,mode),/人工摘要/);
  const good=contextRecords.comparisons[2],bad=contextRecords.comparisons[3];
  assert.equal(good.origin,'人工编写的完整对照摘要');assert.equal(bad.origin,'人工刻意漏掉坡道要求的对照摘要');
  assert.ok(!good.input_text.includes('周二15—17'));
  assert.equal(contextRecords.inspect(good).present.ramp_required,true);
  assert.equal(contextRecords.inspect(bad).present.ramp_required,false);
  assert.ok(!Object.hasOwn(contextRecords.inspect(good),'modelUsedCorrectly'));
});
test('字符计数包括换行，Unicode码点计数不当作token数',()=>{
  const text='😀'+String.fromCharCode(10)+'字',record={mode:'test',input_cards:[{id:'A',text:'😀'},{id:'B',text:'字'}],input_text:text,characters:3,requirements_present:contextRecords.checkPhrases(text)};
  assert.equal(contextRecords.inspect(record).characters,3);assert.equal(text.length,4);
  assert.ok(!Object.hasOwn(contextRecords.inspect(record),'tokens'));
});
test('输入对照深层冻结，选择和核对均不修改原卡',()=>{
  assert.ok(Object.isFrozen(contextRecords.originalCards[0])&&Object.isFrozen(contextRecords.comparisons[0].requirements_present));
  const before=JSON.stringify(contextRecords.originalCards),selected=contextRecords.select(contextRecords.originalCards,'full');selected[0].text='改写';
  const result=contextRecords.inspect(contextRecords.comparisons[0]);result.present.ramp_required=false;result.ids.pop();
  assert.equal(JSON.stringify(contextRecords.originalCards),before);
  assert.equal(contextRecords.inspect(contextRecords.comparisons[0]).present.ramp_required,true);
});
test('不一致的卡片、拼接文字、字符数和保留标志会报错',()=>{
  const r=contextRecords.comparisons[0];
  for(const v of [null,{}, {...r,characters:82},{...r,input_text:'不同文本'},{...r,input_cards:[r.input_cards[0],r.input_cards[0]]},{...r,requirements_present:{...r.requirements_present,ramp_required:false}},{...r,requirements_present:{...r.requirements_present,extra:true}}])assert.throws(()=>contextRecords.inspect(v),/记录|卡片|文字|字符数|短语/);
  for(const c of [null,[null],Array(1),[{id:'X',text:'内容'}],[{id:'X',text:'内容',kind:'other'}]])assert.throws(()=>contextRecords.select(c,'full'),/卡片/);
  assert.throws(()=>contextRecords.checkPhrases(null),/文本/);
});
const acceptanceRecords=require('../stage/acceptance-records.cjs');
const acceptanceClone=v=>JSON.parse(JSON.stringify(v));
test('两组六题及另设故障的逐项验收与保存结果一致',()=>{
  const saved=JSON.parse(fs.readFileSync(path.join(__dirname,'../../Python实现/source/campus_agent_lab/outputs/reference/episode20/result.json'),'utf8'));
  assert.deepEqual(acceptanceRecords.groups,saved.groups);assert.deepEqual(acceptanceRecords.fault,saved.fault_demo);
  for(const group of Object.values(acceptanceRecords.groups))for(const c of group.cases)assert.deepEqual(acceptanceRecords.audit(c),c.verification,c.case_id);
  assert.deepEqual(acceptanceRecords.audit(acceptanceRecords.faultCase),saved.fault_demo.verification);
});
test('自报合格、调用正常、期望成功均不能掩盖原材料中的坡道不符',()=>{
  const c=acceptanceClone(acceptanceRecords.faultCase);
  assert.equal(c.run.candidate_checks[0].eligible,true);assert.equal(c.run.candidate_checks[0].ramp_satisfied,true);
  assert.ok(c.run.trace.every(x=>x.executed&&x.status==='ok'));
  const a=acceptanceRecords.audit(c);assert.equal(a.outcome,'incorrect_completion');assert.equal(a.task_completed,false);
  assert.deepEqual(Object.entries(a.checks).filter(([,v])=>!v).map(([k])=>k),['ramp']);
  c.run.candidate_checks=[];c.verification={outcome:'task_success'};c.expected_status='no_match';
  assert.deepEqual(acceptanceRecords.audit(c),a);
});
test('适用期、日期、整个时段、设备、坡道及冲突各自检查',()=>{
  const base=acceptanceRecords.groups.development.cases[0];
  const changes=[['period',c=>c.environment.venues[0].period='上学期'],['day',c=>c.environment.venues[0].day='周一'],['time',c=>c.environment.venues[0].end=15],['equipment',c=>c.environment.details.V1.equipment=[]],['ramp',c=>c.environment.details.V1.ramp=null],['unconflicted',c=>c.environment.details.V1.conflict=true],['task_unchanged',c=>c.run.task.ramp=false]];
  for(const [check,change] of changes){const c=acceptanceClone(base);change(c);const a=acceptanceRecords.audit(c);assert.equal(a.checks[check],false,check);assert.equal(a.task_completed,false,check);}
});
test('场地本身合格仍需此次查询的同场地材料及正确来源编号',()=>{
  const base=acceptanceRecords.groups.development.cases[0];
  for(const check of ['hours_evidence','details_evidence']){
    const c=acceptanceClone(base),i=check==='hours_evidence'?0:1;
    c.run.trace.splice(i,1);c.run.tool_calls--;
    assert.equal(acceptanceRecords.audit(c).checks[check],false);assert.equal(acceptanceRecords.audit(c).task_completed,false);
  }
  const c=acceptanceClone(base);c.run.suggestion.details_source='E2';
  assert.equal(acceptanceRecords.audit(c).checks.details_evidence,false);
  c.run.suggestion.venue_id='V9';assert.equal(acceptanceRecords.audit(c).checks.known_venue,false);
});
test('每组1成功5恰当停止，故障另计；不恰当停止不能混入成功',()=>{
  for(const g of Object.values(acceptanceRecords.groups)){
    assert.equal(g.cases.length,6);assert.equal(g.sample_count,6);
    assert.deepEqual(acceptanceRecords.tally(g.cases),g.counts);
    assert.deepEqual(g.counts,{task_success:1,appropriate_stop:5,incorrect_completion:0,incorrect_result:0});
    for(const c of g.cases.slice(0))if(!c.run.suggestion)assert.equal(acceptanceRecords.audit(c).task_completed,false);
  }
  const c=acceptanceClone(acceptanceRecords.groups.development.cases[0]);c.run.suggestion=null;c.run.status='no_match';
  assert.equal(acceptanceRecords.audit(c).outcome,'incorrect_result');
  c.expected_status='no_match';assert.equal(acceptanceRecords.audit(c).outcome,'appropriate_stop');
  c.run.status='tool_error';assert.equal(acceptanceRecords.audit(c).outcome,'incorrect_result');
});
test('H02只按该题资料检查V2坡道，调用次数与题号各自保留',()=>{
  const d=acceptanceRecords.groups.development.cases,h=acceptanceRecords.groups.reserved.cases;
  assert.deepEqual(d.map(c=>c.run.tool_calls),[2,2,3,1,2,2]);assert.deepEqual(h.map(c=>c.run.tool_calls),[2,3,2,1,1,2]);
  assert.equal(d[0].environment.details.V2.ramp,false);assert.equal(h[1].environment.details.V2.ramp,true);
  assert.equal(h[1].run.suggestion.venue_id,'V2');assert.equal(acceptanceRecords.audit(h[1]).outcome,'task_success');
  assert.equal(acceptanceRecords.fault.run.trace[1].result.ramp,false);
});
test('只建议标志只检查结构化工具轨迹，不冒充任意回答的语义判定',()=>{
  const c=acceptanceClone(acceptanceRecords.groups.development.cases[0]);
  c.run.trace.push({tool:'book_venue',args:{venue_id:'V1'},executed:true,status:'ok',result:{}});c.run.tool_calls++;
  assert.equal(acceptanceRecords.audit(c).checks.only_advice,false);
  const result=acceptanceRecords.audit(acceptanceRecords.groups.development.cases[0]);
  assert.ok(!Object.hasOwn(result,'naturalLanguageChecked'));
});
test('验收记录深层冻结，计算不修改原记录，无效结构报错',()=>{
  const c=acceptanceRecords.groups.development.cases[0],before=JSON.stringify(acceptanceRecords.groups);
  assert.ok(Object.isFrozen(c.environment.details.V1)&&Object.isFrozen(acceptanceRecords.fault.run.trace));
  const a=acceptanceRecords.audit(c);a.checks.ramp=false;
  acceptanceRecords.tally(acceptanceRecords.groups.development.cases);
  assert.equal(JSON.stringify(acceptanceRecords.groups),before);assert.equal(acceptanceRecords.audit(c).checks.ramp,true);
  for(const bad of [null,{}, {...c,task:{...c.task,start:true}},{...c,run:{...c.run,tool_calls:1}},{...c,run:{...c.run,status:'other'}},{...c,run:{...c.run,suggestion:{venue_id:'V1'}}}])assert.throws(()=>acceptanceRecords.audit(bad),/记录|条件/);
  assert.throws(()=>acceptanceRecords.tally(null),/列表/);
});
test('全文不把文件名猜成网址，保留显式资料链接与本地入口',()=>{
  const name=fs.readdirSync(path.join(__dirname,'../../青少年AI科普连载')).find(n=>n.startsWith('20_'));
  const html=require('../render_stage.cjs').compileOne(name).html;
  assert.ok(!html.includes('href="http://adapters.py"'));
  assert.ok(html.includes('adapters.py 中 run_agent_session'));
  assert.ok(html.includes('href="https://github.com/cs329z/assignment1-harness/blob/95f4cb7bfe28a27a7cf5bcb1eccb1aaaf1385eb3/cs329z_hw1/adapters.py"'));
  assert.ok(html.includes('href="../../Python实现/source/campus_agent_lab/README.md"'));
});
test('全文链接识别修正后前19篇互动版仍与已交付文件逐字节一致',()=>{
  const serial=path.join(__dirname,'../../青少年AI科普连载');
  for(const name of fs.readdirSync(serial).filter(n=>/^\d\d_/.test(n)&&Number(n.slice(0,2))<=19)){
    const result=require('../render_stage.cjs').compileOne(name);
    assert.equal(result.html,fs.readFileSync(path.join(serial,name,'互动版.html'),'utf8'),name);
  }
});
const moeRecords=require('../stage/moe-records.cjs');
test('路由按原始分数稳定选出第二第三项，仅在选中项内重新归一',()=>{
  const r=moeRecords.record,s=moeRecords.summary();assert.deepEqual(s.selected,[1,2]);
  near(s.weights[0],.6);near(s.weights[1],.4);near(s.weights.reduce((a,b)=>a+b,0),1);
  assert.ok(Math.abs(s.routerWeights[1]-.6)>.1);
  const selectedMass=s.routerWeights[1]+s.routerWeights[2];near(s.routerWeights[1]/selectedMass,.6);
  assert.deepEqual(moeRecords.select([2,2,1],2),[0,1]);
  assert.deepEqual(moeRecords.select(r.router_logits,1),[1]);
  const shifted=moeRecords.softmax(r.router_logits.map(x=>x+1000));s.routerWeights.forEach((x,i)=>near(x,shifted[i]));
});
test('四项完整核算表按行向量乘矩阵得到倍数，连同零核对所有系数',()=>{
  const r=moeRecords.record;
  assert.deepEqual(r.all_expert_matrices.map(m=>moeRecords.project(r.input,m)),[[1,2],[2,4],[3,6],[4,8]]);
  assert.deepEqual(moeRecords.project([2,3],[[1,2],[4,5]]),[14,19]);
  assert.equal(r.all_expert_matrices.flat(2).filter(x=>x===0).length,8);
});
test('稀疏路线不先执行未选模块，即使它们投影会溢出也不参与本次计算',()=>{
  const r=moeRecords.record,matrices=JSON.parse(JSON.stringify(r.all_expert_matrices));
  matrices[0]=[[Number.MAX_VALUE,0],[0,Number.MAX_VALUE]];matrices[3]=matrices[0];
  assert.throws(()=>moeRecords.project([2,2],matrices[0]));
  const s=moeRecords.run([2,2],matrices,r.router_logits);assert.deepEqual(s.selected,[1,2]);assert.deepEqual(s.outputs,[[4,4],[6,6]]);
  s.output.forEach(x=>near(x,4.8));
});
test('逐项贡献分别为1.2和2.4，加权后得到2.4与4.8',()=>{
  const s=moeRecords.summary();s.contributions.forEach(row=>{near(row[0],1.2);near(row[1],2.4);});
  near(s.output[0],2.4);near(s.output[1],4.8);
  const left=moeRecords.combine([[2,4],[3,6]],[1,0]);assert.deepEqual(left.output,[2,4]);
});
test('选中项不变，等权合并得到2.5与5，不由数值大小给出质量结论',()=>{
  const s=moeRecords.summary(),p=moeRecords.combine(s.outputs,[.5,.5]);assert.deepEqual(p.output,[2.5,5]);
  assert.deepEqual(s.selected,[1,2]);assert.ok(p.output[0]>s.output[0]);assert.ok(!Object.hasOwn(p,'quality'));
});
test('参数统计包含零，存储16而本次选中8，改为选一项仍须保存16',()=>{
  const r=moeRecords.record,s=moeRecords.summary();assert.equal(s.stored,16);assert.equal(s.used,8);
  const one=moeRecords.run(r.input,r.all_expert_matrices,r.router_logits,1);assert.equal(one.stored,16);assert.equal(one.used,4);assert.deepEqual(one.output,[2,4]);
  assert.ok(!Object.hasOwn(s,'hardwareSpeedup'));assert.ok(!Object.hasOwn(s,'wholeModelParameters'));
});
test('保存的原始分数、完整softmax、选中权重、输出与矩阵计数可重建',()=>{
  const raw=JSON.parse(fs.readFileSync(path.join(__dirname,'../../Python实现/source/continuation_mechanisms/outputs/reference/result.json'),'utf8')).moe;
  assert.deepEqual(moeRecords.record,raw);const s=moeRecords.summary();
  assert.deepEqual(s.output,raw.output);assert.deepEqual(s.outputs,raw.selected_expert_outputs);
  assert.equal(s.output[0].toFixed(1),'2.4');assert.equal(s.output[1].toFixed(1),'4.8');
  const clone=JSON.parse(JSON.stringify(raw));clone.renormalized_weights=[.6,.4];assert.doesNotThrow(()=>moeRecords.summary(clone));
});
test('专家记录深层冻结，复算不修改输入，返回的贡献及选择彼此独立',()=>{
  const r=moeRecords.record,before=JSON.stringify(r);assert.ok(Object.isFrozen(r.all_expert_matrices[0][0]));
  const s=moeRecords.summary();s.selected[0]=3;s.outputs[0][0]=999;s.contributions[0][0]=999;
  assert.equal(JSON.stringify(r),before);assert.deepEqual(moeRecords.summary().selected,[1,2]);near(moeRecords.summary().contributions[0][0],1.2);
});
test('非法路由、形状、非归一权重或篡改保存结果会报错',()=>{
  for(const scores of [[],[NaN],Array(2),[Infinity]])assert.throws(()=>moeRecords.select(scores));
  for(const k of [0,5,true,1.5])assert.throws(()=>moeRecords.select([1,2,3,4],k));
  for(const [input,m] of [[[1,2],[[1]]],[[1],[[1,2],[3]]],[[NaN],[[1]]]])assert.throws(()=>moeRecords.project(input,m));
  for(const [rows,weights] of [[[[1],[2]],[.6,.6]],[[[1],[2]],[-.5,1.5]],[[[1],[2,3]],[.5,.5]],[[[1]],[NaN]]])assert.throws(()=>moeRecords.combine(rows,weights));
  const r=moeRecords.record;
  for(const saved of [null,{}, {...r,selected_expert_ids_zero_based:[2,1]},{...r,expert_parameters_stored:8},{...r,output:[2.5,5]},{...r,router_probabilities:[.1,.6,.2,.1]},{...r,renormalized_weights:[.6+1e-8,.4]}])assert.throws(()=>moeRecords.summary(saved));
});
const cacheRecords=require('../stage/cache-records.cjs');
test('教学六七八位置保持旧前缀和连续位置，与保存十二token输入分开',()=>{
  const six=cacheRecords.prefix(6),seven=cacheRecords.prefix(7),eight=cacheRecords.prefix(8);
  assert.equal(six.map(r=>r.token).join(''),'<abce|');
  assert.deepEqual(seven.slice(0,6),six);assert.deepEqual(eight.slice(0,7),seven);
  assert.deepEqual(seven[6],{token:'a',position:6});assert.deepEqual(eight[7],{token:'b',position:7});
  assert.equal(Array.from(cacheRecords.measuredInput).length,12);assert.notEqual(cacheRecords.measuredInput,eight.map(r=>r.token).join(''));
});
test('单个投影的累计位置数逐项相加，十二前缀为78和12，四前缀为10和4',()=>{
  for(let n=1;n<=30;n++){
    const c=cacheRecords.projections(n);assert.equal(c.full,Array.from({length:n},(_,i)=>i+1).reduce((a,b)=>a+b,0));assert.equal(c.incremental,n);
  }
  assert.deepEqual(cacheRecords.projections(12),{full:78,incremental:12,ratio:6.5});
  assert.deepEqual(cacheRecords.projections(4),{full:10,incremental:4,ratio:2.5});
  assert.ok(!Object.hasOwn(cacheRecords.projections(12),'speedup'));
});
test('空间同时包含K和V，净字节随长度、宽度与数值字节数分别变化',()=>{
  assert.equal(cacheRecords.storage(1).perPosition,256);assert.equal(cacheRecords.storage(12).total,3072);
  assert.equal(cacheRecords.storage(4).total,1024);assert.equal(cacheRecords.storage(0).total,0);
  assert.equal(cacheRecords.storage(4,8,4).total,256);assert.equal(cacheRecords.storage(4).components,2);
  assert.ok(!Object.hasOwn(cacheRecords.storage(12),'totalSystemMemory'));
});
test('首选相同仍可能其他候选分数不同，不能用argmax替代逐项核对',()=>{
  const c=cacheRecords.counterexample,r=cacheRecords.compare(c.full,c.cached);
  assert.equal(r.sameTop,true);assert.deepEqual(r.errors,[0,3,1]);assert.equal(r.maxError,3);assert.equal(r.withinTolerance,false);
  const small=cacheRecords.compare([2,1],[2+1e-12,1],1e-10);assert.equal(small.withinTolerance,true);
  assert.equal(cacheRecords.compare([2,1],[2+1e-12,1],0).withinTolerance,false);
  assert.equal(cacheRecords.compare([-4,-2],[-4,-2],0).maxError,0);
});
test('36组比较与正负例误差来自保存的KV对照，不生成新的模型成绩',()=>{
  const source=JSON.parse(fs.readFileSync(path.join(__dirname,'../../Python实现/source/continuation_mechanisms/outputs/reference/result.json'),'utf8')).kv_cache;
  assert.deepEqual(cacheRecords.record,source);const r=cacheRecords.summary();
  assert.equal(r.comparisons,36);assert.equal(r.maxError,7.105427357601002e-15);assert.ok(r.maxError<r.tolerance);
  assert.equal(r.wrongPositionError,20.32918307056546);assert.ok(r.wrongPositionError>r.tolerance);
  assert.equal(r.counts.full,78);assert.equal(r.space.total,source.final_kv_cache_bytes_per_model);
  assert.ok(!Object.hasOwn(r,'generationQuality'));assert.ok(!Object.hasOwn(r,'wallTime'));
});
test('记录深层冻结，前缀与摘要独立返回，不修改调用方候选数组',()=>{
  assert.ok(Object.isFrozen(cacheRecords.record.cache_components.K));assert.ok(Object.isFrozen(cacheRecords.counterexample.full));
  const p=cacheRecords.prefix(7);p[0].token='X';assert.equal(cacheRecords.prefix(7)[0].token,'<');
  const a=cacheRecords.summary();a.space.total=0;assert.equal(cacheRecords.summary().space.total,3072);
  const x=[4,2],y=[4,1];cacheRecords.compare(x,y);assert.deepEqual(x,[4,2]);assert.deepEqual(y,[4,1]);
});
test('无效长度、候选分数、容差与超出安全整数的计数拒绝执行',()=>{
  for(const n of [0,-1,1.5,true,NaN,Number.MAX_SAFE_INTEGER])assert.throws(()=>cacheRecords.projections(n));
  for(const args of [[-1],[2,0],[2,4,0],[Number.MAX_SAFE_INTEGER]])assert.throws(()=>cacheRecords.storage(...args));
  for(const n of [0,9,true])assert.throws(()=>cacheRecords.prefix(n));
  for(const args of [[[],[]],[[1],[1,2]],[[NaN],[1]],[Array(1),[1]],[[1],[1],-1],[[1],[1],Infinity]])assert.throws(()=>cacheRecords.compare(...args));
});
test('形状、位置计数、净空间或误差与保存记录不一致时会报错',()=>{
  const r=cacheRecords.record;
  for(const change of [null,{}, {...r,prefixes_per_model:11},{...r,full_prefix_kv_token_projections:156},{...r,final_kv_cache_bytes_per_model:1536},{...r,float64_max_logit_error:NaN},{...r,cache_components:{...r.cache_components,bytes_per_scalar:undefined}},{...r,cache_components:{...r.cache_components,V:{tokens:12,width:8}}}])assert.throws(()=>cacheRecords.summary(change));
});
const sftRecords=require('../stage/sft-records.cjs');
test('复制样本11个教学token对应10个下一片预测，回答含结束符',()=>{
  const a=sftRecords.summary();assert.equal(a.sample,'<abcd|abcd>');assert.equal(a.rows.length,10);
  assert.equal(a.rows.map(r=>r.input).join(''),'<abcd|abcd');
  assert.equal(a.rows.map(r=>r.target).join(''),'abcd|abcd>');
  assert.deepEqual(a.selected,[5,6,7,8,9]);assert.deepEqual(a.rows.map(r=>r.score),[0,0,0,0,0,1,1,1,1,1]);
  assert.equal(a.rows.filter(r=>r.score).map(r=>r.target).join(''),'abcd>');
});
test('首个回答a在竖线位置预测，读入a之后的目标才是b',()=>{
  const rows=sftRecords.summary().rows;
  assert.deepEqual(rows[5],{index:5,input:'|',target:'a',prefix:['<','a','b','c','d','|'],score:1});
  assert.deepEqual(rows[6],{index:6,input:'a',target:'b',prefix:['<','a','b','c','d','|','a'],score:1});
  for(const r of rows){assert.equal(r.prefix.length,r.index+1);assert.equal(r.prefix.at(-1),r.input);}
});
test('文本演示使用明确给定的片段，按前缀错开一个目标而不调用分词器',()=>{
  const rows=sftRecords.align(['今天','下雨','了','。']);
  assert.deepEqual(rows.map(r=>r.target),['下雨','了','。']);
  assert.deepEqual(rows[1].prefix,['今天','下雨']);assert.equal(rows[1].target,'了');
  assert.deepEqual(rows.map(r=>r.score),[1,1,1]);
});
test('全序列10项与回答5项的计分不同，损失开关不删除因果可见输入',()=>{
  const full=sftRecords.align(Array.from(sftRecords.sample)),answer=sftRecords.summary().rows;
  assert.equal(full.filter(r=>r.score).length,10);assert.equal(answer.filter(r=>r.score).length,5);
  assert.deepEqual(full.map(r=>r.prefix),answer.map(r=>r.prefix));
  assert.deepEqual(sftRecords.visible(5,10),[true,true,true,true,true,true,false,false,false,false]);
  assert.equal(answer[0].score,0);assert.equal(sftRecords.visible(5,10)[0],true);
  assert.deepEqual(sftRecords.visible(0,3),[true,false,false]);
});
test('损失与参数变化来自已有一次更新记录，不伪造训练或新任务成绩',()=>{
  const saved=JSON.parse(fs.readFileSync(path.join(__dirname,'../../Python实现/source/continuation_mechanisms/outputs/reference/result.json'),'utf8')).sft_loss_mask;
  assert.deepEqual(sftRecords.record,saved);const a=sftRecords.summary();
  assert.equal(a.before,2.0167406472189926);assert.equal(a.after,2.010323355708571);
  assert.ok(a.after<a.before);assert.equal(a.parameterDelta,0.008011493343270303);assert.equal(a.maskedLogitGradient,0);
  assert.ok(!Object.hasOwn(a,'inputGradient'));assert.ok(!Object.hasOwn(a,'newTaskAccuracy'));
});
test('正文三位小数为同一记录的舍入，选读六位显示不替代原始数值',()=>{
  const a=sftRecords.summary();assert.equal(a.before.toFixed(3),'2.017');assert.equal(a.after.toFixed(3),'2.010');
  assert.equal(a.before.toFixed(6),'2.016741');assert.equal(a.after.toFixed(6),'2.010323');
});
test('教学对齐不修改输入，保存记录深层冻结，返回值可独立修改',()=>{
  const tokens=Array.from(sftRecords.sample),before=tokens.join('');
  const rows=sftRecords.align(tokens,5);rows[0].prefix.push('X');rows[0].target='X';
  assert.equal(tokens.join(''),before);assert.ok(Object.isFrozen(sftRecords.record.selected_target_positions));
  const a=sftRecords.summary();a.selected.pop();a.rows[5].prefix=[];
  assert.equal(sftRecords.summary().selected.length,5);assert.equal(sftRecords.summary().rows[5].prefix.length,6);
});
test('无效token、计分起点、因果位置与保存数值会报错',()=>{
  for(const tokens of [null,[],['a'],['a',''],Array(2),['a',null]])assert.throws(()=>sftRecords.align(tokens),/无效/);
  for(const start of [-1,true,10,1.5])assert.throws(()=>sftRecords.align(Array.from(sftRecords.sample),start),/无效/);
  for(const [p,n] of [[-1,10],[10,10],[true,10],[0,0],[0,1.5]])assert.throws(()=>sftRecords.visible(p,n),/无效/);
  for(const saved of [null,{}, {...sftRecords.record,selected_target_positions:[6,7,8,9]},{...sftRecords.record,one_step_loss_before:NaN},{...sftRecords.record,masked_logit_gradient_max:-1}])assert.throws(()=>sftRecords.summary(saved),/不一致|无效/);
});
console.log(`PASS: ${count} 项互动版纯函数检查（手势限流、触摸、镜头、哈希、切句、分镜覆盖、积木、像素、参数、滑窗、残差、状态、生成、加权、解码、存储、方案筛选、编码、关系、证据核对、校园流程、工具记录、多步场地路线、上下文卡片、任务验收、训练计分、缓存计数与专家路由算例）`);
