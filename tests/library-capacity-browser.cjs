const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {instrument, prepareSource} = require('./helpers/instrument.cjs');
const engine = process.env.TIERSCOPE_BROWSER || 'chromium';
const source = prepareSource(fs.readFileSync(path.join(__dirname, '../tierscope.user.js'), 'utf8')).replaceAll('scheduleInit(2000);', '')
 .replace('downloadTrackingReport: downloadTrackingReport,', `__capacity:{
 setup(){loadSession(getModelName());const now=Date.now(),h={timestamps:[now-60000,now],breaks:[false,false]};
 STORAGE_HISTORY_SERIES.forEach(k=>h[k]=[2,4]);h.total=[14,28];h.withTokens=[12,24];
 restoreSessionState(normalizeStoredSession({timestamp:now,history:h,isPaused:true,pausedElapsedTime:60000}));
 isAutoRefreshOn=false;isMinimized=true;createPanel();toggleView();repaintLivePresentation();},
 readAutomaticKeepingMinutes,readLibraryLimits,readSessionLibrary,keepSessionInLibrary,captureLiveSessionFile,createTierScopeBackup,
 sample(){users=new Map([['viewer',{tier:'red',gender:'male'}]]);saveToHistory();saveSession(getModelName(),true);updateDisplay();},
 state:()=>({history:JSON.stringify(history),mode:presentationMode})},downloadTrackingReport: downloadTrackingReport,`);
