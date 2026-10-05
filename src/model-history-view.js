// Presentation receives compact analysis values and explicit user actions. It
// cannot read library storage, live state, playback, or acquisition controllers.
export function renderModelHistoryView(parent, overview, actions) {
    let { recordings } = overview;
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
        node(parent, 'p', 'No saved sessions for this model. Return to Sessions to keep or import one.', 'tools-muted');
        return null;
    }
    const controls = node(parent, 'div', undefined, 'tools-actions');
    const label = node(controls, 'label', 'Session '), select = node(label, 'select'); select.id = 'tools-history-recording';
    // Newest first in the selector/table; chronological positions on the chart.
    for (const record of [...recordings].reverse()) {
        const option = node(select, 'option', date(record.time) + ' · ' + record.title); option.value = record.id;
    }
    if (recordings.some(record => record.id === actions.selected)) select.value = actions.selected;
    const buttons = node(parent, 'div', undefined, 'tools-actions'); buttons.id = 'tools-history-actions';
    const selected = () => recordings.find(record => record.id === select.value);
    const compare = button(buttons, 'Compare with previous', () => {
        const ids = selected().comparisonIds;
        if (ids.length > 1) actions.compare(ids);
    }, 'tools-history-compare');
    compare.className = 'tools-primary';
    button(buttons, 'Summary', () => actions.summary(select.value), 'tools-history-summary');
    button(buttons, 'Replay', () => actions.replay(select.value), 'tools-history-replay');
    const comparisonHint = node(parent, 'p', '', 'tools-muted'); comparisonHint.id = 'tools-history-compare-hint';
    compare.setAttribute('aria-describedby', comparisonHint.id);
    if (actions.metricControl) actions.metricControl(parent);
    const legend = node(parent, 'p', '● Average · ◆ Peak in session', 'tools-history-legend'); legend.id = 'tools-history-legend';
    const canvas = node(parent, 'canvas'); canvas.id = 'tools-history-chart'; canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', actions.metricLabel + ' across saved sessions, positioned by the date of their first retained sample. Use the session selector above or the table below for the values.');
    canvas.setAttribute('aria-describedby', legend.id);
    node(parent, 'p', 'One point per session, using its first retained sample date. Averages use real covered time; gaps and time after the final sample are excluded. Select a point or use the session selector above.', 'tools-muted');
    node(parent, 'h3', 'Across these sessions');
    const cards = node(parent, 'dl', undefined, 'tools-history-stats'); cards.id = 'tools-history-stats';
    function updateCards() {
        cards.replaceChildren();
        for (const [label, value] of [
            ['Sessions', recordings.length + ' / ' + overview.totalCount],
            ['Time-weighted average', number(overview.mean)], ['Peak in sessions', number(overview.peak)],
            ['Token holders / registered', percent(overview.tokenShare)],
            ['Covered time (sum)', actions.duration(overview.coveredMs)], ['Excluded gaps (sum)', actions.duration(overview.gapMs)]
        ]) { const card = node(cards, 'div'); node(card, 'dt', label); node(card, 'dd', value); }
    }
    updateCards();
    node(parent, 'p', 'Based on the sessions shown here, including new scans while Follow live is on. Token share uses registered-viewer time. These peaks are not ATH. Full-session highs may predate retained samples.', 'tools-muted');
    const warning = node(parent, 'p', 'Some session time ranges overlap. Totals sum sessions and may count the same period more than once.', 'tools-muted');
    warning.id = 'tools-history-overlap'; warning.hidden = !overview.overlaps;
    const detail = node(parent, 'section', undefined, 'tools-current'); detail.id = 'tools-history-detail';
    detail.setAttribute('aria-label', 'Selected session');
    const heading = node(detail, 'strong'), meta = node(detail, 'p', undefined, 'tools-muted');
    const values = node(detail, 'p'); values.setAttribute('aria-live', 'polite');
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
        node(legend, 'span', ' ◆ Peak in session').style.color = secondary;
    }
    function updateSelection() {
        const record = selected();
        actions.select(record.id);
        heading.textContent = record.title; meta.textContent = date(record.time) + ' · ' + record.samples.toLocaleString() + ' samples';
        values.textContent = 'Average ' + number(record.mean) + ' · Peak in session ' + number(record.peak) +
            ' · Full-session high ' + number(record.sessionPeak) + ' · Token holders / registered ' + percent(record.tokenShare) +
            ' · Covered ' + actions.duration(record.coveredMs) + ' · Gaps ' + actions.duration(record.gapMs);
        const previousCount = record.comparisonIds.length - 1;
        compare.disabled = previousCount === 0;
        comparisonHint.textContent = previousCount ? 'Compare this session with ' + previousCount + ' earlier ' +
            (previousCount === 1 ? 'session' : 'sessions') + ' from this model (' + (previousCount + 1) + ' total).' : 'No earlier saved sessions for this model.';
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
    node(table, 'caption', actions.metricLabel + ' · newest session first');
    const head = node(node(table, 'thead'), 'tr');
    ['Session', 'Average', 'Peak', 'Token share¹', 'Covered'].forEach(text => { node(head, 'th', text).scope = 'col'; });
    const body = node(table, 'tbody');
    const more = button(parent, 'Show more sessions', () => {
        shown += 50; rows(); updateSelection(); if (more.hidden) select.focus();
    }, 'tools-history-more');
    function rows() {
        const previous = new Map([...body.children].map(row => [row.querySelector('button').dataset.historyId, row]));
        const retained = new Set();
        for (const [index, record] of [...recordings].reverse().slice(0, shown).entries()) {
            retained.add(record.id);
            let row = previous.get(record.id);
            if (row) {
                row.querySelector('button').textContent = record.title; row.querySelector('th div').textContent = date(record.time);
                const cells = row.querySelectorAll('td');
                cells[0].textContent = number(record.mean); cells[1].textContent = number(record.peak);
                cells[1].title = 'First recorded at ' + date(record.peakTime);
                cells[2].textContent = percent(record.tokenShare); cells[3].textContent = actions.duration(record.coveredMs);
                continue;
            }
            row = node(body, 'tr'); if (body.children[index] !== row) body.insertBefore(row, body.children[index]); const cell = node(row, 'th'); cell.scope = 'row';
            const choose = button(cell, record.title, () => { select.value = record.id; updateSelection(); select.focus(); });
            choose.dataset.historyId = record.id;
            node(cell, 'div', date(record.time), 'tools-muted');
            node(row, 'td', number(record.mean));
            node(row, 'td', number(record.peak)).title = 'First recorded at ' + date(record.peakTime);
            node(row, 'td', percent(record.tokenShare)); node(row, 'td', actions.duration(record.coveredMs));
        }
        for (const [id, row] of previous) if (!retained.has(id)) row.remove();
        more.hidden = shown >= recordings.length;
        more.textContent = 'Show ' + Math.min(50, recordings.length - shown) + ' more (' + Math.min(shown, recordings.length) + ' / ' + recordings.length + ')';
    }
    node(parent, 'p', '¹ Token holders as a proportion of registered viewers. Sessions with no covered interval have no average; recorded peaks remain available. Overlapping dates can be selected individually in the list.', 'tools-muted');
    rows(); updateSelection();
    return { canvas, draw, update(next, selectedId = select.value) {
        overview = next; recordings = next.recordings;
        const currentOptions = [...select.options];
        const nextRecords = [...recordings].reverse();
        if (currentOptions.length !== nextRecords.length || currentOptions.some((option, i) => option.value !== nextRecords[i].id)) {
            select.replaceChildren();
            for (const record of nextRecords) { const option = node(select, 'option', date(record.time) + ' · ' + record.title); option.value = record.id; }
        }
        [...select.options].forEach((option, i) => { const record = nextRecords[i]; option.textContent = date(record.time) + ' · ' + record.title; });
        if (recordings.some(record => record.id === selectedId)) select.value = selectedId;
        updateCards(); warning.hidden = !overview.overlaps; rows(); updateSelection();
    }};
}
