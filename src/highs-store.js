import { ensureAthGrace } from './ath-retention.js';
import { isStorageObject, isStorageTimestamp, makeStorageId } from './record-validation.js';
import { runtime } from './runtime.js';

export function allTimeRoom(room) {
    return typeof room === 'string' && /^[a-z0-9_-]{1,100}$/i.test(room) && room.toLowerCase() !== 'unknown' ? room.toLowerCase() : null;
}

export function emptyAllTimeHighs() {
    var highs = {};
    runtime.ALL_TIME_SERIES.forEach(function(key) { highs[key] = { value: 0, time: null, source: null }; });
    return highs;
}

export function mergeAllTimeHighs(target, incoming) {
    var changed = 0;
    runtime.ALL_TIME_SERIES.forEach(function(key) {
        var old = target[key], next = incoming[key];
        if (!next || !next.source) return;
        if (!old.source || next.value > old.value || (next.value === old.value && next.time !== null &&
            (old.time === null || next.time < old.time))) {
            target[key] = { value: next.value, time: next.time, source: next.source };
            changed++;
        }
    });
    return changed;
}

export function validateAllTimeRecord(data, room) {
    if (!isStorageObject(data) || data.schemaVersion !== 1 || data.room !== room ||
        typeof data.epoch !== 'string' || !isStorageObject(data.highs)) throw new Error('Unsupported all-time record');
    runtime.ALL_TIME_SERIES.forEach(function(key) {
        var high = data.highs[key];
        if (!isStorageObject(high) || !Number.isSafeInteger(high.value) || high.value < 0 ||
            !(high.time === null || isStorageTimestamp(high.time)) ||
            [null, 'live', 'saved', 'file'].indexOf(high.source) === -1 ||
            (high.source === null && (high.value !== 0 || high.time !== null))) throw new Error('Invalid all-time high');
    });
}

export function readAllTimeHighs(room) {
    room = allTimeRoom(room);
    var previous = runtime.allTimeCache.get(room);
    var state = { room: room, epoch: 'initial', highs: emptyAllTimeHighs(), keys: [], skipped: 0, error: '', pending: false };
    if (!room) return state;
    try {
        state.epoch = GM_getValue(runtime.ALL_TIME_EPOCH_PREFIX + room, 'initial');
        if (typeof state.epoch !== 'string') throw new Error('Invalid all-time records generation');
        var prefix = runtime.ALL_TIME_PREFIX + room + ':';
        GM_listValues().filter(function(key) { return key.indexOf(prefix) === 0; }).forEach(function(key) {
            try {
                var raw = GM_getValue(key, undefined);
                if (raw === undefined) return; // Another tab may have compacted this snapshot.
                var data = JSON.parse(raw);
                validateAllTimeRecord(data, room);
                if (data.epoch !== state.epoch) return;
                mergeAllTimeHighs(state.highs, data.highs);
                state.keys.push(key);
            } catch (error) { state.skipped++; }
        });
        if (previous && previous.pending && previous.epoch === state.epoch) {
            mergeAllTimeHighs(state.highs, previous.highs);
            state.pending = true;
        }
    } catch (error) {
        if (previous) {
            state = Object.assign({}, previous, { highs: emptyAllTimeHighs() });
            mergeAllTimeHighs(state.highs, previous.highs);
        }
        state.error = 'All-time records could not be read. Showing locally available records.';
    }
    runtime.allTimeCache.set(room, state);
    return state;
}

export function storeAllTimeHighs(room, incoming) {
    var state = readAllTimeHighs(room);
    if (!state.room) return { state: state, changed: 0, saved: false };
    try {
        validateAllTimeRecord({ schemaVersion: 1, room: state.room, epoch: state.epoch, highs: incoming }, state.room);
    } catch (error) {
        state.error = 'All-time highs were not updated: invalid record values.';
        return { state: state, changed: 0, saved: false };
    }
    var changed = mergeAllTimeHighs(state.highs, incoming);
    if (!changed && !state.pending && state.keys.length < 2) return { state: state, changed: 0, saved: !state.error };
    state.pending = true;
    try {
        if (state.error) throw new Error(state.error);
        var data = { schemaVersion: 1, room: state.room, epoch: state.epoch, highs: state.highs };
        validateAllTimeRecord(data, state.room);
        // Immutable snapshots prevent simultaneous tabs from overwriting a
        // higher record. Compact only snapshots included in this merge,
        // after its replacement is safely stored; unseen writes survive.
        var key = runtime.ALL_TIME_PREFIX + state.room + ':' + state.epoch + ':' + makeStorageId();
        try { ensureAthGrace(state.room); } catch (error) { /* Missing metadata prevents eligibility for cleanup. */ }
        var raw = JSON.stringify(data);
        GM_setValue(key, raw);
        if (GM_getValue(key, undefined) !== raw) throw new Error('ATH snapshot could not be verified.');
        if (GM_getValue(runtime.ALL_TIME_EPOCH_PREFIX + state.room, 'initial') !== state.epoch) {
            return { state: readAllTimeHighs(state.room), changed: 0, saved: false };
        }
        state.pending = false;
        state.keys.forEach(function(old) { try { GM_deleteValue(old); } catch (error) { /* Redundant snapshots remain safe. */ } });
        state.keys = [key];
    } catch (error) {
        state.error = 'All-time highs are local only: saving is unavailable. Keep this tab open to retry.';
    }
    return { state: state.pending ? state : readAllTimeHighs(state.room), changed: changed, saved: !state.pending };
}

