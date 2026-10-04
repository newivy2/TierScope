import { getChartTimes, getHistoryBreaks } from './history-data.js';
import { applyRowLayout } from './layout.js';
import { runtime } from './runtime.js';
import { setThemeVariables, themeColor } from './theme.js';





// Preserve first/last and extrema in each pixel column, in sample order.
// Only drawing is reduced; tooltips, histories and exports retain every sample.
export function buildChartPlot(values, times, breaks, width, lastIndex, windowMs, replayProgress) {
    var end = Math.min(values.length, times.length) - 1;
    if (Number.isInteger(lastIndex)) end = Math.min(end, lastIndex);
    if (end < 0) return { points: [], min: 0, max: 0, end: -1 };
    var axis = getChartTimes(times);
    var progress = end + 1 < Math.min(values.length, times.length) && Number.isFinite(replayProgress) ?
        Math.max(0, Math.min(1, replayProgress)) : 0;
    var endTime = axis[end] + (progress ? (axis[end + 1] - axis[end]) * progress : 0);
    var startTime = windowMs ? Math.max(axis[0], endTime - windowMs) : axis[0];
    var start = 0;
    while (start < end && axis[start] < startTime) start++;
    // Include the preceding real endpoint for a clipped boundary segment.
    // It remains outside keyboard sample inspection for the selected window.
    var firstDrawn = start > 0 && axis[start] > startTime ? start - 1 : start, span = endTime - startTime;
    var min = Infinity, max = -Infinity, points = [], bucket = null, breakNext = true;
    function flush() {
        if (!bucket) return;
        var indices = [bucket.first, bucket.low, bucket.high, bucket.last].sort(function(a, b) { return a - b; });
        indices.forEach(function(index, j) {
            if (j && index === indices[j - 1]) return;
            points.push({ index: index, x: span ? (axis[index] - startTime) / span * width : width / 2,
                value: values[index], move: breakNext });
            breakNext = false;
        });
        bucket = null;
    }
    for (var i = firstDrawn; i <= end; i++) {
        var value = values[i]; min = Math.min(min, value); max = Math.max(max, value);
        var column = span ? Math.floor((axis[i] - startTime) / span * width) : 0;
        if (breaks && breaks[i]) { flush(); breakNext = true; }
        if (!bucket || bucket.column !== column) {
            flush(); bucket = { column: column, first: i, last: i, low: i, high: i };
        } else {
            bucket.last = i;
            if (value < values[bucket.low]) bucket.low = i;
            if (value > values[bucket.high]) bucket.high = i;
        }
    }
    flush();
    // Animation is a separate visual connector, never a recorded point.
    // Counts, highs, inspection, exports, and the source history keep using
    // only real samples through `end`.
    var continuation = progress ? {
        fromX: span ? (axis[end] - startTime) / span * width : width / 2,
        toX: span ? width : width / 2,
        fromValue: values[end], value: values[end] + (values[end + 1] - values[end]) * progress,
        gap: !!(breaks && breaks[end + 1]), progress: progress
    } : null;
    return { points: points, min: min, max: max, start: start, end: end, startTime: startTime, endTime: endTime,
        continuation: continuation };
}

export function hideChartTooltip() {
    var tooltip = document.getElementById('tierscope-chart-tooltip');
    if (tooltip) tooltip.style.display = 'none';
}

export function nearestChartSample(times, end, target) {
    var low = 0, high = end + 1;
    while (low < high) { var middle = Math.floor((low + high) / 2); if (times[middle] <= target) low = middle + 1; else high = middle; }
    if (low === 0) return 0;
    if (low > end) return end;
    return target - times[low - 1] <= times[low] - target ? low - 1 : low;
}

