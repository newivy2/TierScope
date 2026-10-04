import { runtime } from './runtime.js';

export function getChartTimes(times) {
    var cached = runtime.chartTimeCache.get(times);
    var last = times.length ? times[times.length - 1] : 0;
    if (cached && cached.length === times.length && cached.last === last && cached.first === times[0]) return cached.axis;
    var axis = [];
    times.forEach(function(time, i) { axis.push(i ? Math.max(axis[i - 1], time) : time); });
    runtime.chartTimeCache.set(times, { length: times.length, first: times[0], last: last, axis: axis });
    return axis;
}

export function getHistoryBreaks(data) {
    if (data.breaks && data.breaks.length === data.timestamps.length) return data.breaks;
    // Legacy records lack pause metadata. Infer only unusually long intervals.
    var times = getChartTimes(data.timestamps), intervals = [];
    for (var i = 1; i < times.length; i++) if (times[i] > times[i - 1]) intervals.push(times[i] - times[i - 1]);
    intervals.sort(function(a, b) { return a - b; });
    var typical = intervals.length ? intervals[Math.floor((intervals.length - 1) / 2)] : 60000;
    var threshold = Math.max(120000, typical * 2 + runtime.API_TIMEOUT_MS);
    return times.map(function(time, i) { return i > 0 && time - times[i - 1] > threshold; });
}
