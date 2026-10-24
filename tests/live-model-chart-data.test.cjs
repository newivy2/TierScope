const test = require('node:test'), assert = require('node:assert/strict');

function archive(room, timestamps, values, breaks = timestamps.map(() => false)) {
    return {room, session: {history: {timestamps, breaks, total: values, anonymous: values.map(() => 5),
        withTokens: values.map(value => Math.floor(value / 2)), red: values.map(() => 1)}}};
}

test('replacing any selected live model reuses its free color without changing other visible models', async () => {
    const {allocateLiveModelColors} = await import('../src/live-model-chart-data.js');
    const rooms = Array.from({length: 12}, (_, index) => 'model_' + index);
    const initial = allocateLiveModelColors(rooms);
    assert.equal(new Set(initial.values()).size, 12);
    for (const removed of [0, 5, 11]) {
        const selected = rooms.filter((_, index) => index !== removed).concat('new_model');
        const next = allocateLiveModelColors(selected, initial);
        assert.equal(next.size, 12); assert.equal(new Set(next.values()).size, 12);
        for (const room of selected.filter(room => room !== 'new_model')) assert.equal(next.get(room), initial.get(room));
        assert.equal(next.get('new_model'), initial.get(rooms[removed]), 'the newcomer uses the vacated color');
        assert.equal(next.has(rooms[removed]), false);
        assert.deepEqual([...initial.keys()], rooms, 'earlier selections remain unchanged');
    }
    assert.equal(allocateLiveModelColors(['alice', 'alice']).size, 1);
    assert.equal(allocateLiveModelColors([], initial).size, 0);
    assert.throws(() => allocateLiveModelColors([...rooms, 'thirteenth']), /twelve/);
    assert.throws(() => allocateLiveModelColors(['']), /named models/);
    const repaired = allocateLiveModelColors(['alice', 'brenda', 'charlie'], new Map([['alice', 3], ['brenda', 3], ['charlie', 99]]));
    assert.equal(repaired.get('alice'), 3); assert.equal(new Set(repaired.values()).size, 3);
});

test('live models align the same instant rather than their individual session starts', async () => {
    const {buildLiveModelSeries} = await import('../src/live-model-chart-data.js');
    const now = Date.UTC(2026, 9, 24, 12, 10), first = now - 120000;
    const a = archive('alice', [first, now], [20, 30]), b = archive('brenda', [first + 60000, now], [50, 60]);
    const result = buildLiveModelSeries([a, b], 'room', {now, windowMs: Infinity});
    assert.equal(result.originAt, first); assert.equal(result.axisMs, 120000);
    assert.deepEqual(result.series[0].times, [0, 120000]); assert.deepEqual(result.series[1].times, [60000, 120000]);
    assert.deepEqual(result.series[0].values, [25, 35]); assert.deepEqual(result.labels, ['alice', 'brenda']);
    assert.deepEqual(buildLiveModelSeries([a], 'withTokens', {now}).series[0].values, [10, 15]);
    assert.equal(a.session.history.timestamps[0], first, 'projection does not alter captured histories');
});

test('live midnight and multi-day samples keep their real chronological positions', async () => {
    const {buildLiveModelSeries} = await import('../src/live-model-chart-data.js');
    const first = Date.UTC(2026, 9, 23, 23, 59), midnight = first + 60000, nextDay = midnight + 86400000;
    const result = buildLiveModelSeries([archive('alice', [first, midnight, nextDay], [1, 2, 3])], 'total', {now: nextDay, windowMs: Infinity});
    assert.deepEqual(result.series[0].times, [0, 60000, 86460000]);
    assert.deepEqual(result.series[0].timestamps, [first, midnight, nextDay]);
    assert.equal(result.axisMs, 86460000);
});

