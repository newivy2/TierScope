const test = require('node:test');
const assert = require('node:assert/strict');
const {harness, source} = require('./helpers/harness.cjs');
const clean = value => JSON.parse(JSON.stringify(value));
const instrumented = source.replace('downloadTrackingReport: downloadTrackingReport,', `
  __display: {runtime, switchHighPreference, buildLiveDisplayFrame, buildPanelDisplayModel, buildTrendDisplayModel,
    paintPanelFrame, renderTrendDisplay, acceptRoomSnapshot, commitAcceptedSample, getPlaybackFrame,
    snapshot: () => Object.fromEntries(LIVE_SESSION_FIELDS.map(key => [key,
      key === 'users' ? Array.from(runtime.users.values()) : runtime[key]]))},
  downloadTrackingReport: downloadTrackingReport,`);
function setup() {
  const h = harness(new Map(), instrumented);
  h.d = h.api.__display; h.t.initPanel(); h.t.startTrackingTimer();
  return h;
}
async function scan(h, count) {
  h.setResponse('4,testroom|o|f|0,' + Array.from({length: count}, (_, i) => 'viewer' + i + '|m|m|0').join(','));
  await h.t.performScanThenReturn();
}
function assertFrozen(value) {
  if (!value || typeof value !== 'object') return;
  assert(Object.isFrozen(value)); Object.values(value).forEach(assertFrozen);
}

test('panel models are immutable snapshots and painting supplied data cannot change live state', async () => {
  const h = setup(); await scan(h, 3);
  const model = h.d.buildPanelDisplayModel(h.d.buildLiveDisplayFrame());
  const trend = h.d.buildTrendDisplayModel();
  assertFrozen(model); assertFrozen(trend);
  assert.notEqual(model.history, h.d.runtime.history);
  assert.throws(() => model.history.red.push(999), {name: 'TypeError'});
  h.advance(60000); await scan(h, 7);
  const before = clean(h.d.snapshot());
  h.d.switchHighPreference();
  assert.equal(h.d.runtime.highMode, 'ath');
  h.d.paintPanelFrame(model); h.d.renderTrendDisplay(trend);
  assert.equal(h.e('count-red').textContent, '3', 'paint uses the supplied earlier sample');
  assert.equal(h.e('high-red').textContent, 'SH:3', 'paint uses the supplied high mode');
  assert.deepEqual(clean(h.d.snapshot()), before);
  assert.deepEqual(clean(model.history.red), [3], 'later live samples cannot change a captured frame');
});

test('room high is accepted with the sample, including DOM totals below observed users, before any paint', () => {
  const h = setup();
  const users = Array.from({length: 5}, (_, i) => ({username: 'u' + i, tier: 'red', gender: 'male'}));
  const receipt = h.d.acceptRoomSnapshot({source: 'DOM', timestamp: h.context.Date.now(), users, roomTotal: 2}, 'testroom');
  assert.equal(h.d.runtime.roomTotalHigh, 5);
  assert.equal(h.d.runtime.roomTotalHighTime, h.context.Date.now());
  h.d.commitAcceptedSample(receipt);
  const before = clean(h.d.snapshot());
  h.advance(60000); h.t.updateDisplay(); h.t.updateDisplay(); h.t.updateTrendDisplay();
  assert.deepEqual(clean(h.d.snapshot()), before, 'repainting cannot set or redate a high');
});

test('replay presentation stays on its captured recording while scans keep advancing live data', async () => {
  const h = setup(); await scan(h, 2); h.advance(60000); await scan(h, 4);
  assert(h.t.enterPlayback());
  const playback = h.d.runtime.playback;
  const frame = h.d.getPlaybackFrame(playback.snapshot, playback.snapshot.durationMs);
  const model = h.d.buildPanelDisplayModel(frame);
  assertFrozen(model);
  assert.equal(model.history, playback.snapshot.history, 'reuse the immutable recording without per-frame history copies');
  h.advance(60000); await scan(h, 9);
  const before = clean(h.d.snapshot());
  h.d.paintPanelFrame(model);
  assert.equal(h.e('count-red').textContent, '4');
  assert.equal(h.e('high-red').textContent, 'SH:4');
  assert.deepEqual(clean(h.d.snapshot()), before);
  h.t.leavePlayback();
  assert.equal(h.e('count-red').textContent, '9');
});
