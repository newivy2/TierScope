const test = require('node:test'), assert = require('node:assert/strict');
const {harness, source} = require('./helpers/harness.cjs');
const fixture = source.replace('downloadTrackingReport: downloadTrackingReport,', `
 __connection: {state:()=>({offline:connectionOffline,recoveryAt:connectionRecoveryAt}), effectiveRequestDeadline},
 downloadTrackingReport: downloadTrackingReport,`);
const valid = {ok:true,text:async()=>'5,testroom|o|f|0,viewer|t|m|0'};
const http = (status, wait=null) => ({ok:false,status,headers:{get:()=>wait}});
function ready(storage) {
 const h=harness(storage,fixture);h.context.navigator={onLine:true};h.t.initPanel();h.t.startTrackingTimer();h.t.startCountdown();return h;
}
function online(h,value) {h.context.navigator.onLine=value;h.t.updateCountdownDisplay();}
async function tick(h,ms) {h.advance(ms);h.runTimers(t=>t.repeat&&t.ms===1000);await h.drain();}

test('known offline suspends all acquisition without shared failures; reconnect retains data and a real gap',async()=>{
 const h=ready();await h.t.performScanThenReturn();const before=JSON.stringify(h.t.state().history),count=h.fetchCount();
 online(h,false);assert.equal(h.e('control-next-scan').textContent,'No connection');
 await tick(h,300000);await h.t.performScanThenReturn();assert.equal(h.fetchCount(),count);
 assert.equal(h.t.readRequestPolicy().failures,0);assert.equal(h.t.readRequestPolicy().connectionFailures,undefined);
 assert.equal(JSON.stringify(h.t.state().history),before);assert.equal(h.t.state().isAutoRefreshOn,true);
 online(h,true);const delay=h.t.state().nextScanAt-h.context.Date.now();assert(delay>=5000&&delay<10000);
 assert.match(h.e('control-next-scan').textContent,/Reconnecting/);await tick(h,delay-1);assert.equal(h.fetchCount(),count);
 await tick(h,1);assert.equal(h.fetchCount(),count+1);assert.equal(h.t.state().history.timestamps.length,2);
 assert.equal(h.t.state().history.breaks[1],true);assert.equal(h.t.state().nextScanAt-h.context.Date.now(),60000);
 assert(h.t.state().history.timestamps[1]-h.t.state().history.timestamps[0]>=300000);
 assert(!h.logs.some(line=>line.includes('Attempting DOM fallback')));
});

test('transport failures use a separate bounded counter, skip stale DOM fallback and clear only after a valid scan',async()=>{
 const h=ready();h.setResponse(new Error('Failed to fetch'));
 for(const [i,delay] of [15000,30000,60000,60000,60000].entries()) {
  await h.t.performScanThenReturn();const p=h.t.readRequestPolicy();assert.equal(p.failures,0);assert.equal(p.connectionFailures,i+1);
  assert.equal(p.until-h.context.Date.now(),delay);assert.equal(h.t.state().nextScanAt,p.until);
  assert.match(h.e('control-next-scan').textContent,/Connection/);
  const count=h.fetchCount();await h.t.performScanThenReturn();assert.equal(h.fetchCount(),count);h.advance(delay);
 }
 assert(!h.logs.some(line=>line.includes('DOM fallback')));h.setResponse(()=>valid);await h.t.performScanThenReturn();
 assert.equal(h.t.readRequestPolicy().connectionFailures,undefined);assert.equal(h.t.readRequestPolicy().failures,0);
 assert.equal(h.t.state().nextScanAt-h.context.Date.now(),60000);
});

test('recovery bypasses only a transport wait locally, without erasing the shared record before success',async()=>{
 const h=ready();h.setResponse(new Error('network'));
 for(const delay of [15000,30000]){await h.t.performScanThenReturn();h.advance(delay);}
 await h.t.performScanThenReturn();const policy=h.t.readRequestPolicy(),raw=h.storage.get('tierscope:requests:v1:https://chaturbate.com');
 online(h,false);online(h,true);assert(h.t.state().nextScanAt<policy.until);
 assert.equal(h.storage.get('tierscope:requests:v1:https://chaturbate.com'),raw);
 h.setResponse(()=>valid);await tick(h,h.t.state().nextScanAt-h.context.Date.now());
 assert.equal(h.t.readRequestPolicy().connectionFailures,undefined);assert.equal(h.t.state().history.timestamps.length,1);
});

