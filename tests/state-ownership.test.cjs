const test = require('node:test');
const assert = require('node:assert/strict');
const {harness, source} = require('./helpers/harness.cjs');
const clean = value => JSON.parse(JSON.stringify(value));
const response = count => '8,testroom|o|f|0,' + Array.from({length: count}, (_, i) => 'viewer_' + i + '|m|m|0').join(',');
const testSource = source.replace('downloadTrackingReport: downloadTrackingReport,', `
  __owner: {runtime, LIVE_SESSION_FIELDS, acceptRoomSnapshot, commitAcceptedSample, abortAcceptedSample,
    resetLiveSession, stopLiveSession, stopTrackingTimer, parseGetChatUserListResponse,
    getSessionSaveState, readAllTimeHighs,
    snapshot: () => Object.fromEntries(LIVE_SESSION_FIELDS.map(key => [key,
      key === 'users' ? Array.from(runtime.users.values()) : runtime[key]])),
    renderer: fn => { updateTrendDisplay = fn; }},
  downloadTrackingReport: downloadTrackingReport,`);
function setup() {
  const h = harness(new Map(), testSource);
  h.o = h.api.__owner;
  h.t.initPanel();
  h.t.startTrackingTimer();
  return h;
}
function candidate(h, count) {
  const parsed = h.o.parseGetChatUserListResponse(response(count));
  return h.o.acceptRoomSnapshot({...parsed, source: 'API', timestamp: h.context.Date.now(), roomTotal: parsed.totalUsers}, 'testroom');
}
function invariant(h) {
  const state = h.o.runtime, history = state.history;
  for (const values of Object.values(history)) assert.equal(values.length, history.timestamps.length);
  for (const [key, high] of Object.entries(state.sessionHighs)) {
    assert(high.value >= Math.max(0, ...history[key]), key + ' peak survives retained history');
  }
  if (state.isStopped) {
    assert.equal(state.isPaused, true);
    assert.equal(state.isAutoRefreshOn, false);
    assert.equal(state.trackingTimerInterval, null);
    assert.equal(state.countdownInterval, null);
  }
}

test('session fields stay readable but cannot be replaced or reconfigured through runtime', () => {
  const h = setup();
  assert.equal(new Set(h.o.LIVE_SESSION_FIELDS).size, 31);
  for (const key of h.o.LIVE_SESSION_FIELDS) {
    const descriptor = Object.getOwnPropertyDescriptor(h.o.runtime, key);
    assert.equal(typeof descriptor.get, 'function', key);
    assert.equal(descriptor.set, undefined, key);
    assert.equal(descriptor.configurable, false, key);
    assert.equal(Reflect.set(h.o.runtime, key, 'accidental write'), false, key);
    assert.equal(Reflect.deleteProperty(h.o.runtime, key), false, key);
  }
  assert.equal(h.o.runtime.users.size, 0);
  assert.equal(h.o.runtime.isStopped, false);
  assert.equal(h.o.runtime.sessionStartedAt, h.context.Date.now());
});

test('sample acceptance groups counts, history, highs and trend baseline; abort restores prior data', () => {
  const h = setup(), before = clean(h.o.snapshot());
  const receipt = candidate(h, 5);
  assert.equal(h.o.runtime.history.red.at(-1), 5);
  assert.equal(h.o.runtime.history.total.at(-1), 6);
  assert.equal(h.o.runtime.history.anonymous.at(-1), 8);
  assert.equal(h.o.runtime.roomTotalHigh, 14);
  assert.equal(h.o.runtime.sessionHighs.red.value, 5);
  assert.equal(h.o.runtime.previousCounts.red, 0, 'render compares with the previous committed sample');
  assert.throws(() => candidate(h, 6), /already pending/);
  assert.equal(h.o.abortAcceptedSample(receipt), true);
  assert.deepEqual(clean(h.o.snapshot()), before);
  assert.equal(h.o.commitAcceptedSample(receipt), false);
  const next = candidate(h, 2);
  assert.equal(h.o.commitAcceptedSample(next), true);
  assert.equal(h.o.runtime.previousCounts.red, 2);
  assert.equal(h.o.abortAcceptedSample(next), false, 'a committed sample cannot be rolled back');
  assert.equal(h.o.commitAcceptedSample(next), false, 'a receipt commits once');
  invariant(h);
});

for (const transition of ['reset', 'navigate', 'stop']) {
  test(transition + ' invalidates a candidate and rejects stale commit/rollback', () => {
    const h = setup();
    h.o.commitAcceptedSample(candidate(h, 2));
    h.advance(60000);
    const pending = candidate(h, 9);
    if (transition === 'stop') h.t.stopTracking('manual');
    else h.o.resetLiveSession(transition);
    const after = clean(h.o.snapshot());
    assert.equal(h.o.commitAcceptedSample(pending), false);
    assert.equal(h.o.abortAcceptedSample(pending), false);
    assert.deepEqual(clean(h.o.snapshot()), after);
    assert.deepEqual(clean(h.o.runtime.history.red), transition === 'stop' ? [2] : []);
    assert.equal(h.o.runtime.sessionHighs.red?.value, transition === 'stop' ? 2 : undefined);
    invariant(h);
  });
}

