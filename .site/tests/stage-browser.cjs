/* 互动版的真浏览器检查：版面、文字对比度与字号、手势、键盘、目录、自动播放、全文模式、file:// 打开。
 *
 * 为什么要有它：版面问题（画面被字幕卡压住、卡片切边）只会在真实渲染里出现，纯函数测试看不到。
 * M1 样片就是靠这套检查逐条收敛的，后面每一篇都要用同样的标准过一遍。
 *
 * 运行（需要 Playwright 与 Chrome，仓库不装依赖，沿用 Python实现/tests/browser-smoke.cjs 的约定）：
 *   PLAYWRIGHT_MODULE=/path/to/node_modules/playwright \
 *   CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
 *   node .site/tests/stage-browser.cjs [文章编号，默认 01] [--only=layout,contrast,gesture,file]
 *
 * 它自己起一个只监听 127.0.0.1 的静态服务（端口随机），不占用 4174/4173 等常驻端口，结束时一并关闭。 */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '../..');
const SERIAL = path.join(ROOT, '青少年AI科普连载');
const args = process.argv.slice(2);
const nn = (args.find(a => /^\d\d$/.test(a)) || '01');
const onlyArg = (args.find(a => a.startsWith('--only=')) || '').slice(7);
const groups = new Set(onlyArg ? onlyArg.split(',') : ['layout', 'contrast', 'gesture', 'actions', 'file']);
const firstBeat = Number((args.find(a => a.startsWith('--from=')) || '--from=1').slice(7));
const lastBeat = Number((args.find(a => a.startsWith('--to=')) || '--to=Infinity').slice(5));
if (!Number.isInteger(firstBeat) || firstBeat < 1 || !(lastBeat >= firstBeat)) throw new Error('无效的 --from / --to 拍号');
const folder = fs.readdirSync(SERIAL).find(n => n.startsWith(nn + '_'));
if (!folder || !fs.existsSync(path.join(SERIAL, folder, '互动版.html'))) {
  console.error(`没有找到第 ${nn} 篇的 互动版.html。先运行：node .site/render_stage.cjs ${nn}`);
  process.exit(1);
}
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const VPS = {
  desk: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  short: { viewport: { width: 1280, height: 577 }, deviceScaleFactor: 1 },      // 1280×720 窗口里实际可用高度
  mob: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  narrow: { viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },   // 现今最窄的主流 Android
  tiny: { viewport: { width: 320, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }       // 老 iPhone SE：版面要成立，画面文字字号只报数不判
};

/* 画面文字的最小渲染字号（px）。10 与 7 是 M1 的实测最小值取整（10.1 / 7.6），换了画面后只许更大。 */
const ART_MIN_PX = { desk: 12, short: 12, mob: 12, narrow: 10, tiny: 7 };

let failures = 0;
const fail = msg => { failures++; console.log('✗ ' + msg); };
const ok = msg => console.log('✓ ' + msg);
const check = (name, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) ok(`${name}：${JSON.stringify(got)}`);
  else fail(`${name}：得到 ${JSON.stringify(got)}，应为 ${JSON.stringify(want)}`);
};

