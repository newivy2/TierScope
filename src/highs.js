import { setAllTimeActionStatus } from './high-feedback.js';
import { cancelHighPulses } from './high-pulses.js';
import { displayedAllTimeState, displayedHighRoom } from './high-selectors.js';
import { emptyAllTimeHighs, readAllTimeHighs, sessionAllTimeHighs, storeAllTimeHighs } from './highs-store.js';
import { switchHighPreference } from './panel-preferences.js';
import { isPlaybackCurrent } from './playback-data.js';
import { setPlaybackAllTimeState } from './playback-state.js';
import { updateDisplay } from './presentation.js';
import { makeStorageId } from './record-validation.js';
import { paintPlayback } from './replay.js';
import { runtime } from './runtime.js';
import { validateSessionFile } from './session-file-format.js';

export function repaintHighMode() {
    cancelHighPulses();
    runtime.chartLayoutRevision++;
    if (isPlaybackCurrent(runtime.playback)) paintPlayback(runtime.playback);
    else updateDisplay();
    updateHighControls();
}

export function toggleHighMode() {
    switchHighPreference();
    var state = readAllTimeHighs(displayedHighRoom());
    if (isPlaybackCurrent(runtime.playback)) setPlaybackAllTimeState(runtime.playback, state);
    try { GM_setValue(runtime.HIGH_MODE_KEY, runtime.highMode); } catch (error) { /* The selected view still works for this tab. */ }
    repaintHighMode();
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
