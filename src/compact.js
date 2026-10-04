import { bindChartInspection, drawCanvasChart } from './charts.js';
import { getHistoryBreaks } from './history-data.js';
import { getDisplayHigh, highDescription, highLabel } from './highs.js';
import { absencePauseDescription, getEffectiveScanIntervalSeconds, isAbsencePaused, stopDescription } from './lifecycle.js';
import { runtime } from './runtime.js';
import { readRequestPolicy, requestPolicyMessage } from './scanning.js';
import { themeColor } from './theme.js';
import { getComparisonCounts } from './trends.js';
import { formatSampleAge, getModelName } from './utils.js';
import { showSessionSaveWarning } from './session-health.js';

export function compactNumber(value) {
    return value >= 1000000 ? (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'm' :
        value >= 10000 ? (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(value);
}

export function updateMiniFreshness() {
    var el = document.getElementById('mini-freshness');
    if (!el) return;
    if (showSessionSaveWarning(el, getModelName())) return;
    if (runtime.isStopped) {
        el.textContent = 'Stopped'; el.title = stopDescription() + '. Start begins a new session.';
        el.style.color = 'var(--panel-muted)'; return;
    }
    if (isAbsencePaused() && !runtime.sessionStorageNotice) {
        var waitingPolicy = requestPolicyMessage(readRequestPolicy());
        el.textContent = waitingPolicy || 'Auto-paused';
        el.title = absencePauseDescription() + (waitingPolicy ? ' ' + waitingPolicy + '.' : ' Next return check: ' + runtime.countdownSeconds + 's.');
        el.style.color = 'var(--panel-warning)';
        return;
    }
    var sample = runtime.lastAcceptedAcquisition || runtime.restoredDisplayFrame;
    var source = runtime.lastAcceptedAcquisition ? runtime.lastAcceptedAcquisition.source : sample ? 'Saved' : 'No sample';
    el.textContent = runtime.sessionStorageNotice ? 'Local only' : (runtime.isAutoRefreshOn ? source : 'Paused') +
        (sample ? ' · ' + formatSampleAge(sample.timestamp) : '');
    el.style.color = runtime.sessionStorageNotice ? 'var(--panel-warning)' : runtime.isAutoRefreshOn ? 'var(--panel-muted)' : 'var(--panel-paused)';
    var policyMessage = requestPolicyMessage(readRequestPolicy());
    if (policyMessage && !runtime.sessionStorageNotice) { el.textContent = policyMessage; el.style.color = 'var(--panel-warning)'; }
    if (!policyMessage && runtime.isAutoRefreshOn && getEffectiveScanIntervalSeconds() > runtime.scanIntervalSeconds) {
        el.textContent = 'Reduced · ' + getEffectiveScanIntervalSeconds() / 60 + 'm';
    }
    el.title = runtime.sessionStorageNotice || (policyMessage ? policyMessage + '. ' : '') + source + (sample ? ': ' + new Date(sample.timestamp).toISOString() : '') +
        '. Age of the last accepted sample. ' + (runtime.isAutoRefreshOn ? 'Next attempt: ' + runtime.countdownSeconds + 's.' : 'Automatic scans paused.');
}

export function updateCompactDashboard(frame) {
    if (!runtime.isMinimized) return;
    var comparison = !frame.isRestored && runtime.hasTrendBaseline ? getComparisonCounts().counts : null;
    var mode = runtime.trendComparisonMode === 'last' ? 'previous sample' : runtime.trendComparisonMode === 'start' ? 'first retained sample' : runtime.trendComparisonMode;
    function delta(id, value, old) {
        var el = document.getElementById(id);
        if (!el) return '';
        var change = comparison ? value - old : null;
        var text = change === null ? '' : change > 0 ? '+' + compactNumber(change) : change < 0 ? '−' + compactNumber(-change) : '0';
        el.textContent = text;
        el.style.color = change > 0 ? 'var(--panel-delta-up)' : change < 0 ? 'var(--panel-delta-down)' : 'var(--panel-warning)';
        el.title = change === null ? 'Waiting for a fresh sample and comparison history' : 'Change versus ' + mode + ': ' + change;
        return text;
    }
    delta('mini-withtokens-change', frame.withTokens, comparison && comparison.withTokens);
    delta('mini-total-change', frame.total, comparison && comparison.total);
    var roomChange = delta('mini-room-change', frame.fullRoomTotal, comparison && comparison.total + comparison.anonymous);
    var header = document.getElementById('header-text');
    if (header) {
        header.textContent = (runtime.isStopped ? 'STOPPED: ' : frame.isRestored ? 'SAVED: ' : '') + compactNumber(frame.fullRoomTotal);
        header.title = getModelName() + ' — Room total: ' + frame.fullRoomTotal.toLocaleString() +
            '; ' + highDescription(getDisplayHigh(frame, 'roomTotal', frame.fullRoomTotal)) + (roomChange ? '; change: ' + roomChange + ' versus ' + mode : '');
    }
    ['withtokens', 'total'].forEach(function(key) {
        var el = document.getElementById('mini-' + key);
        var value = key === 'total' ? frame.total : frame.withTokens;
        if (el) { el.textContent = compactNumber(value); el.title = value.toLocaleString() + (key === 'total' ? ' registered users' : ' users in token-classified tiers'); }
    });
    var label = document.getElementById('mini-metric');
    var names = { room: 'Room total', withTokens: 'With Tokens', total: 'Registered' };
    if (label) { label.textContent = (runtime.miniMetric === 'room' ? 'Room total' : runtime.miniMetric === 'withTokens' ? '💎' : '📊') + ' ▾'; label.setAttribute('aria-label', names[runtime.miniMetric] + ' chart. Activate to change metric.'); label.title = 'Click to cycle Room total, With Tokens, and Registered. Showing the last 15 recorded minutes.'; }
    var high = document.getElementById('mini-high');
    var peak = getDisplayHigh(frame, runtime.miniMetric === 'room' ? 'roomTotal' : runtime.miniMetric,
        runtime.miniMetric === 'room' ? frame.fullRoomTotal : frame[runtime.miniMetric]);
    if (high) {
        high.textContent = highLabel(peak, true); high.title = highDescription(peak) + '. Click to switch SH/ATH.';
        high.setAttribute('aria-label', high.title); high.setAttribute('aria-pressed', String(runtime.highMode === 'ath'));
    }
    var canvas = document.getElementById('mini-chart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var width = 140, height = 36, scale = window.devicePixelRatio || 1;
    canvas.width = Math.ceil(width * scale); canvas.height = Math.ceil(height * scale);
    ctx.scale(scale, scale); ctx.clearRect(0, 0, width, height);
    var times = frame.history.timestamps;
    canvas.title = names[runtime.miniMetric] + ' — last 15 recorded minutes; vertical scale fits the plotted values';
    if (!times.length) {
        bindChartInspection(canvas, { values: [], times: [], breaks: [], plot: { end: -1 }, width: width, label: names[runtime.miniMetric] });
        return;
    }
    var end = times[times.length - 1], start = end - 15 * 60000;
    var breaks = getHistoryBreaks(frame.history);
    var points = [], firstVisible = times.findIndex(function(time) { return time >= start; });
    var firstDrawn = firstVisible > 0 && breaks[firstVisible] ? firstVisible - 1 : firstVisible;
    times.forEach(function(time, i) {
        // Keep one preceding endpoint so a gap crossing the window's left
        // edge can be connected and clipped, without inventing a sample.
        if (i >= firstDrawn && time <= end) points.push({ time: time, move: breaks[i], value: runtime.miniMetric === 'room' ?
            frame.history.total[i] + frame.history.anonymous[i] : frame.history[runtime.miniMetric][i] });
    });
    var values = points.map(function(p) { return p.value; });
    var firstIndex = points[0].time < start ? 1 : 0;
    var visibleValues = values.slice(firstIndex);
    var min = Math.min.apply(null, values), max = Math.max.apply(null, values);
    canvas.title += '; range ' + min + '–' + max + '; ' + visibleValues.length + ' samples through ' + new Date(end).toISOString() +
        '. Orange dashes: no samples recorded during the interval.';
    bindChartInspection(canvas, { values: values, times: points.map(function(p) { return p.time; }),
        breaks: points.map(function(p) { return p.move; }), firstIndex: firstIndex,
        plot: { min: min, max: max, end: points.length - 1, startTime: start, endTime: end }, width: width, label: names[runtime.miniMetric] });
    points.forEach(function(point, i) {
        point.x = 2 + (point.time - start) / (15 * 60000) * (width - 4);
        point.y = max === min ? height / 2 : height - 3 - (point.value - min) / (max - min) * (height - 6);
        point.move = i === 0 || point.move;
    });
    var color = runtime.miniMetric === 'withTokens' ? '#ff69b4' : runtime.miniMetric === 'total' ? themeColor('text') : '#69BE45';
    ctx.strokeStyle = color;
    ctx.save(); ctx.beginPath(); ctx.rect(2, 0, width - 2, height); ctx.clip();
    drawCanvasChart(ctx, points, color);
    ctx.restore();
    updateMiniFreshness();
}
