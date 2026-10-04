import { ANALYSIS_METRICS, summarizeSession } from './session-analysis.js';

/** @typedef {import('./session-analysis.js').AnalysisArchive} HistoryArchive */
/** @typedef {{id:string, title:string, archive:HistoryArchive}} HistoryEntry */

// Created for one Library opening. Only immutable library archives are cached;
// derived data contains no archive references and never writes to stored records.
export function createModelHistoryReader() {
    /** @type {WeakMap<HistoryArchive, Map<string, ReturnType<typeof summarizeSession>>>} */
    let cache = new WeakMap();
    /** @param {HistoryArchive} archive @param {string} metric */
    function summary(archive, metric) {
        if (!Object.isFrozen(archive)) return summarizeSession(archive, metric);
        let metrics = cache.get(archive);
        if (!metrics) { metrics = new Map(); cache.set(archive, metrics); }
        if (!metrics.has(metric)) metrics.set(metric, summarizeSession(archive, metric));
        return metrics.get(metric);
    }
    /** @param {HistoryEntry[]} entries @param {string} room @param {string} metric @param {number} limit */
    function read(entries, room, metric = 'room', limit = Infinity) {
        if (!Object.prototype.hasOwnProperty.call(ANALYSIS_METRICS, metric)) throw new Error('Unknown analysis metric.');
        if (limit !== Infinity && (!Number.isSafeInteger(limit) || limit < 1)) throw new Error('Invalid history limit.');
        const matching = entries.filter(entry => entry.archive.room.toLowerCase() === room.toLowerCase())
            .sort((a, b) => a.archive.session.history.timestamps[0] - b.archive.session.history.timestamps[0] || a.id.localeCompare(b.id));
        const selected = limit === Infinity ? matching : matching.slice(-limit);
        let coveredMs = 0, gapMs = 0, weighted = 0, registeredWeight = 0, tokenWeight = 0, latestEnd = -Infinity, overlaps = false;
        /** @type {number|null} */
        let peak = null;
        const recordings = selected.map(entry => {
            const stats = summary(entry.archive, metric), registered = summary(entry.archive, 'total');
            const time = entry.archive.session.history.timestamps[0];
            coveredMs += stats.coveredMs; gapMs += stats.gapMs;
            weighted += (stats.mean || 0) * stats.coveredMs;
            const weight = (registered.mean || 0) * registered.coveredMs;
            registeredWeight += weight; tokenWeight += weight * (registered.tokenShare || 0) / 100;
            peak = peak === null ? stats.peak : Math.max(peak, stats.peak);
            if (time < latestEnd) overlaps = true;
            latestEnd = Math.max(latestEnd, time + stats.spanMs);
            return { id: entry.id, title: entry.title || entry.archive.room, time, ...stats };
        });
        return { room: room.toLowerCase(), metric, totalCount: matching.length, recordings, overlaps,
            coveredMs, gapMs, peak, mean: coveredMs ? weighted / coveredMs : null,
            tokenShare: registeredWeight ? tokenWeight / registeredWeight * 100 : null };
    }
    return { read, clear() { cache = new WeakMap(); } };
}
