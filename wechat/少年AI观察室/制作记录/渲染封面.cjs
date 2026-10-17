const {chromium}=require('/Users/advance/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launchPersistentContext(path.join(root,'制作记录','browser-profile'),{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-gpu','--disable-crash-reporter','--disable-breakpad'],viewport:{width:2300,height:1300},deviceScaleFactor:1});
 const page=await browser.newPage();
 const report=[];
 for(const dir of fs.readdirSync(root).filter(n=>/^\d\d_/.test(n)).sort()){
  const folder=path.join(root,dir);
  await page.goto('file://'+path.join(folder,'封面制作.html'));await page.evaluate(()=>document.fonts.ready);
  for(const [id,name,w,h]of[['wide','公众号主封面_21x9.png',2100,900],['square','公众号分享封面_1x1.png',1080,1080]]){
   const bounds=await page.locator('#'+id).evaluate(el=>{const p=el.getBoundingClientRect();return [...el.querySelectorAll('span,.y-main,.y-caption,.y-short,.y-title,.y-foot,.y-brand,.y-issue')].map(n=>{const r=n.getBoundingClientRect();return {text:n.textContent,inside:r.left>=p.left&&r.right<=p.right&&r.top>=p.top&&r.bottom<=p.bottom,overflow:n.scrollWidth>n.clientWidth+2||n.scrollHeight>n.clientHeight+2}})});
   const bad=bounds.filter(r=>!r.inside||r.overflow);if(bad.length)throw Error(JSON.stringify({dir,id,bad}));
   await page.locator('#'+id).screenshot({path:path.join(folder,name)});report.push({dir,id,width:w,height:h,passed:true});
  }
 }
 fs.writeFileSync(path.join(root,'制作记录','封面排版检查.json'),JSON.stringify(report,null,2));
 await browser.close();console.log('Rendered and checked 32 cover images.');
})().catch(e=>{console.error(e);process.exit(1)});
