const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {instrument, prepareSource} = require('./helpers/instrument.cjs');
const engine = process.env.TIERSCOPE_BROWSER || 'chromium';
const source = prepareSource(fs.readFileSync(path.join(__dirname, '../tierscope.user.js'), 'utf8')).replaceAll('scheduleInit(2000);', '')
 .replace('downloadTrackingReport: downloadTrackingReport,', `__chartControls:{
 setup(){loadSession(getModelName());const now=Date.now(),h={timestamps:[now-180000,now-120000,now-60000,now],breaks:[false,false,true,false]};
 STORAGE_HISTORY_SERIES.forEach((key,i)=>h[key]=[3+i,7+i,4+i,9+i]);h.total=[32,49,42,57];h.withTokens=[21,31,25,40];h.anonymous=[50,70,66,81];
 restoreSessionState(normalizeStoredSession({timestamp:now,history:h,isPaused:true,pausedElapsedTime:180000}));
 isAutoRefreshOn=false;isMinimized=true;createPanel();toggleView();repaintLivePresentation();
 const a=captureSessionFile();keepSessionInLibrary(a);const previous=JSON.parse(JSON.stringify(a)),s=previous.session;
 s.timestamp-=86400000;s.sessionStartedAt-=86400000;s.history.timestamps=s.history.timestamps.map(t=>t-86400000);
 if(s.roomTotalHighTime!==null)s.roomTotalHighTime-=86400000;Object.values(s.sessionHighs).forEach(high=>{if(high.time!==null)high.time-=86400000;});
 keepSessionInLibrary(previous,'Previous session');},
 state:()=>({history:JSON.stringify(history),paused:isPaused,playback:playback&&playback.positionMs}),scale:applyScale},
 downloadTrackingReport: downloadTrackingReport,`);
