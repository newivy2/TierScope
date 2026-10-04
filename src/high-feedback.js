export function setAllTimeActionStatus(message, replayLabel) {
    var status = document.getElementById('all-time-action-status');
    if (status) status.textContent = message;
    var button = document.getElementById('btn-playback-add-all-time');
    if (button) {
        button.textContent = replayLabel || 'Add to all-time highs';
        button.title = message || 'Add this file\'s highs to the room named beside this button';
        button.setAttribute('aria-label', replayLabel ? replayLabel + '. ' + message : 'Add to all-time highs');
    }
}

