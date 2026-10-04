import { bindChartInspection, drawCanvasChart } from './chart-view.js';
import { displayHigh, displayHighDescription, displayHighLabel } from './display-values.js';
import { compactNumber } from './format.js';
import { getHistoryBreaks } from './history-data.js';
import { renderStatus } from './status-view.js';

export function updateCompactDashboard(frame) {
    if (!frame.minimized) return;
    var comparison = frame.comparison;
    var mode = frame.comparisonLabel;
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
        header.textContent = (frame.stopped ? 'STOPPED: ' : frame.isRestored ? 'SAVED: ' : '') + compactNumber(frame.fullRoomTotal);
        header.title = frame.roomName + ' — Room total: ' + frame.fullRoomTotal.toLocaleString() +
            '; ' + displayHighDescription(displayHigh(frame, 'roomTotal', frame.fullRoomTotal)) + (roomChange ? '; change: ' + roomChange + ' versus ' + mode : '');
    }
    ['withtokens', 'total'].forEach(function(key) {
        var el = document.getElementById('mini-' + key);
        var value = key === 'total' ? frame.total : frame.withTokens;
        if (el) { el.textContent = compactNumber(value); el.title = value.toLocaleString() + (key === 'total' ? ' registered users' : ' users in token-classified tiers'); }
    });
    var label = document.getElementById('mini-metric');
    var names = { room: 'Room total', withTokens: 'With Tokens', total: 'Registered' };
    if (label) { label.textContent = (frame.miniMetric === 'room' ? 'Room total' : frame.miniMetric === 'withTokens' ? '💎' : '📊') + ' ▾'; label.setAttribute('aria-label', names[frame.miniMetric] + ' chart. Activate to change metric.'); label.title = 'Click to cycle Room total, With Tokens, and Registered. Showing the last 15 recorded minutes.'; }
    var high = document.getElementById('mini-high');
    var peak = displayHigh(frame, frame.miniMetric === 'room' ? 'roomTotal' : frame.miniMetric,
        frame.miniMetric === 'room' ? frame.fullRoomTotal : frame[frame.miniMetric]);
    if (high) {
        high.textContent = displayHighLabel(peak, true); high.title = displayHighDescription(peak) + '. Click to switch SH/ATH.';
        high.setAttribute('aria-label', high.title); high.setAttribute('aria-pressed', String(frame.highMode === 'ath'));
    }
    var canvas = document.getElementById('mini-chart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var width = 140, height = 36, scale = window.devicePixelRatio || 1;
    canvas.width = Math.ceil(width * scale); canvas.height = Math.ceil(height * scale);
    ctx.scale(scale, scale); ctx.clearRect(0, 0, width, height);
    var times = frame.history.timestamps;
    canvas.title = names[frame.miniMetric] + ' — last 15 recorded minutes; vertical scale fits the plotted values';
    if (!times.length) {
        bindChartInspection(canvas, { values: [], times: [], breaks: [], plot: { end: -1 }, width: width, label: names[frame.miniMetric] });
        return;
    }
    var end = times[times.length - 1], start = end - 15 * 60000;
    var breaks = getHistoryBreaks(frame.history);
    var points = [], firstVisible = times.findIndex(function(time) { return time >= start; });
    var firstDrawn = firstVisible > 0 && breaks[firstVisible] ? firstVisible - 1 : firstVisible;
    times.forEach(function(time, i) {
        // Keep one preceding endpoint so a gap crossing the window's left
        // edge can be connected and clipped, without inventing a sample.
        if (i >= firstDrawn && time <= end) points.push({ time: time, move: breaks[i], value: frame.miniMetric === 'room' ?
            frame.history.total[i] + frame.history.anonymous[i] : frame.history[frame.miniMetric][i] });
    });
    var values = points.map(function(p) { return p.value; });
    var firstIndex = points[0].time < start ? 1 : 0;
    var visibleValues = values.slice(firstIndex);
    var min = Math.min.apply(null, values), max = Math.max.apply(null, values);
    canvas.title += '; range ' + min + '–' + max + '; ' + visibleValues.length + ' samples through ' + new Date(end).toISOString() +
        '. Orange dashes: no samples recorded during the interval.';
    bindChartInspection(canvas, { values: values, times: points.map(function(p) { return p.time; }),
        breaks: points.map(function(p) { return p.move; }), firstIndex: firstIndex,
        plot: { min: min, max: max, end: points.length - 1, startTime: start, endTime: end }, width: width, label: names[frame.miniMetric] });
    points.forEach(function(point, i) {
        point.x = 2 + (point.time - start) / (15 * 60000) * (width - 4);
        point.y = max === min ? height / 2 : height - 3 - (point.value - min) / (max - min) * (height - 6);
        point.move = i === 0 || point.move;
    });
    var color = frame.miniMetric === 'withTokens' ? '#ff69b4' : frame.miniMetric === 'total' ? frame.textColor : '#69BE45';
    ctx.strokeStyle = color;
    ctx.save(); ctx.beginPath(); ctx.rect(2, 0, width - 2, height); ctx.clip();
    drawCanvasChart(ctx, points, color);
    ctx.restore();
    renderStatus(document.getElementById('mini-freshness'), frame.freshness);
}
