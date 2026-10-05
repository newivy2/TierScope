import { buildClockPlot, inspectClockSample } from './analysis-clock-data.js';
import { analysisSampleIndex, buildAnalysisPlot, inspectAnalysisSample, zoomAnalysisWindow } from './analysis-chart-data.js';
import { toolNode as node, toolButton as button } from './tools-view-helpers.js';

// Receives snapshots of analysis values, not live/playback owners or archives.
// Cache the chart bitmap between cursor moves; long recordings are only drawn
// again for zoom, visibility, size or theme changes.
export function renderAnalysisChart(parent, series, labels, axisMs, metricLabel, savedState = null, axisMode = 'elapsed') {
    const element = node(parent, 'div'); element.id = 'tools-chart-view'; parent = element;
    let start = 0, end = axisMs, cursor = 0, pinned = false, drag = null, disposed = false;
    const hidden = new Set(), controls = node(parent, 'div', undefined, 'tools-actions');
    if (savedState && (savedState.axisMode || 'elapsed') === axisMode) {
        ({start, end, cursor, pinned} = savedState);
        savedState.hidden.forEach(index => { if (index >= 0 && index < series.length) hidden.add(index); });
        if (hidden.size === series.length) hidden.delete(0);
        fitWindow(savedState.axisMs);
    }
    let plotCache = null;
    const number = value => value.toLocaleString(undefined, {maximumFractionDigits: 2});
    const elapsed = ms => number(ms / 60000) + 'm';
    const clock = ms => {
        const seconds = Math.floor(ms / 1000), pad = n => String(n).padStart(2, '0');
        return pad(Math.floor(seconds / 3600)) + ':' + pad(Math.floor(seconds / 60) % 60) +
            (end - start < 60000 ? ':' + pad(seconds % 60) : '');
    };
    const axisLabel = ms => axisMode === 'clock' ? clock(ms) : elapsed(ms);
    const chartLabel = () => metricLabel + (axisMode === 'clock' ? ' by local time of day, 00:00 to 24:00.' : ' by real elapsed time.') +
        ' Arrow keys inspect samples; plus and minus zoom; Home and End jump to visible endpoints.';

    const zoomIn = button(controls, 'Zoom +', () => zoom(0.5), 'tools-chart-zoom-in');
    const zoomOut = button(controls, 'Zoom −', () => zoom(2), 'tools-chart-zoom-out');
    const panLeft = button(controls, '‹', () => pan(-1), 'tools-chart-pan-left'); panLeft.setAttribute('aria-label', 'Pan earlier');
    const panRight = button(controls, '›', () => pan(1), 'tools-chart-pan-right'); panRight.setAttribute('aria-label', 'Pan later');
    button(controls, 'Full range', () => { start = 0; end = axisMs; draw(); }, 'tools-chart-reset');
    const pin = button(controls, 'Pin cursor', () => { pinned = !pinned; inspect(); }, 'tools-chart-pin');
    const legend = node(parent, 'div', undefined, 'tools-chart-legend');
    const dark = ['#ff69b4','#79baff','#68d391','#ffd166','#c4a3ff','#ff987d'];
    const bright = ['#b42370','#175db0','#176f36','#835900','#7140a6','#a23c20'];
    // Use recording dates, not slot order or evenly paced replay positions.
    const newestFirst = series.map((s, i) => i).sort((a, b) => series[b].timestamps[0] - series[a].timestamps[0] || a - b);
    const colorIndices = series.map((s, i) => newestFirst.indexOf(i));
    const newest = newestFirst[0];
    const legendLabels = labels.map((label, i) => {
        const control = node(legend, 'label'), check = node(control, 'input'); check.type = 'checkbox'; check.checked = !hidden.has(i); check.dataset.analysisSeries = String(i);
        const swatch = node(control, 'span', '', 'tools-series-swatch'); swatch.setAttribute('aria-hidden', 'true');
        swatch.style.borderTopStyle = i === newest ? 'solid' : 'dashed';
        node(control, 'span', String.fromCharCode(65 + i) + (series.length > 1 && i === newest ? ' · Latest' : '') + ' · ' + label);
        control.title = (series.length > 1 ? (i === newest ? 'Latest session — solid pink: ' : 'Earlier session — dashed: ') : '') + label;
        check.onchange = () => {
            if (!check.checked && hidden.size === series.length - 1) { check.checked = true; return; }
            if (check.checked) hidden.delete(i); else hidden.add(i); draw();
        };
        return control;
    });
    const canvas = node(parent, 'canvas'); canvas.id = 'tools-analysis-chart'; canvas.tabIndex = 0; canvas.setAttribute('role', 'img');
    parent.insertBefore(canvas, legend);
    canvas.setAttribute('aria-label', chartLabel());
    const range = node(parent, 'p', '', 'tools-muted'); range.id = 'tools-chart-range';
    parent.insertBefore(range, legend);
    const settings = node(parent, 'div');
    const hint = node(parent, 'p', '', 'tools-muted');
    const scroll = node(parent, 'div', undefined, 'tools-scroll'), table = node(scroll, 'table'); table.id = 'tools-chart-inspection';
    const caption = node(table, 'caption');
    const header = node(node(table, 'thead'), 'tr'); ['Session','Count','Sample timestamp / status'].forEach(text => { node(header, 'th', text).scope = 'col'; });
    const body = node(table, 'tbody');
    const rows = series.map((s, i) => {
        const row = node(body, 'tr'); node(row, 'th', String.fromCharCode(65 + i)).scope = 'row';
        return {row, value: node(row, 'td'), detail: node(row, 'td')};
    });
    const bitmap = document.createElement('canvas');
    let width = 260, height = 200, ratio = 1, left = 52, right = 248, top = 15, bottom = 164;
    const timeAt = event => {
        const bounds = canvas.getBoundingClientRect(), x = (event.clientX - bounds.left) * width / bounds.width;
        return start + Math.max(0, Math.min(1, (x - left) / (right - left))) * (end - start);
    };
    function zoom(factor) { [start, end] = zoomAnalysisWindow(axisMs, start, end, factor, cursor); cursor = Math.max(start, Math.min(end, cursor)); draw(); }
    function pan(direction) {
        const span = end - start, next = Math.max(0, Math.min(axisMs - span, start + direction * span / 2));
        start = next; end = next + span; cursor = Math.max(start, Math.min(end, cursor)); draw();
    }
    function inspect() {
        if (disposed) return;
        caption.textContent = 'Cursor ' + axisLabel(cursor) + (pinned ? ' · pinned' : '');
        pin.textContent = pinned ? 'Unpin' : 'Pin'; pin.setAttribute('aria-label', pinned ? 'Unpin inspection cursor' : 'Pin inspection cursor'); pin.setAttribute('aria-pressed', String(pinned));
        series.forEach((s, i) => {
            const row = rows[i]; row.row.hidden = hidden.has(i);
            if (axisMode === 'clock') {
                const sample = inspectClockSample(s.clock, cursor);
                row.value.textContent = sample.matches.length ? sample.matches.map(match => number(match.value)).join(' / ') : '—';
                row.detail.textContent = sample.matches.length ? sample.matches.map(match =>
                    new Date(match.timestamp).toLocaleString(undefined, {timeZoneName: 'shortOffset'}) + ' · sample ' + (match.index + 1) +
                    (match.kind === 'held' ? ' (held until next sample)' : '')).join(' ; ') :
                    sample.kind === 'gap' ? 'Session gap — no sample' : 'Outside session at this clock time';
            } else {
                const sample = inspectAnalysisSample(s, cursor);
                row.value.textContent = sample.value === null ? '—' : number(sample.value);
                row.detail.textContent = sample.kind === 'gap' ? 'Session gap — no sample' : sample.kind === 'outside' ? 'Outside session' :
                    new Date(sample.timestamp).toLocaleString() + ' · sample ' + (sample.index + 1) + (sample.kind === 'held' ? ' (held until next sample)' : '');
            }
        });
        const ctx = canvas.getContext('2d'); ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height); ctx.drawImage(bitmap, 0, 0, width, height);
        const style = window.getComputedStyle(parent);
        const x = left + (cursor - start) / (end - start || 1) * (right - left);
        ctx.strokeStyle = style.getPropertyValue('--panel-text').trim(); ctx.setLineDash([3,3]); ctx.lineWidth = 1;
        if (cursor >= start && cursor <= end) { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke(); }
        ctx.setLineDash([]);
        if (drag) {
            ctx.fillStyle = '#ff69b433'; const from = left + (drag.from - start) / (end - start || 1) * (right - left);
            ctx.fillRect(Math.min(from, x), top, Math.abs(x - from), bottom - top);
        }
    }
    function draw() {
        if (disposed) return;
        width = Math.max(260, canvas.clientWidth); right = width - 14; ratio = window.devicePixelRatio || 1;
        canvas.width = bitmap.width = width * ratio; canvas.height = bitmap.height = height * ratio;
        const ctx = bitmap.getContext('2d'); ctx.scale(ratio, ratio);
        const style = window.getComputedStyle(parent), isDark = parent.closest('[data-theme]')?.dataset.theme !== 'bright';
        const colors = isDark ? dark : bright;
        if (!plotCache || plotCache.series !== series || plotCache.start !== start || plotCache.end !== end || plotCache.width !== right - left) {
            plotCache = {series, start, end, width: right - left, plots: new Array(series.length)};
        }
        const plots = series.map((s, j) => hidden.has(j) ? null :
            (plotCache.plots[j] ||= axisMode === 'clock' ? buildClockPlot(s.clock, start, end, right - left) : buildAnalysisPlot(s, start, end, right - left)));
        const maximum = Math.max(1, ...plots.map(plot => plot ? plot.maximum : 1));
        ctx.strokeStyle = style.getPropertyValue('--panel-divider').trim(); ctx.fillStyle = style.getPropertyValue('--panel-muted').trim(); ctx.font = '10px Arial';
        for (let step = 0; step <= 2; step++) {
            const y = bottom - step / 2 * (bottom - top); ctx.beginPath(); ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();
            ctx.textAlign = 'right';ctx.fillText(number(maximum * step / 2),left-5,y+3);
        }
        if (axisMode === 'clock') {
            for (let step = 0; step <= 4; step++) {
                ctx.textAlign = step === 0 ? 'left' : step === 4 ? 'right' : 'center';
                ctx.fillText(clock(start + (end - start) * step / 4), left + (right - left) * step / 4, bottom + 20);
            }
        } else {
            ctx.textAlign = 'left';ctx.fillText(elapsed(start),left,bottom+20);ctx.textAlign = 'right';ctx.fillText(elapsed(end),right,bottom+20);
        }
        // Paint the newest last so its solid line stays clear over older dashes.
        for (const j of newestFirst.slice().reverse()) {
            const color = colors[colorIndices[j]];
            legendLabels[j].style.color = color;
            legendLabels[j].querySelector('input').disabled = hidden.size === series.length - 1 && !hidden.has(j);
            if (hidden.has(j)) continue;
            ctx.strokeStyle = ctx.fillStyle = color;ctx.lineWidth = 1.8;ctx.lineCap = 'butt';
            ctx.setLineDash(j === newest ? [] : [6,4]);ctx.beginPath();
            let previousY = 0;
            const dots = [];
            const points = plots[j].points;
            points.forEach((point, i) => {
                const x = left + (point.time-start)/(end-start||1)*(right-left), y = bottom - point.value/maximum*(bottom-top);
                if (point.move) ctx.moveTo(x,y); else {ctx.lineTo(x,previousY);ctx.lineTo(x,y);}
                if (point.move && (i+1===points.length || points[i+1].move)) dots.push([x,y]);
                previousY=y;
            });
            ctx.stroke();ctx.setLineDash([]);dots.forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill();});
        }
        range.textContent = 'Chart window ' + axisLabel(start) + ' – ' + axisLabel(end) +
            (axisMode === 'clock' ? ' · 24h local clock' : ' · full comparison/session range ' + elapsed(axisMs));
        hint.textContent = (axisMode === 'clock' ?
            'Aligned by local time of day. Midnight crossings continue at the start of the chart. Clock changes are separate segments; repeated clock times can show multiple dated values. Statistics use full sessions.' :
            'Aligned from each session’s first retained sample, using real elapsed time. Hidden lines and zoom do not change summary totals or the shared comparison length.') +
            ' Move to inspect; click to pin, drag to zoom, or use the buttons and arrow keys. Gaps have no assumed samples.';
        zoomIn.disabled = end-start <= Math.min(1000,axisMs); zoomOut.disabled = end-start >= axisMs;
        panLeft.disabled = start <= 0; panRight.disabled = end >= axisMs; inspect();
    }
    canvas.onpointermove = event => { if (!pinned || drag) { cursor = timeAt(event); inspect(); } };
    canvas.onpointerdown = event => { if (event.button !== 0) return; canvas.focus(); drag = {from: timeAt(event), x: event.clientX, pinned}; canvas.setPointerCapture(event.pointerId); cursor = drag.from; inspect(); };
    canvas.onpointerup = event => {
        if (!drag) return;
        const origin = drag; cursor = timeAt(event); drag = null;
        if (Math.abs(event.clientX-origin.x)>5 && Math.abs(cursor-origin.from)>=Math.min(1000,axisMs)) {
            start = Math.min(cursor,origin.from);end = Math.max(cursor,origin.from);pinned = origin.pinned;draw();
        } else {pinned=!origin.pinned;inspect();}
        if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
    };
    canvas.onpointercancel = () => { drag = null; inspect(); };
    canvas.onkeydown = event => {
        if (!['ArrowLeft','ArrowRight','Home','End','+','=','-','Escape'].includes(event.key)) return;
        event.preventDefault();
        if (event.key==='+'||event.key==='=') {zoom(0.5);return;} if(event.key==='-'){zoom(2);return;}
        if(event.key==='Escape'){pinned=false;inspect();return;}
        if(event.key==='Home')cursor=start;else if(event.key==='End')cursor=end;
        else {
            let target=event.key==='ArrowRight'?end:start;
            for(let j=0;j<series.length;j++)if(!hidden.has(j)){
                const times=axisMode === 'clock' ? series[j].clock.navigation : series[j].times, index=analysisSampleIndex(times,cursor);
                if(event.key==='ArrowRight'&&index+1<times.length)target=Math.min(target,times[index+1]);
                if(event.key==='ArrowLeft'){
                    let i=index;while(i>=0&&times[i]>=cursor)i--;if(i>=0)target=Math.max(target,times[i]);
                }
            }
            cursor=Math.max(start,Math.min(end,target));
        }
        pinned=true;inspect();
    };
    function fitWindow(previousAxis) {
        if (start === 0 && end === previousAxis) { start = 0; end = axisMs; }
        else {
            const span = Math.min(Math.max(0, end - start), axisMs);
            start = Math.max(0, Math.min(start, axisMs - span)); end = start + span;
        }
        cursor = Math.max(start, Math.min(end, cursor));
    }
    draw();
    return {element, canvas, settings, draw,
        capture: () => ({start, end, cursor, pinned, axisMs, axisMode, hidden: [...hidden]}),
        update(nextSeries, nextAxis, nextMetricLabel, nextMode = 'elapsed') {
            if (disposed) return;
            const previousAxis = axisMs; series = nextSeries; axisMs = nextAxis; metricLabel = nextMetricLabel;
            if (axisMode !== nextMode) {
                axisMode = nextMode; start = 0; end = axisMs; cursor = 0; pinned = false;
            } else fitWindow(previousAxis);
            drag = null;
            canvas.setAttribute('aria-label', chartLabel());
            draw();
        },
        dispose() { disposed = true; drag = null; plotCache = null; bitmap.width = bitmap.height = 0; }
    };
}
