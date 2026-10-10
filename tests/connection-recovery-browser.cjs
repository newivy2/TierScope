const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {instrument,prepareSource}=require('./helpers/instrument.cjs');
const engine=process.env.TIERSCOPE_BROWSER||'chromium';
const source=prepareSource(fs.readFileSync(path.join(__dirname,'../tierscope.user.js'),'utf8')).replaceAll('scheduleInit(2000);','')
 .replace('downloadTrackingReport: downloadTrackingReport,',`__connection:{
 setup(){const scan=performScanThenReturn;performScanThenReturn=()=>new Promise(()=>{});try{init();}finally{performScanThenReturn=scan;}startTrackingTimer();startCountdown();},
 scan:performScanThenReturn,pause:pauseAutoRefresh,stop:()=>stopTracking('manual'),
 state:()=>({count:history.timestamps.length,times:history.timestamps.slice(),breaks:history.breaks.slice(),paused:isPaused,automatic:isAutoRefreshOn,stopped:isStopped,
 deadline:nextScanAt,recoveryAt:connectionRecoveryAt,policy:readRequestPolicy()})},downloadTrackingReport: downloadTrackingReport,`);
(async()=>{
 const browser=await require('playwright')[engine].launch({headless:true,executablePath:process.env.TIERSCOPE_CHROMIUM_PATH,args:JSON.parse(process.env.TIERSCOPE_CHROMIUM_ARGS||'[]')});
 try{
  const context=await browser.newContext({viewport:{width:1100,height:1000}}),errors=[],counts=new Map(),modes=new Map();let clockInstalled=false;
  await context.route('https://tierscope.test/**',route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/api/getchatuserlist/'){
    const room=url.searchParams.get('roomname');counts.set(room,(counts.get(room)||0)+1);
    if(modes.get(room)==='network')return route.abort('failed');
    if(modes.get(room)==='429')return route.fulfill({status:429,headers:{'Retry-After':'300'},body:'Wait'});
    return route.fulfill({body:'5,'+room+'|o|f|0,viewer|t|m|0'});
   }
   return route.fulfill({contentType:'text/html',body:'<!doctype html><body style="background:#303846"><button id="UserListTab" onclick="window.tabClicks++">Users</button><button>Chat</button><script>window.tabClicks=0</script></body>'});
  });
  await context.addInitScript(()=>{
   window.GM_listValues=()=>Object.keys(localStorage);window.GM_getValue=(k,d)=>localStorage.getItem(k)===null?d:JSON.parse(localStorage.getItem(k));
   window.GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));window.GM_deleteValue=k=>localStorage.removeItem(k);
  });
  const open=async room=>{
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('https://tierscope.test/'+room+'/');
   if(!clockInstalled){await page.clock.install({time:new Date('2026-10-10T12:00:00Z')});clockInstalled=true;}await page.addScriptTag({content:instrument(source)});
   await page.evaluate(()=>ViewerTracker.__connection.setup());return page;
  };
  const state=page=>page.evaluate(()=>ViewerTracker.__connection.state());
  const scan=page=>page.evaluate(()=>ViewerTracker.__connection.scan());
  const a=await open('testroom'),b=await open('otherroom');await scan(a);await scan(b);
  await a.clock.runFor(500);
  const bounds=await a.locator('#tracker-container').boundingBox(),before=await state(a);
  await a.evaluate(()=>Math.random=()=>.2);await b.evaluate(()=>Math.random=()=>.8);
  await context.setOffline(true);await a.waitForFunction(()=>navigator.onLine===false&&document.getElementById('control-next-scan').textContent==='No connection');
  const offlineBounds=await a.locator('#tracker-container').boundingBox();assert.equal(offlineBounds.width,bounds.width);assert.equal(offlineBounds.height,bounds.height);
  await a.clock.fastForward(180000);await scan(a);await scan(b);
  assert.equal(counts.get('testroom'),1);assert.equal(counts.get('otherroom'),1);assert.deepEqual((await state(a)).times,before.times);
  assert.equal((await state(a)).policy.failures,0);assert.equal(await a.evaluate(()=>window.tabClicks),0);
  await a.locator('#dark-mode-toggle').evaluate(e=>{e.checked=false;e.dispatchEvent(new Event('change'));});
  assert.equal(await a.locator('#mini-freshness').textContent(),'No connection');
  await a.screenshot({path:'/tmp/tierscope-connection-'+engine+'-offline.png'});
  await context.setOffline(false);await a.waitForFunction(()=>ViewerTracker.__connection.state().recoveryAt>0);
  await b.waitForFunction(()=>ViewerTracker.__connection.state().recoveryAt>0);
  const ad=(await state(a)).deadline,bd=(await state(b)).deadline;assert(ad<bd,'room tabs stagger their recovery');
  assert.match(await a.locator('#control-next-scan').textContent(),/Reconnecting/);
  await a.clock.runFor(5000);assert.equal(counts.get('testroom'),1);
  await a.clock.runFor(5000);await a.waitForFunction(()=>ViewerTracker.__connection.state().count===2);
  await b.waitForFunction(()=>ViewerTracker.__connection.state().count===2);
  assert.equal((await state(a)).breaks[1],true);assert((await state(a)).times[1]-before.times[0]>=180000);
  modes.set('testroom','network');await a.clock.runFor(60000);await a.waitForFunction(()=>ViewerTracker.__connection.state().policy.connectionFailures===1);
  assert.equal((await state(a)).policy.failures,0);assert.match(await a.locator('#control-next-scan').textContent(),/Connection/);
  assert.equal(await a.evaluate(()=>window.tabClicks),0);
  const deadline=(await state(a)).deadline;
  await a.evaluate(()=>window.dispatchEvent(new Event('online')));assert.equal((await state(a)).deadline,deadline,'noise does not clear a connection wait');
  await context.setOffline(true);await b.evaluate(()=>ViewerTracker.__connection.pause());const bCount=counts.get('otherroom');
  modes.set('testroom','valid');await context.setOffline(false);
  await a.waitForFunction(()=>ViewerTracker.__connection.state().recoveryAt>0);await a.clock.runFor(10000);
  await a.waitForFunction(()=>ViewerTracker.__connection.state().count===3);assert.equal((await state(a)).policy.connectionFailures,undefined);
  await b.clock.fastForward(300000);assert.equal(counts.get('otherroom'),bCount);assert.equal((await state(b)).automatic,false);
  assert.equal(await b.locator('#control-next-scan').textContent(),'Paused');
  await a.evaluate(()=>ViewerTracker.__connection.stop());const count=counts.get('testroom');
  await context.setOffline(true);await context.setOffline(false);await a.clock.fastForward(300000);
  assert.equal(counts.get('testroom'),count);assert.equal((await state(a)).stopped,true);assert.equal(await a.locator('#control-next-scan').textContent(),'Stopped');
  const restricted=await open('restrictedroom');modes.set('restrictedroom','429');await scan(restricted);
  const raw=await restricted.evaluate(()=>GM_getValue('tierscope:requests:v1:https://tierscope.test'));
  await context.setOffline(true);await context.setOffline(false);await restricted.waitForFunction(()=>ViewerTracker.__connection.state().recoveryAt>0);
  assert.equal(await restricted.evaluate(()=>GM_getValue('tierscope:requests:v1:https://tierscope.test')),raw);
  await restricted.clock.fastForward(60000);await scan(restricted);assert.equal(counts.get('restrictedroom'),1);
  assert.match(await restricted.locator('#control-next-scan').textContent(),/Rate limited/);
  modes.set('restrictedroom','valid');await restricted.clock.fastForward(240000);await restricted.waitForFunction(()=>ViewerTracker.__connection.state().count===1);
  assert.equal(counts.get('restrictedroom'),2);assert.equal((await state(restricted)).policy.failures,0);
  assert.deepEqual(errors,[]);console.log(engine+': native offline/online events, staggered tabs, preserved samples/gaps, short transport retries, no DOM clicks, paused/stopped sessions, server wait, themes and layout passed');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
