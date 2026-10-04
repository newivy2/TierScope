import { cancelHighPulses } from './high-pulses.js';
import { readAllTimeHighs } from './highs-store.js';
import { toggleView } from './layout.js';
import { createPlaybackSnapshot } from './playback-data.js';
import { nextSessionFileRequest, openOwnedPlayback } from './playback-state.js';
import { leavePlayback, paintPlayback, setPlaybackLayout } from './replay.js';
import { runtime } from './runtime.js';
import { validateSessionFile } from './session-file-format.js';
export function openSessionReplay(file) {
    var archive = validateSessionFile(file);
    leavePlayback(false);
    if (runtime.isMinimized) toggleView();
    openOwnedPlayback({url: location.href, key: runtime.activeSessionStorageKey, generation: runtime.initGuard,
        imported: true, archive: archive, snapshot: createPlaybackSnapshot(archive.session.history),
        allTimeState: readAllTimeHighs(archive.room)}, Date.now(), false);
    cancelHighPulses();
    setPlaybackLayout(true);
    return paintPlayback(runtime.playback);
}

export async function readSessionFile(file) {
    if (!file) return false;
    var request = nextSessionFileRequest(), url = location.href, generation = runtime.initGuard;
    function current() { return request === runtime.sessionFileLoadGeneration && url === location.href && generation === runtime.initGuard; }
    try {
        if (file.size > runtime.SESSION_FILE_MAX_BYTES) throw new Error('Session files must be 8 MB or smaller.');
        var text = await file.text();
        if (!current()) return false;
        if (text.length > runtime.SESSION_FILE_MAX_BYTES) throw new Error('Session file is too large.');
        return openSessionReplay(JSON.parse(text.replace(/^\uFEFF/, '')));
    } catch (error) {
        if (current()) alert('Could not open session file: ' + error.message);
        return false;
    }
}

