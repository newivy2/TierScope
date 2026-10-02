const test=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/harness.cjs');
const present='5,testroom|o|f|0,viewer|t|m|0',absent='5,viewer|t|m|0';
const records=h=>[...h.storage.entries()].filter(([k])=>k.startsWith('tierscope:tab:v2:')).map(([k,v])=>[k,JSON.parse(v)]);
async function ready(){const h=harness();h.t.initPanel();h.t.startTrackingTimer();h.t.startCountdown();h.setResponse(present);await h.t.performScanThenReturn();return h;}

test('Stop freezes elapsed time and history, rejects pending samples, and survives refresh',async()=>{
 const h=await ready();h.advance(15000);let resolve;h.setResponse(()=>new Promise(r=>resolve=r));const pending=h.t.performScanThenReturn();await h.drain();
 const before=JSON.stringify(h.t.state().history);h.t.stopTracking('manual');const stopped=h.t.state();
 assert.equal(stopped.isStopped,true);assert.equal(stopped.isPaused,true);assert.equal(stopped.pausedElapsedTime,15000);assert.equal(stopped.countdownInterval,null);
 resolve({ok:true,text:async()=>absent});await pending;assert.equal(JSON.stringify(h.t.state().history),before);
 h.advance(3600000);h.runTimers(t=>t.ms===1000||t.ms===2002);await h.t.performScanThenReturn();
 assert.equal(h.fetchCount(),2);assert.equal(h.t.state().pausedElapsedTime,15000);assert.equal(h.t.state().nextScanAt,0);
 assert.match(await h.report(),/STOPPED SESSION STATS \(NOT A LIVE SAMPLE\)/);
 const reload=harness(h.storage);reload.advance(3615000);reload.t.init();await reload.drain();
 assert.equal(reload.t.state().isStopped,true);assert.equal(reload.fetchCount(),0);assert.equal(reload.t.state().pausedElapsedTime,15000);
 assert.deepEqual(JSON.parse(JSON.stringify(reload.t.state().history)),JSON.parse(before));assert.match(reload.e('header-text').textContent,/^STOPPED:/);
});

test('Start begins separate history and preserves the stopped source record until cleanup',async()=>{
 const h=await ready();h.advance(1000);h.t.stopTracking('manual');const old=records(h).find(([,v])=>v.isStopped);
 h.context.confirm=()=>false;h.t.startNewSession();assert(h.t.state().isStopped);assert.equal(records(h).length,1);
 h.context.confirm=()=>true;h.t.toggleAutoRefresh();assert.equal(h.t.state().isStopped,false);assert.equal(h.t.state().history.timestamps.length,0);
 h.advance(500);h.runTimers(t=>!t.repeat&&t.ms===500);await h.drain();
 assert.equal(h.t.state().history.timestamps.length,1);assert(h.t.state().history.timestamps[0]>old[1].history.timestamps[0]);
 assert.deepEqual(JSON.parse(h.storage.get(old[0])),old[1]);assert.equal(records(h).length,2);
});

async function autoPaused(){
 const h=await ready();h.setResponse(absent);h.advance(60000);await h.t.performScanThenReturn();
 h.advance(60000);await h.t.performScanThenReturn();h.advance(14*60000);h.t.updateCountdownDisplay();return h;
}

test('absence slows to 2m then 5m; returns before 15m restore the selected interval without gaps',async()=>{
 const h=await ready();h.setResponse(absent);h.advance(60000);await h.t.performScanThenReturn();assert.equal(h.t.getEffectiveScanIntervalSeconds(),60);
 h.advance(60000);await h.t.performScanThenReturn();assert.equal(h.t.getEffectiveScanIntervalSeconds(),120);assert.equal(h.t.state().nextScanAt-h.context.Date.now(),120000);
 for(let i=0;i<5;i++){h.advance(120000);await h.t.performScanThenReturn();}
 assert.equal(h.t.getEffectiveScanIntervalSeconds(),300);assert.equal(h.t.state().isPaused,false);
 h.t.adjustTimer(240);assert.equal(h.t.getEffectiveScanIntervalSeconds(),300);
 h.setResponse(present);h.advance(60000);await h.t.performScanThenReturn();assert.equal(h.t.state().broadcasterAbsence.missing,0);
 assert.equal(h.t.state().history.breaks.at(-1),false);h.t.adjustTimer(-240);assert.equal(h.t.getEffectiveScanIntervalSeconds(),60);
});

