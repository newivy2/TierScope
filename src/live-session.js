
/** @typedef {import('./session-types').LiveSessionState} LiveSessionState */
/** @typedef {import('./session-types').Counts} Counts */
/** @typedef {import('./session-types').History} History */
/** @typedef {import('./session-types').Series} Series */
/** @typedef {import('./session-types').High} High */
/** @typedef {import('./session-types').Snapshot} Snapshot */
/** @typedef {import('./session-types').SampleReceipt} SampleReceipt */
// Live session writes belong here. Other modules receive a read-compatible view
// and request named operations; this module has no DOM, storage, timers or network.
/** @type {ReadonlyArray<keyof LiveSessionState>} */
export const LIVE_SESSION_FIELDS = Object.freeze(['users', 'roomTotal', 'previousUserCount', 'previousRoomTotal', 'previousCounts', 'hasTrendBaseline', 'lastAcceptedAcquisition', 'restoredDisplayFrame', 'history', 'pendingHistoryGap', 'roomTotalHigh', 'roomTotalHighTime', 'tierHighTimes', 'withTokensHighTime', 'totalHighTime', 'anonHighTime', 'femaleTransHighTime', 'sessionStartedAt', 'sessionStartEstimated', 'sessionHighs', 'newHighTiers', 'trackingStartTime', 'isPaused', 'isStopped', 'stoppedAt', 'stopReason', 'broadcasterAbsence', 'absencePausedAt', 'absenceOverrideActive', 'pausedElapsedTime', 'isAutoRefreshOn']);
/** @type {LiveSessionState} */
let liveSessionState;
/** @type {{series: Series[], tiers: import('./session-types').Tier[], maxHistory: number}} */
let sessionConfig;
/** @type {SampleReceipt | null} */
let pendingSample = null;
let sessionRevision = 0;

/** @param {import('./session-types').Bootstrap} target */
export function initializeLiveSession(target) {
    liveSessionState = {
        users: target.users, roomTotal: target.roomTotal, previousUserCount: target.previousUserCount,
        previousRoomTotal: target.previousRoomTotal, previousCounts: target.previousCounts, hasTrendBaseline: target.hasTrendBaseline,
        lastAcceptedAcquisition: target.lastAcceptedAcquisition, restoredDisplayFrame: target.restoredDisplayFrame, history: target.history,
        pendingHistoryGap: target.pendingHistoryGap, roomTotalHigh: target.roomTotalHigh, roomTotalHighTime: target.roomTotalHighTime,
        tierHighTimes: target.tierHighTimes, withTokensHighTime: target.withTokensHighTime, totalHighTime: target.totalHighTime,
        anonHighTime: target.anonHighTime, femaleTransHighTime: target.femaleTransHighTime, sessionStartedAt: target.sessionStartedAt,
        sessionStartEstimated: target.sessionStartEstimated, sessionHighs: target.sessionHighs, newHighTiers: target.newHighTiers,
        trackingStartTime: target.trackingStartTime, isPaused: target.isPaused, isStopped: target.isStopped,
        stoppedAt: target.stoppedAt, stopReason: target.stopReason, broadcasterAbsence: target.broadcasterAbsence,
        absencePausedAt: target.absencePausedAt, absenceOverrideActive: target.absenceOverrideActive, pausedElapsedTime: target.pausedElapsedTime,
        isAutoRefreshOn: target.isAutoRefreshOn,
    };
    sessionConfig = {series: target.STORAGE_HISTORY_SERIES.slice(), tiers: /** @type {import('./session-types').Tier[]} */ (Object.keys(target.TIERS)), maxHistory: target.MAX_HISTORY_LENGTH};
    for (const key of LIVE_SESSION_FIELDS) {
        Object.defineProperty(target, key, {enumerable: true, configurable: false, get: () => liveSessionState[key]});
    }
}

