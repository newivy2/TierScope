const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {instrument, prepareSource} = require('./helpers/instrument.cjs');
const engine = process.env.TIERSCOPE_BROWSER || 'chromium';
const source = prepareSource(fs.readFileSync(path.join(__dirname, '../tierscope.user.js'), 'utf8')).replaceAll('scheduleInit(2000);', '')
 .replace('downloadTrackingReport: downloadTrackingReport,', `__clock:{scan:performScanThenReturn,scale:applyScale,
 setup(){loadSession(getModelName());
 const at=(d,h,m=0)=>new Date(2026,9,d,h,m).getTime();
 function adopt(timestamps,values,breaks=timestamps.map(()=>false),start=timestamps[0],running=false){const h={timestamps,breaks};
 STORAGE_HISTORY_SERIES.forEach(k=>h[k]=timestamps.map(()=>0));h.total=values;h.red=values.slice();h.withTokens=values.slice();h.anonymous=timestamps.map(()=>5);
 restoreSessionState(normalizeStoredSession({timestamp:Date.now(),history:h,sessionStartedAt:start,sessionStartEstimated:false,isPaused:!running,pausedElapsedTime:timestamps.at(-1)-start}));return captureLiveSessionFile();}
 const records=[
 ['Earlier night',[at(4,23),at(5,1)],[40,60]],
 ['Morning',[at(3,9),at(3,12)],[70,90]],
 ['Midnight gap',[at(2,23),at(3,0,30),at(3,1)],[80,100,120],[false,true,false]],
 ['Exactly 24h',[at(1,1),at(2,1)],[30,50]],
 ['Over 24h',[at(1,0),at(2,0)+1000],[10,20]],
 ['Retained tail',[at(3,8),at(3,9)],[20,30],undefined,at(2,0)]];
 records.forEach(([title,times,values,breaks,start])=>keepSessionInLibrary(adopt(times,values,breaks,start),title));
 adopt([at(5,23),at(6,0,30),at(6,1)],[10,20,30],undefined,at(5,23),true);
 isAutoRefreshOn=false;isMinimized=true;createPanel();toggleView();repaintLivePresentation();setModelFavorite(getModelName(),true,true);saveSession(getModelName(),true);},
 state:()=>({history:JSON.stringify(history),paused:isPaused,mode:presentationMode,position:playback&&playback.positionMs}),
 store:()=>JSON.stringify(readSessionLibrary()),
 },downloadTrackingReport: downloadTrackingReport,`);