test('HTTP backoff, Retry-After and rate limits survive offline/reconnect, including another tab updating the restriction',async()=>{
 for(const [status,wait,delay] of [[500,null,60000],[503,'240',240000],[429,'600',600000]]) {
  const h=ready();h.setResponse(()=>http(status,wait));await h.t.performScanThenReturn();const count=h.fetchCount(),until=h.t.readRequestPolicy().until;
  online(h,false);online(h,true);h.setResponse(()=>valid);await tick(h,10000);await h.t.performScanThenReturn();assert.equal(h.fetchCount(),count);
  assert.equal(h.t.readRequestPolicy().until,until);await tick(h,delay-10000);assert.equal(h.fetchCount(),count+1);
 }
 const storage=new Map(),a=ready(storage),b=ready(storage);a.setResponse(new Error('network'));await a.t.performScanThenReturn();
 online(a,false);online(a,true);b.advance(15000);b.setResponse(()=>http(429,'600'));await b.t.performScanThenReturn();
 await tick(a,15000);assert.equal(a.fetchCount(),1);assert.equal(a.t.readRequestPolicy().status,429);
 assert.equal(a.t.state().nextScanAt,b.t.readRequestPolicy().until);
});

test('offline/reconnect never resumes manual Pause, Stop or directory tracking, and noise cannot shorten waits',async()=>{
 for(const state of ['pause','stop','directory']) {
  const h=ready();if(state==='pause'){h.setResponse(new Error('network'));await h.t.performScanThenReturn();h.t.toggleAutoRefresh();}
  else if(state==='stop')h.t.stopTracking('manual');
  else{h.context.location=new URL('https://chaturbate.com/followed-cams/');h.t.checkUrlChange();h.t.init();}
  const before=h.t.state(),count=h.fetchCount();online(h,false);online(h,true);await tick(h,300000);
  assert.equal(h.fetchCount(),count);assert.equal(h.t.state().isAutoRefreshOn,before.isAutoRefreshOn);
  assert.equal(h.t.state().isStopped,before.isStopped);assert.equal(h.t.state().countdownInterval,null);
  if(state==='pause')assert.equal(h.e('control-next-scan').textContent,'Paused');
 }
 const h=ready();h.setResponse(new Error('network'));await h.t.performScanThenReturn();const deadline=h.t.state().nextScanAt;
 online(h,true);online(h,true);assert.equal(h.t.state().nextScanAt,deadline);
 for(const status of [401,403]) {
  const blocked=ready();blocked.setResponse(()=>http(status,'300'));await blocked.t.performScanThenReturn();
  online(blocked,false);online(blocked,true);await tick(blocked,600000);
  assert.equal(blocked.fetchCount(),1);assert.equal(blocked.t.state().isAutoRefreshOn,false);assert.equal(blocked.t.readRequestPolicy().blocked,status);
 }
});

test('offline invalidates pending responses, including a pending first scan, without poisoning retries',async()=>{
 const h=ready();let resolve;h.setResponse(()=>new Promise(r=>resolve=r));const pending=h.t.performScanThenReturn();await h.drain();
 online(h,false);resolve(valid);await pending;assert.equal(h.t.state().history.timestamps.length,0);assert.equal(h.t.readRequestPolicy().failures,0);
 online(h,true);h.setResponse(()=>valid);await tick(h,h.t.state().nextScanAt-h.context.Date.now());assert.equal(h.t.state().history.timestamps.length,1);
 const first=harness(undefined,fixture);first.context.navigator={onLine:true};let finish;
 first.setResponse(()=>new Promise(r=>finish=r));first.t.init();online(first,false);finish(valid);await first.drain();
 online(first,true);first.setResponse(()=>valid);await tick(first,10000);assert.equal(first.t.state().history.timestamps.length,1);
 assert(first.t.state().countdownInterval);assert(first.t.state().trackingTimerInterval);
});

