import { readAllTimeHighs, sessionAllTimeHighs, storeAllTimeHighs } from './highs-store.js';
import { getHistoryBreaks } from './history-data.js';
import { clearRestoredSessionFrame, prepareSessionHighsForSave, restoreLiveSession } from './live-session.js';
import { createPlaybackSnapshot, getPlaybackFrame } from './playback-data.js';
import { updateAcquisitionStatus } from './presentation-status.js';
import { getStorageKey, hasStorageField, isStorageNumber, isStorageObject, isStorageTimestamp, makeStorageId } from './record-validation.js';
import { leavePlayback } from './replay.js';
import { runtime } from './runtime.js';
import { noteSessionSave } from './session-health.js';
import { getEffectiveScanIntervalSeconds } from './session-selectors.js';
import { log } from './utils.js';

export function roomEpochKey(key) { return runtime.ROOM_EPOCH_PREFIX + key.slice(runtime.STORAGE_KEY_PREFIX.length); }

export function roomTabPrefix(key) { return runtime.TAB_RECORD_PREFIX + key.slice(runtime.STORAGE_KEY_PREFIX.length) + ':'; }

export function getRoomEpoch(key) { return GM_getValue(roomEpochKey(key), 'legacy'); }

export function readSavedSession(key) {
    var epoch = getRoomEpoch(key);
    var keys = GM_listValues().filter(function(candidate) { return candidate.indexOf(roomTabPrefix(key)) === 0; });
    if (epoch === 'legacy') keys.unshift(key);
    var selected;
    var warnings = [];
    keys.forEach(function(candidate) {
        try {
            var raw = GM_getValue(candidate, undefined);
            if (typeof raw === 'undefined') return;
            if (typeof raw !== 'string') throw new Error('Saved session must be JSON text');
            var parsed = JSON.parse(raw);
            var data = migrateStoredSession(parsed, determineStorageSchema(parsed));
            validateStoredSession(data);
            if (candidate !== key && typeof data.roomEpoch !== 'string') throw new Error('Missing tab record epoch');
            // Ignore obsolete names on restore without rewriting another tab's record.
            // New saves contain only aggregate session data. Existing source records
            // keep their normal expiration/Reset lifecycle.
            if (hasStorageField(parsed, 'sessionUniqueUsers') || hasStorageField(parsed, 'sessionFemaleTransUsers')) {
                delete parsed.sessionUniqueUsers; delete parsed.sessionFemaleTransUsers;
                raw = JSON.stringify(parsed);
            }
            // Validate before any deletion. Unsupported or corrupt records remain
            // untouched, and cannot prevent a compatible sibling from restoring.
            // Expiration also applies to old epochs, including late post-Reset writes.
            if (Date.now() - data.timestamp > runtime.STORAGE_MAX_AGE_MS) {
                if (candidate !== key) GM_deleteValue(candidate);
                return;
            }
            if (candidate !== key && data.roomEpoch !== epoch) return;
            var times = data.history.timestamps;
            var sampleTime = times.length ? Math.max.apply(null, times) : -1;
            var rank = [sampleTime, times.length, data.timestamp, candidate === key ? 0 : 1, candidate];
            if (!selected || rank.some(function(value, i) {
                return value > selected.rank[i] && rank.slice(0, i).every(function(v, j) { return v === selected.rank[j]; });
            })) selected = { raw: raw, rank: rank };
        } catch (error) {
            warnings.push(candidate + ': ' + error.message);
        }
    });
    var previous = runtime.sessionRecordWarnings.get(key) || [];
    warnings.forEach(function(warning) {
        if (previous.indexOf(warning) === -1) log('Saved record skipped and retained: ' + warning);
    });
    runtime.sessionRecordWarnings.set(key, warnings);
    return selected ? selected.raw : undefined;
}

export function determineStorageSchema(data) {
    if (!isStorageObject(data)) throw new Error('Saved session must be an object');
    if (!hasStorageField(data, 'schemaVersion')) return { version: 1, legacy: true };
    if (!Number.isSafeInteger(data.schemaVersion) || data.schemaVersion < 0) {
        throw new Error('Invalid storage schemaVersion');
    }
    return { version: data.schemaVersion, legacy: false };
}

export function migrateStoredSession(data, schema) {
    if (schema.version > runtime.STORAGE_SCHEMA_VERSION) {
        throw new Error('Newer storage schema ' + schema.version + '; this build supports ' + runtime.STORAGE_SCHEMA_VERSION);
    }
    if (schema.version === 1) return Object.assign({}, data, { schemaVersion: runtime.STORAGE_SCHEMA_VERSION });
    if (schema.version !== runtime.STORAGE_SCHEMA_VERSION) {
        throw new Error('Unsupported storage schema ' + schema.version + '; no migration path to ' + runtime.STORAGE_SCHEMA_VERSION);
    }
    return data;
}