test('15m auto-pause freezes time and samples, checks every minute, and resumes with one real sample plus a gap',async()=>{
 const h=await autoPaused(),paused=JSON.parse(JSON.stringify(h.t.state())),before=JSON.stringify(paused.history);
 assert.equal(paused.isPaused,true);assert.equal(paused.isAutoRefreshOn,true);assert.equal(paused.isStopped,false);
 assert.equal(paused.absencePausedAt,paused.broadcasterAbsence.since+15*60000);assert.equal(paused.pausedElapsedTime,16*60000);
 assert.equal(paused.trackingTimerInterval,null);assert.equal(h.t.getEffectiveScanIntervalSeconds(),60);
 assert.match(h.e('control-next-scan').textContent,/^Check:/);assert.equal(h.e('btn-control-auto')['aria-label'],'Resume recording');
 await h.t.performScanThenReturn();assert.equal(JSON.stringify(h.t.state().history),before);
 assert.equal(h.t.state().nextScanAt-h.context.Date.now(),60000);
 h.advance(60000);await h.t.performScanThenReturn();assert.equal(JSON.stringify(h.t.state().history),before);
 assert.equal(h.t.state().pausedElapsedTime,paused.pausedElapsedTime);assert.match(await h.report(),/AUTO-PAUSED STATS/);
 const checks=h.fetchCount();h.setResponse(present);h.advance(59000);h.runTimers(t=>t.repeat&&t.ms===1000);await h.drain();
 assert.equal(h.fetchCount(),checks,'no return check before the minute completes');
 h.advance(1000);h.runTimers(t=>t.repeat&&t.ms===1000);await h.drain();
 assert.equal(h.fetchCount(),checks+1,'scheduler performs a return check');assert.equal(h.t.state().isPaused,false);
 assert.equal(h.t.state().absencePausedAt,null);assert.equal(h.t.state().broadcasterAbsence.missing,0);
 assert.equal(h.t.state().history.timestamps.length,paused.history.timestamps.length+1);
 assert.equal(h.t.state().history.breaks.at(-1),true);assert.equal(h.t.state().nextScanAt-h.context.Date.now(),60000);
 assert.equal(h.context.Date.now()-h.t.state().trackingStartTime,paused.pausedElapsedTime,'auto-pause is excluded from active time');
});

test('three hours AFTER auto-pause seals history and rejects a pending returning-owner response',async()=>{
 const h=await autoPaused();await h.t.performScanThenReturn();const paused=h.t.state(),deadline=paused.absencePausedAt+3*3600000;
 h.advance(3*3600000-1);let resolve;h.setResponse(()=>new Promise(r=>resolve=r));const pending=h.t.performScanThenReturn();await h.drain();
 assert.equal(h.t.state().isStopped,false);const before=JSON.stringify(h.t.state().history);
 h.advance(1);h.t.updateCountdownDisplay();assert(h.t.state().isStopped);assert.equal(h.t.state().stopReason,'absence');
 assert.equal(h.t.state().stoppedAt,deadline);resolve({ok:true,text:async()=>present});await pending;
 assert.equal(JSON.stringify(h.t.state().history),before);assert.equal(h.t.state().isAutoRefreshOn,false);
 assert.equal(h.t.state().pausedElapsedTime,paused.pausedElapsedTime);
 const n=h.fetchCount();h.advance(300000);await h.t.performScanThenReturn();assert.equal(h.fetchCount(),n);
 const reload=harness(h.storage);reload.advance(h.context.Date.now()-reload.context.Date.now());reload.t.init();await reload.drain();
 assert.equal(reload.t.state().isStopped,true);assert.equal(reload.t.state().isAutoRefreshOn,false);assert.equal(reload.fetchCount(),0);
});

test('auto-pause restores its deadline and frozen time, then detects a return after refresh',async()=>{
 const h=await autoPaused();await h.t.performScanThenReturn();const paused=h.t.state();
 const reload=harness(h.storage);reload.advance(17*60000);reload.setResponse(absent);reload.t.init();await reload.drain();
 assert.equal(reload.t.state().isPaused,true);assert.equal(reload.t.state().isAutoRefreshOn,true);
 assert.equal(reload.t.state().absencePausedAt,paused.absencePausedAt);assert.equal(reload.t.state().pausedElapsedTime,paused.pausedElapsedTime);
 assert.equal(reload.fetchCount(),1);assert.notEqual(reload.t.state().countdownInterval,null);
 reload.setResponse(present);reload.advance(60000);reload.runTimers(t=>t.repeat&&t.ms===1000);await reload.drain();
 assert.equal(reload.t.state().isPaused,false);assert.equal(reload.t.state().history.breaks.at(-1),true);
});

