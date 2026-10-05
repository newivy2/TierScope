import { buildAnalysisPlot, inspectAnalysisSample } from './analysis-chart-data.js';

export const CLOCK_DAY_MS = 24 * 60 * 60 * 1000;
/** @typedef {import('./analysis-chart-data.js').InspectionSeries} InspectionSeries */
/** @typedef {InspectionSeries & {indices:number[], real:boolean[]}} ClockSegment */
/** @typedef {{segments:ClockSegment[], gaps:{start:number,end:number}[], navigation:number[], clockChanged:boolean}} ClockProjection */

/** @param {number} timestamp */
export function clockTime(timestamp) {
    const date = new Date(timestamp);
    return ((date.getHours() * 60 + date.getMinutes()) * 60 + date.getSeconds()) * 1000 + date.getMilliseconds();
}

// Exports may be made long after a session finished. Bound recording time using
// samples, the known session start and active duration, never the export date.
/** @param {{session:{history:{timestamps:number[]}, sessionStartedAt?:number|null, pausedElapsedTime?:number}}} archive */
export function clockSessionDuration(archive) {
    const {timestamps} = archive.session.history;
    if (!timestamps.length) return 0;
    let first = Infinity, last = -Infinity;
    for (const time of timestamps) { first = Math.min(first, time); last = Math.max(last, time); }
    const start = archive.session.sessionStartedAt;
    if (typeof start === 'number') first = Math.min(first, start);
    return Math.max(last - first, archive.session.pausedElapsedTime || 0);
}

// Divide a real interval at local midnight and UTC-offset transitions. Within
// each piece the wall clock advances at the same rate as real time. A clock
// jump leaves separate pieces (overlapping for fall-back, blank for spring).
/** @param {number} from @param {number} to */
function clockPieces(from, to) {
    const pieces = [];
    while (from < to) {
        const date = new Date(from), offset = date.getTimezoneOffset();
        date.setHours(24, 0, 0, 0);
        let end = Math.min(to, date.getTime());
        if (new Date(end - 1).getTimezoneOffset() !== offset) {
            let lo = from, hi = end;
            while (hi - lo > 1) {
                const mid = Math.floor((lo + hi) / 2);
                if (new Date(mid).getTimezoneOffset() === offset) lo = mid; else hi = mid;
            }
            end = hi;
        }
        const start = clockTime(from);
        pieces.push({start, end: Math.min(CLOCK_DAY_MS, start + end - from)});
        from = end;
    }
    return pieces;
}

/** @param {InspectionSeries} source @returns {ClockProjection} */
export function projectClockSeries(source) {
    /** @type {ClockProjection} */
    const result = {segments: [], gaps: [], navigation: [], clockChanged: false};
    /** @type {ClockSegment|null} */
    let segment = null;
    function begin() {
        segment = {times: [], values: [], breaks: [], timestamps: [], indices: [], real: []};
        result.segments.push(segment);
    }
    /** @param {number} time @param {number} index @param {boolean} real */
    function add(time, index, real) {
        segment.times.push(time); segment.values.push(source.values[index]); segment.breaks.push(false);
        segment.timestamps.push(source.timestamps[index]); segment.indices.push(index); segment.real.push(real);
    }
    for (let i = 0; i < source.timestamps.length; i++) {
        const current = source.timestamps[i], time = clockTime(current);
        result.navigation.push(time);
        if (!i) { begin(); add(time, i, true); continue; }
        const previous = source.timestamps[i - 1];
        if (current < previous) { result.clockChanged = true; begin(); add(time, i, true); continue; }
        if (current === previous) { if (source.breaks[i]) begin(); add(time, i, true); continue; }
        const pieces = clockPieces(previous, current);
        if (new Date(previous).getTimezoneOffset() !== new Date(current).getTimezoneOffset()) result.clockChanged = true;
        if (source.breaks[i]) {
            result.gaps.push(...pieces); begin(); add(time, i, true); continue;
        }
        pieces.forEach((piece, j) => {
            if (j) { begin(); add(piece.start, i - 1, false); }
            add(piece.end, i - 1, false);
        });
        if (time !== segment.times.at(-1)) begin();
        add(time, i, true);
    }
    result.navigation = [...new Set(result.navigation)].sort((a, b) => a - b);
    return result;
}

/** @param {ClockProjection} projection @param {number} time */
export function inspectClockSample(projection, time) {
    /** @type {Array<{kind:string,index:number,value:number,timestamp:number}>} */
    const matches = [];
    for (const segment of projection.segments) {
        // A synthetic end marks the limit of a held interval, not an accepted
        // sample at the instant a local clock wraps or jumps backwards.
        if (time === segment.times.at(-1) && !segment.real.at(-1)) continue;
        const sample = inspectAnalysisSample(segment, time);
        if (sample.value === null) continue;
        const index = segment.indices[sample.index], timestamp = sample.timestamp;
        const kind = sample.kind === 'sample' && segment.real[sample.index] ? 'sample' : 'held';
        if (!matches.some(match => match.index === index)) matches.push({kind, index, value: sample.value, timestamp});
    }
    return {matches, kind: matches.length ? 'covered' : projection.gaps.some(gap => time >= gap.start && time <= gap.end) ? 'gap' : 'outside'};
}

/** @param {ClockProjection} projection @param {number} start @param {number} end @param {number} width */
export function buildClockPlot(projection, start, end, width) {
    const points = [];
    let maximum = 1;
    for (const segment of projection.segments) {
        if (segment.times[0] > end || segment.times.at(-1) < start) continue;
        const plot = buildAnalysisPlot(segment, start, end, width);
        // Each projected piece is its own path; never connect across midnight,
        // a recording gap or a repeated/skipped local-clock hour.
        points.push(...plot.points); maximum = Math.max(maximum, plot.maximum);
    }
    return {points, maximum};
}
