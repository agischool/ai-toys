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
console.log(`PASS: ${count} 项互动版纯函数检查（手势限流、触摸、镜头、哈希、切句、分镜覆盖、积木、像素、参数、滑窗、残差、状态、生成、加权与解码算例）`);
