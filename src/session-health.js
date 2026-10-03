// Session persistence owns its own small status store; it does not change scan state.
const sessionSaveStates = new Map();

export function noteSessionSave(room, error = '') {
    const previous = sessionSaveStates.get(room);
    sessionSaveStates.set(room, { savedAt: error ? (previous ? previous.savedAt : null) : Date.now(), error });
}

export function getSessionSaveState(room) {
    return sessionSaveStates.get(room) || { savedAt: null, error: '' };
}

export function showSessionSaveWarning(element, room) {
    const state = getSessionSaveState(room);
    if (!element) return false;
    if (!state.error) {
        if (element.dataset.sessionSaveWarning) { element.style.color = ''; delete element.dataset.sessionSaveWarning; }
        return false;
    }
    element.dataset.sessionSaveWarning = 'true';
    element.textContent = 'Session not saved';
    element.title = 'The latest session data is only in this tab. Keep it open and use Save to download a session file. Saving will retry on the next scan. ' + state.error;
    element.style.color = 'var(--panel-warning)';
    return true;
}
