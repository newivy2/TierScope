const {instrument, prepareSource} = require('./helpers/instrument.cjs');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const chromium=require('playwright')[process.env.TIERSCOPE_BROWSER || 'chromium'];
const source=prepareSource(fs.readFileSync(path.join(__dirname,'../tierscope.user.js'),'utf8'));
const injected=source.replaceAll('scheduleInit(2000);','/* fixture startup */').replace('downloadTrackingReport: downloadTrackingReport,',`
 __pulse:{
  setup(){
   loadSession(getModelName());
   var now=Date.now(),h={timestamps:[now-60000]};
   STORAGE_HISTORY_SERIES.forEach(k=>h[k]=[k==='red'||k==='purple'?1:k==='total'||k==='withTokens'?2:0]);
   restoreSessionState(normalizeStoredSession({timestamp:now,history:h,isPaused:true}));
   isAutoRefreshOn=false;isMinimized=true;createPanel();toggleView();updateAcquisitionStatus();
  },
  scan:performScanThenReturn,
  repaint:repaintLivePresentation,
  length:()=>history.timestamps.length
 },
 downloadTrackingReport: downloadTrackingReport,`);
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.TIERSCOPE_CHROMIUM_PATH,
  args:process.env.TIERSCOPE_CHROMIUM_ARGS?JSON.parse(process.env.TIERSCOPE_CHROMIUM_ARGS):[]});
 try {
  const context=await browser.newContext({viewport:{width:1100,height:1100},reducedMotion:'no-preference'});
  await context.addInitScript(()=>{
   window.GM_listValues=()=>Object.keys(localStorage);
   window.GM_getValue=(k,d)=>localStorage.getItem(k)===null?d:JSON.parse(localStorage.getItem(k));
   window.GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));window.GM_deleteValue=k=>localStorage.removeItem(k);
   window.confirm=()=>true;
   window.pulseCalls=[];const animate=Element.prototype.animate;
   Element.prototype.animate=function(frames,options){window.pulseCalls.push({id:this.id,frames,options});return animate.call(this,frames,options);};
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  let count=1,invalid=false;
  await page.route('https://tierscope.test/**',r=>r.fulfill({contentType:r.request().url().includes('/api/')?'text/plain':'text/html',body:r.request().url().includes('/api/')?
   (invalid?'invalid':'0,'+Array.from({length:count},(_,i)=>'mod'+i+'|m|m|0').concat(['purpuser|l|m|0']).join(',')):'<!doctype html><html><body></body></html>'}));
  await page.goto('https://tierscope.test/testroom/');await page.addScriptTag({content:instrument(injected)});await page.evaluate(()=>ViewerTracker.__pulse.setup());
  const calls=()=>page.evaluate(()=>window.pulseCalls);
  const clear=()=>page.evaluate(()=>{window.pulseCalls=[];});
  const scan=async n=>{count=n;await clear();await page.evaluate(()=>ViewerTracker.__pulse.scan());return calls();};
  const active=()=>page.evaluate(()=>Array.from(document.querySelectorAll('[id^="tier-row-"],[id^="restore-row-"]')).flatMap(e=>e.getAnimations()));
  assert.equal((await calls()).length,0,'restoration must be still');
  let events=await scan(1);
  assert(events.some(e=>e.id==='restore-row-red'));assert(events.some(e=>e.id==='tier-row-purple'));
  assert(events.every(e=>e.options.iterations===2&&e.options.duration===850&&e.options.fill==='none'));
  assert(events.every(e=>e.frames.every(f=>Object.keys(f).every(k=>['backgroundColor','boxShadow','offset'].includes(k)))));
  await page.evaluate(()=>ViewerTracker.__pulse.repaint());assert.equal((await calls()).length,events.length);
  await page.click('#collapse-row-purple');await page.click('#restore-row-purple');assert.equal((await calls()).length,events.length);
  assert.equal(await page.locator('#tier-row-purple').evaluate(e=>e.getAnimations().length),0);
  assert.equal((await scan(1)).length,0,'a plateau must not retrigger');
  events=await scan(2);assert(events.some(e=>e.id==='restore-row-red'));assert(!events.some(e=>e.id==='tier-row-purple'));
  await page.click('#restore-row-red');assert.equal(await page.locator('#tier-row-red').evaluate(e=>e.getAnimations().length),0);
  assert.equal((await scan(1)).length,0,'a dip must not pulse');
  events=await scan(2);assert(events.some(e=>e.id==='tier-row-red'),'returning to the high must pulse the expanded row');
  await page.evaluate(()=>document.getAnimations().forEach(a=>a.finish()));await page.waitForTimeout(30);
  assert.equal(await page.locator('#tier-row-red').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(50, 205, 50, 0.22)');
  assert.equal((await active()).length,0);
  console.log('PASS two pulses for live highs and returns, expanded/collapsed targets, steady final highlight, no plateau or layout retrigger');

  await scan(3);await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(50);
  assert.equal((await active()).length,0,'changing motion preference cancels an active pulse');
  assert.equal((await scan(4)).length,0);await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(30);
  assert.equal((await calls()).length,0);
  await scan(5);await page.click('#btn-replay');assert.equal((await active()).length,0);
  assert.equal((await scan(6)).length,0,'live acquisition during Replay must not animate it');
  await page.click('#playback-return');assert.equal((await calls()).length,0);
  await page.click('#btn-toggle');assert.equal((await scan(7)).length,0);
  await page.click('#btn-expand');assert.equal((await calls()).length,0);
  console.log('PASS reduced-motion preference including mid-pulse changes, Replay isolation, and no deferred pulses after expanding');

  invalid=true;assert.equal((await scan(8)).length,0);invalid=false;
  await page.evaluate(()=>GM_deleteValue('tierscope:requests:v1:'+location.origin));
  const before=await page.evaluate(()=>ViewerTracker.__pulse.length());
  await page.evaluate(()=>{const c=document.getElementById('spark-purple'),original=c.getContext.bind(c);let once=true;c.getContext=(...args)=>{if(once){once=false;throw new Error('test paint failure');}return original(...args);};});
  assert.equal((await scan(8)).length,0,'a rolled-back sample must not pulse');
  assert.equal(await page.evaluate(()=>ViewerTracker.__pulse.length()),before);
  assert((await scan(8)).some(e=>e.id==='tier-row-red'));
  await page.click('#btn-main-reset');assert.equal((await active()).length,0);
  assert.deepEqual(errors,[]);
  console.log('PASS failed acquisition and rendering rollback suppress pulses; Reset cancels active animations');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
