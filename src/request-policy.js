import { clearOwnedRequestFailures, confirmRequestPolicySaved, noteRequestPolicyReadFailure, reconcileRequestPolicy, stageRequestPolicy } from './acquisition-state.js';
import { isStorageTimestamp, makeStorageId } from './record-validation.js';
import { runtime } from './runtime.js';
import { isBrowserOffline } from './connection-status.js';
import { nextRequestFailure, requestRetryDeadline, responseRetryDeadline, userListFormatRecovery } from './request-policy-data.js';
import { log } from './utils.js';
import { requestCoordinator } from './request-coordination.js';

function shareResponseWait(policy) {
    if (policy.status === 429 || policy.status >= 500 || policy.serverUntil > Date.now()) {
        requestCoordinator.publish(responseRetryDeadline(policy));
    }
}

export function readRequestPolicy() {
    try {
        var raw = GM_getValue(runtime.REQUEST_POLICY_KEY, null);
        if (raw === null) reconcileRequestPolicy(null);
        else {
            var value = JSON.parse(raw);
            if (value && Number.isFinite(value.until) && value.until >= 0 && Number.isInteger(value.failures) &&
                value.failures >= 0 && (value.blocked === 0 || value.blocked === 401 || value.blocked === 403) &&
                Number.isInteger(value.status) && (!value.serverUntil || isStorageTimestamp(value.serverUntil)) && typeof value.revision === 'string' &&
                (value.responseUntil === undefined && value.connectionUntil === undefined && value.connectionFailures === undefined ||
                 Number.isFinite(value.responseUntil) && value.responseUntil >= 0 && Number.isFinite(value.connectionUntil) && value.connectionUntil >= 0 &&
                 Number.isInteger(value.connectionFailures) && value.connectionFailures >= 0 && value.connectionFailures <= 20 &&
                 value.until >= Math.max(value.responseUntil, value.connectionUntil, value.serverUntil || 0))) {
                reconcileRequestPolicy(value);
            } else noteRequestPolicyReadFailure();
        }
    } catch (error) { noteRequestPolicyReadFailure(); /* Retain the in-memory restriction if storage cannot be read. */ }
    var recovery = userListFormatRecovery(runtime.requestPolicyCache, Date.now());
    if (recovery && !runtime.requestPolicyUnsaved) {
        try {
            // Do not replace a restriction changed by another tab since this read.
            if (GM_getValue(runtime.REQUEST_POLICY_KEY, null) === raw) writeRequestPolicy(recovery);
        } catch (error) { /* Keep the existing wait if its storage cannot be verified. */ }
    }
    shareResponseWait(runtime.requestPolicyCache);
    return runtime.requestPolicyCache;
}

export function writeRequestPolicy(policy) {
    policy.userListFormatVersion = 2;
    policy.revision = makeStorageId();
    stageRequestPolicy(policy);
    try { GM_setValue(runtime.REQUEST_POLICY_KEY, JSON.stringify(policy)); confirmRequestPolicySaved(policy.revision); }
    catch (error) { log('Request restriction is local to this tab: ' + error.message); }
    shareResponseWait(policy);
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
    if (error.connectionFailure && isBrowserOffline()) return old;
    var policy = nextRequestFailure(old, error, Date.now(), runtime.scanIntervalSeconds);
    writeRequestPolicy(policy);
    return policy;
}

export function effectiveRequestDeadline(policy) {
    return Math.max(requestRetryDeadline(policy, runtime.connectionRecoveryAt), requestCoordinator.deadline());
}

export function clearRequestFailures(revision, storageRevision) {
    readRequestPolicy();
    // An older in-flight request must not undo a newer restriction from another tab.
    if (!clearOwnedRequestFailures(revision, storageRevision)) return;
    try { GM_deleteValue(runtime.REQUEST_POLICY_KEY); } catch (error) { /* Retrying later is safe. */ }
}

export function requestPolicyMessage(policy) {
    if (policy.blocked) return 'Access denied (' + policy.blocked + ')';
    var sharedWait = requestCoordinator.deadline() > Date.now();
    if (!runtime.isAutoRefreshOn && policy.connectionFailures && responseRetryDeadline(policy) <= Date.now() && !sharedWait) return '';
    var seconds = Math.max(0, Math.ceil((effectiveRequestDeadline(policy) - Date.now()) / 1000));
    if (!seconds) return '';
    var connection = !sharedWait && responseRetryDeadline(policy) <= Date.now() && (runtime.connectionRecoveryAt || policy.connectionFailures);
    return (policy.status === 429 && responseRetryDeadline(policy) > Date.now() ? 'Rate limited · ' : sharedWait && requestCoordinator.deadline() > requestRetryDeadline(policy, runtime.connectionRecoveryAt) ? 'API cooldown · ' : connection ? runtime.connectionRecoveryAt ? 'Reconnecting · ' : 'Connection · ' : 'Retry in ') +
        (seconds >= 60 ? Math.ceil(seconds / 60) + 'm' : seconds + 's');
}

export function requestFailureExplanation(policy) {
    if (responseRetryDeadline(policy) <= Date.now()) return '';
    if (policy.status >= 100 && policy.status <= 599) return ' Last failed API response: HTTP ' + policy.status;
    return policy.failures > 0 ? ' The API response or audience sample was rejected' : '';
}

export function getDOMFallbackWaitSeconds(modelName) {
    var readyAt = runtime.domFallbackReadyAtByRoom.get(modelName.toLowerCase()) || 0;
    return Math.max(0, Math.ceil((readyAt - Date.now()) / 1000));
}