function invalidateSample() {
    // Lifecycle transitions retain only committed data. A synchronous renderer
    // can trigger a transition while a candidate is being presented.
    if (pendingSample) liveSessionState = pendingSample.before;
    pendingSample = null;
    sessionRevision++;
}
/** @returns {Counts} */
function emptyCounts() { return /** @type {Counts} */ (Object.fromEntries(sessionConfig.series.map(key => [key, 0]))); }
/** @param {History} history @returns {History} */
function copyHistory(history) { return /** @type {History} */ (Object.fromEntries(Object.entries(history).map(([key, values]) => [key, values.slice()]))); }
/** @param {Partial<Record<Series, High>>} highs */
function copyHighs(highs) { return Object.fromEntries(Object.entries(highs).map(([key, high]) => [key, {...high}])); }

/** @param {Series} key @param {number} current */
export function readSessionHigh(key, current = 0) {
    let high = liveSessionState.sessionHighs[key];
    if (!high) {
        const values = liveSessionState.history[key] || [];
        const value = Math.max(0, ...values);
        high = {value, time: value > 0 ? liveSessionState.history.timestamps[values.indexOf(value)] : null};
    }
    return {value: Math.max(high.value, current || 0), time: high.time};
}

export function synchronizeSessionHighTimes() {
    const state = liveSessionState;
    state.tierHighTimes = Object.fromEntries(sessionConfig.tiers.map(key => [key, readSessionHigh(key).time]));
    state.withTokensHighTime = readSessionHigh('withTokens').time;
    state.totalHighTime = readSessionHigh('total').time;
    state.anonHighTime = readSessionHigh('anonymous').time;
    state.femaleTransHighTime = readSessionHigh('female-trans').time;
}

export function sessionAnonymousCount() {
    const state = liveSessionState;
    if (state.lastAcceptedAcquisition && state.lastAcceptedAcquisition.source === 'API') return state.lastAcceptedAcquisition.api.anonymousCount;
    return Math.max(0, state.roomTotal - state.users.size);
}

function sessionCounts() {
    const counts = emptyCounts();
    for (const user of liveSessionState.users.values()) {
        if (counts[user.tier] !== undefined) counts[user.tier]++;
        if (user.gender === 'female' || user.gender === 'trans') counts['female-trans']++;
    }
    counts.total = liveSessionState.users.size;
    counts.withTokens = sessionConfig.tiers.filter(key => key !== 'gray' && key !== 'female-trans').reduce((sum, key) => sum + counts[key], 0);
    counts.anonymous = sessionAnonymousCount();
    return counts;
}

/** @param {number} value @param {number} now */
export function noteSessionRoomHigh(value, now) {
    if (value > liveSessionState.roomTotalHigh) {
        liveSessionState.roomTotalHigh = value;
        liveSessionState.roomTotalHighTime = now;
    }
}

/** @param {number} now @param {import('./session-types').SamplePolicy} policy */
export function appendCurrentSessionSample(now, policy) {
    const state = liveSessionState, counts = sessionCounts();
    noteSessionRoomHigh(Math.max(state.roomTotal, counts.total + counts.anonymous), now);
    if (state.sessionStartedAt === null) state.sessionStartedAt = now;
    for (const key of sessionConfig.series) {
        const previous = readSessionHigh(key), value = counts[key];
        if (value > previous.value) state.sessionHighs[key] = {value, time: now};
        else if (!state.sessionHighs[key]) state.sessionHighs[key] = previous;
        if (value > 0 && value >= state.sessionHighs[key].value) state.newHighTiers[key] = true;
        else delete state.newHighTiers[key];
    }
    synchronizeSessionHighTimes();
    if (!state.history.breaks || state.history.breaks.length !== state.history.timestamps.length) state.history.breaks = policy.breaks.slice();
    const lastTime = state.history.timestamps.length ? state.history.timestamps.at(-1) : null;
    state.history.breaks.push(lastTime !== null && (state.pendingHistoryGap || now - lastTime > Math.max(policy.intervalSeconds, policy.lastIntervalSeconds) * 2000 + policy.timeoutMs));
    state.pendingHistoryGap = false;
    state.history.timestamps.push(now);
    for (const key of sessionConfig.series) state.history[key].push(counts[key]);
    if (state.history.timestamps.length > sessionConfig.maxHistory) {
        state.history.timestamps.shift(); state.history.breaks.shift();
        for (const key of sessionConfig.series) state.history[key].shift();
    }
    return counts;
}

