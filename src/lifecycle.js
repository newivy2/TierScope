import { isAcquisitionCurrent } from './acquisition-context.js';
import { clearAcquisitionDeadline, clearDOMFailures, invalidateAcquisition, noteAcquisitionSource, refreshAcquisitionCountdown, scheduleNextAcquisition, schedulePresenceAcquisition, selectScanInterval, startAcquisitionClock, stopAcquisitionClock } from './acquisition-state.js';
import { drawAllSparklines } from './charts.js';
import { cancelGifExport } from './gif.js';
import { cancelHighPulses } from './high-pulses.js';
import { nextSessionAbsence, pauseSessionClock, pauseSessionForAbsence, pauseSessionRecording, resetLiveSession, resumeSessionRecording, startSessionClock, stopLiveSession } from './live-session.js';
import { resetTrendPreferences } from './panel-preferences.js';
import { updateAcquisitionStatus, updateMiniFreshness } from './presentation-status.js';
import { updateDisplay, updateTrendDisplay } from './presentation.js';
import { getStorageKey } from './record-validation.js';
import { leavePlayback } from './replay.js';
import { getDOMFallbackWaitSeconds, readRequestPolicy, requestPolicyMessage, writeRequestPolicy } from './request-policy.js';
import { runtime } from './runtime.js';
import { saveSession } from './session-persistence.js';
import { absencePauseDescription, getEffectiveScanIntervalSeconds, isAbsencePaused, stopDescription } from './session-selectors.js';
import { deleteSession } from './storage.js';
import { checkTrendAutoEscalation, updateAutoTrendButton, updateTrendPresetButtons } from './trends.js';
import { formatElapsedTime, getModelName, isBroadcastRoom, log } from './utils.js';

export function nextBroadcasterAbsence(snapshot) {
    return nextSessionAbsence(Object.assign({}, snapshot, {observedAt: Date.now()}));
}

export function checkAbsenceStop() {
    if (runtime.isStopped || !runtime.isAutoRefreshOn || runtime.absenceOverrideActive) return false;
    if (pauseSessionForAbsence(Date.now(), runtime.ABSENCE_PAUSE_MS)) {
        invalidateAcquisition();
        stopTrackingTimer();
        cancelHighPulses();
        // The next attempt checks presence only; it cannot record absent-room counts.
        schedulePresenceAcquisition(Date.now(), readRequestPolicy().until);
        updateTrackingTimer();
        updateStopControls();
        updateAcquisitionStatus();
        saveSession(getModelName());
    }
    if (isAbsencePaused() && Date.now() - runtime.absencePausedAt >= runtime.ABSENCE_STOP_MS) {
        stopTracking('absence');
        return true;
    }
    return false;
}

export function updateStopControls() {
    var reset = document.getElementById('btn-main-reset');
    if (reset) {
        reset.disabled = !isBroadcastRoom();
        reset.style.opacity = reset.disabled ? '0.5' : '1';
        reset.title = reset.disabled ? 'Open a room to reset tracking' : 'Reset all tracking data';
    }
    var stop = document.getElementById('btn-control-stop');
    if (stop) { stop.disabled = runtime.isStopped; stop.style.opacity = runtime.isStopped ? '0.5' : '1'; }
    ['btn-auto', 'btn-control-auto'].forEach(function(id) {
        var button = document.getElementById(id);
        if (!button) return;
        button.innerHTML = runtime.isStopped ? 'Start' : runtime.isAutoRefreshOn && !isAbsencePaused() ? '⏸' : '▶';
        button.title = runtime.isStopped ? 'Start a new session (keeps this stopped record until normal cleanup)' :
            isAbsencePaused() ? 'Resume recording now; cancel absence slowdown, automatic pause and Stop until the broadcaster returns' :
            runtime.isAutoRefreshOn ? 'Pause scans and elapsed time' : 'Resume this session';
        button.setAttribute('aria-label', runtime.isStopped ? 'Start a new session' : isAbsencePaused() ? 'Resume recording' : runtime.isAutoRefreshOn ? 'Pause scans' : 'Resume scans');
        button.style.background = runtime.isStopped ? '#4169E1' : isAbsencePaused() ? '#b86b00' : runtime.isAutoRefreshOn ? '#32CD32' : '#ff4444';
    });
}