test('cancelling the timer has no session-data or persistence side effects', async () => {
  const h = setup();
  h.setResponse(response(4)); await h.t.performScanThenReturn();
  h.advance(60000);
  const before = clean(h.o.snapshot()), stored = [...h.storage];
  const interval = h.o.runtime.trackingTimerInterval;
  assert(h.timers.has(interval));
  h.o.stopTrackingTimer();
  assert(!h.timers.has(interval));
  assert.equal(h.o.runtime.trackingTimerInterval, null);
  assert.deepEqual(clean(h.o.snapshot()), before);
  assert.deepEqual([...h.storage], stored);
});

for (const transition of ['reset', 'navigate', 'stop']) {
  test('late API response after ' + transition + ' cannot replace live or replay data', async () => {
    const h = setup();
    h.setResponse(response(2)); await h.t.performScanThenReturn();
    h.advance(60000); h.setResponse(response(3)); await h.t.performScanThenReturn();
    assert(h.t.enterPlayback());
    let resolve;
    h.setResponse(() => new Promise(done => { resolve = done; }));
    const scan = h.t.performScanThenReturn(); await h.drain();
    assert.equal(typeof resolve, 'function');
    if (transition === 'reset') h.t.resetAllTracking();
    if (transition === 'navigate') {
      h.context.location = new URL('https://chaturbate.com/otherroom/');
      h.t.checkUrlChange();
    }
    if (transition === 'stop') h.t.stopTracking('manual');
    const after = clean(h.o.snapshot());
    resolve({ok: true, text: async () => response(99)}); await scan;
    assert.deepEqual(clean(h.o.snapshot()), after);
    assert.equal(h.o.readAllTimeHighs('testroom').highs.red.value, 3);
    assert.equal(h.o.readAllTimeHighs('otherroom').highs.red.value, 0);
    assert.equal(h.o.runtime.isScanning, false);
    invariant(h);
  });
}

test('a renderer-triggered Reset followed by an error cannot resurrect the old session', async () => {
  const h = setup();
  h.setResponse(response(2)); await h.t.performScanThenReturn();
  h.o.renderer(() => {
    h.o.renderer(() => {});
    h.t.resetAllTracking();
    throw new Error('old renderer failed after Reset');
  });
  h.advance(60000); h.setResponse(response(99)); await h.t.performScanThenReturn();
  assert.deepEqual(clean(h.o.runtime.history.red), []);
  assert.equal(h.o.runtime.pendingHistoryGap, false, 'old scan does not mark the new session');
  assert.equal(h.o.runtime.sessionHighs.red?.value ?? 0, 0);
  assert.equal(h.o.readAllTimeHighs('testroom').highs.red.value, 2);
  invariant(h);
});

test('pause, save failure, resume, retry and Stop preserve coherent live data and separate replay', async () => {
  const h = setup();
  h.setResponse(response(2)); await h.t.performScanThenReturn();
  h.advance(60000); h.setResponse(response(3)); await h.t.performScanThenReturn();
  h.t.enterPlayback();
  const playback = h.o.runtime.playback;
  const history = clean(playback.snapshot.history);
  const set = h.context.GM_setValue;
  h.context.GM_setValue = (key, value) => {
    if (key.startsWith('tierscope:tab:')) throw new Error('test save failure');
    return set(key, value);
  };
  h.advance(60000); h.setResponse(response(8)); await h.t.performScanThenReturn();
  assert.equal(h.o.runtime.history.red.at(-1), 8);
  assert.match(h.o.getSessionSaveState('testroom').error, /test save failure/);
  h.t.toggleAutoRefresh();
  const elapsed = h.o.runtime.pausedElapsedTime;
  h.advance(10 * 60000); h.t.toggleAutoRefresh();
  assert.equal(h.context.Date.now() - h.o.runtime.trackingStartTime, elapsed);
  await h.drain();
  assert.equal(h.o.runtime.history.breaks.at(-1), true);
  h.context.GM_setValue = set;
  h.t.saveSession('testroom');
  assert.equal(h.o.getSessionSaveState('testroom').error, '');
  h.advance(60000); h.setResponse(response(4)); await h.t.performScanThenReturn();
  assert.equal(h.o.runtime.history.breaks.at(-1), false);
  assert.equal(h.o.runtime.sessionHighs.red.value, 8);
  assert.equal(h.o.runtime.playback, playback);
  assert.deepEqual(clean(playback.snapshot.history), history);
  h.t.stopTracking('manual');
  const saved = JSON.parse(h.t.readSavedSession('tierscope:v1:testroom'));
  assert.deepEqual(saved.history, clean(h.o.runtime.history));
  assert.equal(saved.isStopped, true);
  invariant(h);
});
