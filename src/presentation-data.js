import { freezeRecordingData } from './immutable-data.js';

/** @typedef {import('./session-types').History} History */

/** @param {History} history @returns {History} */
export function captureDisplayHistory(history) {
    // Owned replay snapshots are already deeply frozen. Live histories are
    // copied here so even a faulty renderer cannot write into the live session.
    if (Object.isFrozen(history)) return history;
    return freezeRecordingData(/** @type {History} */ (Object.fromEntries(
        Object.entries(history).map(([key, values]) => [key, values.slice()]))));
}

/**
 * @param {Pick<import('./session-types').LiveSessionState, 'users' | 'roomTotal' | 'lastAcceptedAcquisition' | 'roomTotalHigh' | 'history'>} session
 * @param {import('./session-types').Tier[]} tiers
 */
export function liveDisplayData(session, tiers) {
    const counts = /** @type {Record<import('./session-types').Tier, number>} */ (Object.fromEntries(tiers.map(key => [key, 0])));
    const genderCounts = {female: 0, trans: 0};
    for (const user of session.users.values()) {
        if (counts[user.tier] !== undefined) counts[user.tier]++;
        if (user.gender === 'female' || user.gender === 'trans') { counts['female-trans']++; genderCounts[user.gender]++; }
    }
    const total = session.users.size;
    const withTokens = tiers.filter(key => key !== 'gray' && key !== 'female-trans').reduce((sum, key) => sum + counts[key], 0);
    const acquisition = session.lastAcceptedAcquisition;
    const anonymousCount = acquisition && acquisition.source === 'API' ? acquisition.api.anonymousCount : Math.max(0, session.roomTotal - total);
    return {counts, genderCounts, total, withTokens, anonymousCount, fullRoomTotal: Math.max(session.roomTotal, total + anonymousCount),
        roomTotalHigh: session.roomTotalHigh, history: session.history, isPlayback: false};
}
