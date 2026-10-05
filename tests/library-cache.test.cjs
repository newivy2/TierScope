const test=require('node:test'),assert=require('node:assert/strict');
const {harness,source}=require('./helpers/harness.cjs');
const clean=value=>JSON.parse(JSON.stringify(value));
const extra=source.replace('downloadTrackingReport: downloadTrackingReport,',`__libraryCache:{createLibraryReader,readSessionLibrary,captureSessionFile,keepSessionInLibrary,renameLibrarySession,removeLibrarySession,createTierScopeBackup,restoreTierScopeBackup,LIBRARY_CACHE_MAX_BYTES,
 countValidations(){let calls=0;const validate=validateSessionFile;validateSessionFile=file=>{calls++;return validate(file);};return ()=>calls;}},downloadTrackingReport: downloadTrackingReport,`);
function fresh(){const h=harness(new Map(),extra);h.d=h.api.__libraryCache;h.t.initPanel();h.t.sample(2);h.advance(60000);h.t.sample(4);return h;}
function seed(h,id='one',room=id,title='Recording '+id){
 const archive=clean(h.d.captureSessionFile());archive.room=room;
 const raw=JSON.stringify({schemaVersion:1,addedAt:h.context.Date.now(),title,archive}),key='tierscope:library:v1:'+id;
 h.storage.set(key,raw);return {key,raw,archive};
}

test('one open Library reuses unchanged validated records, but returns isolated grouping containers',()=>{
 const h=fresh();seed(h);seed(h,'two');const calls=h.d.countValidations(),reader=h.d.createLibraryReader();
 const first=reader.read();assert.equal(calls(),2);const archive=first.entries[0].archive;
 assert(Object.isFrozen(archive));assert(Object.isFrozen(archive.session));assert(Object.isFrozen(archive.session.history.red));assert(Object.isFrozen(archive.session.sessionHighs.red));
 assert.throws(()=>archive.session.history.red.push(999),{name:'TypeError'});
 first.entries[0].title='wrong';first.entries[0].records.length=0;first.entries.length=0;
 const again=reader.read();assert.equal(calls(),2);assert.equal(again.entries.length,2);assert.notEqual(again.entries[0].title,'wrong');assert.equal(again.entries[0].records.length,1);
 assert.equal(again.entries[0].archive,archive);
 reader.clear();reader.read();assert.equal(calls(),4,'closing/clearing releases the cache');
 h.d.createLibraryReader().read();assert.equal(calls(),6,'a new Library starts fresh');
});

test('raw changes, deleted keys, missing values and unreadable values cannot reuse cached recordings',()=>{
 const h=fresh(),one=seed(h),two=seed(h,'two'),reader=h.d.createLibraryReader(),calls=h.d.countValidations();
 reader.read();assert.equal(calls(),2);
 h.storage.set(one.key,JSON.stringify({...JSON.parse(one.raw),title:'Changed elsewhere'}));
 assert.equal(reader.read().entries.find(e=>e.id==='one').title,'Changed elsewhere');assert.equal(calls(),3);
 h.storage.delete(two.key);assert.equal(reader.read().entries.length,1);
 h.storage.set(two.key,two.raw);reader.read();assert.equal(calls(),4,'reappearing key is validated anew');
 const get=h.context.GM_getValue;h.context.GM_getValue=(key,fallback)=>{if(key===one.key)throw Error('cannot read');return get(key,fallback);};
 const unavailable=reader.read();assert.deepEqual(clean(unavailable.unavailable),[one.key]);assert.equal(unavailable.entries.length,1);
 h.context.GM_getValue=get;reader.read();assert.equal(calls(),5);
 h.context.GM_getValue=(key,fallback)=>key===one.key?undefined:get(key,fallback);assert.equal(reader.read().entries.length,1);
 h.context.GM_getValue=get;reader.read();assert.equal(calls(),6);
 h.storage.set(one.key,'{bad');assert.deepEqual(clean(reader.read().damaged),[one.key]);
 h.storage.set(one.key,one.raw);reader.read();assert.equal(calls(),7);
 const list=h.context.GM_listValues;h.context.GM_listValues=()=>{throw Error('list failed');};assert.throws(()=>reader.read(),/list failed/);
 h.context.GM_listValues=list;reader.read();assert.equal(calls(),9,'failed listing discards all cached data');
});

test('cached reads preserve deduplication, fuller updates, titles, restore and capacity accounting',()=>{
 const h=fresh(),one=seed(h,'one','testroom','Keep this name'),reader=h.d.createLibraryReader();
 reader.read();h.storage.set('tierscope:library:v1:duplicate',one.raw);
 assert.deepEqual(clean(reader.read()),clean(h.d.readSessionLibrary()));assert.equal(reader.read().entries.length,1);
 h.advance(60000);h.t.sample(8);h.d.keepSessionInLibrary(h.d.captureSessionFile());
 const updated=reader.read();assert.equal(updated.entries.length,1);assert.equal(updated.entries[0].title,'Keep this name');assert.equal(updated.entries[0].archive.session.history.red.at(-1),8);
 h.d.renameLibrarySession(updated.entries[0].id,'Changed title');assert.equal(reader.read().entries[0].title,'Changed title');
 const backup=h.d.createTierScopeBackup();h.d.removeLibrarySession(reader.read().entries[0].id);assert.equal(reader.read().count,0);
 h.d.restoreTierScopeBackup(backup);assert.deepEqual(clean(reader.read()),clean(h.d.readSessionLibrary()));
 const live=h.t.state().history.red;assert.deepEqual(clean(live),[2,4,8]);
});

test('UTF-8 library size remains exact for non-ASCII titles, including surrogate replacement',()=>{
 const h=fresh();const entry=seed(h,'unicode','testroom','Café 日本 💗 \ud800');
 // Also exercise a literal lone surrogate in a string field ignored by validation.
 const raw=entry.raw.slice(0,-1)+',"extra":"\ud800"}';h.storage.set(entry.key,raw);
 const reader=h.d.createLibraryReader(),expected=new Blob([raw]).size;
 assert.equal(reader.read().bytes,expected);assert.equal(reader.read().bytes,expected);assert.equal(h.d.readSessionLibrary().bytes,expected);
 h.storage.set(entry.key,JSON.stringify({...JSON.parse(entry.raw),title:'短い'}));
 assert.equal(reader.read().bytes,new Blob([h.storage.get(entry.key)]).size);
});

test('the reader bounds cached records without hiding an over-capacity library',()=>{
 const h=fresh(),entry=seed(h);for(let i=1;i<=500;i++)h.storage.set('tierscope:library:v1:extra'+i,JSON.stringify({...JSON.parse(entry.raw),archive:{...entry.archive,room:'extra'+i}}));
 const calls=h.d.countValidations(),reader=h.d.createLibraryReader();assert.equal(reader.read().count,501);assert.equal(calls(),501);
 assert.equal(reader.read().count,501);assert.equal(calls(),502,'only 500 records can be retained in the cache');
});

test('oversized raw records are readable but cannot consume the entire cache budget',()=>{
 const h=fresh(),entry=seed(h),reader=h.d.createLibraryReader();
 h.storage.set('tierscope:library:v1:oversized',JSON.stringify({...JSON.parse(entry.raw),padding:'x'.repeat(h.d.LIBRARY_CACHE_MAX_BYTES),archive:{...entry.archive,room:'huge'}}));
 const calls=h.d.countValidations();assert.equal(reader.read().count,2);assert.equal(calls(),2);
 assert.equal(reader.read().count,2);assert.equal(calls(),3,'oversized record is not retained');
});
