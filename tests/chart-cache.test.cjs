const test = require('node:test');
const assert = require('node:assert/strict');
const {harness} = require('./helpers/harness.cjs');
const clean = value => JSON.parse(JSON.stringify(value));

test('cached frozen chart samples preserve exact plots, gaps and replay connectors across seeks and windows', () => {
  const h = harness(), n = 10000;
  const values = Array.from({length: n}, (_, i) => i === 4567 ? 9999 : Math.round(100 + Math.sin(i / 17) * 80));
  const times = Array.from({length: n}, (_, i) => 100000 + i * 60000 + (i >= 5000 ? 3600000 : 0));
  times[6000] = times[5999];
  const gaps = times.map((_, i) => i === 5000 || i === 8000);
  const frozenValues = Object.freeze(values.slice()), frozenTimes = Object.freeze(times.slice()), frozenGaps = Object.freeze(gaps.slice());
  for (const width of [1, 105, 280]) for (const end of [9999, 4999, 5000, 1, 9000]) {
    for (const window of [0, 1800000]) for (const progress of [0, .5, 1]) {
      const expected = clean(h.t.buildChartPlot(values, times, gaps, width, end, window, progress));
      const actual = clean(h.t.buildChartPlot(frozenValues, frozenTimes, frozenGaps, width, end, window, progress));
      assert.deepEqual(actual, expected);
    }
  }
  const plot = h.t.buildChartPlot(frozenValues, frozenTimes, frozenGaps, 105, 9999, 0, 0);
  assert.equal(plot.max, 9999); assert(plot.points.some(p => p.index === 4567));
  for (const index of [5000, 8000]) assert(plot.points.some(p => p.index === index && p.move));
  plot.points[0].value = -999;
  assert.equal(h.t.buildChartPlot(frozenValues, frozenTimes, frozenGaps, 105, 9999, 0, 0).points[0].value, values[0]);
  assert.equal(Reflect.set(frozenValues, '0', -999), false);
});

test('mutable chart data remains fresh after edits, appends and history trimming', () => {
  const h = harness(), values = [1, 2, 3], times = [10, 20, 30], gaps = [false, false, false];
  h.t.buildChartPlot(values, times, gaps, 100, 2, 0);
  values[1] = 9; gaps[1] = true;
  let plot = h.t.buildChartPlot(values, times, gaps, 100, 2, 0);
  assert.equal(plot.max, 9); assert(plot.points.find(p => p.index === 1).move);
  values.push(20); times.push(40); gaps.push(false);
  plot = h.t.buildChartPlot(values, times, gaps, 100, 3, 0);
  assert.equal(plot.max, 20); assert.equal(plot.endTime, 40);
  values.shift(); times.shift(); gaps.shift();
  plot = h.t.buildChartPlot(values, times, gaps, 100, 2, 0);
  assert.equal(plot.points[0].value, 9); assert.equal(plot.startTime, 20);
});