test('live inspection and plotting preserve gaps and never extend the last accepted sample', async () => {
    const {buildLiveModelSeries} = await import('../src/live-model-chart-data.js');
    const {inspectAnalysisSample, buildAnalysisPlot} = await import('../src/analysis-chart-data.js');
    const originAt = Date.UTC(2026, 9, 24, 12), now = originAt + 240000;
    const result = buildLiveModelSeries([archive('alice', [originAt, originAt + 60000, originAt + 180000], [20, 30, 40], [false, false, true])],
        'total', {now, windowMs: Infinity});
    const [series] = result.series;
    assert.equal(inspectAnalysisSample(series, 30000).value, 20, 'a covered interval retains the accepted sample');
    assert.equal(inspectAnalysisSample(series, 120000).kind, 'gap');
    assert.equal(inspectAnalysisSample(series, 180001).kind, 'outside');
    const plot = buildAnalysisPlot(series, 0, result.axisMs, 500);
    assert.equal(plot.points.at(-1).time, 180000);
    assert.equal(plot.points.at(-1).move, true, 'the post-gap sample starts a new path');
    assert.equal(plot.points.some(point => point.time === now - originAt), false);
});

test('recent live windows retain one valid predecessor but no invented endpoint', async () => {
    const {buildLiveModelSeries} = await import('../src/live-model-chart-data.js');
    const {inspectAnalysisSample, buildAnalysisPlot} = await import('../src/analysis-chart-data.js');
    const now = Date.UTC(2026, 9, 24, 12, 10);
    const source = archive('alice', [now - 600000, now - 120000, now - 60000], [10, 20, 30]);
    const result = buildLiveModelSeries([source], 'total', {now, windowMs: 90000});
    assert.equal(result.originAt, now - 90000); assert.equal(result.axisMs, 90000);
    assert.deepEqual(result.series[0].times, [-30000, 30000]);
    assert.equal(inspectAnalysisSample(result.series[0], 0).value, 20);
    assert.equal(inspectAnalysisSample(result.series[0], 30001).kind, 'outside');
    const oldOnly = buildLiveModelSeries([archive('old', [now - 600000], [90])], 'total', {now, windowMs: 90000});
    assert.deepEqual(buildAnalysisPlot(oldOnly.series[0], 0, oldOnly.axisMs, 500).points, []);
});

test('clock discontinuities and future or invalid samples cannot fabricate live connections', async () => {
    const {buildLiveModelSeries} = await import('../src/live-model-chart-data.js');
    const now = Date.UTC(2026, 9, 24, 12, 10), start = now - 120000;
    const data = archive('alice', [start, start + 60000, start + 10000, now, now + 60000], [1, 2, 99, 3, 999]);
    const result = buildLiveModelSeries([data], 'total', {now, windowMs: Infinity});
    assert.deepEqual(result.series[0].timestamps, [start, start + 60000, now]);
    assert.deepEqual(result.series[0].breaks, [false, false, true]);
    assert.equal(result.excludedSamples, 2);
    assert.throws(() => buildLiveModelSeries([data], 'made-up', {now}), /Unknown analysis metric/);
    for (const options of [{now: NaN}, {now: -1}, {now, windowMs: 0}, {now, windowMs: -100}, {now, originAt: now + 1}]) {
        assert.throws(() => buildLiveModelSeries([data], 'total', options), /Invalid live comparison/);
    }
});

test('single samples, equal timestamps and empty live comparisons remain inspectable without extra duration', async () => {
    const {buildLiveModelSeries} = await import('../src/live-model-chart-data.js');
    const {inspectAnalysisSample} = await import('../src/analysis-chart-data.js');
    const now = Date.UTC(2026, 9, 24, 12, 10);
    const result = buildLiveModelSeries([archive('alice', [now, now], [1, 2])], 'total', {now, windowMs: Infinity});
    assert.equal(result.axisMs, 1000);
    assert.equal(inspectAnalysisSample(result.series[0], 0).value, 2);
    assert.equal(inspectAnalysisSample(result.series[0], 1).kind, 'outside');
    const empty = buildLiveModelSeries([], 'room', {now});
    assert.deepEqual(empty.series, []); assert.equal(empty.axisMs, 3600000);
});