export function stopTracking(reason) {
    if (!stopLiveSession(reason, Date.now(), runtime.ABSENCE_STOP_MS)) return;
    // Invalidate pending API/DOM work before freezing the session's effects.
    invalidateAcquisition();
    stopCountdown();
    clearAcquisitionDeadline();
    stopTrackingTimer();
    cancelHighPulses();
    updateTrackingTimer();
    updateStopControls();
    updateDisplay();
    updateCountdownDisplay();
    updateAcquisitionStatus();
    saveSession(getModelName());
}

export function startNewSession() {
    if (!runtime.isStopped) return;
    if (!confirm('Start a new session?\n\nThe chart and elapsed time will start from zero. Export this stopped session first if you want to keep a report, CSV or GIF. Its saved record is retained until normal storage cleanup.')) return;
    saveSession(getModelName());
    runtime.tabRecords.delete(getStorageKey(getModelName()));
    resetTrackingData(false);
}

export function updateTrackingTimer() {
    var controlTimerEl = document.getElementById('control-tracking-timer');
    var displayTime = '00:00:00';
    var displayColor = 'var(--panel-subtle)';
    if (runtime.isPaused) {
        displayTime = formatElapsedTime(runtime.pausedElapsedTime);
        displayColor = 'var(--panel-negative)';
    } else if (runtime.trackingStartTime) {
        displayTime = formatElapsedTime(Date.now() - runtime.trackingStartTime);
        displayColor = 'var(--panel-warning)';
    }
    if (controlTimerEl) {
        controlTimerEl.textContent = displayTime;
        controlTimerEl.style.color = displayColor;
    }
    checkTrendAutoEscalation();
}

export function startTrackingTimer() {
    if (!startSessionClock(Date.now())) return;
    startAcquisitionClock('trackingTimerInterval', updateTrackingTimer, 1000);
    updateTrackingTimer();
    saveSession(getModelName());
}

export function pauseTrackingTimer() {
    if (!pauseSessionClock(Date.now())) return;
    stopAcquisitionClock('trackingTimerInterval');
    updateTrackingTimer();
    saveSession(getModelName());
}

export function stopTrackingTimer() {
    // Cancel the browser clock only. Reset/navigation own session data clearing.
    stopAcquisitionClock('trackingTimerInterval');
}

export function resetAllTracking() {
    if (!isBroadcastRoom()) return;
    if (!confirm('Reset all tracking data?\n\nThis will clear:\n- All session history\n- Trend tracking\n- Elapsed timer\n\nA new scan will start immediately.')) {
        return;
    }
    resetTrackingData(true);
}

export function resetTrackingData(deleteSaved) {
    var modelName = getModelName();
    if (modelName === 'unknown') return;
    // Keep the departing favorite session before Reset advances its epoch.
    saveSession(modelName, true);
    leavePlayback(false);
    cancelGifExport();
    log('Performing main reset...');
    if (deleteSaved) deleteSession(modelName);
    runtime.activeSessionStorageKey = getStorageKey(modelName);
    invalidateAcquisition();
    stopCountdown();
    stopTrackingTimer();
    resetLiveSession(deleteSaved ? 'reset' : 'start');
    noteAcquisitionSource('API');
    clearDOMFailures();
    resetTrendPreferences();
    updateAcquisitionStatus();
    resetCountdown();
    updateDisplay();
    updateTrendDisplay();
    updateTrackingTimer();
    updateCountdownDisplay();
    drawAllSparklines();
    if (runtime.isAutoRefreshOn) {
        startTrackingTimer();
        startCountdown();
    }
    // Persist even when paused, before the deferred one-off scan can run or fail.
    saveSession(modelName);
    var resetContext = { epoch: runtime.scanEpoch, generation: runtime.initGuard, url: location.href };
    setTimeout(function() {
        if (isAcquisitionCurrent(resetContext)) lifecycleEffects.scan(true);
    }, 500);
    updateTrendPresetButtons();
    updateAutoTrendButton();
    updateStopControls();
    log('Reset complete - starting fresh scan (epoch: ' + runtime.scanEpoch + ')');
}

