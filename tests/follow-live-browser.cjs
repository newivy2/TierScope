const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {instrument,prepareSource}=require('./helpers/instrument.cjs');
const engine=process.env.TIERSCOPE_BROWSER||'chromium';
const source=prepareSource(fs.readFileSync(path.join(__dirname,'../tierscope.user.js'),'utf8')).replaceAll('scheduleInit(2000);','')
.replace('downloadTrackingReport: downloadTrackingReport,',`__follow:{checkUrlChange,scan:performScanThenReturn,
 setup(){GM_setValue('tierscope:automatic-keeping:v1',JSON.stringify({schemaVersion:1,minimumMinutes:0}));loadSession(getModelName());const now=Date.now(),h={timestamps:[now-180000,now-120000,now-60000,now],breaks:[false,false,false,false]};
 STORAGE_HISTORY_SERIES.forEach(k=>h[k]=[0,0,0,0]);h.total=[10,20,30,40];h.red=h.total.slice();h.withTokens=h.total.slice();h.anonymous=[5,5,5,5];
 restoreSessionState(normalizeStoredSession({timestamp:now,history:h,sessionStartedAt:now-180000,sessionStartEstimated:false,isPaused:false,pausedElapsedTime:180000}));
 isAutoRefreshOn=false;isMinimized=true;createPanel();toggleView();repaintLivePresentation();
 const archive=captureLiveSessionFile();for(let i=1;i<=29;i++){const a=JSON.parse(JSON.stringify(archive)),d=i*86400000,s=a.session;s.timestamp-=d;s.sessionStartedAt-=d;s.history.timestamps=s.history.timestamps.map(t=>t-d);if(s.roomTotalHighTime!==null)s.roomTotalHighTime-=d;Object.values(s.sessionHighs).forEach(h=>{if(h.time!=null)h.time-=d;});keepSessionInLibrary(a,'Previous '+i);}
 setModelFavorite(getModelName(),true,true);saveSession(getModelName(),true);
 const original=captureLiveSessionFile;window.followCaptures=0;captureLiveSessionFile=function(...args){window.followCaptures++;return original(...args);};},
 status:updateSessionToolsStatus,library:readSessionLibrary,live:captureLiveSessionFile,forceSave:()=>saveSession(getModelName(),true),
 replay(){openSessionReplay({...captureLiveSessionFile(),room:'file_model'});if(playback.playing)togglePlayback();},closeReplay:leavePlayback,
 state:()=>({history:JSON.stringify(history),mode:presentationMode,position:playback&&playback.positionMs}),
 pause(){pauseAutoRefresh();},resume(){startAutoRefresh();stopRefreshCountdown();isAutoRefreshOn=false;},
 reset(){resetAllTracking();},
 },downloadTrackingReport: downloadTrackingReport,`);
