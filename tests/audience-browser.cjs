const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {instrument,prepareSource}=require('./helpers/instrument.cjs');
const engine=process.env.TIERSCOPE_BROWSER||'chromium';
const source=prepareSource(fs.readFileSync(path.join(__dirname,'../tierscope.user.js'),'utf8')).replaceAll('scheduleInit(2000);','')
.replace('downloadTrackingReport: downloadTrackingReport,',`__audience:{
 setup(){loadSession(getModelName());const now=Date.now(),h={timestamps:[now-120000,now-60000,now],breaks:[false,false,false]};
 STORAGE_HISTORY_SERIES.forEach(k=>h[k]=[0,0,0]);h.red=[75,150,300];h.gray=[25,50,100];h.total=[100,200,400];h.withTokens=h.red.slice();h.anonymous=[95,360,200];
 restoreSessionState(normalizeStoredSession({timestamp:now,history:h,isPaused:true,pausedElapsedTime:120000}));isAutoRefreshOn=false;isMinimized=true;createPanel();toggleView();repaintLivePresentation();
 this.file={...captureSessionFile(),room:'archive_model'};},
 scan:performScanThenReturn,pause(){if(playback&&playback.playing)togglePlayback();},fileReplay(){openSessionReplay(this.file);},
 scale(value){applyScale(value);constrainPanelPosition();},state:()=>({history:JSON.stringify(history),users:users.size,mode:presentationMode,position:playback&&playback.positionMs}),
 ratio(anonymous,total){paintPanelFrame(buildPanelDisplayModel({...buildLiveDisplayFrame(),anonymousCount:anonymous,total,fullRoomTotal:anonymous+total}));},
 trends(current,previous){const model=buildTrendDisplayModel();renderTrendDisplay({...model,isPlayback:false,isRestored:false,hasTrendBaseline:true,
 counts:Object.fromEntries(Object.keys(TIERS).map(k=>[k,current[0]])),total:current[0],withTokens:current[2],anonymousCount:current[1],fullRoomTotal:current[0]+current[1],
 comparison:{short:false,actualMinutes:1,counts:{...Object.fromEntries(Object.keys(TIERS).map(k=>[k,previous[0]])),total:previous[0],withTokens:previous[2],anonymous:previous[1]}}});}},
 downloadTrackingReport: downloadTrackingReport,`);
