const fs=require('fs'),path=require('path');
const {pathToFileURL}=require('url');
const {chromium}=require('/Users/advance/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),qa='/tmp/ai-articles-polish-qa';
async function main(){
 const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 const results=[];
 for(const d of fs.readdirSync(root).filter(x=>/^\d\d_/.test(x)).sort()){
  await p.setContent(fs.readFileSync(path.join(root,d,'公众号_排版.html'),'utf8'));await p.evaluate(()=>document.fonts.ready);
  const result=await p.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,images:[...document.querySelectorAll('#article img')].map(e=>({loaded:e.complete&&e.naturalWidth>0,width:e.clientWidth})),text:document.querySelector('#article').innerText}));
  await p.getByRole('button',{name:'选中正文'}).click();
  result.selectionValid=await p.evaluate(()=>{const s=window.getSelection().toString();return s.startsWith('青少年 AI 科普连载')&&!s.includes('返回篇目目录')&&s.includes('资料来源')});
  await p.evaluate(()=>window.getSelection().removeAllRanges());
  await p.screenshot({path:path.join(qa,'mobile-'+d.slice(0,2)+'.png'),fullPage:true});
  results.push({article:d,...result});
 }
 await p.setViewportSize({width:1280,height:960});const indexHtml=fs.readFileSync(path.join(root,'发布入口.html'),'utf8').replace(/src="([^"]+\.png)"/g,(_,rel)=>'src="data:image/png;base64,'+fs.readFileSync(path.join(root,decodeURIComponent(rel))).toString('base64')+'"');await p.setContent(indexHtml);await p.screenshot({path:path.join(qa,'index-desktop.png')});
 fs.writeFileSync(path.join(__dirname,'preview_checks.json'),JSON.stringify(results,null,2));
 const problems=results.filter(r=>r.documentWidth>r.width||!r.selectionValid||r.images.some(x=>!x.loaded));
 console.log('Checked 16 mobile previews, images and selection buttons. Problems:',problems.length);await b.close();if(problems.length)process.exit(1);
}
main().catch(e=>{console.error(e);process.exit(1)});
