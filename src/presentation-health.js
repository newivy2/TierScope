// A display failure belongs to one live-session identity, not a saved recording.
let presentationFailure = null;

export function notePresentationFailure(history, generation, url, error) {
    presentationFailure = {history, generation, url, error: String(error && error.message || error)};
}

export function getPresentationFailure(history, generation, url) {
    if (presentationFailure && (presentationFailure.history !== history ||
        presentationFailure.generation !== generation || presentationFailure.url !== url)) presentationFailure = null;
    return presentationFailure ? presentationFailure.error : '';
}

export function clearPresentationFailure(history, generation, url) {
    getPresentationFailure(history, generation, url);
    presentationFailure = null;
}

export function presentationWarningModel(history, generation, url) {
    const error = getPresentationFailure(history, generation, url);
    return error ? {saveWarning: true, text: 'Display needs refresh', color: 'var(--panel-warning)',
        title: 'Recorded data is retained in this tab. Drawing will retry automatically; saving is handled separately. ' + error} : null;
}
