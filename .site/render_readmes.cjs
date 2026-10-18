/* Render local Markdown with markdown-it 14.1.0 (MIT).
 * Vendored from npm markdown-it@14.1.0/dist/markdown-it.min.js;
 * license: vendor/markdown-it.LICENSE. No network or install needed at build time. */
const fs = require('node:fs');
const path = require('node:path');
const MarkdownIt = require('./vendor/markdown-it.cjs');
const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(__dirname, 'readmes');
const sources = [
  'README.md', 'Python实现/README.md', '少年AI观察室/README.md',
  '青少年AI科普连载/README.md', 'Python实现/tests/README.md',
  'Python实现/source/t1_python/README.md', 'Python实现/source/series_python/README.md'
];
const targets = new Map(sources.map(rel => [path.join(ROOT, rel), path.join(OUTPUT, rel.replace(/\.md$/, '.html'))]));
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const relativeURL = (from, to) => path.relative(path.dirname(from), to).split(path.sep).map(encodeURIComponent).join('/');
for (const rel of sources) {
  const source = path.join(ROOT, rel), destination = targets.get(source);
  const text = fs.readFileSync(source, 'utf8');
  const title = text.match(/^#\s+(.+)$/m)?.[1] || rel;
  const md = new MarkdownIt({html:true,linkify:false,typographer:false});
  function rewrite(value) {
    if (!value || value.startsWith('#') || /^(?:[a-z][\w+.-]*:|\/\/)/i.test(value)) return value;
    const match = value.match(/^([^?#]*)(.*)$/);
    const original = path.resolve(path.dirname(source), decodeURIComponent(match[1]));
    return relativeURL(destination, targets.get(original) || original) + match[2];
  }
  md.core.ruler.after('inline', 'local-paths-and-heading-ids', state => {
    const seen = new Map();
    function walk(tokens) {
      for (const token of tokens) {
        for (const key of ['href','src']) {
          const value=token.attrGet(key);if(value!==null)token.attrSet(key,rewrite(value));
        }
        // Raw <img> tags use fixed widths in GitHub's README tables.
        if(token.type==='html_inline'||token.type==='html_block') {
          token.content=token.content.replace(/\b(href|src)="([^"]*)"/g,(_,key,value)=>`${key}="${escape(rewrite(value))}"`);
        }
        if(token.children)walk(token.children);
      }
    }
    walk(state.tokens);
    for(let i=0;i<state.tokens.length;i++) {
      if(state.tokens[i].type!=='heading_open')continue;
      const label=state.tokens[i+1].content;
      const slug=label.toLowerCase().replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu,'').replace(/\s/g,'-');
      const count=seen.get(slug)||0;seen.set(slug,count+1);
      state.tokens[i].attrSet('id',slug+(count?`-${count}`:''));
    }
  });
  md.renderer.rules.table_open=()=>'<div class="readme-table"><table>\n';
  md.renderer.rules.table_close=()=>'</table></div>\n';
  const html=md.render(text);
  const home=relativeURL(destination,path.join(ROOT,'index.html'));
  const sourceURL=relativeURL(destination,source);
  const css=relativeURL(destination,path.join(__dirname,'library.css'));
  const nav=[['Python实现','Python 实现'],['少年AI观察室','少年 AI 观察室'],['青少年AI科普连载','青少年 AI 科普连载']].map(([name,label])=>`<a href="${relativeURL(destination,path.join(ROOT,name,'index.html'))}">${escape(label)}</a>`).join('');
  const document=`<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · 项目说明</title><link rel="stylesheet" href="${css}"></head>
<body><header><div class="header-inner"><a class="brand" href="${home}">◉ 看得见的 AI</a><nav aria-label="项目导航">${nav}</nav></div></header>
<main class="readme"><div class="actions"><a class="button secondary" href="${home}">返回三个项目</a><a class="text-link" href="${sourceURL}">查看 Markdown 源文件</a></div><article>${html}</article></main>
<footer><span>看得见的 AI · 图文说明</span><a class="text-link" href="${sourceURL}">Markdown 源文件</a></footer></body></html>\n`;
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.writeFileSync(destination,document);
}
console.log(`Built ${sources.length} illustrated README pages`);
