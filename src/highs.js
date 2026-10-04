import { readSessionHigh, synchronizeSessionHighTimes } from './live-session.js';
import { compactNumber } from './compact.js';
import { validateSessionFile } from './files.js';
import { updateDisplay } from './panel.js';
import { isPlaybackCurrent, paintPlayback } from './replay.js';
import { runtime } from './runtime.js';
import { isStorageObject, isStorageTimestamp, makeStorageId } from './storage.js';
import { getModelName, log } from './utils.js';

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

export function recordAcceptedAllTimeHighs(room) {
    var index = runtime.history.timestamps.length - 1;
    if (index < 0) return;
    var incoming = emptyAllTimeHighs(), time = runtime.history.timestamps[index];
    runtime.ALL_TIME_SERIES.forEach(function(key) {
        incoming[key] = { value: key === 'roomTotal' ? runtime.history.total[index] + runtime.history.anonymous[index] : runtime.history[key][index],
            time: time, source: 'live' };
    });
    storeAllTimeHighs(room, incoming);
}

export function displayedHighRoom() {
    return allTimeRoom(isPlaybackCurrent(runtime.playback) && runtime.playback.archive ? runtime.playback.archive.room : getModelName());
}

export function displayedAllTimeState() {
    if (isPlaybackCurrent(runtime.playback) && runtime.playback.allTimeState) return runtime.playback.allTimeState;
    var room = displayedHighRoom();
    return runtime.allTimeCache.get(room) || readAllTimeHighs(room);
}

export function repaintHighMode() {
    cancelHighPulses();
    runtime.chartLayoutRevision++;
    if (isPlaybackCurrent(runtime.playback)) paintPlayback(runtime.playback);
    else updateDisplay();
    updateHighControls();
}

export function toggleHighMode() {
    runtime.highMode = runtime.highMode === 'sh' ? 'ath' : 'sh';
    var state = readAllTimeHighs(displayedHighRoom());
    if (isPlaybackCurrent(runtime.playback)) runtime.playback.allTimeState = state;
    try { GM_setValue(runtime.HIGH_MODE_KEY, runtime.highMode); } catch (error) { /* The selected view still works for this tab. */ }
    repaintHighMode();
}

export function setAllTimeActionStatus(message, replayLabel) {
    var status = document.getElementById('all-time-action-status');
    if (status) status.textContent = message;
    var button = document.getElementById('btn-playback-add-all-time');
    if (button) {
        button.textContent = replayLabel || 'Add to all-time highs';
        button.title = message || 'Add this file\'s highs to the room named beside this button';
        button.setAttribute('aria-label', replayLabel ? replayLabel + '. ' + message : 'Add to all-time highs');
    }
}

export function addFileToAllTimeHighs() {
    if (!isPlaybackCurrent(runtime.playback) || !runtime.playback.imported) return;
    try {
        var archive = validateSessionFile(runtime.playback.archive);
        var result = storeAllTimeHighs(archive.room, sessionAllTimeHighs(archive.session, 'file'));
        runtime.playback.allTimeState = result.state;
        repaintHighMode();
        setAllTimeActionStatus(result.saved ? (result.changed ? 'Records updated for ' : 'No higher records in this file for ') + archive.room + '.' :
            result.state.error || 'Records changed in another tab. Try adding this file again.',
            result.saved ? (result.changed ? 'Added to ATH' : 'Already in ATH') : 'Retry adding to ATH');
    } catch (error) { alert('Could not add all-time highs: ' + error.message); }
}

export function clearAllTimeHighs() {
    var room = displayedHighRoom();
    if (!room || !confirm('Clear all-time highs for ' + room + '?\n\nSession history and saved files will remain. New accepted samples will start new all-time records.')) return;
    try {
        var prefix = runtime.ALL_TIME_PREFIX + room + ':';
        var keys = GM_listValues().filter(function(key) { return key.indexOf(prefix) === 0; });
        GM_setValue(runtime.ALL_TIME_EPOCH_PREFIX + room, makeStorageId());
        runtime.allTimeCache.delete(room);
        keys.forEach(function(key) { try { GM_deleteValue(key); } catch (error) { /* Old generations are ignored. */ } });
        var state = readAllTimeHighs(room);
        if (isPlaybackCurrent(runtime.playback)) runtime.playback.allTimeState = state;
        repaintHighMode();
        setAllTimeActionStatus('All-time highs cleared for ' + room + '.');
    } catch (error) { alert('Could not clear all-time highs: ' + error.message); }
}

export function updateHighControls() {
    var state = displayedAllTimeState();
    var warning = state.error || (state.pending ? 'All-time highs are local only: saving is pending. Keep this tab open to retry.' : '');
    var toggle = document.getElementById('btn-high-mode');
    if (toggle) {
        toggle.style.display = runtime.isMinimized ? 'none' : '';
        toggle.textContent = runtime.highMode.toUpperCase();
        toggle.setAttribute('aria-pressed', String(runtime.highMode === 'ath'));
        toggle.setAttribute('aria-label', runtime.highMode === 'ath' ? 'All-time highs. Switch to session highs' : 'Session highs. Switch to all-time highs');
        toggle.title = (runtime.highMode === 'ath' ? 'All-time highs for this room in this browser; survive session Reset and expiry' :
            'Session highs; cleared by Reset. Saved sessions expire 3 hours after their last save. Downloaded files do not expire') +
            '. Click to switch. ' + warning;
    }
    ['btn-add-all-time', 'btn-playback-add-all-time'].forEach(function(id) {
        var add = document.getElementById(id);
        if (add) add.style.display = isPlaybackCurrent(runtime.playback) && runtime.playback.imported ? 'block' : 'none';
    });
    var clear = document.getElementById('btn-clear-all-time');
    if (clear) { clear.disabled = !state.room; clear.title = state.room ? 'Clear all-time records for ' + state.room + ' only' : 'Open a room or session file first'; }
    var info = document.getElementById('all-time-info');
    if (info) info.textContent = warning || (state.skipped ? state.skipped + ' unreadable all-time record(s) were skipped and retained.' :
        'All-time highs are saved per room in this browser and survive session Reset.');
}

