const test = require('node:test'), assert = require('node:assert/strict');
const {harness, source} = require('./helpers/harness.cjs');
const extra = source.replace('downloadTrackingReport: downloadTrackingReport,', `__capacity:{readLibraryLimits,saveLibraryLimits,validateLibraryLimits,libraryCapacityNotice,LIBRARY_LIMITS_KEY,
 captureSessionFile,keepSessionInLibrary,readSessionLibrary,planLibraryAdditions,createTierScopeBackup,restoreTierScopeBackup,validateTierScopeBackup,
 libraryImportBundle,importLibraryBundle,exportLibrarySelection,setModelFavorite,keepFavoriteSession,automaticLibraryStatus},downloadTrackingReport: downloadTrackingReport,`);
const clean = value => JSON.parse(JSON.stringify(value));
function fresh(storage = new Map()) { const h = harness(storage, extra); h.t.initPanel(); h.t.sample(2); h.d = h.api.__capacity; return h; }
const limits = (maxSessions = 1000, maxMegabytes = 50) => ({maxSessions, maxMegabytes});
function archive(h, room = 'testroom') { return {...clean(h.d.captureSessionFile()), room}; }
const snapshot = h => JSON.stringify([...h.storage].sort(([a], [b]) => a.localeCompare(b)));

test('new and existing libraries adopt 1000 sessions / 50 MB without rewriting records; saved limits are local and fresh across tabs', () => {
 const a = fresh(); a.d.keepSessionInLibrary(archive(a)); const before = snapshot(a), b = fresh(a.storage);
 assert.deepEqual(clean(b.d.readLibraryLimits()), limits()); assert.equal(snapshot(a), before);
 a.d.saveLibraryLimits(limits(2500, 100)); assert.deepEqual(clean(b.d.readLibraryLimits()), limits(2500, 100));
 assert.deepEqual(clean(fresh().d.readLibraryLimits()), limits());
 assert.equal(a.d.readSessionLibrary().count, 1);
});

test('invalid or unreadable limits block additions without hiding, deleting or blocking export of existing recordings', () => {
 const h = fresh(); h.d.keepSessionInLibrary(archive(h));
 for (const value of [null, [], {}, limits(0), limits(1.5), limits(10001), limits(10, 0), limits(10, 251), limits(10, NaN), {maxSessions:'1000',maxMegabytes:50}]) {
  const before = snapshot(h); assert.throws(() => h.d.saveLibraryLimits(value), /whole numbers/); assert.equal(snapshot(h), before);
 }
 for (const raw of ['{broken', JSON.stringify({schemaVersion:99,...limits()}), JSON.stringify({schemaVersion:1,...limits(-1)})]) {
  h.storage.set(h.d.LIBRARY_LIMITS_KEY, raw); const before = snapshot(h);
  assert.throws(() => h.d.keepSessionInLibrary(archive(h, 'another')), /limits could not be read/);
  assert.equal(h.d.readSessionLibrary().count, 1); assert.equal(h.d.createTierScopeBackup().library.length, 1); assert.equal(snapshot(h), before);
 }
 h.d.saveLibraryLimits(limits());
 const get = h.context.GM_getValue; h.context.GM_getValue = (key, fallback) => { if (key === h.d.LIBRARY_LIMITS_KEY) throw Error('blocked'); return get(key, fallback); };
 assert.throws(() => h.d.keepSessionInLibrary(archive(h, 'another')), /limits could not be read/);
 assert.equal(h.d.createTierScopeBackup().library.length, 1);
});

test('failed and silently dropped settings writes retain the prior limits; foreign writes are never rolled back', () => {
 for (const mode of ['before', 'after', 'silent', 'foreign']) {
  const h = fresh(); h.d.saveLibraryLimits(limits(8, 5)); const before = snapshot(h), set = h.context.GM_setValue;
  h.context.GM_setValue = (key, value) => {
   if (key !== h.d.LIBRARY_LIMITS_KEY) return set(key, value);
   if (mode === 'before') throw Error('disk full');
   if (mode === 'silent') return;
   if (mode === 'foreign') return set(key, JSON.stringify({schemaVersion:1,...limits(12, 6)}));
   set(key, value); throw Error('failed after saving');
  };
  assert.throws(() => h.d.saveLibraryLimits(limits(10, 10)));
  assert.deepEqual(clean(h.d.readLibraryLimits()), mode === 'foreign' ? limits(12, 6) : limits(8, 5));
  if (mode !== 'foreign') assert.equal(snapshot(h), before);
 }
});

