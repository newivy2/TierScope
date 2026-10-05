const test = require('node:test'), assert = require('node:assert/strict');
const clock = import('../src/analysis-clock-data.js');
const hour = 3600000, day = 24 * hour;
const at = (date, h, m = 0) => new Date(2026, 9, date, h, m).getTime();
function source(timestamps, values = timestamps.map((_, i) => 10 * (i + 1)), breaks = timestamps.map(() => false)) {
 return {timestamps, values, breaks, times: timestamps.map(t => t - timestamps[0])};
}
test('clock comparison aligns dates without changing accepted samples or their timestamps', async () => {
 const {projectClockSeries, inspectClockSample, clockTime} = await clock;
 const a = source([at(4, 10), at(4, 11)]), b = source([at(5, 10), at(5, 11)]), [pa, pb] = [a, b].map(projectClockSeries);
 const before = JSON.stringify(a);
 assert.equal(clockTime(a.timestamps[0]), 10 * hour);
 for (const p of [pa, pb]) { assert.deepEqual(p.navigation, [10 * hour, 11 * hour]); assert.equal(inspectClockSample(p, 10.5 * hour).matches[0].kind, 'held'); }
 assert.equal(inspectClockSample(pa, 10 * hour).matches[0].timestamp, a.timestamps[0]);
 assert.equal(inspectClockSample(pb, 10 * hour).matches[0].timestamp, b.timestamps[0]);
 assert.equal(inspectClockSample(pa, 9 * hour).kind, 'outside'); assert.equal(inspectClockSample(pa, 11 * hour + 1).kind, 'outside');
 assert.equal(JSON.stringify(a), before);
});
test('midnight wrap holds only recorded intervals and creates separate right/left paths', async () => {
 const {projectClockSeries, inspectClockSample, buildClockPlot} = await clock;
 const s = source([at(4, 23), at(5, 1), at(5, 2)]), p = projectClockSeries(s);
 assert.equal(p.segments.length, 2); assert.equal(p.segments[0].times.at(-1), day); assert.equal(p.segments[1].times[0], 0);
 assert.deepEqual(p.navigation, [hour, 2 * hour, 23 * hour]);
 for (const t of [0, .5 * hour, 23.5 * hour]) assert.deepEqual(inspectClockSample(p, t).matches, [{kind:'held', index:0, value:10, timestamp:s.timestamps[0]}]);
 assert.deepEqual(inspectClockSample(p, hour).matches, [{kind:'sample', index:1, value:20, timestamp:s.timestamps[1]}]);
 assert.equal(inspectClockSample(p, 12 * hour).kind, 'outside'); assert.equal(inspectClockSample(p, day).kind, 'outside');
 const plot = buildClockPlot(p, 0, day, 200); assert.equal(plot.points.filter(point => point.move).length, 2);
 for (let i = 1; i < plot.points.length; i++) assert(plot.points[i].move || plot.points[i].time >= plot.points[i - 1].time, 'no diagonal across midnight');
 assert.deepEqual(buildClockPlot(p, .25 * hour, .75 * hour, 100).points.map(v => [v.time, v.value, v.move]), [[.25 * hour, 10, true], [.75 * hour, 10, false]]);
});
test('recording gaps wrapping midnight remain blank, with accepted endpoints inspectable', async () => {
 const {projectClockSeries, inspectClockSample, buildClockPlot} = await clock;
 const p = projectClockSeries(source([at(4, 22), at(4, 23), at(5, 1), at(5, 2)], [1, 2, 3, 4], [false, false, true, false]));
 for (const t of [23.5 * hour, 0, .5 * hour]) assert.equal(inspectClockSample(p, t).kind, 'gap');
 assert.equal(inspectClockSample(p, 23 * hour).matches[0].value, 2); assert.equal(inspectClockSample(p, hour).matches[0].value, 3);
 assert.equal(buildClockPlot(p, 0, .5 * hour, 100).points.length, 0);
});
test('exact midnight and duplicate samples retain real indices; backwards timestamps never draw a bridge', async () => {
 const {projectClockSeries, inspectClockSample, buildClockPlot} = await clock;
 const p = projectClockSeries(source([at(4, 23), at(5, 0), at(5, 0), at(5, 1)]));
 assert.deepEqual(inspectClockSample(p, 0).matches.map(v => [v.index, v.value, v.kind]), [[2, 30, 'sample']]);
 assert.equal(p.segments[1].real[0], true);
 const backwards = projectClockSeries(source([at(4, 12), at(4, 13), at(4, 11)]));
 assert(backwards.clockChanged); assert.equal(buildClockPlot(backwards, 0, day, 100).points.filter(v => v.move).length, 2);
});
test('24h limit uses recording extent, known start and active duration, never later export time', async () => {
 const {clockSessionDuration, CLOCK_DAY_MS} = await clock;
 const archive = (times, extra = {}) => ({session:{history:{timestamps:times}, timestamp:at(20, 12), ...extra}});
 assert.equal(CLOCK_DAY_MS, day); assert.equal(clockSessionDuration(archive([100, 100 + day])), day);
 assert.equal(clockSessionDuration(archive([100, 101 + day])), day + 1);
 assert.equal(clockSessionDuration(archive([100 + day, 100 + day + 1], {sessionStartedAt:100})), day + 1);
 assert.equal(clockSessionDuration(archive([0, 100], {pausedElapsedTime:day + 1})), day + 1);
 assert.equal(clockSessionDuration(archive([100, 200])), 100); assert.equal(clockSessionDuration(archive([])), 0);
});
test('empty/single-sample clock charts invent no coverage; reduction keeps peaks and gap boundaries', async () => {
 const {projectClockSeries, inspectClockSample, buildClockPlot} = await clock;
 const empty = projectClockSeries(source([])); assert.equal(inspectClockSample(empty, 0).kind, 'outside'); assert.deepEqual(buildClockPlot(empty, 0, day, 100).points, []);
 const single = projectClockSeries(source([at(4, 12)])); assert.equal(inspectClockSample(single, 12 * hour).matches[0].value, 10); assert.equal(inspectClockSample(single, 12 * hour + 1).kind, 'outside');
 const timestamps = Array.from({length:10000}, (_, i) => at(4, 12) + i), values = timestamps.map((_, i) => i % 17), breaks = timestamps.map(() => false);
 values[4001] = 999; breaks[4003] = true;
 const s = source(timestamps, values, breaks), before = JSON.stringify(s), p = projectClockSeries(s), plot = buildClockPlot(p, 12 * hour, 12 * hour + 9999, 100);
 assert.equal(plot.maximum, 999); assert(plot.points.length < 850); assert.equal(inspectClockSample(p, 12 * hour + 4001).matches[0].value, 999);
 assert.equal(plot.points.filter(v => v.move).length, 2); assert.equal(JSON.stringify(s), before);
});
test('daylight-saving changes split skipped and repeated hours with original dated inspection', () => {
 const {execFileSync} = require('node:child_process'), {pathToFileURL} = require('node:url');
 const url = pathToFileURL(require('node:path').join(__dirname, '../src/analysis-clock-data.js')).href;
 const script = `import {projectClockSeries,inspectClockSample,buildClockPlot} from ${JSON.stringify(url)};
 const make=timestamps=>projectClockSeries({timestamps,times:timestamps.map(t=>t-timestamps[0]),values:[10,20,30,40],breaks:[false,false,false,false]});
 const spring=make(['2026-03-08T01:30:00-05:00','2026-03-08T03:30:00-04:00'].map(Date.parse));
 const fall=make(['2026-11-01T00:30:00-04:00','2026-11-01T01:30:00-04:00','2026-11-01T01:30:00-05:00','2026-11-01T02:30:00-05:00'].map(Date.parse));
 console.log(JSON.stringify({springGap:inspectClockSample(spring,2.5*3600000),springHeld:inspectClockSample(spring,3.25*3600000),springMoves:buildClockPlot(spring,0,86400000,200).points.filter(v=>v.move).length,fall:inspectClockSample(fall,1.5*3600000),fallAfter:inspectClockSample(fall,2*3600000),changed:[spring.clockChanged,fall.clockChanged]}));`;
 const result = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], {env:{...process.env,TZ:'America/New_York'},encoding:'utf8'}));
 assert.equal(result.springGap.kind, 'outside'); assert.equal(result.springHeld.matches[0].value, 10); assert.equal(result.springMoves, 2);
 assert.deepEqual(result.fall.matches.map(v => [v.index, v.value]), [[1, 20], [2, 30]]);
 assert.equal(result.fall.matches[1].timestamp - result.fall.matches[0].timestamp, hour);
 assert.deepEqual(result.fallAfter.matches.map(v => v.value), [30]); assert.deepEqual(result.changed, [true, true]);
});
