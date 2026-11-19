/* 生成连载文章的互动版（互动版.html）。
 * 输入：正文.md（文字的唯一来源）+ 分镜.json（每一拍取几句、用哪个场景和镜头）+ stage/scenes/NN.cjs（画面）。
 * 只有文件夹里有 分镜.json 的文章才会生成。文字一句不多、一句不少地落进各拍，对不上就构建失败。
 * 用法：node .site/render_stage.cjs [文章文件夹]   省略参数时处理全部有分镜的文章。 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const MarkdownIt = require('./vendor/markdown-it.cjs');
const { splitSentences, splitCitation, splitTitle } = require('./stage/text.cjs');
const { esc } = require('./stage/art.cjs');

const root = path.resolve(__dirname, '..');
const base = path.join(root, '青少年AI科普连载');
const units = require('./serial_units.json');

/* ---------------- 正文 → 文字单元 ---------------- */

/* 单元类型：h1 标题 / h2 小节标题 / p 正文句 / cap 图说句。图片行与「资料来源」不进分镜。 */
/* 字幕消费可见文字；链接目标保留在全文，场景也可提供独立入口。
 * 用 Markdown 解析器识别链接及行内代码，避免 URL 标点参与中文切句。
 * 其余富文本仍显式拒绝，防止悄悄遗漏格式承载的内容。 */
