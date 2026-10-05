const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {instrument,prepareSource}=require('./helpers/instrument.cjs');
const {openLibraryBook}=require('./helpers/library.cjs');
const engine=process.env.TIERSCOPE_BROWSER||'chromium';
const source=prepareSource(fs.readFileSync(path.join(__dirname,'../tierscope.user.js'),'utf8')).replaceAll('scheduleInit(2000);','').replace('downloadTrackingReport: downloadTrackingReport,',`__journey:{
 setup(){loadSession(getModelName());isMinimized=true;createPanel();toggleView();startTrackingTimer();},
 sample(count){const now=Date.now(),snapshot={users:Array.from({length:count},(_,i)=>({username:'u'+i,tier:['red','green','purple','pink','dark-blue','light-blue','gray'][i%7],gender:'male'})),roomTotal:count+12,anonymousCount:12,registeredCount:count,totalUsers:count+12,source:'API',timestamp:now,diagnostics:{unknownClasses:{},unknownGenders:{}}};const receipt=beginAcceptedSample(snapshot,getModelName(),now,getSessionSamplePolicy());commitAcceptedSample(receipt);saveSession(getModelName());repaintLivePresentation();updateSessionToolsStatus();},
 older(){const archive=captureLiveSessionFile();for(let i=1;i<=7;i++){const a=JSON.parse(JSON.stringify(archive));a.session.sessionStartedAt-=i*86400000;a.session.history.timestamps=a.session.history.timestamps.map(t=>t-i*86400000);for(const key of STORAGE_HISTORY_SERIES)a.session.history[key]=a.session.history[key].map(n=>Math.round(n*(.45+i*.06)));keepSessionInLibrary(a,'Earlier '+i);}updateSessionToolsStatus(true);},
 state(){return {history:JSON.stringify(history),paused:isPaused,stopped:isStopped,room:getModelName()};},library:readSessionLibrary,status:journeyState,keepFavoriteSession,reset:resetAllTracking},downloadTrackingReport: downloadTrackingReport,`);