export function validateStoredSession(data) {
    function requireField(condition, field) {
        if (!condition) throw new Error('Invalid saved-session field: ' + field);
    }
    requireField(isStorageObject(data), 'record');
    if (hasStorageField(data, 'schemaVersion')) {
        requireField(data.schemaVersion === runtime.STORAGE_SCHEMA_VERSION, 'schemaVersion');
    }
    if (hasStorageField(data, 'producerVersion')) {
        requireField(typeof data.producerVersion === 'string', 'producerVersion');
    }
    requireField(isStorageTimestamp(data.timestamp), 'timestamp');
    requireField(isStorageObject(data.history), 'history');
    requireField(Array.isArray(data.history.timestamps), 'history.timestamps');
    requireField(data.history.timestamps.length <= runtime.MAX_HISTORY_LENGTH, 'history length');
    requireField(data.history.timestamps.every(isStorageTimestamp), 'history.timestamps');
    runtime.STORAGE_HISTORY_SERIES.forEach(function(field) {
        var series = data.history[field];
        requireField(Array.isArray(series) && series.length === data.history.timestamps.length &&
            series.every(isStorageNumber), 'history.' + field);
    });
    if (hasStorageField(data.history, 'breaks')) {
        requireField(Array.isArray(data.history.breaks) && data.history.breaks.length === data.history.timestamps.length &&
            data.history.breaks.every(function(value) { return typeof value === 'boolean'; }), 'history.breaks');
    }
    if (hasStorageField(data, 'previousCounts')) {
        requireField(isStorageObject(data.previousCounts), 'previousCounts');
        runtime.STORAGE_HISTORY_SERIES.forEach(function(field) {
            requireField(isStorageNumber(data.previousCounts[field]), 'previousCounts.' + field);
        });
    }
    if (hasStorageField(data, 'tierHighTimes')) {
        requireField(isStorageObject(data.tierHighTimes), 'tierHighTimes');
        Object.keys(data.tierHighTimes).forEach(function(tier) {
            requireField(hasStorageField(runtime.TIERS, tier) &&
                (data.tierHighTimes[tier] === null || isStorageTimestamp(data.tierHighTimes[tier])), 'tierHighTimes.' + tier);
        });
    }
    runtime.STORAGE_NULLABLE_TIMES.forEach(function(field) {
        if (hasStorageField(data, field)) {
            requireField(data[field] === null || isStorageTimestamp(data[field]), field);
        }
    });
    if (hasStorageField(data, 'roomEpoch')) requireField(typeof data.roomEpoch === 'string', 'roomEpoch');
    if (hasStorageField(data, 'sessionStartEstimated')) requireField(typeof data.sessionStartEstimated === 'boolean', 'sessionStartEstimated');
    if (hasStorageField(data, 'sessionHighs')) {
        requireField(isStorageObject(data.sessionHighs), 'sessionHighs');
        runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
            var high = data.sessionHighs[key];
            requireField(isStorageObject(high) && isStorageNumber(high.value) &&
                (high.time === null || isStorageTimestamp(high.time)), 'sessionHighs.' + key);
            requireField(high.value >= Math.max.apply(null, [0].concat(data.history[key])), 'sessionHighs.' + key + ' below retained history');
            requireField(high.value === 0 || high.time !== null, 'sessionHighs.' + key + '.time');
        });
    }
    if (hasStorageField(data, 'roomTotalHigh')) requireField(isStorageNumber(data.roomTotalHigh), 'roomTotalHigh');
    if (hasStorageField(data, 'pausedElapsedTime')) {
        requireField(isStorageTimestamp(data.pausedElapsedTime) &&
            data.pausedElapsedTime <= Math.min(data.timestamp, Date.now()), 'pausedElapsedTime');
    }
    if (hasStorageField(data, 'trendComparisonMode')) {
        requireField(typeof data.trendComparisonMode === 'string' &&
            hasStorageField(runtime.TREND_PRESETS, data.trendComparisonMode), 'trendComparisonMode');
    }
    ['isPaused', 'isStopped', 'hasTrendBaseline', 'autoTrendEscalation', 'absenceOverrideActive'].forEach(function(field) {
        if (hasStorageField(data, field)) requireField(typeof data[field] === 'boolean', field);
    });
    if (data.isStopped) {
        requireField(data.isPaused === true && isStorageTimestamp(data.stoppedAt), 'stopped state');
        requireField(data.stopReason === 'manual' || data.stopReason === 'absence', 'stopReason');
    }
    if (hasStorageField(data, 'absencePausedAt') && data.absencePausedAt !== null) {
        requireField(isStorageTimestamp(data.absencePausedAt) && data.absencePausedAt <= data.timestamp &&
            data.isPaused === true && data.absenceOverrideActive !== true && isStorageObject(data.broadcasterAbsence) &&
            data.broadcasterAbsence.missing >= 2 && isStorageTimestamp(data.broadcasterAbsence.since) &&
            data.absencePausedAt === data.broadcasterAbsence.since + runtime.ABSENCE_PAUSE_MS, 'absencePausedAt');
    }
    if (hasStorageField(data, 'broadcasterAbsence')) {
        var absence = data.broadcasterAbsence;
        requireField(isStorageObject(absence) && Number.isSafeInteger(absence.missing) && absence.missing >= 0 &&
            absence.missing <= 1000000 && (absence.missing === 0 ? absence.since === null :
            isStorageTimestamp(absence.since) && absence.since <= data.timestamp), 'broadcasterAbsence');
    }
}