export function sessionAllTimeHighs(data, source) {
    var highs = emptyAllTimeHighs();
    runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
        var high = data.sessionHighs[key];
        highs[key] = { value: high.value, time: high.time, source: source };
    });
    highs.roomTotal = { value: data.roomTotalHigh, time: data.roomTotalHighTime, source: source };
    data.history.timestamps.forEach(function(time, i) {
        var total = data.history.total[i] + data.history.anonymous[i];
        if (total > highs.roomTotal.value || (total === highs.roomTotal.value && highs.roomTotal.time === null)) {
            highs.roomTotal = { value: total, time: time, source: source };
        }
    });
    return highs;
}

// Keep a verified replacement containing the old highs while retiring snapshots.
// A visit/write racing cleanup, or a failed delete, retains this safety copy.
export function retireInactiveAllTimeRecord(candidate, guard) {
    const state = readAllTimeHighs(candidate.room);
    if (state.error || state.skipped || state.pending || state.epoch !== candidate.epoch ||
        state.keys.length !== candidate.records.length || candidate.records.some(record =>
            !state.keys.includes(record.key) || GM_getValue(record.key, undefined) !== record.raw) || !guard()) return 'changed';
    const epochKey = runtime.ALL_TIME_EPOCH_PREFIX + state.room, epoch = makeStorageId();
    const key = runtime.ALL_TIME_PREFIX + state.room + ':' + epoch + ':' + makeStorageId();
    const raw = JSON.stringify({schemaVersion: 1, room: state.room, epoch, highs: state.highs});
    GM_setValue(key, raw);
    if (GM_getValue(key, undefined) !== raw) throw new Error('ATH safety copy could not be verified.');
    if (!guard() || GM_getValue(epochKey, 'initial') !== candidate.epoch) {
        GM_deleteValue(key); return 'changed';
    }
    if (candidate.records.some(record => GM_getValue(record.key, undefined) !== record.raw) ||
        readAllTimeHighs(state.room).keys.some(other => !candidate.records.some(record => record.key === other))) {
        GM_deleteValue(key); return 'changed';
    }
    GM_setValue(epochKey, epoch);
    if (GM_getValue(epochKey, 'initial') !== epoch) throw new Error('ATH clear could not be verified.');
    runtime.allTimeCache.delete(state.room);
    // A writer may have read the old generation before we advanced it. Preserve
    // its unseen/changed snapshot in the current generation before aborting.
    const preserveConcurrent = () => {
        const prefix = runtime.ALL_TIME_PREFIX + state.room + ':';
        const highs = emptyAllTimeHighs(); let changed = false;
        for (const other of GM_listValues().filter(other => other.startsWith(prefix) && other !== key)) {
            const value = GM_getValue(other, undefined);
            if (value === undefined) continue;
            const data = JSON.parse(value); validateAllTimeRecord(data, state.room);
            if (data.epoch !== candidate.epoch || candidate.records.some(record => record.key === other && record.raw === value)) continue;
            mergeAllTimeHighs(highs, data.highs); changed = true;
        }
        if (changed && GM_getValue(epochKey, 'initial') === epoch) {
            const result = storeAllTimeHighs(state.room, highs);
            if (!result.saved) throw new Error('Concurrent ATH records could not be preserved.');
        }
        return changed;
    };
    const unchanged = () => !preserveConcurrent() && guard() && GM_getValue(epochKey, 'initial') === epoch &&
        GM_getValue(key, undefined) === raw && !GM_listValues().some(other => other !== key &&
            other.startsWith(runtime.ALL_TIME_PREFIX + state.room + ':' + epoch + ':'));
    if (!unchanged()) return 'changed';
    for (const record of candidate.records) {
        if (!unchanged()) return 'changed';
        if (GM_getValue(record.key, undefined) !== record.raw) return 'changed';
        GM_deleteValue(record.key);
        if (GM_getValue(record.key, undefined) !== undefined) throw new Error('An old ATH snapshot could not be removed.');
    }
    if (!unchanged()) return 'changed';
    GM_deleteValue(key);
    if (GM_getValue(key, undefined) !== undefined) throw new Error('ATH clear could not be completed.');
    // Recheck after deletion too: storage calls can interleave with another tab.
    if (preserveConcurrent() || !guard()) {
        if (GM_getValue(epochKey, 'initial') === epoch) {
            const result = storeAllTimeHighs(state.room, state.highs);
            if (!result.saved) throw new Error('ATH records could not be retained after a concurrent visit.');
        }
        return 'changed';
    }
    runtime.allTimeCache.delete(state.room);
    return 'cleared';
}