(async () => {
 const browser = await require('playwright')[engine].launch({headless:true, executablePath:process.env.TIERSCOPE_CHROMIUM_PATH, args:JSON.parse(process.env.TIERSCOPE_CHROMIUM_ARGS || '[]')});
 try {
  const context = await browser.newContext({viewport:{width:1250,height:1000}, timezoneId:'America/Sao_Paulo'}), page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  let registered = 60;
  await context.route('https://tierscope.test/**', r => r.fulfill({contentType:r.request().url().includes('/api/')?'text/plain':'text/html', body:r.request().url().includes('/api/')?'5,'+Array.from({length:registered},(_,i)=>'viewer'+i+'|m|m|0').join(','):'<!doctype html><body style="background:#26303a"></body>'}));
  await context.addInitScript(() => {window.testNow=Date.UTC(2026,9,6,4);Date.now=()=>window.testNow;
   window.GM_listValues=()=>Object.keys(localStorage);window.GM_getValue=(k,d)=>localStorage.getItem(k)===null?d:JSON.parse(localStorage.getItem(k));
   window.GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));window.GM_deleteValue=k=>localStorage.removeItem(k);
   window.axisLabels=[];const fill=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.axisLabels.push(text);return fill.call(this,text,...args);};
  });
  await page.goto('https://tierscope.test/clock_model/');await page.addScriptTag({content:instrument(source)});await page.evaluate(()=>ViewerTracker.__clock.setup());
  await page.click('#btn-control-library');await page.click('[data-tools-tab=compare]');
  const picker=async()=>{if(!(await page.locator('#tools-recording-picker').evaluate(e=>e.open)))await page.locator('#tools-recording-picker > summary').click();};
  const choose=async(slot,title)=>{await picker();const value=await page.locator('#tools-source-'+slot+' option').evaluateAll((es,title)=>es.find(e=>e.textContent.includes(title)).value,title);await page.selectOption('#tools-source-'+slot,value);};
  await choose('b','Earlier night');
  const state=await page.evaluate(()=>ViewerTracker.__clock.state()), store=await page.evaluate(()=>ViewerTracker.__clock.store());
  const report=()=>page.locator('#tools-summary-table').textContent();
  const count=()=>page.locator('#tools-chart-inspection tbody tr td').first().textContent();
  const key=async name=>{await page.locator('#tools-analysis-chart').focus();await page.keyboard.press(name);};
  const mode=async value=>{await page.selectOption('#tools-compare-axis',value);};
  assert.equal(await page.locator('#tools-compare-axis').inputValue(),'elapsed');assert(await page.locator('#tools-shared-length').isChecked());
  await page.uncheck('#tools-shared-length');const fullReport=await report();await page.check('#tools-shared-length');
  await mode('clock');assert.equal(await report(),fullReport,'clock statistics use full recordings');
  assert(await page.locator('#tools-shared-length').isDisabled());assert(await page.locator('#tools-shared-length').isChecked());
  assert.match(await page.locator('#tools-compare-axis-hint').textContent(),/America\/Sao_Paulo/);
  assert.match(await page.locator('#tools-chart-range').textContent(),/00:00 – 24:00/);
  for(const tick of ['00:00','06:00','12:00','18:00','24:00'])assert(await page.evaluate(tick=>window.axisLabels.includes(tick),tick));
  assert.equal(await count(),'15','midnight holds last accepted room audience');
  assert.match(await page.locator('#tools-chart-inspection tbody tr').first().textContent(),/sample 1.*held/);
  await key('ArrowRight');assert.match(await page.locator('#tools-chart-inspection caption').textContent(),/00:30/);assert.equal(await count(),'25');
  await key('End');await key('ArrowLeft');assert.match(await page.locator('#tools-chart-inspection caption').textContent(),/23:00/);assert.equal(await count(),'15');
  await page.click('#tools-chart-zoom-in');const range=await page.locator('#tools-chart-range').textContent(),cursor=await page.locator('#tools-chart-inspection caption').textContent();
  await page.uncheck('[data-analysis-series="1"]');await page.evaluate(()=>window.clockCanvas=document.getElementById('tools-analysis-chart'));
  await page.click('#tools-metric-total');assert.equal(await count(),'10');assert.equal(await page.locator('#tools-chart-range').textContent(),range);assert.equal(await page.locator('#tools-chart-inspection caption').textContent(),cursor);
  assert(!(await page.locator('[data-analysis-series="1"]').isChecked()));assert(await page.evaluate(()=>clockCanvas===document.getElementById('tools-analysis-chart')));
  await mode('elapsed');assert(!(await page.locator('#tools-shared-length').isDisabled()));assert(await page.locator('#tools-shared-length').isChecked());assert.match(await page.locator('#tools-chart-inspection caption').textContent(),/Cursor 0m$/);
  assert(!(await page.locator('[data-analysis-series="1"]').isChecked()),'changing axis retains visibility');
  await mode('clock');await page.check('[data-analysis-series="1"]');await page.click('#tools-metric-room');
  await choose('b','Midnight gap');assert.match(await page.locator('#tools-chart-inspection tbody tr').nth(1).textContent(),/Recording gap/);
  await choose('b','Exactly 24h');assert.equal(await page.locator('#tools-analysis-chart').count(),1);await key('Home');await key('ArrowRight');await key('ArrowRight');
  assert.match(await page.locator('#tools-chart-inspection tbody tr').nth(1).textContent(),/35 \/ 55/,'24h endpoint has two dated accepted values');
  for(const title of ['Over 24h','Retained tail']){
   await choose('b',title);assert.equal(await page.locator('#tools-analysis-chart').count(),0);assert.match(await page.locator('#tools-analysis-output').textContent(),/recording B exceeds 24 hours/);assert.equal(await page.locator('#tools-summary-table').count(),1);
   await page.fill('#tools-threshold','25');await page.click('#tools-apply-threshold');assert.equal(await page.locator('#tools-analysis-chart').count(),0);
   await mode('elapsed');assert.equal(await page.locator('#tools-analysis-chart').count(),1);await mode('clock');assert.equal(await page.locator('#tools-analysis-chart').count(),0);
  }
  await choose('b','Earlier night');assert.equal(await page.locator('#tools-analysis-chart').count(),1);
  await page.click('[data-tools-tab=summary]');assert.equal(await page.locator('#tools-compare-axis').count(),0);assert.match(await page.locator('#tools-analysis-chart').getAttribute('aria-label'),/elapsed time/);
  await page.click('[data-tools-tab=compare]');assert.equal(await page.locator('#tools-compare-axis').inputValue(),'clock');
  await picker();await page.fill('#tools-analysis-from','2026-10-01');assert.equal(await page.locator('#tools-compare-axis').inputValue(),'clock');
  // Six short recordings still use the existing line styles and shared inspection.
  while((await page.locator('[id^=tools-source-]').count())<6){await picker();await page.click('#tools-compare-add');}
  await choose('c','Morning');await choose('d','Midnight gap');await choose('e','Exactly 24h');
  // A stored copy of the current session is a separate source but remains one recording.
  await picker();const other=await page.locator('#tools-source-f option').evaluateAll(es=>es.find(e=>e.value!=='current'&&e.textContent.includes('clock_model')&&!/Earlier night|Morning|Midnight gap|Exactly 24h|Over 24h|Retained tail/.test(e.textContent)).value);await page.selectOption('#tools-source-f',other);
  assert.equal(await page.locator('#tools-chart-inspection tbody tr').count(),6);assert.equal(await page.locator('.tools-series-swatch').evaluateAll(es=>es.filter(e=>e.style.borderTopStyle==='solid').length),1);
  assert.deepEqual(await page.evaluate(()=>ViewerTracker.__clock.state()),state);assert.equal(await page.evaluate(()=>ViewerTracker.__clock.store()),store,'comparison settings never rewrite recordings');
  await page.locator('#tools-recording-picker > summary').click();await page.locator('#tools-content').evaluate(e=>e.scrollTop=0);
  for(const bright of [false,true]){
   await page.locator('#dark-mode-toggle').setChecked(!bright);await page.screenshot({path:'/tmp/tierscope-clock-comparison-'+engine+'-'+(bright?'bright':'dark')+'.png'});
   for(const width of [430,320]){await page.setViewportSize({width,height:1000});await page.evaluate(()=>ViewerTracker.__clock.scale(1.6));await page.waitForTimeout(100);assert(await page.locator('#tools-content').evaluate(e=>e.scrollWidth<=e.clientWidth+1));}
   await page.setViewportSize({width:1250,height:1000});await page.evaluate(()=>ViewerTracker.__clock.scale(1));
  }
  // Live scans may cross midnight without replacing the canvas, cursor or zoom.
  await picker();for(const slot of ['F','E','D','C'])await page.getByRole('button',{name:'Remove '+slot,exact:true}).click();await choose('b','Earlier night');
  await page.check('#tools-follow-live');await page.click('#tools-chart-zoom-in');await key('Home');const liveRange=await page.locator('#tools-chart-range').textContent(),liveCursor=await page.locator('#tools-chart-inspection caption').textContent();
  await page.fill('#tools-threshold','12');await page.evaluate(()=>window.liveClockCanvas=document.getElementById('tools-analysis-chart'));
  const scan=async(ms)=>{registered+=10;await page.evaluate(ms=>{window.testNow+=ms;return ViewerTracker.__clock.scan();},ms);};
  const samples=()=>page.locator('#tools-summary-table tbody tr').first().locator('td').first().textContent();
  await scan(10000);assert.equal(await samples(),'4');assert.equal(await page.locator('#tools-chart-range').textContent(),liveRange);assert.equal(await page.locator('#tools-chart-inspection caption').textContent(),liveCursor);assert.equal(await page.locator('#tools-threshold').inputValue(),'12');assert(await page.evaluate(()=>liveClockCanvas===document.getElementById('tools-analysis-chart')));
  await key('Home');await scan(24*3600000);assert.equal(await samples(),'5');assert.equal(await page.locator('#tools-analysis-chart').count(),0);assert.match(await page.locator('#tools-analysis-output').textContent(),/recording A exceeds 24 hours/);assert.equal(await page.evaluate(()=>document.activeElement.id),'tools-compare-axis','removed chart returns focus to the axis control');
  await scan(10000);assert.equal(await samples(),'6','blocked clock chart still follows live reports');await mode('elapsed');assert.equal(await page.locator('#tools-analysis-chart').count(),1);assert.equal(await samples(),'3','restored shared length clips the elapsed report');await page.uncheck('#tools-shared-length');assert.equal(await samples(),'6');
  assert.deepEqual(errors,[]);console.log('PASS 24h comparison: local axis, midnight/gaps/dated cursor, 24h limits, six lines, statistics, axis/metric/visibility state, live growth, themes/scales/layout and session isolation');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
