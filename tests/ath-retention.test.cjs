const test = require('node:test');
const assert = require('node:assert/strict');
const {harness, source} = require('./helpers/harness.cjs');
const DAY = 86400000, ATH = 'tierscope:ath:v1:', VISIT = 'tierscope:ath-visit:v1:', LEASE = 'tierscope:ath-active:v1:', EPOCH = 'tierscope:ath-epoch:v1:';
const extra = source.replace('downloadTrackingReport: downloadTrackingReport,', `
 __retention:{initializeAthGrace, prepareAthCleanup, applyAthCleanup, ensureAthGrace, noteAthVisit,
 readAthVisit, athActivity, stopAthActivity, observeAthRoom, emptyAllTimeHighs, readAllTimeHighs, storeAllTimeHighs,
 clearInactiveAllTimeHighs, createTierScopeBackup, restoreTierScopeBackup}, downloadTrackingReport: downloadTrackingReport,`);
function make(storage) {const h = harness(storage, extra); h.r = h.api.__retention; return h;}
function seed(h, room, value = 20) {const highs = h.r.emptyAllTimeHighs(); highs.red = {value, time: 1000, source:'live'}; assert.equal(h.r.storeAllTimeHighs(room, highs).saved, true);}
function old(h, room, value = 20) {seed(h,room,value); h.storage.set(VISIT+room, JSON.stringify({schemaVersion:1, graceStartedAt:1000, lastVisitedAt:1000}));}
function plain(value) {return JSON.parse(JSON.stringify(value));}

test('legacy ATH receive one durable 90-day grace period, independent of high date', () => {
 const h=make(); seed(h,'legacy'); h.storage.delete(VISIT+'legacy');
 h.r.initializeAthGrace(); const grace=h.r.readAthVisit('legacy'); assert.equal(grace.graceStartedAt,h.context.Date.now()); assert.equal(grace.lastVisitedAt,null);
 h.advance(90*DAY); assert.equal(h.r.prepareAthCleanup().candidates.length,0);
 h.r.initializeAthGrace(); assert.deepEqual(plain(h.r.readAthVisit('legacy')),plain(grace));
 h.advance(1); assert.equal(h.r.prepareAthCleanup().candidates[0].room,'legacy');
 const restart=make(h.storage); assert.equal(restart.r.readAthVisit('legacy').graceStartedAt,grace.graceStartedAt);
});

test('room visits and paused/stopped heartbeat protect ATH; directories do not acquire leases', () => {
 const h=make(); old(h,'testroom'); h.t.initPanel(); h.t.pauseTrackingTimer(); h.advance(91*DAY);
 h.runTimers(timer => timer.repeat && timer.ms === 60000);
 assert.equal(h.r.readAthVisit('testroom').lastVisitedAt,h.context.Date.now());
 assert.equal(h.r.prepareAthCleanup().candidates.length,0);
 h.context.location=new URL('https://chaturbate.com/female-cams/'); h.r.observeAthRoom();
 assert.equal([...h.storage.keys()].filter(k=>k.startsWith(LEASE)).length,0);
 assert.equal(h.r.readAthVisit('female-cams'),null);
});

test('independent tabs own separate leases and closing one does not unprotect the other', () => {
 const storage=new Map(), a=make(storage), b=make(storage); old(a,'other');
 a.context.location=new URL('https://chaturbate.com/other/'); b.context.location=new URL('https://chaturbate.com/other/');
 a.r.observeAthRoom(); b.r.observeAthRoom(); assert.equal([...storage.keys()].filter(k=>k.startsWith(LEASE)).length,2);
 a.r.stopAthActivity(); assert.equal([...storage.keys()].filter(k=>k.startsWith(LEASE)).length,1);
 a.context.location=new URL('https://chaturbate.com/testroom/'); assert.equal(a.r.prepareAthCleanup().candidates.length,0);
 b.r.stopAthActivity(); a.advance(90*DAY+1); assert.equal(a.r.prepareAthCleanup().candidates[0].room,'other');
});

