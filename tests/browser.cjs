const {instrument, prepareSource} = require('./helpers/instrument.cjs');
const fs=require('fs');
const assert=require('assert/strict');
const chromium=require('playwright')[process.env.TIERSCOPE_BROWSER || 'chromium'];
const path=require('path');
const tmp=fs.mkdtempSync(path.join(require('os').tmpdir(),'tierscope-tests-'));
const executablePath=process.env.TIERSCOPE_CHROMIUM_PATH;
const browserArgs=process.env.TIERSCOPE_CHROMIUM_ARGS ? JSON.parse(process.env.TIERSCOPE_CHROMIUM_ARGS) : [];
const source=prepareSource(fs.readFileSync(path.join(__dirname,'../tierscope.user.js'),'utf8'));
const injected=source.replaceAll('scheduleInit(2000);','/* test controls initial setup */').replace('downloadTrackingReport: downloadTrackingReport,',`
 __test: {
   trendCase: function(diff) {
     restoredDisplayFrame=null;hasTrendBaseline=true;trendComparisonMode='last';
     var now=Date.now();history.timestamps=[now-60000,now];
     STORAGE_HISTORY_SERIES.forEach(k=>history[k]=[0,0]);
     ['red','withTokens','total'].forEach(k=>history[k]=[2,2+diff]);
     users=new Map(Array.from({length:2+diff},(_,i)=>['viewer'+i,{tier:'red',gender:'male'}]));
     roomTotal=users.size;updateDisplay();updateTrendDisplay();
   },
   restoreGeometry: restorePanelGeometry,
   setScale: applyScale,
   step: stepPlayback,
   extra: function(){return {scale:currentScale,index:playback?getPlaybackSampleIndex(playback.snapshot,playback.positionMs,playback.stepIndex):null};},
   duplicateSamples: function(){leavePlayback(true);history.timestamps=history.timestamps.slice(0,3);history.timestamps[1]=history.timestamps[0];STORAGE_HISTORY_SERIES.forEach(k=>history[k]=history[k].slice(0,3));},
   setup: function() {
     var start=Date.now()-60*60000;
     var data={timestamp:Date.now(),isPaused:true,trackingStartTime:start,pausedElapsedTime:60*60000,history:{timestamps:[]}};
     for(var i=0;i<60;i++)data.history.timestamps.push(start+i*60000);
     STORAGE_HISTORY_SERIES.forEach(function(k,j){data.history[k]=data.history.timestamps.map(function(_,i){return Math.max(0,Math.round((j+1)*12+Math.sin(i*.2+j)*8));});});
     restoreSessionState(normalizeStoredSession(data));
     activeSessionStorageKey=getStorageKey(getModelName());activeRoomEpoch=getRoomEpoch(activeSessionStorageKey);isAutoRefreshOn=false;isMinimized=true;
     createPanel();toggleView();updateAcquisitionStatus();updateTrendDisplay();saveSession(getModelName());
   },
   state: function(){return {collapsed:Array.from(collapsedRows),heights:panelChartHeights,history:history,isPaused:isPaused,
     auto:isAutoRefreshOn,mode:presentationMode,position:playback&&playback.positionMs,playing:playback&&playback.playing,
     saved:!!restoredDisplayFrame,scanEpoch:scanEpoch,users:users.size};},
   layout: function(keys) {collapsedRows=new Set(keys);applyRowLayout();if(presentationMode==='PLAYBACK')paintPlayback(playback);else{updateDisplay();drawAllSparklines();}},
   repaint: repaintLivePresentation,
   init: init,
   scan: performScanThenReturn,
   fallback: function(){return acquireDOMSnapshot({epoch:scanEpoch,generation:initGuard,url:location.href,room:getModelName()},true);},
   invalidateScan: function(){scanEpoch++;},
   pausePlayback: function(){if(playback&&playback.playing)togglePlayback();},
   savedPrefs: function(){return GM_getValue(COLLAPSED_ROWS_KEY,null);}
 },
 downloadTrackingReport: downloadTrackingReport,`);
