const test = require('node:test');
const assert = require('node:assert/strict');
const {harness, source} = require('./helpers/harness.cjs');
const clean = value => JSON.parse(JSON.stringify(value));
const injected = source.replace('downloadTrackingReport: downloadTrackingReport,', `
 __recovery:{runtime,retrySamplePresentation,readAllTimeHighs,buildTrendDisplayModel,
  replacePainter(fn){const previous=updateTrendDisplay;updateTrendDisplay=fn;return ()=>{updateTrendDisplay=previous;};},
  captureSessionFile,keepSessionInLibrary,readSessionLibrary,createTierScopeBackup,validateTierScopeBackup,
  createLibraryRecoveryExport,restoreTierScopeBackup,rememberAnalysisPreferences,readAnalysisPreferences,
  analysisKey:ANALYSIS_PREFERENCE_KEY},downloadTrackingReport: downloadTrackingReport,`);
function fresh(storage = new Map()) {
  const h = harness(storage, injected); h.r = h.api.__recovery; h.t.initPanel(); return h;
}
const body = count => '8,testroom|o|f|0,' + Array.from({length:count},(_,i)=>'viewer_'+i+'|m|m|0').join(',');
async function scan(h,count) { h.advance(60000); h.setResponse(body(count)); await h.t.performScanThenReturn(); }
const saved = h => JSON.parse(h.t.readSavedSession('tierscope:v1:testroom'));

test('paint failure retains the committed sample, highs and save; redraw retries neither duplicate samples nor create gaps', async()=>{
  const h=fresh();await scan(h,2);
  const restore=h.r.replacePainter(()=>{throw new Error('broken canvas');});
  await scan(h,4);
  assert.deepEqual(clean(h.r.runtime.history.red),[2,4]);
  assert.equal(saved(h).history.red.at(-1),4);
  assert.equal(h.r.readAllTimeHighs('testroom').highs.red.value,4);
  assert.equal(h.r.runtime.previousCounts.red,4);
  assert.equal(h.r.buildTrendDisplayModel().comparison.counts.red,2);
  assert.equal(h.r.runtime.pendingHistoryGap,false);
  assert.equal(h.r.runtime.isScanning,false);
  assert.equal(h.e('acquisition-status').textContent,'Display needs refresh');
  const history=clean(h.r.runtime.history),storage=[...h.storage];
  h.r.retrySamplePresentation();assert.deepEqual(clean(h.r.runtime.history),history);
  restore();h.timers.get(h.r.runtime.freshnessInterval).fn();
  assert.notEqual(h.e('acquisition-status').textContent,'Display needs refresh');
  assert.deepEqual(clean(h.r.runtime.history),history);assert.deepEqual([...h.storage],storage);
  await scan(h,5);assert.deepEqual(clean(h.r.runtime.history.red),[2,4,5]);
  assert.equal(h.r.runtime.history.breaks.at(-1),false);
  assert.equal(h.r.buildTrendDisplayModel().comparison.counts.red,4);
});

test('simultaneous drawing and storage failures keep valid data and report pending saves truthfully', async()=>{
  const h=fresh();await scan(h,2);
  const set=h.context.GM_setValue;
  h.context.GM_setValue=(k,v)=>{if(k.startsWith('tierscope:tab:'))throw new Error('full disk');set(k,v);};
  const restore=h.r.replacePainter(()=>{throw new Error('paint unavailable');});
  await scan(h,4);
  assert.deepEqual(clean(h.r.runtime.history.red),[2,4]);assert.deepEqual(saved(h).history.red,[2]);
  assert.equal(h.e('acquisition-status').textContent,'Session not saved');
  restore();h.r.retrySamplePresentation();assert.equal(h.e('acquisition-status').textContent,'Session not saved');
  h.context.GM_setValue=set;h.t.saveSession('testroom');h.t.updateAcquisitionStatus();
  assert.deepEqual(saved(h).history.red,[2,4]);assert.notEqual(h.e('acquisition-status').textContent,'Session not saved');
});