test('cleanup counts rooms, deletes only eligible ATH, and keeps sessions/preferences', () => {
 const h=make(); old(h,'oldroom'); old(h,'currentroom'); old(h,'testroom'); seed(h,'recent');
 h.storage.set('tierscope:library:test','session'); h.storage.set('tierscope:favorite:test','favorite'); h.storage.set('tierscope:v1:oldroom','live session');
 const plan=h.r.prepareAthCleanup(); assert.deepEqual(Array.from(plan.candidates,c=>c.room).sort(),['currentroom','oldroom']);
 assert.deepEqual(plain(h.r.applyAthCleanup(plan)),{cleared:2,changed:0,failed:0});
 assert.equal(h.r.readAllTimeHighs('oldroom').highs.red.value,0);
 assert.equal(h.r.readAllTimeHighs('testroom').highs.red.value,20); assert.equal(h.r.readAllTimeHighs('recent').highs.red.value,20);
 assert.equal(h.storage.get('tierscope:library:test'),'session'); assert.equal(h.storage.get('tierscope:favorite:test'),'favorite'); assert.equal(h.storage.get('tierscope:v1:oldroom'),'live session');
 assert.equal(h.r.prepareAthCleanup().candidates.length,0);
 // Old-generation records restored by a stale writer cannot revive retired highs.
 const record=JSON.parse(plan.candidates[0].records[0].raw); h.storage.set(ATH+record.room+':initial:late',JSON.stringify(record));
 assert.equal(h.r.readAllTimeHighs(record.room).highs.red.value,0);
});

test('no eligible rooms means no confirmation; cancel preserves all ATH', () => {
 const h=make(); h.t.initPanel(); let calls=0; h.context.confirm=()=>{calls++;return false;};
 h.r.clearInactiveAllTimeHighs(); assert.equal(calls,0); old(h,'oldroom');
 const before=JSON.stringify([...h.storage]); h.r.clearInactiveAllTimeHighs(); assert.equal(calls,1); assert.equal(JSON.stringify([...h.storage]),before);
});

test('visits and ATH writes after the preview skip the room', () => {
 for (const change of ['visit','high']) {
  const h=make(); old(h,'oldroom'); const plan=h.r.prepareAthCleanup();
  if(change==='visit')h.r.noteAthVisit('oldroom','other-tab'); else seed(h,'oldroom',40);
  assert.deepEqual(plain(h.r.applyAthCleanup(plan)),{cleared:0,changed:1,failed:0});
  assert.equal(h.r.readAllTimeHighs('oldroom').highs.red.value,change==='high'?40:20);
 }
});

test('a visit racing generation advancement or final deletion retains the highs', () => {
 for (const point of ['epoch','delete']) {
  const h=make(); old(h,'oldroom'); const plan=h.r.prepareAthCleanup(); let fired=false;
  const set=h.context.GM_setValue, del=h.context.GM_deleteValue;
  h.context.GM_setValue=(key,value)=>{set(key,value);if(point==='epoch'&&key===EPOCH+'oldroom'&&!fired){fired=true;h.r.noteAthVisit('oldroom','racing');}};
  h.context.GM_deleteValue=key=>{del(key);if(point==='delete'&&key.startsWith(ATH+'oldroom:')&&!key.includes(':initial:')&&!fired){fired=true;h.r.noteAthVisit('oldroom','racing');}};
  assert.deepEqual(plain(h.r.applyAthCleanup(plan)),{cleared:0,changed:1,failed:0}); assert.equal(fired,true);
  assert.equal(h.r.readAllTimeHighs('oldroom').highs.red.value,20);
 }
});

test('a writer crossing the generation change retains its unseen higher ATH', () => {
 const h=make(); old(h,'oldroom'); const plan=h.r.prepareAthCleanup(), original=JSON.parse(plan.candidates[0].records[0].raw); let fired=false;
 original.highs.red.value=75; const set=h.context.GM_setValue;
 h.context.GM_setValue=(key,value)=>{set(key,value);if(key===EPOCH+'oldroom'&&!fired){fired=true;set(ATH+'oldroom:initial:concurrent',JSON.stringify(original));}};
 assert.deepEqual(plain(h.r.applyAthCleanup(plan)),{cleared:0,changed:1,failed:0});
 assert.equal(h.r.readAllTimeHighs('oldroom').highs.red.value,75);
});

test('unreadable visit, lease, or ATH records are skipped safely', () => {
 for(const kind of ['visit','lease','ath']) {
  const h=make(); old(h,'oldroom');
  h.storage.set(kind==='visit'?VISIT+'oldroom':kind==='lease'?LEASE+'oldroom:bad':ATH+'oldroom:initial:bad','not JSON');
  const plan=h.r.prepareAthCleanup(); assert.equal(plan.candidates.length,0); assert.equal(plan.skipped,1);
  assert.equal(h.r.readAllTimeHighs('oldroom').highs.red.value,20);
 }
});