(async()=>{
 const browser=await require('playwright')[engine].launch({headless:true,executablePath:process.env.TIERSCOPE_CHROMIUM_PATH,args:JSON.parse(process.env.TIERSCOPE_CHROMIUM_ARGS||'[]')});
 try{
 const page=await browser.newPage({viewport:{width:1100,height:1400}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let registered=50,anonymous=40;
 await page.route('https://tierscope.test/**',route=>route.fulfill({contentType:route.request().url().includes('/api/')?'text/plain':'text/html',
 body:route.request().url().includes('/api/')?anonymous+','+Array.from({length:registered},(_,i)=>'viewer'+i+'|m|m|0').join(','):'<!doctype html><body style="background:#303846"></body>'}));
 await page.addInitScript(()=>{window.store=new Map();window.GM_getValue=(k,d)=>store.has(k)?store.get(k):d;window.GM_setValue=(k,v)=>store.set(k,v);window.GM_deleteValue=k=>store.delete(k);window.GM_listValues=()=>[...store.keys()];});
 await page.goto('https://tierscope.test/testroom/');await page.addScriptTag({content:instrument(source)});await page.evaluate(()=>ViewerTracker.__audience.setup());await page.waitForTimeout(350);
 await page.click('#restore-row-anon');
 const ratio=page.locator('#anon-registered-ratio'),box=key=>page.locator('[data-trend-key="'+key+'"]');
 assert.equal(await ratio.textContent(),'0.5x','restored sample ratio');
 assert(await ratio.evaluate(e=>e.previousElementSibling.id==='anon-ratio-full'&&e.nextElementSibling.id==='high-anon'));
 const before=await page.evaluate(()=>ViewerTracker.__audience.state());
 for(const [anon,total,label] of [[94,100,'0.9x'],[95,100,'1:1'],[105,100,'1:1'],[106,100,'1.1x'],[0,100,'0.0x'],[100,0,'—'],[0,0,'—'],[100000,1,'100000.0x']]){
  await page.evaluate(([a,t])=>ViewerTracker.__audience.ratio(a,t),[anon,total]);assert.equal(await ratio.textContent(),label);
  const fit=await ratio.evaluate(e=>{const r=e.getBoundingClientRect(),count=e.previousElementSibling.getBoundingClientRect(),high=e.nextElementSibling.getBoundingClientRect(),cell=e.parentElement.getBoundingClientRect();return {inside:r.left>=cell.left&&r.right<=cell.right&&r.top>=count.bottom&&r.bottom<=high.top,overflow:e.scrollWidth-e.clientWidth};});
  assert(fit.inside);assert(fit.overflow<=1,'ratio text fits without clipping');
 }
 assert.match(await ratio.getAttribute('aria-label'),/Anons \/ registered viewers/);
 assert.deepEqual(await page.evaluate(()=>ViewerTracker.__audience.state()),before,'ratio painting cannot mutate tracking');
 for(const current of [[100,80,60],[90,100,50],[80,90,40],[99999,88888,77777],[999999,1000000,555555],[10000000,20000000,9000000]]){
  await page.evaluate(c=>ViewerTracker.__audience.trends(c,[90,100,50]),current);
  for(const bright of [false,true]){
   await page.locator('#dark-mode-toggle').setChecked(!bright);
   for(const scale of [0.5,1,1.5]){
    await page.evaluate(s=>ViewerTracker.__audience.scale(s),scale);
    const layout=await page.evaluate(()=>{
     const rows=[...document.querySelectorAll('#trend-container > div')],parent=document.getElementById('trend-container').getBoundingClientRect();
     return {counts:rows.map(r=>r.children.length),heights:rows.map(r=>r.firstElementChild.getBoundingClientRect().height),
      fits:rows.every(r=>[...r.children].every(e=>{const b=e.getBoundingClientRect();return b.left>=parent.left-.5&&b.right<=parent.right+.5&&e.scrollWidth<=e.clientWidth+1&&[...e.children].every(c=>c.scrollWidth<=c.clientWidth+1);})),
      tokens:getComputedStyle(document.querySelector('[data-trend-key=withTokens]')).borderColor,tokensRow:getComputedStyle(document.getElementById('tier-row-withtokens')).borderColor,
      room:getComputedStyle(document.querySelector('[data-trend-key=roomTotal]')).borderColor,roomRow:getComputedStyle(document.getElementById('tier-row-roomTotal')).borderColor};});
    assert.deepEqual(layout.counts,[4,4,4]);assert(layout.heights[2]>layout.heights[0]&&layout.heights[2]>layout.heights[1]);assert(layout.fits,JSON.stringify({current,bright,scale,layout}));
    assert.equal(layout.tokens,layout.tokensRow);assert.equal(layout.room,layout.roomRow);assert.notEqual(layout.tokens,layout.room);
   }
  }
  const change=current[0]+current[1]-190;assert.match(await box('roomTotal').getAttribute('title'),new RegExp('Change '+(change>0?'\\+':'')+change.toLocaleString()+' from 190'));
 }
 assert.deepEqual(await page.evaluate(()=>ViewerTracker.__audience.state()),before,'trend painting cannot mutate tracking');
 await page.evaluate(()=>ViewerTracker.__audience.scale(1));await page.setViewportSize({width:400,height:900});
 await page.evaluate(()=>ViewerTracker.__audience.scan());assert.equal(await ratio.textContent(),'0.8x');
 assert.match(await box('roomTotal').getAttribute('title'),/Room Total: 90\. Change -510 from 600/);
 await page.click('.trend-preset-btn[data-mode=start]');assert.match(await box('roomTotal').getAttribute('title'),/Change -105 from 195/);
 await page.click('.trend-preset-btn[data-mode=last]');
 await page.click('#btn-high-mode');assert.match(await page.locator('#high-anon').textContent(),/^ATH:/);assert.equal(await ratio.textContent(),'0.8x');
 await page.setViewportSize({width:1100,height:1000});
 for(const bright of [false,true]){
  await page.locator('#dark-mode-toggle').setChecked(!bright);
  await page.locator('#tracker-container').screenshot({path:'/tmp/tierscope-320-'+engine+'-'+(bright?'bright':'dark')+'.png'});
 }
 await page.click('#btn-replay');await page.evaluate(()=>ViewerTracker.__audience.pause());
 while(await page.locator('#playback-previous').isEnabled())await page.click('#playback-previous');
 assert.equal(await ratio.textContent(),'1:1');await page.click('#playback-next');assert.equal(await ratio.textContent(),'1.8x');
 registered=10;anonymous=2000;await page.evaluate(()=>ViewerTracker.__audience.scan());assert.equal(await ratio.textContent(),'1.8x','background scan cannot replace replay ratio');
 await page.click('#playback-return');assert.equal(await ratio.textContent(),'200.0x');
 await page.evaluate(()=>{ViewerTracker.__audience.fileReplay();ViewerTracker.__audience.pause();});
 assert.equal(await page.locator('#header-text').textContent(),'archive_model');
 while(await page.locator('#playback-previous').isEnabled())await page.click('#playback-previous');
 assert.equal(await ratio.textContent(),'1:1');await page.click('#playback-next');assert.equal(await ratio.textContent(),'1.8x','file replay uses its own ratio');
 await page.click('#playback-return');assert.equal(await ratio.textContent(),'200.0x');
 assert.deepEqual(errors,[]);console.log('PASS four subtotal trends, yellow/pink borders, comparison baselines, adaptive fonts and size hierarchy; Anons ratio/band/zero denominator, themes, scales, narrow layout and live/restored/file-replay isolation');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
