const test = require('node:test'), assert = require('node:assert/strict');
const {harness, source} = require('./helpers/harness.cjs');
const extra = source.replace('downloadTrackingReport: downloadTrackingReport,', `__favorites:{readModelFavorite,setModelFavorite,changeModelFavorite,keepFavoriteSession,automaticLibraryStatus,readSessionLibrary,captureLiveSessionFile,captureSessionFile,openSessionReplay,createTierScopeBackup,restoreTierScopeBackup,updateLibraryMetadata,removeLibrarySession,buildAcquisitionStatusModel,loadCollapsedRows,roomTotalSeries},downloadTrackingReport: downloadTrackingReport,`);
function fresh(storage = new Map()) { const h = harness(storage, extra); h.t.initPanel(); h.d = h.api.__favorites; return h; }
const clean = value => JSON.parse(JSON.stringify(value));
const records = h => h.d.readSessionLibrary().entries;
function scan(h, count = 4, advance = 0) { h.advance(advance); h.t.sample(count); h.t.saveSession('testroom'); }

test('legacy favorites, migration and imported stars require fresh automatic-keeping consent', () => {
 const h=fresh(); h.d.setModelFavorite('testroom',true); scan(h);
 assert.equal(records(h).length,0); assert.deepEqual(clean(h.d.readModelFavorite('testroom')),{favorite:true,autoKeep:false});
 let confirmations=0;h.context.confirm=message=>{confirmations++;assert.match(message,/automatically keep/);return false;};
 assert.equal(h.d.changeModelFavorite('testroom',true),false);assert.equal(records(h).length,0);
 h.context.confirm=()=>true;h.d.changeModelFavorite('testroom',true);assert.equal(records(h).length,1);
 assert.equal(h.d.readModelFavorite('testroom').autoKeep,true);assert.equal(confirmations,1);
 const backup=clean(h.d.createTierScopeBackup()),other=fresh();other.d.restoreTierScopeBackup(backup,{library:true,highs:false,preferences:false});
 assert.equal(other.d.readModelFavorite('testroom').favorite,true);assert.equal(other.d.readModelFavorite('testroom').autoKeep,false,'backups carry favorites, not consent');
 h.d.changeModelFavorite('testroom');scan(h,8,60000);assert.equal(records(h)[0].archive.session.history.timestamps.length,1,'unfavorite stops updates without deleting kept data');
});

test('first sample is kept immediately; growing checkpoints coalesce and preserve names, notes and stop metadata', () => {
 const h=fresh();h.d.changeModelFavorite('testroom');assert.equal(records(h).length,0);
 scan(h,2);assert.equal(records(h).length,1);
 h.d.updateLibraryMetadata(records(h)[0].id,{title:'My session',notes:'Keep these notes'});
 scan(h,4,10000);assert.equal(records(h)[0].archive.session.history.timestamps.length,1);
 scan(h,6,50000);assert.equal(records(h).length,1);assert.equal(records(h)[0].archive.session.history.timestamps.length,3);
 assert.equal(records(h)[0].title,'My session');assert.equal(records(h)[0].notes,'Keep these notes');
 h.advance(1000);h.t.stopTracking('manual');assert.equal(records(h).length,1);assert(records(h)[0].archive.session.isStopped);
});

test('Replay is never auto-imported; pause, Reset, room departure and new sessions checkpoint the live owner', () => {
 const h=fresh();h.d.changeModelFavorite('testroom');scan(h,2);
 const file=clean(h.d.captureLiveSessionFile());file.room='file_model';h.d.openSessionReplay(file);h.d.changeModelFavorite('file_model');
 assert.equal(records(h).length,1);assert.equal(records(h)[0].archive.room,'testroom');
 scan(h,5,10000);h.t.toggleAutoRefresh(); // pause flushes growth within the checkpoint interval
 assert.equal(records(h)[0].archive.session.history.timestamps.length,2);assert(records(h)[0].archive.session.isPaused);
 h.advance(1000);h.t.resetAllTracking();assert.equal(records(h).length,1);scan(h,7,1000);assert.equal(records(h).length,2,'Reset starts a distinct session');
 scan(h,8,1000);h.context.location=new URL('https://chaturbate.com/otherroom/');h.t.checkUrlChange();
 assert.equal(records(h).find(e=>e.archive.session.history.red.at(-1)===8).archive.room,'testroom','departure saves under old room');
 assert.equal(h.t.state().history.timestamps.length,0);
});

