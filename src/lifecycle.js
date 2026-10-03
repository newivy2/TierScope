import { drawAllSparklines } from './charts.js';
import { updateMiniFreshness } from './compact.js';
import { cancelGifExport } from './gif.js';
import { cancelHighPulses } from './highs.js';
import { updateDisplay } from './panel.js';
import { leavePlayback } from './replay.js';
import { runtime } from './runtime.js';
import { getDOMFallbackWaitSeconds, isAcquisitionCurrent, pauseForAccessRestriction, performScanThenReturn, readRequestPolicy, requestPolicyMessage, updateAcquisitionStatus, writeRequestPolicy } from './scanning.js';
import { deleteSession, getStorageKey, saveSession } from './storage.js';
import { checkTrendAutoEscalation, updateAutoTrendButton, updateTrendDisplay, updateTrendPresetButtons } from './trends.js';
import { formatElapsedTime, getModelName, isBroadcastRoom, log } from './utils.js';

export function isAbsencePaused() {
    return runtime.absencePausedAt !== null && runtime.isPaused && runtime.isAutoRefreshOn && !runtime.isStopped;
}

export function absencePauseDescription() {
    return 'Recording and elapsed time paused after 15 minutes without the broadcaster. ' +
        'API return checks every minute, subject to retry restrictions. A confirmed return resumes recording. ' +
        'Automatic Stop at ' + new Date(runtime.absencePausedAt + runtime.ABSENCE_STOP_MS).toLocaleString() +
        ' (3 hours after auto-pause). Use Resume to keep recording during this absence.';
}

export function getEffectiveScanIntervalSeconds() {
    if (isAbsencePaused()) return runtime.ABSENCE_CHECK_SECONDS;
    if (runtime.absenceOverrideActive) return runtime.scanIntervalSeconds;
    if (runtime.broadcasterAbsence.missing < 2 || runtime.broadcasterAbsence.since === null) return runtime.scanIntervalSeconds;
    return Math.max(runtime.scanIntervalSeconds, Date.now() - runtime.broadcasterAbsence.since >= 10 * 60000 ? 300 : 120);
}

export function nextBroadcasterAbsence(snapshot) {
    if (snapshot.source !== 'API') return runtime.broadcasterAbsence;
    if (snapshot.users.some(function(user) { return user.isOwner === true; })) {
        runtime.absenceOverrideActive = false;
        return { since: null, missing: 0 };
    }
    if (runtime.absenceOverrideActive || !runtime.isAutoRefreshOn || runtime.isPaused || runtime.isStopped) return runtime.broadcasterAbsence;
    return { since: runtime.broadcasterAbsence.since === null ? Date.now() : runtime.broadcasterAbsence.since,
        missing: Math.min(1000000, runtime.broadcasterAbsence.missing + 1) };
}

export function stopDescription() {
    return runtime.stopReason === 'absence' ? (runtime.absencePausedAt !== null ?
        'Stopped after 3 hours auto-paused for broadcaster absence' : 'Stopped after 3 hours of broadcaster absence') : 'Session stopped';
}

