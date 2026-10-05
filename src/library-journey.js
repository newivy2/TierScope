import { automaticLibraryStatus } from './automatic-library.js';
import { buildJourneyModel, resolveSavedReference } from './journey-data.js';
import { readModelFavorite } from './library-models.js';
import { runtime } from './runtime.js';
import { captureLiveSessionFile } from './session-capture.js';
import { compareLibrarySessions, createLibraryReader, keepSessionInLibrary, LIBRARY_PREFIX } from './session-library.js';
import { validateSessionFile } from './session-file-format.js';
import { getStorageKey } from './record-validation.js';
import { getModelName } from './utils.js';

const reader = createLibraryReader();
let verifiedRaw = null, verifiedId = '';
let manual = null, identity = '', discovered = false, checkedAt = 0, error = '', verified = null, checkedSource = null;
function liveIdentity() { return getModelName() + ':' + runtime.sessionStartedAt + ':' + runtime.activeRoomEpoch; }
function synchronize() {
    const next = liveIdentity();
    if (next !== identity) { identity = next; manual = null; discovered = false; checkedAt = 0; error = ''; verified = null; checkedSource = null; verifiedRaw = null; verifiedId = ''; reader.clear(); }
}
export function noteJourneySave(archive, result) {
    synchronize();
    if (archive.room.toLowerCase() !== getModelName().toLowerCase() || archive.session.sessionStartedAt !== runtime.sessionStartedAt) return;
    manual = {id: result.id, archive, savedAt: Date.now()}; error = ''; discovered = true; checkedAt = 0;
}
export function keepLiveJourneySession() {
    synchronize();
    try {
        const archive = captureLiveSessionFile(), result = keepSessionInLibrary(archive, '', reader);
        noteJourneySave(archive, result); return result;
    } catch (failure) { error = failure.message || String(failure); throw failure; }
}
export function journeyState() {
    synchronize();
    const room = getModelName(), samples = runtime.history.timestamps.length;
    const available = samples > 0 && runtime.activeSessionStorageKey === getStorageKey(room) && runtime.lastUrl === location.href;
    let automatic = false, preferenceError = '';
    try { automatic = readModelFavorite(room).autoKeep; } catch (failure) { preferenceError = 'Saving preferences unavailable. You can still keep this session explicitly.'; }
    const checkpoint = automaticLibraryStatus(room);
    if (!discovered && available) {
        discovered = true;
        if (runtime.restoredDisplayFrame && !checkpoint.id) try {
            const archive = captureLiveSessionFile();
            const entry = resolveSavedReference({id: '', archive}, reader.read().entries, compareLibrarySessions);
            if (entry) manual = {id: entry.id, archive: entry.archive, savedAt: entry.archive.session.timestamp};
        } catch (failure) { /* Explicit keeping remains available if discovery fails. */ }
    }
    let saved = checkpoint.id ? {id: checkpoint.id, archive: checkpoint.archive, savedAt: checkpoint.savedAt} : manual;
    if (manual && saved && manual.savedAt > saved.savedAt) saved = manual;
    // One small key read per five seconds. Only missing/changed records require
    // a fresh library read. A verification result stays valid between checks.
    if (saved && (checkedSource !== saved.archive || Date.now() - checkedAt >= 5000)) {
        checkedAt = Date.now(); checkedSource = saved.archive;
        try {
            const raw = GM_getValue(LIBRARY_PREFIX + saved.id, null);
            let archive = raw === verifiedRaw && saved.id === verifiedId ? verified?.archive : null;
            try { if (!archive && typeof raw === 'string') archive = validateSessionFile(JSON.parse(raw).archive); } catch (failure) { /* Resolve a compatible replacement below. */ }
            if (archive && (raw === verifiedRaw && saved.id === verifiedId || compareLibrarySessions(archive, saved.archive) !== null)) verified = {...saved, archive};
            else {
                const entry = resolveSavedReference(saved, reader.read().entries, compareLibrarySessions);
                verified = entry ? {...saved, id: entry.id, archive: entry.archive} : null;
            }
            verifiedRaw = raw; verifiedId = saved.id;
        } catch (failure) { verified = null; preferenceError = 'Saved session could not be checked. Open Saved sessions to retry.'; }
    }
    saved = saved ? verified : null;
    if (saved) manual = saved; // Revoking automatic consent keeps the confirmed Library link.
    const newSamples = !!saved && (runtime.history.timestamps.at(-1) > saved.archive.session.history.timestamps.at(-1));
    const state = {room, samples: available ? samples : 0, stopped: runtime.isStopped, paused: runtime.isPaused || !runtime.isAutoRefreshOn || runtime.absencePausedAt !== null,
        playback: runtime.presentationMode === 'PLAYBACK', automatic, saved, newSamples, error: error || checkpoint.error || preferenceError};
    return {...state, model: buildJourneyModel(state)};
}
export function openJourneyReference(reference) {
    const entry = resolveSavedReference(reference, reader.read().entries, compareLibrarySessions);
    if (!entry) throw new Error('This saved session was removed, changed or cannot be read. Open Saved sessions to refresh the list.');
    return entry.id;
}
