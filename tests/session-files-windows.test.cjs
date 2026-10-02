const test=require('node:test'),assert=require('node:assert/strict');
const {harness,source}=require('./helpers/harness.cjs');
const injected=source.replace('downloadTrackingReport: downloadTrackingReport,',`
 __files:{captureSessionFile,validateSessionFile,downloadSessionFile,openSessionReplay,readSessionFile,setChartWindow,windows:CHART_WINDOWS,
  state:()=>({window:chartWindowMode,playback:playback&&{imported:playback.imported===true,archive:playback.archive,
   index:getPlaybackSampleIndex(playback.snapshot,playback.positionMs,playback.stepIndex),playing:playback.playing}})},
 downloadTrackingReport: downloadTrackingReport,`);
const clean=x=>JSON.parse(JSON.stringify(x));
function fresh(storage){const h=harness(storage,injected);h.t.initPanel();return h;}
function populated(){
 const h=fresh();h.t.startTrackingTimer();h.t.sample(3);h.t.updateDisplay();h.advance(60*60000);h.t.pauseTrackingTimer();
 h.advance(20*60000);h.t.startTrackingTimer();h.t.sample(5);h.t.updateDisplay();h.advance(60000);h.t.sample(4);h.t.updateDisplay();h.t.saveSession('testroom');return h;
}
function live(h){const state=clean(h.t.state());delete state.presentationMode;return state;}
function fileOf(data){const text=JSON.stringify(data);return {size:Buffer.byteLength(text),text:async()=>text};}

test('session download round-trips full history, gaps, timing, highs and room despite a narrow chart window',async()=>{
 const h=populated(),f=h.api.__files;f.setChartWindow('quarter');
 const state=live(h);f.downloadSessionFile();
 const raw=await h.blobs.get(h.downloads.at(-1)).text(),archive=JSON.parse(raw);
 assert.equal(archive.format,'TierScopeSession');assert.equal(archive.formatVersion,1);assert.equal(archive.room,'testroom');
 assert.deepEqual(archive.session.history,state.history);assert.equal(archive.session.history.timestamps.length,3);
 assert.deepEqual(archive.session.history.breaks,[false,true,false]);assert.equal(archive.session.pausedElapsedTime,61*60000);
 assert.equal(archive.session.sessionStartedAt,state.history.timestamps[0]);assert.equal(archive.session.sessionHighs.red.value,5);
 assert.deepEqual(clean(f.validateSessionFile(archive)),archive);assert.deepEqual(live(h),state);
});

test('a session file survives more than three hours and retains highs outside the rolling history',()=>{
 const h=populated(),f=h.api.__files,archive=clean(f.captureSessionFile());
 archive.session.sessionHighs.red={value:999,time:archive.session.history.timestamps[0]-60000};
 archive.session.roomTotalHigh=999;archive.session.roomTotalHighTime=archive.session.sessionHighs.red.time;
 h.advance(7*86400000);const before=live(h),saved=clean([...h.storage]);
 assert(f.openSessionReplay(archive));assert.equal(f.state().playback.archive.session.sessionHighs.red.value,999);
 assert.equal(h.e('high-red').textContent,'H:3','Replay highs remain limited to samples through its frame');
 assert.deepEqual(live(h),before);assert.deepEqual(clean([...h.storage]),saved);
 h.t.leavePlayback(true);assert.deepEqual(live(h),before);
});

test('unknown file fields and obsolete username collections are discarded without execution or re-export',()=>{
 const h=populated(),f=h.api.__files,archive=clean(f.captureSessionFile());
 archive.session.sessionUniqueUsers={private_name:true};archive.session.history.extra=['private_name'];archive.code='alert(1)';
 const canonical=f.validateSessionFile(archive);assert(!JSON.stringify(canonical).includes('private_name'));assert(!('code' in canonical));
 assert.throws(()=>f.validateSessionFile({...archive,room:'<img src=x onerror=alert(1)>'}));
});