test('delayed browser wake freezes active time at 15m and Stops at the later three-hour paused deadline',async()=>{
 const h=await ready();h.setResponse(absent);h.advance(60000);await h.t.performScanThenReturn();h.advance(60000);await h.t.performScanThenReturn();
 const reload=harness(h.storage);reload.advance(120000);assert(reload.t.loadSession('testroom'));
 reload.advance(4*3600000);reload.t.updateCountdownDisplay();assert(reload.t.state().isStopped);
 assert.equal(reload.t.state().stoppedAt,h.t.state().broadcasterAbsence.since+15*60000+3*3600000);
 assert.equal(reload.t.state().pausedElapsedTime,16*60000);
});

test('one-click Resume cancels auto-pause and its Stop deadline for the continuous absence',async()=>{
 const h=await autoPaused(),paused=h.t.state().pausedElapsedTime,n=h.t.state().history.timestamps.length;
 assert.equal(h.e('btn-control-auto').innerHTML,'▶');h.t.adjustTimer(60);
 h.t.toggleAutoRefresh();await h.drain();assert.equal(h.t.state().isAutoRefreshOn,true);assert.equal(h.t.state().isPaused,false);
 assert.equal(h.t.state().absencePausedAt,null);assert.equal(h.t.state().absenceOverrideActive,true);
 assert.equal(h.t.state().history.timestamps.length,n+1);assert.equal(h.t.state().history.breaks.at(-1),true);
 assert.equal(h.t.state().nextScanAt-h.context.Date.now(),120000);assert.equal(h.context.Date.now()-h.t.state().trackingStartTime,paused);
 assert.equal(h.e('btn-control-auto')['aria-label'],'Pause scans');
 h.advance(4*3600000);h.t.updateCountdownDisplay();await h.t.performScanThenReturn();
 assert.equal(h.t.state().isStopped,false);assert.equal(h.t.state().isPaused,false);assert.equal(h.t.getEffectiveScanIntervalSeconds(),120);
 assert.equal(h.t.state().broadcasterAbsence.missing,0);assert.equal(h.t.state().absenceOverrideActive,true);
 assert.match(await h.report(),/Absence Automation: Manually overridden/);
});

test('a stale returning-owner check cannot clear a newer manual override or append its sample',async()=>{
 const h=await autoPaused();let resolve;h.setResponse(()=>new Promise(r=>resolve=r));const pending=h.t.performScanThenReturn();await h.drain();
 const n=h.t.state().history.timestamps.length;h.setResponse(absent);h.t.toggleAutoRefresh();await h.drain();
 const after=JSON.stringify(h.t.state());resolve({ok:true,text:async()=>present});await pending;
 assert.equal(JSON.stringify(h.t.state()),after);assert.equal(h.t.state().history.timestamps.length,n+1);assert.equal(h.t.state().absenceOverrideActive,true);
});

test('override persists through refresh and an ordinary manual Pause/Resume',async()=>{
 const h=await autoPaused();h.t.toggleAutoRefresh();await h.drain();
 const reload=harness(h.storage);reload.advance(h.context.Date.now()-reload.context.Date.now());reload.setResponse(absent);reload.t.init();
 reload.runTimers(t=>t.repeat&&t.ms===1000);await reload.drain();reload.runTimers(t=>!t.repeat&&t.ms===2002);await reload.drain();
 assert.equal(reload.t.state().absenceOverrideActive,true);assert.equal(reload.t.state().isPaused,false);
 reload.t.toggleAutoRefresh();assert.equal(reload.t.state().isAutoRefreshOn,false);assert.equal(reload.t.state().isPaused,true);
 assert.equal(reload.t.state().absenceOverrideActive,true);const n=reload.fetchCount();reload.advance(4*3600000);reload.runTimers(t=>t.repeat&&t.ms===1000);await reload.drain();assert.equal(reload.fetchCount(),n);
 // Saving immediately before refresh keeps this within the existing three-hour restore window.
 assert.equal(reload.t.state().isStopped,false);reload.t.saveSession('testroom');
 const restored=harness(reload.storage);restored.advance(reload.context.Date.now()-restored.context.Date.now());restored.setResponse(absent);restored.t.init();
 restored.runTimers(t=>t.repeat&&t.ms===1000);restored.runTimers(t=>!t.repeat&&t.ms===2002);await restored.drain();
 assert.equal(restored.fetchCount(),0);assert.equal(restored.t.state().absenceOverrideActive,true);
 restored.t.toggleAutoRefresh();await restored.drain();assert.equal(restored.fetchCount(),1);assert.equal(restored.t.state().isPaused,false);assert.equal(restored.t.state().absenceOverrideActive,true);
});

