/** @typedef {import('./control-types').RequestPolicy} RequestPolicy */

/** @param {RequestPolicy} policy */
export function responseRetryDeadline(policy) {
    // Legacy records did not distinguish transport failures. Preserve their wait.
    return Math.max(policy.responseUntil === undefined ? policy.until : policy.responseUntil, policy.serverUntil || 0);
}

/** @param {RequestPolicy} policy @param {number} recoveryAt */
export function requestRetryDeadline(policy, recoveryAt = 0) {
    return recoveryAt ? Math.max(responseRetryDeadline(policy), recoveryAt) : policy.until;
}

/** @param {RequestPolicy} old @param {{status?:number,retryAt?:number,connectionFailure?:boolean}} error @param {number} now @param {number} interval */
export function nextRequestFailure(old, error, now, interval) {
    const responseUntil = responseRetryDeadline(old);
    if (error.connectionFailure) {
        const connectionFailures = Math.min(20, (old.connectionFailures || 0) + 1);
        const connectionUntil = now + Math.min(60000, 15000 * Math.pow(2, connectionFailures - 1));
        return {...old, responseUntil, connectionFailures, connectionUntil,
            until: Math.max(responseUntil, connectionUntil), status: responseUntil > now ? old.status : 0, revision: ''};
    }
    const failures = Math.min(20, old.failures + 1), status = error.status || 0;
    const delay = Math.min(900000, Math.max(60000, interval * 1000) * Math.pow(2, failures - 1));
    const serverUntil = Math.max(old.serverUntil || 0, error.retryAt || 0, status === 429 ? now + delay : 0);
    const nextResponseUntil = Math.max(responseUntil, now + delay, serverUntil);
    return {...old, failures, status, responseUntil: nextResponseUntil,
        connectionFailures: old.connectionFailures || 0, connectionUntil: old.connectionUntil || 0,
        until: Math.max(nextResponseUntil, old.connectionUntil || 0), serverUntil,
        blocked: status === 401 || status === 403 ? status : old.blocked, revision: ''};
}

