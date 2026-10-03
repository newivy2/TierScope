import { buildChartPlot, getHistoryBreaks } from './charts.js';
import { isPlaybackCurrent } from './replay.js';
import { runtime } from './runtime.js';
import { formatElapsedTime, getModelName, log } from './utils.js';

export function createGifSurface(palette) {
    var canvas = document.createElement('canvas');
    canvas.width = runtime.GIF_WIDTH; canvas.height = runtime.GIF_HEIGHT;
    var ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas is unavailable.');
    var pixels = new Uint8Array(runtime.GIF_WIDTH * runtime.GIF_HEIGHT);
    var colors = palette.map(function(color) { return '#' + color.toString(16).padStart(6, '0'); });
    function rect(x, y, width, height, color) {
        x = Math.round(x); y = Math.round(y);
        width = Math.round(width); height = Math.round(height);
        var left = Math.max(0, x), top = Math.max(0, y);
        var right = Math.min(runtime.GIF_WIDTH, x + width), bottom = Math.min(runtime.GIF_HEIGHT, y + height);
        if (right <= left || bottom <= top) return;
        ctx.fillStyle = colors[color];
        ctx.fillRect(left, top, right - left, bottom - top);
        for (var row = top; row < bottom; row++) {
            pixels.fill(color, row * runtime.GIF_WIDTH + left, row * runtime.GIF_WIDTH + right);
        }
    }
    function text(value, x, y, color, scale, rightAlign) {
        scale = scale || 1;
        value = String(value).toUpperCase();
        if (rightAlign) x -= (value.length * 6 - 1) * scale;
        for (var i = 0; i < value.length; i++) {
            var glyph = runtime.GIF_FONT[value[i]] || runtime.GIF_FONT['?'];
            for (var row = 0; row < 7; row++) {
                for (var col = 0; col < 5; col++) {
                    if (glyph[row] & (1 << (4 - col))) {
                        rect(x + (i * 6 + col) * scale, y + row * scale, scale, scale, color);
                    }
                }
            }
        }
    }
    return { canvas: canvas, pixels: pixels, rect: rect, text: text };
}

export function gifCount(value) {
    value = Math.max(0, Number(value) || 0);
    var text = String(Math.round(value));
    return text.length <= 10 ? text : value.toExponential(2);
}

export function getGifSampleIndex(snapshot, frameIndex, frameCount) {
    var last = snapshot.timeline.length - 1;
    if (snapshot.timeline.length <= runtime.GIF_MAX_FRAMES) return frameIndex;
    if (frameIndex === 0) return 0;
    if (frameIndex === frameCount - 1) return last;
    // At most 60 evenly spaced moments in the recorded time range. Keep
    // the actual saved counts (no interpolation between acquisitions).
    var position = snapshot.durationMs * frameIndex / (frameCount - 1);
    var low = 0, high = snapshot.timeline.length;
    while (low < high) {
        var middle = Math.floor((low + high) / 2);
        if (snapshot.timeline[middle] <= position) low = middle + 1;
        else high = middle;
    }
    return Math.max(0, low - 1);
}

export function drawGifSparkline(surface, values, lastIndex, color, bounds, times, breaks) {
    // Match the panel: show only history through the selected sample, with
    // each tier scaled to its own visible minimum/maximum and elapsed time.
    // Reserve space for the two-pixel stroke at the right and bottom edges.
    var left = bounds.left, top = bounds.top;
    var plotWidth = bounds.width - 2, plotHeight = bounds.height - 2;
    var minimum = values[0], maximum = values[0];
    for (var i = 1; i <= lastIndex; i++) {
        minimum = Math.min(minimum, values[i]);
        maximum = Math.max(maximum, values[i]);
    }
    var range = maximum - minimum || 1;
    function y(value) { return maximum === minimum ? top + Math.round(plotHeight / 2) : top + plotHeight - Math.round((value - minimum) / range * plotHeight); }
    function line(x0, y0, x1, y1, strokeColor, dashed) {
        // Integer rasterization keeps every pixel in the fixed GIF palette.
        var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
        var dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
        var error = dx + dy, step = 0;
        var distancePerStep = Math.hypot(dx, dy) / Math.max(dx, -dy, 1);
        while (true) {
            if (!dashed || (step * distancePerStep) % 10 < 6) surface.rect(x0, y0, dashed ? 1 : 2, dashed ? 1 : 2, strokeColor);
            if (x0 === x1 && y0 === y1) break;
            var twiceError = 2 * error;
            if (twiceError >= dy) { error += dy; x0 += sx; }
            if (twiceError <= dx) { error += dx; y0 += sy; }
            step++;
        }
    }
    var plot = buildChartPlot(values, times || values.map(function(_, i) { return i; }), breaks || [], plotWidth, lastIndex);
    // Paint connectors first, so real observations keep their tier color.
    for (var p = 1; p < plot.points.length; p++) {
        if (!plot.points[p].move) continue;
        var before = plot.points[p - 1], after = plot.points[p];
        line(left + Math.round(before.x), y(before.value), left + Math.round(after.x), y(after.value), runtime.GIF_GAP_COLOR_INDEX, true);
    }
    var previous = null;
    plot.points.forEach(function(point) {
        var x = left + Math.round(point.x), nextY = y(point.value);
        if (previous && !point.move) line(previous.x, previous.y, x, nextY, color, false);
        else surface.rect(x, nextY, 2, 2, color);
        previous = { x: x, y: nextY };
    });
}