test('only a current well-formed API owner re-arms automation for a later absence',async()=>{
 const h=await autoPaused();h.t.toggleAutoRefresh();await h.drain();
 h.t.nextBroadcasterAbsence({source:'DOM',users:[{isOwner:true}]});assert.equal(h.t.state().absenceOverrideActive,true);
 h.setResponse('broken');h.advance(60000);await h.t.performScanThenReturn();assert.equal(h.t.state().absenceOverrideActive,true);
 h.advance(60000);h.setResponse(present);await h.t.performScanThenReturn();assert.equal(h.t.state().absenceOverrideActive,false);
 h.setResponse(absent);h.advance(60000);await h.t.performScanThenReturn();h.advance(60000);await h.t.performScanThenReturn();
 assert.equal(h.t.getEffectiveScanIntervalSeconds(),120);h.advance(14*60000);h.t.updateCountdownDisplay();
 assert.equal(h.t.state().isPaused,true);assert.notEqual(h.t.state().absencePausedAt,null);
});

test('override honors existing rate limits and is cleared by Reset or room navigation',async()=>{
 const h=await autoPaused();h.setResponse(()=>({ok:false,status:429,headers:{get:()=> '600'}}));await h.t.performScanThenReturn();const n=h.fetchCount();
 h.t.toggleAutoRefresh();await h.drain();assert.equal(h.t.state().absenceOverrideActive,true);assert.equal(h.t.state().isPaused,false);
 assert.equal(h.fetchCount(),n);assert.equal(h.t.state().nextScanAt-h.context.Date.now(),600000);
 h.setResponse(absent);h.advance(600000);await h.t.performScanThenReturn();assert.equal(h.fetchCount(),n+1);assert.equal(h.t.state().absenceOverrideActive,true);
 h.t.resetAllTracking();assert.equal(h.t.state().absenceOverrideActive,false);
 const other=await autoPaused();other.t.toggleAutoRefresh();await other.drain();other.context.location=new URL('https://chaturbate.com/anotherroom/');other.t.checkUrlChange();
 assert.equal(other.t.state().absenceOverrideActive,false);
});

test('Reset and navigation invalidate in-flight return checks',async()=>{
 for(const action of ['reset','navigate']){
  const h=await autoPaused();let resolve;h.setResponse(()=>new Promise(r=>resolve=r));const pending=h.t.performScanThenReturn();await h.drain();
  if(action==='reset')h.t.resetAllTracking();else {h.context.location=new URL('https://chaturbate.com/anotherroom/');h.t.checkUrlChange();}
  const before=JSON.stringify(h.t.state());resolve({ok:true,text:async()=>present});await pending;
  assert.equal(JSON.stringify(h.t.state()),before);assert.equal(h.t.state().absencePausedAt,null);
 }
});

test('return checks never fall back to DOM; malformed responses and retry restrictions cannot resume recording',async()=>{
 const h=await autoPaused(),before=JSON.stringify(h.t.state().history);
 h.setResponse('broken');await h.t.performScanThenReturn();assert(h.t.state().isPaused);
 h.advance(300000);h.setResponse(()=>({ok:false,status:429,headers:{get:()=> '600'}}));await h.t.performScanThenReturn();
 const count=h.fetchCount();h.advance(300000);await h.t.performScanThenReturn();assert.equal(h.fetchCount(),count);
 assert.equal(h.t.state().nextScanAt-h.context.Date.now(),300000);assert.equal(JSON.stringify(h.t.state().history),before);
 h.advance(300000);h.setResponse('0');await h.t.performScanThenReturn();assert.equal(h.fetchCount(),count+1);assert(h.t.state().isPaused);
 assert(!h.logs.some(x=>x.includes('Attempting DOM fallback')));assert.equal(JSON.stringify(h.t.state().history),before);
 h.advance(300000);h.setResponse(()=>({ok:false,status:403,headers:{get:()=>null}}));await h.t.performScanThenReturn();
 assert.equal(h.t.state().isAutoRefreshOn,false);assert.equal(h.t.state().absencePausedAt,null);assert(h.t.state().isPaused);assert.equal(h.t.state().absenceOverrideActive,false,'access denial must not activate a user override');
 h.setResponse(present);h.t.toggleAutoRefresh();await h.drain();assert.equal(h.t.state().isPaused,false);
});

