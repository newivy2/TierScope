const test=require('node:test');const assert=require('node:assert/strict');
const {harness,source}=require('./helpers/harness.cjs');
const extra=source.replace('downloadTrackingReport: downloadTrackingReport,',`__data:{captureSessionFile,validateSessionFile,keepSessionInLibrary,readSessionLibrary,removeLibrarySession,renameLibrarySession,planLibraryAdditions,
 createTierScopeBackup,validateTierScopeBackup,restoreTierScopeBackup,getSessionSaveState,emptyAllTimeHighs,storeAllTimeHighs,readAllTimeHighs,readDataFile,
 cache:()=>allTimeCache,room:()=>getModelName()}, downloadTrackingReport: downloadTrackingReport,`);
const clean=v=>JSON.parse(JSON.stringify(v));
function fresh(){const h=harness(new Map(),extra);h.t.initPanel();h.t.sample(2);h.advance(60000);h.t.sample(4);return h;}
function archive(h,room='testroom'){const a=clean(h.api.__data.captureSessionFile());a.room=room;return a;}
function peak(h,room,value){const highs=h.api.__data.emptyAllTimeHighs();highs.red={value,time:h.context.Date.now(),source:'live'};return h.api.__data.storeAllTimeHighs(room,highs);}
const snapshot=h=>JSON.stringify([...h.storage.entries()].sort(([a],[b])=>a.localeCompare(b)));
function fillLibrary(h,count){const a=archive(h);for(let i=0;i<count;i++)h.storage.set('tierscope:library:v1:fixture_'+i,
 JSON.stringify({schemaVersion:1,addedAt:h.context.Date.now(),title:'Recording '+i,archive:{...a,room:'room'+i}}));}

