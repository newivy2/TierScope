import { getAnonymousCount } from './dom.js';
import { runtime } from './runtime.js';
import { saveSession } from './storage.js';
import { getModelName, getTierMarker, log } from './utils.js';

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

export function getComparisonCounts() {
    var comparisonNow = runtime.isStopped ? (runtime.history.timestamps[runtime.history.timestamps.length - 1] || runtime.stoppedAt) : Date.now();
    if (runtime.trendComparisonMode === 'last') {
        if (runtime.history.timestamps.length < 2) {
            return { counts: null, short: false, actualMinutes: 0 };
        }
        var lastIdx = runtime.history.timestamps.length - 2;
        var actualMinutes = Math.round((comparisonNow - runtime.history.timestamps[lastIdx]) / 60000);
        return {
            counts: {
                'red': runtime.history['red'][lastIdx] || 0,
                'green': runtime.history['green'][lastIdx] || 0,
                'purple': runtime.history['purple'][lastIdx] || 0,
                'pink': runtime.history['pink'][lastIdx] || 0,
                'dark-blue': runtime.history['dark-blue'][lastIdx] || 0,
                'light-blue': runtime.history['light-blue'][lastIdx] || 0,
                'gray': runtime.history['gray'][lastIdx] || 0,
                'female-trans': runtime.history['female-trans'][lastIdx] || 0,
                'withTokens': runtime.history['withTokens'][lastIdx] || 0,
                'total': runtime.history['total'][lastIdx] || 0,
                'anonymous': runtime.history['anonymous'][lastIdx] || 0
            },
            short: false,
            actualMinutes: actualMinutes
        };
    }
    if (runtime.trendComparisonMode === 'start') {
        if (runtime.history.timestamps.length === 0) {
            return {
                counts: {
                    'red': 0, 'green': 0, 'purple': 0, 'pink': 0,
                    'dark-blue': 0, 'light-blue': 0, 'gray': 0, 'female-trans': 0,
                    'withTokens': 0, 'total': 0, 'anonymous': 0
                },
                short: false,
                actualMinutes: 0
            };
        }
        var startMinutes = Math.round((comparisonNow - runtime.history.timestamps[0]) / 60000);
        return {
            counts: {
                'red': runtime.history['red'][0] || 0,
                'green': runtime.history['green'][0] || 0,
                'purple': runtime.history['purple'][0] || 0,
                'pink': runtime.history['pink'][0] || 0,
                'dark-blue': runtime.history['dark-blue'][0] || 0,
                'light-blue': runtime.history['light-blue'][0] || 0,
                'gray': runtime.history['gray'][0] || 0,
                'female-trans': runtime.history['female-trans'][0] || 0,
                'withTokens': runtime.history['withTokens'][0] || 0,
                'total': runtime.history['total'][0] || 0,
                'anonymous': runtime.history['anonymous'][0] || 0
            },
            short: false,
            actualMinutes: startMinutes
        };
    }
    var preset = runtime.TREND_PRESETS[runtime.trendComparisonMode];
    if (!preset || preset.ms <= 0) return { counts: runtime.previousCounts, short: false, actualMinutes: 0 };
    var targetTime = comparisonNow - preset.ms;
    var idx = -1;
    for (var i = 0; i < runtime.history.timestamps.length; i++) {
        if (runtime.history.timestamps[i] <= targetTime) {
            idx = i;
        } else {
            break;
        }
    }
    var short = idx === -1;
    if (short) idx = 0;
    if (idx === -1 || runtime.history.timestamps.length === 0) {
        return { counts: runtime.previousCounts, short: false, actualMinutes: 0 };
    }
    var actualMs = comparisonNow - runtime.history.timestamps[idx];
    var actualMinutes = Math.round(actualMs / 60000);
    return {
        counts: {
            'red': runtime.history['red'][idx] || 0,
            'green': runtime.history['green'][idx] || 0,
            'purple': runtime.history['purple'][idx] || 0,
            'pink': runtime.history['pink'][idx] || 0,
            'dark-blue': runtime.history['dark-blue'][idx] || 0,
            'light-blue': runtime.history['light-blue'][idx] || 0,
            'gray': runtime.history['gray'][idx] || 0,
            'female-trans': runtime.history['female-trans'][idx] || 0,
            'withTokens': runtime.history['withTokens'][idx] || 0,
            'total': runtime.history['total'][idx] || 0,
            'anonymous': runtime.history['anonymous'][idx] || 0
        },
        short: short,
        actualMinutes: actualMinutes
    };
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

export function updateTrendDisplay() {
    if (runtime.presentationMode === 'PLAYBACK') return;
    var trendContainer = document.getElementById('trend-container');
    var trendHeaderLabel = document.getElementById('trend-header-label');
    if (!trendContainer) return;
    if (runtime.restoredDisplayFrame) {
        trendContainer.innerHTML = '<div style="font-size:8px;color:var(--panel-muted);text-align:center;padding:8px;">' + (runtime.isStopped ? 'Session stopped — history remains available in Replay.' : 'Saved snapshot — trends resume after a new sample.') + '</div>';
        if (trendHeaderLabel) trendHeaderLabel.textContent = '📈 TREND';
        return;
    }
    if (!runtime.hasTrendBaseline) {
        trendContainer.innerHTML = '<div style="font-size:8px;color:var(--panel-faint);text-align:center;padding:8px;">Waiting for scan...</div>';
        if (trendHeaderLabel) trendHeaderLabel.textContent = '📈 TREND';
        return;
    }
    var counts = { 'red': 0, 'green': 0, 'purple': 0, 'pink': 0, 'dark-blue': 0, 'light-blue': 0, 'gray': 0, 'female-trans': 0 };
    runtime.users.forEach(function(data) {
        if (counts[data.tier] !== undefined) counts[data.tier]++;
        if (data.gender === 'female' || data.gender === 'trans') {
            counts['female-trans']++;
        }
    });
    var total = runtime.users.size;
    var withTokens = counts['red'] + counts['green'] + counts['purple'] + counts['pink'] + counts['dark-blue'] + counts['light-blue'];
    var anonymousCount = getAnonymousCount();
    var comparison = getComparisonCounts();
    var comparisonCounts = comparison.counts;
    var shortSession = comparison.short;
    var actualMinutes = comparison.actualMinutes;
    if (!comparisonCounts) {
        var waitingText = runtime.history.timestamps.length === 1 ? 'Waiting for second scan...' : 'Waiting for scan...';
        trendContainer.innerHTML = '<div style="font-size:8px;color:var(--panel-faint);text-align:center;padding:8px;">' + waitingText + '</div>';
        if (trendHeaderLabel) trendHeaderLabel.textContent = '📈 TREND';
        return;
    }
    var getShortLabel = function() {
        if (!shortSession || actualMinutes <= 0) return '';
        if (actualMinutes < 60) return ' vs ' + actualMinutes + 'm';
        var hours = Math.floor(actualMinutes / 60);
        var mins = actualMinutes % 60;
        return ' vs ' + hours + 'h' + (mins > 0 ? mins : '');
    };
    // UPDATED: Removed arrows/dots, using color-coded backgrounds only
    function buildTrendItem(name, current, prev, isSpecial, isLarge) {
        var diff = current - prev;
        var deltaText = diff !== 0 ? (diff > 0 ? '+' + diff : diff) : '';
        var deltaColor = diff > 0 ? 'var(--panel-positive)' : 'var(--panel-negative)';
        // Color-coded background based on delta direction
        var bgStyle;
        if (diff > 0) {
            bgStyle = 'background:rgba(50, 205, 50, 0.22);';  // Green for positive
        } else if (diff < 0) {
            bgStyle = 'background:rgba(255, 85, 85, 0.15);';   // Red for negative
        } else {
            bgStyle = 'background:rgba(255, 215, 0, 0.15);';   // Yellow for stable
        }
        if (isSpecial) bgStyle += 'border:1px solid #ff69b4;';
        var padding = isLarge ? '6px 12px' : '2px 6px';
        var fontSize = isLarge ? '12px' : '10px';
        var deltaFont = fontSize;
        if (deltaText) {
            var dlen = String(Math.abs(diff)).length;
            if (dlen >= 4) deltaFont = '8px';
            else if (dlen === 3) deltaFont = '10px';
        }
        // Removed the trendIcon span - only colors indicate direction now
        return '<div style="display:flex;align-items:center;gap:4px;' + bgStyle + 'padding:' + padding + ';border-radius:4px;">' +
            '<span style="font-size:' + fontSize + ';">' + name + '</span>' +
            (deltaText ? '<span style="font-size:' + deltaFont + ';font-weight:bold;color:' + deltaColor + ';">' + deltaText + '</span>' : '') +
            '</div>';
    }
    var headerLabel = '📈 TREND';
    var shortLabel = getShortLabel();
    var html = '<div style="display:flex;justify-content:center;gap:6px;padding:4px 0;">';
    html += buildTrendItem(getTierMarker('red'), counts['red'] || 0, comparisonCounts['red'] || 0, false, false);
    html += buildTrendItem(getTierMarker('green'), counts['green'] || 0, comparisonCounts['green'] || 0, false, false);
    html += buildTrendItem(getTierMarker('purple'), counts['purple'] || 0, comparisonCounts['purple'] || 0, false, false);
    html += buildTrendItem(getTierMarker('pink'), counts['pink'] || 0, comparisonCounts['pink'] || 0, false, false);
    html += '</div>';
    html += '<div style="display:flex;justify-content:center;gap:6px;padding:4px 0;">';
    html += buildTrendItem(getTierMarker('dark-blue'), counts['dark-blue'] || 0, comparisonCounts['dark-blue'] || 0, false, false);
    html += buildTrendItem(getTierMarker('light-blue'), counts['light-blue'] || 0, comparisonCounts['light-blue'] || 0, false, false);
    html += buildTrendItem(getTierMarker('gray'), counts['gray'] || 0, comparisonCounts['gray'] || 0, false, false);
    html += buildTrendItem(getTierMarker('female-trans'), counts['female-trans'] || 0, comparisonCounts['female-trans'] || 0, false, false);
    html += '</div>';
    html += '<div style="display:flex;justify-content:center;gap:8px;padding:4px 0;">';
    html += buildTrendItem('💎', withTokens || 0, comparisonCounts.withTokens || 0, true, true);
    html += buildTrendItem('📊', total || 0, comparisonCounts.total || 0, false, true);
    html += buildTrendItem('👻', anonymousCount || 0, comparisonCounts.anonymous || 0, false, true);
    html += '</div>';
    trendContainer.innerHTML = html;
    if (trendHeaderLabel) {
        trendHeaderLabel.textContent = headerLabel + shortLabel;
    }
}