function serve() {
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8' };
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/* ------------------------------------------------------------------ */
/* 1. 版面：每一拍、四种视口。画面元素不许切边、不许压到字幕卡或顶栏/底栏按钮。 */
/* ------------------------------------------------------------------ */
async function layout(browser, url) {
  console.log('\n[版面] desk / short / mob / tiny，逐拍');
  for (const name of Object.keys(VPS)) {
    const ctx = await browser.newContext(VPS[name]);
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await page.goto(url, { waitUntil: 'load' });
    const total = await page.evaluate(() => JSON.parse(document.getElementById('stage-data').textContent).beats.length);
    let bad = 0;
    for (let n = firstBeat; n <= Math.min(total, lastBeat); n++) {
      await page.goto(`${url}#b${n}`, { waitUntil: 'load' });
      await page.reload({ waitUntil: 'load' });
      await sleep(300);
      const r = await page.evaluate(() => {
        const vw = innerWidth, vh = innerHeight, tol = 3;
        const R = el => el.getBoundingClientRect();
        const cap = document.getElementById('capcard');
        const quiet = cap.classList.contains('quiet');
        const cr = R(cap);
        const ui = [...document.querySelectorAll('.hud .pill, .foot .pill, .foot #count, .foot #hint')].filter(e => !e.hidden).map(R).filter(b => b.width > 0);
        const hudBottom = Math.max(...[...document.querySelectorAll('.hud .pill')].map(e => R(e).bottom));
        const hit = (a, b) => a.left < b.right - tol && a.right > b.left + tol && a.top < b.bottom - tol && a.bottom > b.top + tol;
        const issues = [];
        const scene = document.querySelector('.scene.is-active');
        const focusing = scene.classList.contains('has-focus');
        scene.querySelectorAll('.s.on').forEach(el => {
          if (el.classList.contains('bleed')) return;                    // 装饰底色允许伸出画面
          if (focusing && !el.classList.contains('focus')) return;        // 被压暗/隐藏的非焦点元素不检查
          if (getComputedStyle(el).display === 'none') return;
          const b = R(el);
          if (b.width < 1 || b.height < 1) return;
          const nm = el.dataset.n || (el.querySelector('text') ? el.querySelector('text').textContent.slice(0, 6) : '?');
          if (b.right <= 0 || b.left >= vw || b.bottom <= 0 || b.top >= vh) return;   // 完全在屏幕外：镜头没对着它，正常
          if (b.left < -tol || b.right > vw + tol || b.top < -tol || b.bottom > vh + tol) { issues.push(`切边 ${nm}`); return; }
          if (!quiet && hit(b, cr)) { issues.push(`压字幕 ${nm}`); return; }
          if (ui.some(u => hit(b, u))) issues.push(`压控件 ${nm}`);
        });
        if (!quiet && cr.top < hudBottom + 4) issues.push(`字幕卡顶 ${Math.round(cr.top)} 贴近顶栏`);
        return issues;
      });
      if (r.length) { bad++; fail(`${name} 第 ${n} 拍：${r.join('、')}`); }
    }
    if (errs.length) { bad++; fail(`${name} 页面报错：${[...new Set(errs)].join('; ')}`); }
    if (!bad) ok(`${name}：第 ${firstBeat}—${Math.min(total, lastBeat)} 拍无切边、无遮挡、无报错`);
    await ctx.close();
  }
}

/* ------------------------------------------------------------------ */
/* 2. 对比度与字号：界面文字与画面文字都按「实际渲染出来」的像素量。       */
/*    普通字 ≥ 4.5:1；大字（≥24px，或 ≥18.66px 且粗体）≥ 3:1。
   画面内文字渲染后的最小字号按视口分档（ART_MIN_PX）：desk 与 mob（390×844）是目标值 12px；
   narrow（360×640）与 tiny（320×640）是 M1 样片的实测基线，不是目标——总览拍要把整条路线缩进窄屏，
   站名只剩 10px 上下。这两档的作用是「后面的拍不许比 M1 更小」，缺口本身记在 HANDOFF.md。 */
/* ------------------------------------------------------------------ */
async function contrast(browser, url) {
  console.log('\n[对比度与字号] desk / mob / narrow / tiny');
  for (const name of ['desk', 'mob', 'narrow', 'tiny']) {
    const page = await (await browser.newContext(VPS[name])).newPage();
    await page.goto(url, { waitUntil: 'load' });
    const total = await page.evaluate(() => JSON.parse(document.getElementById('stage-data').textContent).beats.length);
    const MIN_ART_PX = ART_MIN_PX[name];
    const worstUi = new Map(), smallArt = [];
    let minArt = Infinity;
    for (let n = firstBeat; n <= Math.min(total, lastBeat); n++) {
      await page.goto(`${url}#b${n}`, { waitUntil: 'load' });
      await page.reload({ waitUntil: 'load' });
      await sleep(250);
      if (n === Math.min(6, total)) { await page.click('#btn-toc'); await sleep(250); }   // 目录弹窗也量一次
      // 淡入时的中间透明度不代表最终文字颜色；等实际动画结束，避免固定延时抢在末帧采样。
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(document.getElementById('cap').getAnimations().map(a => a.finished));
      });
      const r = await page.evaluate(() => {
        const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const a = m[1].split(',').map(Number); return { r: a[0], g: a[1], b: a[2], a: a.length > 3 ? a[3] : 1 }; };
        const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        const lum = c => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
        const over = (f, b2) => ({ r: f.r * f.a + b2.r * (1 - f.a), g: f.g * f.a + b2.g * (1 - f.a), b: f.b * f.a + b2.b * (1 - f.a), a: 1 });
        const bgOf = el => {
          const stack = [];
          for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; } }
          let base = { r: 255, g: 253, b: 246, a: 1 };
          for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base);
          return base;
        };
        const ui = [];
        document.querySelectorAll('.hud .pill, .foot, .cap p, .cap b, .cap span, #toc .toc-no, #toc .toc-name, #toc h2, #toc .toc-foot, #toc .pill, .cite').forEach(el => {
          if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
          const rc = el.getBoundingClientRect(); if (rc.width < 2 || rc.height < 2) return;
          const cs = getComputedStyle(el);
          const f0 = parse(cs.color), bg = bgOf(el);
          const fg = over({ ...f0, a: f0.a * (parseFloat(cs.opacity) || 1) }, bg);
          const L1 = lum(fg), L2 = lum(bg);
          const size = parseFloat(cs.fontSize), weight = Number(cs.fontWeight);
          const large = size >= 24 || (size >= 18.66 && weight >= 700);
          ui.push({ key: `${el.id ? '#' + el.id : el.className || el.tagName} ${el.textContent.trim().slice(0, 10)}`, size, ratio: Math.round(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)) * 100) / 100, need: large ? 3 : 4.5 });
        });
        const art = [];
        const scene = document.querySelector('.scene.is-active');
        const focusing = scene.classList.contains('has-focus');
        scene.querySelectorAll('.s.on text').forEach(t => {
          const host = t.closest('.s');
          if (host.classList.contains('bleed') || (focusing && !host.classList.contains('focus')) || getComputedStyle(host).display === 'none') return;
          if (t.getBoundingClientRect().width < 2) return;
          art.push({ text: t.textContent.trim().slice(0, 8), px: Math.round(parseFloat(getComputedStyle(t).fontSize) * t.getScreenCTM().a * 10) / 10 });
        });
        return { ui, art };
      });
      for (const u of r.ui) { const k = `${u.key}|${u.size}`; const p = worstUi.get(k); if (!p || u.ratio < p.ratio) worstUi.set(k, u); }
      r.art.forEach(a => { minArt = Math.min(minArt, a.px); if (a.px < MIN_ART_PX) smallArt.push({ n, ...a }); });
    }
    let bad = 0;
    for (const u of worstUi.values()) if (u.ratio < u.need) { bad++; fail(`${name} 对比度 ${u.ratio}:1（需 ${u.need}）${u.size}px ${u.key.trim()}`); }
    for (const a of smallArt.slice(0, 8)) { bad++; fail(`${name} 第 ${a.n} 拍画面文字「${a.text}」只有 ${a.px}px（< ${MIN_ART_PX}px）`); }
    if (!bad) ok(`${name}：界面文字全部达标，画面文字都 ≥ ${MIN_ART_PX}px（实测最小 ${minArt}px${MIN_ART_PX < 12 ? '，M1 基线' : ''}）`);
    await page.context().close();
  }
}

