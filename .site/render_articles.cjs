/* Render the serial's Markdown source using its existing WeChat inline styles.
 * markdown-it is vendored locally; local images stay embedded for copying. */
const fs = require('node:fs');
const path = require('node:path');
const MarkdownIt = require('./vendor/markdown-it.cjs');
const root = path.resolve(__dirname, '..');
const units = require('./serial_units.json');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function renderArticle(file, label) {
  const directory = path.dirname(file);
  const source = fs.readFileSync(file, 'utf8');
  const title = source.match(/^# (.+)$/m)?.[1];
  if (!title) throw new Error(`Missing title: ${file}`);
  const md = new MarkdownIt({html: false, linkify: true, typographer: false});
  md.renderer.rules.heading_open = (tokens, i, options, env) => {
    const tag = tokens[i].tag;
    if (tag === 'h1') return `<section style="background:#14304A;color:#ffffff;padding:23px 20px;margin-bottom:26px;border-radius:6px;"><p style="font-size:12px;color:#BAD3E7;margin:0 0 12px;">${esc(label)}</p><h1 style="font-size:25px;line-height:1.45;margin:0;">`;
    if (tokens[i + 1]?.content === '资料来源') env.references = true;
    return `<${tag} style="font-size:20px;line-height:1.5;color:#14304A;margin:32px 0 16px;font-weight:700;">`;
  };
  md.renderer.rules.heading_close = (tokens, i) => tokens[i].tag === 'h1' ? '</h1></section>\n' : `</${tokens[i].tag}>\n`;
  md.renderer.rules.paragraph_open = (tokens, i, options, env) => {
    const inline = tokens[i + 1];
    const image = inline?.children?.some(t => t.type === 'image');
    const url = /^https?:\/\/\S+$/.test(inline?.content || '');
    const caption = inline?.children?.[0]?.type === 'em_open';
    const style = image ? 'text-align:center;margin:24px 0 8px;' : url
      ? 'font-size:13px;line-height:1.65;word-break:break-all;overflow-wrap:anywhere;margin:4px 0 18px;'
      : `font-size:${env.references || caption ? 14 : 17}px;line-height:${env.references ? 1.75 : 1.85};color:#303741;margin:0 0 18px;overflow-wrap:break-word;`;
    return `<p style="${style}">`;
  };
  md.renderer.rules.text = (tokens, i) => esc(tokens[i].content).replace(/〔\d+(?:[,，、]\d+)*〕/g, x => `<span style="color:#b15b21;">${x}</span>`);
  md.renderer.rules.image = (tokens, i) => {
    const token = tokens[i];
    const src = decodeURIComponent(token.attrGet('src'));
    const target = path.resolve(directory, src);
    if (!target.startsWith(directory + path.sep)) throw new Error(`Image outside article: ${src}`);
    const type = {'.png': 'png', '.jpg': 'jpeg', '.jpeg': 'jpeg', '.webp': 'webp'}[path.extname(target).toLowerCase()];
    if (!type) throw new Error(`Unsupported image: ${src}`);
    const data = fs.readFileSync(target).toString('base64');
    return `<img alt="${esc(token.content)}" src="data:image/${type};base64,${data}" style="max-width:100%;height:auto;display:block;margin:0 auto;">`;
  };
  const linkOpen = md.renderer.rules.link_open || ((t, i, o, e, self) => self.renderToken(t, i, o));
  md.renderer.rules.link_open = (tokens, i, options, env, self) => {
    tokens[i].attrSet('style', 'color:#265AAC;overflow-wrap:anywhere;');
    return linkOpen(tokens, i, options, env, self);
  };
  const body = md.render(source, {references: false});
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head><body style="margin:0;background:#f2f3f5;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;">
<main style="max-width:680px;margin:0 auto;padding:18px 16px 40px;background:white;">
<aside style="background:#fff8ec;color:#66502c;padding:14px;font-size:14px;line-height:1.7;margin-bottom:20px;">
<button onclick="selectArticle()" style="font-size:15px;padding:7px 14px;">选中正文</button><p style="margin-bottom:0;">选中后按 ⌘C 或 Ctrl+C，再到公众号编辑器粘贴。检查图片是否上传，并发送手机预览；未上传的图片请手动插入同目录 PNG。</p></aside>
<section id="article">${body}</section></main>
<script>function selectArticle(){const r=document.createRange();r.selectNodeContents(document.getElementById('article'));const s=window.getSelection();s.removeAllRanges();s.addRange(r);}</script></body></html>\n`;
  fs.writeFileSync(path.join(directory, '公众号_排版.html'), html);
}

if (process.argv[2]) {
  renderArticle(path.resolve(process.argv[2]), '青少年 AI 科普连载 · 工具调用样稿');
} else {
  const base = path.join(root, '青少年AI科普连载');
  const folders = fs.readdirSync(base).filter(name => /^\d\d_/.test(name)).sort();
  for (const folder of folders) {
    const unit = units.find(u => Number(folder.slice(0, 2)) >= u.from && Number(folder.slice(0, 2)) <= u.to);
    if (!unit) throw Error('Missing publication series for ' + folder);
    const local = Number(folder.slice(0, 2)) - unit.from + 1;
    renderArticle(path.join(base, folder, '正文.md'), `${unit.name} · 第 ${local} 篇 / 共 ${unit.to - unit.from + 1} 篇`);
  }
  console.log(`Rendered ${folders.length} WeChat articles from Markdown`);
}
