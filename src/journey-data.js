// Presentation data only: a saved snapshot is distinct from a live recording.
export function buildJourneyModel(state) {
    if (state.playback) return {replaying: true, text: 'Viewing replay · Live tracking ' + (state.stopped ? 'stopped' : state.paused ? 'paused' : 'active') + ' in ' + state.room, warning: !!state.error,
        detail: state.error || '', canKeep: false, canView: false, keepLabel: 'Keep in Library'};
    const tracking = state.room === 'unknown' ? 'Open a room' :
        state.stopped ? 'Tracking stopped' : state.paused ? 'Tracking paused' : 'Tracking live';
    const saved = state.saved;
    const keeping = state.error ? 'Library save pending' : saved ? state.automatic ? 'Automatically saved' : 'Saved to Library' :
        state.automatic ? 'Automatic saving on' : 'Not saved to Library';
    return {text: tracking + ' · ' + keeping, warning: !!state.error,
        detail: state.error ? state.error : saved ?
            (state.automatic ? 'Last confirmed save ' : 'Snapshot saved ') + new Date(saved.savedAt).toLocaleTimeString() +
                (state.newSamples ? (state.automatic ? ' · New scans will be saved at the next checkpoint.' : ' · New scans since this save. Keep again to update it.') : '') :
            !state.samples ? state.room === 'unknown' ? 'Open a model’s room to start tracking automatically.' :
                state.stopped ? 'Start a new session to record this room.' : state.paused ? 'Resume tracking to capture the first audience sample.' :
                'Waiting for the first audience scan. Tracking starts automatically.' :
            state.automatic ? 'Waiting for the first confirmed Library save.' : '',
        canKeep: state.samples > 0 && state.room !== 'unknown', canView: !!saved,
        keepLabel: state.error ? 'Retry keeping' : saved && state.newSamples ? 'Update saved session' : 'Keep in Library'};
}

// Room/start identity alone is not enough: incompatible recordings must never
// replace the recording a "View session" link promised to open.
export function resolveSavedReference(reference, entries, compatible) {
    if (!reference) return null;
    return entries.find(entry => (entry.id === reference.id || entry.lineage?.includes(reference.id) ||
        entry.archive.room.toLowerCase() === reference.archive.room.toLowerCase() &&
        entry.archive.session.sessionStartedAt === reference.archive.session.sessionStartedAt) &&
        compatible(entry.archive, reference.archive) !== null) || null;
}
