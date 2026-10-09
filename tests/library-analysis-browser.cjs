const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {instrument,prepareSource}=require('./helpers/instrument.cjs');
const {openLibraryBook}=require('./helpers/library.cjs');
const engine=process.env.TIERSCOPE_BROWSER||'chromium';
const source=prepareSource(fs.readFileSync(path.join(__dirname,'../tierscope.user.js'),'utf8')).replaceAll('scheduleInit(2000);','')
.replace('downloadTrackingReport: downloadTrackingReport,',`__organized:{checkUrlChange,
 setup(){loadSession(getModelName());const now=Date.now(),h={timestamps:[now-180000,now-120000,now-60000,now],breaks:[false,false,true,false]};
 STORAGE_HISTORY_SERIES.forEach(k=>h[k]=[0,0,0,0]);h.red=[10,20,40,30];h.total=h.red.slice();h.withTokens=h.red.slice();h.anonymous=[5,5,5,5];
 restoreSessionState(normalizeStoredSession({timestamp:now,history:h,isPaused:true,pausedElapsedTime:180000}));isAutoRefreshOn=false;isMinimized=true;createPanel();toggleView();repaintLivePresentation();saveSession(getModelName());
 const base=captureSessionFile();for(let i=0;i<8;i++){
  const a=JSON.parse(JSON.stringify(base)),start=Date.UTC(2026,9,i%6+1,12);a.room=i<6?'alpha_model':'beta_model';
  a.session.history.timestamps=[start,start+60000,start+120000,start+180000];a.session.sessionStartedAt=start;a.session.timestamp=start+180000;
  for(const key of STORAGE_HISTORY_SERIES){if(key!=='anonymous')a.session.history[key]=a.session.history[key].map(v=>v+i);a.session.sessionHighs[key]={value:Math.max(...a.session.history[key]),time:start+120000};}
  a.session.roomTotalHigh=45+i;a.session.roomTotalHighTime=start+120000;
  GM_setValue('tierscope:library:v1:organized_'+i,JSON.stringify({schemaVersion:1,addedAt:now,title:i===0?'alpha_model':'Recording '+(i+1),favorite:i===0,notes:i===0?'Opening day':'',archive:a}));
 }
 },extended(){
 const base=captureSessionFile();for(let i=0;i<31;i++){
 const a=JSON.parse(JSON.stringify(base)),start=Date.UTC(2026,8,i+1,12);a.room='extended_model';
 a.session.history.timestamps=a.session.history.timestamps.map((_,j)=>start+j*60000);a.session.sessionStartedAt=start;a.session.timestamp=start+180000;
 for(const key of STORAGE_HISTORY_SERIES){if(key!=='anonymous')a.session.history[key]=a.session.history[key].map(v=>v+i);a.session.sessionHighs[key]={value:Math.max(...a.session.history[key]),time:start+120000};}
 a.session.roomTotalHigh=45+i;a.session.roomTotalHighTime=start+120000;
 GM_setValue('tierscope:library:v1:extended_'+i,JSON.stringify({schemaVersion:1,addedAt:start,title:'Extended '+i,archive:a}));
 }
 },probeShadow(){
 const host=document.createElement('div');host.style.width='300px';document.getElementById('tools-content').appendChild(host);
 const samples=Array.from({length:30},(_,i)=>({times:[0,60000],values:[i<12?20:8,i<12?20:8],breaks:[false,false],timestamps:[100000-i*1000,160000-i*1000]}));
 const view=renderAnalysisChart(host,samples,samples.map((_,i)=>'Probe '+i),60000,'Probe');
 const canvas=view.canvas,ratio=window.devicePixelRatio||1;
 const pixels=canvas.getContext('2d').getImageData(80*ratio,98*ratio,100*ratio,14*ratio).data;
 let maxAlpha=0;for(let i=3;i<pixels.length;i+=4)maxAlpha=Math.max(maxAlpha,pixels[i]);
 view.dispose();host.remove();return maxAlpha;
 },library:readSessionLibrary,archive:captureSessionFile,
 state:()=>({history:JSON.stringify(history),paused:isPaused,mode:presentationMode,ath:JSON.stringify(readAllTimeHighs(getModelName()).highs)}),
 theme:()=>{isDarkMode=!isDarkMode;applyPanelTheme();},
 changedLive(){const value=normalizeStoredSession({timestamp:Date.now(),history:JSON.parse(JSON.stringify(history)),isPaused:true,pausedElapsedTime:180000});restoreSessionState(value);updateSessionToolsStatus();}},downloadTrackingReport: downloadTrackingReport,`);
