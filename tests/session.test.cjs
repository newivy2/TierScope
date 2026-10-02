const test = require('node:test');
const assert = require('node:assert/strict');
const {harness} = require('./helpers/harness.cjs');
const key = 'tierscope:v1:testroom';
const clean = value => JSON.parse(JSON.stringify(value));
function record(h, count=3) {
  const now=h.context.Date.now();
  const history={timestamps:Array.from({length:count},(_,i)=>now-(count-i)*60000)};
  for(const k of ['red','green','purple','pink','dark-blue','light-blue','gray','female-trans','withTokens','total','anonymous']) history[k]=Array(count).fill(1);
  return {timestamp:now,history,isPaused:true,trackingStartTime:now-count*60000,pausedElapsedTime:count*60000};
}
function saved(h){return JSON.parse(h.t.readSavedSession(key));}

test('pause/resume preserves session start and wall-time high offsets while timer excludes pauses', async()=>{
  const h=harness();h.t.loadSession('testroom');h.t.startTrackingTimer();
  const start=h.t.highState().sessionStartedAt;
  h.advance(5*60000);h.t.sample(3);
  h.advance(5*60000);h.t.pauseTrackingTimer();
  h.advance(60*60000);h.t.startTrackingTimer();
  assert.equal(h.t.highState().sessionStartedAt,start);
  assert.equal(h.context.Date.now()-h.t.state().trackingStartTime,10*60000);
  h.advance(2*60000);h.t.pauseTrackingTimer();
  assert.equal(h.t.state().pausedElapsedTime,12*60000);
  assert.match(await h.report(),/00:05:00 into session/);
  const reload=harness(h.storage);assert.equal(reload.t.loadSession('testroom'),true);
  assert.equal(reload.t.highState().sessionStartedAt,start);
  assert.equal(reload.t.state().pausedElapsedTime,12*60000);
});

test('tier and total highs survive history eviction, ties, lower samples, and reload',()=>{
  const h=harness();const data=record(h,10000);data.history.red[0]=100;data.history.total[0]=100;data.history.withTokens[0]=100;
  h.t.seed(data);const peak=data.history.timestamps[0];
  h.t.sample(1);assert.equal(h.t.state().history.timestamps.length,10000);
  assert.equal(Math.max(...h.t.state().history.red),1);
  for(const k of ['red','total','withTokens']) assert.deepEqual(clean(h.t.getSessionHigh(k,0)),{value:100,time:peak});
  h.t.sample(100);assert.equal(h.t.getSessionHigh('red',0).time,peak);
  h.advance(1000);h.t.sample(101);assert.equal(h.t.getSessionHigh('red',0).time,h.context.Date.now());
  h.t.saveSession('testroom');const reload=harness(h.storage);reload.t.loadSession('testroom');
  assert.deepEqual(clean(reload.t.getSessionHigh('red',0)),clean(h.t.getSessionHigh('red',0)));
  const snapshot=reload.t.createPlaybackSnapshot(reload.t.state().history);
  const frame=reload.t.getPlaybackFrame(snapshot,0);
  assert.equal(frame.highs.red,1,'Replay highs stay limited to the selected historical frame');
});

test('legacy high timestamps are rebuilt from the matching sample; start is explicitly estimated',()=>{
  const h=harness();const data=record(h);data.history.red=[1,4,2];data.tierHighTimes={red:data.history.timestamps[0]-100000};
  h.storage.set(key,JSON.stringify(data));assert.equal(h.t.loadSession('testroom'),true);
  assert.deepEqual(clean(h.t.getSessionHigh('red',0)),{value:4,time:data.history.timestamps[1]});
  assert.equal(h.t.highState().sessionStartEstimated,true);
  h.t.saveSession('testroom');assert.equal(saved(h).schemaVersion,2);
  assert.equal(h.storage.get(key),JSON.stringify(data),'legacy record is not overwritten');
});

test('stale same-room tabs keep independent records and cannot replace the newest accepted sample',()=>{
  const storage=new Map(),a=harness(storage),b=harness(storage);
  a.t.loadSession('testroom');a.t.sample(2);a.t.saveSession('testroom');
  b.t.loadSession('testroom');a.advance(60000);a.t.sample(3);a.t.saveSession('testroom');
  b.advance(120000);b.t.saveSession('testroom');
  assert.equal(saved(b).history.timestamps.length,2);
  assert.equal(saved(b).history.red.at(-1),3);
  assert.equal([...storage.keys()].filter(k=>k.startsWith('tierscope:tab:')).length,2);
  b.t.sample(4);b.t.saveSession('testroom');assert.equal(saved(a).history.red.at(-1),4);
  assert.equal(a.t.state().history.red.at(-1),3,'another tab never silently swaps local history');
});

test('tabs opened before any save also write separate records',()=>{
  const storage=new Map(),a=harness(storage),b=harness(storage);
  a.t.loadSession('testroom');b.t.loadSession('testroom');
  a.t.sample(2);b.advance(1000);b.t.sample(4);
  a.t.saveSession('testroom');b.t.saveSession('testroom');
  assert.equal([...storage.keys()].filter(k=>k.startsWith('tierscope:tab:')).length,2);
  assert.equal(saved(a).history.red.at(-1),4);
});

