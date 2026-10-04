// Presentation receives compact analysis values and explicit user actions. It
// cannot read library storage, live state, playback, or acquisition controllers.
export function renderModelHistoryView(parent, overview, actions) {
    const { recordings } = overview;
    const number = value => value === null ? 'Not enough data' : value.toLocaleString(undefined, { maximumFractionDigits: 1 });
    const percent = value => value === null ? 'Not enough data' : number(value) + '%';
    const date = time => new Date(time).toLocaleString();
    function node(target, tag, text, className) {
        const element = document.createElement(tag);
        if (text !== undefined) element.textContent = text;
        if (className) element.className = className;
        target.appendChild(element); return element;
    }
    function button(target, text, click, id) {
        const element = node(target, 'button', text); element.type = 'button'; element.onclick = click;
        if (id) element.id = id; return element;
    }
    if (!recordings.length) {
        node(parent, 'p', 'No saved recordings for this model. Return to Recordings to keep or import one.', 'tools-muted');
        return null;
    }
    const legend = node(parent, 'p', '● Average · ◆ Peak in recording', 'tools-history-legend'); legend.id = 'tools-history-legend';
    const canvas = node(parent, 'canvas'); canvas.id = 'tools-history-chart'; canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', actions.metricLabel + ' across saved recordings, positioned by the date of their first retained sample. Select a recording below for the values.');
    canvas.setAttribute('aria-describedby', legend.id);
    node(parent, 'p', 'One point per recording, using its first retained sample date. Averages use real covered time; gaps and time after the final sample are excluded. Select a point or use the recording selector below.', 'tools-muted');
    node(parent, 'h3', 'Across these recordings');
    const cards = node(parent, 'dl', undefined, 'tools-history-stats'); cards.id = 'tools-history-stats';
    for (const [label, value] of [
        ['Recordings', recordings.length + ' / ' + overview.totalCount],
        ['Time-weighted average', number(overview.mean)], ['Peak in recordings', number(overview.peak)],
        ['Token holders / registered', percent(overview.tokenShare)],
        ['Covered time (sum)', actions.duration(overview.coveredMs)], ['Excluded gaps (sum)', actions.duration(overview.gapMs)]
    ]) { const card = node(cards, 'div'); node(card, 'dt', label); node(card, 'dd', value); }
    node(parent, 'p', 'Based only on saved recordings shown here. Token share uses registered-viewer time. These peaks are not ATH. Full-session highs may predate retained samples.', 'tools-muted');
    if (overview.overlaps) {
        const warning = node(parent, 'p', 'Some recording time ranges overlap. Totals sum recordings and may count the same period more than once.', 'tools-muted');
        warning.id = 'tools-history-overlap';
    }
    const controls = node(parent, 'div', undefined, 'tools-actions');
    const label = node(controls, 'label', 'Recording '), select = node(label, 'select'); select.id = 'tools-history-recording';
    // Newest first in the selector/table; chronological positions on the chart.
    for (const record of [...recordings].reverse()) {
        const option = node(select, 'option', date(record.time) + ' · ' + record.title); option.value = record.id;
    }
    if (recordings.some(record => record.id === actions.selected)) select.value = actions.selected;
    const detail = node(parent, 'section', undefined, 'tools-current'); detail.id = 'tools-history-detail';
    detail.setAttribute('aria-label', 'Selected recording');
    const heading = node(detail, 'strong'), meta = node(detail, 'p', undefined, 'tools-muted');
    const values = node(detail, 'p'); values.setAttribute('aria-live', 'polite');
    const buttons = node(detail, 'div', undefined, 'tools-actions');
    const selected = () => recordings.find(record => record.id === select.value);
    button(buttons, 'Summary', () => actions.summary(select.value), 'tools-history-summary').className = 'tools-primary';
    button(buttons, 'Replay', () => actions.replay(select.value), 'tools-history-replay');
    const compare = button(buttons, 'Compare with previous', () => {
        const index = recordings.indexOf(selected());
        if (index > 0) actions.compare(recordings[index - 1].id, select.value);
    }, 'tools-history-compare');
    let positions = [], shown = 50;
    function draw() {
        const width = Math.max(240, canvas.clientWidth), height = 200, ratio = window.devicePixelRatio || 1;
        canvas.width = width * ratio; canvas.height = height * ratio;
        const ctx = canvas.getContext('2d'); ctx.scale(ratio, ratio);
        const style = window.getComputedStyle(parent), color = name => style.getPropertyValue(name).trim();
        const accent = color('--panel-accent'), secondary = color('--panel-secondary');
        const left = 48, right = width - 16, top = 16, bottom = height - 45;
        const first = recordings[0].time, last = recordings[recordings.length - 1].time;
        const max = Math.max(1, ...recordings.map(record => record.peak));
        ctx.strokeStyle = color('--panel-divider'); ctx.lineWidth = 1;
        ctx.fillStyle = color('--panel-muted'); ctx.font = '10px Arial';
        for (let step = 0; step <= 2; step++) {
            const y = bottom - step / 2 * (bottom - top);
            ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
            ctx.textAlign = 'right'; ctx.fillText(number(max * step / 2), left - 6, y + 3);
        }
        ctx.textAlign = first === last ? 'center' : 'left';
        const shortDate = time => new Date(time).toLocaleDateString(undefined, { year: '2-digit', month: 'short', day: 'numeric' });
        ctx.fillText(shortDate(first), first === last ? (left + right) / 2 : left, bottom + 19);
        if (first !== last) { ctx.textAlign = 'right'; ctx.fillText(shortDate(last), right, bottom + 19); }
        positions = [];
        for (const record of recordings) {
            const x = first === last ? (left + right) / 2 : left + (record.time - first) / (last - first) * (right - left);
            if (record.id === select.value) {
                ctx.strokeStyle = color('--panel-muted'); ctx.setLineDash([2, 3]);
                ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke(); ctx.setLineDash([]);
            }
            for (const [value, peak] of [[record.peak, true], [record.mean, false]]) {
                if (value === null) continue;
                const y = bottom - value / max * (bottom - top), radius = record.id === select.value ? 5 : 3;
                ctx.fillStyle = peak ? secondary : accent; ctx.beginPath();
                if (peak) { ctx.moveTo(x, y - radius); ctx.lineTo(x + radius, y); ctx.lineTo(x, y + radius); ctx.lineTo(x - radius, y); ctx.closePath(); }
                else ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill(); positions.push({ x, y, id: record.id });
            }
        }
        legend.style.color = accent;
        legend.replaceChildren(); node(legend, 'span', '● Average');
        node(legend, 'span', ' ◆ Peak in recording').style.color = secondary;
    }
    function updateSelection() {
        const record = selected();
        actions.select(record.id);
        heading.textContent = record.title; meta.textContent = date(record.time) + ' · ' + record.samples.toLocaleString() + ' samples';
        values.textContent = 'Average ' + number(record.mean) + ' · Peak in recording ' + number(record.peak) +
            ' · Full-session high ' + number(record.sessionPeak) + ' · Token holders / registered ' + percent(record.tokenShare) +
            ' · Covered ' + actions.duration(record.coveredMs) + ' · Gaps ' + actions.duration(record.gapMs);
        compare.disabled = recordings.indexOf(record) === 0;
        table.querySelectorAll('button[data-history-id]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.historyId === record.id)));
        draw();
    }
    select.onchange = updateSelection;
    canvas.onclick = event => {
        // Both panels may be scaled. Convert pointer coordinates to CSS pixels.
        const bounds = canvas.getBoundingClientRect(), width = Math.max(240, canvas.clientWidth);
        const x = (event.clientX - bounds.left) * width / bounds.width, y = (event.clientY - bounds.top) * 200 / bounds.height;
        let closest = null, distance = 15 * 15;
        for (const point of positions) {
            const d = (point.x - x) ** 2 + (point.y - y) ** 2;
            if (d <= distance) { closest = point; distance = d; }
        }
        if (closest) { select.value = closest.id; updateSelection(); }
    };
    const scroll = node(parent, 'div', undefined, 'tools-scroll'), table = node(scroll, 'table'); table.id = 'tools-history-table';
    node(table, 'caption', actions.metricLabel + ' · newest recording first');
    const head = node(node(table, 'thead'), 'tr');
    ['Recording', 'Average', 'Peak', 'Token share¹', 'Covered'].forEach(text => { node(head, 'th', text).scope = 'col'; });
    const body = node(table, 'tbody');
    const more = button(parent, 'Show more recordings', () => {
        shown += 50; rows(); updateSelection(); if (more.hidden) select.focus();
    }, 'tools-history-more');
    function rows() {
        body.replaceChildren();
        for (const record of [...recordings].reverse().slice(0, shown)) {
            const row = node(body, 'tr'), cell = node(row, 'th'); cell.scope = 'row';
            const choose = button(cell, record.title, () => { select.value = record.id; updateSelection(); select.focus(); });
            choose.dataset.historyId = record.id;
            node(cell, 'div', date(record.time), 'tools-muted');
            node(row, 'td', number(record.mean));
            node(row, 'td', number(record.peak)).title = 'First recorded at ' + date(record.peakTime);
            node(row, 'td', percent(record.tokenShare)); node(row, 'td', actions.duration(record.coveredMs));
        }
        more.hidden = shown >= recordings.length;
        more.textContent = 'Show ' + Math.min(50, recordings.length - shown) + ' more (' + Math.min(shown, recordings.length) + ' / ' + recordings.length + ')';
    }
    node(parent, 'p', '¹ Token holders as a proportion of registered viewers. Recordings with no covered interval have no average; recorded peaks remain available. Overlapping dates can be selected individually in the list.', 'tools-muted');
    rows(); updateSelection();
    return { canvas, draw };
}