test('restored running startup still starts return checks when its delayed callback meets the absence threshold',async()=>{
 const h=await ready();h.setResponse(absent);h.advance(60000);await h.t.performScanThenReturn();h.advance(60000);await h.t.performScanThenReturn();
 const reload=harness(h.storage);reload.advance(15*60000);reload.setResponse(absent);reload.t.init();
 reload.advance(60000);reload.runTimers(t=>t.repeat&&t.ms===1000);await reload.drain();
 reload.runTimers(t=>!t.repeat&&t.ms===2002);await reload.drain();assert(reload.t.state().isPaused);
 assert.notEqual(reload.t.state().countdownInterval,null);const n=reload.fetchCount();reload.setResponse(present);reload.advance(60000);reload.runTimers(t=>t.repeat&&t.ms===1000);await reload.drain();
 assert.equal(reload.fetchCount(),n+1);assert.equal(reload.t.state().isPaused,false);
});

test('errors and DOM-only samples cannot establish absence; valid empty API responses can without adding zero counts',async()=>{
 const h=await ready();h.setResponse(new Error('network unavailable'));await h.t.performScanThenReturn();assert.equal(h.t.state().broadcasterAbsence.missing,0);
 assert.equal(h.t.nextBroadcasterAbsence({source:'DOM',users:[]}).missing,0);
 h.advance(60000);h.setResponse('broken');await h.t.performScanThenReturn();assert.equal(h.t.state().broadcasterAbsence.missing,0);
 h.advance(120000);h.setResponse('0');await h.t.performScanThenReturn();assert.equal(h.t.state().broadcasterAbsence.missing,1);
 h.advance(240000);await h.t.performScanThenReturn();assert.equal(h.t.state().broadcasterAbsence.missing,2);
 assert.equal(h.t.state().history.timestamps.length,1);assert.equal(h.t.getEffectiveScanIntervalSeconds(),120);
});

test('Stop during a restored startup delay cannot be overwritten by its queued callbacks',async()=>{
 const h=await ready();const reload=harness(h.storage);reload.t.init();reload.t.stopTracking('manual');
 reload.runTimers(t=>t.repeat&&t.ms===1000);reload.runTimers(t=>!t.repeat&&t.ms===2002);await reload.drain();
 assert.equal(reload.fetchCount(),0);assert.equal(reload.e('btn-control-auto').innerHTML,'Start');assert.equal(reload.e('control-next-scan').textContent,'Stopped');
});

test('a confirmed return resumes timing even when its audience counts fail validation',async()=>{
 const h=await ready(),away='5,'+Array.from({length:10},(_,i)=>'viewer'+i+'|t|m|0').join(',');
 h.setResponse(away);h.advance(60000);await h.t.performScanThenReturn();h.advance(60000);await h.t.performScanThenReturn();
 h.advance(14*60000);h.t.updateCountdownDisplay();assert(h.t.state().isPaused);
 const before=JSON.stringify(h.t.state().history);h.setResponse('14,testroom|o|f|0');await h.t.performScanThenReturn();
 assert.equal(h.t.state().isPaused,false);assert.equal(h.t.state().absencePausedAt,null);assert.equal(JSON.stringify(h.t.state().history),before);
 assert.equal(h.t.state().nextScanAt-h.context.Date.now(),60000);assert(!h.logs.some(x=>x.includes('Attempting DOM fallback')));
});

test('optional auto-pause persistence rejects inconsistent state and preserves legacy records',async()=>{
 const h=await autoPaused();const record=records(h).at(-1)[1];assert.equal(record.absencePausedAt,h.t.state().absencePausedAt);h.t.validateStoredSession(record);
 for(const patch of [{absencePausedAt:-1},{absencePausedAt:record.timestamp+1},{isPaused:false},{absencePausedAt:record.absencePausedAt-1},{broadcasterAbsence:{since:null,missing:0}},{absenceOverrideActive:true},{absenceOverrideActive:'true'}]){
  assert.throws(()=>h.t.validateStoredSession({...record,...patch}));
 }
 const legacy={...record};delete legacy.absencePausedAt;h.t.validateStoredSession(legacy);assert.equal(h.t.normalizeStoredSession(legacy).absencePausedAt,null);
 delete legacy.absenceOverrideActive;assert.equal(h.t.normalizeStoredSession(legacy).absenceOverrideActive,false);
});
