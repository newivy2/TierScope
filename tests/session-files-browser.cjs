const {clickControl,revealControl}=require('./helpers/library.cjs');
const {instrument, prepareSource} = require('./helpers/instrument.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {GifReader}=require('omggif');
const engine=process.env.TIERSCOPE_BROWSER||'chromium';
const source=prepareSource(fs.readFileSync(path.join(__dirname,'../tierscope.user.js'),'utf8')).replaceAll('scheduleInit(2000);','')
 .replace('downloadTrackingReport: downloadTrackingReport,',`
 __files:{setup:function(){
  loadSession(getModelName());var now=Date.now(),h={timestamps:Array.from({length:121},(_,i)=>now-(120-i)*60000),breaks:Array(121).fill(false)};
  h.breaks[110]=true;STORAGE_HISTORY_SERIES.forEach(k=>h[k]=h.timestamps.map((_,i)=>i===0?10000:10+i));
  restoreSessionState(normalizeStoredSession({timestamp:now,history:h,isPaused:true,pausedElapsedTime:7200000}));
  isAutoRefreshOn=false;isMinimized=true;createPanel();toggleView();collapsedRows=new Set();applyRowLayout();repaintLivePresentation();saveSession(getModelName());
 },init,pause:function(){if(playback&&playback.playing)togglePlayback();},scan:performScanThenReturn,library:readSessionLibrary,
 state:()=>({history:history.timestamps.slice(),paused:isPaused,stopped:isStopped,high:getSessionHigh('red',0).value,
  imported:!!(playback&&playback.imported),room:playback&&playback.archive.room,index:playback&&getPlaybackSampleIndex(playback.snapshot,playback.positionMs,playback.stepIndex)})},
 downloadTrackingReport: downloadTrackingReport,`);
async function downloaded(page,action){const [download]=await Promise.all([page.waitForEvent('download'),action()]);return {name:download.suggestedFilename(),bytes:fs.readFileSync(await download.path())};}
(async()=>{
 const browser=await require('playwright')[engine].launch({headless:true,executablePath:process.env.TIERSCOPE_CHROMIUM_PATH,args:JSON.parse(process.env.TIERSCOPE_CHROMIUM_ARGS||'[]')});
 try{
 const page=await browser.newPage({viewport:{width:1100,height:1100},acceptDownloads:true}),errors=[],dialogs=[];let requests=0;
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.message());await d.accept();});
 await page.route('https://tierscope.test/**',r=>{
  if(r.request().url().includes('/api/')){requests++;return r.fulfill({body:'5,testroom|o|f|0,viewer|t|m|0'});}
  return r.fulfill({contentType:'text/html',body:'<!doctype html><html><body style="background:#303846"></body></html>'});
 });
 await page.addInitScript(()=>{
  window.GM_listValues=()=>Object.keys(localStorage);window.GM_getValue=(k,d)=>localStorage.getItem(k)===null?d:JSON.parse(localStorage.getItem(k));
  window.GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));window.GM_deleteValue=k=>localStorage.removeItem(k);
 });
 await page.goto('https://tierscope.test/testroom/');await page.addScriptTag({content:instrument(source)});await page.evaluate(()=>ViewerTracker.__files.setup());await page.waitForTimeout(350);
 assert.equal(await page.evaluate(()=>typeof window.GifWriter),'undefined','GIF export needs no page/global encoder');
 const panel=page.locator('#tracker-container');await revealControl(page,'#btn-replay');const bounds=await panel.boundingBox(),canvas=page.locator('#spark-red');
 const before=await page.evaluate(()=>ViewerTracker.__files.state());
 const options=page.getByRole('button',{name:'Chart settings and highs'}),menu=page.locator('#panel-options');
 const save=page.locator('[data-library-id]').getByRole('button',{name:'Save file',exact:true}),open=page.locator('#tools-open-session');
 const replaySave=page.locator('#tools-save-session-replay'),replayOpen=open,replayKeep=page.locator('#tools-keep-replay');
 const message=page.locator('#tools-message');
 await revealControl(page,'#btn-replay');const libraryBounds=await page.locator('#btn-control-library').boundingBox(),replayBounds=await page.locator('#btn-replay').boundingBox();
 assert(libraryBounds.y<replayBounds.y,'Saved sessions is primary navigation above contextual Replay');
 assert(replayBounds.x>=bounds.x);assert(libraryBounds.x>=bounds.x);assert(replayBounds.x+replayBounds.width<=bounds.x+bounds.width);
 assert.equal(await page.locator('#btn-control-save-session,#btn-control-open-session,#btn-playback-keep-library').count(),0);
 const windowSelect=page.getByLabel('Chart window',{exact:true});
 await options.click();assert(await menu.isVisible());assert.deepEqual(await panel.boundingBox(),bounds,'options do not drag or grow panel');
 const windows=[['full',0,'Full'],['fourHours',0,'4h'],['twoHours',0,'2h'],['hour',60,'1h'],['halfHour',90,'30m'],['quarter',105,'15m']];
 assert.deepEqual(await windowSelect.locator('option').evaluateAll(options=>options.map(o=>o.value)),windows.map(([mode])=>mode));
 for(const [mode,start,label]of windows){await windowSelect.selectOption(mode);assert.equal(await canvas.evaluate(c=>c._tierScopeChart.plot.start),start);assert.equal(await options.textContent(),'Charts ▾');assert.deepEqual(await panel.boundingBox(),bounds);}
 assert.equal(await canvas.evaluate(c=>c._tierScopeChart.plot.max),130,'old high is outside selected scale');
 assert.equal((await page.evaluate(()=>ViewerTracker.__files.state())).high,10000,'session high survives chart crop');
 if(process.env.TIERSCOPE_FILE_SHOTS)await panel.screenshot({path:process.env.TIERSCOPE_FILE_SHOTS+'-menu.png'});
 await page.keyboard.press('Escape');
 await page.click('#btn-control-library');await clickControl(page,'#tools-keep');await page.locator('[data-library-id] summary').click();assert(await save.isEnabled());assert(await open.isVisible());
 const keptBounds=await panel.boundingBox();
 const exported=await downloaded(page,()=>save.click());
 assert(exported.name.endsWith('.tierscope.json'));const archive=JSON.parse(exported.bytes);assert.equal(archive.session.history.timestamps.length,121);
 assert(!(await menu.isVisible()));assert.deepEqual(await panel.boundingBox(),keptBounds,'export does not move or grow the panel');
 assert.deepEqual(await page.evaluate(()=>ViewerTracker.__files.state()),before);
 const csv=await downloaded(page,()=>page.locator('[data-library-id]').getByRole('button',{name:'CSV',exact:true}).click());assert.equal(csv.bytes.toString().trim().split('\r\n').length,122);
 await options.click();await page.keyboard.press('Escape');assert(!(await menu.isVisible()));assert.equal(await page.evaluate(()=>document.activeElement.id),'btn-panel-options');
 await options.click();await page.mouse.click(20,20);assert(!(await menu.isVisible()));
 await page.click('#tools-close');
 await canvas.focus();await page.keyboard.press('Home');assert.match(await page.locator('#tierscope-chart-tooltip').textContent(),/Sample 1\/16/);
 await page.keyboard.press('Escape');
 await clickControl(page,'#btn-replay');await page.evaluate(()=>ViewerTracker.__files.pause());
 await page.locator('#playback-scrubber').evaluate(e=>{e.value='110';e.dispatchEvent(new Event('input'));});
 await page.click('#btn-playback-library');
 const index=(await page.evaluate(()=>ViewerTracker.__files.state())).index;assert.equal(index,110);
 assert(await replaySave.isVisible());assert(await replaySave.isEnabled());assert(await replayOpen.isVisible());
 const replayBeforeSave=await page.evaluate(()=>ViewerTracker.__files.state());
 await replaySave.focus();
 const replayExport=await downloaded(page,()=>page.keyboard.press('Enter'));
 const replayArchive=JSON.parse(replayExport.bytes);
 assert(replayArchive.session.timestamp>=archive.session.timestamp,'Replay captures a new snapshot time');
 assert.deepEqual(replayArchive,{...archive,session:{...archive.session,timestamp:replayArchive.session.timestamp}},'ordinary Replay Save downloads the full frozen session');
 assert.deepEqual(await page.evaluate(()=>ViewerTracker.__files.state()),replayBeforeSave,'Replay Save preserves position and live session');
 assert(await replayKeep.isVisible());assert(await replayKeep.isEnabled());
 await replayKeep.focus();await page.keyboard.press('Enter');assert.match(await message.textContent(),/already in the library/i);
 const keptReplay=await page.evaluate(()=>ViewerTracker.__files.library().entries[0].archive);
 assert.deepEqual({...keptReplay,session:{...keptReplay.session,timestamp:replayArchive.session.timestamp}},replayArchive,'Keep retains the whole snapshot and its highs; export time alone does not make a new recording');
 await replayKeep.click();assert.match(await message.textContent(),/already in the library/i);assert.equal(await page.evaluate(()=>ViewerTracker.__files.library().count),1);
 assert.deepEqual(await page.evaluate(()=>ViewerTracker.__files.state()),replayBeforeSave,'Keep does not move the playhead or change live data');
 if(process.env.TIERSCOPE_FILE_SHOTS)await panel.screenshot({path:process.env.TIERSCOPE_FILE_SHOTS+'-ordinary-replay.png'});
 await options.click();
 for(const [mode,minutes]of [['full',Infinity],['fourHours',240],['twoHours',120],['hour',60],['halfHour',30],['quarter',15]]){
  await windowSelect.selectOption(mode);assert.equal((await page.evaluate(()=>ViewerTracker.__files.state())).index,index);
  assert.equal(await canvas.evaluate(c=>c._tierScopeChart.plot.end),110);assert.equal(await canvas.evaluate(c=>c._tierScopeChart.plot.start),Math.max(0,110-minutes));
 }
 await page.locator('#panel-options-close').click();await page.click('#playback-return');
 archive.room='archived_room';const file={name:'archived.tierscope.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(archive))};
 const picker=page.waitForEvent('filechooser');await open.click();await(await picker).setFiles(file);
 await page.waitForFunction(()=>ViewerTracker.__files.state().imported);
 const roomLabel=page.locator('#playback-room');assert(await roomLabel.isVisible());assert.equal(await roomLabel.textContent(),'Room: archived_room');
 assert.match(await page.locator('#header-text').getAttribute('title'),/^Replay:/);assert.match(await page.locator('#header-text').getAttribute('title'),/archived_room/);
 assert.equal(await page.locator('#playback-play').textContent(),'Play','files open paused');assert.equal(await page.locator('#playback-return').textContent(),'Close Replay');
 const replayPanelBounds=await panel.boundingBox();assert.equal(replayPanelBounds.width,bounds.width);assert.equal(replayPanelBounds.x,bounds.x);
 await page.locator('#session-file-input').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{broken')});
 await page.waitForFunction(()=>document.getElementById('header-text').title.startsWith('Replay:'));
 await page.waitForTimeout(100);assert.match(dialogs.at(-1),/Could not open session file/);assert.equal((await page.evaluate(()=>ViewerTracker.__files.state())).room,'archived_room');
 await page.evaluate(()=>ViewerTracker.__files.scan());assert.equal((await page.evaluate(()=>ViewerTracker.__files.state())).history.length,122);assert.equal((await page.evaluate(()=>ViewerTracker.__files.state())).room,'archived_room');
 assert.equal(await roomLabel.textContent(),'Room: archived_room','live scans preserve the file source label');
 assert(await replaySave.isVisible());assert(await page.locator('#tools-keep').isVisible());assert(await replayOpen.isVisible());assert(!(await menu.isVisible()));
 const fileBeforeSave=await page.evaluate(()=>ViewerTracker.__files.state());
 const reexported=await downloaded(page,()=>replaySave.click());
 assert.deepEqual(JSON.parse(reexported.bytes),archive,'file Replay downloads its original full session, not current room data');
 assert.deepEqual(await page.evaluate(()=>ViewerTracker.__files.state()),fileBeforeSave,'file Save preserves playback and the background live session');
 assert.equal(await replayKeep.textContent(),'Keep in Library','a different replay clears prior feedback');
 const athBeforeKeep=await page.evaluate(()=>JSON.stringify(GM_listValues().filter(k=>k.startsWith('tierscope:ath')).sort().map(k=>[k,GM_getValue(k)])));
 await page.evaluate(()=>{window.restoreLibrarySet=GM_setValue;window.GM_setValue=(k,v)=>{if(k.startsWith('tierscope:library:'))throw new Error('disk full');window.restoreLibrarySet(k,v);};});
 await replayKeep.click();assert.match(await message.textContent(),/disk full/);assert(await replayKeep.isEnabled());
 assert.equal(await page.evaluate(()=>ViewerTracker.__files.library().count),1);
 await page.evaluate(()=>{window.GM_setValue=window.restoreLibrarySet;});
 await replayKeep.focus();await page.keyboard.press('Space');assert.match(await message.textContent(),/Saved/);
 assert.equal(await page.evaluate(()=>ViewerTracker.__files.library().count),2);
 assert.deepEqual(await page.evaluate(()=>ViewerTracker.__files.library().entries.find(e=>e.archive.room==='archived_room').archive),archive,'file Keep uses the file room and all its samples, not the background live room');
 assert.equal(await page.evaluate(()=>JSON.stringify(GM_listValues().filter(k=>k.startsWith('tierscope:ath')).sort().map(k=>[k,GM_getValue(k)]))),athBeforeKeep,'Keep does not add ATH');
 assert.deepEqual(await page.evaluate(()=>ViewerTracker.__files.state()),fileBeforeSave);
 const gif=await downloaded(page,()=>page.click('#btn-export-gif-replay'));assert(gif.name.startsWith('archived_room-replay-'));
 const reader=new GifReader(gif.bytes);assert.equal(reader.numFrames(),60);assert.equal(reader.width,480);assert.equal(reader.height,640);
 const rgba=new Uint8Array(480*640*4);reader.decodeAndBlitFrameRGBA(59,rgba);assert(rgba.some((v,i)=>i%4===0&&v>0));
 if(process.env.TIERSCOPE_FILE_SHOTS){await page.click('#playback-next');await panel.screenshot({path:process.env.TIERSCOPE_FILE_SHOTS+'-replay.png'});}
 const longArchive={...archive,room:'archived_room_'.repeat(6)+'long_name'};
 const replayPicker=page.waitForEvent('filechooser');await replayOpen.focus();await page.keyboard.press('Enter');
 await(await replayPicker).setFiles({name:'long.tierscope.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(longArchive))});
 await page.waitForFunction(room=>ViewerTracker.__files.state().room===room,longArchive.room);
 assert.equal(await roomLabel.textContent(),'Room: '+longArchive.room);assert.equal(await roomLabel.getAttribute('title'),'Saved session from '+longArchive.room);
 assert.deepEqual(await panel.boundingBox(),replayPanelBounds,'a long room name does not grow the replay panel');
 assert.equal(await replayKeep.textContent(),'Keep in Library');
 assert(await roomLabel.evaluate(e=>e.scrollWidth>e.clientWidth && getComputedStyle(e).textOverflow==='ellipsis'),'long names are shortened visually');
 const roomBounds=await roomLabel.boundingBox(),playBounds=await page.locator('#playback-play').boundingBox(),timelineBounds=await page.locator('#playback-scrubber').boundingBox();
 assert(roomBounds.x>=bounds.x&&roomBounds.x+roomBounds.width<=bounds.x+bounds.width);
 assert(roomBounds.y+roomBounds.height<=playBounds.y,'room label does not overlap the buttons');
 assert(playBounds.y+playBounds.height<=timelineBounds.y,'buttons do not overlap the timeline');
 const timeBounds=await page.locator('#playback-position').boundingBox(),libraryBox=await page.locator('#btn-playback-library').boundingBox();
 assert(timelineBounds.y+timelineBounds.height<=timeBounds.y,'time stays below the timeline');
 assert(libraryBox.x>=bounds.x&&libraryBox.x+libraryBox.width<=bounds.x+bounds.width,'replay Library stays inside the panel');
 if(process.env.TIERSCOPE_FILE_SHOTS)await panel.screenshot({path:process.env.TIERSCOPE_FILE_SHOTS+'-long-name.png'});
 await page.click('#playback-return');assert.equal((await page.evaluate(()=>ViewerTracker.__files.state())).imported,false);
 assert(!(await roomLabel.isVisible()),'file source disappears on return to live');
 assert(await replaySave.isHidden());assert(await page.locator('#tools-keep').isVisible());assert(await replayOpen.isVisible());
 assert.match(await page.locator('#tools-current-kind').textContent(),/Current Live Session/);assert.equal(await page.locator('#tools-current-room').textContent(),'testroom');
 assert.equal((await page.evaluate(()=>ViewerTracker.__files.state())).paused,true);assert.match(await page.locator('#header-text').getAttribute('title'),/^Live room:/);
 await clickControl(page,'#btn-replay');await page.evaluate(()=>ViewerTracker.__files.pause());assert(!(await roomLabel.isVisible()));assert.equal(await roomLabel.textContent(),'','ordinary Replay clears the file source');
 await replayKeep.click();assert.match(await message.textContent(),/Updated session/);
 assert.equal(await page.evaluate(()=>ViewerTracker.__files.library().count),2,'keeping a growing session updates its entry');
 assert.equal(await page.evaluate(()=>ViewerTracker.__files.library().entries.find(e=>e.archive.room==='testroom').archive.session.history.timestamps.length),122);
 const ordinaryPicker=page.waitForEvent('filechooser');await replayOpen.click();await(await ordinaryPicker).setFiles(file);
 await page.waitForFunction(()=>ViewerTracker.__files.state().imported);
 assert.equal(await roomLabel.textContent(),'Room: archived_room','ordinary Replay can open a file directly');
 assert.deepEqual((await page.evaluate(()=>ViewerTracker.__files.state())).history,fileBeforeSave.history,'Open leaves the background live session intact');
 await page.click('#playback-return');
 await page.reload();await page.addScriptTag({content:instrument(source)});await page.evaluate(()=>ViewerTracker.__files.init());
 assert.equal(await page.locator('#btn-panel-options').textContent(),'Charts ▾');assert.equal(await page.locator('#chart-window-select').inputValue(),'quarter');assert.equal((await page.evaluate(()=>ViewerTracker.__files.state())).imported,false,'reload restores only the room session');
 const priorRequests=requests;
 await page.goto('https://tierscope.test/followed-cams/');await page.addScriptTag({content:instrument(source)});await page.evaluate(()=>ViewerTracker.__files.init());
 await page.click('#btn-expand');await page.click('#btn-control-library');assert(await page.locator('#tools-keep').isDisabled(),'empty directory view has nothing to keep');assert(await open.isEnabled());
 const directoryPicker=page.waitForEvent('filechooser');await open.click();await(await directoryPicker).setFiles(file);await page.waitForFunction(()=>ViewerTracker.__files.state().imported);
 assert(await roomLabel.isVisible());assert.equal(await roomLabel.textContent(),'Room: archived_room');
 await page.click('#playback-next');await page.click('#playback-return');assert.equal(requests,priorRequests,'opening a file on a directory page causes no acquisition');
 assert.deepEqual(errors,[]);
 console.log('PASS Library kept-session and Replay Save/Open controls; Keep in library with keyboard, full snapshots, deduplication, failure/retry and room/ATH isolation; full replay exports, empty-session availability, file replacement, long-name and action layout, source clearing on exit, chart windows, frozen Replay position and unchanged panel geometry');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