test('invalid, empty, oversized and future-version files preserve the current Replay and live state',async()=>{
 const h=populated(),f=h.api.__files,archive=clean(f.captureSessionFile());f.openSessionReplay(archive);h.t.stepPlayback(1);
 const before=JSON.stringify(f.state()),state=live(h),saved=clean([...h.storage]);
 const cases=[a=>a.formatVersion=999,a=>a.session.history.red.pop(),a=>a.session.history.red[0]=-1,
  a=>a.session.history.red[0]=1.5,a=>a.session.history.red[0]=null,a=>a.session.history.breaks[0]='yes',
  a=>a.session.sessionHighs.red.value=0,a=>a.session.roomTotalHigh=0,a=>delete a.session.pausedElapsedTime,
  a=>a.session.history.timestamps=Array(10001).fill(0),a=>a.session.history.timestamps=[]];
 for(const mutate of cases){const a=clean(archive);mutate(a);assert.equal(await f.readSessionFile(fileOf(a)),false);assert.equal(JSON.stringify(f.state()),before);}
 assert.equal(await f.readSessionFile({size:2,text:async()=>'{!'}),false);
 let read=false;assert.equal(await f.readSessionFile({size:8*1024*1024+1,text:async()=>{read=true;return '{}'}}),false);assert.equal(read,false);
 assert.deepEqual(live(h),state);assert.deepEqual(clean([...h.storage]),saved);assert.equal(JSON.stringify(f.state()),before);
});

test('live scans continue behind imported Replay; closing returns to the latest room data',async()=>{
 const h=populated(),f=h.api.__files,archive=clean(f.captureSessionFile());archive.room='anotherroom';f.openSessionReplay(archive);h.t.stepPlayback(1);
 const replay=JSON.stringify(f.state().playback);assert.match(h.e('header-text').textContent,/^FILE:/);
 assert.equal(h.e('playback-room').textContent,'Room: anotherroom');assert.equal(h.e('playback-room').style.display,'block');
 h.advance(60000);h.setResponse('5,testroom|o|f|0,viewer|t|m|0');await h.t.performScanThenReturn();
 assert.equal(h.t.state().history.timestamps.length,4);assert.equal(JSON.stringify(f.state().playback),replay);
 assert.match(h.e('header-text').textContent,/^FILE:/);assert.equal(h.e('playback-room').textContent,'Room: anotherroom');
 const replacement=clean(archive);replacement.room='different_archive';f.openSessionReplay(replacement);
 assert.equal(h.e('playback-room').textContent,'Room: different_archive');
 h.t.leavePlayback(true);assert.match(h.e('header-text').textContent,/^USERS:/);
 assert.equal(h.t.state().users.length,2);assert.equal(h.t.state().isAutoRefreshOn,true);
 assert(h.t.enterPlayback());assert.equal(h.e('playback-room').textContent,'');assert.equal(h.e('playback-room').style.display,'none');
});

test('exporting a normal Replay preserves its entry snapshot after new scans',async()=>{
 const h=populated(),f=h.api.__files;assert(h.t.enterPlayback());const original=JSON.stringify(f.captureSessionFile());
 h.advance(60000);h.t.sample(6);f.setChartWindow('quarter');h.t.stepPlayback(1);
 assert.equal(JSON.stringify(f.captureSessionFile()),original);f.downloadSessionFile();
 assert.equal(await h.blobs.get(h.downloads.at(-1)).text(),original);
});

test('pause, reload, failed acquisition, Stop, file Replay and close preserve session closure and timing',async()=>{
 const first=populated();first.t.toggleAutoRefresh();const elapsed=first.t.state().pausedElapsedTime;
 const h=fresh(first.storage),f=h.api.__files;assert.equal(h.t.state().isPaused,true);
 h.setResponse(new Error('fixture network unavailable'));await h.t.performScanThenReturn();
 const samples=h.t.state().history.timestamps.length;h.t.stopTracking('manual');const archived=f.captureSessionFile();
 assert.equal(archived.session.pausedElapsedTime,elapsed);assert.equal(archived.session.isStopped,true);
 f.openSessionReplay(archived);f.setChartWindow('hour');h.t.stepPlayback(1);h.t.leavePlayback(true);
 assert.equal(h.t.state().isStopped,true);assert.equal(h.t.state().pausedElapsedTime,elapsed);assert.equal(h.t.state().history.timestamps.length,samples);
 assert.match(h.e('header-text').textContent,/^STOPPED:/);assert.equal(h.e('btn-control-auto').innerHTML,'Start');
});

