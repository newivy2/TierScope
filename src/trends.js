import { updateTrendDisplay } from './presentation.js';
import { runtime } from './runtime.js';
import { saveSession } from './session-persistence.js';
import { getModelName, log } from './utils.js';

export function checkTrendAutoEscalation() {
    if (!runtime.autoTrendEscalation || !runtime.trackingStartTime) return;
    var elapsedMs = runtime.isPaused ? runtime.pausedElapsedTime : (Date.now() - runtime.trackingStartTime);
    var elapsedMin = elapsedMs / 60000;
    var targetMode = 'last';
    if (elapsedMin >= 60) targetMode = '1hour';
    else if (elapsedMin >= 30) targetMode = '30min';
    else if (elapsedMin >= 15) targetMode = '15min';
    else if (elapsedMin >= 5) targetMode = '5min';
    if (targetMode !== runtime.trendComparisonMode) {
        log('Auto-escalating trend mode: ' + runtime.trendComparisonMode + ' -> ' + targetMode + ' (' + Math.floor(elapsedMin) + ' min elapsed)');
        if (runtime.users.size === 0) {
            runtime.trendComparisonMode = targetMode;
            updateTrendPresetButtons();
            updateAutoTrendButton();
            saveSession(getModelName());
            return;
        }
        setTrendComparisonMode(targetMode);
    }
}

export function toggleAutoTrendEscalation() {
    runtime.autoTrendEscalation = !runtime.autoTrendEscalation;
    updateAutoTrendButton();
    log('Auto trend escalation ' + (runtime.autoTrendEscalation ? 'enabled' : 'disabled'));
    saveSession(getModelName());
    if (runtime.autoTrendEscalation) {
        checkTrendAutoEscalation();
    }
}

export function updateAutoTrendButton() {
    var btn = document.getElementById('btn-trend-auto');
    if (btn) {
        if (runtime.autoTrendEscalation) {
            btn.style.background = '#32CD32';
            btn.style.color = '#fff';
            btn.style.borderColor = '#32CD32';
            btn.title = 'Auto-escalation ON - Click to disable';
        } else {
            btn.style.background = 'var(--panel-button)';
            btn.style.color = 'var(--panel-muted)';
            btn.style.borderColor = 'var(--panel-divider)';
            btn.title = 'Auto-escalation OFF - Click to enable';
        }
    }
}

export function setTrendComparisonMode(mode) {
    if (!runtime.TREND_PRESETS[mode] && mode !== 'last') return;
    runtime.trendComparisonMode = mode;
    updateTrendDisplay();
    updateTrendPresetButtons();
    saveSession(getModelName());
}

export function updateTrendPresetButtons() {
    var buttons = document.querySelectorAll('.trend-preset-btn');
    buttons.forEach(function(btn) {
        var mode = btn.dataset.mode;
        if (mode === runtime.trendComparisonMode) {
            btn.style.background = '#4169E1';
            btn.style.color = '#fff';
            btn.style.borderColor = '#4169E1';
        } else {
            btn.style.background = 'var(--panel-button)';
            btn.style.color = 'var(--panel-muted)';
            btn.style.borderColor = 'var(--panel-divider)';
        }
    });
}
