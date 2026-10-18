/* Real Chromium runtime, responsive layout, accessibility labels, local-only
   resources, and repeated control transitions. Requires installed Playwright. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const base=process.env.SITE_URL||'http://127.0.0.1:4173/';
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const out=process.env.QA_DIR||'/tmp/ai-toys-browser-qa'; fs.mkdirSync(out,{recursive:true});
 const report=[];const faults=[];
 for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  for(const file of (process.env.PAGES?process.env.PAGES.split(','):['chapters.html','index.html',...Array.from({length:9},(_,i)=>`t${i+2}.html`)])){
   const page=await context.newPage();
   page.on('pageerror',e=>faults.push(`${file}: ${e.message}`));
   page.on('response',r=>{if(r.status()>=400)faults.push(`${file}: HTTP ${r.status()} ${r.url()}`)});
   page.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('data:'))faults.push(`${file}: external request ${r.url()}`)});
   await page.goto(base+file,{waitUntil:'networkidle'});
   await page.waitForTimeout(100);
   assert.equal(await page.locator('h1').count(),1,`${file} h1`);
   assert.equal(await page.locator('body').evaluate(e=>e.scrollWidth>innerWidth+2),false,`${file} ${width}px horizontal overflow`);
   let actions=0;
   if(file!=='chapters.html'){
    for(const input of await page.locator('input[type=range]').all()){
     for(const endpoint of ['min','max']){
      await input.evaluate((el,k)=>{el.value=el[k];el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},endpoint); actions++;
     }
    }
    for(const select of await page.locator('select').all()){
     const options=await select.locator('option').evaluateAll(xs=>xs.map(x=>x.value));
     for(const value of options){await select.selectOption(value);actions++;}
    }
    // Follow each control's real click handler, including repeat/reset paths.
    for(const button of await page.locator('button').all()){
     if(await button.isVisible()&&await button.isEnabled()){
      await button.click();await page.waitForTimeout(40);actions++;
      if(await button.isEnabled()){await button.click();actions++;}
     }
    }
    const reset=page.locator('button').filter({hasText:/重置|恢复默认|从头开始/}).first();
    if(await reset.count()&&await reset.isEnabled()){await reset.click();actions++;}
    await page.waitForTimeout(100);
    assert.equal(await page.locator('body').evaluate(e=>e.scrollWidth>innerWidth+2),false,`${file} post-action overflow`);
   }
   await page.screenshot({path:path.join(out,`${file.replace('.html','')}-${width}.png`),fullPage:true});
   report.push({page:file,width,actions,title:await page.title()});
   await page.close();
  }
  await context.close();
 }
 await browser.close();
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({report,faults},null,2));
 assert.deepEqual(faults,[]);
 console.log(`PASS: ${report.length} real Chromium page/viewport checks; ${report.reduce((n,r)=>n+r.actions,0)} control transitions; no runtime/resource errors or horizontal overflow. Screenshots: ${out}`);
})().catch(e=>{console.error(e);process.exit(1)});
