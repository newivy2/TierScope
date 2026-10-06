import { readAutomaticKeepingMinutes } from './library-capacity.js';
import { recordedCoverageMs } from './library-query.js';
import { readModelFavorite } from './library-models.js';
import { runtime } from './runtime.js';
import { getStorageKey } from './record-validation.js';
import { captureLiveSessionFile } from './session-capture.js';
import { createLibraryReader, keepSessionInLibrary } from './session-library.js';
import { getRoomEpoch } from './storage.js';

const checkpointInterval = 60000;
const reader = createLibraryReader();
let checkpoint = {room: '', identity: '', signature: '', phase: '', attemptedAt: null, savedAt: null, error: ''};

export function automaticLibraryStatus(room) {
    return checkpoint.room === room && checkpoint.identity === room + ':' + runtime.sessionStartedAt + ':' + runtime.activeRoomEpoch ?
        {...checkpoint} : {savedAt: null, error: ''};
}

export function automaticLibraryWarning(room) {
    const state = automaticLibraryStatus(room);
    return state.error ? {saveWarning: true, text: 'Library save pending', color: 'var(--panel-warning)',
        title: 'Automatic Library keeping could not finish. Live data remains in this tab. Open Library to retry or download a session file. ' + state.error} : null;
}

export function clearAutomaticLibraryStatus(room) {
    if (checkpoint.room === room) checkpoint = {room, identity: '', signature: '', phase: '', attemptedAt: null, savedAt: null, error: ''};
    reader.clear();
}

// No delayed snapshot or replay data is queued. Each attempt checks the current
// owner and fresh consent, then captures that live owner synchronously. A failed
// Library write is independent of short-term session persistence and scanning.
export function keepFavoriteSession(room, force = false) {
    if (!room || room === 'unknown' || !runtime.history.timestamps.length) return;
    try {
        const key = getStorageKey(room);
        if (runtime.activeSessionStorageKey !== key) return;
        const identity = room + ':' + runtime.sessionStartedAt + ':' + runtime.activeRoomEpoch;
        if (checkpoint.identity !== identity) checkpoint = {room, identity, signature: '', phase: '', attemptedAt: null, savedAt: null, error: ''};
        const preference = readModelFavorite(room);
        if (!preference.autoKeep) { clearAutomaticLibraryStatus(room); return; }
        if (getRoomEpoch(key) !== runtime.activeRoomEpoch) return;
        const history = runtime.history;
        const minimumMinutes = readAutomaticKeepingMinutes();
        checkpoint.minimumMinutes = minimumMinutes;
        checkpoint.coveredMs = recordedCoverageMs(history);
        checkpoint.waiting = checkpoint.coveredMs < minimumMinutes * 60000;
        if (checkpoint.waiting) { checkpoint.error = ''; return; }
        const signature = [history.timestamps[0], history.timestamps.at(-1), history.timestamps.length, runtime.isPaused,
            runtime.isStopped, runtime.stoppedAt].join(':');
        const phase = [runtime.isPaused, runtime.isStopped, runtime.stoppedAt].join(':');
        const transition = checkpoint.phase && checkpoint.phase !== phase;
        if (!force && (signature === checkpoint.signature && !checkpoint.error ||
            !transition && checkpoint.attemptedAt !== null && Date.now() - checkpoint.attemptedAt < checkpointInterval)) return;
        checkpoint.attemptedAt = Date.now(); checkpoint.phase = phase;
        const archive = captureLiveSessionFile(room);
        // Capture and validation can fail without affecting the accepted sample.
        const result = keepSessionInLibrary(archive, '', reader);
        checkpoint.signature = signature; checkpoint.savedAt = Date.now(); checkpoint.error = '';
        return result;
    } catch (error) {
        checkpoint.room = room; checkpoint.error = error.message || String(error);
        return {error: checkpoint.error};
    }
}