export function normalizeStoredSession(data) {
    var normalized = {
        timestamp: data.timestamp,
        history: Object.fromEntries(['timestamps'].concat(runtime.STORAGE_HISTORY_SERIES).map(function(field) {
            return [field, data.history[field].slice()];
        })),
        previousCounts: Object.fromEntries(runtime.STORAGE_HISTORY_SERIES.map(function(field) {
            return [field, hasStorageField(data, 'previousCounts') ? data.previousCounts[field] : 0];
        })),
        hasTrendBaseline: hasStorageField(data, 'previousCounts') && data.hasTrendBaseline === true,
        isPaused: data.isPaused === true,
        isStopped: data.isStopped === true,
        stoppedAt: data.isStopped ? data.stoppedAt : null,
        stopReason: data.isStopped ? data.stopReason : null,
        absencePausedAt: hasStorageField(data, 'absencePausedAt') ? data.absencePausedAt : null,
        absenceOverrideActive: data.absenceOverrideActive === true,
        broadcasterAbsence: data.broadcasterAbsence ? Object.assign({}, data.broadcasterAbsence) : { since: null, missing: 0 },
        trendComparisonMode: hasStorageField(data, 'trendComparisonMode') ? data.trendComparisonMode : 'last',
        autoTrendEscalation: !hasStorageField(data, 'autoTrendEscalation') || data.autoTrendEscalation,
        roomTotalHigh: hasStorageField(data, 'roomTotalHigh') ? data.roomTotalHigh : 0,
        pausedElapsedTime: hasStorageField(data, 'pausedElapsedTime') ? data.pausedElapsedTime : 0
    };
    ['tierHighTimes'].forEach(function(field) {
        normalized[field] = hasStorageField(data, field) ? Object.fromEntries(Object.entries(data[field])) : {};
    });
    runtime.STORAGE_NULLABLE_TIMES.forEach(function(field) {
        normalized[field] = hasStorageField(data, field) ? data[field] : null;
    });
    normalized.history.breaks = getHistoryBreaks(data.history).slice();
    normalized.sessionHighs = {};
    runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
        if (data.sessionHighs && data.sessionHighs[key]) {
            normalized.sessionHighs[key] = Object.assign({}, data.sessionHighs[key]);
        } else {
            // Legacy highs cannot be recovered beyond retained history. Rebuild
            // both the value and its timestamp from the same actual sample.
            var values = normalized.history[key];
            var value = Math.max.apply(null, [0].concat(values));
            normalized.sessionHighs[key] = { value: value,
                time: value > 0 ? normalized.history.timestamps[values.indexOf(value)] : null };
        }
    });
    normalized.sessionStartEstimated = data.sessionStartEstimated === true;
    if (!hasStorageField(data, 'sessionStartedAt')) {
        var knownTimes = [data.trackingStartTime, data.roomTotalHighTime].concat(normalized.history.timestamps)
            .filter(function(time) { return typeof time === 'number' && time > 0; });
        normalized.sessionStartedAt = knownTimes.length ? Math.min.apply(null, knownTimes) : null;
        normalized.sessionStartEstimated = knownTimes.length > 0;
    }
    return normalized;
}

export function protectSessionStorage(key, reason, producerVersion) {
    var prior = runtime.sessionStorageStatus.get(key);
    if (prior && prior.protected) return prior;
    var status = { protected: true, reason: reason, producerVersion: producerVersion == null ? null : producerVersion };
    runtime.sessionStorageStatus.set(key, status);
    log('Storage protected for ' + key + ': ' + reason +
        '. Saved data retained; automatic writes disabled until explicit Reset. Using a clean in-memory session on load.');
    return status;
}

