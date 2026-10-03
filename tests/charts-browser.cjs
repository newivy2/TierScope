const {instrument, prepareSource} = require('./helpers/instrument.cjs');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const engine=process.env.TIERSCOPE_BROWSER||'chromium';const browserType=require('playwright')[engine];
const source=prepareSource(fs.readFileSync(path.join(__dirname,'../tierscope.user.js'),'utf8')).replaceAll('scheduleInit(2000);','').replace('downloadTrackingReport: downloadTrackingReport,',`
__charts:{
 setup:function(kind){
  loadSession(getModelName());var now=Date.now(),times=kind==='single'?[now]:[now-1380000,now-1320000,now-1260000,now-60000,now];
  var h={timestamps:times,breaks:times.map((_,i)=>i===3)};
  STORAGE_HISTORY_SERIES.forEach(k=>h[k]=times.map((_,i)=>kind==='flat'?10:[10,12,11,18,16][i]));
  restoreSessionState(normalizeStoredSession({timestamp:now,history:h,isPaused:true}));isAutoRefreshOn=false;isMinimized=true;createPanel();toggleView();collapsedRows=new Set();applyRowLayout();drawAllSparklines();updateDisplay();
 },scan:performScanThenReturn,pause:function(){if(playback&&playback.playing)togglePlayback();},step:stepPlayback,
 scale:function(value){applyScale(value);redrawPanelCharts();},count:()=>history.timestamps.length,policy:readRequestPolicy
 ,snapshot:()=>JSON.stringify({history,sessionHighs,roomTotalHigh})
},downloadTrackingReport: downloadTrackingReport,`);
async function gapPixels(canvas,rgb=[232,155,69]){
 return canvas.evaluate((c,rgb)=>{
  const pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  let orange=0,other=0,emptyColumns=0;
  for(let x=Math.floor(c.width*.25);x<Math.floor(c.width*.75);x++){
   let ink=false;
   for(let y=0;y<c.height;y++){
    const p=(y*c.width+x)*4;if(pixels[p+3]<150)continue;ink=true;
    if(rgb.every((value,i)=>Math.abs(pixels[p+i]-value)<4))orange++;else other++;
   }
   if(!ink)emptyColumns++;
  }
  return {orange,other,emptyColumns};
 },rgb);
}
async function assertConnector(canvas,rgb){
 const pixels=await gapPixels(canvas,rgb);assert(pixels.orange>0,'missing interval has orange pixels');
 assert(pixels.emptyColumns>0,'connector has visible spaces between dashes');
 assert.equal(pixels.other,0,'no solid tier line is drawn through missing data');
}
(async()=>{
 const browser=await browserType.launch({headless:true,executablePath:process.env.TIERSCOPE_CHROMIUM_PATH,args:JSON.parse(process.env.TIERSCOPE_CHROMIUM_ARGS||'[]')});
 try{
 const page=await browser.newPage({viewport:{width:1150,height:1000},deviceScaleFactor:1.5});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let status=200,requests=0;await page.route('https://tierscope.test/**',r=>{
  if(r.request().url().includes('/api/')){requests++;return r.fulfill({status,headers:status===429?{'Retry-After':'120'}:{},body:status===200?'0,viewer|t|m|0':'denied'});}
  return r.fulfill({contentType:'text/html',body:'<html><body style="background:#303846"></body></html>'});
 });
 await page.addInitScript(()=>{window.GM_getValue=(k,d)=>{let v=localStorage.getItem(k);return v===null?d:JSON.parse(v)};window.GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));window.GM_deleteValue=k=>localStorage.removeItem(k);window.GM_listValues=()=>Object.keys(localStorage);window.confirm=()=>true;});
 await page.goto('https://tierscope.test/testroom/');await page.addScriptTag({content:instrument(source)});
 await page.evaluate(()=>ViewerTracker.__charts.setup());
 const savedState=await page.evaluate(()=>ViewerTracker.__charts.snapshot());
 const bounds=await page.locator('#tracker-container').boundingBox();
 const canvas=page.locator('#spark-purple');let box=await canvas.boundingBox();
 const plot=await canvas.evaluate(c=>({points:c._tierScopeChart.plot.points,end:c._tierScopeChart.plot.end}));
 assert.equal(plot.end,4);assert(plot.points[1].x<plot.points.at(-1).x/10);
 await assertConnector(canvas);
 await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);
 const tooltip=page.locator('#tierscope-chart-tooltip');await tooltip.waitFor({state:'visible'});assert.match(await tooltip.textContent(),/No samples recorded during this interval/);assert.doesNotMatch(await tooltip.textContent(),/Sample \d|Range:/,'gap inspection must not offer an invented count');
 assert.deepEqual(await page.locator('#tracker-container').boundingBox(),bounds,'tooltip cannot grow the panel');
 await canvas.focus();await page.keyboard.press('Home');assert.match(await tooltip.textContent(),/Sample 1\/5/);await page.keyboard.press('End');assert.match(await tooltip.textContent(),/Sample 5\/5/);await page.keyboard.press('ArrowLeft');assert.match(await tooltip.textContent(),/Sample 4\/5/);await page.keyboard.press('Escape');assert.equal(await tooltip.isVisible(),false);
 for(const [key,rgb,hex] of [['dark-blue','rgb(57, 57, 147)','#393993'],['purple','rgb(128, 75, 170)','#804baa']]){
  const colors=await page.evaluate(key=>({count:getComputedStyle(document.getElementById('count-'+key)).color,stroke:document.getElementById('spark-'+key).getContext('2d').strokeStyle}),key);
  assert.equal(colors.count,rgb);assert.equal(colors.stroke,hex);
 }
 await page.locator('#dark-mode-toggle').uncheck();await assertConnector(canvas,[173,95,16]);
 await page.locator('#dark-mode-toggle').check();
 await page.click('#btn-toggle');await page.waitForTimeout(350);
 const mini=page.locator('#mini-chart');await assertConnector(mini);
 assert.match(await mini.getAttribute('title'),/2 samples/,'offscreen connector endpoint is not counted as a visible sample');
 box=await mini.boundingBox();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);
 assert.match(await tooltip.textContent(),/No samples recorded during this interval/);
 await mini.focus();await page.keyboard.press('Home');assert.match(await tooltip.textContent(),/Sample 1\/2/);
 await page.keyboard.press('End');assert.match(await tooltip.textContent(),/Sample 2\/2/);
 await page.keyboard.press('Escape');
 if(process.env.TIERSCOPE_SCREENSHOT)await page.locator('#tracker-container').screenshot({path:process.env.TIERSCOPE_SCREENSHOT+'.mini.png'});
 await page.click('#btn-expand');await page.waitForTimeout(350);
 assert.equal(await page.evaluate(()=>ViewerTracker.__charts.snapshot()),savedState,'drawing and inspecting gaps cannot change history or highs');
 await page.click('#btn-replay');await page.evaluate(()=>ViewerTracker.__charts.pause());await page.evaluate(()=>ViewerTracker.__charts.step(-1));
 await canvas.focus();await page.keyboard.press('End');assert.match(await tooltip.textContent(),/Sample 1\/1/);assert.match(await tooltip.textContent(),/Range: 10–10/);
 await page.click('#playback-next');await canvas.focus();await page.keyboard.press('End');assert.match(await tooltip.textContent(),/Sample 2\/2/);assert.match(await tooltip.textContent(),/Range: 10–12/);
 assert.equal((await gapPixels(canvas)).orange,0,'Replay cannot draw a future gap');
 await page.click('#collapse-row-green');assert.equal(await canvas.evaluate(c=>c._tierScopeChart.plot.end),1,'collapse preserves the Replay frame');
 const backing=await canvas.evaluate(c=>c.width);await page.evaluate(()=>ViewerTracker.__charts.scale(1.5));assert((await canvas.evaluate(c=>c.width))>backing);assert.equal(await canvas.evaluate(c=>c._tierScopeChart.plot.end),1);await page.evaluate(()=>ViewerTracker.__charts.scale(1));
 await page.click('#playback-next');assert.equal((await gapPixels(canvas)).orange,0,'gap stays absent until its second endpoint is available');
 await page.click('#playback-next');await assertConnector(canvas);
 await page.click('#playback-return');
 for(const kind of ['single','flat']){
  await page.evaluate(kind=>ViewerTracker.__charts.setup(kind),kind);
  const pixels=await page.locator('#spark-purple').evaluate(c=>{const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let ys=[];for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(p[(y*c.width+x)*4+3])ys.push(y);return {min:Math.min(...ys),max:Math.max(...ys),height:c.height};});
  assert(Number.isFinite(pixels.min));assert(Math.abs((pixels.min+pixels.max)/2-pixels.height/2)<2,'flat and single values are centered');
 }
 console.log('PASS orange dashed gaps in expanded/compact/Replay, dark/bright contrast, clipped compact boundary, no future connectors or synthetic values, hover/keyboard inspection, timestamp spacing, flat/single samples, original tier colors and unchanged geometry');
 status=429;await page.evaluate(()=>ViewerTracker.__charts.scan());const after429=requests;await page.evaluate(()=>ViewerTracker.__charts.scan());assert.equal(requests,after429);assert.match(await page.locator('#control-next-scan').textContent(),/Rate limited/);
 await page.reload();await page.addScriptTag({content:instrument(source)});await page.evaluate(()=>ViewerTracker.__charts.setup());await page.evaluate(()=>ViewerTracker.__charts.scan());assert.equal(requests,after429);
 await page.evaluate(()=>GM_deleteValue('tierscope:requests:v1:'+location.origin));status=403;await page.evaluate(()=>ViewerTracker.__charts.scan());assert.match(await page.locator('#acquisition-status').textContent(),/Access denied/);status=200;await page.click('#btn-control-auto');await page.waitForFunction(()=>ViewerTracker.__charts.policy().blocked===0&&document.getElementById('header-text').textContent.startsWith('USERS:'));
 assert.deepEqual(errors,[]);console.log('PASS rate-limit UI, reload persistence, access-denied pause and explicit recovery');
 if(process.env.TIERSCOPE_SCREENSHOT){await page.evaluate(()=>ViewerTracker.__charts.setup());await page.locator('#tracker-container').screenshot({path:process.env.TIERSCOPE_SCREENSHOT});}
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
