import { isStorageTimestamp, makeStorageId } from './record-validation.js';
import { runtime } from './runtime.js';
import { log } from './utils.js';

export function readRequestPolicy() {
    try {
        var raw = GM_getValue(runtime.REQUEST_POLICY_KEY, null);
        if (raw === null && !runtime.requestPolicyUnsaved) runtime.requestPolicyCache = { until: 0, failures: 0, blocked: 0, status: 0, revision: '' };
        else if (raw !== null) {
            var value = JSON.parse(raw);
            if (value && Number.isFinite(value.until) && value.until >= 0 && Number.isInteger(value.failures) &&
                value.failures >= 0 && (value.blocked === 0 || value.blocked === 401 || value.blocked === 403) &&
                Number.isInteger(value.status) && (!value.serverUntil || isStorageTimestamp(value.serverUntil)) && typeof value.revision === 'string') {
                if (runtime.requestPolicyUnsaved) {
                    value = Object.assign({}, value, {
                        until: Math.max(value.until, runtime.requestPolicyCache.until),
                        serverUntil: Math.max(value.serverUntil || 0, runtime.requestPolicyCache.serverUntil || 0),
                        failures: Math.max(value.failures, runtime.requestPolicyCache.failures),
                        blocked: runtime.requestPolicyCache.blocked || value.blocked,
                        status: runtime.requestPolicyCache.until >= value.until ? runtime.requestPolicyCache.status : value.status,
                        revision: runtime.requestPolicyCache.revision
                    });
                }
                runtime.requestPolicyCache = value;
            }
        }
    } catch (error) { /* Retain the in-memory restriction if storage cannot be read. */ }
    return runtime.requestPolicyCache;
}

export function writeRequestPolicy(policy) {
    policy.revision = makeStorageId(); runtime.requestPolicyCache = policy;
    runtime.requestPolicyUnsaved = true;
    try { GM_setValue(runtime.REQUEST_POLICY_KEY, JSON.stringify(policy)); runtime.requestPolicyUnsaved = false; }
    catch (error) { log('Request restriction is local to this tab: ' + error.message); }
}

export function retryAfterTime(value, now) {
    if (typeof value !== 'string' || !value.trim()) return 0;
    value = value.trim();
    if (/^\d+$/.test(value)) {
        var until = now + Number(value) * 1000;
        return Number.isSafeInteger(until) && until <= 8640000000000000 ? until : 0;
    }
    var parsed = Date.parse(value);
    return Number.isFinite(parsed) && parsed > now ? parsed : 0;
}

export function recordRequestFailure(error) {
    var old = readRequestPolicy();
    var failures = Math.min(20, old.failures + 1);
    var status = error.status || 0;
    var delay = Math.min(900000, Math.max(60000, runtime.scanIntervalSeconds * 1000) * Math.pow(2, failures - 1));
    var policy = { until: Math.max(old.until, Date.now() + delay, error.retryAt || 0), failures: failures,
        blocked: status === 401 || status === 403 ? status : old.blocked, status: status,
        serverUntil: Math.max(old.serverUntil || 0, error.retryAt || 0, status === 429 ? Date.now() + delay : 0), revision: '' };
    writeRequestPolicy(policy);
    return policy;
}

export function clearRequestFailures(revision) {
    var current = readRequestPolicy();
    // An older in-flight request must not undo a newer restriction from another tab.
    if (current.revision !== revision || current.blocked || !current.failures) return;
    runtime.requestPolicyCache = { until: 0, failures: 0, blocked: 0, status: 0, revision: '' };
    runtime.requestPolicyUnsaved = false;
    try { GM_deleteValue(runtime.REQUEST_POLICY_KEY); } catch (error) { /* Retrying later is safe. */ }
}

export function requestPolicyMessage(policy) {
    if (policy.blocked) return 'Access denied (' + policy.blocked + ')';
    var seconds = Math.max(0, Math.ceil((policy.until - Date.now()) / 1000));
    if (!seconds) return '';
    return (policy.status === 429 ? 'Rate limited · ' : 'Retry in ') +
        (seconds >= 60 ? Math.ceil(seconds / 60) + 'm' : seconds + 's');
}

export function getDOMFallbackWaitSeconds(modelName) {
    var readyAt = runtime.domFallbackReadyAtByRoom.get(modelName.toLowerCase()) || 0;
    return Math.max(0, Math.ceil((readyAt - Date.now()) / 1000));
}
