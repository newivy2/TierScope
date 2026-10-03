import { drawAllSparklines } from './charts.js';
import { validateDOMHealth } from './dom.js';
import { cleanupDragListeners, restorePanelGeometry } from './layout.js';
import { isAbsencePaused, startCountdown, startTrackingTimer, stopCountdown, stopTrackingTimer, updateCountdownDisplay, updateStopControls, updateTrackingTimer } from './lifecycle.js';
import { createPanel, updateDisplay } from './panel.js';
import { leavePlayback } from './replay.js';
import { runtime } from './runtime.js';
import { isAcquisitionCurrent, performScanThenReturn, readRequestPolicy, updateAcquisitionStatus } from './scanning.js';
import { loadSession, saveSession } from './storage.js';
import { updateTrendDisplay } from './trends.js';
import { getModelName, getModelNameFromUrl, isBroadcastRoom, log } from './utils.js';

export function scheduleInit(delay) {
    var generation = runtime.initGuard;
    var url = location.href;
    setTimeout(function() {
        if (generation === runtime.initGuard && url === location.href) init();
    }, delay);
}

export function init() {
    leavePlayback(false);
    var myGeneration = ++runtime.initGuard;
    runtime.isScanning = false;
    log('Initializing... (generation ' + myGeneration + ')');
    if (runtime.healthCheckInterval) {
        clearInterval(runtime.healthCheckInterval);
        runtime.healthCheckInterval = null;
    }
    if (runtime.freshnessInterval) clearInterval(runtime.freshnessInterval);
    runtime.freshnessInterval = setInterval(function() {
        updateAcquisitionStatus();
        updateCountdownDisplay();
    }, 1000);
    var isRoom = isBroadcastRoom();
    var modelName = getModelName();
    var loaded = false;
    if (isRoom && modelName !== 'unknown') {
        loaded = loadSession(modelName);
    }
    if (!loaded) {
        runtime.isMinimized = !isRoom;
        runtime.isAutoRefreshOn = isRoom;
    } else {
        runtime.isMinimized = false;
        runtime.isAutoRefreshOn = !runtime.isStopped && (!runtime.isPaused || runtime.absencePausedAt !== null);
    }
    try {
        createPanel();
    } catch (e) {
        log('Error creating panel: ' + e);
        return;
    }
    var resizeHandle = document.getElementById('resize-handle');
    if (resizeHandle) {
        resizeHandle.style.display = runtime.isMinimized ? 'none' : 'block';
    }
    if (!runtime.isMinimized) {
        var fullView = document.getElementById('full-view');
        var miniView = document.getElementById('minimized-view');
        var toggleBtn = document.getElementById('btn-toggle');
        var container = document.getElementById('tracker-container');
        if (fullView) fullView.style.display = 'block';
        if (miniView) miniView.style.display = 'none';
        if (toggleBtn) toggleBtn.textContent = '−';
        if (container) container.style.width = runtime.BASE_WIDTH_FULL + 'px';
        drawAllSparklines();
        updateDisplay();
    }
    updateDisplay();
    updateTrendDisplay();
    updateAcquisitionStatus();
    restorePanelGeometry();
    if (runtime.isStopped) { updateStopControls(); updateCountdownDisplay(); updateTrackingTimer(); return; }
    if (isRoom && isAbsencePaused()) {
        runtime.nextScanAt = Math.max(Date.now(), readRequestPolicy().until);
        startCountdown();
        performScanThenReturn(true);
        updateTrackingTimer();
    } else if (isRoom && modelName !== 'unknown' && !loaded && runtime.isAutoRefreshOn && !runtime.isPaused) {
        // A fresh room gets its first point now. Start the recurring countdown
        // only after this attempt settles; normal retry restrictions still apply.
        var initialScan = performScanThenReturn(true);
        var startupContext = { epoch: runtime.scanEpoch, generation: myGeneration, url: location.href };
        initialScan.then(function() {
            // A pause, Reset, navigation, or newer scan owns its own scheduling.
            if (!isAcquisitionCurrent(startupContext) || !runtime.isAutoRefreshOn || runtime.isPaused) return;
            startTrackingTimer();
            startCountdown();
        }).catch(function(error) { log('Could not finish initial scan setup: ' + error.message); });
    } else {
        var attempts = 0;
        var maxAttempts = 30;
        var checkInterval = setInterval(function() {
            if (myGeneration !== runtime.initGuard) {
                clearInterval(checkInterval);
                log('Init ' + myGeneration + ' superseded by newer generation');
                return;
            }
            attempts++;
            if ((isRoom && modelName !== 'unknown') || document.querySelector(runtime.DOM_SELECTORS.userListTab) || attempts >= maxAttempts) {
                clearInterval(checkInterval);
                if (!isRoom && attempts >= maxAttempts && !document.querySelector(runtime.DOM_SELECTORS.userListTab)) {
                    log('UserListTab not found after 30s, giving up');
                    var statusEl = document.getElementById('auto-status');
                    if (statusEl) {
                        statusEl.textContent = 'No chat detected';
                        statusEl.style.color = 'var(--panel-negative)';
                    }
                    return;
                }
                if (!runtime.isPaused) {
                    performScanThenReturn(true);
                }
                setTimeout(function() {
                    if (myGeneration !== runtime.initGuard) return;
                    if (runtime.isStopped) { updateStopControls(); updateCountdownDisplay(); return; }
                    if (isAbsencePaused()) {
                        startCountdown();
                        updateStopControls();
                        updateTrackingTimer();
                    } else if (runtime.isAutoRefreshOn && !runtime.isPaused) {
                        startTrackingTimer();
                        startCountdown();
                    } else {
                        var btnAuto = document.getElementById('btn-auto');
                        var btnControlAuto = document.getElementById('btn-control-auto');
                        if (btnAuto) {
                            btnAuto.style.background = '#ff4444';
                            btnAuto.innerHTML = '▶';
                            btnAuto.title = 'Auto-Refresh OFF - Click to start';
                        }
                        if (btnControlAuto) {
                            btnControlAuto.style.background = '#ff4444';
                            btnControlAuto.innerHTML = '▶';
                            btnControlAuto.title = 'Auto-Refresh OFF - Click to start';
                        }
                        var statusEl = document.getElementById('auto-status');
                        if (statusEl) {
                            statusEl.textContent = runtime.isPaused ? 'Paused (restored)' : 'Paused';
                            statusEl.style.color = 'var(--panel-negative)';
                        }
                        updateTrackingTimer();
                    }
                }, 2002);
            }
        }, 1000);
    }
    runtime.healthCheckInterval = setInterval(function() {
        if (myGeneration === runtime.initGuard && !runtime.isStopped && !isAbsencePaused() && runtime.lastAcquisitionAttemptSource === 'DOM' && !runtime.isScanning) {
            validateDOMHealth();
        }
    }, 30000);
}