/* ------------------------------------------------------------------ */
/* 3. 手势、键盘、目录、自动播放、全文模式、手机触摸                       */
/* ------------------------------------------------------------------ */
async function gestures(browser, url) {
  console.log('\n[手势与交互]');
  const beat = page => page.evaluate(() => Number(document.getElementById('count').textContent.split('/')[0]));
  const total = await (async () => { const p = await (await browser.newContext(VPS.desk)).newPage(); await p.goto(url); const t = await p.evaluate(() => JSON.parse(document.getElementById('stage-data').textContent).beats.length); await p.context().close(); return t; })();
  const mid = Math.min(5, total - 2);

  const ctx = await browser.newContext(VPS.desk);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  const open = async (n = 1) => { await page.goto(`${url}#b${n}`, { waitUntil: 'load' }); await page.reload({ waitUntil: 'load' }); await sleep(500); await page.mouse.move(700, 400); };
  /* 触控板惯性：快速升到峰值再指数衰减，约 1.5 秒；Playwright 每次 wheel 自身耗时远超 16ms，所以这是个「偏慢」的近似。 */
  const inertia = (peak = 180, decay = 0.93) => { const out = [0.15, 0.4, 0.75, 1].map(k => peak * k); for (let d = peak * decay; d > 1; d *= decay) out.push(d); return out; };
  const fling = async (sign = 1) => { for (const d of inertia()) { await page.mouse.wheel(0, sign * d); await sleep(16); } };

  await open(1);
  await page.mouse.wheel(0, 100); await sleep(900);
  check('一格滚轮 → 第 2 拍', await beat(page), 2);
  await page.mouse.wheel(0, -100); await sleep(900);
  check('反向一格 → 第 1 拍', await beat(page), 1);
  await open(mid);
  await fling(); await sleep(1500);
  check(`一次惯性 → 只前进 1 拍（${mid}→${mid + 1}）`, await beat(page), mid + 1);
  await open(mid);
  await fling(); await sleep(900); await fling(); await sleep(1500);
  check(`两次惯性相隔 0.9 秒 → 前进 2 拍（${mid}→${mid + 2}）`, await beat(page), mid + 2);
  await open(mid);
  await page.mouse.wheel(0, 3000); await sleep(1200);
  check(`一次猛甩 3000px → 只前进 1 拍`, await beat(page), mid + 1);
  await open(total);
  await page.mouse.wheel(0, 300); await sleep(900);
  check('最后一拍再往下 → 不动', await beat(page), total);
  await open(1);
  await page.mouse.wheel(0, -300); await sleep(900);
  check('第一拍再往上 → 不动', await beat(page), 1);

  await open(mid);
  const key = async k => { await page.keyboard.press(k); await sleep(500); return beat(page); };
  check('ArrowDown', await key('ArrowDown'), mid + 1);
  check('PageDown', await key('PageDown'), mid + 2);
  check('Space', await key('Space'), mid + 3);
  check('Shift+Space', await key('Shift+Space'), mid + 2);
  check('ArrowUp', await key('ArrowUp'), mid + 1);
  check('End', await key('End'), total);
  check('Home', await key('Home'), 1);
  await page.keyboard.down('ArrowDown');
  for (let i = 0; i < 6; i++) { await page.keyboard.down('ArrowDown'); await sleep(20); }
  await page.keyboard.up('ArrowDown'); await sleep(600);
  check('按住 ArrowDown 不连翻', await beat(page), 2);

  await open(4);
  await page.click('#btn-next'); await sleep(500);
  check('下一拍按钮', await beat(page), 5);
  check('哈希随拍更新', await page.evaluate(() => new Promise(r => setTimeout(() => r(location.hash), 400))), '#b5');
  await page.click('#btn-toc'); await sleep(300);
  check('目录打开', await page.evaluate(() => document.getElementById('toc').open), true);
  await page.keyboard.press('Escape'); await sleep(300);
  check('Esc 关闭目录，焦点回到目录按钮', await page.evaluate(() => [document.getElementById('toc').open, document.activeElement.id]), [false, 'btn-toc']);
  await page.click('#btn-toc'); await sleep(300);
  await page.locator('.toc-card').nth(1).click(); await sleep(600);
  const firstOfSection1 = await page.evaluate(() => { const d = JSON.parse(document.getElementById('stage-data').textContent); return d.sections[1].first + 1; });
  check('点目录第 1 节 → 跳到该节第一拍', await beat(page), firstOfSection1);

  await open(1);
  await page.click('#btn-play'); await sleep(300);
  check('点播放：按钮变「暂停」、没有 aria-pressed', await page.evaluate(() => [document.getElementById('btn-play').textContent, document.getElementById('btn-play').hasAttribute('aria-pressed')]), ['暂停', false]);
  await sleep(6700);
  const played = await beat(page);
  played >= 2 ? ok(`自动播放 7 秒：1 → ${played}`) : fail(`自动播放 7 秒没有前进（${played}）`);
  await page.mouse.wheel(0, 100); await sleep(500);
  check('滚轮后自动播放停止', await page.evaluate(() => document.getElementById('btn-play').getAttribute('data-playing')), 'false');

  await open(mid);
  await page.click('.hud-r a[data-action="read"]'); await sleep(400);
  check('点「全文」→ 全文模式，地址带 ?read', await page.evaluate(() => [document.documentElement.dataset.mode, location.search]), ['read', '?read']);
  check('全文模式里舞台不可见', await page.evaluate(() => getComputedStyle(document.getElementById('stage')).display), 'none');
  await page.click('.read-bar a[data-action="stage"]'); await sleep(600);
  check('点「看分镜版」回到分镜', await page.evaluate(() => document.documentElement.dataset.mode), 'stage');
  check('页面零 JS 报错', errs, []);
  await ctx.close();

  const rm = await (await browser.newContext({ ...VPS.desk, reducedMotion: 'reduce' })).newPage();
  await rm.goto(url, { waitUntil: 'load' }); await sleep(400);
  check('系统开「减少动态效果」→ 默认全文', await rm.evaluate(() => document.documentElement.dataset.mode), 'read');
  await rm.goto(url + '?stage', { waitUntil: 'load' }); await sleep(400);
  check('减少动态效果 + ?stage → 分镜', await rm.evaluate(() => document.documentElement.dataset.mode), 'stage');
  await rm.context().close();

  const mctx = await browser.newContext(VPS.mob);
  const mp = await mctx.newPage();
  const cdp = await mctx.newCDPSession(mp);
  const swipe = async (dy, speed = 800) => { await cdp.send('Input.synthesizeScrollGesture', { x: 195, y: 420, yDistance: dy, gestureSourceType: 'touch', speed }); await sleep(900); };
  await mp.goto(`${url}#b4`, { waitUntil: 'load' }); await mp.reload({ waitUntil: 'load' }); await sleep(500);
  await swipe(-300); check('手机上滑 300px → 下一拍', await beat(mp), 5);
  await swipe(300); check('手机下滑 → 上一拍', await beat(mp), 4);
  await swipe(-900, 3000); check('手机猛甩 900px → 只前进 1 拍', await beat(mp), 5);
  check('手机端提示文字', await mp.evaluate(() => document.getElementById('hint').textContent), '上滑翻页');
  await mctx.close();
}

