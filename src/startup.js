import { observeAthRoom, stopAthActivity } from './ath-activity.js';
import { initializeAthGrace } from './ath-maintenance.js';
import { isAcquisitionCurrent } from './acquisition-context.js';
import { beginAcquisitionGeneration, resetAcquisitionForRoom, schedulePresenceAcquisition, startAcquisitionClock, stopAcquisitionClock } from './acquisition-state.js';
import { drawAllSparklines } from './charts.js';
import { validateDOMHealth } from './dom-health.js';
import { cleanupDragListeners, restorePanelGeometry } from './layout.js';
import { startCountdown, startTrackingTimer, stopCountdown, stopTrackingTimer, updateCountdownDisplay, updateStopControls, updateTrackingTimer } from './lifecycle.js';
import { configureSessionTracking, resetLiveSession } from './live-session.js';
import { resetTrendPreferences, selectPanelMinimized, selectPanelScale } from './panel-preferences.js';
import { createPanel } from './panel.js';
import { updateAcquisitionStatus } from './presentation-status.js';
import { updateDisplay, updateTrendDisplay } from './presentation.js';
import { leavePlayback } from './replay.js';
import { readRequestPolicy } from './request-policy.js';
import { runtime } from './runtime.js';
import { performScanThenReturn } from './scanning.js';
import { retrySamplePresentation } from './sample-presentation.js';
import { loadSession, saveSession } from './session-persistence.js';
import { isAbsencePaused } from './session-selectors.js';
import { getModelName, getModelNameFromUrl, isBroadcastRoom, log } from './utils.js';

export function scheduleInit(delay) {
    var generation = runtime.initGuard;
    var url = location.href;
    setTimeout(function() {
        if (generation === runtime.initGuard && url === location.href) init();
    }, delay);
}

export function init() {
    try { initializeAthGrace(); } catch (error) { log('ATH grace initialization unavailable: ' + error.message); }
    observeAthRoom();
    leavePlayback(false);
    var myGeneration = beginAcquisitionGeneration();
    log('Initializing... (generation ' + myGeneration + ')');
    stopAcquisitionClock('healthCheckInterval');
    if (runtime.freshnessInterval) clearInterval(runtime.freshnessInterval);
    runtime.freshnessInterval = setInterval(function() {
        retrySamplePresentation();
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
        selectPanelMinimized(!isRoom);
    } else {
        selectPanelMinimized(false);
    }
    configureSessionTracking(loaded, isRoom);
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
    if (!isRoom) {
        stopCountdown(); stopTrackingTimer();
        updateStopControls(); updateCountdownDisplay(); updateTrackingTimer();
        return;
    }
    if (runtime.isStopped) { updateStopControls(); updateCountdownDisplay(); updateTrackingTimer(); return; }
    if (isRoom && isAbsencePaused()) {
        schedulePresenceAcquisition(Date.now(), readRequestPolicy().until);
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
    startAcquisitionClock('healthCheckInterval', function() {
        if (myGeneration === runtime.initGuard && !runtime.isStopped && !isAbsencePaused() && runtime.lastAcquisitionAttemptSource === 'DOM' && !runtime.isScanning) {
            validateDOMHealth();
        }
    }, 30000);
}

export function checkUrlChange() {
    if (location.href !== runtime.lastUrl) {
        stopAthActivity();
        if (runtime.panelOptionsCleanup) { runtime.panelOptionsCleanup(); runtime.panelOptionsCleanup = null; }
        leavePlayback(false);
        var oldModel = getModelNameFromUrl(runtime.lastUrl);
        if (oldModel && oldModel !== 'unknown') {
            saveSession(oldModel, true);
        }
        runtime.lastUrl = location.href;
        runtime.activeSessionStorageKey = null;
        stopCountdown();
        resetAcquisitionForRoom();
        stopTrackingTimer();
        resetLiveSession('navigate');
        resetTrendPreferences();
        updateTrackingTimer();
        cleanupDragListeners();
        if (runtime.miniSettingsKeyHandler) {
            document.removeEventListener('keydown', runtime.miniSettingsKeyHandler, true);
            runtime.miniSettingsKeyHandler = null;
        }
        selectPanelScale(runtime.panelGeometry ? runtime.panelGeometry.scale : runtime.currentScale);
        updateAcquisitionStatus();
        scheduleInit(2002);
    }
}
