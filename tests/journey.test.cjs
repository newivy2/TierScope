const test=require('node:test'),assert=require('node:assert/strict');
const {harness,source}=require('./helpers/harness.cjs');
const extra=source.replace('downloadTrackingReport: downloadTrackingReport,',`__journey:{journeyState,keepLiveJourneySession,openJourneyReference,buildJourneyModel,resolveSavedReference,readDisclosure,rememberDisclosure,readSessionLibrary,keepSessionInLibrary,removeLibrarySession,readModelFavorite,setModelFavorite,keepFavoriteSession,clearAutomaticLibraryStatus},downloadTrackingReport: downloadTrackingReport,`);
function fresh(){const h=harness(new Map(),extra);h.t.initPanel();return h;}
const clean=value=>JSON.parse(JSON.stringify(value));
test('first scan, manual keeping, new scans and exact view form one honest journey',()=>{
 const h=fresh(),d=h.api.__journey;
 assert.match(d.journeyState().model.text,/Tracking live · Not saved/);assert.equal(d.journeyState().model.canKeep,false);
 assert.match(d.journeyState().model.detail,/first audience scan/);
 h.t.sample(5);assert.equal(d.journeyState().model.canKeep,true);assert.equal(d.journeyState().model.detail,'');
 const result=d.keepLiveJourneySession(),state=d.journeyState();assert.match(state.model.text,/Saved to Library/);assert(state.model.canView);
 assert.equal(d.openJourneyReference(state.saved),result.id);
 h.advance(60000);h.t.sample(8);assert.match(d.journeyState().model.detail,/New scans since this save/);
 const updated=d.keepLiveJourneySession();assert.equal(updated.updated,true);assert.equal(d.readSessionLibrary().count,1);
 assert.equal(d.openJourneyReference(state.saved),updated.id,'verified replacement keeps the link attached to the same logical session');
 assert.equal(d.journeyState().newSamples,false);
});
test('failed keeping leaves live data valid, never claims success, and clears on retry',()=>{
 const h=fresh(),d=h.api.__journey;h.t.sample(4);const before=JSON.stringify(h.t.state().history),set=h.context.GM_setValue;
 h.context.GM_setValue=(key,value)=>{if(key.startsWith('tierscope:library:v1:'))throw new Error('disk full');set(key,value);};
 assert.throws(()=>d.keepLiveJourneySession(),/disk full/);assert.equal(d.journeyState().model.canView,false);
 assert.match(d.journeyState().model.text,/Library save pending/);assert.match(d.journeyState().model.detail,/disk full/);
 assert.equal(JSON.stringify(h.t.state().history),before);assert.equal(d.readSessionLibrary().count,0);
 h.context.GM_setValue=set;d.keepLiveJourneySession();assert.equal(d.journeyState().model.warning,false);assert(d.journeyState().model.canView);
});
test('deleted and unreadable saved records invalidate View without opening a different session',()=>{
 for(const damaged of [false,true]){
  const h=fresh(),d=h.api.__journey;h.t.sample(5);const result=d.keepLiveJourneySession(),reference=d.journeyState().saved;
  if(damaged)h.storage.set('tierscope:library:v1:'+result.id,'{broken');else d.removeLibrarySession(result.id);
  assert.throws(()=>d.openJourneyReference(reference),/removed, changed or cannot be read/);
  h.advance(6000);assert.equal(d.journeyState().model.canView,false);assert.equal(d.journeyState().model.canView,false,'a rejected reference stays rejected between status checks');
  assert.equal(h.t.state().history.red[0],5);
 }
});
test('saving status belongs to the room/session epoch and is cleared on Reset and navigation',()=>{
 const h=fresh(),d=h.api.__journey;h.t.sample(2);d.keepLiveJourneySession();const old=d.journeyState().saved;
 h.t.resetAllTracking();assert.equal(d.journeyState().model.canView,false);assert.equal(d.readSessionLibrary().count,1);
 h.context.location.href='https://chaturbate.com/anotherroom/';h.t.checkUrlChange();
 assert.equal(d.journeyState().room,'anotherroom');assert.equal(d.journeyState().model.canView,false);
 assert.equal(d.openJourneyReference(old),old.id,'saved data remains independently available after Reset');
});
test('automatic keeping confirms the actual saved entry and does not oscillate after another tab deletes it',()=>{
 const h=fresh(),d=h.api.__journey;h.t.sample(3);
 d.setModelFavorite('testroom',true,true);d.keepFavoriteSession('testroom',true);
 const state=d.journeyState();assert.match(state.model.text,/Automatically saved/);assert(state.model.canView);assert.equal(d.openJourneyReference(state.saved),state.saved.id);
 d.removeLibrarySession(state.saved.id);h.advance(6000);assert.equal(d.journeyState().model.canView,false);assert.equal(d.journeyState().model.canView,false);
});
test('replay status identifies the live room and hides live saving actions on the replay view',()=>{
 const model=fresh().api.__journey.buildJourneyModel({room:'live_room',playback:true,samples:10,saved:{savedAt:Date.now()},paused:true});
 assert.match(model.text,/Viewing replay · Live tracking paused in live_room/);assert.equal(model.canView,false);assert.equal(model.canKeep,false);
});
test('same room/start with conflicting samples is not a compatible exact-session replacement',()=>{
 const h=fresh(),d=h.api.__journey;h.t.sample(3);d.keepLiveJourneySession();const reference=d.journeyState().saved;
 const entries=d.readSessionLibrary().entries;
 const conflicting=clean(entries[0]);conflicting.id='different';conflicting.archive.session.history.red[0]=999;
 assert.equal(d.resolveSavedReference(reference,[conflicting],()=>null),null);
});
test('disclosure choices validate keys and survive unavailable browser storage gracefully',()=>{
 const h=fresh(),d=h.api.__journey;assert.equal(d.readDisclosure('librarySearch'),false);
 d.rememberDisclosure('librarySearch',true);assert.equal(d.readDisclosure('librarySearch'),true);
 const keys=h.storage.size;d.rememberDisclosure('arbitrary',true);assert.equal(h.storage.size,keys);
 h.storage.set('tierscope:ui:disclosure:v1:librarySearch','true');assert.equal(d.readDisclosure('librarySearch'),false);
 h.context.GM_setValue=()=>{throw new Error('unavailable');};assert.doesNotThrow(()=>d.rememberDisclosure('librarySearch',false));
});