(async()=>{
 const browser=await require('playwright')[engine].launch({headless:true,executablePath:process.env.TIERSCOPE_CHROMIUM_PATH,args:JSON.parse(process.env.TIERSCOPE_CHROMIUM_ARGS||'[]')});
 try{
 const context=await browser.newContext({viewport:{width:1400,height:1100},acceptDownloads:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 async function screenshot(name){const panels=await page.locator('#tracker-container,#tierscope-session-tools').evaluateAll(elements=>elements.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));const x=Math.max(0,Math.floor(Math.min(...panels.map(r=>r.x)))-1),y=Math.max(0,Math.floor(Math.min(...panels.map(r=>r.y)))-1);await page.screenshot({path:'/tmp/tierscope-journey-'+engine+'-'+name+'.png',clip:{x,y,width:Math.ceil(Math.max(...panels.map(r=>r.right)))-x+1,height:Math.ceil(Math.max(...panels.map(r=>r.bottom)))-y+1}});}
 await context.route('https://tierscope.test/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body style="background:#202733;font-family:Arial;color:#bdc5d5"><div style="padding:40px"><h2>Room: aurora_live</h2><p>TierScope journey review</p></div></body>'}));
 await context.addInitScript(()=>{window.GM_listValues=()=>Object.keys(localStorage);window.GM_getValue=(k,d)=>localStorage.getItem(k)===null?d:JSON.parse(localStorage.getItem(k));window.GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));window.GM_deleteValue=k=>localStorage.removeItem(k);});
 await page.goto('https://tierscope.test/aurora_live/');await page.addScriptTag({content:instrument(source)});await page.evaluate(()=>ViewerTracker.__journey.setup());await page.waitForTimeout(350);
 assert.equal(await page.locator('#header-text').textContent(),'aurora_live');
 assert.deepEqual(await page.locator('#journey-nav button').allTextContents(),['Live','Saved sessions']);
 assert.match(await page.locator('#journey-status').textContent(),/Tracking live · Not saved/);
 assert.match(await page.locator('#journey-detail').textContent(),/Waiting for the first audience scan/);
 assert(await page.locator('#journey-keep').isDisabled());
 await page.click('#btn-control-library');assert(await page.locator('#tools-library-list').isVisible());
 assert.match(await page.locator('#tools-library-list').textContent(),/No saved sessions yet.*Keep in Library/);
 assert(await page.locator('#tools-current-card').isHidden());assert(await page.locator('[data-tools-tab=compare]').isHidden());
 await page.click('#tools-live');assert.equal(await page.locator('#tierscope-session-tools').count(),0);
 await page.evaluate(()=>ViewerTracker.__journey.sample(24));
 assert.equal(await page.locator('#mini-room-count').textContent(),'36');assert(await page.locator('#journey-detail').isHidden());
 assert(await page.locator('#journey-keep').isEnabled());
 const live=await page.evaluate(()=>ViewerTracker.__journey.state());
 await page.click('#journey-keep');assert.match(await page.locator('#journey-status').textContent(),/Saved to Library/);
 assert(await page.locator('#journey-view').isVisible());
 const id=await page.evaluate(()=>ViewerTracker.__journey.library().entries[0].id);
 await page.click('#journey-view');assert.equal(await page.locator('#tools-selected-sessions [data-selected-id]').getAttribute('data-selected-id'),id);
 assert(await page.locator('#tools-analysis-chart').isVisible());assert(await page.locator('#tools-recording-picker').evaluate(e=>!e.open));
 assert(await page.locator('#tools-session-compare').isDisabled());assert.match(await page.locator('#tools-selected-sessions').textContent(),/No earlier saved session/);
 assert.deepEqual(await page.evaluate(()=>ViewerTracker.__journey.state()),live,'View session does not start Replay or alter tracking');
 await page.click('#tools-session-replay');assert.match(await page.locator('#journey-status').textContent(),/Viewing replay.*aurora_live/);assert(await page.locator('#journey-actions').isHidden());
 await page.click('#btn-live');assert.equal(await page.locator('#tierscope-session-tools').count(),0);assert.deepEqual(await page.evaluate(()=>ViewerTracker.__journey.state()),live);
 await page.clock.install();for(const count of [32,29,41,46,38,49,44]){await page.clock.runFor(60000);await page.evaluate(n=>ViewerTracker.__journey.sample(n),count);}await page.click('#journey-keep');await page.evaluate(()=>ViewerTracker.__journey.older());await screenshot('live');await page.click('#journey-view');await screenshot('summary');assert(await page.locator('#tools-session-compare').isEnabled());
 await page.click('#tools-session-compare');assert.equal(await page.locator('#tools-selected-sessions [data-selected-id]').count(),6);
 assert(await page.evaluate(()=>{const selected=document.getElementById('tools-selected-sessions'),axis=document.getElementById('tools-compare-axis');return selected.getBoundingClientRect().top<axis.getBoundingClientRect().top;}));
 assert.equal(await page.locator('.tools-chart-legend label').count(),6);
 await screenshot('compare');
 await page.click('[data-tools-tab=library]');assert.equal(await page.locator('[data-library-id]').count(),8);
 assert(await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return new Set(ids).size===ids.length;}),'journey controls have unique DOM identities');assert(await page.locator('[data-library-id]').first().isVisible());
 assert.match(await page.locator('[data-library-id]').first().textContent(),/aurora_live.*Covered/);await screenshot('recent');
 await openLibraryBook(page);await page.selectOption('#tools-library-model','aurora_live');await page.locator('#tools-library-search').fill('Earlier 2');assert.equal(await page.locator('[data-library-id]').count(),1);
 await page.locator('[data-library-id]').getByRole('button',{name:'Open session',exact:true}).click();
 assert.match(await page.locator('#tools-selected-sessions').textContent(),/Earlier 2/);assert(await page.locator('#tools-analysis-chart').isVisible());
 await page.click('#btn-live');
 // Pause/resume and settings do not change Library contents.
 await page.click('#btn-control-auto');assert.match(await page.locator('#journey-status').textContent(),/Tracking paused/);
 await page.click('#btn-control-auto');assert.match(await page.locator('#journey-status').textContent(),/Tracking live/);
 await page.locator('#live-session-actions > summary').click();assert(await page.locator('#btn-main-reset').isVisible());
 await page.reload();await page.addScriptTag({content:instrument(source)});await page.evaluate(()=>ViewerTracker.__journey.setup());await page.waitForTimeout(350);
 assert(await page.locator('#live-session-actions').evaluate(e=>e.open),'session action choice is remembered');
 // Save failure never claims a confirmed save, and the exact-session link refuses
 // an entry removed in a second tab sharing this userscript storage.
 await page.evaluate(()=>ViewerTracker.__journey.sample(17));
 await page.evaluate(()=>{window.originalSet=GM_setValue;window.GM_setValue=(k,v)=>{if(k.startsWith('tierscope:library:v1:'))throw Error('Storage unavailable');return originalSet(k,v);};});
 await page.click('#journey-keep');assert.match(await page.locator('#journey-status').textContent(),/Library save pending/);
 assert.match(await page.locator('#journey-detail').textContent(),/Storage unavailable/);
 await page.evaluate(()=>window.GM_setValue=window.originalSet);await page.click('#journey-keep');assert.match(await page.locator('#journey-status').textContent(),/Saved to Library/);
 const other=await context.newPage();await other.goto('https://tierscope.test/other_room/');
 await other.evaluate(id=>GM_deleteValue('tierscope:library:v1:'+id),await page.evaluate(()=>ViewerTracker.__journey.status().saved.id));
 await page.click('#journey-view');assert.equal(await page.locator('#tierscope-session-tools').count(),0);assert.match(await page.locator('#journey-detail').textContent(),/removed, changed or cannot be read/);await other.close();
 // Favorite consent and an automatic save are shown explicitly.
 page.once('dialog',d=>d.accept());await page.click('#btn-model-favorite');assert.match(await page.locator('#journey-status').textContent(),/Automatically saved/);
 assert.match(await page.locator('#journey-detail').textContent(),/Last confirmed save/);
 await page.click('#journey-view');await page.click('[data-tools-tab=library]');await page.uncheck('#dark-mode-toggle');
 await screenshot('bright');
 await page.check('#dark-mode-toggle');await screenshot('saved');
 await page.setViewportSize({width:380,height:1000});await page.waitForTimeout(150);
 assert(await page.locator('#tierscope-session-tools').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
 assert(await page.locator('#tracker-container').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
 await page.screenshot({path:'/tmp/tierscope-journey-'+engine+'-narrow.png'});
 await page.keyboard.press('Escape');assert.equal(await page.locator('#tierscope-session-tools').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS first scan, honest save status, exact View session, recent list, six-session context, Replay/Live, remembered disclosures, failed storage, deleted entry, automatic save consent, themes and narrow layout');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
