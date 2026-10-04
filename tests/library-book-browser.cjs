const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {GifReader}=require('omggif');
const {instrument,prepareSource}=require('./helpers/instrument.cjs');
const engine=process.env.TIERSCOPE_BROWSER||'chromium';
const source=prepareSource(fs.readFileSync(path.join(__dirname,'../tierscope.user.js'),'utf8')).replaceAll('scheduleInit(2000);','').replace('downloadTrackingReport: downloadTrackingReport,',`
 __book:{setup(){loadSession(getModelName());const now=Date.now(),h={timestamps:[now-240000,now-180000,now-60000,now],breaks:[false,false,true,false]};
 STORAGE_HISTORY_SERIES.forEach((k,i)=>h[k]=[3+i,7+i,4+i,9+i]);h.total=[32,49,42,57];h.withTokens=[21,31,25,40];h.anonymous=[50,70,66,81];
 restoreSessionState(normalizeStoredSession({timestamp:now,history:h,isPaused:true}));isAutoRefreshOn=false;isMinimized=true;createPanel();toggleView();collapsedRows=new Set();applyRowLayout();repaintLivePresentation();
 const a=captureSessionFile();['another_model','broadcaster_name'].forEach(room=>keepSessionInLibrary({...a,room}));},
 state:()=>({history:JSON.stringify(history),paused:isPaused,playback:playback&&{room:playback.archive.room,position:playback.positionMs}}),
 scale:applyScale,archive:captureSessionFile,library:readSessionLibrary,pause:()=>{if(playback&&playback.playing)togglePlayback();}},
 downloadTrackingReport: downloadTrackingReport,`);
