const test = require('node:test');
const assert = require('node:assert/strict');
const {harness, source} = require('./helpers/harness.cjs');

const instrumented = source.replace('downloadTrackingReport: downloadTrackingReport,', `
  __replay: {captureSessionFile, openSessionReplay, togglePlayback, scrubPlayback, setPlaybackSpeed,
    state: () => ({index: getPlaybackSampleIndex(playback.snapshot, playback.positionMs, playback.stepIndex),
      position: playback.positionMs, playing: playback.playing, duration: playback.snapshot.replayDurationMs,
      samplePosition: playback.samplePosition, speed: playback.speed,
      frame: getPlaybackFrame(playback.snapshot, playback.positionMs, playback.stepIndex)})},
  downloadTrackingReport: downloadTrackingReport,`);
const clean = value => JSON.parse(JSON.stringify(value));

function recorded(intervals = [60000, 3600000, 300000]) {
  const h = harness(new Map(), instrumented);
  h.t.initPanel();
  h.t.sample(1);
  intervals.forEach((interval, index) => {
    h.advance(interval);
    h.t.sample(index + 2);
  });
  return h;
}

for (const imported of [false, true]) {
  test(`${imported ? 'file' : 'ordinary'} Replay advances evenly across pauses and scan-frequency changes`, () => {
    const h = recorded(), replay = h.api.__replay;
    const history = clean(h.t.state().history);
    if (imported) {
      assert(replay.openSessionReplay(replay.captureSessionFile()));
      assert.equal(replay.state().playing, false, 'files still open paused');
      replay.togglePlayback();
    } else {
      assert(h.t.enterPlayback());
    }
    assert.equal(replay.state().index, 0);
    for (let index = 1; index <= 3; index++) {
      for (let tick = 0; tick < 20; tick++) {
        h.advance(50);
        h.t.tickPlayback();
      }
      const state = replay.state();
      assert.equal(state.index, index, 'recording gaps must not hold playback on one sample');
      assert.equal(state.frame.counts.red, index + 1, 'show exact recorded counts');
      assert.equal(state.frame.timestamp, history.timestamps[index]);
      assert.deepEqual(clean(state.frame.history), history, 'preserve timestamps and gap markers');
    }
    assert.equal(replay.state().playing, false);
    assert.deepEqual(clean(h.t.state().history), history, 'playback must not rewrite live history');
  });
}

test('replay pause, speed changes, scrubbing, and stepping preserve sample progress', () => {
  const h = recorded(), replay = h.api.__replay;
  h.t.enterPlayback();
  h.advance(250);
  replay.setPlaybackSpeed(2);
  h.advance(375);
  h.t.tickPlayback();
  assert.equal(replay.state().index, 1, 'settle elapsed time at the old speed before changing it');
  replay.togglePlayback();
  const paused = clean(replay.state());
  h.advance(600000);
  h.t.tickPlayback();
  assert.deepEqual(clean(replay.state()), paused, 'time spent paused does not advance Replay');
  replay.setPlaybackSpeed(0.5);
  replay.togglePlayback();
  h.advance(2000);
  h.t.tickPlayback();
  assert.equal(replay.state().index, 2);

  replay.scrubPlayback(0.5);
  assert.equal(replay.state().playing, false);
  assert.equal(replay.state().index, 0);
  assert.equal(replay.state().samplePosition, 0.5);
  replay.setPlaybackSpeed(1);
  replay.togglePlayback();
  h.advance(500);
  h.t.tickPlayback();
  assert.equal(replay.state().index, 1, 'resume from the scrubbed sample progress');
  h.t.stepPlayback(1);
  assert.equal(replay.state().index, 2);
  assert.equal(replay.state().playing, false);
  replay.togglePlayback();
  h.advance(1000);
  h.t.tickPlayback();
  assert.equal(replay.state().index, 3);
  assert.equal(replay.state().playing, false);
  replay.togglePlayback();
  assert.equal(replay.state().index, 0, 'playing from the end restarts at the first sample');
});

test('animated gaps advance the chart cursor without adding samples or changing recorded extrema', () => {
  const h = recorded(), history = clean(h.t.state().history);
  const {red, timestamps, breaks} = history;
  const a = h.t.buildChartPlot(red, timestamps, breaks, 100, 1, 0, 0.25);
  const b = h.t.buildChartPlot(red, timestamps, breaks, 100, 1, 0, 0.75);
  assert.equal(a.end, 1);
  assert.equal(b.end, 1);
  assert.equal(a.max, 2, 'next sample must not become an observed high');
  assert(a.continuation.gap);
  assert(b.endTime > a.endTime, 'the chart must advance within the recorded pause');
  assert.equal(a.continuation.value, 2.25);
  assert.equal(b.continuation.value, 2.75);
  assert(a.points.every(point => point.index <= 1 && point.value === red[point.index]));
  assert.deepEqual(clean(h.t.state().history), history);
  const stepped = h.t.buildChartPlot(red, timestamps, breaks, 100, 1, 0, 0);
  assert.equal(stepped.continuation, null, 'an exact sample step has no preview');
});

test('duplicate or backward timestamps remain playable in recorded sample order', () => {
  for (const intervals of [[0, 0, 0], [60000, -60000, 0]]) {
    const h = recorded(intervals), replay = h.api.__replay;
    assert(h.t.enterPlayback());
    assert.equal(replay.state().index, 0);
    assert.equal(h.e('playback-play').disabled, false);
    for (let index = 1; index <= 3; index++) {
      h.advance(1000);
      h.t.tickPlayback();
      assert.equal(replay.state().index, index);
    }
    assert.equal(replay.state().playing, false);
  }
});

test('single samples remain inspectable and dense Replay keeps its thirty-second cap', () => {
  const single = recorded(), replay = single.api.__replay;
  const history = single.t.state().history;
  for (const series of Object.values(history)) series.splice(1);
  single.t.enterPlayback();
  assert.equal(replay.state().index, 0);
  assert.equal(replay.state().playing, false);
  assert.equal(single.e('playback-play').disabled, true);
  assert.equal(single.e('playback-scrubber').disabled, true);

  const dense = recorded(Array(60).fill(1000));
  dense.t.enterPlayback();
  assert.equal(dense.api.__replay.state().duration, 30000);
  dense.advance(15000);
  dense.t.tickPlayback();
  assert.equal(dense.api.__replay.state().index, 30);
  dense.advance(15000);
  dense.t.tickPlayback();
  assert.equal(dense.api.__replay.state().index, 60);
  assert.equal(dense.api.__replay.state().playing, false);
});
