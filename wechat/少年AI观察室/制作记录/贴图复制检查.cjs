const {chromium}=require('/Users/advance/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'公众号贴图_直接使用');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const context=await browser.newContext({permissions:['clipboard-read','clipboard-write']});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.join(folder,'打开这里_复制标题和描述.html'));
  const options=await page.locator('#episode option').count();if(options!==16)throw Error('Episode count');
  let copyChecks=0;const layouts=[];
  const dirs=fs.readdirSync(folder).filter(x=>/^\d\d_/.test(x)).sort();
  for(const width of [360,1280]){
   await page.setViewportSize({width,height:1000});
   for(let i=0;i<16;i++){
    await page.locator('#episode').selectOption(String(i));
    await page.evaluate(()=>Promise.all([...document.images].map(x=>x.decode())));
    const state=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,images:document.images.length,loaded:[...document.images].every(x=>x.complete&&x.naturalWidth>0)}));
    if(state.scrollWidth>width||state.images!==5||!state.loaded)throw Error(JSON.stringify(state));
    for(const [field,file] of [['title','标题.txt'],['description','描述.txt']]){
     const expected=fs.readFileSync(path.join(folder,dirs[i],file),'utf8');
     if(await page.locator('#'+field).inputValue()!==expected)throw Error('Field mismatch');
     if(width===1280){await page.locator('[data-copy="'+field+'"]').click();const clipboard=await page.evaluate(()=>navigator.clipboard.readText());if(clipboard!==expected)throw Error('Clipboard mismatch');copyChecks++;}
    }
    layouts.push({episode:i+1,...state,passed:true});
   }
  }
  await page.locator('#episode').selectOption('0');
  await page.screenshot({path:path.join(root,'制作记录/贴图复制入口_桌面.png'),fullPage:true});
  await page.setViewportSize({width:360,height:900});await page.reload();await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));await page.screenshot({path:path.join(root,'制作记录/贴图复制入口_手机.png')});
  // Exercise the permission-denied fallback independently of native clipboard support.
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw Error('denied')}},configurable:true}));
  await page.locator('[data-copy="description"]').click();
  const fallback=await page.evaluate(()=>{const x=document.getElementById('description');return x.selectionStart===0&&x.selectionEnd===x.value.length});
  if(!fallback)throw Error('Fallback selection failed');
  if(errors.length)throw Error(errors.join('\n'));
  fs.writeFileSync(path.join(root,'制作记录/贴图复制检查.json'),JSON.stringify({passed:true,clipboard_checks:copyChecks,fallback_selection:true,layouts,backend_tested:false},null,2));
  console.log(JSON.stringify({clipboard_checks:copyChecks,layouts:layouts.length,fallback_selection:fallback,errors}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