test('session save failure is visible, preserves live data and ATH, and clears after a successful retry',async()=>{
 const h=fresh(),set=h.context.GM_setValue;h.context.GM_setValue=(key,value)=>{if(key.startsWith('tierscope:tab:'))throw new Error('disk full');set(key,value);};
 h.t.saveSession('testroom');h.t.updateAcquisitionStatus();assert.equal(h.e('acquisition-status').textContent,'Session not saved');
 assert.equal(h.e('mini-freshness').textContent,'Session not saved');assert.match(h.api.__data.getSessionSaveState('testroom').error,/disk full/);
 assert.equal(h.t.state().history.timestamps.length,2);
 h.context.GM_setValue=set;h.t.saveSession('testroom');h.t.updateAcquisitionStatus();
 assert.equal(h.api.__data.getSessionSaveState('testroom').error,'');assert.notEqual(h.e('acquisition-status').textContent,'Session not saved');
 assert.equal(h.e('acquisition-status').style.color,'');
});
test('library explicitly keeps immutable snapshots, deduplicates exact files, renames and deletes without touching live data or ATH',()=>{
 const h=fresh(),d=h.api.__data;peak(h,'testroom',8);const a=archive(h),history=JSON.stringify(h.t.state().history);
 assert.equal(d.readSessionLibrary().count,0);const saved=d.keepSessionInLibrary(a,'My recording');
 assert.equal(d.keepSessionInLibrary(a).added,false);h.t.sample(6);
 let library=d.readSessionLibrary();assert.equal(library.entries[0].archive.session.history.red.at(-1),4);
 d.renameLibrarySession(saved.id,'Renamed');assert.equal(d.readSessionLibrary().entries[0].title,'Renamed');
 d.removeLibrarySession(saved.id);assert.equal(d.readSessionLibrary().count,0);assert.equal(d.readAllTimeHighs('testroom').highs.red.value,8);
 assert.equal(h.t.state().history.red.at(-1),6);assert.notEqual(JSON.stringify(h.t.state().history),history);
});
test('library enforces count and byte limits without evicting recordings, and preserves unreadable records',()=>{
 const h=fresh(),d=h.api.__data;fillLibrary(h,999);assert.equal(d.keepSessionInLibrary(archive(h,'recording1000')).added,true);
 const before=snapshot(h);assert.throws(()=>d.keepSessionInLibrary(archive(h,'overflow')),/Library full/);assert.equal(snapshot(h),before);
 assert.throws(()=>d.planLibraryAdditions([{archive:archive(h),title:'test'}],{entries:[],count:0,bytes:50*1024*1024}),/Library full/);
 h.storage.set('tierscope:library:v1:damaged','{broken');const list=d.readSessionLibrary();assert.equal(list.damaged.length,1);assert.equal(list.entries.length,1000);
 assert(h.storage.has('tierscope:library:v1:damaged'));assert.throws(()=>d.createTierScopeBackup(),/unreadable/);
 assert.equal(d.createTierScopeBackup(false).library.length,0);
});
test('backup round trip merges per-room ATH, all saved preferences and library records without altering the active session',()=>{
 const source=fresh(),s=source.api.__data;peak(source,'testroom',12);peak(source,'anotherroom',25);
 s.keepSessionInLibrary(archive(source),'Keep me');source.storage.set('tierscope:ui:theme:v1','bright');source.storage.set('tierscope:ui:geometry:v1',JSON.stringify({left:32,top:80,scale:1.2}));
 const backup=clean(s.createTierScopeBackup());assert.equal(backup.rooms.length,2);assert.equal(backup.preferences.theme,'bright');
 const target=fresh(),t=target.api.__data;peak(target,'testroom',40);const history=JSON.stringify(target.t.state().history);
 const result=t.restoreTierScopeBackup(backup);assert.equal(result.recordings,1);assert.equal(result.rooms,1);
 assert.equal(t.readAllTimeHighs('testroom').highs.red.value,40);assert.equal(t.readAllTimeHighs('anotherroom').highs.red.value,25);
 assert.equal(target.storage.get('tierscope:ui:theme:v1'),'bright');assert.equal(t.readSessionLibrary().entries[0].title,'Keep me');
 assert.equal(JSON.stringify(target.t.state().history),history);assert.equal(t.restoreTierScopeBackup(backup).recordings,0);
 assert.equal(t.createTierScopeBackup().preferences.theme,'bright','backup reads restored saved preferences before reload');
});
test('backup validates all records before writing and rejects foreign formats, future versions and arbitrary preference keys',()=>{
 const h=fresh(),d=h.api.__data;peak(h,'testroom',10);const backup=clean(d.createTierScopeBackup());const before=snapshot(h);
 const edits=[b=>b.format='other',b=>b.formatVersion=99,b=>b.rooms.push(b.rooms[0]),b=>b.rooms[0].highs.red.value=-1,
 b=>b.preferences.theme='evil',b=>b.preferences.requests='disable',b=>b.preferences.geometry={left:0,top:0,scale:99},
 b=>b.library.push({title:'bad',archive:{}})];
 for(const edit of edits){const b=clean(backup);edit(b);assert.throws(()=>d.restoreTierScopeBackup(b));assert.equal(snapshot(h),before);}
 const hostile=JSON.parse(JSON.stringify(backup));Object.defineProperty(hostile.preferences,'__proto__',{enumerable:true,value:{bad:true}});
 assert.throws(()=>d.restoreTierScopeBackup(hostile),/Unknown/);assert.equal(snapshot(h),before);
});
test('a failed restore rolls back its own writes at every write boundary, including a write that throws after persisting',()=>{
 const source=fresh();peak(source,'room_a',12);peak(source,'room_b',24);source.api.__data.keepSessionInLibrary(archive(source));
 const backup=clean(source.api.__data.createTierScopeBackup());
 const writes=2+1+Object.keys(backup.preferences).length;
 for(const after of [false,true])for(let failAt=1;failAt<=writes;failAt++){
  const h=fresh(),d=h.api.__data;h.storage.set('tierscope:ui:theme:v1','bright');const before=snapshot(h);const set=h.context.GM_setValue;let n=0;
  h.context.GM_setValue=(key,value)=>{n++;if(n===failAt&&!after)throw new Error('write failed');set(key,value);if(n===failAt&&after)throw new Error('write failed after saving');};
  assert.throws(()=>d.restoreTierScopeBackup(backup),/rolled back/);assert.equal(snapshot(h),before,'write '+failAt+' after='+after);
 }
});
test('restore honors selected categories, preflights capacity, and does not resurrect ATH cleared during restore',()=>{
 const source=fresh();peak(source,'testroom',12);source.api.__data.keepSessionInLibrary(archive(source));const backup=clean(source.api.__data.createTierScopeBackup());
 const target=fresh(),d=target.api.__data;d.restoreTierScopeBackup(backup,{highs:false,preferences:false,library:true});
 assert.equal(d.readAllTimeHighs('testroom').highs.red.source,null);assert.equal(target.storage.has('tierscope:ui:theme:v1'),false);
 const set=target.context.GM_setValue;let once=true;
 target.context.GM_setValue=(key,value)=>{set(key,value);if(once&&key.startsWith('tierscope:ath:v1:')){once=false;set('tierscope:ath-epoch:v1:testroom','cleared-elsewhere');}};
 assert.throws(()=>d.restoreTierScopeBackup(backup),/cleared in another tab/);assert.equal(d.readAllTimeHighs('testroom').highs.red.source,null);
 assert.equal(target.storage.get('tierscope:ath-epoch:v1:testroom'),'cleared-elsewhere');
});
test('unsaved local ATH survives a failed restore and is included in backup',()=>{
 const h=fresh(),d=h.api.__data,set=h.context.GM_setValue;
 h.context.GM_setValue=(key,value)=>{if(key.startsWith('tierscope:ath:v1:'))throw new Error('unavailable');set(key,value);};
 peak(h,'testroom',99);const backup=clean(d.createTierScopeBackup(false));assert.equal(backup.rooms[0].highs.red.value,99);
 backup.rooms[0].highs.red.value=120;assert.throws(()=>d.restoreTierScopeBackup(backup),/Restore failed/);
 assert.equal(d.readAllTimeHighs('testroom').highs.red.value,99);
});
test('file size limits and byte-order marks are handled before parsing',async()=>{
 const d=fresh().api.__data;await assert.rejects(d.readDataFile({size:999,text:async()=>{throw new Error('should not read');}},10),/large/);
 assert.deepEqual(clean(await d.readDataFile({size:10,text:async()=> '\ufeff{"ok":1}'},30)),{ok:1});
 await assert.rejects(d.readDataFile({size:1,text:async()=> 'é'.repeat(30)},40),/large/);
});

