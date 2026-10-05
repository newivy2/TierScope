const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {instrument,prepareSource}=require('./helpers/instrument.cjs');
const {openLibraryBook}=require('./helpers/library.cjs');
const engine=process.env.TIERSCOPE_BROWSER||'chromium';
const source=prepareSource(fs.readFileSync(path.join(__dirname,'../tierscope.user.js'),'utf8')).replaceAll('scheduleInit(2000);','')
.replace('downloadTrackingReport: downloadTrackingReport,',`__modelHistory:{checkUrlChange,
 setup(){loadSession(getModelName());var now=Date.now(),h={timestamps:[now-840000,now-780000,now-600000,now],breaks:[false,false,false,true]};
 STORAGE_HISTORY_SERIES.forEach(k=>h[k]=[0,0,0,0]);h.red=[10,20,80,99];h.total=h.red.slice();h.withTokens=h.red.slice();h.anonymous=[5,5,5,5];
 restoreSessionState(normalizeStoredSession({timestamp:now,history:h,isPaused:true,pausedElapsedTime:840000}));
 isAutoRefreshOn=false;isMinimized=true;createPanel();toggleView();repaintLivePresentation();saveSession(getModelName());
 },
 seed(count=3){
 const base=captureSessionFile();
 for(let i=0;i<count;i++){
  const a=JSON.parse(JSON.stringify(base)),offset=(count-i)*86400000;a.room='history_model';
  a.session.history.timestamps=a.session.history.timestamps.map(t=>t-offset);a.session.timestamp-=offset;a.session.sessionStartedAt-=offset;
  for(const key of STORAGE_HISTORY_SERIES){if(key!=='anonymous')a.session.history[key]=a.session.history[key].map(v=>v*(i+1));
   a.session.sessionHighs[key]={value:Math.max(...a.session.history[key]),time:a.session.history.timestamps[3]};}
  a.session.roomTotalHigh=a.session.history.total[3]+5;a.session.roomTotalHighTime=a.session.history.timestamps[3];
  if(count===3&&i===2){for(const key of ['timestamps','breaks',...STORAGE_HISTORY_SERIES])a.session.history[key]=a.session.history[key].slice(-1);}
  const title=i===0?'<b>First recording</b>':'Recording '+(i+1);
  GM_setValue('tierscope:library:v1:history_'+i,JSON.stringify({schemaVersion:1,addedAt:Date.now(),title,archive:a}));
 }
 const other=JSON.parse(JSON.stringify(base));other.room='other_model';keepSessionInLibrary(other);
 },
 state:()=>({history:JSON.stringify(history),paused:isPaused,mode:presentationMode,room:getModelName(),ath:JSON.stringify(readAllTimeHighs(getModelName()).highs)}),
 replay:()=>({room:playback?.archive.room,times:playback?.archive.session.history.timestamps,position:playback?.samplePosition}),
 closeReplay:leavePlayback, theme:()=>{isDarkMode=!isDarkMode;applyPanelTheme();},library:readSessionLibrary},
 downloadTrackingReport: downloadTrackingReport,`);
