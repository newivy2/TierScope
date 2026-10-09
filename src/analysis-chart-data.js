/** @typedef {{times:number[], values:number[], breaks:boolean[], timestamps:number[]}} InspectionSeries */
/** @param {number[]} times @param {number} time */
export function analysisSampleIndex(times, time) {
    let left = 0, right = times.length;
    while (left < right) { const mid = (left + right) >>> 1; if (times[mid] <= time) left = mid + 1; else right = mid; }
    return left - 1;
}

/** @param {InspectionSeries} series @param {number} time */
export function inspectAnalysisSample(series, time) {
    const index = analysisSampleIndex(series.times, time);
    if (index < 0 || time > series.times.at(-1)) return {kind: 'outside', index: -1, value: null, timestamp: null};
    if (series.times[index] !== time && series.breaks[index + 1]) return {kind: 'gap', index, value: null, timestamp: null};
    return {kind: series.times[index] === time ? 'sample' : 'held', index, value: series.values[index], timestamp: series.timestamps[index]};
}

// Reduce only drawing, keeping each pixel column's first/last and extrema in
// sample order. Flush at gaps so even subpixel pauses stay separate segments.
/** @param {InspectionSeries} series @param {number} start @param {number} end @param {number} width */
export function buildAnalysisPlot(series, start, end, width) {
    const {times, values, breaks} = series;
    /** @type {Array<{time:number,value:number,index:number,move:boolean}>} */
    const points = [];
    let bucket = null, move = true, maximum = 1, last = -1;
    function flush() {
        if (!bucket) return;
        const indices = [bucket.first, bucket.low, bucket.high, bucket.last].sort((a, b) => a - b);
        indices.forEach((index, i) => {
            if (i && index === indices[i - 1]) return;
            points.push({time: Math.max(start, times[index]), value: values[index], index, move}); move = false;
        });
        bucket = null;
    }
    let first = Math.max(0, analysisSampleIndex(times, start));
    while (first > 0 && times[first - 1] === start) first--;
    for (let i = first; i < times.length && times[i] <= end; i++) {
        if (times[i] < start && (i + 1 === times.length || breaks[i + 1])) continue;
        const column = end > start ? Math.floor((Math.max(start, times[i]) - start) / (end - start) * width) : 0;
        if (breaks[i]) { flush(); move = true; }
        if (!bucket || bucket.column !== column) {
            flush(); bucket = {column, first: i, last: i, low: i, high: i};
        } else {
            bucket.last = i;
            if (values[i] < values[bucket.low]) bucket.low = i;
            if (values[i] > values[bucket.high]) bucket.high = i;
        }
        maximum = Math.max(maximum, values[i]); last = i;
    }
    flush();
    if (last >= 0 && last + 1 < times.length && !breaks[last + 1] && times[last + 1] > end && times[last] < end) {
        points.push({time: end, value: values[last], index: last, move: false});
    }
    return {points, maximum};
}

/** @param {number} span @param {number} start @param {number} end @param {number} factor @param {number} anchor */
export function zoomAnalysisWindow(span, start, end, factor, anchor) {
    if (!Number.isFinite(span) || span < 0 || !Number.isFinite(factor) || factor <= 0) throw new Error('Invalid chart range.');
    if (!span) return [0, 0];
    const width = Math.min(span, Math.max(Math.min(1000, span), (end - start) * factor));
    const center = Math.max(start, Math.min(end, anchor));
    const ratio = end > start ? (center - start) / (end - start) : 0.5;
    const left = Math.max(0, Math.min(span - width, center - width * ratio));
    return [left, left + width];
}

// The most recent twelve remain individually readable; older sessions are a
// faint background. Apply background opacity once to their composited layer.
export const COMPARISON_FOREGROUND_COUNT = 12;
export const COMPARISON_BACKGROUND_OPACITY = 0.12;
/** @param {number} rank */
export function comparisonOpacity(rank) {
    return rank < COMPARISON_FOREGROUND_COUNT ? (100 - rank * 5) / 100 : COMPARISON_BACKGROUND_OPACITY;
}

// Preserve A–Z labels and valid source IDs when comparisons reach AA–AD.
/** @param {number} index */
export function comparisonLabel(index) {
    let label = '';
    for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
        label = String.fromCharCode(65 + (value - 1) % 26) + label;
    }
    return label;
}