test('removing a favorite retains the confirmed saved-session link',()=>{
 const h=fresh(),d=h.api.__journey;h.t.sample(3);d.setModelFavorite('testroom',true,true);d.keepFavoriteSession('testroom',true);
 const id=d.journeyState().saved.id;d.setModelFavorite('testroom',false);d.clearAutomaticLibraryStatus('testroom');
 const state=d.journeyState();assert.match(state.model.text,/Saved to Library/);assert.equal(state.automatic,false);assert.equal(d.openJourneyReference(state.saved),id);
});
test('a fresh room does not read the whole Library to paint each incoming scan',()=>{
 const h=fresh(),d=h.api.__journey,list=h.context.GM_listValues;let reads=0;
 h.context.GM_listValues=()=>{reads++;return list();};h.t.sample(2);d.journeyState();h.t.sample(4);d.journeyState();assert.equal(reads,0);
});
test('a restored manual session discovers its existing kept recording without adding copies',()=>{
 const h=fresh(),d=h.api.__journey;h.t.sample(5);d.keepLiveJourneySession();h.t.saveSession('testroom');
 const restored=harness(h.storage,extra);restored.t.initPanel();assert(restored.api.__journey.journeyState().model.canView);assert.equal(restored.api.__journey.readSessionLibrary().count,1);
});
