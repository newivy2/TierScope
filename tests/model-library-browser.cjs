const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {instrument,prepareSource}=require('./helpers/instrument.cjs');
const engine=process.env.TIERSCOPE_BROWSER||'chromium';
const source=prepareSource(fs.readFileSync(path.join(__dirname,'../tierscope.user.js'),'utf8')).replaceAll('scheduleInit(2000);','')
 .replace('downloadTrackingReport: downloadTrackingReport,',`__models:{setup(){
 loadSession(getModelName());const now=Date.now(),h={timestamps:[now-180000,now-120000,now],breaks:[false,false,true]};
 STORAGE_HISTORY_SERIES.forEach(k=>h[k]=[0,0,0]);h.total=[10,20,30];h.red=[10,20,30];h.withTokens=[10,20,30];h.anonymous=[5,10,15];
 restoreSessionState(normalizeStoredSession({timestamp:now,history:h,isPaused:true,pausedElapsedTime:180000}));isAutoRefreshOn=false;isMinimized=true;createPanel();toggleView();repaintLivePresentation();
 const archive=captureSessionFile();for(let i=0;i<3;i++)keepSessionInLibrary({...archive,room:'saved_model_'+i});
 },library:readSessionLibrary,favorite:readModelFavorite,automatic:automaticLibraryStatus,
 live:captureLiveSessionFile, keep:keepFavoriteSession,save:()=>saveSession(getModelName(),true),
 replay(){openSessionReplay({...captureLiveSessionFile(),room:'replay_model'});},
 sample(){users=new Map([['viewer',{tier:'red',gender:'male'}]]);saveToHistory();saveSession(getModelName(),true);updateDisplay();}},downloadTrackingReport: downloadTrackingReport,`);