test('request timeouts and response-stream failures are connection errors; malformed received data is not',async()=>{
 const timeout=ready();timeout.setResponse(()=>new Promise(()=>{}));const pending=timeout.t.performScanThenReturn();await timeout.drain();
 timeout.advance(10000);timeout.runTimers(t=>!t.repeat&&t.ms===10000);await pending;
 assert.equal(timeout.t.readRequestPolicy().connectionFailures,1);assert.equal(timeout.t.readRequestPolicy().failures,0);
 const stream=ready();stream.setResponse(()=>({ok:true,text:async()=>{throw Error('stream interrupted');}}));await stream.t.performScanThenReturn();
 assert.equal(stream.t.readRequestPolicy().connectionFailures,1);
 const malformed=ready();malformed.setResponse('invalid response');await malformed.t.performScanThenReturn();
 assert.equal(malformed.t.readRequestPolicy().failures,1);assert.equal(malformed.t.readRequestPolicy().connectionFailures,0);
 assert(malformed.logs.some(line=>line.includes('Attempting DOM fallback')));
});

test('unsaved connection restrictions merge with server limits, and older successes cannot clear a newer tab restriction',async()=>{
 const storage=new Map(),a=ready(storage),b=ready(storage),set=a.context.GM_setValue;
 a.context.GM_setValue=(key,value)=>{if(key.startsWith('tierscope:requests:'))throw Error('write unavailable');return set(key,value);};
 a.setResponse(new Error('network'));await a.t.performScanThenReturn();b.setResponse(()=>http(429,'600'));await b.t.performScanThenReturn();
 online(a,false);online(a,true);assert.equal(a.t.readRequestPolicy().until,b.t.readRequestPolicy().until);
 await tick(a,10000);assert.equal(a.fetchCount(),1);
 const shared=new Map(),x=ready(shared),y=ready(shared);x.setResponse(new Error('network'));await x.t.performScanThenReturn();
 online(x,false);online(x,true);let resolve;x.setResponse(()=>new Promise(r=>resolve=r));
 x.advance(x.t.state().nextScanAt-x.context.Date.now());const pending=x.t.performScanThenReturn();await x.drain();
 y.advance(15000);y.setResponse(()=>http(429,'600'));await y.t.performScanThenReturn();resolve(valid);await pending;
 assert.equal(x.t.readRequestPolicy().status,429);assert.equal(x.t.readRequestPolicy().until,y.t.readRequestPolicy().until);
});

test('legacy ambiguous waits are preserved and connection retries do not inflate server failure counts',async()=>{
 const h=ready(),now=h.context.Date.now();h.storage.set('tierscope:requests:v1:https://chaturbate.com',JSON.stringify({until:now+480000,failures:4,status:0,blocked:0,revision:'legacy'}));
 online(h,false);online(h,true);await tick(h,10000);assert.equal(h.fetchCount(),0);assert.equal(h.t.readRequestPolicy().until,now+480000);
 h.advance(470000);h.setResponse(new Error('network'));await h.t.performScanThenReturn();assert.equal(h.t.readRequestPolicy().failures,4);
 h.advance(15000);h.setResponse(()=>http(500));await h.t.performScanThenReturn();assert.equal(h.t.readRequestPolicy().failures,5);
 assert.equal(h.t.readRequestPolicy().until-h.context.Date.now(),900000);
});

test('success after an unsaved failure or unavailable read cannot clear a newer shared server restriction',async()=>{
 for(const failure of ['write','read']) {
  const shared=new Map(),a=ready(shared),b=ready(shared),set=a.context.GM_setValue,get=a.context.GM_getValue;
  if(failure==='write')a.context.GM_setValue=(key,value)=>{if(key.startsWith('tierscope:requests:'))throw Error('write unavailable');return set(key,value);};
  a.setResponse(new Error('network'));await a.t.performScanThenReturn();online(a,false);online(a,true);
  a.advance(a.t.state().nextScanAt-a.context.Date.now());let resolve;a.setResponse(()=>new Promise(r=>resolve=r));
  const pending=a.t.performScanThenReturn();await a.drain();b.advance(15000);b.setResponse(()=>http(429,'600'));await b.t.performScanThenReturn();
  const key='tierscope:requests:v1:https://chaturbate.com',raw=shared.get(key);
  if(failure==='read')a.context.GM_getValue=(name,value)=>{if(name===key)throw Error('read unavailable');return get(name,value);};
  resolve(valid);await pending;assert.equal(a.t.state().history.timestamps.length,1);assert.equal(shared.get(key),raw);
  a.context.GM_getValue=get;assert.equal(a.t.readRequestPolicy().status,429);assert.equal(a.t.readRequestPolicy().until,b.t.readRequestPolicy().until);
 }
});
