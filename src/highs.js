import { validateSessionFile } from './files.js';
import { displayedAllTimeState, displayedHighRoom } from './high-selectors.js';
import { readAllTimeHighs, sessionAllTimeHighs, storeAllTimeHighs } from './highs-store.js';
import { isPlaybackCurrent } from './playback-data.js';
import { setPlaybackAllTimeState } from './playback-state.js';
import { updateDisplay } from './presentation.js';
import { makeStorageId } from './record-validation.js';
import { paintPlayback } from './replay.js';
import { runtime } from './runtime.js';
import { log } from './utils.js';

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
    if (isPlaybackCurrent(runtime.playback)) setPlaybackAllTimeState(runtime.playback, state);
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
        setPlaybackAllTimeState(runtime.playback, result.state);
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
        if (isPlaybackCurrent(runtime.playback)) setPlaybackAllTimeState(runtime.playback, state);
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