export function resetCountdown() {
    scheduleNextAcquisition(getEffectiveScanIntervalSeconds(), Date.now(), readRequestPolicy().until, runtime.isStopped);
    updateCountdownDisplay();
}

export function updateCountdownDisplay() {
    if (checkAbsenceStop()) return;
    var policy = readRequestPolicy();
    if (policy.blocked && runtime.isAutoRefreshOn) pauseForAccessRestriction();
    var policyMessage = requestPolicyMessage(policy);
    refreshAcquisitionCountdown(Date.now(), policy.until, runtime.isAutoRefreshOn);
    updateMiniFreshness();
    var fallbackWait = getDOMFallbackWaitSeconds(getModelName());
    var timingTitle = 'Next API attempt after the countdown. ' + (fallbackWait > 0 ?
        'DOM fallback eligible in ' + fallbackWait + 's if the API fails.' :
        'DOM fallback eligible if the API fails.');
    var statusEl = document.getElementById('auto-status');
    var timerDisplay = document.getElementById('timer-display');
    var expandedCountdown = document.getElementById('expanded-countdown');
    var controlNextScan = document.getElementById('control-next-scan');
    if (runtime.isStopped) {
        [statusEl, expandedCountdown, controlNextScan].forEach(function(el) {
            if (el) { el.textContent = 'Stopped'; el.title = stopDescription(); el.style.color = 'var(--panel-muted)'; }
        });
        updateStopControls();
        return;
    }
    if (isAbsencePaused()) {
        if (timerDisplay) timerDisplay.textContent = runtime.scanIntervalSeconds + 's';
        [statusEl, expandedCountdown, controlNextScan].forEach(function(el) {
            if (!el) return;
            el.textContent = policyMessage || (el === statusEl ? 'Auto-paused' : runtime.isScanning ? 'Checking...' : 'Check: ' + runtime.countdownSeconds + 's');
            el.title = absencePauseDescription() + (policyMessage ? ' ' + policyMessage + '.' : ' Next return check: ' + runtime.countdownSeconds + 's.');
            el.style.color = 'var(--panel-warning)';
        });
        updateStopControls();
        return;
    }
    var effectiveInterval = getEffectiveScanIntervalSeconds();
    var reduced = effectiveInterval > runtime.scanIntervalSeconds;
    timingTitle += ' Selected interval: ' + runtime.scanIntervalSeconds + 's. Effective interval: ' + effectiveInterval + 's.' +
        (reduced ? ' Reduced scanning while the broadcaster is absent; auto-pause at 15 minutes, then return checks for up to 3 hours.' : '') +
        (runtime.absenceOverrideActive ? ' Absence automation manually overridden until the broadcaster is detected again.' : '');
    [statusEl, expandedCountdown, controlNextScan].forEach(function(el) {
        if (el) el.title = runtime.isAutoRefreshOn ? timingTitle :
            'Automatic scans paused. An in-flight scan may finish. ' + timingTitle;
    });
    if (timerDisplay) {
        timerDisplay.textContent = runtime.scanIntervalSeconds + 's';
    }
    if (expandedCountdown) {
        if (runtime.isScanning) {
            expandedCountdown.textContent = 'scanning...';
            expandedCountdown.style.color = 'var(--panel-warning)';
        } else if (runtime.isAutoRefreshOn) {
            expandedCountdown.textContent = 'next: ' + runtime.countdownSeconds + 's';
            expandedCountdown.style.color = 'var(--panel-positive)';
        } else {
            expandedCountdown.textContent = 'paused';
            expandedCountdown.style.color = 'var(--panel-negative)';
        }
    }
    if (controlNextScan) {
        if (runtime.isScanning) {
            controlNextScan.textContent = 'Scanning...';
            controlNextScan.style.color = 'var(--panel-warning)';
        } else if (runtime.isAutoRefreshOn) {
            controlNextScan.textContent = (reduced ? 'Reduced: ' : 'Next: ') + runtime.countdownSeconds + 's';
            controlNextScan.style.color = 'var(--panel-positive)';
        } else {
            controlNextScan.textContent = 'Paused';
            controlNextScan.style.color = 'var(--panel-negative)';
        }
    }
    if (policyMessage) {
        [statusEl, expandedCountdown, controlNextScan].forEach(function(el) {
            if (!el) return;
            el.textContent = policyMessage; el.style.color = 'var(--panel-warning)';
            el.title = policyMessage + (policy.blocked ? '. Automatic scans stopped. After resolving access, use Resume to retry.' :
                '. No API or DOM acquisition before ' + new Date(policy.until).toLocaleString() + '.');
        });
        return;
    }
    if (!statusEl) return;
    if (runtime.isScanning) {
        statusEl.textContent = 'Scanning...';
        statusEl.style.color = 'var(--panel-warning)';
    } else if (runtime.isAutoRefreshOn) {
        statusEl.textContent = 'Next: ' + runtime.countdownSeconds + 's';
        statusEl.style.color = 'var(--panel-positive)';
    } else {
        statusEl.textContent = 'Auto: OFF';
        statusEl.style.color = 'var(--panel-negative)';
    }
}

