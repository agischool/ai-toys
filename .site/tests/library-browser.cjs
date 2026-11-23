/* 阅读入口回归：标题直达、搜索、窄屏、无脚本与本地文件。
 * 使用现有浏览器环境：PLAYWRIGHT_MODULE / CHROMIUM_PATH。
 * 不安装依赖，不修改文章正文或互动运行时。 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ROOT = path.resolve(__dirname, '../..');
const units = require('../serial_units.json');
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://local').pathname);
  const file = path.resolve(ROOT, '.' + (rel === '/' ? '/index.html' : rel));
  if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); res.end(); return;
  }
  const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' };
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
let browser;
async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/#b3');
  await page.waitForFunction(() => document.getElementById('stage')?.classList.contains('ready'));
  assert.equal(await page.locator('html').getAttribute('data-mode'), 'stage');
  assert.equal(new URL(page.url()).hash, '#b3');
  assert.equal(new URL(page.url()).search, '?stage');
  const readerURL = page.url();
  const sections = await page.evaluate(() => JSON.parse(document.getElementById('stage-data').textContent).sections.map(s => s.first + 1));
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const n of sections) {
      await page.goto(readerURL.split('#')[0] + '#b' + n);
      await page.waitForFunction(n => Number(document.getElementById('count').textContent.split('/')[0]) === n, n);
      const issues = await page.locator('.hud .pill').evaluateAll(nodes => {
        const boxes = nodes.map(n => n.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0);
        const bad = boxes.some(r => r.left < 0 || r.right > innerWidth + 1);
        const overlap = boxes.some((a, i) => boxes.some((b, j) => j > i && a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1));
        return bad || overlap;
      });
      assert.equal(issues, false, width + 'px 第' + n + '拍顶栏');
      assert.ok(await page.locator('.hud .reader-site').isVisible());
    }
  }
  await page.locator('.hud .reader-site').click();
  await page.waitForURL('**/library.html');
  assert.equal(await page.locator('.site-entry').count(), 3);
  const siteEntries = await page.locator('.site-entry').evaluateAll(nodes => nodes.map(n => n.href));
  for (const href of siteEntries.slice(1)) {
    await page.goto(href);
    await page.locator('header .brand').click();
    await page.waitForURL('**/library.html');
  }
  await page.goto(readerURL.replace('?stage', '?read'));
  await page.locator('.read-bar .reader-site').click();
  await page.waitForURL('**/library.html');
  console.log('✓ 阅读器顶栏和全文均一步返回全站，三类内容直达，子项目品牌链接可返回；各节顶栏四尺寸无遮挡');
  await page.goto(readerURL);
  await page.locator('#btn-toc').click();
  assert.equal(await page.locator('.reader-article').count(), 24);
  assert.equal(await page.locator('.reader-article[aria-current="page"]').count(), 1);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 640 });
    await page.locator('.reader-library details').evaluateAll(nodes => nodes.forEach(n => n.open = true));
    assert.ok(await page.locator('#toc').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
    assert.ok(await page.locator('.toc-body').evaluate(el => el.scrollHeight > el.clientHeight));
  }
  await page.locator('.reader-article').last().click();
  await page.waitForFunction(() => document.getElementById('stage')?.classList.contains('ready'));
  assert.ok(decodeURIComponent(page.url()).includes('/24_'));
  assert.equal(new URL(page.url()).search, '?stage');
  await page.goto(base + '/index.html?read');
  await page.waitForSelector('#read', { state: 'visible' });
  assert.equal(await page.locator('html').getAttribute('data-mode'), 'read');
  await page.goto(base + '/index.html#interactive');
  await page.waitForURL('**/library.html#interactive');
  const reduced = await browser.newContext({ reducedMotion: 'reduce' });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(base + '/index.html');
  await reducedPage.waitForFunction(() => document.getElementById('stage')?.classList.contains('ready'));
  assert.equal(await reducedPage.locator('html').getAttribute('data-mode'), 'stage');
  await reduced.close();
  console.log('✓ 根地址无需点击即进入分镜，保留拍号和全文入口；阅读器可选全部 24 篇，窄屏目录可滚动');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base + '/library.html');
  const links = await page.locator('.reading-title').evaluateAll(nodes => nodes.map(n => n.href));
  assert.equal(links.length, 24);
  assert.equal(new Set(links).size, 24);
  for (const href of links) {
    assert.ok(decodeURIComponent(href).endsWith('/互动版.html'));
    const response = await page.request.get(href);
    assert.equal(response.status(), 200);
    assert.match(await response.text(), /id="stage-data"/);
  }
  assert.equal(await page.locator('.reading-material:visible').count(), 24);
  for (const unit of units) {
    assert.equal(await page.locator('#' + unit.id + ' .reading-title').count(), unit.to - unit.from + 1);
  }
  console.log('✓ 搜索目录中 24 篇标题唯一、全部直达可读取的互动 HTML，素材入口保留');

  const search = page.locator('[data-search]');
  for (const [query, count] of [['专家', 1], ['语言', 4], ['前文', 5], ['不存在的关键词xyz', 0], ['', 24]]) {
    await search.fill(query);
    assert.equal(await page.locator('.reading-title:visible').count(), count, query);
    assert.equal(await page.locator('#result-count').innerText(), count + ' / 24 篇');
    assert.equal(await page.locator('#empty-state').isVisible(), count === 0);
  }
  await search.fill('不存在的关键词xyz');
  await page.locator('.unit-nav a[href="#training"]').click();
  assert.equal(await search.inputValue(), '');
  assert.equal(await page.locator('.reading-title:visible').count(), 24);
  assert.equal(new URL(page.url()).hash, '#training');
  console.log('✓ 搜索、实际可见条目、空结果、清空恢复及主题跳转通过');

  await page.goto(base + '/library.html');
  await page.getByRole('link', { name: '开始互动阅读', exact: true }).click();
  assert.equal(page.url(), links[0]);
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => location.hash === '#b2');
  await page.goto(base + '/library.html');
  await page.locator('.reading-title').last().click();
  assert.equal(page.url().split('#')[0], links[23]);
  console.log('✓ 首屏按钮一步打开第 01 篇并可翻页，第 24 篇一步打开');

  for (const unit of units) {
    await page.goto(base + '/' + encodeURIComponent('青少年AI科普连载') + '/' + unit.id + '.html');
    assert.equal(await page.locator('.reading-title').count(), unit.to - unit.from + 1);
    assert.equal(await page.locator('.reading-title').first().getAttribute('href'), new URL(links[unit.from - 1]).pathname.split('/').slice(-2).join('/'));
    assert.equal(await page.locator('.reading-material').count(), unit.to - unit.from + 1);
  }
  await page.locator('.reading-material').first().click();
  const materialURL = page.url();
  assert.equal(await page.getByRole('link', { name: '打开互动版', exact: true }).count(), 1);
  const copy = page.locator('[data-copy]').first();
  const field = await copy.getAttribute('data-copy');
  const status = await copy.getAttribute('data-status');
  await copy.click();
  await page.waitForFunction(id => document.getElementById(id).textContent.includes('已复制'), status);
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await page.locator('#' + field).inputValue());
  console.log('✓ 五套系列均直达互动版，素材页打开互动版及复制功能通过');

  const routes = ['/library.html', '/' + encodeURIComponent('青少年AI科普连载') + '/index.html', '/' + encodeURIComponent('青少年AI科普连载') + '/training.html', new URL(materialURL).pathname, '/.site/readmes/README.html'];
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(base + route);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), width + ': ' + route);
      const missing = await page.locator('img').evaluateAll(nodes => nodes.filter(n => n.complete && !n.naturalWidth).map(n => n.src));
      assert.deepEqual(missing, []);
    }
  }
  console.log('✓ 搜索目录、系列、素材及说明页在 320/390/768/1440px 无横向溢出');
  for (const file of ['chapters.html', 'index.html', ...Array.from({ length: 9 }, (_, i) => 't' + (i + 2) + '.html')]) {
    await page.goto(base + '/' + encodeURIComponent('Python实现') + '/docs/' + file);
    assert.equal(await page.locator('header .site-return').getAttribute('href'), 'https://agischool.github.io/ai-toys/library.html');
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.locator('header .site-return').isVisible(), file + ' ' + width + 'px 全站入口');
      assert.ok(await page.locator('header').evaluate(header => header.scrollWidth <= header.clientWidth + 1), file + ' ' + width + 'px 顶栏');
    }
  }
  console.log('✓ 11 个代码实验页面均有可见的全站返回入口，独立项目仍可运行');
  const offline = await browser.newContext({ javaScriptEnabled: false });
  const plain = await offline.newPage();
  await plain.goto(base + '/library.html');
  assert.equal(await plain.locator('.reading-title:visible').count(), 24);
  await plain.goto(base + '/index.html');
  await plain.waitForURL('**/*?stage');
  assert.equal(await plain.locator('#read:visible').count(), 1);
  await offline.close();
  await page.goto(pathToFileURL(path.join(ROOT, 'library.html')).href);
  assert.equal(await page.locator('.reading-title:visible').count(), 24);
  await page.locator('[data-search]').fill('专家');
  assert.equal(await page.locator('.reading-title:visible').count(), 1);
  await page.locator('.reading-title:visible').click();
  assert.equal(new URL(page.url()).protocol, 'file:');
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => location.hash === '#b2');
  await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href);
  await page.waitForFunction(() => document.getElementById('stage')?.classList.contains('ready'));
  assert.equal(new URL(page.url()).protocol, 'file:');
  assert.equal(await page.locator('html').getAttribute('data-mode'), 'stage');
  assert.deepEqual(errors, []);
  console.log('✓ 无脚本可读完整目录，file:// 搜索、阅读、翻页通过；无页面异常');
}
main().then(() => console.log('阅读入口浏览器回归全部通过')).catch(error => {
  console.error(error); process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close();
  server.close();
});
