/** @typedef {{timestamps:number[], breaks?:boolean[], [key:string]:number[]|boolean[]|undefined}} AnalysisHistory */
/** @typedef {{room:string, session:{history:AnalysisHistory, roomTotalHigh:number, sessionHighs:Record<string,{value:number}>}}} AnalysisArchive */
export const ANALYSIS_METRICS = Object.freeze({ room: 'Room audience', total: 'Registered viewers', withTokens: 'Viewers with tokens',
    red: 'Moderators', green: 'Fan club', purple: 'Dark purple', pink: 'Light purple', 'dark-blue': 'Dark blue',
    'light-blue': 'Light blue', gray: 'Grey', 'female-trans': 'Female / trans', anonymous: 'Anonymous viewers' });

/** @param {AnalysisArchive} archive @param {string} metric */
export function analysisSeries(archive, metric) {
    if (!Object.prototype.hasOwnProperty.call(ANALYSIS_METRICS, metric)) throw new Error('Unknown analysis metric.');
    const history = archive.session.history;
    const values = metric === 'room' ? /** @type {number[]} */ (history.total).map((v, i) => v + /** @type {number[]} */ (history.anonymous)[i]) : /** @type {number[]} */ (history[metric]);
    const origin = history.timestamps[0];
    const times = history.timestamps.map(time => time - origin);
    for (let i = 0; i < times.length; i++) times[i] = Math.max(0, times[i], i ? times[i - 1] : 0);
    return { times, values, breaks: history.breaks || times.map(() => false) };
}

// Estimates hold each sample until the next accepted sample. Marked gaps,
// duplicate/backward timestamps, and time after the last sample carry no weight.
/** @param {AnalysisArchive} archive @param {string} metric @param {number} threshold @param {number} limitMs */
export function summarizeSession(archive, metric = 'room', threshold = 100, limitMs = Infinity) {
    if (!Number.isFinite(threshold) || threshold < 0 || !(limitMs >= 0)) throw new Error('Invalid summary range or threshold.');
    const { times, values, breaks } = analysisSeries(archive, metric);
    const end = Math.min(times.length ? times[times.length - 1] : 0, limitMs);
    let coveredMs = 0, weighted = 0, registeredWeight = 0, tokenWeight = 0, atOrAboveMs = 0, peak = 0, samples = 0;
    for (let i = 0; i < times.length && times[i] <= end; i++) {
        samples++; peak = Math.max(peak, values[i]);
        if (i + 1 >= times.length || breaks[i + 1]) continue;
        const duration = Math.max(0, Math.min(end, times[i + 1]) - times[i]);
        coveredMs += duration; weighted += duration * values[i];
        registeredWeight += duration * /** @type {number[]} */ (archive.session.history.total)[i];
        tokenWeight += duration * /** @type {number[]} */ (archive.session.history.withTokens)[i];
        if (values[i] >= threshold) atOrAboveMs += duration;
    }
    return { samples, spanMs: end, coveredMs, gapMs: end - coveredMs, peak,
        sessionPeak: metric === 'room' ? archive.session.roomTotalHigh : archive.session.sessionHighs[metric].value,
        mean: coveredMs ? weighted / coveredMs : null,
        tokenShare: registeredWeight ? tokenWeight / registeredWeight * 100 : null,
        atOrAboveMs, coverage: end ? coveredMs / end * 100 : null };
}

/** @param {AnalysisArchive} a @param {AnalysisArchive} b @param {string} metric @param {number} threshold @param {boolean} sharedLength */
export function compareSessions(a, b, metric = 'room', threshold = 100, sharedLength = true) {
    const sa = analysisSeries(a, metric), sb = analysisSeries(b, metric);
    const spanA = sa.times.length ? sa.times[sa.times.length - 1] : 0;
    const spanB = sb.times.length ? sb.times[sb.times.length - 1] : 0;
    const limitMs = sharedLength ? Math.min(spanA, spanB) : Infinity;
    return { a: summarizeSession(a, metric, threshold, limitMs), b: summarizeSession(b, metric, threshold, limitMs),
        limitMs, axisMs: sharedLength ? limitMs : Math.max(spanA, spanB) };
}
