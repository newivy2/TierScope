const test = require('node:test');
const assert = require('node:assert/strict');
const {harness, source} = require('./helpers/harness.cjs');
const clean = value => JSON.parse(JSON.stringify(value));
const instrumented = source.replace('downloadTrackingReport: downloadTrackingReport,', `
  __persistence: {runtime, writeSessionRecord, inspectStoredSession, getSessionSaveState,
    snapshot: () => Object.fromEntries(LIVE_SESSION_FIELDS.map(key => [key,
      key === 'users' ? Array.from(runtime.users.values()) : runtime[key]]))},
  downloadTrackingReport: downloadTrackingReport,`);
function setup(storage) {
  const h = harness(storage, instrumented); h.p = h.api.__persistence; h.t.initPanel(); return h;
}
async function scan(h, count) {
  h.setResponse('4,testroom|o|f|0,' + Array.from({length: count}, (_, i) => 'v' + i + '|m|m|0').join(','));
  await h.t.performScanThenReturn();
}
const record = h => JSON.parse(h.t.readSavedSession('tierscope:v1:testroom'));

test('record reads and writes return results without controlling live state, replay, DOM or save feedback', async () => {
  const h = setup(); await scan(h, 2); h.advance(60000); await scan(h, 5); h.t.enterPlayback();
  const saved = record(h), before = clean(h.p.snapshot()), playback = h.p.runtime.playback;
  const feedback = clean(h.p.getSessionSaveState('testroom'));
  h.context.document.getElementById = () => assert.fail('storage tried to render');
  h.advance(1000);
  assert.equal(h.p.writeSessionRecord('testroom', saved).status, 'saved');
  assert(h.p.inspectStoredSession('testroom', true).data);
  h.context.GM_setValue = () => {throw new Error('disk full');};
  const failure = h.p.writeSessionRecord('testroom', saved);
  assert.equal(failure.status, 'failed'); assert.match(failure.error, /disk full/);
  assert.deepEqual(clean(h.p.snapshot()), before);
  assert.equal(h.p.runtime.playback, playback);
  assert.deepEqual(clean(h.p.getSessionSaveState('testroom')), feedback, 'the coordinator owns user feedback');
});

test('another tab Reset during replay and an in-flight scan retains local samples without restoring the old epoch', async () => {
  const a = setup(); await scan(a, 2); a.advance(60000); await scan(a, 3); a.t.enterPlayback();
  const playback = a.p.runtime.playback, snapshot = clean(playback.snapshot);
  const b = setup(a.storage);
  let resolve;
  a.setResponse(() => new Promise(done => {resolve = done;}));
  const pending = a.t.performScanThenReturn(); await a.drain();
  b.t.resetAllTracking();
  resolve({ok: true, text: async () => '4,testroom|o|f|0,v0|m|m|0,v1|m|m|0,v2|m|m|0,v3|m|m|0'}); await pending;
  assert.equal(a.p.runtime.history.timestamps.length, 3, 'a different tab Reset preserves this tab’s valid live data');
  assert.match(a.p.runtime.sessionStorageNotice, /Reset in another tab/);
  assert.equal(a.p.runtime.playback, playback);
  assert.deepEqual(clean(playback.snapshot), snapshot);
  assert.equal(record(b).history.timestamps.length, 0, 'old epoch never replaces the reset record');
  const c = setup(a.storage);
  assert.equal(c.p.runtime.history.timestamps.length, 0);
});

test('a previously captured record cannot cross a local Reset or navigation', async () => {
  const h = setup(); await scan(h, 4); const old = record(h);
  h.t.resetAllTracking(); const afterReset = [...h.storage];
  assert.equal(h.p.writeSessionRecord('testroom', old).status, 'stale');
  assert.deepEqual([...h.storage], afterReset);
  h.context.location = new URL('https://chaturbate.com/otherroom/'); h.t.checkUrlChange();
  const afterNavigation = [...h.storage];
  assert.equal(h.p.writeSessionRecord('testroom', old).status, 'inactive');
  assert.deepEqual([...h.storage], afterNavigation);
  assert.equal(h.p.runtime.history.timestamps.length, 0);
});
