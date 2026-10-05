const test=require('node:test'),assert=require('node:assert/strict');
const {harness,source}=require('./helpers/harness.cjs');
const extra=source.replace('downloadTrackingReport: downloadTrackingReport,',`__duration:{readAutomaticKeepingMinutes,saveAutomaticKeepingMinutes,readSessionLibrary,setModelFavorite,keepFavoriteSession,automaticLibraryStatus,captureLiveSessionFile,keepSessionInLibrary,restoreSessionState},downloadTrackingReport: downloadTrackingReport,`);
function fresh(storage=new Map()){const h=harness(storage,extra);h.t.initPanel();h.d=h.api.__duration;h.d.setModelFavorite('testroom',true,true);return h;}
function scan(h,advance=0){h.advance(advance);h.t.sample(4);h.t.saveSession('testroom');}
const count=h=>h.d.readSessionLibrary().count;
test('default requires five covered minutes; eligible first save includes earlier samples and later checkpoints update it',()=>{
 const h=fresh();assert.equal(h.d.readAutomaticKeepingMinutes(),5);scan(h);assert.equal(count(h),0);
 for(let i=0;i<4;i++)scan(h,60000);assert.equal(count(h),0);assert.equal(h.d.automaticLibraryStatus('testroom').coveredMs,240000);
 scan(h,60000);assert.equal(count(h),1);assert.equal(h.d.readSessionLibrary().entries[0].archive.session.history.timestamps.length,6);
 scan(h,60000);assert.equal(count(h),1);assert.equal(h.d.readSessionLibrary().entries[0].archive.session.history.timestamps.length,7);
});
test('brief preparation followed by Pause, waiting and Reset never creates an automatic entry',()=>{
 const h=fresh();scan(h);scan(h,60000);h.t.toggleAutoRefresh();h.advance(10*60000);
 h.d.keepFavoriteSession('testroom',true);assert.equal(count(h),0);
 h.t.resetAllTracking();assert.equal(count(h),0);scan(h);assert.equal(count(h),0);
 assert(h.t.state().isPaused,'Reset preserves Pause');
});
test('gaps and backward timestamps cannot qualify a session; manual keeping remains available',()=>{
 const h=fresh();scan(h);scan(h,60000);h.advance(3600000);
 const data=JSON.parse(JSON.stringify(h.d.captureLiveSessionFile().session));
 const history=data.history;for(const key of Object.keys(history))history[key].push(history[key].at(-1));
 history.timestamps[2]=history.timestamps[1]+3600000;history.breaks[2]=true;
 for(const key of Object.keys(history))history[key].push(history[key].at(-1));history.timestamps[3]=history.timestamps[0];history.breaks[3]=false;
 h.d.restoreSessionState(data);h.d.keepFavoriteSession('testroom',true);assert.equal(count(h),0);assert.equal(h.d.automaticLibraryStatus('testroom').coveredMs,60000);
 h.d.keepSessionInLibrary(h.d.captureLiveSessionFile());assert.equal(count(h),1);
});
test('zero restores immediate keeping; preference is fresh across tabs and existing entries are not deleted',()=>{
 const h=fresh(),other=fresh(h.storage);scan(h);assert.equal(count(h),0);
 other.d.saveAutomaticKeepingMinutes(0);h.d.keepFavoriteSession('testroom',true);assert.equal(count(h),1);
 other.d.saveAutomaticKeepingMinutes(10);scan(h,60000);assert.equal(count(h),1);
 h.t.resetAllTracking();scan(h);assert.equal(count(h),1,'new short session is not kept');
});
test('invalid and unreadable preferences block auto writes; failed or dropped setting writes preserve prior preference',()=>{
 const h=fresh();for(const value of [-1,1.5,1441,NaN])assert.throws(()=>h.d.saveAutomaticKeepingMinutes(value));
 assert.equal(h.d.readAutomaticKeepingMinutes(),5);
 const set=h.context.GM_setValue;h.context.GM_setValue=()=>{};assert.throws(()=>h.d.saveAutomaticKeepingMinutes(0),/verified/);assert.equal(h.d.readAutomaticKeepingMinutes(),5);
 h.context.GM_setValue=()=>{throw Error('Storage blocked');};assert.throws(()=>h.d.saveAutomaticKeepingMinutes(0),/Storage blocked/);assert.equal(h.d.readAutomaticKeepingMinutes(),5);
 h.context.GM_setValue=set;h.storage.set('tierscope:automatic-keeping:v1','broken');scan(h);assert.equal(count(h),0);assert.match(h.d.automaticLibraryStatus('testroom').error,/settings/);
 h.d.saveAutomaticKeepingMinutes(0);h.d.keepFavoriteSession('testroom',true);assert.equal(count(h),1);
});

test('Stop and room departure respect the minimum; restoring a session preserves its qualifying coverage',()=>{
 for(const action of ['stop','leave']) {
  const h=fresh();scan(h);scan(h,60000);
  if(action==='stop')h.t.stopTracking('manual');
  else {h.context.location=new URL('https://chaturbate.com/otherroom/');h.t.checkUrlChange();}
  assert.equal(count(h),0,action+' cannot force-keep a short session');
 }
 const h=fresh();scan(h);for(let i=0;i<4;i++)scan(h,60000);
 const restored=fresh(h.storage);restored.t.loadSession('testroom');
 restored.advance(4*60000);scan(restored,60000);assert.equal(count(restored),0,'restore marks the interruption as a gap');
 scan(restored,60000);assert.equal(count(restored),1);assert.equal(restored.d.readAutomaticKeepingMinutes(),5);
});
