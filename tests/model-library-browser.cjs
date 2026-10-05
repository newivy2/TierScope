const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {instrument,prepareSource}=require('./helpers/instrument.cjs');
const {openLibraryBook,clickControl,revealControl}=require('./helpers/library.cjs');
const engine=process.env.TIERSCOPE_BROWSER||'chromium';
const source=prepareSource(fs.readFileSync(path.join(__dirname,'../tierscope.user.js'),'utf8')).replaceAll('scheduleInit(2000);','')
 .replace('downloadTrackingReport: downloadTrackingReport,',`__models:{setup(){
 loadSession(getModelName());const now=Date.now(),h={timestamps:[now-180000,now-120000,now],breaks:[false,false,true]};
 STORAGE_HISTORY_SERIES.forEach(k=>h[k]=[0,0,0]);h.total=[10,20,30];h.red=[10,20,30];h.withTokens=[10,20,30];h.anonymous=[5,10,15];
 restoreSessionState(normalizeStoredSession({timestamp:now,history:h,isPaused:true,pausedElapsedTime:180000}));isAutoRefreshOn=false;isMinimized=true;createPanel();toggleView();repaintLivePresentation();
 const archive=captureSessionFile();for(let i=0;i<3;i++)keepSessionInLibrary({...archive,room:'saved_model_'+i});
 },library:readSessionLibrary,favorite:readModelFavorite,automatic:automaticLibraryStatus,
 live:captureLiveSessionFile, state:()=>({history:JSON.stringify(history),mode:presentationMode,room:playback&&playback.archive.room,position:playback&&playback.positionMs}),
 older(){const a=captureLiveSessionFile(),ids=[];for(let i=1;i<=7;i++){const old=JSON.parse(JSON.stringify(a)),d=i*86400000,s=old.session;s.timestamp-=d;s.sessionStartedAt=(s.sessionStartedAt??s.history.timestamps[0])-d;s.history.timestamps=s.history.timestamps.map(t=>t-d);if(s.roomTotalHighTime!==null)s.roomTotalHighTime-=d;Object.values(s.sessionHighs).forEach(h=>{if(h.time!=null)h.time-=d;});ids.push(keepSessionInLibrary(old).id);}return ids;}, keep:keepFavoriteSession,save:()=>saveSession(getModelName(),true),
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
 for(const row of ['red','anon','roomTotal'])assert(await page.locator('#tier-row-'+row).isHidden());
 for(const row of ['green','purple','pink','dark-blue','light-blue','gray','female-trans','withtokens','total'])assert(await page.locator('#tier-row-'+row).isVisible());
 const headerSpacing=await page.evaluate(()=>{const name=document.getElementById('header-text').getBoundingClientRect(),handle=document.getElementById('resize-handle').getBoundingClientRect();return name.left-handle.right;});
 assert(headerSpacing>=3,'the model name clears the resize handle');
 await page.click('#restore-row-roomTotal');await page.click('#restore-row-anon');
 assert.equal(await page.locator('#count-roomTotal').textContent(),'45');assert.equal(await page.locator('#high-roomTotal').textContent(),'SH:45');
 assert(await page.evaluate(()=>document.getElementById('tier-row-anon').nextElementSibling.id==='tier-row-roomTotal'));
 const series=await page.locator('#spark-roomTotal').evaluate(c=>c._tierScopeChart.values);assert.deepEqual(series,[15,30,45]);
 await page.click('#btn-control-library');
 assert.equal(await page.locator('#tools-title').textContent(),'Saved sessions');assert.equal(await page.locator('.tools-subtitle').textContent(),'Library · Session storage and analysis');
 assert.deepEqual(await page.locator('[data-tools-tab]').allTextContents(),['Saved sessions','Summary','Compare','Backup']);
 assert.equal(await page.locator('#tools-current-kind').textContent(),'Current Live Session');
 // The book starts closed independently of storage settings and current controls.
 const book=page.locator('#tools-sessions-book'),searchMenu=page.locator('#tools-library-search-menu');
 assert.equal(await book.evaluate(e=>e.open),true);assert.equal(await searchMenu.evaluate(e=>e.open),false);
 assert(await page.locator('#tools-folder-saved_model_1').isHidden());assert(await page.locator('#tools-library-search').isHidden());
 assert(await page.locator('#tools-current-card').isHidden());
 for(const id of ['tools-library-storage','tools-open-session','tools-import-session','tools-refresh-library'])assert(await page.locator('#'+id).isVisible());
 const foldedState=await page.evaluate(()=>({live:ViewerTracker.__models.state(),stored:Object.entries(localStorage).filter(([key])=>!key.startsWith('tierscope:ui:disclosure:'))}));
 await page.locator('#tools-model-browser > summary').focus();await page.keyboard.press('Enter');
 assert(await page.locator('#tools-folder-saved_model_1').isVisible());assert(await page.locator('#tools-library-search').isHidden());
 assert.match(await page.locator('#tools-folder-saved_model_1').textContent(),/1 session · First .+ · Latest .+Total covered time 00:01:00/);
 assert.equal(await page.locator('#tools-folder-saved_model_1').getAttribute('aria-label'),'Open sessions for saved_model_1');
 await page.locator('#tools-library-search-toggle').focus();await page.keyboard.press('Space');
 await page.locator('#tools-library-search').fill('saved_model_1');assert.equal(await page.locator('[data-library-id]').count(),1);
 const filteredRow=page.locator('[data-library-id]');await filteredRow.locator('input[type=checkbox]').check();
 await filteredRow.locator('summary').click();await filteredRow.locator('textarea').fill('Draft inside the book');
 await page.evaluate(()=>window.bookEditor=document.querySelector('[data-library-id] textarea'));
 await page.click('#tools-library-search-toggle');assert.match(await page.locator('#tools-library-search-toggle').textContent(),/Filters active/);
 await page.click('#tools-sessions-book-toggle');await page.click('#tools-sessions-book-toggle');
 assert(await page.evaluate(()=>window.bookEditor===document.querySelector('[data-library-id] textarea')),'folding preserves the editor node');
 assert.equal(await filteredRow.locator('textarea').inputValue(),'Draft inside the book');assert(await filteredRow.locator('input[type=checkbox]').isChecked());
 assert.equal(await searchMenu.evaluate(e=>e.open),false,'opening the book does not expand search');
 await page.click('#tools-sessions-book-toggle');
 // A refresh triggered while the closed summary retains focus must not reopen it.
 await page.locator('#tools-refresh-library').evaluate(e=>e.click());
 assert.equal(await book.evaluate(e=>e.open),false);assert.equal(await page.evaluate(()=>document.activeElement.id),'tools-sessions-book-toggle');
 await clickControl(page,'[data-tools-tab=summary]');await page.click('[data-tools-tab=library]');
 assert.equal(await book.evaluate(e=>e.open),false);assert.equal(await searchMenu.evaluate(e=>e.open),false);
 await openLibraryBook(page);assert.equal(await page.locator('#tools-library-search').inputValue(),'saved_model_1');
 assert.equal(await filteredRow.locator('textarea').inputValue(),'Draft inside the book');assert(await filteredRow.locator('input[type=checkbox]').isChecked());
 await filteredRow.locator('summary').click();await filteredRow.getByRole('button',{name:'Discard changes',exact:true}).click();
 await page.click('#tools-clear-selection');await page.click('#tools-library-clear');
 assert.deepEqual(await page.evaluate(()=>({live:ViewerTracker.__models.state(),stored:Object.entries(localStorage).filter(([key])=>!key.startsWith('tierscope:ui:disclosure:'))})),foldedState,'folds, filters and drafts do not change session storage or playback');
 await page.click('#tools-close');await page.click('#btn-control-library');
 assert.equal(await book.evaluate(e=>e.open),true);assert.equal(await searchMenu.evaluate(e=>e.open),true,'a fresh Library remembers the search opened during the previous visit');
 await revealControl(page,'#tools-compare-previous');
 const compare=await page.locator('#tools-compare-previous').boundingBox(),history=await page.locator('#tools-room-history').boundingBox();
 assert(history.x>compare.x&&Math.abs(history.y-compare.y)<2,'History follows Compare with previous');
 assert.equal(await page.locator('#tools-current-card').getByRole('button').allTextContents().then(names=>names.filter(n=>['Save file','TXT','CSV','GIF','Add to ATH'].includes(n))).then(names=>names.length),0);
 assert(await page.locator('#tools-auto-keep').isEnabled());assert(!(await page.locator('#tools-auto-keep').isChecked()));
 assert(await page.locator('#tools-compare-previous').isDisabled());assert.equal(await page.locator('#tools-current-favorite').textContent(),'★');
 page.once('dialog',async d=>{assert.match(d.message(),/automatically keep their live sessions\?/);await d.dismiss();});await clickControl(page,'#tools-auto-keep');
 assert.equal(await page.evaluate(()=>ViewerTracker.__models.favorite('live_model').autoKeep),false);
 page.once('dialog',d=>d.accept());await clickControl(page,'#tools-auto-keep');
 assert.equal(await page.evaluate(()=>ViewerTracker.__models.favorite('live_model').autoKeep),true);
 assert.equal(await page.locator('#tools-room-history').textContent(),'History · 1');assert(await page.locator('#tools-auto-keep').isChecked());assert(await page.locator('#tools-auto-keep').isDisabled());
 assert(await page.locator('#tools-compare-previous').isDisabled(),'the saved copy of the current session is not previous');
 await openLibraryBook(page);await page.locator('#tools-library-search').scrollIntoViewIfNeeded();
 const controls=await page.evaluate(()=>{
  const box=id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right};};
  return {model:box('tools-library-model'),sort:box('tools-library-sort'),from:box('tools-library-from'),to:box('tools-library-to'),overflow:document.getElementById('tools-content').scrollWidth>document.getElementById('tools-content').clientWidth};
 });
 assert.equal(controls.model.y,controls.sort.y);assert.equal(controls.from.y,controls.to.y);assert(!controls.overflow);
 assert.match(await page.locator('#tools-library-favorites').locator('..').textContent(),/^Favorites only$/);
 // Frame documentation previews around both attached panels, without viewport whitespace or a transient toast.
 await page.click('#tools-close');await page.click('#btn-control-library');
 await page.locator('#tools-content').evaluate(e=>e.scrollTop=0);await page.waitForTimeout(200);
 const scopeBounds=await page.locator('#tracker-container').boundingBox(),libraryBounds=await page.locator('#tierscope-session-tools').boundingBox();
 const padding=16,x=Math.floor(Math.min(scopeBounds.x,libraryBounds.x))-padding,y=Math.floor(Math.min(scopeBounds.y,libraryBounds.y))-padding;
 const clip={x,y,width:Math.ceil(Math.max(scopeBounds.x+scopeBounds.width,libraryBounds.x+libraryBounds.width))-x+padding,height:Math.ceil(Math.max(scopeBounds.y+scopeBounds.height,libraryBounds.y+libraryBounds.height))-y+padding};
 await page.screenshot({path:'/tmp/tierscope-319-'+engine+'-collapsed-dark.png',clip});
 await page.uncheck('#dark-mode-toggle');await page.waitForTimeout(100);await page.screenshot({path:'/tmp/tierscope-319-'+engine+'-collapsed-bright.png',clip});await page.check('#dark-mode-toggle');
 await openLibraryBook(page,false);await page.screenshot({path:'/tmp/tierscope-319-'+engine+'-expanded-dark.png',clip});
 await page.uncheck('#dark-mode-toggle');await page.waitForTimeout(100);await page.screenshot({path:'/tmp/tierscope-319-'+engine+'-expanded-bright.png',clip});await page.check('#dark-mode-toggle');
 // Header consent on a new model; cancel must leave its state and the Library intact.
 await page.evaluate(()=>ViewerTracker.__models.replay());
 assert.equal(await page.locator('#header-text').textContent(),'replay_model');
 assert.equal(await page.locator('#tools-current-room').textContent(),'live_model');assert.equal(await page.locator('#tools-current-room-replay').textContent(),'replay_model');
 page.once('dialog',d=>d.dismiss());await page.click('#btn-model-favorite');assert.equal(await page.locator('#btn-model-favorite').textContent(),'☆');
 page.once('dialog',d=>d.accept());await page.click('#btn-model-favorite');assert.equal(await page.locator('#btn-model-favorite').textContent(),'★');
 assert.equal(await page.evaluate(()=>ViewerTracker.__models.library().entries.filter(e=>e.archive.room==='replay_model').length),0,'starring replay model never imports its snapshot');
 const download=page.waitForEvent('download');await page.click('#tools-save-session-replay');assert.equal(JSON.parse(fs.readFileSync(await(await download).path(),'utf8')).room,'replay_model');
 if(await book.evaluate(e=>e.open))await page.click('#tools-sessions-book-toggle');
 await clickControl(page,'#tools-keep');await page.locator('[data-library-id] summary').click();
 assert.equal(await book.evaluate(e=>e.open),true,'Keep reveals its session');assert.equal(await searchMenu.evaluate(e=>e.open),true,'Keep preserves the remembered search choice');
 const liveDownload=page.waitForEvent('download');await page.locator('[data-library-id]').getByRole('button',{name:'Save file',exact:true}).click();assert.equal(JSON.parse(fs.readFileSync(await(await liveDownload).path(),'utf8')).room,'live_model');
 await page.click('#playback-return');
 await page.evaluate(()=>{window.originalSet=GM_setValue;window.GM_setValue=(k,v)=>{if(k.startsWith('tierscope:library:v1:'))throw Error('Storage blocked');return originalSet(k,v);};ViewerTracker.__models.sample();});
 assert.match(await page.locator('[data-card-auto]').first().textContent(),/pending.*Storage blocked/);
 await page.evaluate(()=>window.GM_setValue=window.originalSet);await clickControl(page,'#tools-retry-automatic');assert(await page.locator('#tools-retry-automatic').isHidden());
 // Fresh choices from another tab stop automatic updates.
 const other=await context.newPage();await other.goto('https://tierscope.test/other_model/');await other.evaluate(()=>GM_setValue('tierscope:library-model:v1:live_model',JSON.stringify({schemaVersion:1,room:'live_model',favorite:false,autoKeep:false})));
 const kept=await page.evaluate(()=>JSON.stringify(ViewerTracker.__models.library().entries.find(e=>e.archive.room==='live_model').archive));
 await page.evaluate(()=>ViewerTracker.__models.sample());assert.equal(await page.evaluate(()=>JSON.stringify(ViewerTracker.__models.library().entries.find(e=>e.archive.room==='live_model').archive)),kept);await other.close();
 await page.click('#tools-refresh-library');assert.equal(await page.locator('#tools-current-favorite').textContent(),'☆');
 assert(await page.locator('#tools-auto-keep').isEnabled());assert(!(await page.locator('#tools-auto-keep').isChecked()));
 page.once('dialog',async d=>{assert.match(d.message(),/Favorite live_model/);await d.dismiss();});await page.locator('#tools-auto-keep').focus();await page.keyboard.press('Space');
 assert.equal(await page.evaluate(()=>ViewerTracker.__models.favorite('live_model').favorite),false);assert(!(await page.locator('#tools-auto-keep').isChecked()));
 // A draft in a growing session follows the verified replacement, even if its card remains open.
 page.once('dialog',d=>d.accept());await page.locator('#tools-auto-keep').focus();await page.keyboard.press('Space');
 await openLibraryBook(page);await page.selectOption('#tools-library-model','live_model');const session=page.locator('[data-library-id]');
 await session.locator('summary').click();await session.locator('textarea').fill('Draft while this session grows');
 await page.evaluate(()=>ViewerTracker.__models.sample());
 await session.getByRole('button',{name:'Save notes',exact:true}).click();
 assert.equal(await page.evaluate(()=>ViewerTracker.__models.library().entries.find(e=>e.archive.room==='live_model').notes),'Draft while this session grows');
 assert(await page.locator('#tools-review-notes').isHidden());
 const priorIds=await page.evaluate(()=>ViewerTracker.__models.older());
 await page.evaluate(()=>ViewerTracker.__models.replay());await page.click('#tools-refresh-library');
 const beforeCompare=await page.evaluate(()=>ViewerTracker.__models.state()),storedBefore=await page.evaluate(()=>JSON.stringify(ViewerTracker.__models.library().entries));
 await page.locator('#tools-compare-previous').focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator('[data-tools-tab=compare]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('#tools-recording-picker').getAttribute('open'),null);
 assert.deepEqual(await page.locator('[id^=tools-source-]').evaluateAll(els=>els.map(e=>e.value)),['live',...priorIds.slice(0,5)]);
 assert.equal(await page.locator('#tools-analysis-chart').count(),1);
 assert.deepEqual(await page.evaluate(()=>ViewerTracker.__models.state()),beforeCompare);
 assert.equal(await page.evaluate(()=>JSON.stringify(ViewerTracker.__models.library().entries)),storedBefore);
 await page.uncheck('#tools-follow-live');
 const tableBefore=await page.locator('#tools-summary-table').textContent();
 await page.evaluate(()=>ViewerTracker.__models.sample());assert.equal(await page.locator('#tools-summary-table').textContent(),tableBefore,'Follow live off keeps the comparison snapshot when another sample arrives');
 await page.click('#playback-return');assert.equal(await page.locator('#tools-summary-table').textContent(),tableBefore,'closing replay cannot replace the live comparison');
 await page.click('[data-tools-tab=library]');
 const layout=await page.evaluate(()=>{const c=document.getElementById('tools-content');const ids=Array.from(c.children).map(e=>e.id||e.className);return {storage:ids.indexOf('tools-library-storage'),book:ids.indexOf('tools-sessions-book'),searchFirst:document.getElementById('tools-sessions-book').children[1].id,listInside:document.getElementById('tools-library-list').parentElement.id,actions:ids.indexOf('tools-library-management'),last:c.lastElementChild.id};});
 assert.equal(layout.book,layout.storage+1);assert.equal(layout.searchFirst,'tools-library-search-menu');assert.equal(layout.listInside,'tools-sessions-book');assert(layout.actions>layout.book);assert.equal(layout.last,'tools-library-management');
 await page.setViewportSize({width:640,height:700});await page.waitForTimeout(200);
 assert(await page.evaluate(()=>{const r=document.getElementById('tracker-container').getBoundingClientRect();return document.getElementById('tracker-container').contains(document.elementFromPoint(r.x+10,r.y+10));}));
 assert.equal(await page.locator('#tools-content').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
 await page.screenshot({path:'/tmp/tierscope-317-'+engine+'-narrow.png'});
 assert.deepEqual(errors,[]);console.log('PASS collapsed Sessions Book and search, keyboard/focus, fold and tab state, draft/selection retention, simplified live card, favorite consent, six-session comparison, footer controls, themes and isolation');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
