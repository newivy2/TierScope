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
        GM_setValue(key, JSON.stringify(data));
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