const file=(name,value)=>({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
(async()=>{
 const browser=await require('playwright')[engine].launch({headless:true,executablePath:process.env.TIERSCOPE_CHROMIUM_PATH,args:JSON.parse(process.env.TIERSCOPE_CHROMIUM_ARGS||'[]')});
 try{
  const context=await browser.newContext({viewport:{width:1200,height:1000},timezoneId:'America/Sao_Paulo',acceptDownloads:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('https://tierscope.test/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body style="background:#303846"></body>'}));
  await context.addInitScript(()=>{
   window.GM_listValues=()=>Object.keys(localStorage);window.GM_getValue=(k,d)=>localStorage.getItem(k)===null?d:JSON.parse(localStorage.getItem(k));
   window.GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));window.GM_deleteValue=k=>localStorage.removeItem(k);
   window.analysisStrokes=[];window.analysisComposites=[];const drawImage=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(...args){if(!this.canvas.id&&this.globalAlpha<1)window.analysisComposites.push(this.globalAlpha);return drawImage.apply(this,args);};
   const stroke=CanvasRenderingContext2D.prototype.stroke;
   CanvasRenderingContext2D.prototype.stroke=function(...args){
    if(!this.canvas.id&&document.getElementById('tools-analysis-chart'))window.analysisStrokes.push({color:this.strokeStyle,dash:this.getLineDash(),alpha:this.globalAlpha});
    return stroke.apply(this,args);
   };
  });
  await page.goto('https://tierscope.test/live_room/');await page.addScriptTag({content:instrument(source)});await page.evaluate(()=>ViewerTracker.__organized.setup());await page.waitForTimeout(200);
  const before=await page.evaluate(()=>ViewerTracker.__organized.state()),bounds=await page.locator('#tracker-container').boundingBox();
  await page.click('#btn-control-library');await openLibraryBook(page);
  assert.deepEqual(await page.locator('#tools-library-sort option').allTextContents(),['Newest First','Oldest First','Alphabetical','Favorites First','Highest number of sessions','Lowest number of sessions']);
  const folders=()=>page.locator('.tools-folder-open').evaluateAll(nodes=>nodes.map(node=>node.id.replace('tools-folder-','')));
  for(const [sort,expected] of [['mostSessions',['alpha_model','beta_model']],['fewestSessions',['beta_model','alpha_model']],['alphabetical',['alpha_model','beta_model']],['favorites',['alpha_model','beta_model']],['newest',['alpha_model','beta_model']],['oldest',['beta_model','alpha_model']]]) {
   await page.selectOption('#tools-library-sort',sort);assert.deepEqual(await folders(),expected,sort+' folder order');
  }
  await page.selectOption('#tools-library-sort','newest');
  await page.click('#tools-folder-alpha_model');assert.equal(await page.locator('.tools-row').count(),6);
  await page.selectOption('#tools-library-sort','alphabetical');assert.equal(await page.locator('.tools-row').first().getAttribute('data-library-id'),'organized_5','Alphabetical keeps sessions newest first inside a model');
  await page.selectOption('#tools-library-sort','newest');
  // Drafts survive list actions, filters, tabs and closing the Library. None of
  // these actions writes notes; explicit Save/Discard controls their lifetime.
  const draftRow=page.locator('[data-library-id=organized_0]');
  await draftRow.locator('summary').click();await draftRow.locator('textarea').fill('Unfinished note');
  await page.evaluate(()=>window.draftEditor=document.querySelector('[data-library-id=organized_0] textarea'));
  await draftRow.locator('input[type=checkbox]').check();await page.click('#tools-select-matching');await page.click('#tools-clear-selection');
  assert(await page.evaluate(()=>window.draftEditor===document.querySelector('[data-library-id=organized_0] textarea')),'selection preserves the editor node');
  assert.equal(await draftRow.locator('textarea').inputValue(),'Unfinished note');
  assert.equal(await page.evaluate(()=>JSON.parse(GM_getValue('tierscope:library:v1:organized_0')).notes),'Opening day');
  assert(await page.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;}));
  await page.locator('#tools-library-search').fill('no such recording');await page.locator('#tools-library-search').fill('');
  assert.equal(await draftRow.locator('textarea').inputValue(),'Unfinished note');
  await page.click('[data-tools-tab=summary]');await page.click('[data-tools-tab=library]');
  assert.equal(await draftRow.locator('textarea').inputValue(),'Unfinished note');
  await page.click('#tools-close');await page.click('#btn-control-library');await page.click('#tools-review-notes');
  assert.equal(await page.locator('#tools-content textarea').inputValue(),'Unfinished note');
  await page.screenshot({path:'/tmp/tierscope-315-'+engine+'-drafts-dark.png'});
  await page.evaluate(()=>{window.realDraftSet=GM_setValue;window.GM_setValue=(key,value)=>{if(key.startsWith('tierscope:library:v1:'))throw Error('Draft save blocked');return window.realDraftSet(key,value);};});
  await page.click('#tools-notes-save-organized_0');assert.match(await page.locator('#tools-message').textContent(),/Draft save blocked/);
  assert.equal(await page.locator('#tools-content textarea').inputValue(),'Unfinished note');await page.evaluate(()=>window.GM_setValue=window.realDraftSet);
  const draftOther=await context.newPage();await draftOther.goto('https://tierscope.test/other_room/');
  await draftOther.evaluate(()=>{const key='tierscope:library:v1:organized_0',entry=JSON.parse(GM_getValue(key));entry.notes='Changed in another tab';GM_setValue(key,JSON.stringify(entry));});
  page.once('dialog',dialog=>dialog.dismiss());await page.click('#tools-notes-save-organized_0');
  assert.equal(await page.locator('#tools-content textarea').inputValue(),'Unfinished note');
  assert.equal(await page.evaluate(()=>JSON.parse(GM_getValue('tierscope:library:v1:organized_0')).notes),'Changed in another tab');
  page.once('dialog',dialog=>dialog.accept());await page.click('#tools-notes-save-organized_0');assert(await page.locator('#tools-review-notes').isHidden());
  await draftOther.close();
  await page.click('[data-tools-tab=library]');await openLibraryBook(page);await page.click('#tools-folder-alpha_model');await draftRow.locator('summary').click();
  await draftRow.locator('textarea').fill('Opening day');await page.click('#tools-notes-save-organized_0');
  if (!(await draftRow.locator('details').evaluate(e=>e.open))) await draftRow.locator('summary').click();
  await draftRow.locator('textarea').fill('Recover after removal');
  await page.evaluate(()=>{window.draftOriginal=GM_getValue('tierscope:library:v1:organized_0');GM_deleteValue('tierscope:library:v1:organized_0');});
  await page.click('#tools-refresh-library');await page.click('#tools-review-notes');assert(await page.locator('#tools-notes-save-organized_0').isDisabled());
  assert.equal(await page.locator('#tools-content textarea').inputValue(),'Recover after removal');
  await page.evaluate(()=>GM_setValue('tierscope:library:v1:organized_0',window.draftOriginal));
  await page.click('#tools-notes-discard-organized_0');assert(await page.locator('#tools-review-notes').isHidden());
  assert.equal(await page.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;}),false);
  await page.click('[data-tools-tab=library]');
  await page.locator('#tools-library-from').fill('2026-10-02');await page.locator('#tools-library-to').fill('2026-10-04');assert.equal(await page.locator('.tools-row').count(),3);
  await page.selectOption('#tools-library-sort','oldest');assert.equal(await page.locator('.tools-row').first().getAttribute('data-library-id'),'organized_1');
  await page.click('#tools-library-clear');await page.check('#tools-library-favorites');assert.equal(await page.locator('.tools-folder').count(),1);
  assert.equal(await page.locator('#tools-model-favorite-alpha_model').getAttribute('aria-pressed'),'true');
  await page.selectOption('#tools-library-model','*');assert.equal(await page.locator('.tools-row').count(),6,'every recording of a favorite model is included');
  await page.uncheck('#tools-library-favorites');await page.locator('#tools-library-search').fill('Opening day');assert.equal(await page.locator('.tools-row').count(),1);
  const first=page.locator('[data-library-id=organized_0]');await first.locator('summary').click();
  await first.locator('textarea').fill('Remember this\n<b>plain text</b>');await first.getByRole('button',{name:'Save notes',exact:true}).click();
  await page.locator('#tools-library-search').fill('Remember this');assert.equal(await page.locator('.tools-row').count(),1);assert.equal(await page.locator('.tools-recording-note b').count(),0);
  assert.match(await page.locator('.tools-recording-note').textContent(),/\n<b>plain text<\/b>/);
  assert.equal(await page.locator('[id^=tools-favorite-organized]').count(),0,'favorites are not individual recording actions');
  await page.selectOption('#tools-library-model','alpha_model');
  await page.click('#tools-model-favorite-alpha_model');assert.equal(await page.locator('#tools-model-favorite-alpha_model').getAttribute('aria-pressed'),'false');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'tools-model-favorite-alpha_model');
  page.once('dialog',dialog=>dialog.accept());await page.click('#tools-model-favorite-alpha_model');
  // Another tab changes a different model without replacing this model's choice.
  const other=await context.newPage();await other.goto('https://tierscope.test/other_room/');
  await other.evaluate(()=>GM_setValue('tierscope:library-model:v1:beta_model',JSON.stringify({schemaVersion:1,room:'beta_model',favorite:true})));
  await page.click('#tools-library-clear');await page.check('#tools-library-favorites');await page.click('#tools-refresh-library');assert.equal(await page.locator('.tools-folder').count(),2);
  await other.evaluate(()=>GM_setValue('tierscope:library-model:v1:beta_model',JSON.stringify({schemaVersion:1,room:'beta_model',favorite:false})));
  await page.click('#tools-refresh-library');assert.equal(await page.locator('.tools-folder').count(),1);await other.close();
  // Six selected library recordings become six independent comparison slots.
  await page.click('#tools-library-clear');await page.selectOption('#tools-library-model','alpha_model');await page.locator('#tools-library-selection').evaluate(e=>e.open=true);await page.click('#tools-select-matching');
  assert.match(await page.locator('#tools-library-selected').textContent(),/^6 selected/);
  await page.locator('.tools-filters').evaluate(e=>e.scrollIntoView({block:'start'}));
  await page.screenshot({path:'/tmp/tierscope-314-'+engine+'-library.png'});
  const download=page.waitForEvent('download');await page.click('#tools-export-selected');const bundle=JSON.parse(fs.readFileSync(await(await download).path(),'utf8'));
  assert.equal(bundle.library.length,6);assert.deepEqual(bundle.rooms,[]);assert.deepEqual(bundle.preferences,{});assert.deepEqual(bundle.favoriteModels,['alpha_model']);assert(bundle.library.some(e=>e.notes.includes('Remember this')));
  await page.click('#tools-compare-selected');assert.equal(await page.locator('[id^=tools-source-]').count(),6);assert(await page.locator('#tools-compare-add').isEnabled());
  const defaultLabel=await page.locator('#tools-source-a option[value=organized_0]').textContent();assert.equal(defaultLabel.split('alpha_model').length-1,1,'default model title is not duplicated');assert.match(defaultLabel,/10\/1\/2026/);
  assert.match(await page.locator('#tools-source-a option[value=organized_1]').textContent(),/alpha_model — Recording 2 —/,'custom titles remain visible');
  assert.equal(await page.locator('#tools-summary-table thead th').count(),7);assert.equal(await page.locator('#tools-chart-inspection tbody tr').count(),6);
  // The latest date owns the solid pink line even when it is not in slot A.
  const firstSlot=await page.locator('#tools-source-a').inputValue(),thirdSlot=await page.locator('#tools-source-c').inputValue();
  await page.selectOption('#tools-source-a',thirdSlot);await page.selectOption('#tools-source-c',firstSlot);
  assert.equal(await page.locator('.tools-chart-legend label').nth(2).locator('.tools-series-swatch').evaluate(e=>e.style.borderTopStyle),'solid');
  assert.equal(await page.locator('.tools-chart-legend label').nth(0).locator('.tools-series-swatch').evaluate(e=>e.style.borderTopStyle),'dashed');
  assert.match(await page.locator('.tools-chart-legend label').nth(2).getAttribute('title'),/Latest session — solid pink/);
  await page.evaluate(()=>{window.analysisStrokes=[];window.analysisComposites=[];});await page.click('#tools-chart-reset');
  const darkStrokes=await page.evaluate(()=>window.analysisStrokes.filter(s=>['#ff69b4','#79baff','#68d391','#ffd166','#c4a3ff','#ff987d'].includes(s.color)));
  assert(darkStrokes.some(s=>s.color==='#ff69b4'));assert(darkStrokes.some(s=>s.color!=='#ff69b4'));
  for(const s of darkStrokes)assert.deepEqual(s.dash,s.color==='#ff69b4'?[]:[6,4]);
  assert.equal(darkStrokes.at(-1).color,'#ff69b4','latest solid line is painted over earlier dashes');
  await page.selectOption('#tools-source-a',firstSlot);await page.selectOption('#tools-source-c',thirdSlot);
  await page.click('#tools-chart-zoom-in');await page.locator('[data-analysis-series="1"]').uncheck();await page.click('#tools-chart-pin');
  const keptRange=await page.locator('#tools-chart-range').textContent();
  const roomAtCursor=Number(await page.locator('#tools-chart-inspection tbody tr').first().locator('td').first().textContent());
  await page.evaluate(()=>{window.keptChart=document.getElementById('tools-analysis-chart');window.keptPicker=document.getElementById('tools-source-a');});
  await page.click('#tools-metric-total');
  assert.equal(Number(await page.locator('#tools-chart-inspection tbody tr').first().locator('td').first().textContent()),roomAtCursor-5,'preserved cursor reads the new metric');
  assert.equal(await page.locator('#tools-chart-range').textContent(),keptRange);assert.equal(await page.locator('[data-analysis-series="1"]').isChecked(),false);
  assert.equal(await page.locator('#tools-chart-pin').getAttribute('aria-pressed'),'true');
  assert(await page.evaluate(()=>window.keptChart===document.getElementById('tools-analysis-chart')&&window.keptPicker===document.getElementById('tools-source-a')),'metric updates preserve chart and picker nodes');
  await page.locator('#tools-threshold').fill('20');await page.click('#tools-apply-threshold');
  assert.equal(await page.locator('#tools-chart-range').textContent(),keptRange);assert.equal(await page.locator('#tools-chart-pin').getAttribute('aria-pressed'),'true');
  assert(await page.evaluate(()=>window.keptPicker===document.getElementById('tools-source-a')));
  await page.locator('#tools-analysis-search').fill('Recording');
  assert.equal(await page.locator('#tools-chart-range').textContent(),keptRange);assert.equal(await page.locator('[data-analysis-series="1"]').isChecked(),false);
  await page.click('[data-tools-tab=summary]');await page.click('[data-tools-tab=compare]');
  assert.equal(await page.locator('#tools-chart-range').textContent(),keptRange);assert.equal(await page.locator('[data-analysis-series="1"]').isChecked(),false);
  await page.locator('#tools-analysis-search').fill('');await page.locator('[data-analysis-series="1"]').check();await page.click('#tools-chart-reset');await page.click('#tools-chart-pin');
  await page.click('#tools-metric-room');await page.locator('#tools-threshold').fill('100');await page.click('#tools-apply-threshold');
  await page.selectOption('#tools-analysis-model','beta_model');
  assert.match(await page.locator('#tools-source-a option:checked').textContent(),/outside filters/);assert.equal(await page.locator('#tools-summary-table thead th').count(),7);
  await page.click('#tools-analysis-clear');await page.locator('#tools-analysis-from').fill('2026-10-03');await page.locator('#tools-analysis-to').fill('2026-10-03');
  assert.equal(await page.locator('#tools-source-a option').count(),2,'matching date plus retained selected recording');
  await page.click('#tools-analysis-clear');await page.locator('#tools-recording-picker > summary').click();
  const summaryBefore=await page.locator('#tools-summary-table').textContent();
  await page.locator('#tools-analysis-chart').focus();await page.keyboard.press('Home');
  assert.deepEqual(await page.locator('#tools-chart-inspection tbody tr td:first-of-type').allTextContents(),['20','19','18','17','16','15']);
  await page.keyboard.press('ArrowRight');assert.match(await page.locator('#tools-chart-inspection caption').textContent(),/1m/);
  await page.keyboard.press('ArrowRight');assert.match(await page.locator('#tools-chart-inspection caption').textContent(),/2m/);
  // Hover at 1.5 minutes, inside the recorded gap in all six recordings.
  await page.click('#tools-chart-pin');await page.locator('#tools-analysis-chart').evaluate(canvas=>{
   const b=canvas.getBoundingClientRect(),w=Math.max(260,canvas.clientWidth);canvas.dispatchEvent(new PointerEvent('pointermove',{clientX:b.left+(52+(w-14-52)*.5)/w*b.width,clientY:b.top+50,bubbles:true}));
  });
  assert.equal(await page.locator('#tools-chart-inspection').getByText('Session gap — no sample',{exact:true}).count(),6);
  await page.click('#tools-chart-zoom-in');assert.match(await page.locator('#tools-chart-range').textContent(),/0.75m – 2.25m/);
  assert.equal(await page.locator('#tools-summary-table').textContent(),summaryBefore,'zoom does not silently change analysis totals');
  const rangeBefore=await page.locator('#tools-chart-range').textContent();await page.evaluate(()=>ViewerTracker.__organized.changedLive());
  assert.equal(await page.locator('#tools-chart-range').textContent(),rangeBefore,'background live replacement does not reset stored comparison');
  await page.uncheck('[data-analysis-series="0"]');assert.equal(await page.locator('#tools-chart-inspection tbody tr:visible').count(),5);
  assert.equal(await page.locator('#tools-summary-table').textContent(),summaryBefore);
  await page.check('[data-analysis-series="0"]');await page.click('#tools-chart-reset');
  // Drag to zoom uses scaled pointer positions; keyboard and pan can recover the full range.
  const box=await page.locator('#tools-analysis-chart').boundingBox();
  await page.mouse.move(box.x+box.width*.35,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.75,box.y+box.height*.5);await page.mouse.up();
  assert.notEqual(await page.locator('#tools-chart-range').textContent(),'Chart window 0m – 3m · full comparison/session range 3m');
  await page.click('#tools-chart-pan-right');await page.click('#tools-chart-reset');
  await page.locator('#tools-content').evaluate(e=>e.scrollTop=0);await page.screenshot({path:'/tmp/tierscope-314-'+engine+'-compare-dark.png'});
  await page.evaluate(()=>{window.analysisStrokes=[];ViewerTracker.__organized.theme();});await page.waitForTimeout(80);await page.screenshot({path:'/tmp/tierscope-314-'+engine+'-compare-bright.png'});
  const brightStrokes=await page.evaluate(()=>window.analysisStrokes.filter(s=>['#b42370','#175db0','#176f36','#835900','#7140a6','#a23c20'].includes(s.color)));
  assert(brightStrokes.some(s=>s.color==='#b42370'));assert(brightStrokes.some(s=>s.color!=='#b42370'));
  for(const s of brightStrokes)assert.deepEqual(s.dash,s.color==='#b42370'?[]:[6,4]);
  assert.deepEqual(await page.locator('#tracker-container').boundingBox(),bounds,'analysis actions preserve Scope position before viewport clamping');
  await page.setViewportSize({width:380,height:740});await page.waitForTimeout(80);
  assert((await page.locator('#tierscope-session-tools').evaluate(e=>e.scrollWidth-e.clientWidth))<=1);
  assert(await page.evaluate(()=>+getComputedStyle(document.getElementById('tracker-container')).zIndex>+getComputedStyle(document.getElementById('tierscope-session-tools')).zIndex));
  await page.setViewportSize({width:1200,height:1000});await page.waitForTimeout(80);
  await page.locator('#tools-recording-picker > summary').click();
  const originalB=await page.locator('#tools-source-b').inputValue(),originalA=await page.locator('#tools-source-a').inputValue();
  await page.selectOption('#tools-source-b',originalA);assert.equal(await page.locator('#tools-analysis-chart').count(),0);assert.match(await page.locator('#tools-content').textContent(),/different session in each/);
  await page.selectOption('#tools-source-b',originalB);
  const removed=await page.evaluate(id=>{const key='tierscope:library:v1:'+id,raw=GM_getValue(key);GM_deleteValue(key);return {key,raw};},originalB);
  await page.click('[data-tools-tab=library]');await page.click('[data-tools-tab=compare]');
  assert.equal(await page.locator('#tools-analysis-chart').count(),0);assert.match(await page.locator('#tools-source-b option:checked').textContent(),/changed or removed/);
  await page.evaluate(({key,raw})=>GM_setValue(key,raw),removed);await page.click('[data-tools-tab=library]');await page.click('[data-tools-tab=compare]');
  assert.equal(await page.locator('#tools-chart-inspection tbody tr').count(),6);
  // A shorter recording clamps a zoomed window when matching shared length;
  // changing the actual recording selection starts a fresh chart interaction.
  await page.evaluate(raw=>{const entry=JSON.parse(raw);entry.archive.room='short_model';for(const key of Object.keys(entry.archive.session.history))entry.archive.session.history[key]=entry.archive.session.history[key].slice(0,2);GM_setValue('tierscope:library:v1:short_fixture',JSON.stringify(entry));},removed.raw);
  await page.click('[data-tools-tab=library]');await page.click('[data-tools-tab=compare]');
  await page.uncheck('#tools-shared-length');await page.selectOption('#tools-source-b','short_fixture');
  assert.equal(await page.locator('#tools-chart-pin').getAttribute('aria-pressed'),'false');
  await page.locator('#tools-analysis-chart').focus();await page.keyboard.press('End');await page.click('#tools-chart-zoom-in');
  await page.check('#tools-shared-length');assert.match(await page.locator('#tools-chart-range').textContent(),/Chart window 0m – 1m/);
  assert.equal(await page.locator('#tools-chart-pin').getAttribute('aria-pressed'),'true');
  assert.match(await page.locator('#tools-chart-inspection caption').textContent(),/Cursor 1m/);
  await page.selectOption('#tools-source-b',originalB);assert.match(await page.locator('#tools-chart-range').textContent(),/Chart window 0m – 3m/);
  assert.equal(await page.locator('#tools-chart-pin').getAttribute('aria-pressed'),'false');
  await page.evaluate(()=>GM_deleteValue('tierscope:library:v1:short_fixture'));
  // Summary shares the same inspection/zoom controls, with one recording.
  await page.click('[data-tools-tab=summary]');assert.equal(await page.locator('#tools-chart-inspection tbody tr').count(),1);
  await page.locator('#tools-analysis-chart').focus();await page.keyboard.press('End');await page.keyboard.press('Escape');assert.equal(await page.locator('#tierscope-session-tools').count(),1,'chart Escape releases cursor before closing the Library');
  await page.click('[data-tools-tab=library]');await page.click('#tools-library-clear');
  // Bulk import is explicit, validates all files before writing, and keeps live data independent.
  const archive=await page.evaluate(()=>ViewerTracker.__organized.archive()),newA={...archive,room:'import_a'},newB={...archive,room:'import_b'};
  let picker=page.waitForEvent('filechooser');await page.click('#tools-import-session');await(await picker).setFiles([file('a.json',newA),file('bad.json',{format:'broken'})]);
  await page.waitForFunction(()=>document.getElementById('tools-message').textContent.length>0);assert.equal(await page.evaluate(()=>ViewerTracker.__organized.library().count),8);
  picker=page.waitForEvent('filechooser');await page.click('#tools-import-session');await(await picker).setFiles([file('a.json',newA),file('b.json',newB)]);
  await page.waitForFunction(()=>ViewerTracker.__organized.library().count===10);
  picker=page.waitForEvent('filechooser');await page.click('#tools-import-session');await(await picker).setFiles(file('bundle.json',bundle));
  await page.waitForFunction(()=>document.getElementById('tools-message').textContent.includes('Imported:'));assert.equal(await page.evaluate(()=>ViewerTracker.__organized.library().count),10);
  assert.deepEqual(await page.evaluate(()=>ViewerTracker.__organized.state()),before);
  const finalBounds=await page.locator('#tracker-container').boundingBox();assert.equal(finalBounds.width,bounds.width);assert.equal(finalBounds.height,bounds.height);
  // Closing/reopening keeps metadata while clearing transient selections.
  await page.keyboard.press('Escape');await page.click('#btn-control-library');await openLibraryBook(page);await page.selectOption('#tools-library-model','alpha_model');await page.check('#tools-library-favorites');
  assert.equal(await page.locator('.tools-row').count(),6);assert.match(await page.locator('.tools-recording-note').textContent(),/Remember this/);assert.match(await page.locator('#tools-library-selected').textContent(),/^0 selected/);
  // Thirty slots: twelve progressively faded foreground lines, eighteen faint background traces.
  await page.evaluate(()=>ViewerTracker.__organized.extended());await page.click('#tools-refresh-library');
  await page.click('#tools-library-clear');await page.selectOption('#tools-library-model','extended_model');
  // Hidden selections count toward the mixed-model cap without restricting export.
  await page.locator('#tools-library-selection').evaluate(e=>e.open=true);
  for(let i=19;i<=30;i++)await page.locator('[data-library-id="extended_'+i+'"] input[type=checkbox]').check();
  await page.selectOption('#tools-library-model','alpha_model');await page.locator('[data-library-id="organized_0"] input[type=checkbox]').check();
  assert.match(await page.locator('#tools-library-selected').textContent(),/^13 selected.*Comparison limit: 12/);
  assert(await page.locator('#tools-compare-selected').isDisabled());assert(await page.locator('#tools-export-selected').isEnabled());
  assert.match(await page.locator('#tools-compare-selected').getAttribute('title'),/12 across models/);
  await page.selectOption('#tools-library-model','extended_model');await page.locator('[data-library-id="extended_19"] input[type=checkbox]').uncheck();
  assert(await page.locator('#tools-compare-selected').isEnabled());await page.click('#tools-compare-selected');
  await page.locator('#tools-recording-picker').evaluate(e=>e.open=true);
  assert.equal(await page.locator('#tools-compare-slots').textContent(),'12 / 12 slots');
  assert(await page.locator('#tools-compare-add').isDisabled());assert.equal(await page.locator('#tools-summary-table thead th').count(),13);
  // Returning all slots to one model enables expansion and skips unrelated snapshots.
  await page.selectOption('#tools-source-l','extended_19');assert.equal(await page.locator('#tools-compare-slots').textContent(),'12 / 30 slots');
  assert(await page.locator('#tools-compare-add').isEnabled());await page.click('#tools-compare-add');
  const thirteenth=await page.locator('#tools-source-m').inputValue();assert.match(thirteenth,/^extended_/);
  assert.equal(await page.locator('#tools-summary-table thead th').count(),14);
  await page.selectOption('#tools-source-m','organized_0');
  assert.equal(await page.locator('#tools-compare-slots').textContent(),'13 / 12 slots');assert(await page.locator('#tools-compare-add').isDisabled());
  assert.equal(await page.locator('#tools-analysis-chart').count(),0);assert.equal(await page.locator('#tools-summary-table').count(),0);
  assert.match(await page.locator('#tools-analysis-output').textContent(),/twelve sessions across different models/);
  await page.selectOption('#tools-source-m',thirteenth);assert.equal(await page.locator('#tools-analysis-chart').count(),1);
  assert.equal(await page.locator('#tools-summary-table thead th').count(),14);
  await page.click('[data-tools-tab=library]');await page.click('#tools-clear-selection');await page.selectOption('#tools-library-model','extended_model');
  await page.locator('#tools-library-selection').evaluate(e=>e.open=true);await page.click('#tools-select-matching');
  assert(await page.locator('#tools-compare-selected').isDisabled(),'thirty-one selected sessions cannot be compared');
  await page.locator('[data-library-id="extended_0"] input[type=checkbox]').uncheck();
  assert(await page.locator('#tools-compare-selected').isEnabled());await page.click('#tools-compare-selected');
  assert.equal(await page.locator('[id^=tools-source-]').count(),30);assert(await page.locator('#tools-compare-add').isDisabled());
  assert.equal(await page.locator('#tools-summary-table thead th').count(),31);
  const lastSlot=await page.locator('#tools-source-ad').inputValue();
  await page.getByRole('button',{name:'Remove AD',exact:true}).click();assert.equal(await page.locator('[id^=tools-source-]').count(),29);
  assert(await page.locator('#tools-compare-add').isEnabled());await page.click('#tools-compare-add');
  assert.match(await page.locator('#tools-source-ad').inputValue(),/^extended_/,'Add stays in the selected model above twelve sessions');
  await page.selectOption('#tools-source-ad',lastSlot);assert.equal(await page.locator('[id^=tools-source-]').count(),30);
  assert(await page.locator('#tools-compare-add').isDisabled());
  const styles=()=>page.locator('.tools-chart-legend label').evaluateAll(labels=>labels.map(e=>({opacity:Number(e.querySelector('.tools-series-swatch').style.opacity),dash:e.querySelector('.tools-series-swatch').style.borderTopStyle,color:e.style.color})));
  let thirty=await styles();assert.deepEqual(thirty.map(s=>Math.round(s.opacity*100)),[100,95,90,85,80,75,70,65,60,55,50,45,...Array(18).fill(12)]);
  assert.equal(thirty[0].dash,'solid');assert(thirty.slice(1).every(s=>s.dash==='dashed'));
  await page.evaluate(()=>{window.analysisStrokes=[];window.analysisComposites=[];});await page.click('#tools-chart-reset');
  const alphas=await page.evaluate(()=>window.analysisStrokes.filter(s=>['#b42370','#175db0','#176f36','#835900','#7140a6','#a23c20'].includes(s.color)).map(s=>Math.round(s.alpha*100)));
  assert.deepEqual(alphas,[45,50,55,60,65,70,75,80,85,90,95,100]);
  assert.deepEqual(await page.evaluate(()=>window.analysisComposites.map(alpha=>Math.round(alpha*100))),[12],'old traces composite once at 12% opacity without accumulating');
  assert.equal(await page.locator('#tools-source-aa').count(),1);assert.equal(await page.locator('#tools-source-ad').count(),1);
  assert.match(await page.locator('.tools-chart-legend label').nth(29).textContent(),/^AD/);
  await page.locator('#tools-content').evaluate(e=>e.scrollTop=0);
  await page.locator('#tools-recording-picker').evaluate(e=>e.open=false);
  await page.screenshot({path:'/tmp/tierscope-shadow-'+engine+'-bright.png'});
  const previewClip=await page.evaluate(()=>{const l=document.getElementById('tierscope-session-tools').getBoundingClientRect(),p=document.getElementById('tracker-container').getBoundingClientRect();return {x:Math.min(l.left,p.left),y:Math.min(l.top,p.top),width:Math.max(l.right,p.right)-Math.min(l.left,p.left),height:Math.max(l.bottom,p.bottom)-Math.min(l.top,p.top)};});
  await page.screenshot({path:'/tmp/tierscope-shadow-preview-'+engine+'-bright.png',clip:previewClip});
  const oldest=await page.locator('#tools-source-ad').inputValue(),newest=await page.locator('#tools-source-a').inputValue();
  await page.locator('#tools-recording-picker').evaluate(e=>e.open=true);
  await page.selectOption('#tools-source-a',oldest);await page.selectOption('#tools-source-ad',newest);
  thirty=await styles();assert.equal(thirty[0].opacity,.12);assert.equal(thirty[29].opacity,1);assert.equal(thirty[29].dash,'solid');
  await page.locator('[data-analysis-series="5"]').uncheck();assert.deepEqual(await styles(),thirty,'hidden lines do not reassign opacity');
  assert.equal(await page.locator('#tools-chart-inspection tbody tr:visible').count(),29);
  await page.locator('[data-analysis-series="5"]').check();
  await page.locator('[data-analysis-series="13"]').uncheck();
  assert.deepEqual(await styles(),thirty,'hiding a background session does not reassign foreground styles');
  assert.equal(await page.locator('#tools-chart-inspection tbody tr:visible').count(),29);
  await page.locator('[data-analysis-series="13"]').check();
  await page.locator('#tools-analysis-chart').focus();await page.keyboard.press('Home');
  assert.equal(await page.locator('#tools-chart-inspection tbody tr').count(),30);
  await page.selectOption('#tools-compare-axis','clock');
  assert.equal(await page.locator('#tools-chart-inspection tbody tr').count(),30);
  await page.evaluate(()=>ViewerTracker.__organized.theme());await page.waitForTimeout(80);
  assert.equal((await styles())[0].opacity,.12);assert.equal((await styles())[29].opacity,1);
  await page.locator('#tools-recording-picker').evaluate(e=>e.open=false);await page.locator('#tools-content').evaluate(e=>e.scrollTop=0);
  await page.selectOption('#tools-compare-axis','elapsed');
  await page.screenshot({path:'/tmp/tierscope-shadow-'+engine+'-dark.png'});
  await page.screenshot({path:'/tmp/tierscope-shadow-preview-'+engine+'-dark.png',clip:previewClip});
  await page.setViewportSize({width:380,height:740});await page.waitForTimeout(80);
  assert((await page.locator('#tierscope-session-tools').evaluate(e=>e.scrollWidth-e.clientWidth))<=1);
  const shadowAlpha=await page.evaluate(()=>ViewerTracker.__organized.probeShadow());
  assert(shadowAlpha>=20&&shadowAlpha<=32,'eighteen coincident background traces remain around 12% opacity: '+shadowAlpha);
  assert.deepEqual(await page.evaluate(()=>ViewerTracker.__organized.state()),before);
  await page.evaluate(()=>{history.pushState({},'', '/next_room/');ViewerTracker.__organized.checkUrlChange();});assert.equal(await page.locator('#tierscope-session-tools').count(),0);
  assert.deepEqual(errors,[]);console.log(engine+': filtered library, metadata, bulk transfer, twelve-model/thirty-session limits, progressive fading and composited shadows, cursor/gaps, zoom/pan, themes and isolation passed');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