test('lowering limits preserves all sessions; manual saves and automatic checkpoints recover after raising them', () => {
 const h = fresh(); h.d.keepSessionInLibrary(archive(h, 'other')); h.d.setModelFavorite('testroom', true, true); h.d.keepFavoriteSession('testroom', true);
 const original = clean(h.d.readSessionLibrary().entries), live = JSON.stringify(h.t.state().history);
 h.d.saveLibraryLimits(limits(1)); assert.deepEqual(clean(h.d.readSessionLibrary().entries), original);
 assert.throws(() => h.d.keepSessionInLibrary(archive(h, 'new')), /Library full/);
 h.advance(60000); h.t.sample(5); h.d.keepFavoriteSession('testroom', true);
 assert.match(h.d.automaticLibraryStatus('testroom').error, /Library full/); assert.deepEqual(clean(h.d.readSessionLibrary().entries), original);
 assert.notEqual(JSON.stringify(h.t.state().history), live);
 h.d.saveLibraryLimits(limits(2)); h.d.keepFavoriteSession('testroom', true);
 assert.equal(h.d.automaticLibraryStatus('testroom').error, ''); assert.equal(h.d.readSessionLibrary().count, 2);
 assert.equal(h.d.readSessionLibrary().entries.find(e => e.archive.room === 'testroom').archive.session.history.red.at(-1), 5);
});

test('replacement byte checks reserve the old snapshot and recheck changed limits before removing it', () => {
 const h = fresh(); h.d.saveLibraryLimits(limits(10, 1)); h.d.keepSessionInLibrary(archive(h)); h.advance(60000); h.t.sample(5);
 const state = h.d.readSessionLibrary(), next = archive(h), writes = h.d.planLibraryAdditions([{archive:next}], state);
 const replacementBytes = Buffer.byteLength(writes[0].value);
 assert.throws(() => h.d.planLibraryAdditions([{archive:next}], {...state, bytes:1024*1024-replacementBytes+1}), /temporary space/);
 h.d.keepSessionInLibrary(archive(h, 'other')); const prior = clean(h.d.readSessionLibrary().entries), set = h.context.GM_setValue; let once = true;
 h.context.GM_setValue = (key, value) => { set(key, value); if (once && key.startsWith('tierscope:library:v1:')) { once = false; set(h.d.LIBRARY_LIMITS_KEY, JSON.stringify({schemaVersion:1,...limits(1, 1)})); } };
 assert.throws(() => h.d.keepSessionInLibrary(next), /limit reached/);
 assert.deepEqual(clean(h.d.readSessionLibrary().entries), prior); assert.equal(h.d.readLibraryLimits().maxSessions, 1);
});

test('backups and bulk exports stay readable above local limits, while import/restore preflight preserves storage until limits are raised', () => {
 const source = fresh(); source.d.saveLibraryLimits(limits(3));
 for (const room of ['one', 'two', 'three']) source.d.keepSessionInLibrary(archive(source, room));
 source.d.saveLibraryLimits(limits(1)); const backup = clean(source.d.createTierScopeBackup());
 assert.equal(backup.library.length, 3); assert.equal(backup.libraryLimits, undefined, 'device allowance is not restored from a file');
 const exported = source.d.exportLibrarySelection(source.d.readSessionLibrary().entries.map(e => e.id), 'test'); assert.equal(exported.library.length, 3);
 const target = fresh(); target.d.saveLibraryLimits(limits(2)); const before = snapshot(target);
 const bundle = target.d.libraryImportBundle([backup], 'test'); assert.equal(bundle.library.length, 3);
 assert.throws(() => target.d.importLibraryBundle(bundle), /Library full/); assert.equal(snapshot(target), before);
 assert.throws(() => target.d.restoreTierScopeBackup(backup), /Library full/); assert.equal(snapshot(target), before);
 target.d.saveLibraryLimits(limits(3)); assert.equal(target.d.restoreTierScopeBackup(backup).recordings, 3);
 assert.equal(target.d.readLibraryLimits().maxSessions, 3); assert.equal(target.d.restoreTierScopeBackup(backup).recordings, 0);
});

test('capacity notices use either limit, include the 80 percent boundary and avoid false precision for unreadable records', () => {
 const h = fresh(), notice = h.d.libraryCapacityNotice;
 assert.equal(notice({count:799,bytes:0}, limits()), ''); assert.match(notice({count:800,bytes:0}, limits()), /nearing/);
 assert.match(notice({count:0,bytes:40*1024*1024}, limits()), /nearing/);
 assert.match(notice({count:1000,bytes:0}, limits()), /limit reached/);
 assert.match(notice({count:0,bytes:50*1024*1024}, limits()), /limit reached/);
 assert.match(notice({count:0,bytes:0,unavailable:['missing']}, limits()), /incomplete/);
});
