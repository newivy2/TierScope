const test = require('node:test');
const assert = require('node:assert/strict');

async function owner() {
  const api = await import('../src/playback-state.js');
  const root = {playback: null, presentationMode: 'LIVE', sessionFileLoadGeneration: 0};
  const timers = new Map(); let next = 0;
  api.initializePlaybackState(root, {start: fn => {timers.set(++next, fn); return next;}, stop: id => timers.delete(id)});
  const history = {timestamps: [10000, 70000, 3610000], red: [2, 5, 3], breaks: [false, false, true]};
  const options = {url: 'https://chaturbate.com/testroom/', key: 'tierscope:v1:testroom', generation: 1,
    archive: {room: 'testroom', session: {history}},
    snapshot: {history, timeline: [0, 60000, 3600000], highs: {red: [2, 5, 5]}, durationMs: 3600000, replayDurationMs: 2000},
    allTimeState: {highs: {red: {value: 8}}, keys: ['record']}};
  return {api, root, timers, options};
}

test('playback views reject writes and keep independent frozen recordings and high snapshots', async () => {
  const {api, root, options} = await owner();
  const state = api.openOwnedPlayback(options, 0, true);
  for (const field of api.PLAYBACK_FIELDS) assert.equal(Reflect.set(root, field, null), false, field);
  for (const field of Object.keys(state)) assert.equal(Reflect.set(state, field, null), false, field);
  assert.throws(() => state.snapshot.history.red.push(99), TypeError);
  assert.throws(() => state.archive.session.history.timestamps.pop(), TypeError);
  assert.equal(Reflect.set(state.allTimeState.highs.red, 'value', 999), false);
  options.snapshot.history.red[0] = 99;
  options.allTimeState.highs.red.value = 100;
  assert.equal(state.snapshot.history.red[0], 2);
  assert.equal(state.allTimeState.highs.red.value, 8);
  api.seekOwnedPlayback(state, 1, 100);
  assert.equal(root.playback, state, 'the read view keeps its identity across operations');
  assert.equal(state.samplePosition, 1);
  assert.equal(state.positionMs, 60000);
});

test('owned replay preserves equal sample pacing, real gap timing, pause, seek and clock completion', async () => {
  const {api, root, timers, options} = await owner();
  const state = api.openOwnedPlayback(options, 1000, true);
  api.startOwnedPlaybackClock(state, () => {});
  api.startOwnedPlaybackClock(state, () => assert.fail('duplicate timer'));
  assert.equal(timers.size, 1);
  api.advanceOwnedPlayback(state, 1500);
  assert.equal(state.samplePosition, 0.5);
  assert.equal(state.positionMs, 30000);
  api.seekOwnedPlayback(state, 1.5, 2000);
  assert.equal(state.positionMs, 1830000, 'the cursor moves across the recorded gap');
  assert.equal(timers.size, 0);
  assert.equal(api.advanceOwnedPlayback(state, 100000), false);
  api.resumeOwnedPlayback(state, 100000);
  assert.equal(api.changeOwnedPlaybackSpeed(state, 99, 100000), false);
  api.changeOwnedPlaybackSpeed(state, 2, 100000);
  api.startOwnedPlaybackClock(state, () => {});
  api.advanceOwnedPlayback(state, 100250);
  assert.equal(state.samplePosition, 2);
  assert.equal(state.playing, false);
  assert.equal(timers.size, 0);
  api.resumeOwnedPlayback(state, 200000);
  assert.equal(state.samplePosition, 0, 'Play at the end restarts replay');
  api.closeOwnedPlayback();
  assert.equal(root.playback, null);
  assert.equal(root.presentationMode, 'LIVE');
});

test('replacement and close invalidate delayed callbacks and operations on old replay views', async () => {
  const {api, root, timers, options} = await owner();
  const old = api.openOwnedPlayback(options, 1000, true);
  api.startOwnedPlaybackClock(old, () => assert.fail('an old callback reached the coordinator'));
  const lateTick = [...timers.values()][0];
  const current = api.openOwnedPlayback({...options, imported: true}, 2000, false);
  assert.equal(timers.size, 0);
  lateTick();
  assert.equal(api.advanceOwnedPlayback(old, 3000), false);
  assert.equal(api.seekOwnedPlayback(old, 2, 3000), false);
  assert.equal(api.resumeOwnedPlayback(old, 3000), false);
  assert.equal(api.setPlaybackAllTimeState(old, {highs: {red: {value: 999}}}), false);
  assert.equal(root.playback, current);
  assert.equal(current.samplePosition, 0);
  const request = api.nextSessionFileRequest();
  assert.equal(api.nextSessionFileRequest(), request + 1);
  api.closeOwnedPlayback();
  assert.equal(api.pauseOwnedPlayback(current), false);
});
