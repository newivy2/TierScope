import { isStorageNumber, isStorageObject, isStorageTimestamp } from './record-validation.js';
import { runtime } from './runtime.js';
import { normalizeStoredSession, validateStoredSession } from './storage.js';

export function validateSessionFile(file) {
    if (!isStorageObject(file) || file.format !== runtime.SESSION_FILE_FORMAT || file.formatVersion !== runtime.SESSION_FILE_VERSION) {
        throw new Error('This is not a supported TierScope session file.');
    }
    if (typeof file.room !== 'string' || !/^[a-z0-9_-]{1,100}$/i.test(file.room) ||
        typeof file.producerVersion !== 'string' || file.producerVersion.length > 40) {
        throw new Error('Invalid session file information.');
    }
    var data = file.session;
    validateStoredSession(data);
    if (data.schemaVersion !== runtime.STORAGE_SCHEMA_VERSION || !data.history.timestamps.length ||
        !isStorageObject(data.sessionHighs) || !isStorageNumber(data.roomTotalHigh) ||
        !(data.sessionStartedAt === null || isStorageTimestamp(data.sessionStartedAt)) ||
        typeof data.sessionStartEstimated !== 'boolean' || !isStorageTimestamp(data.pausedElapsedTime) ||
        typeof data.isPaused !== 'boolean' || typeof data.isStopped !== 'boolean' ||
        !(data.roomTotalHighTime === null || isStorageTimestamp(data.roomTotalHighTime))) {
        throw new Error('Session file is incomplete.');
    }
    runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
        if (!data.history[key].every(Number.isSafeInteger) || !Number.isSafeInteger(data.sessionHighs[key].value)) {
            throw new Error('Session counts must be whole numbers.');
        }
    });
    var roomPeak = 0;
    data.history.timestamps.forEach(function(_, i) {
        var total = data.history.total[i] + data.history.anonymous[i];
        if (!Number.isSafeInteger(total)) throw new Error('Invalid session room total.');
        roomPeak = Math.max(roomPeak, total);
    });
    if (!Number.isSafeInteger(data.roomTotalHigh) || data.roomTotalHigh < roomPeak) throw new Error('Invalid session room high.');
    // Copy only supported aggregate fields. Ignore extra fields, including
    // obsolete username collections; imported data never enters live storage.
    var normalized = normalizeStoredSession(data);
    var clean = { schemaVersion: runtime.STORAGE_SCHEMA_VERSION };
    ['timestamp', 'history', 'sessionStartedAt', 'sessionStartEstimated', 'sessionHighs',
        'roomTotalHigh', 'roomTotalHighTime', 'pausedElapsedTime', 'isPaused', 'isStopped', 'stoppedAt', 'stopReason'].forEach(function(key) {
        clean[key] = normalized[key];
    });
    return { format: runtime.SESSION_FILE_FORMAT, formatVersion: runtime.SESSION_FILE_VERSION,
        producerVersion: file.producerVersion, room: file.room, session: clean };
}