export function inspectStoredSession(model, restore) {
    var key = getStorageKey(model);
    var prior = runtime.sessionStorageStatus.get(key);
    if (prior && prior.protected) return prior;
    var producerVersion = null;
    try {
        var raw = readSavedSession(key);
        if (!restore && prior && prior.raw === raw) return prior;
        if (typeof raw === 'undefined') {
            var empty = { protected: false, raw: raw, producerVersion: null };
            runtime.sessionStorageStatus.set(key, empty);
            return empty;
        }
        if (typeof raw !== 'string') throw new Error('Saved session must be JSON text');
        var parsed = JSON.parse(raw);
        if (isStorageObject(parsed) && typeof parsed.producerVersion === 'string') producerVersion = parsed.producerVersion;
        var schema = determineStorageSchema(parsed);
        var migrated = migrateStoredSession(parsed, schema);
        validateStoredSession(migrated);
        var status = { protected: false, raw: raw, producerVersion: producerVersion, legacy: schema.legacy };
        runtime.sessionStorageStatus.set(key, status);
        return restore ? Object.assign({}, status, { data: normalizeStoredSession(migrated) }) : status;
    } catch (e) {
        return protectSessionStorage(key, e.message, producerVersion);
    }
}

export function restoreSessionState(data) {
    var snapshot = createPlaybackSnapshot(data.history);
    restoreLiveSession(data, getPlaybackFrame(snapshot, snapshot.durationMs));
    runtime.lastScheduledIntervalSeconds = getEffectiveScanIntervalSeconds();
    runtime.trendComparisonMode = data.trendComparisonMode;
    runtime.autoTrendEscalation = data.autoTrendEscalation;
}

export function getStorageReportStatus(model) {
    if (!model || model === 'unknown') return { producer: 'Unknown (no saved session)', access: 'No room' };
    var status = inspectStoredSession(model, false);
    var warnings = runtime.sessionRecordWarnings.get(getStorageKey(model)) || [];
    return {
        producer: status.producerVersion === null ? (status.legacy ? 'Unknown (legacy session)' : 'Unknown') :
            (status.producerVersion || '(empty string)'),
        access: status.protected ? 'Protected / read-only: ' + status.reason :
            (runtime.sessionStorageNotice || (runtime.activeSessionStorageKey === getStorageKey(model) ? 'Writable (separate tab record)' : 'Not initialized')) +
            (warnings.length ? '; ' + warnings.length + ' skipped record(s) retained; see console' : '')
    };
}

export function saveSession(model) {
    if (!model || model === 'unknown') return;
    try {
        var key = getStorageKey(model);
        if (runtime.activeSessionStorageKey !== key || inspectStoredSession(model, false).protected) return;
        if (getRoomEpoch(key) !== runtime.activeRoomEpoch) {
            runtime.sessionStorageNotice = 'Reset in another tab — local data only; export TXT/CSV before reloading';
            updateAcquisitionStatus();
            return;
        }
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
        validateStoredSession(saveData);
        var raw = JSON.stringify(saveData);
        // A tab returning after expiration gets a new record ID. No read/modify/
        // write of a shared history key, even when two tabs save simultaneously.
        var tabRecord = runtime.tabRecords.get(key);
        if (!tabRecord || Date.now() - tabRecord.savedAt > runtime.STORAGE_MAX_AGE_MS) {
            tabRecord = { id: makeStorageId(), savedAt: Date.now() };
        }
        GM_setValue(roomTabPrefix(key) + tabRecord.id, raw);
        tabRecord.savedAt = Date.now();
        runtime.tabRecords.set(key, tabRecord);
        runtime.sessionStorageStatus.set(key, { protected: false, raw: raw, producerVersion: runtime.TIERSCOPE_VERSION, legacy: false });
        noteSessionSave(model);
        log('Session saved for ' + model + ' (storage schema ' + runtime.STORAGE_SCHEMA_VERSION + ', producer ' + runtime.TIERSCOPE_VERSION + ')');
    } catch (e) {
        noteSessionSave(model, e.message || String(e));
        log('Failed to save session: ' + e);
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

export function deleteSession(model) {
    if (!model || model === 'unknown') return;
    var key = getStorageKey(model);
    try {
        // Invalidate every old tab before clearing this tab's data. Late writes
        // carry the old epoch and cannot become the restored session.
        runtime.activeRoomEpoch = makeStorageId();
        GM_setValue(roomEpochKey(key), runtime.activeRoomEpoch);
        GM_listValues().filter(function(candidate) { return candidate.indexOf(roomTabPrefix(key)) === 0; })
            .forEach(function(candidate) { GM_deleteValue(candidate); });
        GM_deleteValue(key);
        runtime.sessionStorageStatus.delete(key);
        runtime.sessionRecordWarnings.delete(key);
        runtime.sessionStorageNotice = '';
        log('Session deleted for ' + model);
    } catch (e) {
        protectSessionStorage(key, 'Explicit Reset could not delete saved session: ' + e.message,
            (runtime.sessionStorageStatus.get(key) || {}).producerVersion);
        log('Reset cleared live tracking but saved storage remains protected: ' + e.message);
    }
}