// A receipt covers the candidate sample until presentation succeeds. Persistence
// happens only after commit. Reset/Stop/navigation invalidate outstanding receipts.
/** @param {Snapshot} snapshot @param {string} room @param {number} now @param {import('./session-types').SamplePolicy} policy */
export function beginAcceptedSample(snapshot, room, now, policy) {
    if (pendingSample) throw new Error('A sample is already pending.');
    if (liveSessionState.isStopped) throw new Error('The session is stopped.');
    const state = liveSessionState;
    const before = {...state, history: copyHistory(state.history), sessionHighs: copyHighs(state.sessionHighs),
        tierHighTimes: {...state.tierHighTimes}, newHighTiers: {...state.newHighTiers}};
    /** @type {SampleReceipt} */
    const receipt = {before, revision: sessionRevision, counts: null, diagnostics: null};
    pendingSample = receipt;
    try {
        state.restoredDisplayFrame = null;
        state.users = new Map(snapshot.users.map(user => [user.username, user]));
        state.roomTotal = snapshot.roomTotal;
        state.lastAcceptedAcquisition = {source: snapshot.source, timestamp: snapshot.timestamp, api: null};
        if (snapshot.source === 'API') {
            const owners = snapshot.users.filter(user => user.isOwner), unknownClasses = snapshot.diagnostics.unknownClasses, unknownGenders = snapshot.diagnostics.unknownGenders;
            const tierSum = snapshot.users.filter(user => user.tier !== null).length;
            state.lastAcceptedAcquisition.api = {anonymousCount: snapshot.anonymousCount, registeredCount: snapshot.registeredCount, totalUsers: snapshot.totalUsers, ownerCount: owners.length};
            receipt.diagnostics = {room, anonymousCount: snapshot.anonymousCount, registeredCount: snapshot.registeredCount, totalUsers: snapshot.totalUsers, ownerCount: owners.length,
                unknownClasses: Object.values(unknownClasses).reduce((a, b) => a + b, 0), unknownGenders: Object.values(unknownGenders).reduce((a, b) => a + b, 0),
                unknownClassCodes: unknownClasses, unknownGenderCodes: unknownGenders, viewerTierSum: tierSum, registeredMinusTierSum: state.users.size - tierSum,
                viewerTierGapExplanation: 'Owner and unknown-class records count toward Registered, outside the seven viewer tiers', timestamp: new Date(snapshot.timestamp).toISOString()};
        }
        state.previousUserCount = state.users.size;
        state.previousRoomTotal = state.roomTotal;
        receipt.counts = appendCurrentSessionSample(now, policy);
        state.hasTrendBaseline = true;
        return receipt;
    } catch (error) { abortAcceptedSample(receipt); throw error; }
}

/** @param {SampleReceipt} receipt */
export function commitAcceptedSample(receipt) {
    if (pendingSample !== receipt || receipt.revision !== sessionRevision) return false;
    liveSessionState.previousCounts = receipt.counts;
    pendingSample = null;
    return true;
}

/** @param {SampleReceipt} receipt */
export function abortAcceptedSample(receipt) {
    if (pendingSample !== receipt || receipt.revision !== sessionRevision) return false;
    liveSessionState = receipt.before;
    pendingSample = null;
    return true;
}