(async () => {
 const browser = await require('playwright')[engine].launch({headless:true,executablePath:process.env.TIERSCOPE_CHROMIUM_PATH,args:JSON.parse(process.env.TIERSCOPE_CHROMIUM_ARGS || '[]')});
 try {
  const page = await browser.newPage({viewport:{width:1200,height:1000}}), errors=[];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('https://tierscope.test/**', r => r.fulfill({contentType:'text/html',body:'<!doctype html><body style="background:repeating-linear-gradient(45deg,#26303a,#26303a 20px,#56606a 20px,#56606a 40px)"></body>'}));
  await page.goto('https://tierscope.test/chart_model/');
  await page.evaluate(() => {window.store=new Map();window.GM_getValue=(k,d)=>store.has(k)?store.get(k):d;window.GM_setValue=(k,v)=>store.set(k,v);window.GM_listValues=()=>[...store.keys()];window.GM_deleteValue=k=>store.delete(k);});
  await page.addScriptTag({content:instrument(source)});await page.evaluate(()=>ViewerTracker.__chartControls.setup());
  const state=await page.evaluate(()=>ViewerTracker.__chartControls.state());
  const opacity=async value=>page.locator('#opacity-slider').evaluate((e,value)=>{e.value=String(value);e.dispatchEvent(new Event('input'));},value);
  const background=()=>page.waitForFunction(()=>getComputedStyle(document.getElementById('tierscope-session-tools')).backgroundColor===getComputedStyle(document.getElementById('tracker-container')).backgroundColor, null, {timeout:5000});
  await opacity(30);await page.click('#btn-control-library');await background();
  assert.equal(await page.locator('#tierscope-session-tools').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(20, 20, 30, 0.3)','opening Library uses current transparency');
  await opacity(100);await background();assert.equal(await page.locator('#tierscope-session-tools').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(20, 20, 30)');
  const textColor=await page.locator('#tools-title').evaluate(e=>getComputedStyle(e).color);
  await opacity(45);await background();assert.equal(await page.locator('#tools-title').evaluate(e=>getComputedStyle(e).color),textColor);
  assert.equal(await page.locator('#tierscope-session-tools').evaluate(e=>getComputedStyle(e).opacity),'1','only the background becomes transparent');
  await page.uncheck('#dark-mode-toggle');await background();assert.equal(await page.locator('#tierscope-session-tools').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(248, 249, 252, 0.45)');
  await page.click('[data-tools-tab=summary]');
  const choices=[['room','Room audience',82],['total','Registered viewers',32],['withTokens','Viewers with tokens',21],['red','Moderators',3],['green','Fan club',4],['purple','Dark purple',5],['pink','Light purple',6],['dark-blue','Dark blue',7],['light-blue','Light blue',8],['gray','Grey',9],['female-trans','Female / trans',10],['anonymous','Anonymous viewers',50]];
  const selected=async(id='tools-metric')=>page.locator('#'+id+' [aria-checked=true]').getAttribute('data-metric');
  assert.equal(await selected(),'room','new analysis defaults to Room audience');
  assert.deepEqual(await page.locator('#tools-metric [role=radio]').evaluateAll(es=>es.map(e=>[e.dataset.metric,e.getAttribute('aria-label')])),choices.map(([key,label])=>[key,label]));
  assert.equal(await page.locator('select#tools-metric').count(),0);
  await page.evaluate(()=>window.metricCanvas=document.getElementById('tools-analysis-chart'));
  for(const [key,label,count] of choices){
   await page.click('#tools-metric-'+key);
   assert.equal(await page.locator('#tools-metric [aria-checked=true]').count(),1);assert.equal(await selected(),key);
   assert.equal(await page.locator('#tools-metric-caption').textContent(),label);
   assert.equal(await page.locator('#tools-chart-inspection tbody tr td').first().textContent(),String(count),'chart inspection uses '+key);
   assert((await page.locator('#tools-analysis-chart').getAttribute('aria-label')).startsWith(label));
  }
  assert(await page.evaluate(()=>window.metricCanvas===document.getElementById('tools-analysis-chart')),'metric selection updates the existing chart');
  await page.locator('#tools-metric-anonymous').focus();await page.keyboard.press('ArrowRight');assert.equal(await selected(),'room');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'tools-metric-room');
  await page.keyboard.press('End');assert.equal(await selected(),'anonymous');await page.keyboard.press('Home');assert.equal(await selected(),'room');
  await page.keyboard.press('ArrowLeft');assert.equal(await selected(),'anonymous');await page.keyboard.press('ArrowUp');assert.equal(await selected(),'female-trans');
  await page.keyboard.press('Space');assert.equal(await selected(),'female-trans');
  assert.equal(await page.locator('#tools-metric-female-trans').evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
  await page.click('#tools-metric-room');
  await page.click('[data-tools-tab=compare]');
  await page.selectOption('#tools-source-b',await page.locator('#tools-source-b option').evaluateAll(es=>es.find(e=>e.value!=='current').value));
  const below=await page.evaluate(()=>{const canvas=document.getElementById('tools-analysis-chart'),range=document.getElementById('tools-comparison-range'),output=document.getElementById('tools-analysis-output');return {after:range.getBoundingClientRect().top>=canvas.getBoundingClientRect().bottom,before:range.getBoundingClientRect().bottom<=output.getBoundingClientRect().top};});
  assert(below.after&&below.before,'Match shared length sits below the chart and above statistics');
  await page.uncheck('#tools-shared-length');await page.click('#tools-metric-withTokens');assert(!(await page.locator('#tools-shared-length').isChecked()));
  assert.equal(await page.locator('#tools-chart-inspection tbody tr').count(),2);
  await page.click('[data-tools-tab=library]');await page.click('#tools-room-history');
  assert.equal(await selected('tools-history-metric'),'withTokens');
  await page.locator('#tools-history-metric-withTokens').focus();await page.keyboard.press('Home');assert.equal(await selected('tools-history-metric'),'room');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'tools-history-metric-room','history redraw restores radio focus');
  await page.click('#tools-history-metric-red');assert((await page.locator('#tools-history-chart').getAttribute('aria-label')).startsWith('Moderators'));
  // Visibility/fit at narrow widths and both scales/themes; no scrollable metric row.
  for(const bright of [false,true]){
   await page.setViewportSize({width:1200,height:1000});await page.evaluate(()=>ViewerTracker.__chartControls.scale(1));
   await page.locator('#dark-mode-toggle').setChecked(!bright);await background();
   for(const width of [1200,430,320]){
    await page.setViewportSize({width,height:1000});await page.evaluate(()=>ViewerTracker.__chartControls.scale(1.6));await page.waitForTimeout(100);
    const fit=await page.locator('#tools-history-metric').evaluate(e=>{const r=e.getBoundingClientRect();return {fit:e.scrollWidth<=e.clientWidth+1,buttons:[...e.querySelectorAll('button')].every(b=>{const q=b.getBoundingClientRect();return q.left>=r.left-.5&&q.right<=r.right+.5&&q.width>15;}),one:e.querySelectorAll('[aria-checked=true]').length===1};});
    assert(fit.fit&&fit.buttons&&fit.one,'icon strip fits '+width+'px '+(bright?'bright':'dark'));
   }
  }
  await page.setViewportSize({width:1200,height:1000});await page.evaluate(()=>ViewerTracker.__chartControls.scale(1));await opacity(95);await background();
  await page.click('[data-tools-tab=summary]');await page.click('#tools-metric-room');
  for(const bright of [false,true]){
   await page.locator('#dark-mode-toggle').setChecked(!bright);await background();await page.locator('#tools-content').evaluate(e=>e.scrollTop=0);
   await page.screenshot({path:'/tmp/tierscope-library-chart-controls-'+engine+'-'+(bright?'bright':'dark')+'.png'});
  }
  assert.deepEqual(await page.evaluate(()=>ViewerTracker.__chartControls.state()),state,'presentation changes preserve live session and replay');
  await page.click('#tools-close');await opacity(30);await page.click('#btn-control-library');await background();
  assert.equal(await page.locator('#tierscope-session-tools').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(248, 249, 252, 0.3)','reopened Library inherits the latest setting');
  assert.deepEqual(errors,[]);console.log('PASS Library background transparency, single metric icon selection/order/counts, keyboard/focus, shared-length placement, history, themes/scales/narrow layout and live-state preservation');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