(async()=>{
 const browser=await require('playwright')[engine].launch({headless:true,executablePath:process.env.TIERSCOPE_CHROMIUM_PATH,args:JSON.parse(process.env.TIERSCOPE_CHROMIUM_ARGS||'[]')});
 try{
 const context=await browser.newContext({viewport:{width:1200,height:1000},acceptDownloads:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('https://tierscope.test/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body style="background:#26303a"></body>'}));
 await context.addInitScript(()=>{
  window.GM_listValues=()=>Object.keys(localStorage);window.GM_getValue=(k,d)=>localStorage.getItem(k)===null?d:JSON.parse(localStorage.getItem(k));
  window.GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));window.GM_deleteValue=k=>localStorage.removeItem(k);
 });
 await page.goto('https://tierscope.test/live_model/');
 await page.evaluate(()=>GM_setValue('tierscope:library-model:v1:live_model',JSON.stringify({schemaVersion:1,room:'live_model',favorite:true})));
 await page.addScriptTag({content:instrument(source)});await page.evaluate(()=>ViewerTracker.__models.setup());await page.waitForTimeout(350);
 assert.equal(await page.locator('#header-text').textContent(),'live_model');
 for(const row of ['red','green','female-trans'])assert(await page.locator('#tier-row-'+row).isHidden());
 assert.equal(await page.locator('#count-roomTotal').textContent(),'45');assert.equal(await page.locator('#high-roomTotal').textContent(),'SH:45');
 assert(await page.evaluate(()=>document.getElementById('tier-row-anon').nextElementSibling.id==='tier-row-roomTotal'));
 const series=await page.locator('#spark-roomTotal').evaluate(c=>c._tierScopeChart.values);assert.deepEqual(series,[15,30,45]);
 await page.click('#btn-control-library');
 assert.equal(await page.locator('#tools-title').textContent(),'Library');assert.equal(await page.locator('.tools-subtitle').textContent(),'Session Storage and Analysis');
 assert.deepEqual(await page.locator('[data-tools-tab]').allTextContents(),['Sessions','Summary','Compare','Backup']);
 assert.equal(await page.locator('#tools-content > :first-child #tools-current-kind').textContent(),'Current Live Session');
 const save=await page.locator('#tools-save-session').boundingBox(),history=await page.locator('#tools-room-history').boundingBox();
 assert(history.x>save.x&&Math.abs(history.y-save.y)<2,'History sits to the right of Save file');
 assert(await page.locator('#tools-enable-automatic').isVisible());assert.equal(await page.locator('#tools-current-favorite').textContent(),'★');
 page.once('dialog',async d=>{assert.match(d.message(),/automatically keep their live sessions\?/);await d.dismiss();});await page.click('#tools-enable-automatic');
 assert.equal(await page.evaluate(()=>ViewerTracker.__models.favorite('live_model').autoKeep),false);
 page.once('dialog',d=>d.accept());await page.click('#tools-enable-automatic');
 assert.equal(await page.evaluate(()=>ViewerTracker.__models.favorite('live_model').autoKeep),true);
 assert.equal(await page.locator('#tools-room-history').textContent(),'History · 1');assert(await page.locator('#tools-enable-automatic').isHidden());
 await page.locator('#tools-library-search').scrollIntoViewIfNeeded();
 const controls=await page.evaluate(()=>{
  const box=id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right};};
  return {model:box('tools-library-model'),sort:box('tools-library-sort'),from:box('tools-library-from'),to:box('tools-library-to'),overflow:document.getElementById('tools-content').scrollWidth>document.getElementById('tools-content').clientWidth};
 });
 assert.equal(controls.model.y,controls.sort.y);assert.equal(controls.from.y,controls.to.y);assert(!controls.overflow);
 assert.match(await page.locator('#tools-library-favorites').locator('..').textContent(),/^Favorites only$/);
 await page.locator('#tools-content').evaluate(e=>e.scrollTop=0);await page.screenshot({path:'/tmp/tierscope-316-'+engine+'-dark.png'});
 await page.uncheck('#dark-mode-toggle');await page.waitForTimeout(100);await page.screenshot({path:'/tmp/tierscope-316-'+engine+'-bright.png'});await page.check('#dark-mode-toggle');
 // Header consent on a new model; cancel must leave its state and the Library intact.
 await page.evaluate(()=>ViewerTracker.__models.replay());
 assert.equal(await page.locator('#header-text').textContent(),'replay_model');
 assert.equal(await page.locator('#tools-current-room').textContent(),'live_model');assert.equal(await page.locator('#tools-current-room-replay').textContent(),'replay_model');
 page.once('dialog',d=>d.dismiss());await page.click('#btn-model-favorite');assert.equal(await page.locator('#btn-model-favorite').textContent(),'☆');
 page.once('dialog',d=>d.accept());await page.click('#btn-model-favorite');assert.equal(await page.locator('#btn-model-favorite').textContent(),'★');
 assert.equal(await page.evaluate(()=>ViewerTracker.__models.library().entries.filter(e=>e.archive.room==='replay_model').length),0,'starring replay model never imports its snapshot');
 const download=page.waitForEvent('download');await page.click('#tools-save-session-replay');assert.equal(JSON.parse(fs.readFileSync(await(await download).path(),'utf8')).room,'replay_model');
 const liveDownload=page.waitForEvent('download');await page.click('#tools-save-session');assert.equal(JSON.parse(fs.readFileSync(await(await liveDownload).path(),'utf8')).room,'live_model');
 await page.click('#playback-return');
 await page.evaluate(()=>{window.originalSet=GM_setValue;window.GM_setValue=(k,v)=>{if(k.startsWith('tierscope:library:v1:'))throw Error('Storage blocked');return originalSet(k,v);};ViewerTracker.__models.sample();});
 assert.match(await page.locator('[data-card-auto]').first().textContent(),/pending.*Storage blocked/);
 await page.evaluate(()=>window.GM_setValue=window.originalSet);await page.click('#tools-retry-automatic');assert(await page.locator('#tools-retry-automatic').isHidden());
 // Fresh choices from another tab stop automatic updates.
 const other=await context.newPage();await other.goto('https://tierscope.test/other_model/');await other.evaluate(()=>GM_setValue('tierscope:library-model:v1:live_model',JSON.stringify({schemaVersion:1,room:'live_model',favorite:false,autoKeep:false})));
 const kept=await page.evaluate(()=>JSON.stringify(ViewerTracker.__models.library().entries.find(e=>e.archive.room==='live_model').archive));
 await page.evaluate(()=>ViewerTracker.__models.sample());assert.equal(await page.evaluate(()=>JSON.stringify(ViewerTracker.__models.library().entries.find(e=>e.archive.room==='live_model').archive)),kept);await other.close();
 await page.click('#tools-refresh-library');assert.equal(await page.locator('#tools-current-favorite').textContent(),'☆');
 // A draft in a growing session follows the verified replacement, even if its card remains open.
 page.once('dialog',d=>d.accept());await page.click('#tools-current-favorite');
 await page.selectOption('#tools-library-model','live_model');const session=page.locator('[data-library-id]');
 await session.locator('summary').click();await session.locator('textarea').fill('Draft while this session grows');
 await page.evaluate(()=>ViewerTracker.__models.sample());
 await session.getByRole('button',{name:'Save notes',exact:true}).click();
 assert.equal(await page.evaluate(()=>ViewerTracker.__models.library().entries.find(e=>e.archive.room==='live_model').notes),'Draft while this session grows');
 assert(await page.locator('#tools-review-notes').isHidden());
 await page.setViewportSize({width:640,height:700});await page.waitForTimeout(200);
 assert(await page.evaluate(()=>{const r=document.getElementById('tracker-container').getBoundingClientRect();return document.getElementById('tracker-container').contains(document.elementFromPoint(r.x+10,r.y+10));}));
 assert.equal(await page.locator('#tools-content').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
 await page.screenshot({path:'/tmp/tierscope-316-'+engine+'-narrow.png'});
 assert.deepEqual(errors,[]);console.log('PASS model Library, opt-in consent, automatic updates/retry, live/replay isolation, new Room Total row, themes and filter layout');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