export function markSessionGap() { liveSessionState.pendingHistoryGap = true; }
export function clearRestoredSessionFrame() { liveSessionState.restoredDisplayFrame = null; }
export function prepareSessionHighsForSave() {
    for (const key of sessionConfig.series) if (!liveSessionState.sessionHighs[key]) liveSessionState.sessionHighs[key] = readSessionHigh(key);
}

/** @param {LiveSessionState} data @param {import('./session-types').Frame | null} frame */
export function restoreLiveSession(data, frame) {
    invalidateSample();
    const state = liveSessionState;
    state.users = new Map(); state.roomTotal = 0; state.previousUserCount = 0; state.previousRoomTotal = 0;
    state.lastAcceptedAcquisition = null; state.newHighTiers = {}; state.pendingHistoryGap = true;
    for (const key of ['roomTotalHigh', 'roomTotalHighTime', 'trackingStartTime', 'sessionStartedAt', 'sessionStartEstimated', 'isPaused', 'isStopped',
        'stoppedAt', 'stopReason', 'absencePausedAt', 'absenceOverrideActive', 'pausedElapsedTime', 'hasTrendBaseline']) state[key] = data[key];
    state.history = copyHistory(data.history); state.sessionHighs = copyHighs(data.sessionHighs);
    state.previousCounts = {...data.previousCounts}; state.broadcasterAbsence = {...data.broadcasterAbsence};
    synchronizeSessionHighTimes();
    state.restoredDisplayFrame = frame;
    if (frame) {
        frame.isRestored = true; frame.playbackNewHighTiers = {};
        for (const key of sessionConfig.series) {
            const value = state.history[key].at(-1);
            if (value > 0 && value >= readSessionHigh(key).value) frame.playbackNewHighTiers[key] = true;
        }
        frame.roomTotalHigh = Math.max(state.roomTotalHigh, frame.roomTotalHigh);
    }
}

/** @param {boolean} loaded @param {boolean} isRoom */
export function configureSessionTracking(loaded, isRoom) {
    liveSessionState.isAutoRefreshOn = loaded ? !liveSessionState.isStopped && (!liveSessionState.isPaused || liveSessionState.absencePausedAt !== null) : isRoom;
}

/** @param {'start' | 'reset' | 'navigate'} mode */
export function resetLiveSession(mode) {
    invalidateSample();
    const state = liveSessionState;
    if (mode === 'start') state.isAutoRefreshOn = true;
    state.isStopped = false; state.stoppedAt = null; state.stopReason = null;
    state.broadcasterAbsence = {since: null, missing: 0}; state.absencePausedAt = null; state.absenceOverrideActive = false;
    state.trackingStartTime = null; state.sessionStartedAt = null; state.sessionStartEstimated = false;
    state.pausedElapsedTime = 0; state.isPaused = mode === 'navigate' ? false : !state.isAutoRefreshOn;
    state.users = new Map(); state.roomTotal = 0; state.lastAcceptedAcquisition = null; state.restoredDisplayFrame = null;
    state.previousUserCount = 0; state.previousRoomTotal = 0; state.previousCounts = emptyCounts(); state.hasTrendBaseline = false;
    state.roomTotalHigh = 0; state.roomTotalHighTime = null; state.sessionHighs = {}; state.newHighTiers = {};
    state.tierHighTimes = {}; state.withTokensHighTime = null; state.totalHighTime = null; state.anonHighTime = null; state.femaleTransHighTime = null;
    state.history = /** @type {History} */ (Object.fromEntries(['timestamps', 'breaks', ...sessionConfig.series].map(key => [key, []])));
    state.pendingHistoryGap = false;
}

/** @param {number} now */
export function startSessionClock(now) {
    if (liveSessionState.isStopped) return false;
    if (liveSessionState.sessionStartedAt === null) liveSessionState.sessionStartedAt = now;
    if (liveSessionState.isPaused) { liveSessionState.isPaused = false; liveSessionState.trackingStartTime = now - liveSessionState.pausedElapsedTime; }
    else if (!liveSessionState.trackingStartTime) liveSessionState.trackingStartTime = now;
    return true;
}