(async()=>{
 const browser=await chromium.launch({executablePath,headless:true,args:browserArgs});
 try {
 const context=await browser.newContext({viewport:{width:1100,height:1100},acceptDownloads:true});
 await context.addInitScript(()=>{
   window.GM_listValues=()=>Object.keys(localStorage);
   window.GM_getValue=(key,fallback)=>{const v=localStorage.getItem(key);return v===null?fallback:JSON.parse(v);};
   window.GM_setValue=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
   window.GM_deleteValue=key=>localStorage.removeItem(key);
   window.confirm=()=>true;
 });
 const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://tierscope.test/**',r=>r.fulfill({contentType:r.request().url().includes('/api/')?'text/plain':'text/html',body:r.request().url().includes('/api/')?'5,testroom|o|f|0,viewer|t|m|0':'<!doctype html><html><body style="margin:0;background:#303846;"></body></html>'}));
 await page.goto('https://tierscope.test/testroom/');
 await page.addScriptTag({content:instrument(injected)});
 await page.evaluate(()=>ViewerTracker.__test.setup());
 if(process.env.TIERSCOPE_TRACE)console.log('TRACE setup complete');
 await page.waitForTimeout(150);

 await page.evaluate(()=>ViewerTracker.__test.restoreGeometry());
 await page.waitForTimeout(350);
 const initial=await page.locator('#tracker-container').boundingBox();
 const history=await page.evaluate(()=>ViewerTracker.__test.state().history);
 assert.equal(await page.locator('#btn-download-report,#btn-download-csv,#btn-control-save-session,#btn-control-open-session').count(),0);
 await page.click('#btn-control-library');
 assert(await page.locator('#tools-export-txt').isVisible());
 if(process.env.TIERSCOPE_TRACE)console.log('TRACE before CSV');
 const csvDownload=page.waitForEvent('download');await page.click('#tools-export-csv');
 const downloaded=await csvDownload;if(process.env.TIERSCOPE_TRACE)console.log('TRACE CSV event',downloaded.suggestedFilename());await downloaded.saveAs(path.join(tmp,'smoke.csv'));
 const lines=fs.readFileSync(path.join(tmp,'smoke.csv'),'utf8').replace(/^\uFEFF/,'').trim().split('\r\n');
 assert.equal(lines.length,61);assert.equal(lines[0].split(',').length,16);
 const last=lines.at(-1).split(',').map(s=>s.slice(1,-1));
 assert.equal(Number(last[4]),history.total[59]+history.anonymous[59]);
 assert.equal(Number(last[8]),history.red[59]);assert.equal(last[2],new Date(history.timestamps[59]).toISOString());
 await page.click('#tools-close');
 console.log('PASS simplified controls; Library CSV has all 60 samples and correct totals/timestamps');
 await page.click('#btn-toggle');
 const miniBefore=await page.locator('#tracker-container').boundingBox();
 assert.equal(await page.locator('#mini-settings').isVisible(),false);
 assert.equal(await page.locator('#mini-withtokens-change').textContent(),'');
 assert.match(await page.locator('#mini-chart').getAttribute('title'),/16 samples/);
 await page.click('#mini-metric');assert.match(await page.locator('#mini-metric').textContent(),/💎/);
 assert.equal(await page.evaluate(()=>GM_getValue('tierscope:ui:miniMetric:v1')),'withTokens');
 const miniAfter=await page.locator('#tracker-container').boundingBox();assert.equal(miniAfter.x,miniBefore.x);
 const pixels=await page.evaluate(()=>{
   const c=document.getElementById('mini-chart');return Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data).some((v,i)=>i%4===3&&v>0);
 });assert.equal(pixels,true);
 await page.click('#mini-settings-toggle');assert.equal(await page.locator('#mini-settings').isVisible(),true);
 assert.equal((await page.locator('#tracker-container').boundingBox()).height,miniBefore.height);
 await page.click('.timer-preset[data-time="120"]');assert.equal(await page.locator('#timer-display').textContent(),'120s');
 await page.click('#mini-settings-close');assert.equal(await page.locator('#mini-settings').isVisible(),false);
 assert.equal(await page.locator('#mini-settings-toggle').getAttribute('aria-expanded'),'false');
 await page.click('#mini-settings-toggle');
 await page.evaluate(()=>{const input=document.createElement('input');input.id='outside-focus';document.body.appendChild(input);input.focus();});
 await page.keyboard.press('Escape');assert.equal(await page.locator('#mini-settings').isVisible(),false);
 assert.equal(await page.evaluate(()=>document.activeElement.id),'mini-settings-toggle');
 await page.evaluate(()=>document.getElementById('outside-focus').remove());
 await page.locator('#tracker-container').screenshot({path:path.join(tmp,'mini-saved.png')});
 await page.click('#btn-expand');
 console.log('PASS compact chart pixels, 15-minute window, saved deltas, metric preference, and timer overlay');


 const h=await page.locator('#header-text').boundingBox();
 await page.mouse.move(h.x+40,h.y+5);await page.mouse.down();await page.mouse.move(320,140,{steps:5});await page.mouse.up();
 const moved=await page.locator('#tracker-container').boundingBox();assert(moved.x<500);
 const resize=await page.locator('#resize-handle').boundingBox();
 await page.mouse.move(resize.x+3,resize.y+3);await page.mouse.down();await page.mouse.move(resize.x-70,resize.y+3,{steps:5});await page.mouse.up();
 const scale=(await page.evaluate(()=>ViewerTracker.__test.extra())).scale;assert(scale>1.2);
 const saved=await page.evaluate(()=>JSON.parse(GM_getValue('tierscope:ui:geometry:v1')));
 await page.reload();await page.addScriptTag({content:instrument(injected)});await page.evaluate(()=>ViewerTracker.__test.init());await page.waitForTimeout(400);
 assert.equal((await page.evaluate(()=>ViewerTracker.__test.extra())).scale,scale);
 const restored=await page.locator('#tracker-container').boundingBox();assert(Math.abs(restored.x-saved.left)<1);assert(Math.abs(restored.y-saved.top)<1);
 await page.click('#btn-toggle');
 await page.reload();await page.addScriptTag({content:instrument(injected)});await page.evaluate(()=>ViewerTracker.__test.init());await page.waitForTimeout(400);
 assert.equal(await page.locator('#full-view').isVisible(),true);
 assert.equal((await page.evaluate(()=>ViewerTracker.__test.extra())).scale,scale);
 assert(Math.abs((await page.locator('#tracker-container').boundingBox()).width-restored.width)<1);
 console.log('PASS broadcast room reopens expanded at the saved non-default scale');
 await page.click('#btn-standard-size');assert.equal((await page.evaluate(()=>ViewerTracker.__test.extra())).scale,1);
 assert.equal((await page.locator('#tracker-container').boundingBox()).width,initial.width);
 assert.equal(await page.evaluate(()=>JSON.parse(GM_getValue('tierscope:ui:geometry:v1')).scale),1);
 await page.click('#btn-toggle');assert.match(await page.locator('#mini-metric').textContent(),/💎/);await page.click('#btn-expand');
 console.log('PASS drag/scale survive reload; 100% restores exact standard width and persists');

 await page.click('#btn-replay');await page.evaluate(()=>ViewerTracker.__test.pausePlayback());
 await page.click('#playback-next');
 assert.equal((await page.evaluate(()=>ViewerTracker.__test.extra())).index,1);
 assert.equal((await page.evaluate(()=>ViewerTracker.__test.state())).playing,false);
 await page.click('#playback-previous');assert.equal((await page.evaluate(()=>ViewerTracker.__test.extra())).index,0);
 assert.equal(await page.locator('#playback-previous').isDisabled(),true);
 await page.evaluate(()=>ViewerTracker.__test.step(-1));assert.equal((await page.evaluate(()=>ViewerTracker.__test.extra())).index,0);
 await page.click('#playback-next');await page.click('#collapse-row-purple');
 assert.equal((await page.evaluate(()=>ViewerTracker.__test.extra())).index,1);
 await page.evaluate(()=>ViewerTracker.__test.duplicateSamples());
 await page.click('#btn-replay');await page.evaluate(()=>ViewerTracker.__test.pausePlayback());
 assert.equal((await page.evaluate(()=>ViewerTracker.__test.extra())).index,0,'Replay starts at the first sample even when timestamps match');
 assert.equal(await page.locator('#playback-previous').isDisabled(),true);
 await page.evaluate(()=>ViewerTracker.__test.step(-1));assert.equal((await page.evaluate(()=>ViewerTracker.__test.extra())).index,0);
 await page.click('#playback-next');assert.equal((await page.evaluate(()=>ViewerTracker.__test.extra())).index,1);
 await page.click('#playback-next');assert.equal((await page.evaluate(()=>ViewerTracker.__test.extra())).index,2);
 assert.equal(await page.locator('#playback-next').isDisabled(),true);
 console.log('PASS Replay stepping pauses, respects endpoints, preserves collapsed-row frames, and handles duplicate timestamps');
 await page.locator('#tracker-container').screenshot({path:path.join(tmp,'replay.png')});
 await page.click('#playback-return');await page.locator('#tracker-container').screenshot({path:path.join(tmp,'controls.png')});
 await page.setViewportSize({width:500,height:700});await page.waitForTimeout(160);
 const clipped=await page.locator('#tracker-container').boundingBox();assert(clipped.x>=0&&clipped.x+clipped.width<=501&&clipped.y>=0);
 assert.deepEqual(errors,[]);console.log('PASS viewport clamping and no browser errors');

 // Expanding at an edge must clamp immediately, without transition events.
 await page.setViewportSize({width:900,height:900});
 for(const scale of [1,1.25]) {
   await page.evaluate(scale=>ViewerTracker.__test.setScale(scale),scale);
   const rect=await page.evaluate(()=>{
     const c=document.getElementById('tracker-container');
     document.getElementById('btn-toggle').click();c.style.transition='none';
     const r=c.getBoundingClientRect();c.style.left=(innerWidth-r.width)+'px';c.style.top=(innerHeight-r.height)+'px';c.style.right='auto';
     document.getElementById('btn-expand').click();const a=c.getBoundingClientRect();
     return {left:a.left,top:a.top,right:a.right,bottom:a.bottom};
   });
   assert(rect.left>=0&&rect.top>=0&&rect.right<=900.1&&rect.bottom<=900.1,JSON.stringify(rect));
 }
 await page.click('#btn-standard-size');
 const alignment=await page.evaluate(()=>{
   const r=document.getElementById('control-action-row').getBoundingClientRect();
   const b=document.getElementById('control-action-buttons').getBoundingClientRect();
   const t=document.getElementById('control-session-buttons').getBoundingClientRect();
   const theme=document.getElementById('dark-mode-control').getBoundingClientRect();
   return {expectedLeft:Math.max(r.left+(r.width-b.width)/2,t.right+3),left:b.left,right:b.right,themeLeft:theme.left};
 });
 assert(Math.abs(alignment.expectedLeft-alignment.left)<1);assert(alignment.right<=alignment.themeLeft);
 console.log('PASS expansion clamping and Controls centered within available space');

 const keys=['red','green','purple','pink','dark-blue','light-blue','gray','female-trans','withtokens','total','anon'];
 for(const lineHeight of ['normal','1.5']) {
   await page.setViewportSize({width:1100,height:1100});
   await page.reload();
   await page.evaluate(value=>{localStorage.removeItem('tierscope:ui:geometry:v1');document.body.style.lineHeight=value;},lineHeight);
   await page.addScriptTag({content:instrument(injected)});await page.evaluate(()=>ViewerTracker.__test.setup());
   await page.waitForTimeout(400);
   const result=await page.evaluate(keys=>{
     ViewerTracker.__test.layout([]);
     const box=()=>document.getElementById('tracker-container').getBoundingClientRect();
     const baseline=box().height;let min=Infinity,max=0,overflow=0;
     for(let mask=0;mask<2047;mask++){
       const hidden=keys.filter((_,i)=>mask&(1<<i));ViewerTracker.__test.layout(hidden);
       min=Math.min(min,box().height);max=Math.max(max,box().height);
       const region=document.getElementById('tier-chart-region').getBoundingClientRect();
       for(const k of keys.filter(k=>!hidden.includes(k)))overflow=Math.max(overflow,document.getElementById('tier-row-'+k).getBoundingClientRect().bottom-region.bottom);
     }
     ViewerTracker.__test.layout(keys);const compact=box().height;
     ViewerTracker.__test.layout(keys.slice(1));const restored=box().height;
     return {baseline,min,max,overflow,compact,restored};
   },keys);
   assert.equal(result.min,result.baseline);assert.equal(result.max,result.baseline);
   assert.equal(result.restored,result.baseline);assert(result.compact<result.baseline-250);assert(result.overflow<=0.5);
   console.log('PASS all 2,048 collapse combinations; inherited line-height '+lineHeight, result);
 }
 // API failure uses real DOM fallback, restores the selected tab, and respects cooldown.
 await page.evaluate(()=>{
   const fixture=document.createElement('div');fixture.id='room-fixture';
   fixture.innerHTML='<div role="tablist"><button role="tab" aria-selected="false" data-testid="users-tab-default">USERS (6)</button><button role="tab" aria-selected="true" data-testid="chat-tab-default">CHAT</button><button role="tab" aria-selected="false" data-tab="private">PRIVATE</button></div><div id="UserListTab"><span class="username mod">moduser</span><span class="username defaultUser">viewer</span></div>';
   document.body.appendChild(fixture);window.tabClicks={users:0,chat:0};
   for(const tab of fixture.querySelectorAll('[role="tab"]')) tab.onclick=()=>{
     const name=tab.dataset.tab || (tab.dataset.testid.startsWith('users')?'users':'chat');
     window.tabClicks[name]=(window.tabClicks[name]||0)+1;
     for(const other of fixture.querySelectorAll('[role="tab"]')) other.setAttribute('aria-selected',String(other===tab));
   };
 });
 await page.route('https://tierscope.test/api/**',r=>r.fulfill({contentType:'text/plain',body:'invalid response'}));
 await page.click('#btn-replay');await page.evaluate(()=>ViewerTracker.__test.pausePlayback());
 const replayBefore=await page.evaluate(()=>ViewerTracker.__test.state());
 await page.evaluate(()=>ViewerTracker.__test.scan());
 const afterFallback=await page.evaluate(()=>ViewerTracker.__test.state());
 assert.equal(afterFallback.history.total.at(-1),2);
 assert.equal(afterFallback.history.anonymous.at(-1),4);
 assert.equal(afterFallback.position,replayBefore.position);assert.equal(afterFallback.playing,false);
 assert.match(await page.locator('#header-text').textContent(),/^PLAYBACK:/);
 assert.deepEqual(await page.evaluate(()=>window.tabClicks),{users:1,chat:1});
 await page.evaluate(()=>ViewerTracker.__test.scan());
 assert.equal((await page.evaluate(()=>ViewerTracker.__test.state())).history.timestamps.length,afterFallback.history.timestamps.length);
 assert.deepEqual(await page.evaluate(()=>window.tabClicks),{users:1,chat:1});
 await page.click('#playback-return');assert.match(await page.locator('#acquisition-status').textContent(),/^Retry in/);
 console.log('PASS real DOM fallback, Chat return, cooldown, and independent frozen Replay');
 const fallbackCases=await page.evaluate(async()=>{
   const fixture=document.getElementById('room-fixture');
   const users=fixture.querySelector('[data-testid="users-tab-default"]');
   const chat=fixture.querySelector('[data-testid="chat-tab-default"]');
   const pm=fixture.querySelector('[data-tab="private"]');
   const select=tab=>{for(const other of fixture.querySelectorAll('[role="tab"]'))other.setAttribute('aria-selected',String(other===tab));window.tabClicks={};};
   const selected=()=>fixture.querySelector('[aria-selected="true"]')?.textContent;
   const result={};
   select(users);await ViewerTracker.__test.fallback();result.users={clicks:{...tabClicks},selected:selected()};
   select(pm);await ViewerTracker.__test.fallback();result.private={clicks:{...tabClicks},selected:selected()};
   select(null);try{await ViewerTracker.__test.fallback();}catch(e){result.unknownError=e.message;}
   result.unknownClicks={...tabClicks};
   select(chat);let pending=ViewerTracker.__test.fallback();pm.click();
   result.interrupted={snapshot:await pending,clicks:{...tabClicks},selected:selected()};
   select(chat);pending=ViewerTracker.__test.fallback();ViewerTracker.__test.invalidateScan();
   result.stale={snapshot:await pending,clicks:{...tabClicks}};
   select(pm);Object.defineProperty(users,'textContent',{configurable:true,get(){throw new Error('DOM parse failure');}});
   try{await ViewerTracker.__test.fallback();}catch(e){result.parseError=e.message;}
   delete users.textContent;result.failed={clicks:{...tabClicks},selected:selected()};
   return result;
 });
 assert.deepEqual(fallbackCases.users,{clicks:{},selected:'USERS (6)'});
 assert.deepEqual(fallbackCases.private,{clicks:{users:1,private:1},selected:'PRIVATE'});
 assert.match(fallbackCases.unknownError,/selected tab/);assert.deepEqual(fallbackCases.unknownClicks,{});
 assert.deepEqual(fallbackCases.interrupted,{snapshot:null,clicks:{users:1,private:1},selected:'PRIVATE'});
 assert.deepEqual(fallbackCases.stale,{snapshot:null,clicks:{users:1}});
 assert.match(fallbackCases.parseError,/DOM parse failure/);
 assert.deepEqual(fallbackCases.failed,{clicks:{users:1,private:1},selected:'PRIVATE'});
 console.log('PASS DOM fallback preserves Users/private tabs, skips unknown state, respects user navigation, and restores after parse failure');
 await page.click('#btn-toggle');
 assert.notEqual(await page.locator('#mini-total-change').textContent(),'');
 assert.match(await page.locator('#mini-freshness').getAttribute('title'),/DOM/);
 const fit=await page.evaluate(()=>{
   const c=document.getElementById('tracker-container').getBoundingClientRect();
   return ['mini-metric','mini-high','mini-chart','btn-auto','mini-settings-toggle','btn-expand'].every(id=>{
     const r=document.getElementById(id).getBoundingClientRect();return r.left>=c.left&&r.right<=c.right&&r.bottom<=c.bottom;
   });
 });assert(fit);
 await page.locator('#tracker-container').screenshot({path:path.join(tmp,'mini-live.png')});
 console.log('PASS compact live deltas, source freshness, and controls fit');

 // The page type decides startup view, even with 3.1.11's obsolete preference.
 await page.setViewportSize({width:1100,height:1100});
 for(const legacyMinimized of [true,false]) {
   for(const [urlPath,expanded] of [['testroom/',true],['b/testroom/',true],['testroom/cam/',true],['',false],['followed/',false],['featured/',false],['female-cams/',false],['trans-cams/',false],['male-cams/',false]]) {
     await page.goto('https://tierscope.test/'+urlPath);
     await page.evaluate(minimized=>GM_setValue('tierscope:ui:geometry:v1',JSON.stringify({left:40,top:40,scale:1.25,minimized})),legacyMinimized);
     await page.addScriptTag({content:instrument(injected)});await page.evaluate(()=>ViewerTracker.__test.init());await page.waitForTimeout(100);
     assert.equal(await page.locator('#full-view').isVisible(),expanded,urlPath);
     assert.equal(await page.locator('#minimized-view').isVisible(),!expanded,urlPath);
     assert.equal((await page.evaluate(()=>ViewerTracker.__test.extra())).scale,1.25);
     if(!expanded) {
       await page.click('#mini-settings-toggle');await page.click('#mini-settings-close');
       assert.equal(await page.locator('#mini-settings').isVisible(),false);
     }
   }
 }
 console.log('PASS page-based startup across room routes and directory pages; obsolete view preferences ignored; scale retained');

 await page.click('#btn-expand');
 for(const diff of [-1,0,1]) {
   await page.evaluate(diff=>ViewerTracker.__test.trendCase(diff),diff);
   const styles=await page.evaluate(()=>{
     const rows=document.querySelectorAll('#trend-container > div');
     const a=getComputedStyle(rows[0].children[0]),b=getComputedStyle(rows[2].children[0]);
     return {tier:a.backgroundColor,diamond:b.backgroundColor,border:b.borderColor,tierPadding:a.paddingTop,totalPadding:b.paddingTop,rowPadding:getComputedStyle(rows[2]).paddingTop};
   });
   assert.equal(styles.diamond,styles.tier);assert.equal(styles.border,'rgb(255, 105, 180)');
   assert.equal(styles.tierPadding,'2px');assert.equal(styles.totalPadding,'6px');assert.equal(styles.rowPadding,'4px');
   if(diff===1)assert.equal(styles.diamond,'rgba(50, 205, 50, 0.22)');
 }
 await page.click('#btn-toggle');
 for(const expected of ['Room total ▾','💎 ▾','📊 ▾']) {
   // Current stored selection is With Tokens; cycle until reaching each target.
   for(let i=0;i<3&&(await page.locator('#mini-metric').textContent())!==expected;i++)await page.click('#mini-metric');
   assert.equal(await page.locator('#mini-metric').textContent(),expected);
   assert.match(await page.locator('#mini-metric').getAttribute('aria-label'),/chart/);
 }
 console.log('PASS metric icons, accessible labels, larger third-row boxes, and diamond increase/stable/decrease backgrounds');
 assert.deepEqual(errors,[]);
 } finally {await browser.close();fs.rmSync(tmp,{recursive:true,force:true});}

})().catch(e=>{console.error(e);process.exit(1);});
