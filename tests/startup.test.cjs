const test=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/harness.cjs');
const valid=()=>({ok:true,text:async()=>'5,testroom|o|f|0,viewer|t|m|0'});
function saved(h,paused){
 const now=h.context.Date.now(),history={timestamps:[now-60000]};
 for(const k of ['red','green','purple','pink','dark-blue','light-blue','gray','female-trans','withTokens','total','anonymous'])history[k]=[2];
 h.storage.set('tierscope:v1:testroom',JSON.stringify({timestamp:now,history,isPaused:paused}));
}

test('fresh room scans during init and starts its next interval only after completion',async()=>{
 const h=harness();let resolve;h.setResponse(()=>new Promise(r=>resolve=r));h.t.init();
 assert.equal(h.fetchCount(),1);assert.equal(h.t.state().isScanning,true);
 assert.equal(h.t.state().countdownInterval,null);
 h.advance(7500);h.runTimers(t=>t.ms===1000||t.ms===2002);await h.drain();
 assert.equal(h.fetchCount(),1);assert.equal(h.t.state().countdownInterval,null);
 const completedAt=h.context.Date.now();resolve(valid());await h.drain();
 assert.equal(h.t.state().history.timestamps.length,1);assert.equal(h.t.state().history.timestamps[0],completedAt);
 assert.equal(h.t.state().isScanning,false);assert(h.t.state().countdownInterval);
 assert.equal(h.t.state().nextScanAt,completedAt+60000);
 h.setResponse(valid);h.advance(59999);h.runTimers(t=>t.repeat&&t.ms===1000);await h.drain();assert.equal(h.fetchCount(),1);
 h.advance(1);h.runTimers(t=>t.repeat&&t.ms===1000);await h.drain();
 assert.equal(h.fetchCount(),2);assert.equal(h.t.state().history.timestamps.length,2);
});

test('restored active and paused sessions keep their existing startup behavior',async()=>{
 for(const paused of [false,true]){
  const h=harness();saved(h,paused);h.t.init();assert.equal(h.fetchCount(),0);assert(h.t.state().restoredDisplayFrame);
  h.advance(1000);h.runTimers(t=>t.repeat&&t.ms===1000);await h.drain();
  assert.equal(h.fetchCount(),paused?0:1);
  h.advance(2002);h.runTimers(t=>!t.repeat&&t.ms===2002);await h.drain();
  assert.equal(!!h.t.state().countdownInterval,!paused);assert.equal(h.t.state().isPaused,paused);
  if(paused){assert(h.t.state().restoredDisplayFrame);h.t.toggleAutoRefresh();await h.drain();assert.equal(h.fetchCount(),1);}
 }
});

test('pausing during the first scan never lets its completion restart automatic scans',async()=>{
 const h=harness();let resolve;h.setResponse(()=>new Promise(r=>resolve=r));h.t.init();
 h.t.toggleAutoRefresh();resolve(valid());await h.drain();
 assert.equal(h.t.state().history.timestamps.length,1);assert.equal(h.t.state().isPaused,true);
 assert.equal(h.t.state().isAutoRefreshOn,false);assert.equal(h.t.state().countdownInterval,null);
 h.advance(120000);h.runTimers(t=>t.repeat&&t.ms===1000);await h.drain();assert.equal(h.fetchCount(),1);
});

test('Reset or navigation invalidate the first scan and its scheduling continuation',async()=>{
 for(const action of ['reset','navigate']){
  const h=harness();let resolve;h.setResponse(()=>new Promise(r=>resolve=r));h.t.init();
  if(action==='reset')h.t.resetAllTracking();
  else{h.context.location=new URL('https://chaturbate.com/otherroom/');h.t.checkUrlChange();}
  const countdown=h.t.state().countdownInterval;
  resolve(valid());await h.drain();
  assert.equal(h.t.state().history.timestamps.length,0);assert.equal(h.t.state().countdownInterval,countdown);
  assert.equal(h.t.state().lastAcceptedAcquisition,null);
 }
});

test('startup respects existing retry gates and denial, including failures of the first request',async()=>{
 for(const status of [429,403]){
  const h=harness();h.setResponse(()=>({ok:false,status,headers:{get:()=>status===429?'180':null},text:async()=>''}));
  h.t.init();await h.drain();assert.equal(h.fetchCount(),1);assert.equal(h.t.state().history.timestamps.length,0);
  const sibling=harness(h.storage);sibling.t.init();await sibling.drain();assert.equal(sibling.fetchCount(),0);
  if(status===429){assert.equal(h.t.state().nextScanAt,h.context.Date.now()+180000);assert(h.t.state().countdownInterval);}
  else{assert.equal(h.t.state().isAutoRefreshOn,false);assert.equal(h.t.state().countdownInterval,null);}
 }
});

test('directory pages do not gain an immediate room scan',async()=>{
 const h=harness();h.context.location=new URL('https://chaturbate.com/female-cams/');h.t.init();await h.drain();
 assert.equal(h.fetchCount(),0);assert.equal(h.t.state().isAutoRefreshOn,false);
 for(let i=0;i<30;i++){h.advance(1000);h.runTimers(t=>t.repeat&&t.ms===1000);await h.drain();}
 assert.equal(h.fetchCount(),0);assert.equal(h.t.state().countdownInterval,null);
});