export function cancelHighPulse(key) {
    var animation = runtime.highPulseAnimations.get(key);
    runtime.highPulseAnimations.delete(key);
    if (animation) {
        try { animation.cancel(); } catch (error) { /* A decoration must not affect tracking. */ }
    }
}

export function cancelHighPulses() {
    Array.from(runtime.highPulseAnimations.keys()).forEach(cancelHighPulse);
}

// Called once, after a live sample commits successfully. Rendering, Replay,
// restoration and layout changes never generate notification events.
export function pulseAcceptedHighs(priorState) {
    try {
        if (runtime.presentationMode !== 'LIVE' || runtime.isMinimized || runtime.restoredDisplayFrame ||
            document.visibilityState === 'hidden' || (runtime.highPulseMotion && runtime.highPulseMotion.matches)) {
            cancelHighPulses();
            return;
        }
        runtime.PANEL_ROWS.forEach(function(row) {
            var key = row.key === 'withtokens' ? 'withTokens' : row.key === 'anon' ? 'anonymous' : row.key;
            var atHigh = runtime.newHighTiers[key], wasAtHigh = priorState.newHighTiers[key];
            var previousHigh = priorState.sessionHighs[key];
            var raisedHigh = runtime.sessionHighs[key].value > (previousHigh ? previousHigh.value : 0);
            if (runtime.highMode === 'ath') {
                var high = displayedAllTimeState().highs[key], before = priorState.allTimeHighs[key];
                var current = runtime.history[key][runtime.history[key].length - 1];
                var oldValue = priorState.history[key][priorState.history[key].length - 1];
                atHigh = high.source && current > 0 && current >= high.value;
                wasAtHigh = priorState.lastAcceptedAcquisition && before.source && oldValue > 0 && oldValue >= before.value;
                raisedHigh = high.value > before.value;
            }
            if (!atHigh) { cancelHighPulse(row.key); return; }
            if (wasAtHigh && !raisedHigh) return;
            var target = document.getElementById((runtime.collapsedRows.has(row.key) ? 'restore-row-' : 'tier-row-') + row.key);
            if (!target || typeof target.animate !== 'function') return;
            cancelHighPulse(row.key);
            var animation = target.animate([
                { backgroundColor: 'rgba(50, 205, 50, 0.22)', boxShadow: 'inset 0 0 0 1px rgba(105, 190, 69, 0)', offset: 0 },
                { backgroundColor: 'rgba(50, 205, 50, 0.40)', boxShadow: 'inset 0 0 0 1px rgba(105, 190, 69, 0.75)', offset: 0.5 },
                { backgroundColor: 'rgba(50, 205, 50, 0.22)', boxShadow: 'inset 0 0 0 1px rgba(105, 190, 69, 0)', offset: 1 }
            ], { duration: 850, iterations: 2, easing: 'ease-in-out', fill: 'none' });
            runtime.highPulseAnimations.set(row.key, animation);
            animation.onfinish = animation.oncancel = function() {
                if (runtime.highPulseAnimations.get(row.key) === animation) runtime.highPulseAnimations.delete(row.key);
            };
        });
    } catch (error) { log('High pulse unavailable: ' + error.message); }
}

export function getSessionHigh(key, current) {
    return readSessionHigh(key, current);
}

export function syncHighTimes() {
    synchronizeSessionHighTimes();
}

export function getDisplayHigh(frame, key, current) {
    if (runtime.highMode === 'ath') return displayedAllTimeState().highs[key];
    if (key === 'roomTotal') return { value: frame.roomTotalHigh, time: frame.isPlayback ? null : runtime.roomTotalHighTime };
    return frame.isPlayback ? { value: Math.max(frame.highs[key] || 0, current || 0), isNew: false } : getSessionHigh(key, current);
}

export function highLabel(high, compact) {
    return runtime.highMode.toUpperCase() + ':' + (runtime.highMode === 'ath' && !high.source ? '—' : compact ? compactNumber(high.value) : high.value.toLocaleString());
}

export function highDescription(high) {
    var label = runtime.highMode === 'ath' ? 'All-time high for ' + displayedHighRoom() : 'Session high';
    if (runtime.highMode === 'ath' && !high.source) return label + ': no record yet';
    return label + ': ' + high.value.toLocaleString() + (high.time != null ? ' · ' + new Date(high.time).toLocaleString() : '') +
        (runtime.highMode === 'ath' ? (high.source === 'file' ? ' · Added from a session file' : high.source === 'saved' ? ' · Restored local session' : ' · Recorded live') +
            (displayedAllTimeState().pending ? ' · Local only, not saved' : '') : '');
}

export function getHighValue(data, currentValue, timestamp) {
    var historyMax = data && data.length > 0 ? Math.max.apply(null, data) : 0;
    var newHigh = Math.max(historyMax, currentValue || 0);
    if (timestamp && newHigh > historyMax) {
        return { value: newHigh, isNew: true, time: timestamp };
    }
    return { value: newHigh, isNew: false };
}
