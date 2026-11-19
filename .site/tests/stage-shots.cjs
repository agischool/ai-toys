/* 互动版逐拍截图 + 接触表：给人眼逐张看用。
 *
 * 为什么单独做一个：stage-browser.cjs 能量出「有没有遮挡、对比度够不够、字号大不大」，
 * 量不出「好不好看、顺不顺、有没有画错东西」——这些只能看。M1 的画面就是量一轮、看一轮、改一轮收敛的。
 *
 * 运行（环境变量同 stage-browser.cjs）：
 *   PLAYWRIGHT_MODULE=... CHROMIUM_PATH=... node .site/tests/stage-shots.cjs [文章编号，默认 01] [--out=目录]
 * 输出（默认写到系统临时目录，不进仓库）：
 *   <out>/desk-01.png … mob-NN.png 每拍一张（桌面 1440×900，手机 390×844@2x）
 *   <out>/sheet-desk-1.jpg …       接触表：每张格子左上角标拍号，桌面每页 6 拍，手机每页 8 拍
 * 接触表需要 Python 的 Pillow（pip install pillow）；没有就只出单拍截图。 */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');
const SERIAL = path.join(ROOT, '青少年AI科普连载');
const args = process.argv.slice(2);
const nn = args.find(a => /^\d\d$/.test(a)) || '01';
const firstBeat = Number((args.find(a => a.startsWith('--from=')) || '--from=1').slice(7));
const lastBeat = Number((args.find(a => a.startsWith('--to=')) || '--to=Infinity').slice(5));
if (!Number.isInteger(firstBeat) || firstBeat < 1 || !(lastBeat >= firstBeat)) throw new Error('无效的 --from / --to 拍号');
const outArg = (args.find(a => a.startsWith('--out=')) || '').slice(6);
const OUT = outArg || fs.mkdtempSync(path.join(os.tmpdir(), `stage-shots-${nn}-`));
fs.mkdirSync(OUT, { recursive: true });
const folder = fs.readdirSync(SERIAL).find(n => n.startsWith(nn + '_'));
if (!folder || !fs.existsSync(path.join(SERIAL, folder, '互动版.html'))) { console.error(`没有第 ${nn} 篇的 互动版.html，先运行：node .site/render_stage.cjs ${nn}`); process.exit(1); }
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const VPS = {
  desk: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mob: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
};

(async () => {
  const server = await new Promise(resolve => {
    const s = http.createServer((req, res) => {
      const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!f.startsWith(ROOT + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
      const t = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' }[path.extname(f)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': t }); fs.createReadStream(f).pipe(res);
    });
    s.listen(0, '127.0.0.1', () => resolve(s));
  });
  const url = `http://127.0.0.1:${server.address().port}/${encodeURIComponent('青少年AI科普连载')}/${encodeURIComponent(folder)}/${encodeURIComponent('互动版.html')}`;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: process.env.CHROMIUM_PATH ? [] : ['--no-sandbox'] });
  let total = 0;
  for (const [name, vp] of Object.entries(VPS)) {
    const page = await (await browser.newContext(vp)).newPage();
    await page.goto(url, { waitUntil: 'load' });
    total = await page.evaluate(() => JSON.parse(document.getElementById('stage-data').textContent).beats.length);
    for (let n = firstBeat; n <= Math.min(total, lastBeat); n++) {
      await page.goto(`${url}#b${n}`, { waitUntil: 'load' });
      await page.reload({ waitUntil: 'load' });
      await sleep(400);
      await page.screenshot({ path: path.join(OUT, `${name}-${String(n).padStart(2, '0')}.png`) });
    }
    await page.click('#btn-toc');
    await sleep(350);
    await page.screenshot({ path: path.join(OUT, `${name}-toc.png`) });
    await page.context().close();
  }
  await browser.close();
  server.close();

  const py = `
import glob, os, sys
try:
    from PIL import Image, ImageDraw
except ImportError:
    print('没有 Pillow，只输出了单拍截图（pip install pillow 后可出接触表）'); sys.exit(0)
out = sys.argv[1]
def sheets(prefix, cols, cell_w, per_page):
    files = sorted(glob.glob(os.path.join(out, prefix + '-[0-9][0-9].png')))
    for page, start in enumerate(range(0, len(files), per_page), 1):
        chunk = files[start:start + per_page]
        ims = [Image.open(f).convert('RGB') for f in chunk]
        h = round(cell_w * ims[0].height / ims[0].width)
        rows = (len(ims) + cols - 1) // cols
        S = Image.new('RGB', (cols * (cell_w + 8) + 8, rows * (h + 8) + 8), (110, 110, 110))
        d = ImageDraw.Draw(S)
        for i, im in enumerate(ims):
            x, y = 8 + (i % cols) * (cell_w + 8), 8 + (i // cols) * (h + 8)
            S.paste(im.resize((cell_w, h), Image.LANCZOS), (x, y))
            beat = os.path.splitext(os.path.basename(chunk[i]))[0].split('-')[-1]
            d.rectangle([x, y, x + 30, y + 20], fill=(255, 255, 255)); d.text((x + 5, y + 4), str(int(beat)), fill=(0, 0, 0))
        name = os.path.join(out, f'sheet-{prefix}-{page}.jpg')
        S.save(name, quality=86); print(name)
sheets('desk', 2, 640, 6)
sheets('mob', 4, 300, 8)
`;
  const r = spawnSync('python3', ['-c', py, OUT], { encoding: 'utf-8' });
  process.stdout.write(r.stdout || '');
  if (r.status) process.stderr.write(r.stderr || '');
  console.log(`\n第 ${firstBeat}—${Math.min(total, lastBeat)} 拍 × 2 种视口，含目录截图，已写入：${OUT}`);
})().catch(e => { console.error(e); process.exit(1); });
