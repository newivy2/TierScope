import { restoreScheduledInterval } from './acquisition-state.js';
import { readAllTimeHighs, sessionAllTimeHighs, storeAllTimeHighs } from './highs-store.js';
import { clearRestoredSessionFrame, prepareSessionHighsForSave, restoreLiveSession } from './live-session.js';
import { restoreTrendPreferences } from './panel-preferences.js';
import { createPlaybackSnapshot, getPlaybackFrame } from './playback-data.js';
import { updateAcquisitionStatus } from './presentation-status.js';
import { getStorageKey } from './record-validation.js';
import { leavePlayback } from './replay.js';
import { runtime } from './runtime.js';
import { noteSessionSave } from './session-health.js';
import { getEffectiveScanIntervalSeconds } from './session-selectors.js';
import { getRoomEpoch, getSessionWriteStatus, inspectStoredSession, writeSessionRecord } from './storage.js';
import { log } from './utils.js';

export function restoreSessionState(data) {
    var snapshot = createPlaybackSnapshot(data.history);
    restoreLiveSession(data, getPlaybackFrame(snapshot, snapshot.durationMs));
    restoreScheduledInterval(getEffectiveScanIntervalSeconds());
    restoreTrendPreferences(data.trendComparisonMode, data.autoTrendEscalation);
}

export function saveSession(model) {
    if (!model || model === 'unknown') return;
    try {
        var result = getSessionWriteStatus(model);
        if (result.status === 'ready') {
            prepareSessionHighsForSave();
            var saveData = {
                schemaVersion: runtime.STORAGE_SCHEMA_VERSION,
                producerVersion: runtime.TIERSCOPE_VERSION,
                timestamp: Date.now(),
                history: runtime.history,
                tierHighTimes: runtime.tierHighTimes,
                withTokensHighTime: runtime.withTokensHighTime,
                totalHighTime: runtime.totalHighTime,
                anonHighTime: runtime.anonHighTime,
                femaleTransHighTime: runtime.femaleTransHighTime,
                roomTotalHigh: runtime.roomTotalHigh,
                roomTotalHighTime: runtime.roomTotalHighTime,
                trackingStartTime: runtime.trackingStartTime,
                sessionStartedAt: runtime.sessionStartedAt,
                sessionStartEstimated: runtime.sessionStartEstimated,
                sessionHighs: runtime.sessionHighs,
                roomEpoch: runtime.activeRoomEpoch,
                isPaused: runtime.isPaused,
                isStopped: runtime.isStopped,
                stoppedAt: runtime.stoppedAt,
                stopReason: runtime.stopReason,
                broadcasterAbsence: runtime.broadcasterAbsence,
                absencePausedAt: runtime.absencePausedAt,
                absenceOverrideActive: runtime.absenceOverrideActive,
                pausedElapsedTime: runtime.pausedElapsedTime,
                previousCounts: runtime.previousCounts,
                hasTrendBaseline: runtime.hasTrendBaseline,
                trendComparisonMode: runtime.trendComparisonMode,
                autoTrendEscalation: runtime.autoTrendEscalation
            };
            result = writeSessionRecord(model, saveData);
        }
        if (result.status === 'reset') {
            runtime.sessionStorageNotice = result.message;
            updateAcquisitionStatus();
        } else if (result.status === 'saved') {
            noteSessionSave(model);
        } else if (result.status === 'failed') {
            noteSessionSave(model, result.error);
            log('Failed to save session: ' + result.error);
        }
        return result;
    } catch (e) {
        noteSessionSave(model, e.message || String(e));
        log('Failed to save session: ' + e);
        return {status: 'failed', error: e.message || String(e)};
    }
}

export function loadSession(model) {
    clearRestoredSessionFrame();
    if (!model || model === 'unknown') return false;
    leavePlayback(false);
    var key = getStorageKey(model);
    runtime.activeSessionStorageKey = key;
    runtime.activeRoomEpoch = getRoomEpoch(key);
    runtime.sessionStorageNotice = '';
    var allTime = readAllTimeHighs(model);
    var saved = inspectStoredSession(model, true);
    if (saved.protected || !saved.data) return false;
    var age = Date.now() - saved.data.timestamp;
    restoreSessionState(saved.data);
    // Bootstrap once from available, validated local session highs. A
    // deliberate ATH clear changes the epoch and disables this bootstrap.
    if (!allTime.error && allTime.epoch === 'initial' && !allTime.keys.length && saved.data.history.timestamps.length) {
        storeAllTimeHighs(model, sessionAllTimeHighs(saved.data, 'saved'));
    }
    log('Session restored for ' + model + ' (' + Math.round(age/60000) + ' min old; ' +
        (saved.legacy ? 'validated legacy schema 1' : 'storage schema ' + runtime.STORAGE_SCHEMA_VERSION) +
        '; producer ' + (saved.producerVersion === null ? 'unknown' : saved.producerVersion) + ')');
    return true;
}
