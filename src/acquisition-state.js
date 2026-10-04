/** @typedef {import('./control-types').AcquisitionState} AcquisitionState */
/** @typedef {import('./control-types').RequestPolicy} RequestPolicy */
/** @typedef {import('./control-types').AcquisitionContext} AcquisitionContext */
/** @typedef {import('./control-types').ClockName} ClockName */
/** @type {ReadonlyArray<keyof AcquisitionState>} */
export const ACQUISITION_FIELDS = Object.freeze(['scanEpoch', 'initGuard', 'isScanning', 'lastAcquisitionAttemptSource',
    'domHealthStatus', 'domFallbackReadyAtByRoom', 'requestPolicyCache', 'requestPolicyUnsaved',
    'scanIntervalSeconds', 'countdownSeconds', 'lastScheduledIntervalSeconds', 'nextScanAt',
    'countdownInterval', 'trackingTimerInterval', 'healthCheckInterval']);
/** @type {AcquisitionState} */
let acquisitionState;
/** @type {{start: (tick: () => void, delay: number) => unknown, stop: (handle: unknown) => void}} */
let acquisitionClockEffects;
const acquisitionClockVersions = new Map();

// Network/storage effects stay in coordinators. Timers are injected and stale
// callbacks cannot run after their resource is cancelled or replaced.
/** @param {AcquisitionState} target @param {typeof acquisitionClockEffects} effects */
export function initializeAcquisitionState(target, effects) {
    acquisitionState = {.../** @type {AcquisitionState} */ (Object.fromEntries(ACQUISITION_FIELDS.map(key => [key, target[key]]))), domHealthStatus: {...target.domHealthStatus},
        requestPolicyCache: {...target.requestPolicyCache}, domFallbackReadyAtByRoom: new Map(target.domFallbackReadyAtByRoom)};
    acquisitionClockEffects = effects;
    acquisitionClockVersions.clear();
    const fallbackView = Object.freeze({get: room => acquisitionState.domFallbackReadyAtByRoom.get(room),
        has: room => acquisitionState.domFallbackReadyAtByRoom.has(room),
        get size() { return acquisitionState.domFallbackReadyAtByRoom.size; },
        [Symbol.iterator]: () => acquisitionState.domFallbackReadyAtByRoom[Symbol.iterator]()});
    for (const key of ACQUISITION_FIELDS) Object.defineProperty(target, key, {
        enumerable: true, configurable: false, get: () => key === 'domFallbackReadyAtByRoom' ? fallbackView :
            key === 'domHealthStatus' || key === 'requestPolicyCache' ? Object.freeze({...acquisitionState[key]}) : acquisitionState[key]
    });
}
export function invalidateAcquisition() { acquisitionState.scanEpoch++; acquisitionState.isScanning = false; }
export function beginAcquisitionGeneration() {
    acquisitionState.initGuard++;
    invalidateAcquisition();
    return acquisitionState.initGuard;
}
/** @param {string} url @param {string} room @param {RequestPolicy} policy @param {number} now @param {boolean} stopped */
export function beginAcquisition(url, room, policy, now, stopped) {
    if (acquisitionState.isScanning || stopped || policy.blocked || policy.until > now) return null;
    acquisitionState.isScanning = true;
    return Object.freeze({epoch: ++acquisitionState.scanEpoch, generation: acquisitionState.initGuard, url, room, policyRevision: policy.revision});
}
/** @param {AcquisitionContext} context @param {string} url */
export function acquisitionContextIsCurrent(context, url) {
    return context.epoch === acquisitionState.scanEpoch && context.generation === acquisitionState.initGuard && context.url === url;
}
/** @param {AcquisitionContext} context @param {string} url */
export function finishAcquisition(context, url) {
    if (!acquisitionContextIsCurrent(context, url)) return false;
    acquisitionState.isScanning = false;
    return true;
}
/** @param {'API'|'DOM'} source */
export function noteAcquisitionSource(source) { acquisitionState.lastAcquisitionAttemptSource = source; }
export function clearDOMFailures() { acquisitionState.domHealthStatus.consecutiveFailures = 0; }
/** @param {number} now @param {boolean} hasUserList @param {boolean} hasNames */
export function noteDOMHealth(now, hasUserList, hasNames) {
    const health = acquisitionState.domHealthStatus;
    health.isHealthy = hasUserList && hasNames;
    health.lastCheck = now;
    health.userListTabFound = hasUserList;
    // A successful check clears failures after the controller reports recovery.
    if (!health.isHealthy) health.consecutiveFailures++;
}
/** @param {string} room @param {number} readyAt */
export function deferDOMFallback(room, readyAt) {
    const key = room.toLowerCase();
    acquisitionState.domFallbackReadyAtByRoom.set(key, Math.max(acquisitionState.domFallbackReadyAtByRoom.get(key) || 0, readyAt));
}
/** @param {number} seconds */
export function selectScanInterval(seconds) {
    if (Number.isFinite(seconds)) acquisitionState.scanIntervalSeconds = Math.max(30, Math.min(300, seconds));
}
/** @param {number} seconds */
export function restoreScheduledInterval(seconds) { acquisitionState.lastScheduledIntervalSeconds = seconds; }
/** @param {number} seconds @param {number} now @param {number} restrictedUntil @param {boolean} stopped */
export function scheduleNextAcquisition(seconds, now, restrictedUntil, stopped) {
    acquisitionState.lastScheduledIntervalSeconds = seconds;
    acquisitionState.countdownSeconds = seconds;
    acquisitionState.nextScanAt = stopped ? 0 : Math.max(now + seconds * 1000, restrictedUntil);
}
/** @param {number} now @param {number} restrictedUntil */
export function schedulePresenceAcquisition(now, restrictedUntil) { acquisitionState.nextScanAt = Math.max(now, restrictedUntil); }
export function clearAcquisitionDeadline() { acquisitionState.nextScanAt = 0; }
export function resetAcquisitionForRoom() {
    beginAcquisitionGeneration();
    clearAcquisitionDeadline();
    acquisitionState.countdownSeconds = acquisitionState.scanIntervalSeconds;
    noteAcquisitionSource('API');
    clearDOMFailures();
    stopAcquisitionClock('healthCheckInterval');
    // Origin request restrictions and per-room fallback deadlines survive navigation.
}
/** @param {number} now @param {number} restrictedUntil @param {boolean} automatic */
export function refreshAcquisitionCountdown(now, restrictedUntil, automatic) {
    if (!automatic) return;
    acquisitionState.nextScanAt = Math.max(acquisitionState.nextScanAt, restrictedUntil);
    if (!acquisitionState.isScanning && acquisitionState.nextScanAt) {
        acquisitionState.countdownSeconds = Math.max(0, Math.ceil((acquisitionState.nextScanAt - now) / 1000));
    }
}
/** @param {ClockName} name */
export function stopAcquisitionClock(name) {
    acquisitionClockVersions.set(name, (acquisitionClockVersions.get(name) || 0) + 1);
    const handle = acquisitionState[name];
    acquisitionState[name] = null;
    if (handle !== null) acquisitionClockEffects.stop(handle);
}
/** @param {ClockName} name @param {() => void} tick @param {number} delay */
export function startAcquisitionClock(name, tick, delay) {
    stopAcquisitionClock(name);
    const version = acquisitionClockVersions.get(name);
    acquisitionState[name] = acquisitionClockEffects.start(() => {
        if (acquisitionClockVersions.get(name) === version) tick();
    }, delay);
}
/** @returns {RequestPolicy} */
function emptyRequestPolicy() { return {until: 0, failures: 0, blocked: 0, status: 0, revision: ''}; }
/** @param {RequestPolicy|null} value */
export function reconcileRequestPolicy(value) {
    if (value === null) {
        if (!acquisitionState.requestPolicyUnsaved) acquisitionState.requestPolicyCache = emptyRequestPolicy();
        return;
    }
    const local = acquisitionState.requestPolicyCache;
    acquisitionState.requestPolicyCache = acquisitionState.requestPolicyUnsaved ? {...value,
        until: Math.max(value.until, local.until), serverUntil: Math.max(value.serverUntil || 0, local.serverUntil || 0),
        failures: Math.max(value.failures, local.failures), blocked: local.blocked || value.blocked,
        status: local.until >= value.until ? local.status : value.status, revision: local.revision} : {...value};
}
/** @param {RequestPolicy} policy */
export function stageRequestPolicy(policy) {
    acquisitionState.requestPolicyCache = {...policy};
    acquisitionState.requestPolicyUnsaved = true;
}
/** @param {string} revision */
export function confirmRequestPolicySaved(revision) {
    if (acquisitionState.requestPolicyCache.revision === revision) acquisitionState.requestPolicyUnsaved = false;
}
/** @param {string} revision */
export function clearOwnedRequestFailures(revision) {
    const current = acquisitionState.requestPolicyCache;
    if (current.revision !== revision || current.blocked || !current.failures) return false;
    acquisitionState.requestPolicyCache = emptyRequestPolicy();
    acquisitionState.requestPolicyUnsaved = false;
    return true;
}