export function showChartTooltip(canvas, index, clientX, clientY, gapIndex) {
    var model = canvas._tierScopeChart;
    if (!model || model.plot.end < 0) return;
    var firstIndex = model.firstIndex || 0;
    index = Math.max(firstIndex, Math.min(model.plot.end, index));
    canvas._tierScopeIndex = index;
    var tooltip = document.getElementById('tierscope-chart-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div'); tooltip.id = 'tierscope-chart-tooltip';
        tooltip.setAttribute('role', 'tooltip');
        tooltip.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;max-width:310px;padding:7px 9px;background:var(--panel-tooltip);color:var(--panel-text);border:1px solid #a36acb;border-radius:5px;font:12px/1.5 Arial,sans-serif;white-space:pre-line;box-shadow:0 3px 12px #0008;';
        document.body.appendChild(tooltip);
    }
    setThemeVariables(tooltip);
    tooltip.textContent = gapIndex > 0 ? model.label + '\nNo samples recorded during this interval.\n' +
        new Date(model.times[gapIndex - 1]).toLocaleString() + ' – ' + new Date(model.times[gapIndex]).toLocaleString() +
        '\nOrange dashes connect recorded endpoints only.' :
        model.label + ' · ' + model.values[index].toLocaleString() + '\n' +
        new Date(model.times[index]).toLocaleString() + '\n' +
        'Range: ' + model.plot.min.toLocaleString() + '–' + model.plot.max.toLocaleString() +
        ' · Sample ' + (index - firstIndex + 1) + '/' + (model.plot.end - firstIndex + 1);
    tooltip.style.display = 'block';
    var rect = tooltip.getBoundingClientRect();
    tooltip.style.left = Math.max(4, Math.min(clientX + 12, window.innerWidth - rect.width - 4)) + 'px';
    tooltip.style.top = Math.max(4, Math.min(clientY + 12, window.innerHeight - rect.height - 4)) + 'px';
}

export function bindChartInspection(canvas, model) {
    canvas._tierScopeChart = model;
    canvas.setAttribute('tabindex', '0'); canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-describedby', 'tierscope-chart-tooltip');
    canvas.setAttribute('aria-label', model.label + ' history. ' + (model.plot.end < 0 ? 'No samples.' :
        'Range ' + model.plot.min + ' to ' + model.plot.max + '. ' + (model.plot.end - (model.firstIndex || 0) + 1) + ' samples. Orange dashes mark intervals with no recorded samples. Use Left and Right arrows to inspect samples; Home and End to jump; Escape to close.'));
    if (canvas._tierScopeBound) return;
    canvas._tierScopeBound = true;
    canvas.addEventListener('pointermove', function(event) {
        var m = canvas._tierScopeChart;
        if (m.plot.end < 0) return;
        var rect = canvas.getBoundingClientRect();
        var fraction = Math.max(0, Math.min(1, ((event.clientX - rect.left) / rect.width * m.width - 2) / (m.width - 4)));
        var time = m.plot.startTime + fraction * (m.plot.endTime - m.plot.startTime);
        var axis = getChartTimes(m.times), index = nearestChartSample(axis, m.plot.end, time);
        var next = axis[index] > time ? index : index + 1;
        var gapEnd = m.plot.end + (m.plot.continuation ? 1 : 0);
        var gap = next > 0 && next <= gapEnd && m.breaks[next] && time > axis[next - 1] && time < axis[next];
        showChartTooltip(canvas, index, event.clientX, event.clientY, gap ? next : 0);
    });
    canvas.addEventListener('pointerleave', hideChartTooltip);
    canvas.addEventListener('blur', hideChartTooltip);
    canvas.addEventListener('focus', function() {
        var rect = canvas.getBoundingClientRect();
        showChartTooltip(canvas, canvas._tierScopeChart.plot.end, rect.left + rect.width / 2, rect.top + rect.height, false);
    });
    canvas.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') { hideChartTooltip(); event.stopPropagation(); return; }
        var end = canvas._tierScopeChart.plot.end, index = canvas._tierScopeIndex === undefined ? end : canvas._tierScopeIndex;
        if (event.key === 'ArrowLeft') index--; else if (event.key === 'ArrowRight') index++;
        else if (event.key === 'Home') index = 0; else if (event.key === 'End') index = end; else return;
        event.preventDefault(); event.stopPropagation();
        var rect = canvas.getBoundingClientRect();
        showChartTooltip(canvas, index, rect.left + rect.width / 2, rect.top + rect.height, false);
    });
}