export function checkUrlChange() {
    if (location.href !== runtime.lastUrl) {
        if (runtime.panelOptionsCleanup) { runtime.panelOptionsCleanup(); runtime.panelOptionsCleanup = null; }
        leavePlayback(false);
        var oldModel = getModelNameFromUrl(runtime.lastUrl);
        runtime.lastUrl = location.href;
        if (oldModel && oldModel !== 'unknown') {
            saveSession(oldModel);
        }
        runtime.newHighTiers = {};
        runtime.activeSessionStorageKey = null;
        stopCountdown();
        runtime.nextScanAt = 0;
        runtime.countdownSeconds = runtime.scanIntervalSeconds;
        stopTrackingTimer();
        runtime.isStopped = false;
        runtime.stoppedAt = null;
        runtime.stopReason = null;
        runtime.broadcasterAbsence = { since: null, missing: 0 };
        runtime.absencePausedAt = null;
        runtime.absenceOverrideActive = false;
        cleanupDragListeners();
        if (runtime.miniSettingsKeyHandler) {
            document.removeEventListener('keydown', runtime.miniSettingsKeyHandler, true);
            runtime.miniSettingsKeyHandler = null;
        }
        runtime.isScanning = false;
        if (runtime.healthCheckInterval) {
            clearInterval(runtime.healthCheckInterval);
            runtime.healthCheckInterval = null;
        }
        runtime.currentScale = runtime.panelGeometry ? runtime.panelGeometry.scale : runtime.currentScale;
        runtime.users.clear();
        runtime.roomTotal = 0;
        runtime.lastAcceptedAcquisition = null;
        runtime.restoredDisplayFrame = null;
        runtime.lastAcquisitionAttemptSource = 'API';
        runtime.domHealthStatus.consecutiveFailures = 0;
        updateAcquisitionStatus();
        runtime.previousUserCount = 0;
        runtime.previousRoomTotal = 0;
        Object.keys(runtime.history).forEach(function(k) { runtime.history[k] = []; });
        runtime.previousCounts = {
            'red': 0, 'green': 0, 'purple': 0, 'pink': 0,
            'dark-blue': 0, 'light-blue': 0, 'gray': 0, 'female-trans': 0,
            'withTokens': 0, 'total': 0, 'anonymous': 0
        };
        runtime.hasTrendBaseline = false;
        runtime.trendComparisonMode = 'last';
        runtime.autoTrendEscalation = true;
        runtime.roomTotalHigh = 0;
        runtime.roomTotalHighTime = null;
        runtime.tierHighTimes = {};
        runtime.withTokensHighTime = null;
        runtime.totalHighTime = null;
        runtime.anonHighTime = null;
        runtime.femaleTransHighTime = null;
        runtime.initGuard++;
        scheduleInit(2002);
    }
}