(async () => {
 const browser = await require('playwright')[engine].launch({headless:true,executablePath:process.env.TIERSCOPE_CHROMIUM_PATH,args:JSON.parse(process.env.TIERSCOPE_CHROMIUM_ARGS||'[]')});
 try {
  const context = await browser.newContext({viewport:{width:1200,height:1000},acceptDownloads:true}), page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.route('https://tierscope.test/**', route => route.fulfill({contentType:'text/html',body:'<!doctype html><body style="background:#26303a"></body>'}));
  await context.addInitScript(() => {
   window.GM_listValues=()=>Object.keys(localStorage);window.GM_getValue=(k,d)=>localStorage.getItem(k)===null?d:JSON.parse(localStorage.getItem(k));
   window.GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));window.GM_deleteValue=k=>localStorage.removeItem(k);
  });
  await page.goto('https://tierscope.test/testroom/');await page.addScriptTag({content:instrument(source)});await page.evaluate(()=>ViewerTracker.__capacity.setup());await page.waitForTimeout(350);
  await page.click('#btn-control-library');
  const initial = await page.evaluate(()=>ViewerTracker.__capacity.state());
  assert.equal(await page.locator('#tools-storage-settings').getAttribute('open'),null);
  assert(await page.locator('#tools-automatic-minutes').isHidden(),'automatic keeping is inside the collapsed storage settings');
  assert.equal(await page.locator('#tools-automatic-settings summary').count(),0,'automatic keeping has no separate disclosure');
  if (!await page.locator('#tools-storage-settings').evaluate(e=>e.open)) await page.locator('#tools-storage-settings > summary').click();
  assert.equal(await page.locator('#tools-automatic-minutes').inputValue(),'5');
  await page.locator('#tools-automatic-minutes').fill('-1');await page.click('#tools-automatic-save');
  assert.equal(await page.evaluate(()=>ViewerTracker.__capacity.readAutomaticKeepingMinutes()),5);
  await page.locator('#tools-automatic-minutes').fill('10');await page.click('#tools-automatic-save');
  assert.equal(await page.evaluate(()=>ViewerTracker.__capacity.readAutomaticKeepingMinutes()),10);
  assert.deepEqual(await page.evaluate(()=>ViewerTracker.__capacity.readLibraryLimits()),{maxSessions:1000,maxMegabytes:50},'saving the automatic minimum does not change capacity');
  if (!await page.locator('#tools-storage-settings').evaluate(e=>e.open)) await page.locator('#tools-storage-settings > summary').click();
  await page.locator('#tools-automatic-minutes').fill('5');await page.locator('#tools-automatic-minutes').press('Enter');
  assert.equal(await page.evaluate(()=>ViewerTracker.__capacity.readAutomaticKeepingMinutes()),5);

  assert.match(await page.locator('#tools-library-usage').textContent(),/0 \/ 1,000 sessions.*0.00 \/ 50 MB/);
  assert(await page.locator('#tools-library-capacity-warning').isHidden());
  const openSettings = async () => { if (await page.locator('#tools-storage-settings').getAttribute('open') === null) await page.locator('#tools-storage-settings > summary').click(); };
  const save = async (sessions, megabytes) => {
   await openSettings();await page.locator('#tools-storage-sessions').fill(String(sessions));await page.locator('#tools-storage-megabytes').fill(String(megabytes));await page.click('#tools-storage-save');
  };
  await save(2000,100);assert.match(await page.locator('#tools-message').textContent(),/limits saved/);
  assert.match(await page.locator('#tools-library-usage').textContent(),/2,000 sessions.*100 MB/);
  await page.click('#tools-close');await page.click('#btn-control-library');await openSettings();
  assert.equal(await page.locator('#tools-storage-sessions').inputValue(),'2000');assert.equal(await page.locator('#tools-storage-megabytes').inputValue(),'100');
  await page.locator('#tools-storage-sessions').fill('0');await page.click('#tools-storage-save');
  assert.equal(await page.locator('#tools-storage-sessions').evaluate(e=>e.validity.valid),false);
  assert.equal(await page.evaluate(()=>ViewerTracker.__capacity.readLibraryLimits().maxSessions),2000);
  await page.locator('#tools-storage-defaults').click();
  assert.equal(await page.locator('#tools-storage-sessions').inputValue(),'1000');assert.equal(await page.locator('#tools-storage-megabytes').inputValue(),'50');
  assert.equal(await page.evaluate(()=>ViewerTracker.__capacity.readLibraryLimits().maxSessions),2000,'defaults are not saved until Save limits');
  await page.locator('#tools-storage-megabytes').press('Enter');assert.equal(await page.evaluate(()=>ViewerTracker.__capacity.readLibraryLimits().maxSessions),1000);
  // A refused settings write keeps the entered values available for retry.
  await page.evaluate(()=>{window.originalSet=GM_setValue;window.GM_setValue=(k,v)=>{if(k==='tierscope:library-limits:v1')throw Error('Storage blocked');return originalSet(k,v);};});
  await save(8,25);assert.match(await page.locator('#tools-storage-error').textContent(),/save failed.*Storage blocked/);
  assert.equal(await page.locator('#tools-storage-sessions').inputValue(),'8');assert.equal(await page.evaluate(()=>ViewerTracker.__capacity.readLibraryLimits().maxSessions),1000);
  await page.evaluate(()=>window.GM_setValue=window.originalSet);await page.click('#tools-storage-save');
  assert.equal(await page.evaluate(()=>ViewerTracker.__capacity.readLibraryLimits().maxSessions),8);
  assert.deepEqual(await page.evaluate(()=>ViewerTracker.__capacity.state()),initial);
  // Cross-tab preferences affect the next keep. Lowering limits never evicts sessions.
  await page.evaluate(()=>{for(const room of ['one','two','three','four'])ViewerTracker.__capacity.keepSessionInLibrary({...ViewerTracker.__capacity.captureLiveSessionFile(),room});});
  const other = await context.newPage();await other.goto('https://tierscope.test/otherroom/');
  await other.evaluate(()=>GM_setValue('tierscope:library-limits:v1',JSON.stringify({schemaVersion:1,maxSessions:5,maxMegabytes:25})));
  await page.click('#tools-refresh-library');assert.match(await page.locator('#tools-library-capacity-warning').textContent(),/nearing/);
  await save(3,25);assert.match(await page.locator('#tools-library-capacity-warning').textContent(),/limit reached/);
  await page.click('#tools-keep');assert.match(await page.locator('#tools-message').textContent(),/Library full/);
  assert.equal(await page.evaluate(()=>ViewerTracker.__capacity.readSessionLibrary().count),4);
  // Five-minute default keeps a one-minute favorite out, even when capacity is full.
  page.once('dialog',d=>d.accept());await page.click('#tools-auto-keep');
  assert.match(await page.locator('[data-card-auto]').first().textContent(),/requires 5 minutes/);
  assert.equal(await page.evaluate(()=>ViewerTracker.__capacity.readSessionLibrary().count),4);
  if (!await page.locator('#tools-storage-settings').evaluate(e=>e.open)) await page.locator('#tools-storage-settings > summary').click();
  await page.locator('#tools-automatic-minutes').fill('0');await page.click('#tools-automatic-save');
  // Auto uses the configured allowance and can retry after it is raised.

  assert.match(await page.locator('[data-card-auto]').first().textContent(),/pending.*Library full/);
  await save(6,50);await openSettings();await page.locator('#tools-storage-sessions').fill('7');
  await page.evaluate(()=>window.capacityInput=document.getElementById('tools-storage-sessions'));
  await page.evaluate(()=>ViewerTracker.__capacity.sample());
  assert.equal(await page.evaluate(()=>ViewerTracker.__capacity.readSessionLibrary().count),5);
  assert.match(await page.locator('#tools-library-usage').textContent(),/5 \/ 6 sessions/);
  assert.match(await page.locator('#tools-library-capacity-warning').textContent(),/nearing/);
  assert(await page.evaluate(()=>window.capacityInput===document.getElementById('tools-storage-sessions')));
  assert.equal(await page.locator('#tools-storage-sessions').inputValue(),'7','automatic capacity feedback preserves unfinished settings');
  const afterSample=await page.evaluate(()=>ViewerTracker.__capacity.state());
  assert(await page.locator('#tools-auto-keep').isChecked());assert(await page.locator('#tools-retry-automatic').isHidden());
  // Exports remain available above the current allowance and don't change it on restore.
  await save(2,50);await page.click('[data-tools-tab=backup]');
  const download=page.waitForEvent('download');await page.click('#tools-backup-download');const downloaded=await download;
  const bytes=fs.readFileSync(await downloaded.path()),backup=JSON.parse(bytes);assert.equal(backup.library.length,5);
  const picker=page.waitForEvent('filechooser');await page.click('#tools-backup-open');await(await picker).setFiles({name:'library.json',mimeType:'application/json',buffer:bytes});
  await page.locator('#tools-backup-restore').waitFor();assert.match(await page.locator('#tools-message').textContent(),/Backup validated/);
  page.once('dialog',d=>d.accept());await page.click('#tools-backup-restore');
  assert.match(await page.locator('#tools-message').textContent(),/Library full/);assert.equal(await page.evaluate(()=>ViewerTracker.__capacity.readLibraryLimits().maxSessions),2);
  await page.click('[data-tools-tab=library]');await save(1000,50);
  // Corrupt preferences don't hide recordings, and explicit settings repair is available.
  await other.evaluate(()=>GM_setValue('tierscope:library-limits:v1','{broken'));await page.click('#tools-refresh-library');
  assert.match(await page.locator('#tools-library-capacity-warning').textContent(),/could not be read/);
  assert.equal(await page.locator('#tools-library-list').count(),1);await save(1000,50);
  await page.click('#tools-close');await page.click('#btn-control-library');await openSettings();await page.locator('#tools-content').evaluate(e=>e.scrollTop=0);
  for (const theme of ['dark','bright']) {
   await page.locator('#dark-mode-toggle').setChecked(theme==='dark');await page.waitForTimeout(150);
   const scope=await page.locator('#tracker-container').boundingBox(),book=await page.locator('#tierscope-session-tools').boundingBox(),padding=16;
   const x=Math.floor(Math.min(scope.x,book.x))-padding,y=Math.floor(Math.min(scope.y,book.y))-padding;
   await page.screenshot({path:'/tmp/tierscope-capacity-'+engine+'-'+theme+'.png',clip:{x,y,width:Math.ceil(Math.max(scope.x+scope.width,book.x+book.width))-x+padding,height:Math.ceil(Math.max(scope.y+scope.height,book.y+book.height))-y+padding}});
  }
  await page.setViewportSize({width:640,height:700});await page.waitForTimeout(200);
  assert(await page.locator('#tools-content').evaluate(e=>e.scrollWidth<=e.clientWidth));
  await page.locator('#tools-storage-settings').evaluate(e=>e.open=true);
  await page.locator('#tools-storage-megabytes').evaluate(e=>e.focus());await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>ViewerTracker.__capacity.readLibraryLimits().maxMegabytes),51);
  assert.deepEqual(await page.evaluate(()=>ViewerTracker.__capacity.state()),afterSample);
  assert.deepEqual(errors,[]);await other.close();
  console.log('PASS capacity settings, persistence, keyboard/defaults, failed writes, cross-tab limits, no eviction, Auto retry, backup preflight, corrupt preferences, themes and narrow layout');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
