import { getSessionHigh } from './high-selectors.js';
import { getHistoryBreaks } from './history-data.js';
import { isPlaybackCurrent } from './playback-data.js';
import { getStorageKey } from './record-validation.js';
import { runtime } from './runtime.js';
import { validateSessionFile } from './session-file-format.js';
import { getModelName, getModelNameFromUrl } from './utils.js';

export function captureSessionFile() {
    if (isPlaybackCurrent(runtime.playback) && runtime.playback.archive) return runtime.playback.archive;
    if (location.href !== runtime.lastUrl) throw new Error('No recorded session to save yet.');
    return captureLiveSessionFile();
}

// Explicit room permits a final checkpoint of the departing room, before its
// owner is reset. Playback never supplies data to automatic Library keeping.
export function captureLiveSessionFile(room = getModelName()) {
    if (!runtime.history.timestamps.length || room === 'unknown' || runtime.activeSessionStorageKey !== getStorageKey(room) ||
        room !== getModelNameFromUrl(runtime.lastUrl)) {
        throw new Error('No recorded session to save yet.');
    }
    var now = Date.now();
    var data = {
        schemaVersion: runtime.STORAGE_SCHEMA_VERSION, timestamp: now,
        history: { timestamps: runtime.history.timestamps.slice(), breaks: getHistoryBreaks(runtime.history).slice() },
        sessionStartedAt: runtime.sessionStartedAt, sessionStartEstimated: runtime.sessionStartEstimated,
        sessionHighs: {}, roomTotalHigh: runtime.roomTotalHigh, roomTotalHighTime: runtime.roomTotalHighTime,
        pausedElapsedTime: runtime.isPaused ? runtime.pausedElapsedTime : runtime.trackingStartTime ? Math.max(0, now - runtime.trackingStartTime) : 0,
        isPaused: runtime.isPaused, isStopped: runtime.isStopped, stoppedAt: runtime.stoppedAt, stopReason: runtime.stopReason
    };
    runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
        data.history[key] = runtime.history[key].slice();
        data.sessionHighs[key] = getSessionHigh(key, 0);
    });
    runtime.history.timestamps.forEach(function(time, i) {
        var total = runtime.history.total[i] + runtime.history.anonymous[i];
        if (total > data.roomTotalHigh) { data.roomTotalHigh = total; data.roomTotalHighTime = time; }
    });
    return validateSessionFile({ format: runtime.SESSION_FILE_FORMAT, formatVersion: runtime.SESSION_FILE_VERSION,
        producerVersion: runtime.TIERSCOPE_VERSION, room, session: data });
}