for(const transition of ['reset','navigate','stop']) test('a '+transition+' during failed painting cannot revive or save the wrong session',async()=>{
  const h=fresh();await scan(h,2);
  const restore=h.r.replacePainter(()=>{
    restore();
    if(transition==='reset')h.t.resetAllTracking();
    if(transition==='navigate'){h.context.location=new URL('https://chaturbate.com/otherroom/');h.t.checkUrlChange();}
    if(transition==='stop')h.t.stopTracking('manual');
    throw new Error('old view failed');
  });
  await scan(h,4);
  assert.deepEqual(clean(h.r.runtime.history.red),transition==='stop'?[2,4]:[]);
  assert.equal(h.r.runtime.pendingHistoryGap,false);
  assert.equal(h.r.readAllTimeHighs('testroom').highs.red.value,4,'sample committed before the transition');
  assert.equal(h.r.readAllTimeHighs('otherroom').highs.red.value,0);
  const snapshot=clean(h.r.runtime.history);h.r.retrySamplePresentation();assert.deepEqual(clean(h.r.runtime.history),snapshot);
  if(transition==='stop'){assert.equal(saved(h).isStopped,true);assert.deepEqual(saved(h).history.red,[2,4]);}
});

test('a pending redraw cannot replace replay or survive reset and room navigation',async()=>{
  const h=fresh();await scan(h,2);await scan(h,3);
  const restore=h.r.replacePainter(()=>{throw new Error('paint unavailable');});await scan(h,4);restore();
  assert(h.t.enterPlayback());const replay=h.r.runtime.playback,position=replay.positionMs;
  const before=clean(replay.snapshot.history);h.r.retrySamplePresentation();
  assert.equal(h.r.runtime.playback,replay);assert.equal(replay.positionMs,position);assert.deepEqual(clean(replay.snapshot.history),before);
  h.t.leavePlayback();h.r.retrySamplePresentation();assert.notEqual(h.e('acquisition-status').textContent,'Display needs refresh');
  const restoreAgain=h.r.replacePainter(()=>{throw new Error('second failure');});await scan(h,5);restoreAgain();
  h.t.resetAllTracking();h.r.retrySamplePresentation();assert.equal(h.r.runtime.history.timestamps.length,0);
  assert.notEqual(h.e('acquisition-status').textContent,'Display needs refresh');
  h.context.location=new URL('https://chaturbate.com/otherroom/');h.t.checkUrlChange();h.r.retrySamplePresentation();
  assert.equal(h.r.runtime.history.timestamps.length,0);
});

test('partial backup preserves healthy recordings, declares omissions, and never removes raw damaged data',async()=>{
  const h=fresh();await scan(h,2);h.r.keepSessionInLibrary(h.r.captureSessionFile());
  const bad='tierscope:library:v1:broken';h.storage.set(bad,'{"broken');const before=[...h.storage];
  assert.throws(()=>h.r.createTierScopeBackup(),/unreadable/);
  const backup=clean(h.r.createTierScopeBackup(true,true));
  assert.equal(backup.library.length,1);assert.deepEqual(backup.recovery.omittedLibraryKeys,[bad]);
  assert.deepEqual(clean(h.r.validateTierScopeBackup(backup)),backup);
  const recovery=clean(h.r.createLibraryRecoveryExport());assert.deepEqual(recovery.records,[{key:bad,value:'{"broken'}]);
  assert.throws(()=>h.r.validateTierScopeBackup(recovery),/not a supported/);
  assert.deepEqual([...h.storage],before);
  const other=fresh();assert.equal(other.r.restoreTierScopeBackup(backup).recordings,1);
  assert.equal(other.r.readSessionLibrary().entries.length,1);assert(!other.storage.has(bad));
  assert.equal(h.r.createTierScopeBackup(false).recovery,undefined);
});

test('one inaccessible library record can be omitted explicitly without enabling writes against unknown capacity',async()=>{
  const h=fresh();await scan(h,2);h.r.keepSessionInLibrary(h.r.captureSessionFile());
  const bad='tierscope:library:v1:unavailable';h.storage.set(bad,'unavailable');const get=h.context.GM_getValue;
  h.context.GM_getValue=(k,d)=>{if(k===bad)throw new Error('read failure');return get(k,d);};
  assert.equal(h.r.createTierScopeBackup(true,true).library.length,1);
  assert.deepEqual(clean(h.r.readSessionLibrary().unavailable),[bad]);
  assert.match(h.r.createLibraryRecoveryExport().records[0].error,/read failure/);
  const before=[...h.storage];assert.throws(()=>h.r.keepSessionInLibrary(h.r.captureSessionFile()),/could not be read/);
  assert.deepEqual([...h.storage],before);
});