test('Reset invalidates old tabs and immediately persists a paused, empty session',()=>{
  const storage=new Map(),a=harness(storage),b=harness(storage);a.t.initPanel();
  a.t.toggleAutoRefresh();a.t.sample(2);a.t.saveSession('testroom');b.t.loadSession('testroom');
  a.t.resetAllTracking();b.advance(60000);b.t.sample(7);b.t.saveSession('testroom');
  assert.equal(saved(a).history.timestamps.length,0);assert.equal(saved(a).isPaused,true);
  assert.match(b.t.highState().sessionStorageNotice,/Reset in another tab/);
  assert.equal(b.t.state().history.red.at(-1),7,'local exports remain possible');
  const reload=harness(storage);reload.t.initPanel();assert.equal(reload.t.state().isAutoRefreshOn,false);
  assert.equal(reload.t.highState().sessionStartedAt,null);
});

test('newer schema and malformed records remain untouched while independent saves continue',()=>{
  for(const change of [d=>d.schemaVersion=999,d=>d.history.red=['bad'],d=>d.sessionHighs={red:{value:0,time:null}}]){
    const h=harness();const data=record(h);change(data);const raw=JSON.stringify(data);h.storage.set(key,raw);
    assert.equal(h.t.loadSession('testroom'),false);h.t.startTrackingTimer();assert.equal(h.storage.get(key),raw);
    assert.equal([...h.storage.keys()].filter(k=>k.startsWith('tierscope:tab:')).length,1);
    assert.match(h.t.getStorageReportStatus('testroom').access,/skipped record/);
    h.t.resetAllTracking();assert.equal(saved(h).schemaVersion,2);
  }
});

test('expired tab data is not restored and returning writers rotate record IDs',()=>{
  const h=harness();h.t.loadSession('testroom');h.t.sample(2);h.t.saveSession('testroom');
  const old=[...h.storage.keys()][0];h.advance(4*3600000);assert.equal(h.t.readSavedSession(key),undefined);
  h.t.saveSession('testroom');assert.equal(h.storage.has(old),false);
  assert.equal(saved(h).history.red.at(-1),2);
});

test('saved display remains non-live; failed scan and render rollback retain data and highs',async()=>{
  const h=harness();const data=record(h);h.storage.set(key,JSON.stringify(data));h.t.initPanel();
  assert.match(h.e('header-text').textContent,/^SAVED:/);assert.equal(h.t.state().users.length,0);
  assert.match(await h.report(),/NOT A LIVE SAMPLE/);
  const before=clean(h.t.highState()),history=clean(h.t.state().history);
  h.setResponse(new Error('network failure'));await h.t.performScanThenReturn();
  assert.deepEqual(clean(h.t.state().history),history);
  h.advance(60000);h.setResponse('5,testroom|o|f|0,viewer|t|m|0');
  const spark=h.e('spark-purple'),get=spark.getContext;let once=true;
  spark.getContext=()=>{if(once){once=false;throw new Error('render failure');}return get();};
  await h.t.performScanThenReturn();assert.deepEqual(clean(h.t.highState()),before);
  assert.deepEqual(clean(h.t.state().history),history);assert.match(h.e('header-text').textContent,/^SAVED:/);
  await h.t.performScanThenReturn();assert.equal(h.t.state().restoredDisplayFrame,null);
  assert.match(h.e('header-text').textContent,/^USERS:/);
});

test('a late network response cannot commit after room navigation',async()=>{
  const h=harness();h.t.initPanel();let resolve;
  h.setResponse(()=>new Promise(r=>resolve=r));const pending=h.t.performScanThenReturn();await h.drain();
  h.context.location=new URL('https://chaturbate.com/otherroom/');h.t.checkUrlChange();
  resolve({ok:true,text:async()=> '5,testroom|o|f|0,viewer|t|m|0'});await pending;
  assert.equal(h.t.state().history.timestamps.length,0);assert.equal(h.t.state().lastAcceptedAcquisition,null);
});

test('sample ages use seconds, minutes, hours, days and clamp future timestamps',()=>{
  const h=harness(),now=h.context.Date.now();
  for(const [seconds,label] of [[-5,'0s'],[59,'59s'],[60,'1m'],[3600,'1h'],[7500,'2h 5m'],[176400,'2d 1h']])assert.equal(h.t.formatSampleAge(now-seconds*1000),label);
});

test('restored highlights compare with persistent session highs; Replay still uses historical highs',()=>{
  const h=harness();const data=record(h,10000);data.history.red[0]=100;
  h.t.seed(data);h.t.sample(1);h.t.saveSession('testroom');
  const reload=harness(h.storage);reload.t.loadSession('testroom');
  assert.equal(reload.t.state().restoredDisplayFrame.playbackNewHighTiers.red,undefined);
  const snapshot=reload.t.createPlaybackSnapshot(reload.t.state().history);
  assert.equal(reload.t.getPlaybackFrame(snapshot,0).playbackNewHighTiers.red,true);
});

test('explicit Reset recovers from corrupt per-tab storage without retaining the damaged branch',()=>{
  const h=harness();const corrupt='tierscope:tab:v2:testroom:corrupt';h.storage.set(corrupt,'{broken');
  assert.equal(h.t.loadSession('testroom'),false);h.t.resetAllTracking();
  assert.equal(h.storage.has(corrupt),false);assert.equal(saved(h).schemaVersion,2);
});

test('late scan results cannot resurrect pre-Reset data',async()=>{
  const h=harness();h.t.initPanel();let resolve;
  h.setResponse(()=>new Promise(r=>resolve=r));const pending=h.t.performScanThenReturn();await h.drain();
  h.t.resetAllTracking();resolve({ok:true,text:async()=> '5,testroom|o|f|0,viewer|t|m|0'});await pending;
  assert.equal(h.t.state().history.timestamps.length,0);
  assert.deepEqual(clean(h.t.highState().sessionHighs.red),{value:0,time:null});
});