/** @param {number} now */
export function pauseSessionClock(now) {
    if (liveSessionState.isPaused) return false;
    liveSessionState.pendingHistoryGap = true; liveSessionState.isPaused = true;
    liveSessionState.pausedElapsedTime = liveSessionState.trackingStartTime ? Math.max(0, now - liveSessionState.trackingStartTime) : 0;
    return true;
}

/** @param {number} now */
export function pauseSessionRecording(now) {
    liveSessionState.absencePausedAt = null; liveSessionState.broadcasterAbsence = {since: null, missing: 0};
    liveSessionState.isAutoRefreshOn = false;
    pauseSessionClock(now);
}

/** @param {number} now @param {boolean} overrideAbsence */
export function resumeSessionRecording(now, overrideAbsence) {
    if (overrideAbsence) liveSessionState.absenceOverrideActive = true;
    liveSessionState.absencePausedAt = null; liveSessionState.broadcasterAbsence = {since: null, missing: 0};
    liveSessionState.isAutoRefreshOn = true;
    startSessionClock(now);
}

/** @param {Snapshot} snapshot */
export function nextSessionAbsence(snapshot) {
    const state = liveSessionState;
    if (snapshot.source !== 'API') return state.broadcasterAbsence;
    if (snapshot.users.some(user => user.isOwner === true)) { state.absenceOverrideActive = false; return {since: null, missing: 0}; }
    if (state.absenceOverrideActive || !state.isAutoRefreshOn || state.isPaused || state.isStopped) return state.broadcasterAbsence;
    return {since: state.broadcasterAbsence.since === null ? snapshot.observedAt : state.broadcasterAbsence.since, missing: Math.min(1000000, state.broadcasterAbsence.missing + 1)};
}

/** @param {Snapshot} snapshot @param {number} now */
export function observeSessionPresence(snapshot, now) { liveSessionState.broadcasterAbsence = nextSessionAbsence({...snapshot, observedAt: now}); }
/** @param {number} now */
export function resumeSessionForOwnerReturn(now) {
    liveSessionState.broadcasterAbsence = {since: null, missing: 0}; liveSessionState.absencePausedAt = null; liveSessionState.absenceOverrideActive = false;
    startSessionClock(now);
}

/** @param {number} now @param {number} pauseMs */
export function pauseSessionForAbsence(now, pauseMs) {
    const state = liveSessionState;
    if (state.isStopped || !state.isAutoRefreshOn || state.absenceOverrideActive || state.absencePausedAt !== null || state.isPaused ||
        state.broadcasterAbsence.missing < 2 || state.broadcasterAbsence.since === null || now - state.broadcasterAbsence.since < pauseMs) return false;
    state.absencePausedAt = state.broadcasterAbsence.since + pauseMs;
    state.pausedElapsedTime = state.trackingStartTime ? Math.max(0, state.absencePausedAt - state.trackingStartTime) : 0;
    state.isPaused = true; state.pendingHistoryGap = true;
    return true;
}

/** @param {string} reason @param {number} now @param {number} absenceStopMs */
export function stopLiveSession(reason, now, absenceStopMs) {
    if (liveSessionState.isStopped) return false;
    invalidateSample();
    const state = liveSessionState;
    state.stopReason = reason === 'absence' ? 'absence' : 'manual';
    state.stoppedAt = state.stopReason === 'absence' && state.broadcasterAbsence.since !== null ?
        Math.min(now, (state.absencePausedAt !== null ? state.absencePausedAt : state.broadcasterAbsence.since) + absenceStopMs) : now;
    state.isStopped = true; state.isAutoRefreshOn = false;
    if (!state.isPaused) state.pausedElapsedTime = state.trackingStartTime ? Math.max(0, state.stoppedAt - state.trackingStartTime) : 0;
    state.isPaused = true; state.pendingHistoryGap = false;
    return true;
}
