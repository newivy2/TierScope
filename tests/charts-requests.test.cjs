const test=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/harness.cjs');
const clean=x=>JSON.parse(JSON.stringify(x));
const response=(status,retry)=>({ok:false,status,headers:{get:()=>retry},text:async()=>''});
const valid='5,testroom|o|f|0,viewer|t|m|0';
function seed(h){const now=h.context.Date.now();const history={timestamps:[now-120000,now-60000]};for(const k of ['red','green','purple','pink','dark-blue','light-blue','gray','female-trans','withTokens','total','anonymous'])history[k]=[1,2];return {timestamp:now,history,isPaused:true};}

test('timestamps control chart spacing, breaks preserve gaps, duplicate times remain finite',()=>{
 const h=harness();const p=h.t.buildChartPlot([1,4,2],[0,10,100],[false,false,true],100);
 assert.deepEqual(clean(p.points.map(p=>p.x)),[0,10,100]);assert.deepEqual(clean(p.points.map(p=>p.move)),[true,false,true]);
 const flat=h.t.buildChartPlot([3,3],[100,100],[],100);assert(flat.points.every(p=>p.x===50));
 assert.equal(h.t.nearestChartSample([0,10,100],2,60),2);
 const partial=h.t.buildChartPlot([1,4,999],[0,10,100],[],100,1);assert.equal(partial.max,4);assert.equal(partial.end,1);
 assert.deepEqual(clean(h.t.getChartTimes([10,5,20])),[10,10,20]);
});

test('dense plotting preserves per-column extrema and bounds drawing work',()=>{
 const h=harness(),times=Array.from({length:10000},(_,i)=>i),values=times.map(i=>100+Math.sin(i));values[2345]=1;values[6789]=999;
 const p=h.t.buildChartPlot(values,times,[],105);assert(p.points.length<=4*106);assert.equal(p.min,1);assert.equal(p.max,999);
 assert(p.points.some(p=>p.index===2345));assert(p.points.some(p=>p.index===6789));
 assert.equal(p.points[0].index,0);assert.equal(p.points.at(-1).index,9999);
});

test('pause/reload gaps persist, with conservative legacy interval inference',()=>{
 const h=harness();h.t.loadSession('testroom');h.t.sample(1);h.advance(60000);h.t.sample(2);h.t.startTrackingTimer();h.t.pauseTrackingTimer();h.advance(1200000);h.t.startTrackingTimer();h.t.sample(3);h.t.saveSession('testroom');
 assert.deepEqual(clean(h.t.state().history.breaks),[false,false,true]);
 const r=harness(h.storage);assert(r.t.loadSession('testroom'));assert.deepEqual(clean(r.t.state().history.breaks),[false,false,true]);r.advance(60000);r.t.sample(4);assert.equal(r.t.state().history.breaks.at(-1),true);
 assert.deepEqual(clean(h.t.getHistoryBreaks({timestamps:[0,60000,120000,1320000,1380000]})),[false,false,false,true,false]);
});

test('old names are ignored on restore and omitted from new saves without rewriting source records',async()=>{
 const h=harness(),data=seed(h);data.sessionUniqueUsers={alice:true};data.sessionFemaleTransUsers={beth:'female'};
 const rawHistory=clean(data.history);h.storage.set('tierscope:v1:testroom',JSON.stringify(data));
 assert(h.t.loadSession('testroom'));assert.equal(h.storage.get('tierscope:v1:testroom'),JSON.stringify(data));const scrubbed=JSON.parse(h.t.readSavedSession('tierscope:v1:testroom'));
 assert(!('sessionUniqueUsers' in scrubbed));assert(!('sessionFemaleTransUsers' in scrubbed));assert.deepEqual(scrubbed.history,rawHistory);
 h.t.saveSession('testroom');for(const [key,raw]of h.storage)if(key.startsWith('tierscope:tab:')){assert(!raw.includes('alice'));assert(!raw.includes('beth'));assert(!raw.includes('sessionUniqueUsers'));}
 const report=await h.report();assert(!report.includes('Unique'));assert(!report.includes('OVERLAY (SESSION)'));assert(report.includes('♀⚧'));
 const future={...data,schemaVersion:999,roomEpoch:'legacy'};const text=JSON.stringify(future);h.storage.set('tierscope:tab:v2:testroom:future',text);h.t.readSavedSession('tierscope:v1:testroom');assert.equal(h.storage.get('tierscope:tab:v2:testroom:future'),text);
});

