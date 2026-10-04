const test=require('node:test'),assert=require('node:assert/strict');
const {harness,source}=require('./helpers/harness.cjs');
const extra=source.replace('downloadTrackingReport: downloadTrackingReport,',`__organization:{captureSessionFile,keepSessionInLibrary,readSessionLibrary,updateLibraryMetadata,renameLibrarySession,libraryImportBundle,importLibraryBundle,exportLibrarySelection,createTierScopeBackup,restoreTierScopeBackup}, downloadTrackingReport: downloadTrackingReport,`);
const clean=value=>JSON.parse(JSON.stringify(value));
function fresh(){const h=harness(new Map(),extra);h.t.initPanel();h.t.sample(2);h.advance(60000);h.t.sample(4);h.d=h.api.__organization;return h;}
const snapshot=h=>JSON.stringify([...h.storage.entries()].sort(([a],[b])=>a.localeCompare(b)));
test('legacy metadata defaults, favorites and multiline notes survive rename, growth, export and restore',()=>{
 const h=fresh(),d=h.d,a=clean(d.captureSessionFile());
 h.storage.set('tierscope:library:v1:legacy',JSON.stringify({schemaVersion:1,addedAt:1,title:'Legacy',archive:a}));
 let entry=d.readSessionLibrary().entries[0];assert.equal(entry.favorite,false);assert.equal(entry.notes,'');
 d.updateLibraryMetadata(entry.id,{favorite:true,notes:'Line 1\n<script>text, not markup</script>'});d.renameLibrarySession(entry.id,'My recording');
 h.advance(60000);h.t.sample(7);d.keepSessionInLibrary(d.captureSessionFile());entry=d.readSessionLibrary().entries[0];
 assert.equal(entry.title,'My recording');assert.equal(entry.favorite,true);assert.match(entry.notes,/Line 1\n/);
 const bundle=clean(d.exportLibrarySelection([entry.id],'test'));assert.deepEqual(bundle.rooms,[]);assert.deepEqual(bundle.preferences,{});assert.equal(bundle.library[0].favorite,true);
 const other=fresh();other.d.importLibraryBundle(bundle);assert.equal(other.d.readSessionLibrary().entries[0].notes,entry.notes);
 const backup=clean(d.createTierScopeBackup()),third=fresh();third.d.restoreTierScopeBackup(backup,{library:true,highs:false,preferences:false});
 assert.equal(third.d.readSessionLibrary().entries[0].favorite,true);
 d.updateLibraryMetadata(entry.id,{notes:'Local newer note'});d.importLibraryBundle(bundle);assert.equal(d.readSessionLibrary().entries[0].notes,'Local newer note','imports preserve existing local metadata');
});
test('metadata validation and failed redundant-record writes preserve originals and foreign writes',()=>{
 const h=fresh(),d=h.d,a=d.captureSessionFile();d.keepSessionInLibrary(a);
 const id=d.readSessionLibrary().entries[0].id;
 for(const patch of [{notes:'x'.repeat(2001)},{notes:'bad\0note'},{favorite:'yes'},{archive:a}])assert.throws(()=>d.updateLibraryMetadata(id,patch));
 const raw=h.storage.get('tierscope:library:v1:'+id);h.storage.set('tierscope:library:v1:duplicate',raw);
 const before=snapshot(h),set=h.context.GM_setValue;let writes=0;
 h.context.GM_setValue=(key,value)=>{if(key.startsWith('tierscope:library:')&&++writes===2)throw Error('disk full');set(key,value);};
 assert.throws(()=>d.updateLibraryMetadata(id,{notes:'new'}),/disk full/);assert.equal(snapshot(h),before);
 h.context.GM_setValue=set;
 let once=true;h.context.GM_setValue=(key,value)=>{
  set(key,value);if(once){once=false;const foreign=JSON.parse(value);foreign.notes='Other tab';set(key,JSON.stringify(foreign));throw Error('late failure');}
 };
 assert.throws(()=>d.updateLibraryMetadata(id,{notes:'my note'}),/late failure/);
 assert([...h.storage.values()].some(raw=>typeof raw==='string'&&raw.includes('Other tab')));
});
test('bulk import validates the complete selection, rolls back failures, deduplicates and never imports ATH/preferences',()=>{
 const h=fresh(),d=h.d,a=clean(d.captureSessionFile()),b={...a,room:'other_room'};
 const before=snapshot(h);
 assert.throws(()=>d.libraryImportBundle([a,{format:'bad'}],'test'));assert.equal(snapshot(h),before);
 const bundle=d.libraryImportBundle([a,b,a],'test');
 const set=h.context.GM_setValue;let calls=0;h.context.GM_setValue=(key,value)=>{if(key.startsWith('tierscope:library:')&&++calls===2)throw Error('disk full');set(key,value);};
 assert.throws(()=>d.importLibraryBundle(bundle),/rolled back/);assert.equal(snapshot(h),before);
 h.context.GM_setValue=set;const result=d.importLibraryBundle(bundle);assert.equal(result.recordings,2);assert.equal(d.readSessionLibrary().entries.length,2);
 const original=clean(d.createTierScopeBackup());original.preferences.theme='bright';
 const incoming=d.libraryImportBundle([original],'test');assert.deepEqual(clean(incoming.rooms),[]);assert.deepEqual(clean(incoming.preferences),{});
 const imported=fresh();imported.d.importLibraryBundle(incoming);assert(!imported.storage.has('tierscope:ui:theme:v1'));
 assert.throws(()=>d.libraryImportBundle([{...original,recovery:{omittedLibraryKeys:['tierscope:library:v1:broken']}}],'test'),/partial backup/);
 assert.throws(()=>d.exportLibrarySelection(['missing'],'test'),/changed/);assert.throws(()=>d.libraryImportBundle([],'test'));
});
