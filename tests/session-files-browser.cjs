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
 },init,pause:function(){if(playback&&playback.playing)togglePlayback();},scan:performScanThenReturn,
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
 const panel=page.locator('#tracker-container'),bounds=await panel.boundingBox(),canvas=page.locator('#spark-red');
 const before=await page.evaluate(()=>ViewerTracker.__files.state());
 const options=page.getByRole('button',{name:'Chart window and session files'}),menu=page.locator('#panel-options');
 const save=page.locator('#btn-control-save-session'),open=page.locator('#btn-control-open-session');
 const replaySave=page.getByRole('button',{name:'Save replay session file',exact:true}),replayOpen=page.getByRole('button',{name:'Open session file in replay',exact:true});
 assert(await save.isVisible());assert(await save.isEnabled());assert(await open.isVisible());
 assert(!(await menu.isVisible()),'session buttons are available without opening the menu');
 const windowSelect=page.getByLabel('Chart window',{exact:true});
 await options.click();assert(await menu.isVisible());assert.deepEqual(await panel.boundingBox(),bounds,'options do not drag or grow panel');
 const windows=[['full',0,'Full'],['fourHours',0,'4h'],['twoHours',0,'2h'],['hour',60,'1h'],['halfHour',90,'30m'],['quarter',105,'15m']];
 assert.deepEqual(await windowSelect.locator('option').evaluateAll(options=>options.map(o=>o.value)),windows.map(([mode])=>mode));
 for(const [mode,start,label]of windows){await windowSelect.selectOption(mode);assert.equal(await canvas.evaluate(c=>c._tierScopeChart.plot.start),start);assert.equal(await options.textContent(),label+' ▾');assert.deepEqual(await panel.boundingBox(),bounds);}
 assert.equal(await canvas.evaluate(c=>c._tierScopeChart.plot.max),130,'old high is outside selected scale');
 assert.equal((await page.evaluate(()=>ViewerTracker.__files.state())).high,10000,'session high survives chart crop');
 if(process.env.TIERSCOPE_FILE_SHOTS)await panel.screenshot({path:process.env.TIERSCOPE_FILE_SHOTS+'-menu.png'});
 await page.keyboard.press('Escape');
 const exported=await downloaded(page,()=>save.click());
 assert(exported.name.endsWith('.tierscope.json'));const archive=JSON.parse(exported.bytes);assert.equal(archive.session.history.timestamps.length,121);
 assert(!(await menu.isVisible()));assert.deepEqual(await panel.boundingBox(),bounds,'direct Save does not move or grow the panel');
 assert.deepEqual(await page.evaluate(()=>ViewerTracker.__files.state()),before);
 const csv=await downloaded(page,()=>page.click('#btn-download-csv'));assert.equal(csv.bytes.toString().trim().split('\r\n').length,122);
 await options.click();await page.keyboard.press('Escape');assert(!(await menu.isVisible()));assert.equal(await page.evaluate(()=>document.activeElement.id),'btn-panel-options');
 await options.click();await page.mouse.click(20,20);assert(!(await menu.isVisible()));
 await canvas.focus();await page.keyboard.press('Home');assert.match(await page.locator('#tierscope-chart-tooltip').textContent(),/Sample 1\/16/);
 await page.keyboard.press('Escape');
 await page.click('#btn-replay');await page.evaluate(()=>ViewerTracker.__files.pause());
 await page.locator('#playback-scrubber').evaluate(e=>{e.value='110';e.dispatchEvent(new Event('input'));});
 const index=(await page.evaluate(()=>ViewerTracker.__files.state())).index;assert.equal(index,110);
 assert(await replaySave.isVisible());assert(await replaySave.isEnabled());assert(await replayOpen.isVisible());
 const replayBeforeSave=await page.evaluate(()=>ViewerTracker.__files.state());
 await replaySave.focus();
 const replayExport=await downloaded(page,()=>page.keyboard.press('Enter'));
 const replayArchive=JSON.parse(replayExport.bytes);
 assert(replayArchive.session.timestamp>=archive.session.timestamp,'Replay captures a new snapshot time');
 assert.deepEqual(replayArchive,{...archive,session:{...archive.session,timestamp:replayArchive.session.timestamp}},'ordinary Replay Save downloads the full frozen session');
 assert.deepEqual(await page.evaluate(()=>ViewerTracker.__files.state()),replayBeforeSave,'Replay Save preserves position and live session');
 if(process.env.TIERSCOPE_FILE_SHOTS)await panel.screenshot({path:process.env.TIERSCOPE_FILE_SHOTS+'-ordinary-replay.png'});
 await options.click();
 for(const [mode,minutes]of [['full',Infinity],['fourHours',240],['twoHours',120],['hour',60],['halfHour',30],['quarter',15]]){
  await windowSelect.selectOption(mode);assert.equal((await page.evaluate(()=>ViewerTracker.__files.state())).index,index);
  assert.equal(await canvas.evaluate(c=>c._tierScopeChart.plot.end),110);assert.equal(await canvas.evaluate(c=>c._tierScopeChart.plot.start),Math.max(0,110-minutes));
 }
 await page.getByRole('button',{name:'Close chart and session options'}).click();await page.click('#playback-return');
 archive.room='archived_room';const file={name:'archived.tierscope.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(archive))};
 const picker=page.waitForEvent('filechooser');await open.click();await(await picker).setFiles(file);
 await page.waitForFunction(()=>ViewerTracker.__files.state().imported);
 const roomLabel=page.locator('#playback-room');assert(await roomLabel.isVisible());assert.equal(await roomLabel.textContent(),'Room: archived_room');
 assert.match(await page.locator('#header-text').textContent(),/^FILE:/);assert.match(await page.locator('#header-text').getAttribute('title'),/archived_room/);
 assert.equal(await page.locator('#playback-play').textContent(),'Play','files open paused');assert.equal(await page.locator('#playback-return').textContent(),'Close Replay');
 assert.deepEqual(await panel.boundingBox(),bounds,'import leaves panel geometry unchanged');
 await page.locator('#session-file-input').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{broken')});
 await page.waitForFunction(()=>document.getElementById('header-text').textContent.startsWith('FILE:'));
 await page.waitForTimeout(100);assert.match(dialogs.at(-1),/Could not open session file/);assert.equal((await page.evaluate(()=>ViewerTracker.__files.state())).room,'archived_room');
 await page.evaluate(()=>ViewerTracker.__files.scan());assert.equal((await page.evaluate(()=>ViewerTracker.__files.state())).history.length,122);assert.equal((await page.evaluate(()=>ViewerTracker.__files.state())).room,'archived_room');
 assert.equal(await roomLabel.textContent(),'Room: archived_room','live scans preserve the file source label');
 assert(await replaySave.isVisible());assert(await replayOpen.isVisible());assert(!(await menu.isVisible()));
 const fileBeforeSave=await page.evaluate(()=>ViewerTracker.__files.state());
 const reexported=await downloaded(page,()=>replaySave.click());
 assert.deepEqual(JSON.parse(reexported.bytes),archive,'file Replay downloads its original full session, not current room data');
 assert.deepEqual(await page.evaluate(()=>ViewerTracker.__files.state()),fileBeforeSave,'file Save preserves playback and the background live session');
 const gif=await downloaded(page,()=>page.click('#btn-export-gif'));assert(gif.name.startsWith('archived_room-replay-'));
 const reader=new GifReader(gif.bytes);assert.equal(reader.numFrames(),60);assert.equal(reader.width,480);assert.equal(reader.height,640);
 const rgba=new Uint8Array(480*640*4);reader.decodeAndBlitFrameRGBA(59,rgba);assert(rgba.some((v,i)=>i%4===0&&v>0));
 if(process.env.TIERSCOPE_FILE_SHOTS){await page.click('#playback-next');await panel.screenshot({path:process.env.TIERSCOPE_FILE_SHOTS+'-replay.png'});}
 const longArchive={...archive,room:'archived_room_'.repeat(6)+'long_name'};
 const replayPicker=page.waitForEvent('filechooser');await replayOpen.focus();await page.keyboard.press('Enter');
 await(await replayPicker).setFiles({name:'long.tierscope.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(longArchive))});
 await page.waitForFunction(room=>ViewerTracker.__files.state().room===room,longArchive.room);
 assert.equal(await roomLabel.textContent(),'Room: '+longArchive.room);assert.equal(await roomLabel.getAttribute('title'),'Saved session from '+longArchive.room);
 assert.deepEqual(await panel.boundingBox(),bounds,'a long room name does not grow the panel');
 assert(await roomLabel.evaluate(e=>e.scrollWidth>e.clientWidth && getComputedStyle(e).textOverflow==='ellipsis'),'long names are shortened visually');
 const roomBounds=await roomLabel.boundingBox(),playBounds=await page.locator('#playback-play').boundingBox(),timelineBounds=await page.locator('#playback-scrubber').boundingBox();
 const addBounds=await page.locator('#btn-playback-add-all-time').boundingBox();
 assert(roomBounds.x+roomBounds.width<=addBounds.x,'long room names leave room for the ATH action');
 assert(addBounds.x+addBounds.width<=bounds.x+bounds.width,'ATH action stays inside the panel');
 assert(addBounds.y+addBounds.height<=playBounds.y,'ATH action does not overlap playback buttons');
 assert(roomBounds.y+roomBounds.height<=playBounds.y,'room label does not overlap the buttons');
 assert(playBounds.y+playBounds.height<=timelineBounds.y,'buttons do not overlap the timeline');
 const timeBounds=await page.locator('#playback-position').boundingBox(),saveBounds=await replaySave.boundingBox(),openBounds=await replayOpen.boundingBox();
 assert(timelineBounds.y+timelineBounds.height<=saveBounds.y,'file actions sit below the timeline');
 assert(timeBounds.x+timeBounds.width<=saveBounds.x,'Save does not cover the replay time');
 assert(saveBounds.x+saveBounds.width<=openBounds.x,'file actions do not overlap');
 assert(openBounds.x+openBounds.width<=bounds.x+bounds.width,'file actions stay inside the panel');
 if(process.env.TIERSCOPE_FILE_SHOTS)await panel.screenshot({path:process.env.TIERSCOPE_FILE_SHOTS+'-long-name.png'});
 await page.click('#playback-return');assert.equal((await page.evaluate(()=>ViewerTracker.__files.state())).imported,false);
 assert(!(await roomLabel.isVisible()),'file source disappears on return to live');
 assert(!(await replaySave.isVisible()));assert(!(await replayOpen.isVisible()));
 assert.equal((await page.evaluate(()=>ViewerTracker.__files.state())).paused,true);assert.match(await page.locator('#header-text').textContent(),/^USERS:/);
 await page.click('#btn-replay');await page.evaluate(()=>ViewerTracker.__files.pause());assert(!(await roomLabel.isVisible()));assert.equal(await roomLabel.textContent(),'','ordinary Replay clears the file source');
 const ordinaryPicker=page.waitForEvent('filechooser');await replayOpen.click();await(await ordinaryPicker).setFiles(file);
 await page.waitForFunction(()=>ViewerTracker.__files.state().imported);
 assert.equal(await roomLabel.textContent(),'Room: archived_room','ordinary Replay can open a file directly');
 assert.deepEqual((await page.evaluate(()=>ViewerTracker.__files.state())).history,fileBeforeSave.history,'Open leaves the background live session intact');
 await page.click('#playback-return');
 await page.reload();await page.addScriptTag({content:instrument(source)});await page.evaluate(()=>ViewerTracker.__files.init());
 assert.equal(await page.locator('#btn-panel-options').textContent(),'15m ▾');assert.equal((await page.evaluate(()=>ViewerTracker.__files.state())).imported,false,'reload restores only the room session');
 const priorRequests=requests;
 await page.goto('https://tierscope.test/followed-cams/');await page.addScriptTag({content:instrument(source)});await page.evaluate(()=>ViewerTracker.__files.init());
 await page.click('#btn-expand');assert(await save.isDisabled(),'empty directory view has nothing to save');assert(await open.isEnabled());
 const directoryPicker=page.waitForEvent('filechooser');await open.click();await(await directoryPicker).setFiles(file);await page.waitForFunction(()=>ViewerTracker.__files.state().imported);
 assert(await roomLabel.isVisible());assert.equal(await roomLabel.textContent(),'Room: archived_room');
 await page.click('#playback-next');await page.click('#playback-return');assert.equal(requests,priorRequests,'opening a file on a directory page causes no acquisition');
 assert.deepEqual(errors,[]);
 console.log('PASS direct live and Replay Save/Open controls, keyboard access, full replay exports, empty-session availability, file replacement from ordinary/file Replay, background session isolation, long-name and file-action layout, source clearing on exit, all six chart windows, frozen Replay position and unchanged panel geometry');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
