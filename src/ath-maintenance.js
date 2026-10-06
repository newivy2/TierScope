import { ATH_RETENTION_MS, athActivity, ensureAthGrace } from './ath-retention.js';
import { allTimeRoom, readAllTimeHighs, retireInactiveAllTimeRecord } from './highs-store.js';
import { roomFromUrl } from './room-context.js';
import { runtime } from './runtime.js';

export function initializeAthGrace(now = Date.now()) {
    const rooms = new Set(GM_listValues().filter(key => key.startsWith(runtime.ALL_TIME_PREFIX))
        .map(key => allTimeRoom(key.slice(runtime.ALL_TIME_PREFIX.length).split(':')[0])).filter(room => room !== null));
    let skipped = 0;
    for (const room of rooms) {
        try { ensureAthGrace(room, now); } catch (error) { skipped++; }
    }
    return skipped;
}
function inactive(room, cutoff, now) {
    if (roomFromUrl(location.href)?.toLowerCase() === room) return false;
    const activity = athActivity(room, now);
    return !activity.active && activity.latest < cutoff;
}
export function prepareAthCleanup(now = Date.now()) {
    initializeAthGrace(now);
    const rooms = new Set(GM_listValues().filter(key => key.startsWith(runtime.ALL_TIME_PREFIX))
        .map(key => allTimeRoom(key.slice(runtime.ALL_TIME_PREFIX.length).split(':')[0])).filter(room => room !== null));
    const cutoff = now - ATH_RETENTION_MS, candidates = []; let skipped = 0;
    for (const room of rooms) {
        try {
            if (!inactive(room, cutoff, now)) continue;
            const state = readAllTimeHighs(room);
            if (state.error || state.skipped || state.pending) { skipped++; continue; }
            if (state.keys.length) candidates.push({room, epoch: state.epoch,
                records: state.keys.map(key => ({key, raw: GM_getValue(key, undefined)}))});
        } catch (error) { skipped++; }
    }
    return {cutoff, candidates, skipped};
}
export function applyAthCleanup(plan) {
    let cleared = 0, changed = 0, failed = 0;
    for (const candidate of plan.candidates) {
        try {
            const guard = () => inactive(candidate.room, plan.cutoff, Date.now());
            if (!guard()) { changed++; continue; }
            const result = retireInactiveAllTimeRecord(candidate, guard);
            if (result === 'cleared') cleared++;
            else if (result === 'changed') changed++;
            else failed++;
        } catch (error) { failed++; }
    }
    return {cleared, changed, failed};
}