(async()=>{
 const browser=await require('playwright')[engine].launch({headless:true,executablePath:process.env.TIERSCOPE_CHROMIUM_PATH,args:JSON.parse(process.env.TIERSCOPE_CHROMIUM_ARGS||'[]')});
 try{
 const context=await browser.newContext({viewport:{width:1250,height:1000},timezoneId:'America/Sao_Paulo'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));let registered=100;
 await context.route('https://tierscope.test/**',r=>r.fulfill({contentType:r.request().url().includes('/api/')?'text/plain':'text/html',body:r.request().url().includes('/api/')?'5,'+Array.from({length:registered},(_,i)=>'viewer'+i+'|m|m|0').join(','):'<!doctype html><body style="background:#26303a"></body>'}));
 await context.addInitScript(()=>{window.testNow=Date.UTC(2026,9,5,16);Date.now=()=>window.testNow;
 window.GM_listValues=()=>Object.keys(localStorage);window.GM_getValue=(k,d)=>localStorage.getItem(k)===null?d:JSON.parse(localStorage.getItem(k));
 window.GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));window.GM_deleteValue=k=>localStorage.removeItem(k);});
 await page.goto('https://tierscope.test/live_model/');await page.addScriptTag({content:instrument(source)});await page.evaluate(()=>ViewerTracker.__follow.setup());await page.waitForTimeout(250);
 const scan=async(n,ms=10000)=>{registered=n;await page.evaluate(ms=>{window.testNow+=ms;return ViewerTracker.__follow.scan();},ms);};
 const samples=()=>page.locator('#tools-summary-table tbody tr').first().locator('td').allTextContents();
 const nav=async tab=>{await page.locator('[data-tools-tab='+tab+']').click();};
 await page.click('#btn-control-library');
 const priority=await page.evaluate(()=>{const keep=document.getElementById('tools-keep'),compare=document.getElementById('tools-compare-previous');return {quiet:keep.classList.contains('tools-quiet'),primary:compare.classList.contains('tools-primary'),keepBorder:getComputedStyle(keep).borderColor,historyBorder:getComputedStyle(document.getElementById('tools-room-history')).borderColor,keepBackground:getComputedStyle(keep).backgroundColor,historyBackground:getComputedStyle(document.getElementById('tools-room-history')).backgroundColor,top:keep.getBoundingClientRect().top<compare.getBoundingClientRect().top};});
 assert(!priority.quiet&&priority.primary&&priority.top);assert.equal(priority.keepBorder,priority.historyBorder);assert.equal(priority.keepBackground,priority.historyBackground);
 await nav('summary');assert(await page.locator('#tools-follow-live').isChecked());assert.deepEqual(await samples(),['4']);
 await page.evaluate(()=>{window.followCanvas=document.getElementById('tools-analysis-chart');window.followMetric=document.getElementById('tools-metric');});
 const fullBefore=await page.locator('#tools-chart-range').textContent();await scan(100);
 assert.deepEqual(await samples(),['5']);assert.notEqual(await page.locator('#tools-chart-range').textContent(),fullBefore);
 assert(await page.evaluate(()=>followCanvas===document.getElementById('tools-analysis-chart')&&followMetric===document.getElementById('tools-metric')));
 // Update without another sample does no capture or redraw work.
 const captures=await page.evaluate(()=>window.followCaptures);await page.evaluate(()=>{for(let i=0;i<10;i++)ViewerTracker.__follow.status();});assert.equal(await page.evaluate(()=>window.followCaptures),captures);
 await page.click('#tools-chart-zoom-in');await page.locator('#tools-analysis-chart').focus();await page.keyboard.press('End');
 const zoom=await page.locator('#tools-chart-range').textContent(),cursor=await page.locator('#tools-chart-inspection caption').textContent();
 await page.fill('#tools-threshold','7, 11');await page.click('#tools-apply-threshold');await scan(200);
 assert.equal(await page.locator('#tools-threshold').inputValue(),'7, 11');
 assert.equal((await page.locator('#tools-chart-range').textContent()).split(' · ')[0],zoom.split(' · ')[0]);assert.equal(await page.locator('#tools-chart-inspection caption').textContent(),cursor);
 await page.fill('#tools-threshold','12, ');await scan(300);assert.equal(await page.locator('#tools-threshold').inputValue(),'12, ');assert.equal(await page.evaluate(()=>document.activeElement.id),'tools-threshold');
 await page.click('#tools-average-thresholds');const average=await page.locator('#tools-threshold').inputValue();await scan(400);assert.notEqual(await page.locator('#tools-threshold').inputValue(),average);
 await page.uncheck('#tools-follow-live');const frozen=await samples();await scan(500);assert.deepEqual(await samples(),frozen);
 await nav('library');await nav('summary');assert(!(await page.locator('#tools-follow-live').isChecked()));assert.deepEqual(await samples(),frozen,'frozen Summary survives tab changes and Auto replacements');
 await page.check('#tools-follow-live');assert.deepEqual(await samples(),['9']);
 // Manual saving remains independent; save failure must not stop live analysis.
 await page.evaluate(()=>{window.originalSet=GM_setValue;window.GM_setValue=(k,v)=>{if(k.startsWith('tierscope:library:v1:'))throw Error('Storage blocked');return originalSet(k,v);};});
 const savedBefore=await page.evaluate(()=>JSON.stringify(ViewerTracker.__follow.library().entries));await scan(600,61000);assert.deepEqual(await samples(),['10']);assert.match(await page.locator('#tools-follow-status').textContent(),/Library save pending/);
 assert.equal(await page.evaluate(()=>JSON.stringify(ViewerTracker.__follow.library().entries)),savedBefore);
 await page.evaluate(()=>{window.GM_setValue=window.originalSet;ViewerTracker.__follow.forceSave();});
 await nav('library');await page.click('#tools-compare-previous');assert(await page.locator('#tools-follow-live').isChecked());assert.equal((await samples()).length,30);
 await page.uncheck('#tools-shared-length');
 await page.uncheck('[data-analysis-series="1"]');await page.click('#tools-chart-zoom-in');await page.locator('#tools-analysis-chart').focus();await page.keyboard.press('End');
 const compareBefore=await samples(),compareZoom=(await page.locator('#tools-chart-range').textContent()).split(' · ')[0],compareCursor=await page.locator('#tools-chart-inspection caption').textContent();
 await page.fill('#tools-threshold','42');const slots=await page.locator('[id^=tools-source-]').evaluateAll(es=>es.map(e=>e.value));await scan(700);
 const compareAfter=await samples();assert.equal(Number(compareAfter[0]),Number(compareBefore[0])+1);assert.deepEqual(compareAfter.slice(1),compareBefore.slice(1));
 assert.equal(await page.locator('#tools-threshold').inputValue(),'42');assert(!(await page.locator('[data-analysis-series="1"]').isChecked()));assert.deepEqual(await page.locator('[id^=tools-source-]').evaluateAll(es=>es.map(e=>e.value)),slots);
 assert.equal((await page.locator('#tools-chart-range').textContent()).split(' · ')[0],compareZoom);assert.equal(await page.locator('#tools-chart-inspection caption').textContent(),compareCursor);
 // File replay remains isolated while the explicitly live comparison grows.
 await page.evaluate(()=>ViewerTracker.__follow.replay());const replayBefore=await page.evaluate(()=>ViewerTracker.__follow.state());await scan(800);const replayAfter=await page.evaluate(()=>ViewerTracker.__follow.state());assert.equal(replayAfter.mode,replayBefore.mode);assert.equal(replayAfter.position,replayBefore.position);assert.equal(Number((await samples())[0]),Number(compareAfter[0])+1);
 await nav('summary');await page.locator('#tools-recording-picker > summary').click();await page.selectOption('#tools-analysis-model','');await page.selectOption('#tools-source-a','current');assert(await page.locator('#tools-follow-live').isDisabled());const fileSamples=await samples();await scan(900);assert.deepEqual(await samples(),fileSamples,'file replay Summary is a fixed snapshot');
 await page.evaluate(()=>ViewerTracker.__follow.closeReplay());
 await nav('library');await page.click('#tools-room-history');assert(await page.locator('#tools-follow-live').isChecked());
 const historyCurrent=await page.locator('#tools-history-recording').inputValue();const options=await page.locator('#tools-history-recording option').evaluateAll(es=>es.map(e=>e.value));
 await page.selectOption('#tools-history-recording',options.at(-1));const oldDetail=await page.locator('#tools-history-detail').textContent(),historyBefore=await page.locator('#tools-history-stats').textContent();
 await page.evaluate(()=>window.historySelect=document.getElementById('tools-history-recording'));await scan(1000);
 assert.equal(await page.locator('#tools-history-detail').textContent(),oldDetail);assert.notEqual(await page.locator('#tools-history-stats').textContent(),historyBefore);assert(await page.evaluate(()=>historySelect===document.getElementById('tools-history-recording')));
 await page.selectOption('#tools-history-recording',historyCurrent);assert.match(await page.locator('#tools-history-detail').textContent(),/14 samples/);
 await page.uncheck('#tools-follow-live');const historyFrozen=await page.locator('#tools-history-detail').textContent();await scan(1100);assert.equal(await page.locator('#tools-history-detail').textContent(),historyFrozen);await page.evaluate(()=>ViewerTracker.__follow.forceSave());await page.click('#tools-history-refresh');assert(!(await page.locator('#tools-follow-live').isChecked()));assert.match(await page.locator('#tools-history-detail').textContent(),/15 samples/,'explicit Refresh updates a frozen history once');await page.check('#tools-follow-live');assert.match(await page.locator('#tools-history-detail').textContent(),/15 samples/);
 // Refresh follows proven Auto lineage while retaining the current selection.
 await page.evaluate(()=>ViewerTracker.__follow.forceSave());await page.click('#tools-history-refresh');assert.match(await page.locator('#tools-history-detail').textContent(),/15 samples/);
 for(const bright of [false,true]){await page.locator('#dark-mode-toggle').setChecked(!bright);await page.locator('#tools-content').evaluate(e=>e.scrollTop=0);await page.screenshot({path:'/tmp/tierscope-follow-live-'+engine+'-'+(bright?'bright':'dark')+'.png'});}
 await page.setViewportSize({width:400,height:800});assert(await page.locator('#tools-content').evaluate(e=>e.scrollWidth<=e.clientWidth));await page.setViewportSize({width:1250,height:1000});
 const other=await context.newPage();await other.goto('https://tierscope.test/other_model/');await other.evaluate(()=>GM_setValue('tierscope:library-model:v1:live_model',JSON.stringify({schemaVersion:1,room:'live_model',favorite:false,autoKeep:false})));
 const beforeUnstar=await page.locator('#tools-history-detail').textContent();await scan(1200);assert.equal(await page.locator('#tools-history-detail').textContent(),beforeUnstar);assert(await page.locator('#tools-follow-live').isDisabled());await other.close();
 await page.evaluate(()=>GM_setValue('tierscope:library-model:v1:live_model',JSON.stringify({schemaVersion:1,room:'live_model',favorite:true,autoKeep:true})));await page.evaluate(()=>ViewerTracker.__follow.status());await page.check('#tools-follow-live');
 await nav('library');await page.click('#tools-compare-previous');const beforeReset=await samples();
 page.once('dialog',d=>d.accept());await page.evaluate(()=>ViewerTracker.__follow.reset());assert(!(await page.locator('#tools-follow-live').isChecked()));await scan(30);assert.deepEqual(await samples(),beforeReset,'Reset cannot substitute a new session into an existing comparison');assert.match(await page.locator('#tools-follow-status').textContent(),/Session changed/);
 // Start with an empty Library/Summary, then receive the first accepted sample.
 page.once('dialog',d=>d.accept());await page.evaluate(()=>ViewerTracker.__follow.reset());await page.click('#tools-close');
 await page.evaluate(()=>{for(const key of GM_listValues())if(key.startsWith('tierscope:library:v1:'))GM_deleteValue(key);});
 await page.click('#btn-control-library');await nav('summary');assert.equal(await page.locator('#tools-analysis-chart').count(),0);
 await scan(50);assert(await page.locator('#tools-follow-live').isChecked());assert.deepEqual(await samples(),['1']);
 await scan(60);const covered=await page.locator('#tools-summary-table tbody tr').nth(2).textContent(),mean=await page.locator('#tools-audience-table tbody tr').first().locator('td').first().textContent();
 await scan(80,600000);assert.deepEqual(await samples(),['3']);assert.equal(await page.locator('#tools-summary-table tbody tr').nth(2).textContent(),covered);assert.equal(await page.locator('#tools-audience-table tbody tr').first().locator('td').first().textContent(),mean,'new gap does not add viewer-time to the average');
 await page.evaluate(()=>{window.history.pushState({},'', '/next_model/');ViewerTracker.__follow.checkUrlChange();});assert.equal(await page.locator('#tierscope-session-tools').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS Follow live in Summary, thirty-way Compare and Model History; freeze/catch-up, controls/thresholds, Auto lineage, storage failure, replay, favorite revocation, Reset/navigation, themes and layout');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