export function drawCanvasChart(ctx, points, color) {
    // A connector is only an annotation between recorded endpoints. Keep
    // it separate from solid paths and never append interpolated samples.
    ctx.save();
    ctx.strokeStyle = themeColor('gap'); ctx.lineWidth = 1.5; ctx.lineCap = 'butt'; ctx.setLineDash([4, 3]);
    ctx.beginPath();
    points.forEach(function(point, i) {
        if (i && point.move) {
            ctx.moveTo(points[i - 1].x, points[i - 1].y);
            ctx.lineTo(point.x, point.y);
        }
    });
    ctx.stroke(); ctx.restore();
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash([]);
    ctx.beginPath();
    points.forEach(function(point, i) {
        if (point.move) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
        if (point.move && (i === points.length - 1 || points[i + 1].move)) ctx.fillRect(point.x - 1.5, point.y - 1.5, 3, 3);
    });
    ctx.stroke();
}

export function drawSparkline(canvasId, data, color, customHeight, times, breaks, lastIndex, label, replayProgress) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var scale = Math.max(1, (runtime.currentScale || 1) * (window.devicePixelRatio || 1));
    var height = customHeight || 28;
    canvas.style.width = '105px'; canvas.style.minWidth = '0'; canvas.style.height = height + 'px';
    var width = canvas.clientWidth || 105;
    canvas.width = Math.ceil(width * scale); canvas.height = Math.ceil(height * scale);
    ctx.scale(scale, scale); ctx.clearRect(0, 0, width, height);
    var plot = buildChartPlot(data, times, breaks, Math.max(1, width - 4), lastIndex, runtime.CHART_WINDOWS[runtime.chartWindowMode], replayProgress);
    bindChartInspection(canvas, { values: data, times: times, breaks: breaks, firstIndex: plot.start || 0, plot: plot, width: width, label: label });
    var continuation = plot.continuation;
    var min = continuation ? Math.min(plot.min, continuation.value) : plot.min;
    var max = continuation ? Math.max(plot.max, continuation.value) : plot.max;
    function y(value) { return max === min ? height / 2 : height - 2 - (value - min) / (max - min) * (height - 4); }
    ctx.strokeStyle = color;
    ctx.save(); ctx.beginPath(); ctx.rect(2, 0, width - 2, height); ctx.clip();
    drawCanvasChart(ctx, plot.points.map(function(point) {
        return { x: 2 + point.x,
            y: y(point.value),
            move: point.move };
    }), color);
    if (continuation) {
        ctx.save();
        ctx.strokeStyle = continuation.gap ? themeColor('gap') : color;
        ctx.lineWidth = continuation.gap ? 1.5 : 2;
        ctx.setLineDash(continuation.gap ? [4, 3] : []);
        // Moving dashes also show progress when both endpoint counts match.
        ctx.lineDashOffset = continuation.gap ? -continuation.progress * 14 : 0;
        ctx.beginPath();
        ctx.moveTo(2 + continuation.fromX, y(continuation.fromValue));
        ctx.lineTo(2 + continuation.toX, y(continuation.value));
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
}

export function drawAllSparklines() {
    if (runtime.presentationMode === 'PLAYBACK') return;
    drawHistorySparklines(runtime.history);
}

export function drawHistorySparklines(displayHistory, lastIndex, replayProgress) {
    hideChartTooltip();
    if (runtime.rowLayoutNeedsMeasure) applyRowLayout();
    var breaks = getHistoryBreaks(displayHistory);
    runtime.PANEL_ROWS.forEach(function(row) {
        if (runtime.collapsedRows.has(row.key)) return;
        var key = row.key === 'withtokens' ? 'withTokens' : row.key === 'anon' ? 'anonymous' : row.key;
        drawSparkline('spark-' + row.key, displayHistory[key], row.key === 'total' ? themeColor('text') : row.color,
            runtime.panelChartHeights[row.key] || row.height, displayHistory.timestamps, breaks, lastIndex, row.label, replayProgress);
    });
}