export function drawGifSummary(surface, snapshot, index, tiers) {
    var data = snapshot.history;
    var breaks = getHistoryBreaks(data);
    var margin = 16, rowStart = 90, rowStep = 44, groupGap = 12;
    var chartLeft = 176, countWidth = 70, columnGap = 10;
    var chartWidth = runtime.GIF_WIDTH - chartLeft - margin - countWidth - columnGap;
    surface.rect(0, 0, runtime.GIF_WIDTH, runtime.GIF_HEIGHT, 0);
    surface.text('TIERSCOPE REPLAY', margin, 12, 1, 3);
    surface.text(formatElapsedTime(snapshot.timeline[index]) + ' / ' +
        formatElapsedTime(snapshot.durationMs), margin, 46, 1, 2);
    surface.text('LINES SCALED PER SERIES', margin, 67, 1, 1);
    if (breaks.some(function(gap, i) { return gap && i > 0 && i <= index; })) {
        surface.text('ORANGE DASHES: NO SAMPLES', runtime.GIF_WIDTH - margin, 67, runtime.GIF_GAP_COLOR_INDEX, 1, true);
    }
    surface.rect(margin, 80, runtime.GIF_WIDTH - margin * 2, 2, 1);
    function drawRow(label, values, top, color) {
        surface.rect(margin, top + 14, 6, 14, color);
        surface.text(label, 30, top + 14, 1, 2);
        drawGifSparkline(surface, values, index, color,
            { left: chartLeft, top: top + 2, width: chartWidth, height: 36 }, data.timestamps, breaks);
        var count = gifCount(values[index]);
        // Keep unusually large counts inside their column without truncation.
        var countScale = (count.length * 6 - 1) * 2 <= countWidth ? 2 : 1;
        surface.text(count, runtime.GIF_WIDTH - margin, top + (countScale === 2 ? 14 : 18), color, countScale, true);
    }
    tiers.forEach(function(tier, row) {
        drawRow(tier === 'female-trans' ? 'FEMALE/TRANS' : runtime.TIERS[tier].name,
            data[tier], rowStart + row * rowStep, row + 2);
    });
    var totalsStart = rowStart + tiers.length * rowStep;
    surface.rect(margin, totalsStart, runtime.GIF_WIDTH - margin * 2, 2, 1);
    totalsStart += groupGap;
    var roomTotals = data.total.map(function(value, i) { return value + data.anonymous[i]; });
    drawRow('TOTAL', roomTotals, totalsStart, 1);
    drawRow('WITH TOKENS', data.withTokens, totalsStart + rowStep, 10);
    drawRow('REGISTERED', data.total, totalsStart + rowStep * 2, 1);
    drawRow('ANONYMOUS', data.anonymous, totalsStart + rowStep * 3, 11);
}

export function cancelGifExport() {
    if (runtime.gifExportJob) runtime.gifExportJob.cancelled = true;
}