export function checkAbsenceStop() {
    if (runtime.isStopped || !runtime.isAutoRefreshOn || runtime.absenceOverrideActive) return false;
    if (runtime.absencePausedAt === null && !runtime.isPaused && runtime.broadcasterAbsence.missing >= 2 &&
        runtime.broadcasterAbsence.since !== null && Date.now() - runtime.broadcasterAbsence.since >= runtime.ABSENCE_PAUSE_MS) {
        // Anchor deadlines to observed absence even if a background tab wakes late.
        runtime.absencePausedAt = runtime.broadcasterAbsence.since + runtime.ABSENCE_PAUSE_MS;
        runtime.scanEpoch++;
        runtime.isScanning = false;
        runtime.pausedElapsedTime = runtime.trackingStartTime ? Math.max(0, runtime.absencePausedAt - runtime.trackingStartTime) : 0;
        runtime.isPaused = true;
        if (runtime.trackingTimerInterval) clearInterval(runtime.trackingTimerInterval);
        runtime.trackingTimerInterval = null;
        runtime.pendingHistoryGap = true;
        cancelHighPulses();
        // The next attempt checks presence only; it cannot record absent-room counts.
        runtime.nextScanAt = Math.max(Date.now(), readRequestPolicy().until);
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
    if (runtime.isStopped) return;
    runtime.stopReason = reason === 'absence' ? 'absence' : 'manual';
    runtime.stoppedAt = runtime.stopReason === 'absence' && runtime.broadcasterAbsence.since !== null ?
        Math.min(Date.now(), (runtime.absencePausedAt !== null ? runtime.absencePausedAt : runtime.broadcasterAbsence.since) + runtime.ABSENCE_STOP_MS) : Date.now();
    runtime.isStopped = true;
    // Invalidate pending API/DOM work before freezing this session.
    runtime.scanEpoch++;
    runtime.isScanning = false;
    runtime.isAutoRefreshOn = false;
    stopCountdown();
    runtime.nextScanAt = 0;
    if (!runtime.isPaused) runtime.pausedElapsedTime = runtime.trackingStartTime ? Math.max(0, runtime.stoppedAt - runtime.trackingStartTime) : 0;
    runtime.isPaused = true;
    if (runtime.trackingTimerInterval) clearInterval(runtime.trackingTimerInterval);
    runtime.trackingTimerInterval = null;
    runtime.pendingHistoryGap = false;
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
    runtime.isAutoRefreshOn = true;
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
    if (runtime.isStopped) return;
    if (runtime.sessionStartedAt === null) runtime.sessionStartedAt = Date.now();
    if (runtime.isPaused) {
        runtime.isPaused = false;
        runtime.trackingStartTime = Date.now() - runtime.pausedElapsedTime;
    } else if (!runtime.trackingStartTime) {
        runtime.trackingStartTime = Date.now();
    }
    if (runtime.trackingTimerInterval) {
        clearInterval(runtime.trackingTimerInterval);
        runtime.trackingTimerInterval = null;
    }
    runtime.trackingTimerInterval = setInterval(updateTrackingTimer, 1000);
    updateTrackingTimer();
    saveSession(getModelName());
}

export function pauseTrackingTimer() {
    if (runtime.isPaused) return;
    runtime.pendingHistoryGap = true;
    runtime.isPaused = true;
    runtime.pausedElapsedTime = runtime.trackingStartTime ? Math.max(0, Date.now() - runtime.trackingStartTime) : 0;
    if (runtime.trackingTimerInterval) {
        clearInterval(runtime.trackingTimerInterval);
        runtime.trackingTimerInterval = null;
    }
    updateTrackingTimer();
    saveSession(getModelName());
}

export function stopTrackingTimer() {
    if (runtime.trackingTimerInterval) {
        clearInterval(runtime.trackingTimerInterval);
        runtime.trackingTimerInterval = null;
    }
    runtime.trackingStartTime = null;
    runtime.sessionStartedAt = null;
    runtime.sessionStartEstimated = false;
    runtime.sessionHighs = {};
    runtime.pausedElapsedTime = 0;
    runtime.isPaused = false;
    runtime.roomTotalHighTime = null;
    runtime.tierHighTimes = {};
    runtime.withTokensHighTime = null;
    runtime.totalHighTime = null;
    runtime.anonHighTime = null;
    runtime.femaleTransHighTime = null;
    runtime.previousCounts = {
        'red': 0, 'green': 0, 'purple': 0, 'pink': 0,
        'dark-blue': 0, 'light-blue': 0, 'gray': 0, 'female-trans': 0,
        'withTokens': 0, 'total': 0, 'anonymous': 0
    };
    runtime.hasTrendBaseline = false;
    runtime.trendComparisonMode = 'last';
    runtime.autoTrendEscalation = true;
    runtime.newHighTiers = {};
    updateTrackingTimer();
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
    leavePlayback(false);
    cancelGifExport();
    log('Performing main reset...');
    if (deleteSaved) deleteSession(modelName);
    runtime.isStopped = false;
    runtime.stoppedAt = null;
    runtime.stopReason = null;
    runtime.broadcasterAbsence = { since: null, missing: 0 };
    runtime.absencePausedAt = null;
    runtime.absenceOverrideActive = false;
    runtime.activeSessionStorageKey = getStorageKey(modelName);
    runtime.scanEpoch++;
    runtime.isScanning = false;
    stopCountdown();
    stopTrackingTimer();
    // Reset the elapsed timer without changing the automatic scanning preference.
    runtime.isPaused = !runtime.isAutoRefreshOn;
    runtime.users.clear();
    runtime.lastAcceptedAcquisition = null;
    runtime.restoredDisplayFrame = null;
    runtime.lastAcquisitionAttemptSource = 'API';
    runtime.domHealthStatus.consecutiveFailures = 0;
    updateAcquisitionStatus();
    runtime.previousUserCount = 0;
    runtime.previousRoomTotal = 0;
    runtime.roomTotal = 0;
    runtime.roomTotalHigh = 0;
    runtime.previousCounts = {
        'red': 0, 'green': 0, 'purple': 0, 'pink': 0,
        'dark-blue': 0, 'light-blue': 0, 'gray': 0, 'female-trans': 0,
        'withTokens': 0, 'total': 0, 'anonymous': 0
    };
    runtime.hasTrendBaseline = false;
    runtime.trendComparisonMode = 'last';
    runtime.autoTrendEscalation = true;
    runtime.newHighTiers = {};
    runtime.history = {
        timestamps: [],
        'red': [], 'green': [], 'purple': [], 'pink': [], 'dark-blue': [], 'light-blue': [], 'gray': [], 'female-trans': [],
        'withTokens': [], 'total': [], 'anonymous': []
    };
    runtime.roomTotalHighTime = null;
    runtime.tierHighTimes = {};
    runtime.withTokensHighTime = null;
    runtime.totalHighTime = null;
    runtime.anonHighTime = null;
    runtime.femaleTransHighTime = null;
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
        if (isAcquisitionCurrent(resetContext)) performScanThenReturn(true);
    }, 500);
    updateTrendPresetButtons();
    updateAutoTrendButton();
    updateStopControls();
    log('Reset complete - starting fresh scan (epoch: ' + runtime.scanEpoch + ')');
}