test('analysis choices persist across fresh tabs and backup restore; old backups leave them alone',()=>{
  const h=fresh(),values={metric:'withTokens',threshold:40,summaryThresholds:[100,20,20],sharedLength:false};
  h.r.rememberAnalysisPreferences(values);
  const reload=fresh(h.storage);assert.deepEqual(clean(reload.r.readAnalysisPreferences().preferences),{...values,summaryThresholds:[20,100]});
  const backup=clean(h.r.createTierScopeBackup(false));assert.equal(backup.analysisPreferences.metric,'withTokens');
  const other=fresh();other.r.restoreTierScopeBackup(backup);
  assert.equal(other.r.readAnalysisPreferences().preferences.threshold,40);
  delete backup.analysisPreferences;other.r.restoreTierScopeBackup(backup);
  assert.equal(other.r.readAnalysisPreferences().preferences.threshold,40);
  const bad={...values,threshold:-1};assert.throws(()=>h.r.rememberAnalysisPreferences(bad),/Invalid analysis/);
  assert.equal(h.r.readAnalysisPreferences().preferences.threshold,40);
});

test('analysis preferences stay local on storage failure and retry; malformed saved choices do not prevent opening tools',()=>{
  const h=fresh(),set=h.context.GM_setValue;
  h.context.GM_setValue=()=>{throw new Error('disk full');};
  assert.match(h.r.rememberAnalysisPreferences({metric:'red'}).error,/this tab only/);
  assert.equal(h.r.readAnalysisPreferences().preferences.metric,'red');
  h.context.GM_setValue=set;assert.equal(h.r.rememberAnalysisPreferences({threshold:45}).error,'');
  assert.equal(JSON.parse(h.storage.get(h.r.analysisKey)).metric,'red');
  h.storage.set(h.r.analysisKey,'{invalid');const reload=fresh(h.storage);
  assert.equal(reload.r.readAnalysisPreferences().preferences.metric,'room');assert.match(reload.r.readAnalysisPreferences().error,/could not be read/);
});

test('null library values remain visible as damaged records and are included in recovery exports',()=>{
  const h=fresh(),key='tierscope:library:v1:null';h.storage.set(key,null);
  assert.deepEqual(clean(h.r.readSessionLibrary().damaged),[key]);
  assert.deepEqual(clean(h.r.createLibraryRecoveryExport().records),[{key,value:null}]);
  assert.deepEqual(clean(h.r.createTierScopeBackup(true,true).recovery.omittedLibraryKeys),[key]);
});

test('invalid recovery metadata or analysis preferences reject backup restore before writes',()=>{
  const h=fresh(),base=clean(h.r.createTierScopeBackup(false)),before=[...h.storage];
  for(const recovery of [{omittedLibraryKeys:[]},{omittedLibraryKeys:['unrelated-key']},
    {omittedLibraryKeys:['tierscope:library:v1:x','tierscope:library:v1:x']}]) {
    assert.throws(()=>h.r.restoreTierScopeBackup({...base,recovery}),/Invalid partial-backup/);
  }
  assert.throws(()=>h.r.restoreTierScopeBackup({...base,analysisPreferences:{metric:'red'}}),/Invalid analysis/);
  assert.deepEqual([...h.storage],before);
});

test('analysis preferences respect restore selection and participate in failed-restore rollback',()=>{
  const h=fresh();h.r.rememberAnalysisPreferences({metric:'red'});
  const backup=clean(h.r.createTierScopeBackup(false));backup.analysisPreferences.metric='green';backup.preferences.theme='bright';
  h.r.restoreTierScopeBackup(backup,{highs:false,library:false,preferences:false});
  assert.equal(h.r.readAnalysisPreferences().preferences.metric,'red');
  h.storage.set('tierscope:ui:theme:v1','dark');const before=[...h.storage],set=h.context.GM_setValue;
  h.context.GM_setValue=(key,value)=>{if(key===h.r.analysisKey)throw new Error('disk full');set(key,value);};
  assert.throws(()=>h.r.restoreTierScopeBackup(backup),/writes were rolled back/);
  assert.deepEqual([...h.storage],before);
});

test('changing one analysis choice incorporates the other choices saved by another tab',()=>{
  const h=fresh(),other=fresh(h.storage);
  h.r.rememberAnalysisPreferences({metric:'red'});other.r.rememberAnalysisPreferences({threshold:42});
  h.r.rememberAnalysisPreferences({sharedLength:false});
  const preferences=other.r.readAnalysisPreferences().preferences;
  assert.equal(preferences.metric,'red');assert.equal(preferences.threshold,42);assert.equal(preferences.sharedLength,false);
});
