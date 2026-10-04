const {instrument, prepareSource} = require('./helpers/instrument.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const engine=process.env.TIERSCOPE_BROWSER||'chromium';
const source=prepareSource(fs.readFileSync(path.join(__dirname,'../tierscope.user.js'),'utf8')).replaceAll('scheduleInit(2000);','')
 .replace('downloadTrackingReport: downloadTrackingReport,',`
 __stop:{init,scan:performScanThenReturn,draw:drawAllSparklines,
   state:()=>({stopped:isStopped,time:pausedElapsedTime,history:history.timestamps.slice(),reason:stopReason,paused:isPaused,auto:isAutoRefreshOn,epoch:scanEpoch,next:nextScanAt,absencePausedAt,absenceOverrideActive}),
   tick:updateCountdownDisplay,
   away:function(ms){broadcasterAbsence={since:Date.now()-ms,missing:2};resetCountdown();},
   due:function(){nextScanAt=Date.now();},
   expire:function(){broadcasterAbsence={since:Date.now()-ABSENCE_PAUSE_MS-ABSENCE_STOP_MS,missing:2};absencePausedAt=broadcasterAbsence.since+ABSENCE_PAUSE_MS;updateCountdownDisplay();},
   pauseReplay:function(){if(playback&&playback.playing)togglePlayback();}},
 downloadTrackingReport: downloadTrackingReport,`);
(async()=>{
 const browser=await require('playwright')[engine].launch({headless:true,executablePath:process.env.TIERSCOPE_CHROMIUM_PATH,args:JSON.parse(process.env.TIERSCOPE_CHROMIUM_ARGS||'[]')});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:1100},acceptDownloads:true}),errors=[];let requests=0,body='5,testroom|o|f|0,viewer|t|m|0';
  const dialogs=[];let acceptDialog=false;
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>{dialogs.push({type:d.type(),message:d.message()});return acceptDialog?d.accept():d.dismiss();});
  await page.route('https://tierscope.test/**',r=>{
   if(r.request().url().includes('/api/')){requests++;return r.fulfill({body});}
   return r.fulfill({contentType:'text/html',body:'<!doctype html><html><body style="background:#303846"></body></html>'});
  });
  await page.addInitScript(()=>{
   window.GM_listValues=()=>Object.keys(localStorage);window.GM_getValue=(k,d)=>localStorage.getItem(k)===null?d:JSON.parse(localStorage.getItem(k));
   window.GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));window.GM_deleteValue=k=>localStorage.removeItem(k);
  });
  await page.goto('https://tierscope.test/testroom/');await page.addScriptTag({content:instrument(source)});await page.evaluate(()=>ViewerTracker.__stop.init());
  await page.waitForFunction(()=>ViewerTracker.__stop.state().history.length===1);await page.waitForTimeout(350);
  const panel=page.locator('#tracker-container'),before=await panel.boundingBox();
  const controls=await page.locator('#control-field').boundingBox();
  for(const id of ['btn-replay','btn-control-library','btn-control-stop','control-next-scan']){
   const r=await page.locator('#'+id).boundingBox();assert(r.x>=controls.x&&r.x+r.width<=controls.x+controls.width);
  }
  for(const row of [['btn-replay','btn-control-library'],['btn-control-auto','btn-control-stop','btn-main-reset']]){
   const boxes=await Promise.all(row.map(id=>page.locator('#'+id).boundingBox()));
   boxes.slice(1).forEach((r,i)=>{assert(r.x>=boxes[i].x+boxes[i].width,'buttons do not overlap');assert(Math.abs(r.y-boxes[i].y)<1,'buttons stay on one row: '+JSON.stringify({row,boxes}));});
  }
  const frozen=await page.locator('#spark-light-blue').evaluate(c=>c.toDataURL());
  const running=await page.evaluate(()=>ViewerTracker.__stop.state());
  await page.getByRole('button',{name:'Stop this session'}).click();
  assert.deepEqual(dialogs,[{type:'confirm',message:'Stop this session?\n\nHistory will remain available for Replay and downloads, but this session cannot be resumed. Starting again begins a new session.'}]);
  assert.deepEqual(await page.evaluate(()=>ViewerTracker.__stop.state()),running,'Cancel preserves history, scanning, pause state and the next scan deadline');
  assert(await page.locator('#btn-control-stop').isEnabled());
  assert.equal(await page.locator('#spark-light-blue').evaluate(c=>c.toDataURL()),frozen);
  acceptDialog=true;
  await page.getByRole('button',{name:'Stop this session'}).click();
  assert.equal(dialogs.length,2);assert.deepEqual(dialogs[1],dialogs[0]);
  assert.equal(await page.locator('#control-next-scan').textContent(),'Stopped');assert.equal(await page.locator('#btn-control-auto').textContent(),'Start');
  assert.match(await page.locator('#header-text').textContent(),/^STOPPED:/);assert(await page.locator('#btn-control-stop').isDisabled());
  assert.deepEqual(await panel.boundingBox(),before,'Stop adds no panel height');
  const stopped=await page.evaluate(()=>ViewerTracker.__stop.state()),n=requests;
  await page.evaluate(()=>ViewerTracker.__stop.tick());await page.evaluate(()=>ViewerTracker.__stop.scan());await page.evaluate(()=>ViewerTracker.__stop.draw());
  assert.equal(requests,n);assert.deepEqual(await page.evaluate(()=>ViewerTracker.__stop.state()),stopped);
  assert.equal(await page.locator('#spark-light-blue').evaluate(c=>c.toDataURL()),frozen,'stopped chart keeps exactly the same pixels');
  await page.click('#btn-replay');await page.evaluate(()=>ViewerTracker.__stop.pauseReplay());await page.click('#btn-playback-library');assert(await page.locator('#btn-export-gif').isVisible());await page.click('#playback-return');
  assert.match(await page.locator('#header-text').textContent(),/^STOPPED:/);
  const downloadPromise=page.waitForEvent('download');await page.click('#tools-export-csv');const download=await downloadPromise;assert(download.suggestedFilename().endsWith('.csv'));
  await page.reload();await page.addScriptTag({content:instrument(source)});await page.evaluate(()=>ViewerTracker.__stop.init());
  assert.equal(requests,n);assert((await page.evaluate(()=>ViewerTracker.__stop.state())).stopped);
  await page.getByRole('button',{name:'Start a new session'}).click();
  assert.equal(dialogs.length,3);assert.equal(dialogs[2].type,'confirm');assert.match(dialogs[2].message,/^Start a new session\?/);
  await page.waitForFunction(()=>!ViewerTracker.__stop.state().stopped&&ViewerTracker.__stop.state().history.length===1);
  assert.equal(requests,n+1);assert((await page.evaluate(()=>ViewerTracker.__stop.state())).history[0]>stopped.history[0]);
  body='5,viewer|t|m|0';await page.evaluate(()=>ViewerTracker.__stop.scan());await page.evaluate(()=>ViewerTracker.__stop.scan());
  await page.evaluate(()=>ViewerTracker.__stop.away(11*60000));assert.match(await page.locator('#control-next-scan').textContent(),/Reduced: 300s/);
  const reduced=await page.locator('#control-next-scan').boundingBox();const sessionButtons=await page.locator('#control-session-buttons').boundingBox();assert(reduced.x>=sessionButtons.x+sessionButtons.width,'reduced countdown fits beside session buttons');
  const beforeAbsencePause=await panel.boundingBox();
  await page.evaluate(()=>ViewerTracker.__stop.away(15*60000));
  await page.waitForFunction(()=>ViewerTracker.__stop.state().paused);
  const autoPaused=await page.evaluate(()=>ViewerTracker.__stop.state());assert.equal(autoPaused.auto,true);assert.equal(autoPaused.stopped,false);
  assert.match(await page.locator('#acquisition-status').textContent(),/Auto-paused/);assert.equal(await page.locator('#btn-control-auto').getAttribute('aria-label'),'Resume recording');
  const pausedChart=await page.locator('#spark-light-blue').evaluate(c=>c.toDataURL());
  await page.evaluate(()=>ViewerTracker.__stop.scan());assert.deepEqual((await page.evaluate(()=>ViewerTracker.__stop.state())).history,autoPaused.history);
  assert.equal((await page.evaluate(()=>ViewerTracker.__stop.state())).time,autoPaused.time);
  assert.equal(await page.locator('#spark-light-blue').evaluate(c=>c.toDataURL()),pausedChart);
  const checkBox=await page.locator('#control-next-scan').boundingBox();assert(checkBox.x>=sessionButtons.x+sessionButtons.width,'presence countdown fits');
  assert.deepEqual(await panel.boundingBox(),beforeAbsencePause,'automatic pause adds no panel height');
  if(process.env.TIERSCOPE_STOP_SHOT)await panel.screenshot({path:process.env.TIERSCOPE_STOP_SHOT});
  // Return checks must continue behind FILE REPLAY without changing its frame.
  await page.click('#btn-control-library');const exported=page.waitForEvent('download');await page.click('#tools-save-session');
  const archive=JSON.parse(fs.readFileSync(await(await exported).path(),'utf8'));archive.room='different_archive';
  await page.locator('#session-file-input').setInputFiles({name:'absence.tierscope.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(archive))});
  await page.waitForFunction(()=>document.getElementById('playback-room').textContent==='Room: different_archive');
  const replayHeader=await page.locator('#header-text').textContent(),replayPosition=await page.locator('#playback-position').textContent();
  body='5,testroom|o|f|0,viewer|t|m|0';await page.evaluate(()=>ViewerTracker.__stop.due());
  await page.waitForFunction(()=>!ViewerTracker.__stop.state().paused);
  assert.equal((await page.evaluate(()=>ViewerTracker.__stop.state())).history.length,autoPaused.history.length+1);
  assert.equal(await page.locator('#header-text').textContent(),replayHeader);assert.equal(await page.locator('#playback-position').textContent(),replayPosition);
  assert.equal(await page.locator('#playback-room').textContent(),'Room: different_archive');await page.click('#playback-return');
  body='5,viewer|t|m|0';await page.evaluate(()=>ViewerTracker.__stop.away(15*60000));await page.evaluate(()=>ViewerTracker.__stop.scan());
  await page.reload();await page.addScriptTag({content:instrument(source)});await page.evaluate(()=>ViewerTracker.__stop.init());
  await page.waitForFunction(()=>ViewerTracker.__stop.state().paused);assert.equal((await page.evaluate(()=>ViewerTracker.__stop.state())).auto,true);
  assert.equal(await page.locator('#btn-control-auto').getAttribute('aria-label'),'Resume recording');
  const beforeOverride=await page.evaluate(()=>ViewerTracker.__stop.state());
  await page.getByRole('button',{name:'Resume recording',exact:true}).click();
  await page.waitForFunction(n=>{const s=ViewerTracker.__stop.state();return !s.paused&&s.auto&&s.absenceOverrideActive&&s.history.length===n+1;},beforeOverride.history.length);
  assert.equal((await page.evaluate(()=>ViewerTracker.__stop.state())).absencePausedAt,null);
  assert.equal(await page.locator('#btn-control-auto').getAttribute('aria-label'),'Pause scans');
  assert.equal(dialogs.length,3,'Resume is a one-click override with no prompt');
  await page.reload();await page.addScriptTag({content:instrument(source)});await page.evaluate(()=>ViewerTracker.__stop.init());
  await page.waitForFunction(()=>{const s=ViewerTracker.__stop.state();return s.auto&&!s.paused&&s.absenceOverrideActive;});
  await page.evaluate(()=>ViewerTracker.__stop.away(4*60*60000));
  const overridden=await page.evaluate(()=>ViewerTracker.__stop.state());
  assert.equal(overridden.stopped,false);assert.equal(overridden.paused,false);assert(overridden.absenceOverrideActive);
  assert.doesNotMatch(await page.locator('#control-next-scan').textContent(),/Reduced|Stopped|Check/);
  body='5,testroom|o|f|0,viewer|t|m|0';await page.evaluate(()=>ViewerTracker.__stop.scan());
  await page.waitForFunction(()=>!ViewerTracker.__stop.state().absenceOverrideActive);
  body='5,viewer|t|m|0';await page.evaluate(()=>ViewerTracker.__stop.away(15*60000));
  await page.waitForFunction(()=>ViewerTracker.__stop.state().paused);
  await page.evaluate(()=>ViewerTracker.__stop.expire());assert.equal((await page.evaluate(()=>ViewerTracker.__stop.state())).reason,'absence');
  assert.equal(dialogs.length,3,'automatic three-hour Stop requires no confirmation');
  assert.equal(await page.locator('#control-next-scan').textContent(),'Stopped');assert.deepEqual(errors,[]);
  console.log('PASS manual Stop confirmation/Cancel, Stop layout, frozen time/chart, disabled scanning, retained Replay/CSV, reload, separate Start, 15m absence pause, frozen samples/time, background return checks behind FILE REPLAY, auto-resume, paused reload, one-click Resume override and restored override, re-arming on owner return and automatic Stop without a prompt');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