export function resetCountdown() {
    runtime.lastScheduledIntervalSeconds = getEffectiveScanIntervalSeconds();
    runtime.countdownSeconds = runtime.lastScheduledIntervalSeconds;
    runtime.nextScanAt = runtime.isStopped ? 0 : Math.max(Date.now() + runtime.lastScheduledIntervalSeconds * 1000, readRequestPolicy().until);
    updateCountdownDisplay();
}

export function updateCountdownDisplay() {
    if (checkAbsenceStop()) return;
    var policy = readRequestPolicy();
    if (policy.blocked && runtime.isAutoRefreshOn) pauseForAccessRestriction();
    var policyMessage = requestPolicyMessage(policy);
    if (runtime.isAutoRefreshOn && policy.until > runtime.nextScanAt) runtime.nextScanAt = policy.until;
    updateMiniFreshness();
    if (runtime.isAutoRefreshOn && !runtime.isScanning && runtime.nextScanAt) {
        runtime.countdownSeconds = Math.max(0, Math.ceil((runtime.nextScanAt - Date.now()) / 1000));
    }
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
    if (newValue < 30) runtime.scanIntervalSeconds = 30;
    else if (newValue > 300) runtime.scanIntervalSeconds = 300;
    else runtime.scanIntervalSeconds = newValue;
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
    if (runtime.countdownInterval) {
        clearInterval(runtime.countdownInterval);
        runtime.countdownInterval = null;
    }
    if (!runtime.nextScanAt) resetCountdown();
    updateCountdownDisplay();
    if (runtime.isStopped) return;
    runtime.countdownInterval = setInterval(function() {
        if (!runtime.isAutoRefreshOn || runtime.isScanning) return;
        updateCountdownDisplay();
        if (runtime.countdownSeconds <= 0) {
            performScanThenReturn(true);
        }
    }, 1000);
}

export function stopCountdown() {
    if (runtime.countdownInterval) {
        clearInterval(runtime.countdownInterval);
        runtime.countdownInterval = null;
    }
}

export function pauseAutoRefresh() {
    if (runtime.isStopped) return;
    if (isAbsencePaused()) { runtime.scanEpoch++; runtime.isScanning = false; }
    runtime.absencePausedAt = null;
    runtime.broadcasterAbsence = { since: null, missing: 0 };
    runtime.isAutoRefreshOn = false;
    stopCountdown();
    pauseTrackingTimer();
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
        runtime.scanEpoch++;
        runtime.isScanning = false;
        runtime.absenceOverrideActive = true;
    }
    runtime.absencePausedAt = null;
    runtime.broadcasterAbsence = { since: null, missing: 0 };
    // Only an explicit Resume clears access denial. Internal failure paths
    // call pauseAutoRefresh directly and cannot activate this override.
    var policy = readRequestPolicy();
    if (policy.blocked) {
        writeRequestPolicy({ until: policy.serverUntil || 0, serverUntil: policy.serverUntil || 0, failures: 0, blocked: 0, status: 0, revision: '' });
    }
    runtime.isAutoRefreshOn = true;
    startTrackingTimer();
    startCountdown();
    performScanThenReturn(true);
    updateStopControls();
    updateAcquisitionStatus();
    saveSession(getModelName());
}
