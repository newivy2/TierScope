const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {instrument,prepareSource}=require('./helpers/instrument.cjs');
const engine=process.env.TIERSCOPE_BROWSER||'chromium';
const source=prepareSource(fs.readFileSync(path.join(__dirname,'../tierscope.user.js'),'utf8')).replaceAll('scheduleInit(2000);','')
 .replace('downloadTrackingReport: downloadTrackingReport,',`__directory:{init,scan:performScanThenReturn,resume:toggleAutoRefresh,startCountdown,startTrackingTimer,state:()=>({minimized:isMinimized,count:history.timestamps.length,countdown:countdownInterval,tracking:trackingTimerInterval,health:healthCheckInterval})},downloadTrackingReport: downloadTrackingReport,`);
(async()=>{
 const browser=await require('playwright')[engine].launch({headless:true,executablePath:process.env.TIERSCOPE_CHROMIUM_PATH,args:JSON.parse(process.env.TIERSCOPE_CHROMIUM_ARGS||'[]')});
 try{
 const context=await browser.newContext({viewport:{width:1100,height:1100}}),page=await context.newPage(),errors=[];let requests=0;
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('https://tierscope.test/**',r=>{
  if(r.request().url().includes('/api/')){requests++;return r.fulfill({body:'5,testroom|o|f|0,viewer|t|m|0'});}
  return r.fulfill({contentType:'text/html',body:'<!doctype html><body><button id="UserListTab" onclick="window.tabClicks++">Users</button><button>Chat</button><script>window.tabClicks=0</script></body>'});
 });
 await context.addInitScript(()=>{window.GM_listValues=()=>Object.keys(localStorage);window.GM_getValue=(k,d)=>localStorage.getItem(k)===null?d:JSON.parse(localStorage.getItem(k));window.GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));window.GM_deleteValue=k=>localStorage.removeItem(k);});
 for(const route of ['/','/followed-cams/','/female-cams/','/male-cams/','/couple-cams/','/trans-cams/']){
  await page.goto('https://tierscope.test'+route);await page.clock.install();await page.addScriptTag({content:instrument(source)});await page.evaluate(()=>ViewerTracker.__directory.init());
  assert(await page.locator('#minimized-view').isVisible(),route);assert(await page.locator('#full-view').isHidden(),route);
  assert(await page.locator('#btn-auto').isDisabled());assert.equal(await page.locator('#auto-status').textContent(),'Open a room');
  await page.clock.runFor(65000);await page.evaluate(async()=>{ViewerTracker.__directory.resume();ViewerTracker.__directory.startCountdown();ViewerTracker.__directory.startTrackingTimer();await ViewerTracker.__directory.scan();});
  assert.equal(requests,0);assert.equal(await page.evaluate(()=>window.tabClicks),0);
  assert.deepEqual(await page.evaluate(()=>ViewerTracker.__directory.state()),{minimized:true,count:0,countdown:null,tracking:null,health:null});
  assert.equal(await page.evaluate(()=>localStorage.getItem('tierscope:requests:v1:https://tierscope.test')),null);
  // Direct controller calls cannot clear a sibling room's access restriction.
  const policy=JSON.stringify({until:0,serverUntil:0,failures:2,blocked:403,status:403,revision:'sibling'});
  await page.evaluate(value=>GM_setValue('tierscope:requests:v1:https://tierscope.test',value),policy);
  await page.evaluate(async()=>{ViewerTracker.__directory.resume();await ViewerTracker.__directory.scan();});
  assert.equal(await page.evaluate(()=>GM_getValue('tierscope:requests:v1:https://tierscope.test')),policy);
  await page.clock.runFor(1000);assert.equal(await page.locator('#mini-freshness').textContent(),'No room');assert.equal(await page.locator('#acquisition-status').textContent(),'No room');
  await page.evaluate(()=>GM_deleteValue('tierscope:requests:v1:https://tierscope.test'));
  await page.click('#btn-expand');assert(await page.locator('#btn-control-auto').isDisabled());assert(await page.locator('#btn-control-stop').isDisabled());
  await page.click('#btn-control-library');assert(await page.locator('#tierscope-session-tools').isVisible());await page.click('#tools-close');
 }
 const room=await context.newPage();await room.goto('https://tierscope.test/testroom/');await room.addScriptTag({content:instrument(source)});await room.evaluate(()=>ViewerTracker.__directory.init());
 await room.waitForFunction(()=>ViewerTracker.__directory.state().count===1);assert.equal(requests,1,'directories leave a healthy room free to scan');
 assert.deepEqual(errors,[]);console.log('PASS homepage and all requested directories: minimized startup, misleading Users tab, no API/DOM scans or clocks, disabled tracking, shared-policy isolation, Library availability and healthy sibling');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