(async()=>{
 const browser=await require('playwright')[engine].launch({headless:true,executablePath:process.env.TIERSCOPE_CHROMIUM_PATH,args:JSON.parse(process.env.TIERSCOPE_CHROMIUM_ARGS||'[]')});
 try{
  const context=await browser.newContext({viewport:{width:1100,height:1000},timezoneId:'America/Sao_Paulo'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('https://tierscope.test/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body style="background:#303846"></body>'}));
  await context.addInitScript(()=>{
   window.GM_listValues=()=>Object.keys(localStorage);window.GM_getValue=(k,d)=>localStorage.getItem(k)===null?d:JSON.parse(localStorage.getItem(k));
   window.GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));window.GM_deleteValue=k=>localStorage.removeItem(k);
  });
  await page.goto('https://tierscope.test/live_room/');await page.addScriptTag({content:instrument(source)});
  await page.evaluate(()=>{ViewerTracker.__modelHistory.setup();ViewerTracker.__modelHistory.seed();});await page.waitForTimeout(250);
  const before=await page.evaluate(()=>ViewerTracker.__modelHistory.state()),bounds=await page.locator('#tracker-container').boundingBox();
  await page.click('#btn-control-library');
  assert.match(await page.locator('#tools-room-history').getAttribute('title'),/live_room/);
  assert.match(await page.locator('#tools-room-shortcuts').textContent(),/History · 0/);
  assert(await page.evaluate(()=>document.querySelector('.tools-current').contains(document.getElementById('tools-room-shortcuts'))));
  await page.click('#tools-room-history');assert.match(await page.locator('#tools-content').textContent(),/No saved recordings for this model/);
  await page.click('#tools-history-back');assert.equal(await page.evaluate(()=>document.activeElement.id),'tools-sessions-book-toggle');await openLibraryBook(page,false);await page.click('#tools-folder-history_model');
  await page.locator('#tools-model-history').focus();await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'tools-history-back');
  const stats=()=>page.locator('#tools-history-stats dd').allTextContents();
  assert.deepEqual(await stats(),['3 / 3','31.3','302','100%','00:08:00','00:20:00']);
  assert.equal(await page.locator('#tools-history-recording option').count(),3);
  assert.equal(await page.locator('#tools-history-table tbody tr').count(),3);
  assert.match(await page.locator('#tools-history-detail').textContent(),/Average Not enough data/);
  assert.equal(await page.locator('#tools-history-table b').count(),0,'stored titles are text');
  assert.equal(await page.locator('[data-tools-tab=library]').getAttribute('aria-pressed'),'true');
  assert(await page.evaluate(()=>Boolean(document.getElementById('tools-history-actions').compareDocumentPosition(document.getElementById('tools-history-chart'))&Node.DOCUMENT_POSITION_FOLLOWING)));
  const primaryAction=await page.locator('#tools-history-compare').boundingBox(),contentBounds=await page.locator('#tools-content').boundingBox();
  assert(primaryAction.y>=contentBounds.y&&primaryAction.y+primaryAction.height<=contentBounds.y+contentBounds.height,'Compare with previous is visible without scrolling');
  assert.match(await page.locator('#tools-history-compare-hint').textContent(),/2 earlier recordings.*3 total/);
  assert(await page.evaluate(()=>Boolean(document.getElementById('tools-history-chart').compareDocumentPosition(document.getElementById('tools-history-stats'))&Node.DOCUMENT_POSITION_FOLLOWING)));
  await page.locator('#tools-history-chart').evaluate(canvas=>{
   const box=canvas.getBoundingClientRect(),width=Math.max(240,canvas.clientWidth);
   canvas.dispatchEvent(new MouseEvent('click',{clientX:box.left+48/width*box.width,clientY:box.top+(155-104/302*139)/200*box.height,bubbles:true}));
  });
  assert.equal(await page.locator('#tools-history-recording').inputValue(),'history_0','chart peak selects its recording');
  await page.locator('[data-history-id="history_1"]').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('#tools-history-recording').inputValue(),'history_1','table selection works by keyboard');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'tools-history-recording');
  await page.selectOption('#tools-history-recording','history_0');
  assert.match(await page.locator('#tools-history-detail').textContent(),/Average 22.5 · Peak in recording 104/);
  assert(await page.locator('#tools-history-compare').isDisabled());
  await page.selectOption('#tools-history-metric','withTokens');
  assert.equal(await page.locator('#tools-history-recording').inputValue(),'history_0','metric preserves selected recording');
  assert.match(await page.locator('#tools-history-detail').textContent(),/Average 17.5/);
  await page.click('#tools-history-summary');
  assert.equal(await page.locator('#tools-source-a').inputValue(),'history_0');assert.equal(await page.locator('#tools-metric').inputValue(),'withTokens');
  await page.click('[data-tools-tab=library]');await page.click('#tools-model-history');await page.selectOption('#tools-history-recording','history_1');
  await page.click('#tools-history-compare');assert.equal(await page.locator('#tools-source-a').inputValue(),'history_1');assert.equal(await page.locator('#tools-source-b').inputValue(),'history_0');
  assert.equal(await page.locator('#tools-recording-picker').getAttribute('open'),null,'automatic comparison opens on its chart');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'tools-analysis-chart','keyboard inspection is ready after opening comparison');
  await page.click('[data-tools-tab=library]');await page.click('#tools-model-history');
  await page.selectOption('#tools-history-metric','room');
  assert.deepEqual(await page.evaluate(()=>ViewerTracker.__modelHistory.state()),before,'history analysis leaves live state and ATH unchanged');
  await page.click('#tools-history-replay');assert.equal(await page.locator('#tools-history-chart').count(),1,'replay leaves history view open');
  assert.equal((await page.evaluate(()=>ViewerTracker.__modelHistory.replay())).room,'history_model');
  assert.equal(await page.locator('#tools-history-recording').inputValue(),'history_1');
  await page.click('[data-tools-tab=library]');assert.match(await page.locator('#tools-room-history').getAttribute('title'),/live_room/,'the page shortcut does not switch to a different replay model');
  assert.equal(await page.locator('#tools-current-room-replay').textContent(),'history_model');await page.click('#tools-model-history');
  await page.evaluate(()=>ViewerTracker.__modelHistory.closeReplay());
  assert.deepEqual(await page.evaluate(()=>ViewerTracker.__modelHistory.state()),before);
  assert.deepEqual(await page.locator('#tracker-container').boundingBox(),bounds,'history does not reposition the Scope');
  // Capture both themes and verify the existing sheet/z-order invariant.
  await page.click('#tools-history-refresh');
  await page.locator('#tools-content').evaluate(e=>e.scrollTop=0);
  await page.screenshot({path:'/tmp/tierscope-model-history-'+engine+'-dark.png'});
  await page.evaluate(()=>ViewerTracker.__modelHistory.theme());await page.waitForTimeout(60);
  await page.screenshot({path:'/tmp/tierscope-model-history-'+engine+'-bright.png'});
  await page.setViewportSize({width:380,height:740});await page.waitForTimeout(100);
  assert((await page.locator('#tierscope-session-tools').evaluate(e=>e.scrollWidth-e.clientWidth))<=1);
  assert(await page.evaluate(()=>+getComputedStyle(document.getElementById('tracker-container')).zIndex>+getComputedStyle(document.getElementById('tierscope-session-tools')).zIndex));
  await page.setViewportSize({width:1100,height:1000});await page.waitForTimeout(100);
  // Another tab replaces and then removes saved records while the overview stays open.
  const second=await context.newPage();await second.goto('https://tierscope.test/other_room/');
  await second.evaluate(()=>{
   const k='tierscope:library:v1:history_1',raw=JSON.parse(GM_getValue(k));raw.title='Renamed elsewhere';GM_setValue(k,JSON.stringify(raw));
   GM_setValue('tierscope:library:v1:history_2','broken');
  });
  await page.click('#tools-history-refresh');assert.equal(await page.locator('#tools-history-recording option').count(),2);
  assert.match(await page.locator('#tools-history-detail').textContent(),/Renamed elsewhere/);
  assert.match(await page.locator('#tools-content').textContent(),/1 unreadable library record/);
  await second.evaluate(()=>{
   const a=JSON.parse(GM_getValue('tierscope:library:v1:history_0')),b=JSON.parse(GM_getValue('tierscope:library:v1:history_1'));
   const offset=b.archive.session.history.timestamps[0]-a.archive.session.history.timestamps[0]-1000;
   b.archive.session.history.timestamps=b.archive.session.history.timestamps.map(t=>t-offset);b.archive.session.timestamp-=offset;b.archive.session.sessionStartedAt-=offset;
   for(const high of Object.values(b.archive.session.sessionHighs))if(high.time!==null)high.time-=offset;
   b.archive.session.roomTotalHighTime-=offset;GM_setValue('tierscope:library:v1:history_1',JSON.stringify(b));
  });
  await page.click('#tools-history-refresh');assert.match(await page.locator('#tools-history-overlap').textContent(),/may count the same period more than once/);
  await second.evaluate(()=>{for(const k of GM_listValues())if(k.startsWith('tierscope:library:v1:history_'))GM_deleteValue(k);});
  await page.click('#tools-history-refresh');assert.match(await page.locator('#tools-content').textContent(),/No saved recordings for this model/);
  // Large folder: chart retains every recording; the list is paginated and windows change statistics.
  await page.evaluate(()=>ViewerTracker.__modelHistory.seed(55));await page.click('#tools-history-refresh');
  assert.equal(await page.locator('#tools-history-recording option').count(),55);assert.equal(await page.locator('#tools-history-table tbody tr').count(),50);
  await page.click('#tools-history-more');assert.equal(await page.locator('#tools-history-table tbody tr').count(),55);assert.equal(await page.evaluate(()=>document.activeElement.id),'tools-history-recording');
  await page.selectOption('#tools-history-range','10');assert.equal(await page.locator('#tools-history-recording option').count(),10);assert.equal((await stats())[0],'10 / 55');
  assert.deepEqual(await page.locator('#tools-history-recording option').evaluateAll(options=>options.map(o=>o.value)),Array.from({length:10},(_,i)=>'history_'+(54-i)));
  await page.selectOption('#tools-history-recording','history_45');await page.click('#tools-history-compare');
  assert.deepEqual(await page.locator('[id^=tools-source-]').evaluateAll(selects=>selects.map(s=>s.value)),['history_45','history_44','history_43','history_42','history_41','history_40']);
  assert.equal(await page.locator('#tools-chart-inspection tbody tr').count(),6);assert.equal(await page.locator('#tools-analysis-model').inputValue(),'history_model');
  await page.click('[data-tools-tab=library]');await page.click('#tools-model-history');
  await page.selectOption('#tools-history-range','30');assert.equal(await page.locator('#tools-history-table tbody tr').count(),30);
  await page.click('#tools-history-back');assert.equal(await page.evaluate(()=>document.activeElement.id),'tools-model-history');
  await page.click('#tools-model-history');await page.keyboard.press('Escape');assert.equal(await page.locator('#tierscope-session-tools').count(),0);assert.equal(await page.evaluate(()=>document.activeElement.id),'btn-control-library');
  await page.click('#btn-control-library');await openLibraryBook(page,false);await page.click('#tools-folder-history_model');await page.click('#tools-model-history');
  await page.evaluate(()=>{history.pushState({},'', '/next_room/');ViewerTracker.__modelHistory.checkUrlChange();});
  assert.equal(await page.locator('#tierscope-session-tools').count(),0,'navigation disposes history view');
  // Opening Library on this model's actual page offers its saved history directly.
  const roomPage=await context.newPage();roomPage.on('pageerror',e=>errors.push(e.message));await roomPage.goto('https://tierscope.test/history_model/');
  await roomPage.addScriptTag({content:instrument(source)});await roomPage.evaluate(()=>ViewerTracker.__modelHistory.setup());await roomPage.click('#btn-control-library');
  assert.match(await roomPage.locator('#tools-room-shortcuts').textContent(),/History · 55/);
  await roomPage.screenshot({path:'/tmp/tierscope-model-history-shortcut-'+engine+'.png'});
  await roomPage.locator('#tools-room-history').focus();await roomPage.keyboard.press('Enter');
  assert.equal(await roomPage.locator('#tools-history-recording').inputValue(),'history_54');await roomPage.click('#tools-history-compare');
  assert.deepEqual(await roomPage.locator('[id^=tools-source-]').evaluateAll(selects=>selects.map(s=>s.value)),['history_54','history_53','history_52','history_51','history_50','history_49']);
  await roomPage.evaluate(()=>{history.pushState({},'', '/tags/testroom/');ViewerTracker.__modelHistory.checkUrlChange();});
  await roomPage.click('#btn-control-library');assert(await roomPage.locator('#tools-room-history').isHidden(),'directory pages have no model shortcut');
  await roomPage.close();
  assert.deepEqual(errors,[]);console.log(engine+': model history statistics, controls, themes, isolation, cross-tab refresh, pagination and cleanup passed');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