test('storage failures preserve live samples and old copies, show pending state and recover on retry', () => {
 const h=fresh();h.d.changeModelFavorite('testroom');scan(h,2);const original=clean(records(h)[0]);
 const set=h.context.GM_setValue;
 h.context.GM_setValue=(key,value)=>{if(key.startsWith('tierscope:library:v1:'))throw Error('Quota exceeded');set(key,value);};
 scan(h,4,60000);assert.equal(h.t.state().history.timestamps.length,2);assert.deepEqual(clean(records(h)[0]),original);
 assert.match(h.d.automaticLibraryStatus('testroom').error,/Quota/);assert.equal(h.d.buildAcquisitionStatusModel().text,'Library save pending');
 h.context.GM_setValue=set;h.d.keepFavoriteSession('testroom',true);assert.equal(records(h).length,1);assert.equal(records(h)[0].archive.session.history.timestamps.length,2);
 assert.equal(h.d.automaticLibraryStatus('testroom').error,'');
 // Failure of the short-lived session store does not prevent a Library checkpoint.
 h.context.GM_setValue=(key,value)=>{if(key.startsWith('tierscope:session:')||key.startsWith('tierscope:tab:'))throw Error('Session write failed');set(key,value);};
 scan(h,8,60000);assert.equal(records(h)[0].archive.session.history.timestamps.length,3);
});

test('silent dropped writes and a full library never replace a valid automatic checkpoint', () => {
 const h=fresh();h.d.changeModelFavorite('testroom');scan(h,2);const original=clean(records(h)[0]),set=h.context.GM_setValue;
 h.context.GM_setValue=(key,value)=>{if(!key.startsWith('tierscope:library:v1:'))set(key,value);};
 scan(h,3,60000);assert.match(h.d.automaticLibraryStatus('testroom').error,/verified/);assert.deepEqual(clean(records(h)[0]),original);
 h.context.GM_setValue=set;
 h.storage.set('tierscope:library-limits:v1',JSON.stringify({schemaVersion:1,maxSessions:1000,maxMegabytes:1}));
 h.storage.set('tierscope:library:v1:large_damaged','x'.repeat(1024*1024));
 scan(h,4,60000);assert.match(h.d.automaticLibraryStatus('testroom').error,/full/);assert.deepEqual(clean(records(h)[0]),original);
 h.storage.delete('tierscope:library:v1:large_damaged');h.d.keepFavoriteSession('testroom',true);assert.equal(records(h)[0].archive.session.history.timestamps.length,3);
});

test('fresh consent and Reset epochs from another tab take effect before a new Library write', () => {
 const h=fresh();h.d.changeModelFavorite('testroom');scan(h,2);const other=fresh(h.storage);
 other.d.setModelFavorite('testroom',false);scan(h,4,60000);assert.equal(records(h)[0].archive.session.history.timestamps.length,1);
 other.d.setModelFavorite('testroom',true,true);other.t.resetAllTracking();
 const before=JSON.stringify(records(h));scan(h,6,60000);assert.equal(JSON.stringify(records(h)),before,'stale owner cannot checkpoint after another tab reset');
});

test('new default collapses Mods/Anons/Room Total but respects stored row choices; Room Total series is derived without mutation', () => {
 const h=fresh();assert.deepEqual(clean([...h.d.loadCollapsedRows()]),['red','anon','roomTotal']);
 h.storage.set('tierscope:ui:collapsedRows:v1','[]');assert.deepEqual(clean([...h.d.loadCollapsedRows()]),[]);
 h.storage.set('tierscope:ui:collapsedRows:v1','["red","green","female-trans"]');assert.deepEqual(clean([...h.d.loadCollapsedRows()]),['red','green','female-trans']);
 const data=Object.freeze({total:Object.freeze([1,5]),anonymous:Object.freeze([3,4])}), series=h.d.roomTotalSeries(data);
 assert.deepEqual(clean(series),[4,9]);assert.equal(h.d.roomTotalSeries(data),series);assert(Object.isFrozen(series));
});

test('a concurrent note edit during an automatic checkpoint is retained and retry uses the fresh metadata',()=>{
 const h=fresh();h.d.changeModelFavorite('testroom');scan(h,2);const entry=records(h)[0],key='tierscope:library:v1:'+entry.id,set=h.context.GM_setValue;
 let raced=false;h.context.GM_setValue=(k,v)=>{set(k,v);if(!raced&&k.startsWith('tierscope:library:v1:')){raced=true;const old=JSON.parse(h.storage.get(key));old.notes='Edited in another tab';set(key,JSON.stringify(old));}};
 scan(h,5,60000);assert.match(h.d.automaticLibraryStatus('testroom').error,/changed in another tab/);
 assert.equal(records(h).length,1);assert.equal(records(h)[0].notes,'Edited in another tab');assert.equal(records(h)[0].archive.session.history.timestamps.length,1);
 h.context.GM_setValue=set;h.d.keepFavoriteSession('testroom',true);assert.equal(records(h)[0].notes,'Edited in another tab');assert.equal(records(h)[0].archive.session.history.timestamps.length,2);
});

test('a delayed response from the previous room cannot enter the automatic Library',async()=>{
 const h=fresh();h.d.changeModelFavorite('testroom');scan(h,2);let finish;
 h.setResponse(()=>new Promise(resolve=>finish=resolve));const scanPending=h.t.performScanThenReturn();await h.drain();
 h.context.location=new URL('https://chaturbate.com/next_room/');h.t.checkUrlChange();const before=JSON.stringify(records(h));
 finish({ok:true,text:async()=>'5,testroom|o|f|0,viewer|t|m|0'});await scanPending;
 assert.equal(JSON.stringify(records(h)),before);assert.equal(h.t.state().history.timestamps.length,0);
});