test('silent safety/epoch writes and failed deletes preserve the existing ATH', () => {
 for(const fail of ['safety','epoch','delete']) {
  const h=make(); old(h,'oldroom'); const plan=h.r.prepareAthCleanup(); const set=h.context.GM_setValue;
  h.context.GM_setValue=(key,value)=>{if(fail==='safety'&&key.startsWith(ATH))return;if(fail==='epoch'&&key===EPOCH+'oldroom')return;set(key,value);};
  if(fail==='delete')h.context.GM_deleteValue=()=>{};
  assert.deepEqual(plain(h.r.applyAthCleanup(plan)),{cleared:0,changed:0,failed:1});
  assert.equal(h.r.readAllTimeHighs('oldroom').highs.red.value,20);
 }
});

test('silent normal ATH writes cannot compact or claim success', () => {
 const h=make(); seed(h,'room'); h.context.GM_setValue=()=>{};
 const incoming=h.r.emptyAllTimeHighs(); incoming.red={value:90,time:1000,source:'file'};
 const result=h.r.storeAllTimeHighs('room',incoming); assert.equal(result.saved,false); assert.equal(result.state.pending,true);
 assert.equal([...h.storage.keys()].filter(k=>k.startsWith(ATH+'room:')).length,1);
 assert.equal(make(h.storage).r.readAllTimeHighs('room').highs.red.value,20);
});

test('a failed visit write still leaves its independent active-tab marker protective', () => {
 const h=make(); old(h,'oldroom'); const set=h.context.GM_setValue;
 h.context.GM_setValue=(key,value)=>{if(key===VISIT+'oldroom')return;set(key,value);};
 assert.throws(()=>h.r.noteAthVisit('oldroom','active-tab'));
 assert.equal(h.r.prepareAthCleanup().candidates.length,0);
 h.advance(6*60000); assert.equal(h.r.athActivity('oldroom').active,false);
 assert.equal(h.r.prepareAthCleanup().candidates.length,0,'last observed activity still protects the room for 90 days');
});

test('a concurrent current-generation writer aborts cleanup with its higher peak intact', () => {
 const h=make(); old(h,'oldroom'); const plan=h.r.prepareAthCleanup(), set=h.context.GM_setValue;let fired=false;
 h.context.GM_setValue=(key,value)=>{set(key,value);if(key===EPOCH+'oldroom'&&!fired){fired=true;seed(h,'oldroom',80);}};
 assert.deepEqual(plain(h.r.applyAthCleanup(plan)),{cleared:0,changed:1,failed:0});
 assert.equal(h.r.readAllTimeHighs('oldroom').highs.red.value,80);
});

test('failed snapshot deletion can be retried without losing the original highs', () => {
 const h=make();old(h,'oldroom');const del=h.context.GM_deleteValue;
 h.context.GM_deleteValue=()=>{throw new Error('storage unavailable');};
 assert.equal(h.r.applyAthCleanup(h.r.prepareAthCleanup()).failed,1);
 assert.equal(h.r.readAllTimeHighs('oldroom').highs.red.value,20);
 h.context.GM_deleteValue=del;assert.equal(h.r.applyAthCleanup(h.r.prepareAthCleanup()).cleared,1);
 assert.equal(h.r.readAllTimeHighs('oldroom').highs.red.value,0);
});

test('an unreadable storage index reports the problem without deleting anything', () => {
 const h=make();h.t.initPanel();old(h,'oldroom');const before=JSON.stringify([...h.storage]);let confirmations=0;
 h.context.GM_listValues=()=>{throw new Error('index unavailable');};h.context.confirm=()=>{confirmations++;return true;};
 h.r.clearInactiveAllTimeHighs();assert.equal(confirmations,0);assert.equal(JSON.stringify([...h.storage]),before);
 assert.match(h.e('all-time-action-status').textContent,/Could not inspect/);
});


test('backups do not transfer visits; restored ATH get local grace on first inspection', () => {
 const source=make(); source.t.initPanel(); old(source,'archivedroom',50);
 const backup=plain(source.r.createTierScopeBackup());
 assert.equal(JSON.stringify(backup).includes('lastVisitedAt'),false);
 assert.equal(JSON.stringify(backup).includes('graceStartedAt'),false);
 const target=make(); target.r.restoreTierScopeBackup(backup);
 assert.equal(target.r.prepareAthCleanup().candidates.length,0);
 assert.equal(target.r.readAthVisit('archivedroom').graceStartedAt,target.context.Date.now());
 assert.equal(target.r.readAllTimeHighs('archivedroom').highs.red.value,50);
});