test('Reset, navigation, closing Replay and a newer file cancel an older asynchronous file read',async()=>{
 for(const action of ['reset','navigate','close','newer']){
  const h=populated(),f=h.api.__files,archive=clean(f.captureSessionFile());let resolve;
  const pending=f.readSessionFile({size:100,text:()=>new Promise(r=>resolve=r)});
  if(action==='reset')h.t.resetAllTracking();
  if(action==='navigate'){h.context.location=new URL('https://chaturbate.com/otherroom/');h.t.checkUrlChange();}
  if(action==='close')h.t.leavePlayback(true);
  if(action==='newer'){const next=clean(archive);next.room='newerfile';assert(await f.readSessionFile(fileOf(next)));}
  resolve(JSON.stringify(archive));assert.equal(await pending,false);
  assert.equal(f.state().playback&&f.state().playback.archive.room,action==='newer'?'newerfile':null);
 }
});

test('Stop during an in-flight scan cannot append into live history or an imported Replay',async()=>{
 const h=populated(),f=h.api.__files,archive=clean(f.captureSessionFile());let resolve;
 h.setResponse(()=>new Promise(r=>resolve=r));const pending=h.t.performScanThenReturn();await h.drain();
 f.openSessionReplay(archive);h.t.stepPlayback(1);const replay=JSON.stringify(f.state().playback);
 h.t.stopTracking('manual');const stopped=live(h);
 resolve({ok:true,text:async()=> '5,testroom|o|f|0,viewer|t|m|0'});await pending;
 assert.deepEqual(live(h),stopped);assert.equal(JSON.stringify(f.state().playback),replay);
 h.t.leavePlayback(true);assert.match(h.e('header-text').textContent,/^STOPPED:/);
});

test('chart windows retain all stored samples and use only samples through the Replay frame',()=>{
 const h=fresh(),times=Array.from({length:361},(_,i)=>i*60000),values=times.map((_,i)=>i);values[0]=900;
 const full=h.t.buildChartPlot(values,times,[],100);assert.equal(full.max,900);assert.equal(full.start,0);
 for(const [mode,minutes]of [['fourHours',240],['twoHours',120],['hour',60],['halfHour',30],['quarter',15]]){
  const duration=h.api.__files.windows[mode];assert.equal(duration,minutes*60000);
  const plot=h.t.buildChartPlot(values,times,[],100,undefined,duration);assert.equal(plot.start,360-minutes);assert.equal(plot.min,360-minutes);assert.equal(plot.max,360);assert.equal(plot.points[0].x,0);
  const replay=h.t.buildChartPlot(values,times,[],100,300,duration);assert.equal(replay.start,300-minutes);assert.equal(replay.end,300);assert.equal(replay.max,300);
 }
 const replay=h.t.buildChartPlot(values,times,[],100,80,15*60000);assert.equal(replay.start,65);assert.equal(replay.end,80);assert.equal(replay.max,80);
 const gap=h.t.buildChartPlot([3,10],[0,60*60000],[false,true],100,1,15*60000);
 assert.equal(gap.start,1);assert(gap.points[0].x<0);assert.equal(gap.points[1].move,true);assert.equal(gap.points[1].x,100);
 assert.equal(times.length,361);assert.equal(values[0],900);
});

test('full history defaults, window preferences survive reload and Reset, invalid preferences fall back safely',()=>{
 const h=populated(),f=h.api.__files;assert.equal(f.state().window,'full');f.setChartWindow('quarter');
 const restored=fresh(h.storage);assert.equal(restored.api.__files.state().window,'quarter');restored.t.resetAllTracking();assert.equal(restored.api.__files.state().window,'quarter');
 for(const mode of ['fourHours','twoHours','halfHour']){restored.api.__files.setChartWindow(mode);assert.equal(fresh(h.storage).api.__files.state().window,mode);}
 f.setChartWindow('invalid');assert.equal(f.state().window,'quarter');
 h.storage.set('tierscope:ui:chartWindow:v1','invalid');assert.equal(fresh(h.storage).api.__files.state().window,'full');
});