const inlineMd = new MarkdownIt({ html: false, linkify: false, typographer: false });
function inlineText(line, file) {
  if (!/[*_`]|\]\(/.test(line)) return line;
  const tokens = inlineMd.parseInline(line, {})[0].children || [];
  if (tokens.some(t => !['text', 'code_inline', 'link_open', 'link_close'].includes(t.type)) ||
      tokens.some(t => t.type === 'text' && t.content.includes(']('))) {
    throw new Error(file + ': 互动版暂不支持这行里的 Markdown 标记：' + line.slice(0, 30));
  }
  return tokens.filter(t => t.type === 'text' || t.type === 'code_inline').map(t => t.content).join('');
}

function parseUnits(source, file) {
  const body = source.split(/^## 资料来源\s*$/m)[0];
  const out = [];
  for (const raw of body.split('\n')) {
    // 引用提示进入字幕时保留文字，去掉 Markdown 的单层引用标记。
    const line = raw.trim().replace(/^>\s?/, '');
    if (!line || /^!\[/.test(line)) continue;
    let m;
    if ((m = line.match(/^# (.+)$/))) out.push({ type: 'h1', text: m[1] });
    else if ((m = line.match(/^## (.+)$/))) out.push({ type: 'h2', text: m[1] });
    else if ((m = line.match(/^\*([^*]+)\*$/))) splitSentences(m[1]).forEach(s => out.push({ type: 'cap', text: s }));
    else {
      splitSentences(inlineText(line, file)).forEach(s => out.push({ type: 'p', text: s }));
    }
  }
  return out;
}

/* 脚注编号着色；图说开头的「图1」加粗。 */
function unitHtml(u, secNum) {
  const { body, cite } = splitCitation(u.text);
  let h = esc(body);
  if (u.type === 'cap') h = h.replace(/^(图\d+)\s+/, '<b class="fig">$1</b> ');
  if (u.type === 'h2') h = `<b class="no">${secNum}</b><span>${h}</span>`;
  if (cite) h += `<span class="cite">${esc(cite)}</span>`;
  return h;
}

/* ---------------- 分镜 → 拍 ---------------- */

function assemble(allUnits, board, file) {
  /* 小节：第 0 节是第一个 h2 之前的导读，之后每个 h2 一节。 */
  const secOf = [];
  const sections = [{ num: 0, label: '导读', mark: '导', first: -1 }];
  allUnits.forEach(u => {
    if (u.type === 'h2') sections.push({ num: sections.length, label: u.text, first: -1 });
    secOf.push(sections.length - 1);
  });
  const sectionCount = sections.length - 1;

  let cursor = 0;
  const beatsOut = [];
  const beats = board.beats.map((b, i) => {
    const take = b.take == null ? 1 : b.take;
    if (!Number.isInteger(take) || take < 0) throw new Error(`${file} 分镜第 ${i + 1} 拍：take 必须是非负整数`);
    const taken = allUnits.slice(cursor, cursor + take);
    const where = `${file} 分镜第 ${i + 1} 拍`;
    if (take > 0 && taken.length !== take) throw new Error(`${where}：正文只剩 ${taken.length} 句，要取 ${take} 句`);
    if (take > 0 && (typeof b.from !== 'string' || !b.from)) throw new Error(`${where}：缺少 from 句首校验`);
    if (take > 0 && !taken[0].text.startsWith(b.from)) {
      throw new Error(`${where}：应从「${b.from}」开始，实际是「${taken[0].text.slice(0, 16)}」`);
    }
    if (take > 1 && taken.some(u => /^h[12]$/.test(u.type))) throw new Error(`${where}：标题要单独成拍`);
    let section = take > 0 ? secOf[cursor] : (i ? beatsOut[i - 1].section : 0);
    if (b.refs) {
      if (take !== 0) throw new Error(`${where}：资料来源拍不消费正文单元`);
      let idx = sections.findIndex(s => s.mark === '源');
      if (idx < 0) { idx = sections.length; sections.push({ num: 0, mark: '源', label: '资料来源', first: -1 }); }
      section = idx;
    }
    cursor += take;
    const first = take > 0 ? taken[0] : { type: 'p' };
    const out = {
      scene: b.scene, step: b.step, cam: b.cam,
      html: taken.map(u => unitHtml(u, section)).join(''),
      kind: first.type === 'h1' ? 'title' : first.type === 'h2' ? 'h2' : first.type === 'cap' ? 'caption' : 'text',
      chars: taken.reduce((n, u) => n + u.text.replace(/\s/g, '').length, 0),
      section
    };
    if (b.quiet) out.quiet = true;
    if (b.focus) out.focus = b.focus;
    if (b.solo) out.solo = true;
    if (b.reveal) out.reveal = true;
    beatsOut.push(out);
    return out;
  });
  beats.forEach((b, i) => { if (sections[b.section].first < 0) sections[b.section].first = i; });
  if (board.complete) {
    if (cursor !== allUnits.length) throw new Error(`${file}：分镜声明已完成，但正文还剩 ${allUnits.length - cursor} 句没有进任何一拍（下一句：${allUnits[cursor].text.slice(0, 16)}）`);
  }
  return { beats, sections: sections.filter(s => s.first >= 0), sectionCount, consumed: cursor, total: allUnits.length };
}

/* ---------------- 全文模式 ---------------- */

/* 全文页的类名（pic / figcap）要和分镜的字幕卡（.cap）、图说前缀（.fig）分开：
 * 同名会让全文页的图说被画成悬在页面底部的字幕卡。 */
function renderRead(source, title) {
  const md = new MarkdownIt({ html: false, linkify: true, typographer: false });
  // 文件名（如 adapters.py）不是省略协议的网址；显式 URL 和 Markdown 链接照常保留。
  md.linkify.set({ fuzzyLink: false });
  md.renderer.rules.paragraph_open = (tokens, i) => {
    const inline = tokens[i + 1];
    const kids = (inline && inline.children) || [];
    if (kids.some(t => t.type === 'image')) return '<p class="pic">';
    if (kids[0] && kids[0].type === 'em_open' && kids[kids.length - 1].type === 'em_close') return '<p class="figcap">';
    return '<p>';
  };
  md.renderer.rules.image = (tokens, i) => {
    const t = tokens[i];
    return `<img alt="${esc(t.content)}" src="${encodeURI(decodeURIComponent(t.attrGet('src')))}" loading="lazy">`;
  };
  md.renderer.rules.em_open = (tokens, i, o, e, self) => (tokens[i - 1] && tokens[i - 1].type === 'inline') ? self.renderToken(tokens, i, o) : '<em>';
  const prevLink = md.renderer.rules.link_open || ((t, i, o, e, self) => self.renderToken(t, i, o));
  md.renderer.rules.link_open = (tokens, i, o, env, self) => {
    tokens[i].attrSet('rel', 'noopener noreferrer');
    return prevLink(tokens, i, o, env, self);
  };
  md.renderer.rules.text = (tokens, i) => esc(tokens[i].content).replace(/〔\d+(?:[,，、]\d+)*〕/g, x => `<span class="cite">${x}</span>`);
  let h = md.render(source);
  /* 标题按全角标点分成两段，各段不再断行（手机上不会把「什么」拆开）。 */
  const [t1, t2] = splitTitle(title);
  h = h.replace(/<h1>[\s\S]*?<\/h1>/, `<h1><span class="tl">${esc(t1)}</span>${t2 ? ` <span class="tl">${esc(t2)}</span>` : ''}</h1>`);
  /* 「资料来源」之后的段落放进 .refs，字号小一档。 */
  h = h.replace(/(<h2>资料来源<\/h2>)([\s\S]*)$/, '$1<div class="refs">$2</div>');
  return h;
}

/* ---------------- 页面 ---------------- */

const ICON_UP = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 10.5 8 5.5l5 5"/></svg>';
const ICON_DOWN = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 5.5 8 10.5l5-5"/></svg>';
const ICON_LIST = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01"/></svg>';

function page({ title, summary, sceneSvgs, data, read, unit, local, count, hasNext }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  /* 共用源码在构建时打包，file:// 不必再读取隐藏目录里的 CSS/JS。 */
  const css = fs.readFileSync(path.join(__dirname, 'stage/stage.css'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, 'stage/stage.js'), 'utf8');
  const pager = `第 ${local} 篇 / 共 ${count} 篇`;
  return `<!doctype html>
<html lang="zh-CN" data-mode="read">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#fffdf6">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Ccircle cx='10' cy='10' r='8.25' fill='none' stroke='%23185b46' stroke-width='1.5'/%3E%3Ccircle cx='10' cy='10' r='3.4' fill='%23185b46'/%3E%3C/svg%3E">
<title>${esc(title)} · 互动版 · 看得见的 AI</title>
<meta name="description" content="${esc(summary)}">
<style data-stage-source="stage.css">${css}</style>
<script>(function(){var q=new URLSearchParams(location.search),r=matchMedia('(prefers-reduced-motion: reduce)').matches;if(!(q.has('read')||(r&&!q.has('stage'))))document.documentElement.setAttribute('data-mode','stage')})()</script>
</head>
<body>
<a class="skip" href="?read" data-action="read">跳到全文</a>
<main id="stage" data-orient="landscape">
${sceneSvgs}
<header class="hud">
<div class="hud-l">
<button class="pill" id="btn-toc" type="button" aria-haspopup="dialog" aria-label="目录">${ICON_LIST}<span class="lbl" aria-hidden="true">目录</span></button>
<span class="pill sec" id="sec"><span id="sec-num"></span><span id="sec-name"></span></span>
</div>
<div class="hud-r">
<button class="pill" id="btn-play" type="button" data-playing="false">播放</button>
<a class="pill" href="?read" data-action="read">全文</a>
</div>
</header>
<div class="cap" id="capcard" role="status" aria-live="polite" aria-atomic="true"><p id="cap"></p></div>
<footer class="foot">
<p id="hint"></p>
<div class="steps">
<button class="pill icon" id="btn-prev" type="button" aria-label="上一拍">${ICON_UP}</button>
<span id="count"></span>
<button class="pill icon" id="btn-next" type="button" aria-label="下一拍">${ICON_DOWN}</button>
</div>
<div id="bar"></div>
</footer>
</main>
<dialog id="toc" aria-labelledby="toc-title">
<div class="toc-head"><h2 id="toc-title">${esc(title)}</h2><button class="pill" id="toc-close" type="button">关闭</button></div>
<ol id="toc-list"></ol>
<p class="toc-foot">${esc(unit)}，${pager}。机器人角色为 AI 辅助制作，场景与图解由代码绘制。</p>
</dialog>
<div id="readwrap">
<div class="read-bar"><a class="pill" href="?stage" data-action="stage">看分镜版</a><a class="pill" href="index.html">返回本篇页面</a></div>
<article id="read" lang="zh-CN">
${read}
<div class="read-end"><a class="pill" href="?stage" data-action="stage">看分镜版</a><a class="pill" href="正文.md">查看正文 Markdown</a></div>
<p class="read-note">${esc(unit)}，${pager}。机器人角色为 AI 辅助制作，场景与图解由代码绘制。</p>
</article>
</div>
<script type="application/json" id="stage-data">${json}</script>
<script data-stage-source="stage.js">${js}</script>
</body>
</html>
`;
}

/* ---------------- 主流程 ---------------- */

function compileOne(folder) {
  const dir = path.join(base, folder);
  const boardFile = path.join(dir, '分镜.json');
  if (!fs.existsSync(boardFile)) return null;
  const nn = folder.slice(0, 2);
  const source = fs.readFileSync(path.join(dir, '正文.md'), 'utf8');
  const board = JSON.parse(fs.readFileSync(boardFile, 'utf8'));
  const allUnits = parseUnits(source, folder);
  const title = allUnits[0].text;
  const unit = units.find(u => Number(nn) >= u.from && Number(nn) <= u.to);
  const local = Number(nn) - unit.from + 1;
  const count = unit.to - unit.from + 1;
  const asm = assemble(allUnits, board, folder);

  const makeScenes = require(path.join(__dirname, 'stage/scenes', `${nn}.cjs`));
  const references = (source.split(/^## 资料来源\s*$/m)[1] || '').match(/^https:\/\/\S+/gm) || [];
  const scenes = makeScenes({ title, titleLines: splitTitle(title), unit, local, count, references });
  if (makeScenes.thumbnail) asm.sections.forEach(s => { s.thumbnail = makeScenes.thumbnail(s); });
  const byId = new Map(scenes.map(s => [s.id, s]));
  asm.beats.forEach((b, i) => {
    const sc = byId.get(b.scene);
    if (!sc) throw new Error(`${folder} 分镜第 ${i + 1} 拍：没有场景「${b.scene}」`);
    if (!sc.cams[b.cam]) throw new Error(`${folder} 分镜第 ${i + 1} 拍：场景「${b.scene}」没有镜头「${b.cam}」`);
  });
  /* step 与 focus 要对得上场景。写错名字时聚焦会把整个画面压暗或藏光，而 stage-browser 的版面检查
   * 对被压暗的元素不设防，会空过；所以在构建时就拦住。 */
  asm.beats.forEach((b, i) => {
    const sc = byId.get(b.scene);
    const where = `${folder} 分镜第 ${i + 1} 拍（场景 ${b.scene}）`;
    const els = [...sc.svg.matchAll(/<g class="s [^"]*" data-at="(\d+)"(?: data-until="(\d+)")?(?: data-n="([^"]*)")?/g)]
      .map(m => ({ at: Number(m[1]), until: m[2] == null ? null : Number(m[2]), n: m[3] || '' }));
    const last = els.length ? Math.max(...els.map(e => e.at)) : 0;
    if (!Number.isInteger(b.step) || b.step < 0 || b.step > last) throw new Error(`${where}：step ${b.step} 超出该场景的步号范围 0–${last}`);
    if (b.solo && !(b.focus && b.focus.length)) throw new Error(`${where}：solo 要和 focus 一起写`);
    for (const f of b.focus || []) {
      const hit = els.filter(e => e.n === f || e.n.startsWith(f + '.'));
      if (!hit.length) throw new Error(`${where}：focus 里的「${f}」在场景里没有任何元素叫这个名字（或以「${f}.」开头）`);
      if (!hit.some(e => e.at <= b.step && (e.until == null || b.step < e.until))) throw new Error(`${where}：focus 里的「${f}」在 step ${b.step} 时还没出现或已消失`);
    }
  });
  const used = new Set(asm.beats.map(b => b.scene));
  const activeScenes = scenes.filter(s => used.has(s.id));

  const sceneSvgs = activeScenes.map(s =>
    `<svg class="scene" data-scene="${s.id}" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="分镜画面" aria-hidden="true" focusable="false"><g class="cam">${s.svg}</g></svg>`).join('\n');
  const data = {
    total: asm.beats.length, sectionCount: asm.sectionCount, sections: asm.sections,
    scenes: Object.fromEntries(activeScenes.map(s => [s.id, { cams: s.cams }])), beats: asm.beats
  };
  const summary = (fs.readFileSync(path.join(dir, '发布文案.md'), 'utf8').match(/## 摘要\s+```text\n([\s\S]*?)\n```/) || [, title])[1];
  const html = page({ title, summary, sceneSvgs, data, read: renderRead(source, title), unit: unit.name, local, count });
  return { folder, html, beats: asm.beats.length, consumed: asm.consumed, total: asm.total, bytes: Buffer.byteLength(html), complete: !!board.complete };
}

function renderOne(folder) {
  const result = compileOne(folder);
  if (!result) return null;
  const { html, ...stats } = result;
  fs.writeFileSync(path.join(base, folder, '互动版.html'), html);
  return stats;
}

/* 写分镜时的参照：列出一篇正文的全部文字单元，标出已被分镜取走的部分（没有分镜.json 的文章也能列）。 */
function listUnits(folder) {
  const dir = path.join(base, folder);
  const units = parseUnits(fs.readFileSync(path.join(dir, '正文.md'), 'utf8'), folder);
  const boardFile = path.join(dir, '分镜.json');
  const used = fs.existsSync(boardFile)
    ? JSON.parse(fs.readFileSync(boardFile, 'utf8')).beats.reduce((n, b) => n + (b.take == null ? 1 : b.take), 0) : 0;
  units.forEach((u, i) => console.log(`${String(i).padStart(3)} ${i < used ? '已分' : '    '} ${u.type.padEnd(3)} ${u.text}`));
  console.log(`${folder}：共 ${units.length} 个文字单元，分镜已取走 ${Math.min(used, units.length)} 个`);
}

/* 用法：node .site/render_stage.cjs [编号或文件夹名] [--units]
 * 编号可以只写两位（01）。--units 只列文字单元，不生成页面。 */
function main() {
  const args = process.argv.slice(2);
  const only = args.find(a => !a.startsWith('--'));
  const folders = fs.readdirSync(base).filter(n => /^\d\d_/.test(n)).sort()
    .filter(n => !only || n === path.basename(only) || n.startsWith(only + '_'));
  if (!folders.length) { console.error('没有匹配的文章：' + only); process.exit(1); }
  if (args.includes('--units')) {
    folders.forEach(listUnits);
  } else {
    const done = folders.map(renderOne).filter(Boolean);
    done.forEach(r => console.log(`互动版 ${r.folder.slice(0, 2)}：${r.beats} 拍，正文 ${r.consumed}/${r.total} 句${r.complete ? '' : '（样片）'}，${(r.bytes / 1024).toFixed(0)}KB`));
    if (!done.length) console.log('没有带 分镜.json 的文章，跳过互动版');
  }
}

module.exports = { parseUnits, assemble, compileOne, renderOne };
if (require.main === module) main();