export function adjustTimer(delta) {
    var newValue = runtime.scanIntervalSeconds + delta;
    selectScanInterval(newValue);
    if (runtime.isAutoRefreshOn) {
        stopCountdown();
        resetCountdown();
        startCountdown();
    } else {
        resetCountdown();
        var timerDisplay = document.getElementById('timer-display');
        if (timerDisplay) {
            timerDisplay.textContent = runtime.scanIntervalSeconds + 's';
        }
    }
    updateCountdownDisplay();
}

export function startCountdown() {
    if (runtime.isStopped) return;
    stopAcquisitionClock('countdownInterval');
    if (!runtime.nextScanAt) resetCountdown();
    updateCountdownDisplay();
    if (runtime.isStopped) return;
    startAcquisitionClock('countdownInterval', function() {
        if (!runtime.isAutoRefreshOn || runtime.isScanning) return;
        updateCountdownDisplay();
        if (runtime.countdownSeconds <= 0) {
            lifecycleEffects.scan(true);
        }
    }, 1000);
}

export function stopCountdown() {
    stopAcquisitionClock('countdownInterval');
}

export function pauseAutoRefresh() {
    if (runtime.isStopped) return;
    if (isAbsencePaused()) { invalidateAcquisition(); }
    pauseSessionRecording(Date.now());
    stopCountdown();
    stopTrackingTimer();
    updateTrackingTimer();
    updateStopControls();
    updateCountdownDisplay();
    updateAcquisitionStatus();
    saveSession(getModelName());
}

export function toggleAutoRefresh() {
    if (runtime.isStopped) { startNewSession(); return; }
    if (checkAbsenceStop()) return;
    var overridingAbsence = isAbsencePaused();
    if (runtime.isAutoRefreshOn && !overridingAbsence) { pauseAutoRefresh(); return; }
    if (overridingAbsence) {
        // Discard a pending presence check before starting a normal scan.
        // Only an observed API owner re-arms automation for this session.
        invalidateAcquisition();
    }
    // Only an explicit Resume clears access denial. Internal failure paths
    // call pauseAutoRefresh directly and cannot activate this override.
    var policy = readRequestPolicy();
    if (policy.blocked) {
        writeRequestPolicy({ until: policy.serverUntil || 0, serverUntil: policy.serverUntil || 0, failures: 0, blocked: 0, status: 0, revision: '' });
    }
    resumeSessionRecording(Date.now(), overridingAbsence);
    startTrackingTimer();
    startCountdown();
    lifecycleEffects.scan(true);
    updateStopControls();
    updateAcquisitionStatus();
    saveSession(getModelName());
}
export function pauseForAccessRestriction() {
    pauseAutoRefresh();
}

// The scan action is wired by bootstrap, keeping scheduling independent of acquisition controllers.
let lifecycleEffects;
export function initializeLifecycle(effects) { lifecycleEffects = effects; }
