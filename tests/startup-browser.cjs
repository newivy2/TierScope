const {instrument, prepareSource} = require('./helpers/instrument.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const engine=process.env.TIERSCOPE_BROWSER||'chromium';
const source=prepareSource(fs.readFileSync(path.join(__dirname,'../tierscope.user.js'),'utf8')).replaceAll('scheduleInit(2000);','')
 .replace('downloadTrackingReport: downloadTrackingReport,',`
 __startup:{init,state:()=>({count:history.timestamps.length,scanning:isScanning,countdown:countdownInterval,next:nextScanAt,now:Date.now()})},
 downloadTrackingReport: downloadTrackingReport,`);
(async()=>{
 const browser=await require('playwright')[engine].launch({headless:true,executablePath:process.env.TIERSCOPE_CHROMIUM_PATH,args:JSON.parse(process.env.TIERSCOPE_CHROMIUM_ARGS||'[]')});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:1100}}),errors=[];
  let requests=0,release,notify;const requested=new Promise(r=>notify=r);
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://tierscope.test/**',async r=>{
   if(r.request().url().includes('/api/')){
    requests++;await new Promise(resolve=>{release=resolve;notify();});
    return r.fulfill({body:'5,testroom|o|f|0,viewer|t|m|0'});
   }
   return r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'});
  });
  await page.addInitScript(()=>{
   window.GM_listValues=()=>Object.keys(localStorage);window.GM_getValue=(k,d)=>localStorage.getItem(k)===null?d:JSON.parse(localStorage.getItem(k));
   window.GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));window.GM_deleteValue=k=>localStorage.removeItem(k);
  });
  await page.goto('https://tierscope.test/testroom/');await page.addScriptTag({content:instrument(source)});
  await page.evaluate(()=>ViewerTracker.__startup.init());await requested;
  const pending=await page.evaluate(()=>ViewerTracker.__startup.state());
  assert.equal(requests,1);assert(pending.scanning);assert.equal(pending.countdown,null);
  assert.match(await page.locator('#control-next-scan').textContent(),/scanning/i);
  release();await page.waitForFunction(()=>ViewerTracker.__startup.state().count===1&&ViewerTracker.__startup.state().countdown!==null);
  assert.equal(requests,1);assert.match(await page.locator('#header-text').getAttribute('title'),/^Live room:/);
  const finished=await page.evaluate(()=>ViewerTracker.__startup.state());assert(finished.next-finished.now>55000&&finished.next-finished.now<=60000);
  const dot=await page.locator('#spark-light-blue').evaluate(c=>{
   const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   return {end:c._tierScopeChart.plot.end,visible:data.some((v,i)=>i%4===3&&v>0)};
  });
  assert.equal(dot.end,0);assert(dot.visible,'the initial sample is drawn immediately');
  await page.click('#btn-toggle');
  assert.match(await page.locator('#mini-settings-toggle').getAttribute('title'),/Scan interval settings.*how often TierScope scans/);
  await page.click('#mini-settings-toggle');assert(await page.locator('#mini-settings').isVisible());
  await page.keyboard.press('Escape');assert(!(await page.locator('#mini-settings').isVisible()));
  assert.deepEqual(errors,[]);
  console.log('PASS fresh initialization request, scanning status, completion-based countdown, visible first data point and compact time-control tooltip');
  // Exercise normal startup and a real panel control without any injected API.
  await page.route('https://tierscope.test/api/**',r=>r.fulfill({body:'5,testroom|o|f|0,viewer|t|m|0'}));
  await page.goto('https://tierscope.test/freshroom/');
  await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../tierscope.user.js'),'utf8')});
  await page.waitForFunction(()=>document.getElementById('header-text')?.title.startsWith('Live room:'));
  assert.deepEqual(await page.evaluate(()=>[typeof window.ViewerTracker,typeof window.GifWriter]),['undefined','undefined']);
  await page.click('#btn-replay');
  assert.match(await page.locator('#header-text').getAttribute('title'),/^Replay:/);
  await page.click('#playback-return');
  assert.match(await page.locator('#header-text').getAttribute('title'),/^Live room:/);
  const epoch=()=>page.evaluate(()=>localStorage.getItem('tierscope:epoch:v2:freshroom'));
  const beforeReset=await epoch();
  page.once('dialog',dialog=>dialog.dismiss());await page.click('#btn-main-reset');
  assert.equal(await epoch(),beforeReset,'Cancel preserves the session');
  page.once('dialog',dialog=>dialog.accept());await page.click('#btn-main-reset');
  assert.notEqual(await epoch(),beforeReset,'the panel can still Reset the session');
  assert.deepEqual(errors,[]);
  console.log('PASS unmodified userscript starts and panel Replay/confirmed Reset work without a page API or global GIF encoder');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
