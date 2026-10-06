const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {instrument,prepareSource}=require('./helpers/instrument.cjs');
const engine=process.env.TIERSCOPE_BROWSER||'chromium';
const source=prepareSource(fs.readFileSync(path.join(__dirname,'../tierscope.user.js'),'utf8')).replaceAll('scheduleInit(2000);','')
 .replace('downloadTrackingReport: downloadTrackingReport,',`__retention:{init,pause:pauseAutoRefresh,emptyAllTimeHighs,storeAllTimeHighs,readAllTimeHighs,observeAthRoom,stopAthActivity},downloadTrackingReport: downloadTrackingReport,`);
(async()=>{
 const browser=await require('playwright')[engine].launch({headless:true,executablePath:process.env.TIERSCOPE_CHROMIUM_PATH,args:JSON.parse(process.env.TIERSCOPE_CHROMIUM_ARGS||'[]')});
 try{
 const context=await browser.newContext({viewport:{width:1100,height:1100}}),page=await context.newPage(),errors=[],dialogs=[];let accept=false;
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{dialogs.push(d.message());return accept?d.accept():d.dismiss();});
 await context.route('https://tierscope.test/**',r=>r.fulfill({contentType:r.request().url().includes('/api/')?'text/plain':'text/html',body:r.request().url().includes('/api/')?'5,testroom|o|f|0,viewer|t|m|0':'<!doctype html><body style="background:#303846"></body>'}));
 await context.addInitScript(()=>{window.GM_listValues=()=>Object.keys(localStorage);window.GM_getValue=(k,d)=>localStorage.getItem(k)===null?d:JSON.parse(localStorage.getItem(k));window.GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));window.GM_deleteValue=k=>localStorage.removeItem(k);});
 await page.goto('https://tierscope.test/testroom/');await page.addScriptTag({content:instrument(source)});
 await page.evaluate(()=>{const r=ViewerTracker.__retention,highs=r.emptyAllTimeHighs();highs.red={value:40,time:1000,source:'live'};r.storeAllTimeHighs('legacy',highs);GM_deleteValue('tierscope:ath-visit:v1:legacy');r.init();});
 await page.waitForFunction(()=>ViewerTracker.__retention.readAllTimeHighs('testroom').highs.roomTotal.value>0);await page.evaluate(()=>ViewerTracker.__retention.pause());
 const currentHigh=await page.evaluate(()=>ViewerTracker.__retention.readAllTimeHighs('testroom').highs.roomTotal.value);
 await page.click('#btn-panel-options');
 assert.equal(await page.locator('#btn-clear-all-time').textContent(),'Clear Room ATH…');
 assert.equal(await page.locator('#btn-clear-inactive-ath').textContent(),'Clear inactive ATH (90 days)…');
 await page.click('#btn-clear-inactive-ath');assert.equal(dialogs.length,0);assert.match(await page.locator('#all-time-action-status').textContent(),/No rooms/);
 const grace=await page.evaluate(()=>JSON.parse(GM_getValue('tierscope:ath-visit:v1:legacy')).graceStartedAt);assert(grace>Date.now()-60000);
 await page.evaluate(()=>{GM_setValue('tierscope:ath-visit:v1:legacy',JSON.stringify({schemaVersion:1,graceStartedAt:1000,lastVisitedAt:1000}));});
 await page.click('#btn-clear-inactive-ath');assert.match(dialogs.at(-1),/1 room\(s\).*over 90 days/);assert.equal(await page.evaluate(()=>ViewerTracker.__retention.readAllTimeHighs('legacy').highs.red.value),40);
 // A paused sibling revisits the room before a second cleanup attempt.
 const sibling=await context.newPage();await sibling.goto('https://tierscope.test/legacy/');await sibling.addScriptTag({content:instrument(source)});await sibling.evaluate(()=>ViewerTracker.__retention.observeAthRoom());
 accept=true;await page.click('#btn-clear-inactive-ath');assert.equal(dialogs.length,1,'active sibling no longer qualifies');
 assert.equal(await page.evaluate(()=>ViewerTracker.__retention.readAllTimeHighs('legacy').highs.red.value),40);
 await sibling.evaluate(()=>ViewerTracker.__retention.stopAthActivity());await sibling.close();
 await page.evaluate(()=>GM_setValue('tierscope:ath-visit:v1:legacy',JSON.stringify({schemaVersion:1,graceStartedAt:1000,lastVisitedAt:1000})));
 await page.click('#btn-clear-inactive-ath');assert.equal(dialogs.length,2);assert.match(await page.locator('#all-time-action-status').textContent(),/Cleared ATH for 1/);
 assert.equal(await page.evaluate(()=>ViewerTracker.__retention.readAllTimeHighs('legacy').highs.red.value),0);
 assert.equal(await page.evaluate(()=>ViewerTracker.__retention.readAllTimeHighs('testroom').highs.roomTotal.value),currentHigh);
 // Both actions remain within the menu on a small viewport.
 for(const width of [1100,420]){await page.setViewportSize({width,height:1100});const action=await page.locator('#btn-clear-inactive-ath').boundingBox(),menu=await page.locator('#panel-options').boundingBox();assert(action.x>=menu.x&&action.x+action.width<=menu.x+menu.width+1);}
 assert.deepEqual(errors,[]);console.log('PASS ATH maintenance: legacy grace, room/cleanup menu, no-op/cancel/count/confirm, shared-browser paused-room protection and layout');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
