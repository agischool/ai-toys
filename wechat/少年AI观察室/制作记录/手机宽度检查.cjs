const{chromium}=require('/Users/advance/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');
(async()=>{
 const ctx=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
 const p=await ctx.newPage({viewport:{width:360,height:900},deviceScaleFactor:1}),report=[];
 for(const width of [320,360,390,760]){
  await p.setViewportSize({width,height:900});
  for(const dir of fs.readdirSync(root).filter(n=>/^\d\d_/.test(n)).sort()){
   await p.goto('file://'+path.join(root,dir,'公众号图文预览.html'));
   await p.evaluate(()=>Promise.all([...document.images].map(im=>im.decode())));
   if(await p.locator('details[open]').count())throw Error('Answers should initially be collapsed: '+dir);
   await p.locator('.answer summary').click();
   await p.locator('.figure-text summary').first().click();
   const state=await p.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,images:[...document.images].map(im=>({loaded:im.complete&&im.naturalWidth>0,alt:!!im.alt,width:im.getBoundingClientRect().width})),answerOpen:document.querySelector('.answer').open,descriptions:document.querySelectorAll('.figure-text').length,title:document.title}));
   if(state.scrollWidth>width||state.images.length!==5||state.images.some(im=>!im.loaded||!im.alt)||!state.answerOpen||state.descriptions!==5)throw Error(JSON.stringify({dir,state}));
   report.push({dir,...state,passed:true});
   if(width===360&&['02','08','12'].some(n=>dir.startsWith(n+'_'))){
    await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:path.join(root,'制作记录',`手机宽度_第${dir.slice(0,2)}期首屏.png`)});
    await p.locator('figure img').nth(dir.startsWith('08')?3:1).screenshot({path:path.join(root,'制作记录',`手机宽度_第${dir.slice(0,2)}期内页.png`)});
   }
  }
  await p.goto('file://'+path.join(root,'发布入口.html'));await p.evaluate(()=>Promise.all([...document.images].map(im=>im.decode())));
  const state=await p.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,cards:document.querySelectorAll('.item').length,loaded:[...document.images].every(im=>im.complete&&im.naturalWidth>0)}));
  if(state.scrollWidth>width||state.cards!==16||!state.loaded)throw Error(JSON.stringify(state));report.push({dir:'目录',...state,passed:true});
  if(width===360)await p.screenshot({path:path.join(root,'制作记录','审阅入口_手机.png')});
 }
 await p.setViewportSize({width:1280,height:1100});await p.goto('file://'+path.join(root,'发布入口.html'));await p.evaluate(()=>Promise.all([...document.images].map(im=>im.decode())));await p.screenshot({path:path.join(root,'制作记录','发布入口预览.png')});
 fs.writeFileSync(path.join(root,'制作记录','手机宽度检查.json'),JSON.stringify({note:'320、360、390、760 px 本地浏览器模拟；不代表公众号后台或真机验收。',pages:report},null,2));console.log('68 preview/viewport combinations passed, including collapsed-answer interaction and image descriptions.');
 }finally{await ctx.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
