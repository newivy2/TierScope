import { readRequestPolicy, requestPolicyMessage } from './request-policy.js';
import { runtime } from './runtime.js';
import { presentationWarningModel } from './presentation-health.js';
import { getSessionSaveState, sessionSaveWarningModel } from './session-health.js';
import { absencePauseDescription, getEffectiveScanIntervalSeconds, isAbsencePaused, stopDescription } from './session-selectors.js';
import { formatSampleAge, getModelName } from './utils.js';

export function buildAcquisitionStatusModel() {
    var model = {text: '', title: '', color: null, saveWarning: false};
    var warning = sessionSaveWarningModel(getSessionSaveState(getModelName())) || presentationWarningModel(runtime.history, runtime.initGuard, location.href);
    if (warning) return warning;
    if (runtime.isStopped) {
        model.text = 'Stopped';
        model.title = stopDescription() + ' at ' + new Date(runtime.stoppedAt).toLocaleString() + '. History and elapsed time are frozen.';
        return model;
    }
    if (runtime.sessionStorageNotice) {
        model.text = 'Local only • room reset';
        model.title = runtime.sessionStorageNotice;
        return model;
    }
    var policyMessage = requestPolicyMessage(readRequestPolicy());
    if (policyMessage) {
        var sample = runtime.lastAcceptedAcquisition || runtime.restoredDisplayFrame;
        model.text = policyMessage;
        model.title = policyMessage + (sample ? '. Last sample: ' + new Date(sample.timestamp).toISOString() : '. No accepted sample.');
        return model;
    }
    if (isAbsencePaused()) {
        model.text = 'Auto-paused • return checks';
        model.title = absencePauseDescription();
        return model;
    }
    if (!runtime.lastAcceptedAcquisition) {
        if (runtime.restoredDisplayFrame) {
            model.text = 'Saved • ' + formatSampleAge(runtime.restoredDisplayFrame.timestamp);
            model.title = 'Saved sample recorded at: ' + new Date(runtime.restoredDisplayFrame.timestamp).toISOString() +
                '. Age is measured from the sample time, not the session save time.' +
                ' Waiting for the first fresh sample since restore.';
        } else {
            model.text = 'No sample';
            model.title = 'No accepted sample in this page session';
        }
        return model;
    }
    model.text = runtime.lastAcceptedAcquisition.source + ' • ' + formatSampleAge(runtime.lastAcceptedAcquisition.timestamp);
    model.title = 'Last accepted sample: ' + new Date(runtime.lastAcceptedAcquisition.timestamp).toISOString() +
        '. TierScope and the USERS tab refresh independently.';
    return model;
}

export function buildFreshnessModel() {
    var model = {text: '', title: '', color: null, saveWarning: false};
    var warning = sessionSaveWarningModel(getSessionSaveState(getModelName())) || presentationWarningModel(runtime.history, runtime.initGuard, location.href);
    if (warning) return warning;
    if (runtime.isStopped) {
        model.text = 'Stopped'; model.title = stopDescription() + '. Start begins a new session.';
        model.color = 'var(--panel-muted)'; return model;
    }
    if (isAbsencePaused() && !runtime.sessionStorageNotice) {
        var waitingPolicy = requestPolicyMessage(readRequestPolicy());
        model.text = waitingPolicy || 'Auto-paused';
        model.title = absencePauseDescription() + (waitingPolicy ? ' ' + waitingPolicy + '.' : ' Next return check: ' + runtime.countdownSeconds + 's.');
        model.color = 'var(--panel-warning)';
        return model;
    }
    var sample = runtime.lastAcceptedAcquisition || runtime.restoredDisplayFrame;
    var source = runtime.lastAcceptedAcquisition ? runtime.lastAcceptedAcquisition.source : sample ? 'Saved' : 'No sample';
    model.text = runtime.sessionStorageNotice ? 'Local only' : (runtime.isAutoRefreshOn ? source : 'Paused') +
        (sample ? ' · ' + formatSampleAge(sample.timestamp) : '');
    model.color = runtime.sessionStorageNotice ? 'var(--panel-warning)' : runtime.isAutoRefreshOn ? 'var(--panel-muted)' : 'var(--panel-paused)';
    var policyMessage = requestPolicyMessage(readRequestPolicy());
    if (policyMessage && !runtime.sessionStorageNotice) { model.text = policyMessage; model.color = 'var(--panel-warning)'; }
    if (!policyMessage && runtime.isAutoRefreshOn && getEffectiveScanIntervalSeconds() > runtime.scanIntervalSeconds) {
        model.text = 'Reduced · ' + getEffectiveScanIntervalSeconds() / 60 + 'm';
    }
    model.title = runtime.sessionStorageNotice || (policyMessage ? policyMessage + '. ' : '') + source + (sample ? ': ' + new Date(sample.timestamp).toISOString() : '') +
        '. Age of the last accepted sample. ' + (runtime.isAutoRefreshOn ? 'Next attempt: ' + runtime.countdownSeconds + 's.' : 'Automatic scans paused.');
    return model;
}