test('library retention is independent of session Reset and the three-hour restore window',()=>{
 const h=fresh(),d=h.api.__data,a=archive(h);d.keepSessionInLibrary(a);h.t.saveSession('testroom');h.t.resetAllTracking();
 h.advance(4*60*60000);h.t.readSavedSession('tierscope:v1:testroom');
 assert.equal(d.readSessionLibrary().entries.length,1);assert.deepEqual(clean(d.readSessionLibrary().entries[0].archive),a);
 const newer=clean(a);newer.session.timestamp++;newer.producerVersion='a-newer-export';
 assert.equal(d.keepSessionInLibrary(newer).added,false,'export metadata alone does not duplicate a recording');
});
test('a concurrent library addition cannot overflow the cap or be deleted by this tab',()=>{
 const h=fresh(),d=h.api.__data;fillLibrary(h,999);
 const set=h.context.GM_setValue;const other=JSON.stringify({schemaVersion:1,addedAt:h.context.Date.now(),title:'Other tab',archive:archive(h,'other_tab')});let once=true;
 h.context.GM_setValue=(key,value)=>{set(key,value);if(once&&key.startsWith('tierscope:library:')){once=false;set('tierscope:library:v1:concurrent',other);}};
 assert.throws(()=>d.keepSessionInLibrary(archive(h,'our_new_recording')),/limit reached/);
 const list=d.readSessionLibrary();assert.equal(list.count,1000);assert(list.entries.some(entry=>entry.archive.room==='other_tab'));
 assert(!list.entries.some(entry=>entry.archive.room==='our_new_recording'));
});
test('a full library rejects a restore before ATH or preferences can change',()=>{
 const s=fresh();peak(s,'testroom',500);s.api.__data.keepSessionInLibrary(archive(s));const backup=clean(s.api.__data.createTierScopeBackup());
 const h=fresh(),d=h.api.__data;fillLibrary(h,1000);const before=snapshot(h);
 assert.throws(()=>d.restoreTierScopeBackup(backup),/Library full/);assert.equal(snapshot(h),before);
});
test('a 1000-recording backup round trips, rejects overflow at defaults and accepts it after increasing limits',()=>{
 const s=fresh();fillLibrary(s,1000);const backup=clean(s.api.__data.createTierScopeBackup());assert.equal(backup.library.length,1000);
 const h=fresh(),d=h.api.__data;assert.equal(d.restoreTierScopeBackup(backup).recordings,1000);
 assert.equal(d.readSessionLibrary().count,1000);assert.equal(d.restoreTierScopeBackup(backup).recordings,0);
 const ordered=entries=>entries.sort((a,b)=>a.archive.room.localeCompare(b.archive.room));
 assert.deepEqual(ordered(clean(d.createTierScopeBackup().library)),ordered(backup.library));
 const before=snapshot(h);backup.library.push({...backup.library[0],archive:{...backup.library[0].archive,room:'overflow'}});
 assert.throws(()=>d.restoreTierScopeBackup(backup),/Library full/);assert.equal(snapshot(h),before);
 h.storage.set('tierscope:library-limits:v1',JSON.stringify({schemaVersion:1,maxSessions:2000,maxMegabytes:100}));
 assert.equal(d.restoreTierScopeBackup(backup).recordings,1);assert.equal(d.readSessionLibrary().count,1001);
});
test('restore reports incomplete recovery if storage also refuses rollback',()=>{
 const s=fresh();peak(s,'room_a',10);peak(s,'room_b',20);const backup=clean(s.api.__data.createTierScopeBackup(false));
 const h=fresh(),set=h.context.GM_setValue;let n=0;
 h.context.GM_setValue=(key,value)=>{if(++n===2)throw new Error('write blocked');set(key,value);};
 h.context.GM_deleteValue=()=>{throw new Error('delete blocked');};
 assert.throws(()=>h.api.__data.restoreTierScopeBackup(backup),/Restore incomplete; some changes may remain/);
 assert.equal(h.api.__data.readAllTimeHighs('room_a').highs.red.value,10);
});