/* ------------------------------------------------------------------ */
/* 4. file:// 直接双击打开：能翻页、没有外部请求、机器人图能解码           */
/* ------------------------------------------------------------------ */
/* 实验入口可点击、可聚焦，HTTP 返回字节与本地源文件一致；file:// 保留同一目标。 */
async function localReferences(page, url, name) {
  const links = await page.evaluate(() => {
    const d = JSON.parse(document.getElementById('stage-data').textContent), seen = new Set();
    return [...document.querySelectorAll('.scene a.hit[href]')].flatMap(a => {
      const href = a.getAttribute('href');
      if (/^(?:[a-z][a-z0-9+.-]*:|[?#])/i.test(href) || seen.has(href)) return [];
      seen.add(href);
      const host = a.closest('.s'), scene = a.closest('.scene').dataset.scene;
      const index = d.beats.findIndex(b => b.scene === scene && Number(host.dataset.at) <= b.step &&
        (host.dataset.until == null || b.step < Number(host.dataset.until)));
      return [{href, label:a.getAttribute('aria-label'), beat:index + 1}];
    });
  });
  for (const link of links) {
    check(name + ' 本地入口有对应分镜', link.beat > 0, true);
    if (!link.beat) continue;
    await page.goto(url + '#b' + link.beat); await page.reload(); await sleep(500);
    const anchor = page.getByRole('link', {name:link.label, exact:true});
    check(name + ' 本地入口可聚焦', await anchor.getAttribute('tabindex'), '0');
    check(name + ' 本地入口保留原始路径', await anchor.getAttribute('href'), link.href);
    await anchor.click({trial:true}); await anchor.focus();
    await page.keyboard.press('Space');
    check(name + ' 本地链接上空格不翻页', Number((await page.locator('#count').textContent()).split('/')[0]), link.beat);
    const target = decodeURIComponent(new URL(link.href, pathToFileURL(path.join(SERIAL, folder, '互动版.html')).href).pathname);
    const valid = target.startsWith(ROOT + path.sep) && fs.existsSync(target) && fs.statSync(target).isFile();
    check(name + ' 本地入口目标文件存在', valid, true);
    const series = require('../serial_units.json').find(unit => link.href === '../' + unit.id + '.html');
    if (series) {
      check(name + ' 学习地图链接名称与系列配置一致', link.label, series.name + '，打开系列目录');
    } else {
      check(name + ' 本地入口也保留在正文', fs.readFileSync(path.join(SERIAL, folder, '正文.md'), 'utf8').includes('](' + link.href + ')'), true);
    }
    if (valid && url.startsWith('http')) {
      const response = await page.request.get(new URL(link.href, url).href);
      check(name + ' 本地入口响应字节与源文件一致', response.ok() && (await response.body()).equals(fs.readFileSync(target)), true);
    }
  }
}

async function actions(browser, url) {
  console.log('\n[缩略目录、翻面卡与末页入口]');
  const expectedSources = (fs.readFileSync(path.join(SERIAL, folder, '正文.md'), 'utf8').match(/^https:\/\/\S+/gm) || []).length;
  for (const name of ['desk', 'mob']) {
    const ctx = await browser.newContext(VPS[name]);
    const p = await ctx.newPage();
    await p.goto(url);
    const indices = await p.evaluate(() => {
      const d = JSON.parse(document.getElementById('stage-data').textContent);
      const hasCards = b => {
        const scene = [...document.querySelectorAll('.scene')].find(s => s.dataset.scene === b.scene);
        return scene && [...scene.querySelectorAll('[data-flip]')].some(card => {
          const host = card.closest('.s');
          return Number(host.dataset.at) <= b.step && (host.dataset.until == null || b.step < Number(host.dataset.until));
        });
      };
      return { exercise: d.beats.findIndex(b => !b.reveal && hasCards(b)) + 1,
        answer: d.beats.findIndex(b => b.reveal) + 1, refs: d.beats.findIndex(b => b.scene === 'refs') + 1, map: d.beats.findIndex(b => b.scene === 'map') + 1, sections: d.sections.length };
    });
    const closing = expectedSources ? indices.refs : indices.map;
    if (!indices.exercise || !indices.answer || !closing) { fail('没有完整的动作卡或对应正文的末页场景'); await ctx.close(); continue; }
    const open = async n => { await p.goto(`${url}#b${n}`); await p.reload(); await sleep(500); };
    const cards = () => p.locator('.scene.is-active [data-flip][tabindex="0"]');
    await open(indices.exercise);
    check(`${name} 三张动作卡可以操作`, await cards().count(), 3);
    check(`${name} 动作卡初始正面`, await cards().evaluateAll(es => es.map(e => e.getAttribute('aria-pressed'))), ['false', 'false', 'false']);
    if (name === 'mob') await cards().nth(0).tap(); else await cards().nth(0).click();
    await sleep(350);
    check(`${name} 点击/轻点翻面`, await cards().nth(0).getAttribute('aria-pressed'), 'true');
    await cards().nth(0).focus();
    await p.keyboard.press('Space'); await sleep(350);
    check(`${name} 空格翻回`, await cards().nth(0).getAttribute('aria-pressed'), 'false');
    await p.keyboard.press('Enter'); await sleep(350);
    check(`${name} 回车翻面`, await cards().nth(0).getAttribute('aria-pressed'), 'true');
    check(`${name} 翻面不推进拍号`, await p.locator('#count').textContent(), `${indices.exercise} / ${await p.evaluate(() => JSON.parse(document.getElementById('stage-data').textContent).beats.length)}`);
    await p.setViewportSize(name === 'desk' ? { width: 390, height: 844 } : { width: 1000, height: 600 });
    await sleep(1000);
    check(`${name} 换横竖屏保留翻面状态`, await cards().nth(0).getAttribute('aria-pressed'), 'true');
    await open(indices.answer);
    check(`${name} 讲解拍展示三张答案`, await cards().evaluateAll(es => es.map(e => e.getAttribute('aria-pressed'))), ['true', 'true', 'true']);
    await cards().nth(0).focus();
    await p.keyboard.press('ArrowDown'); await sleep(900);
    check(`${name} 离开动作拍不把焦点留在隐藏卡上`, await p.evaluate(() => !!document.activeElement.closest('.hit')), false);
    await p.keyboard.press('Space'); await sleep(900);
    check(`${name} 离开动作卡后空格仍可翻页`, await p.evaluate(() => Number(document.getElementById('count').textContent.split('/')[0])), indices.answer + 2);
    await p.click('#btn-toc'); await sleep(300);
    check(`${name} 每节目录都有道具缩略图`, await p.locator('.toc-card .toc-thumb').count(), indices.sections);
    const tocProblems = await p.evaluate(() => {
      const t = document.getElementById('toc'), r = t.getBoundingClientRect();
      return r.left < 0 || r.right > innerWidth + 1 || t.scrollWidth > t.clientWidth + 1;
    });
    check(`${name} 目录没有横向溢出`, tocProblems, false);
    await p.keyboard.press('Escape');
    await localReferences(p, url, name);
    await open(closing);
    if (!expectedSources) {
      const expectedMap = require('../serial_units.json').map(unit => '../' + unit.id + '.html');
      check(name + ' 学习地图含五套独立系列入口', await p.locator('.scene.is-active a.hit[tabindex="0"]').evaluateAll(es => es.map(e => e.getAttribute('href')).filter(h => !h.startsWith('?'))), expectedMap);
      check(name + ' 无来源段不增加虚构的资料目录', await p.locator('.toc-card').filter({hasText:'资料来源'}).count(), 0);
    }
    check(`${name} 原始资料链接数量与正文相同`, await p.locator('.scene.is-active a[href^="https://"][tabindex="0"]').count(), expectedSources);
    check(`${name} 非当前场景没有可聚焦道具`, await p.locator('.scene:not(.is-active) .hit[tabindex="0"]').count(), 0);
    await p.locator('.scene.is-active [data-action="read"][tabindex="0"]').click();
    check(`${name} 末页可回全文`, await p.evaluate(() => document.documentElement.dataset.mode), 'read');
    await ctx.close();
  }
}

async function fileOpen(browser) {
  console.log('\n[file:// 打开]');
  const ctx = await browser.newContext(VPS.desk);
  const p = await ctx.newPage();
  const errs = [], reqs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  p.on('requestfailed', r => errs.push('请求失败: ' + r.url()));
  p.on('request', r => reqs.push(r.url()));
  await p.goto(pathToFileURL(path.join(SERIAL, folder, '互动版.html')).href, { waitUntil: 'load' });
  await sleep(600);
  await p.keyboard.press('ArrowDown'); await sleep(500);
  check('file:// 下按 ↓ 能翻页', await p.evaluate(() => document.getElementById('count').textContent.split('/')[0].trim()), '2');
  const robot = await p.evaluate(async () => { const i = new Image(); i.src = document.querySelector('.scene image').getAttribute('href'); try { await i.decode(); return [i.naturalWidth, i.naturalHeight]; } catch (e) { return String(e); } });
  check('机器人图片能解码', robot, [480, 439]);
  check('外部请求数', reqs.filter(u => !u.startsWith('file://') && !u.startsWith('data:')).length, 0);
  await localReferences(p, pathToFileURL(path.join(SERIAL, folder, '互动版.html')).href, 'file://');
  check('报错', errs, []);
  await ctx.close();
}

(async () => {
  const server = await serve();
  const url = `http://127.0.0.1:${server.address().port}/${encodeURIComponent('青少年AI科普连载')}/${encodeURIComponent(folder)}/${encodeURIComponent('互动版.html')}`;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: process.env.CHROMIUM_PATH ? [] : ['--no-sandbox'] });
  try {
    if (groups.has('layout')) await layout(browser, url);
    if (groups.has('contrast')) await contrast(browser, url);
    if (groups.has('gesture')) await gestures(browser, url);
    if (groups.has('actions')) await actions(browser, url);
    if (groups.has('file')) await fileOpen(browser);
  } finally {
    await browser.close();
    server.close();
  }
  console.log(failures ? `\n${failures} 项未通过` : `\nPASS: 第 ${nn} 篇互动版浏览器检查全部通过（${[...groups].join('、')}）`);
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
