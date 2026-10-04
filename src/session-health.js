
// Session persistence owns its own small status store; it does not change scan state.
const sessionSaveStates = new Map();

export function noteSessionSave(room, error = '') {
    const previous = sessionSaveStates.get(room);
    sessionSaveStates.set(room, { savedAt: error ? (previous ? previous.savedAt : null) : Date.now(), error });
}

export function getSessionSaveState(room) {
    return sessionSaveStates.get(room) || { savedAt: null, error: '' };
}

export function sessionSaveWarningModel(state) {
    return state.error ? {saveWarning: true, text: 'Session not saved',
        title: 'The latest session data is only in this tab. Keep it open and use Save to download a session file. Saving will retry on the next scan. ' + state.error,
        color: 'var(--panel-warning)'} : null;
}