export async function generateGifFromHistory() {
    if (runtime.gifExportJob) return;
    var button = document.getElementById('btn-export-gif');
    var status = document.getElementById('gif-export-status');
    var cancel = document.getElementById('btn-cancel-gif');
    var progress = document.getElementById('gif-export-controls');
    var job = { cancelled: false, url: location.href, generation: runtime.initGuard,
        key: runtime.activeSessionStorageKey };
    runtime.gifExportJob = job;
    if (button) button.disabled = true;
    if (progress) progress.style.display = 'flex';
    if (cancel) cancel.hidden = false;
    if (status) status.textContent = 'Preparing GIF…';
    function checkJob() {
        if (job.cancelled || location.href !== job.url || runtime.initGuard !== job.generation ||
            runtime.activeSessionStorageKey !== job.key) throw new Error('GIF export cancelled.');
    }
    try {
        if (typeof GifWriter !== 'function') {
            throw new Error('GIF encoder missing. Reinstall the complete script, including its @require header.');
        }
        // Playback owns a frozen snapshot. Live acquisition can keep appending
        // samples without changing the range or counts of this export.
        if (!isPlaybackCurrent(runtime.playback)) throw new Error('Open Replay before downloading a GIF.');
        var model = runtime.playback.archive ? runtime.playback.archive.room : getModelName();
        var snapshot = runtime.playback.snapshot;
        if (!snapshot.timeline.length) throw new Error('No recorded history to export yet.');
        var tiers = Object.keys(runtime.TIERS);
        var palette = [0x14141e, 0xffffff].concat(tiers.map(function(tier) {
            return parseInt(runtime.TIERS[tier].color.slice(1), 16);
        }));
        palette.push(0xff69b4, 0x888888); // With Tokens and Anonymous summary lines.
        palette.push(0xe89b45); // Dashed missing-interval connectors (index 12).
        // GIF color-table lengths must be powers of two. Unused slots stay dark.
        while ((palette.length & (palette.length - 1)) !== 0) palette.push(palette[0]);
        var surface = createGifSurface(palette);
        var frameCount = Math.min(runtime.GIF_MAX_FRAMES, snapshot.timeline.length);
        // Grow only the compressed output. Reserve conservative worst-case LZW
        // space before addFrame: <2 bytes/pixel plus block/header overhead.
        var bytes = new Uint8Array(256 * 1024);
        var writer = new GifWriter(bytes, runtime.GIF_WIDTH, runtime.GIF_HEIGHT, { palette: palette, loop: 0 });
        for (var i = 0; i < frameCount; i++) {
            await new Promise(function(resolve) { setTimeout(resolve, 0); });
            checkJob();
            var index = getGifSampleIndex(snapshot, i, frameCount);
            drawGifSummary(surface, snapshot, index, tiers);
            var needed = writer.getOutputBufferPosition() + runtime.GIF_WIDTH * runtime.GIF_HEIGHT * 2 + 1024;
            if (needed > bytes.length) {
                var grown = new Uint8Array(Math.max(bytes.length * 2, needed));
                grown.set(bytes); bytes = grown; writer.setOutputBuffer(bytes);
            }
            // Integer centiseconds sum to exactly ten seconds, even with 60 frames.
            var delay = Math.round((i + 1) * runtime.GIF_DURATION_CS / frameCount) -
                Math.round(i * runtime.GIF_DURATION_CS / frameCount);
            writer.addFrame(0, 0, runtime.GIF_WIDTH, runtime.GIF_HEIGHT, surface.pixels, { delay: delay, disposal: 1 });
            if (status) status.textContent = 'GIF ' + Math.round((i + 1) / frameCount * 100) + '%';
        }
        checkJob();
        var length = writer.end();
        if (length > bytes.length) throw new Error('GIF output buffer overflow.');
        var blob = new Blob([bytes.subarray(0, length)], { type: 'image/gif' });
        var url = URL.createObjectURL(blob);
        try {
            var link = document.createElement('a');
            link.href = url;
            link.download = model.replace(/[^a-z0-9_-]/gi, '_') + '-replay-' + new Date().toISOString().slice(0, 10) + '.gif';
            document.body.appendChild(link);
            try { link.click(); } finally { link.remove(); }
        } finally {
            setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
        }
        if (status) status.textContent = 'GIF downloaded';
        log('GIF export complete: ' + frameCount + ' frames, ' + length + ' bytes');
    } catch (error) {
        if (status) status.textContent = error.message;
        log('GIF export: ' + error.message);
        if (!job.cancelled && location.href === job.url && runtime.initGuard === job.generation) alert(error.message);
    } finally {
        if (button) button.disabled = false;
        if (cancel) cancel.hidden = true;
        if (progress) progress.style.display = 'none';
        if (button && status) button.title = status.textContent;
        if (runtime.gifExportJob === job) runtime.gifExportJob = null;
    }
}
