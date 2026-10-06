const test=require('node:test'),assert=require('node:assert/strict');
const {harness,source}=require('./helpers/harness.cjs');
const extra=source.replace('downloadTrackingReport: downloadTrackingReport,',`__directory:{startCountdown,startTrackingTimer,state:()=>({minimized:isMinimized,health:healthCheckInterval})},downloadTrackingReport: downloadTrackingReport,`);
const paths=['/','/followed-cams/','/female-cams/','/male-cams/','/couple-cams/','/trans-cams/','/tags/testroom/'];
const key='tierscope:requests:v1:https://chaturbate.com';
const clean=value=>JSON.parse(JSON.stringify(value));
function directory(path,storage=new Map()){
 const h=harness(storage,extra);h.context.location=new URL('https://chaturbate.com'+path);
 h.context.document.querySelector=selector=>selector==='#UserListTab'?{click(){assert.fail('Directory cannot open Users');}}:null;
 return h;
}
test('all directory routes stay minimized with no acquisition clocks even when a Users tab is present',async()=>{
 for(const path of paths){
  const h=directory(path);h.setResponse(()=>({ok:false,status:429,headers:{get:()=>null}}));h.t.init();await h.drain();
  for(let i=0;i<35;i++){h.advance(1000);h.runTimers(t=>t.repeat);await h.drain();}
  assert.equal(h.fetchCount(),0,path);assert.equal(h.storage.get(key),undefined,path);
  assert.equal(h.t.state().isAutoRefreshOn,false);assert.equal(h.t.state().countdownInterval,null);assert.equal(h.t.state().trackingTimerInterval,null);
  assert.equal(h.api.__directory.state().minimized,true);assert.equal(h.api.__directory.state().health,null);
  assert.equal(h.e('btn-auto').disabled,true);assert.equal(h.e('btn-control-auto').disabled,true);assert.equal(h.e('btn-control-stop').disabled,true);
  assert.equal(h.e('auto-status').textContent,'Open a room');
 }
});
test('direct scan, Resume and clock starts on directories cannot mutate live state or shared restrictions',async()=>{
 for(const blocked of [0,403])for(const path of paths){
  const storage=new Map(),h=directory(path,storage);
  storage.set(key,JSON.stringify({until:h.context.Date.now()+600000,serverUntil:h.context.Date.now()+600000,failures:4,blocked,status:blocked||429,revision:'room-policy'}));
  h.t.init();const before=clean(h.t.state()),policy=storage.get(key);
  h.t.toggleAutoRefresh();h.api.__directory.startCountdown();h.api.__directory.startTrackingTimer();await h.t.performScanThenReturn();await h.drain();
  assert.deepEqual(clean(h.t.state()),before,path);assert.equal(storage.get(key),policy);assert.equal(h.fetchCount(),0);
  const room=harness(storage);room.t.init();await room.drain();assert.equal(room.fetchCount(),0,'sibling retains legitimate retry/access restriction');
 }
});
test('a directory cannot poison a healthy sibling; navigating into a room resumes normal startup',async()=>{
 const h=directory('/followed-cams/');h.t.init();await h.t.performScanThenReturn();await h.drain();
 const room=harness(h.storage);room.t.init();await room.drain();assert.equal(room.fetchCount(),1);assert.equal(room.t.state().history.timestamps.length,1);
 h.context.location=new URL('https://chaturbate.com/newroom/');h.t.checkUrlChange();h.runTimers(t=>!t.repeat&&t.ms===2002);await h.drain();
 assert.equal(h.fetchCount(),1);assert.equal(h.api.__directory.state().minimized,false);assert(h.t.state().countdownInterval);
});
test('late room failures after navigation to a directory cannot write retry policy or restart tracking',async()=>{
 const h=harness(new Map(),extra);let finish;h.setResponse(()=>new Promise(resolve=>finish=resolve));h.t.init();
 h.context.location=new URL('https://chaturbate.com/female-cams/');h.t.checkUrlChange();h.runTimers(t=>!t.repeat&&t.ms===2002);
 finish({ok:false,status:429,headers:{get:()=> '600'}});await h.drain();
 assert.equal(h.storage.get(key),undefined);assert.equal(h.t.state().history.timestamps.length,0);assert.equal(h.t.state().countdownInterval,null);assert.equal(h.t.state().trackingTimerInterval,null);
 assert.equal(h.api.__directory.state().minimized,true);
});