async function download(page,action){const [d]=await Promise.all([page.waitForEvent('download'),action()]);return {name:d.suggestedFilename(),bytes:fs.readFileSync(await d.path())};}
(async()=>{
 const browser=await require('playwright')[engine].launch({headless:true,executablePath:process.env.TIERSCOPE_CHROMIUM_PATH,args:JSON.parse(process.env.TIERSCOPE_CHROMIUM_ARGS||'[]')});
 try{
 const page=await browser.newPage({viewport:{width:1100,height:850},acceptDownloads:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://tierscope.test/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body style="background:#252b32"></body>'}));
 await page.goto('https://tierscope.test/testroom/');
 await page.evaluate(()=>{window.store=new Map();window.GM_getValue=(k,d)=>store.has(k)?store.get(k):d;window.GM_setValue=(k,v)=>store.set(k,v);window.GM_listValues=()=>[...store.keys()];window.GM_deleteValue=k=>store.delete(k);});
 await page.addScriptTag({content:instrument(source)});await page.evaluate(()=>ViewerTracker.__book.setup());await page.waitForTimeout(350);
 const panel=page.locator('#tracker-container'),library=page.locator('#tierscope-session-tools'),bounds=await panel.boundingBox(),live=await page.evaluate(()=>ViewerTracker.__book.state());
 assert.deepEqual(await page.locator('#control-session-buttons button').allTextContents(),['Library','Replay']);
 await page.click('#btn-control-library');await page.waitForTimeout(100);
 const dock=await library.boundingBox();assert(Math.abs(dock.x+dock.width-bounds.x-1)<1);assert.equal(dock.y,bounds.y);assert.equal(dock.height,bounds.height);
 assert.equal(await library.getAttribute('aria-modal'),'false');assert.equal(await library.getAttribute('data-layout'),'docked');
 assert.equal(await page.locator('#btn-control-library').getAttribute('aria-expanded'),'true');
 await page.uncheck('#dark-mode-toggle');await page.waitForFunction(()=>document.getElementById('tierscope-session-tools').dataset.theme==='bright');
 assert.equal(await library.evaluate(e=>getComputedStyle(e).getPropertyValue('--panel-solid')),await panel.evaluate(e=>getComputedStyle(e).getPropertyValue('--panel-solid')));
 await page.check('#dark-mode-toggle');
 await page.click('#tools-folder-another_model');await page.locator('.tools-row summary').click();
 const row=page.locator('.tools-row'),saved=await page.evaluate(()=>ViewerTracker.__book.library().entries.find(e=>e.archive.room==='another_model').archive);
 for(const format of ['TXT','CSV','Save file']){
  const d=await download(page,()=>row.getByRole('button',{name:format,exact:true}).click());assert(d.name.startsWith('another_model-'));
  if(format==='TXT')assert.match(d.bytes.toString(),/Model: another_model/);
  if(format==='CSV'){const lines=d.bytes.toString().trim().split('\r\n');assert.equal(lines.length,5);assert(lines.slice(1).every(line=>line.startsWith('"another_model",')));}
  if(format==='Save file')assert.deepEqual(JSON.parse(d.bytes),saved);
 }
 const gif=await download(page,()=>row.getByRole('button',{name:'GIF',exact:true}).click());assert(gif.name.startsWith('another_model-'));assert.equal(new GifReader(gif.bytes).numFrames(),4);
 assert.deepEqual(await page.evaluate(()=>ViewerTracker.__book.state()),live,'stored exports do not open replay or change live data');
 // A current GIF captures the whole current session without starting replay.
 const liveGif=await download(page,()=>page.click('#btn-export-gif'));assert(liveGif.name.startsWith('testroom-'));
 assert.deepEqual(await page.evaluate(()=>ViewerTracker.__book.state()),live);
 // A slow file read must not replace a recording selected afterward.
 await page.evaluate(()=>{const read=File.prototype.text;window.restoreRead=()=>{File.prototype.text=read;};File.prototype.text=function(){return read.call(this).then(text=>new Promise(resolve=>{window.finishRead=()=>resolve(text);}));};});
 const picker=page.waitForEvent('filechooser');await page.click('#tools-open-session');
 await(await picker).setFiles({name:'delayed.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...saved,room:'late_file'}))});
 await page.waitForFunction(()=>typeof window.finishRead==='function');
 await row.getByRole('button',{name:'Replay',exact:true}).click();assert.equal(await library.count(),1);assert.equal(await page.locator('#tools-current-room').textContent(),'another_model');
 await page.evaluate(async()=>{window.restoreRead();window.finishRead();await new Promise(resolve=>setTimeout(resolve,0));});
 assert.equal((await page.evaluate(()=>ViewerTracker.__book.state())).playback.room,'another_model','a late file cannot replace a newer replay selection');
 await page.click('#tools-close');assert.equal(await page.evaluate(()=>document.activeElement.id),'btn-playback-library','closing after live-to-file switches focus to the visible Library button');await page.click('#btn-playback-library');
 await page.click('#playback-next');const replay=await page.evaluate(()=>ViewerTracker.__book.state());
 const full=await download(page,()=>page.click('#tools-export-csv'));assert.equal(full.bytes.toString().trim().split('\r\n').length,5);
 assert.deepEqual(await page.evaluate(()=>ViewerTracker.__book.state()),replay,'exports preserve replay cursor');
 await page.click('#playback-return');assert.equal(await page.locator('#tools-current-room').textContent(),'testroom');
 await page.click('#tools-close');assert.deepEqual(await panel.boundingBox(),bounds);assert.equal(await page.locator('#btn-control-library').getAttribute('aria-expanded'),'false');
 let cancelledDownloads=0;const countDownload=()=>cancelledDownloads++;page.on('download',countDownload);
 await page.click('#btn-control-library');await page.evaluate(()=>{document.getElementById('btn-export-gif').click();document.getElementById('tools-close').click();});await page.waitForTimeout(200);assert.equal(cancelledDownloads,0,'closing the library cancels an in-progress export');page.off('download',countDownload);
 // Borrow room only while open; never save that temporary shift.
 await panel.evaluate(e=>{e.style.left='30px';e.style.top='80px';e.style.right='auto';});
 const left=await panel.boundingBox(),geometry=await page.evaluate(()=>GM_getValue('tierscope:ui:geometry:v1',null));
 await page.click('#btn-control-library');await page.waitForTimeout(100);assert((await panel.boundingBox()).x>left.x);
 await page.click('#tools-close');assert.deepEqual(await panel.boundingBox(),left);assert.equal(await page.evaluate(()=>GM_getValue('tierscope:ui:geometry:v1',null)),geometry);
 // The left page follows scale, drag and the viewport, while explicit user moves persist.
 await page.click('#btn-control-library');await page.evaluate(()=>ViewerTracker.__book.scale(1.2));await page.waitForTimeout(150);
 assert.equal(Math.round((await library.boundingBox()).width),444);
 const header=await page.locator('#drag-handle').boundingBox();await page.mouse.move(header.x+40,header.y+12);await page.mouse.down();await page.mouse.move(header.x+100,header.y+42,{steps:5});await page.mouse.up();await page.waitForTimeout(100);
 const moved=await panel.boundingBox(),movedDock=await library.boundingBox();assert(Math.abs(movedDock.x+movedDock.width-moved.x-1)<1);
 await page.click('#tools-close');assert.deepEqual(await panel.boundingBox(),moved,'closing keeps deliberate moves');
 await page.click('#btn-control-library');await page.setViewportSize({width:380,height:740});await page.waitForTimeout(200);
 assert.equal(await library.getAttribute('data-layout'),'sheet');const small=await library.boundingBox();assert(small.x>=0&&small.x+small.width<=380&&small.y+small.height<=740);
 assert(await library.evaluate(e=>e.scrollWidth<=e.clientWidth+1));assert(await page.locator('#tools-close').isVisible());
 await page.keyboard.press('Escape');assert.equal(await library.count(),0);
 await page.setViewportSize({width:1100,height:850});await page.waitForTimeout(150);assert.equal(await panel.getAttribute('data-library-open'),null,'observers do not redock after closing');
 assert.deepEqual(errors,[]);
 console.log('PASS book docking, temporary positioning, drag/scale/theme/narrow screen and cleanup; nonmodal controls; full current/stored TXT/CSV/JSON/GIF exports with live/replay isolation');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