test('keeping a growing session updates its entry and name, ignores shorter copies and separates a new session',()=>{
 const h=fresh(),d=h.api.__data,old=archive(h);const first=d.keepSessionInLibrary(old,'Custom name');
 h.advance(60000);h.t.sample(6);const longer=archive(h),updated=d.keepSessionInLibrary(longer);
 assert.equal(updated.updated,true);assert.equal(updated.added,false);assert.equal(d.readSessionLibrary().count,1);
 assert.equal(d.readSessionLibrary().entries[0].title,'Custom name');assert.equal(d.readSessionLibrary().entries[0].archive.session.history.timestamps.length,3);
 assert.equal(h.storage.has('tierscope:library:v1:'+first.id),false,'old snapshot is removed only after the replacement is saved');
 assert.equal(d.keepSessionInLibrary(old).updated,false);assert.equal(d.keepSessionInLibrary(longer).updated,false);assert.equal(d.readSessionLibrary().count,1);
 h.t.resetAllTracking();h.advance(60000);h.t.sample(8);assert.equal(d.keepSessionInLibrary(archive(h)).added,true);assert.equal(d.readSessionLibrary().count,2);
});
test('different counts at the same recorded start remain separate rather than overwriting each other',()=>{
 const h=fresh(),d=h.api.__data,a=archive(h);d.keepSessionInLibrary(a);
 const b=clean(a);b.session.history.red[0]=1;
 assert.equal(d.keepSessionInLibrary(b).added,true);assert.equal(d.readSessionLibrary().count,2);
});
test('concurrent updates show the fullest snapshot even if an older write arrives later',()=>{
 const h=fresh(),d=h.api.__data;d.keepSessionInLibrary(archive(h),'Named');h.advance(60000);h.t.sample(6);const shorter=archive(h);
 h.advance(60000);h.t.sample(8);const longer=archive(h),set=h.context.GM_setValue;let once=true;
 h.context.GM_setValue=(key,value)=>{if(once&&key.startsWith('tierscope:library:')){once=false;
  set('tierscope:library:v1:concurrent',JSON.stringify({schemaVersion:1,addedAt:h.context.Date.now(),title:'Named',archive:longer}));}set(key,value);};
 d.keepSessionInLibrary(shorter);let state=d.readSessionLibrary();assert.equal(state.count,1);assert.equal(state.entries[0].archive.session.history.timestamps.length,4);
 assert.equal(d.keepSessionInLibrary(shorter).updated,false);
 d.renameLibrarySession(state.entries[0].id,'Renamed');state=d.readSessionLibrary();assert.equal(state.entries[0].title,'Renamed');
 d.removeLibrarySession(state.entries[0].id);assert.equal(d.readSessionLibrary().count,0,'deleting removes redundant snapshots too');
});
test('failed updates and backup rollback retain the original recording and its custom name',()=>{
 const h=fresh(),d=h.api.__data;d.keepSessionInLibrary(archive(h),'Preserve me');h.advance(60000);h.t.sample(6);const next=archive(h);
 const before=snapshot(h),set=h.context.GM_setValue;
 h.context.GM_setValue=(key,value)=>{set(key,value);if(key.startsWith('tierscope:library:'))throw new Error('failed after write');};
 assert.throws(()=>d.keepSessionInLibrary(next),/failed after write/);assert.equal(snapshot(h),before);
 h.context.GM_setValue=set;const backup=clean(d.createTierScopeBackup(false));backup.library=[{title:'Incoming title',archive:next}];
 h.context.GM_setValue=(key,value)=>{if(key.startsWith('tierscope:ui:'))throw new Error('preference failed');set(key,value);};
 assert.throws(()=>d.restoreTierScopeBackup(backup),/rolled back/);assert.equal(snapshot(h),before);
 h.context.GM_setValue=set;const result=d.restoreTierScopeBackup(backup);assert.equal(result.recordings,0);assert.equal(result.updatedRecordings,1);
 assert.equal(d.readSessionLibrary().count,1);assert.equal(d.readSessionLibrary().entries[0].title,'Preserve me');
 assert.equal(d.readSessionLibrary().entries[0].archive.session.history.timestamps.length,3);
});
test('a full 1000-entry library can update a session without consuming another recording slot',()=>{
 const h=fresh(),d=h.api.__data;fillLibrary(h,1000);h.advance(60000);h.t.sample(6);
 assert.equal(d.keepSessionInLibrary(archive(h,'room0')).updated,true);assert.equal(d.readSessionLibrary().count,1000);
});
test('updates recognize retained-history rollover without merging unrelated estimated windows',()=>{
 const h=fresh(),d=h.api.__data,a=archive(h);d.keepSessionInLibrary(a);h.advance(60000);h.t.sample(6);const b=archive(h);
 for(const key of Object.keys(b.session.history))b.session.history[key]=b.session.history[key].slice(1);
 assert.equal(d.keepSessionInLibrary(b).updated,true);assert.equal(d.readSessionLibrary().count,1);
 assert.equal(d.readSessionLibrary().entries[0].archive.session.history.red[0],4);
 const c=clean(b);c.session.sessionStartEstimated=true;c.session.history.timestamps=c.session.history.timestamps.map(t=>t+3600000);c.session.timestamp+=3600000;
 assert.equal(d.keepSessionInLibrary(c).added,true,'an estimated start cannot connect non-overlapping windows');assert.equal(d.readSessionLibrary().count,2);
});