test('429 honors Retry-After across manual attempts, Reset, reload and other tabs without DOM fallback',async()=>{
 const h=harness();h.t.initPanel();h.setResponse(()=>response(429,'180'));await h.t.performScanThenReturn();
 const start=h.context.Date.now();assert.equal(h.t.readRequestPolicy().until,start+180000);assert(!h.logs.some(x=>x.includes('Attempting DOM fallback')));
 await h.t.performScanThenReturn();assert.equal(h.fetchCount(),1);h.t.resetAllTracking();await h.t.performScanThenReturn();assert.equal(h.fetchCount(),1);
 const b=harness(h.storage);b.t.initPanel();await b.t.performScanThenReturn();assert.equal(b.fetchCount(),0);
 h.advance(180000);h.setResponse(valid);await h.t.performScanThenReturn();assert.equal(h.fetchCount(),2);assert.equal(h.t.readRequestPolicy().failures,0);
 assert.equal(h.t.retryAfterTime(new Date(start+300000).toUTCString(),start),start+300000);
 assert.equal(h.t.retryAfterTime('bogus',start),0);
});

test('401/403 pause acquisition until explicit Resume, including in sibling tabs',async()=>{
 for(const status of [401,403]){
  const h=harness();h.t.initPanel();h.setResponse(()=>response(status,null));await h.t.performScanThenReturn();
  assert.equal(h.t.state().isAutoRefreshOn,false);assert.equal(h.t.state().isPaused,true);assert.equal(h.t.readRequestPolicy().blocked,status);
  h.advance(3600000);await h.t.performScanThenReturn();assert.equal(h.fetchCount(),1);assert(!h.logs.some(x=>x.includes('Attempting DOM fallback')));
  const b=harness(h.storage);b.t.initPanel();await b.t.performScanThenReturn();assert.equal(b.fetchCount(),0);assert.equal(b.t.state().isAutoRefreshOn,false);
  h.setResponse(valid);h.t.toggleAutoRefresh();await h.drain();assert.equal(h.fetchCount(),2);assert.equal(h.t.readRequestPolicy().blocked,0);
 }
});

test('temporary failures back off to 15 minutes; server waits suppress fallback; successful API resumes normal cadence',async()=>{
 const h=harness();h.t.initPanel();h.setResponse(()=>response(500,null));
 for(const delay of [60000,120000,240000,480000,900000,900000]){
  await h.t.performScanThenReturn();assert.equal(h.t.readRequestPolicy().until-h.context.Date.now(),delay);
  const count=h.fetchCount();await h.t.performScanThenReturn();assert.equal(h.fetchCount(),count);h.advance(delay);
 }
 assert(h.logs.some(x=>x.includes('Attempting DOM fallback')));
 h.setResponse(valid);await h.t.performScanThenReturn();assert.equal(h.t.readRequestPolicy().failures,0);
 const b=harness();b.t.initPanel();b.setResponse(()=>response(503,'240'));await b.t.performScanThenReturn();assert.equal(b.t.readRequestPolicy().until-b.context.Date.now(),240000);assert(!b.logs.some(x=>x.includes('Attempting DOM fallback')));
});

test('older successful requests cannot clear a restriction written by another tab',async()=>{
 const storage=new Map(),a=harness(storage),b=harness(storage);a.t.initPanel();b.t.initPanel();let resolve;
 a.setResponse(()=>new Promise(r=>resolve=r));const pending=a.t.performScanThenReturn();await a.drain();
 b.setResponse(()=>response(429,'600'));await b.t.performScanThenReturn();resolve({ok:true,text:async()=>valid});await pending;
 assert.equal(a.t.readRequestPolicy().status,429);assert.equal(a.t.readRequestPolicy().until-a.context.Date.now(),600000);
});

test('local retry gate survives an unavailable GM write',async()=>{
 const h=harness();h.t.initPanel();h.context.GM_setValue=()=>{throw new Error('storage unavailable');};h.setResponse(()=>response(429,'300'));await h.t.performScanThenReturn();await h.t.performScanThenReturn();assert.equal(h.fetchCount(),1);assert.equal(h.t.readRequestPolicy().until-h.context.Date.now(),300000);
});

test('Resume after access denial still honors an explicit server wait',async()=>{
 const h=harness();h.t.initPanel();h.setResponse(()=>response(403,'300'));await h.t.performScanThenReturn();h.setResponse(valid);h.t.toggleAutoRefresh();await h.drain();assert.equal(h.fetchCount(),1);assert.equal(h.t.readRequestPolicy().blocked,0);h.advance(300000);await h.t.performScanThenReturn();assert.equal(h.fetchCount(),2);
});

test('an older stored policy cannot erase a newer unsaved restriction',async()=>{
 const h=harness();h.t.initPanel();h.setResponse(()=>response(500,null));await h.t.performScanThenReturn();h.advance(60000);h.context.GM_setValue=()=>{throw new Error('storage unavailable')};h.setResponse(()=>response(403,null));await h.t.performScanThenReturn();assert.equal(h.t.readRequestPolicy().blocked,403);h.advance(600000);await h.t.performScanThenReturn();assert.equal(h.fetchCount(),2);
});
