import { analysisSampleIndex } from './analysis-chart-data.js';
import { analysisSeries } from './session-analysis.js';

/** @typedef {import('./session-analysis.js').AnalysisArchive} AnalysisArchive */
/** @typedef {import('./analysis-chart-data.js').InspectionSeries} InspectionSeries */

// Reserve the slots of models that remain selected before assigning newcomers.
// Unselected models release their slots, so changing a twelve-model comparison
// cannot wrap a new color onto another visible model's color.
/** @param {string[]} rooms @param {Map<string,number>} previous */
export function allocateLiveModelColors(rooms, previous = new Map()) {
    const selected = [...new Set(rooms)];
    if (selected.length > 12 || selected.some(room => typeof room !== 'string' || !room.length)) {
        throw new Error('Choose up to twelve named models for live comparison colors.');
    }
    const colors = new Map(), used = new Set();
    for (const room of selected) {
        const index = previous.get(room);
        if (Number.isSafeInteger(index) && index >= 0 && index < 12 && !used.has(index)) {
            colors.set(room, index); used.add(index);
        }
    }
    for (const room of selected) {
        if (colors.has(room)) continue;
        let index = 0; while (used.has(index)) index++;
        colors.set(room, index); used.add(index);
    }
    return colors;
}

// Live comparisons share actual timestamps. Local midnight and timezone changes
// affect labels only; they never fold different dates onto the same x position.
/** @param {AnalysisArchive[]} archives @param {string} metric
 * @param {{now?:number,windowMs?:number,originAt?:number}} options */
export function buildLiveModelSeries(archives, metric = 'room', options = {}) {
    let latest = 0, earliest = Infinity;
    for (const archive of archives) for (const time of archive.session.history.timestamps) {
        if (!Number.isSafeInteger(time) || time < 0 || time > 8640000000000000) continue;
        latest = Math.max(latest, time); earliest = Math.min(earliest, time);
    }
    const now = options.now === undefined ? latest : options.now;
    const windowMs = options.windowMs === undefined ? 3600000 : options.windowMs;
    if (!Number.isSafeInteger(now) || now < 0 || now > 8640000000000000 ||
        !(windowMs === Infinity || Number.isSafeInteger(windowMs) && windowMs > 0)) throw new Error('Invalid live comparison window.');
    const originAt = options.originAt === undefined ? Math.max(0, windowMs === Infinity ?
        (earliest === Infinity ? now : Math.min(earliest, now)) : now - windowMs) : options.originAt;
    if (!Number.isSafeInteger(originAt) || originAt < 0 || originAt > now) throw new Error('Invalid live comparison origin.');
    let excludedSamples = 0;
    const series = archives.map(archive => {
        const input = analysisSeries(archive, metric), timestamps = archive.session.history.timestamps;
        /** @type {InspectionSeries} */
        const output = {times: [], values: [], breaks: [], timestamps: []};
        let previous = -1, interrupted = false;
        timestamps.forEach((time, index) => {
            const value = input.values[index];
            if (!Number.isSafeInteger(time) || time < 0 || time > now || time < previous ||
                !Number.isSafeInteger(value) || value < 0) {
                excludedSamples++; interrupted = true; return;
            }
            output.times.push(time - originAt); output.values.push(value);
            output.breaks.push(interrupted || !!input.breaks[index]); output.timestamps.push(time);
            previous = time; interrupted = false;
        });
        // Retain at most one predecessor so a covered interval crossing the
        // left edge remains inspectable. Never extend beyond the last sample.
        const first = Math.max(0, analysisSampleIndex(output.times, 0));
        for (const key of ['times', 'values', 'breaks', 'timestamps']) output[key] = output[key].slice(first);
        return output;
    });
    return {series, labels: archives.map(archive => archive.room), originAt, axisMs: Math.max(1000, now - originAt), excludedSamples};
}
