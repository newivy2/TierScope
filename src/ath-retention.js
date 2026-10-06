import { isStorageTimestamp } from './record-validation.js';

export const ATH_VISIT_PREFIX = 'tierscope:ath-visit:v1:';
export const ATH_LEASE_PREFIX = 'tierscope:ath-active:v1:';
export const ATH_RETENTION_MS = 90 * 86400000;
export const ATH_LEASE_MS = 5 * 60000;

function roomKey(room) {
    if (typeof room !== 'string' || !/^[a-z0-9_-]{1,100}$/i.test(room) || room.toLowerCase() === 'unknown') throw new Error('Invalid ATH room.');
    return room.toLowerCase();
}
export function readAthVisit(room) {
    const raw = GM_getValue(ATH_VISIT_PREFIX + roomKey(room), undefined);
    if (raw === undefined) return null;
    const value = JSON.parse(raw);
    if (!value || value.schemaVersion !== 1 || !isStorageTimestamp(value.graceStartedAt) ||
        !(value.lastVisitedAt === null || isStorageTimestamp(value.lastVisitedAt))) throw new Error('Unreadable ATH visit record.');
    return value;
}
export function ensureAthGrace(room, now = Date.now()) {
    const previous = readAthVisit(room);
    if (previous) return previous;
    const value = {schemaVersion: 1, graceStartedAt: now, lastVisitedAt: null};
    const raw = JSON.stringify(value), key = ATH_VISIT_PREFIX + roomKey(room);
    GM_setValue(key, raw);
    const stored = readAthVisit(room);
    if (!stored) throw new Error('ATH grace period could not be saved.');
    return stored;
}
export function noteAthVisit(room, lease, now = Date.now()) {
    room = roomKey(room);
    const leaseKey = ATH_LEASE_PREFIX + room + ':' + lease;
    const active = JSON.stringify({schemaVersion: 1, lastSeenAt: now});
    // An independently owned lease protects this tab even if visit saving fails.
    GM_setValue(leaseKey, active);
    if (GM_getValue(leaseKey, undefined) !== active) throw new Error('ATH activity could not be saved.');
    const previous = ensureAthGrace(room, now);
    const value = {...previous, lastVisitedAt: Math.max(now, previous.lastVisitedAt || 0)};
    GM_setValue(ATH_VISIT_PREFIX + room, JSON.stringify(value));
    const stored = readAthVisit(room);
    if (!stored || stored.lastVisitedAt < value.lastVisitedAt) throw new Error('ATH visit could not be saved.');
}
export function releaseAthLease(room, lease) {
    if (room) GM_deleteValue(ATH_LEASE_PREFIX + roomKey(room) + ':' + lease);
}
export function athActivity(room, now = Date.now()) {
    const visit = readAthVisit(room);
    if (!visit) throw new Error('ATH visit history is not initialized.');
    const prefix = ATH_LEASE_PREFIX + roomKey(room) + ':';
    let latest = Math.max(visit.graceStartedAt, visit.lastVisitedAt || 0), active = false;
    for (const key of GM_listValues().filter(key => key.startsWith(prefix))) {
        const raw = GM_getValue(key, undefined);
        if (raw === undefined) continue;
        const value = JSON.parse(raw);
        if (!value || value.schemaVersion !== 1 || !isStorageTimestamp(value.lastSeenAt)) throw new Error('Unreadable ATH activity record.');
        latest = Math.max(latest, value.lastSeenAt);
        if (now - value.lastSeenAt <= ATH_LEASE_MS) active = true;
    }
    return {latest, active};
}
