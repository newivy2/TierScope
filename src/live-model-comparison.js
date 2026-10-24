import { renderAnalysisChart } from './analysis-chart-view.js';
import { allocateLiveModelColors, buildLiveModelSeries } from './live-model-chart-data.js';
import { readLiveModelArchive, readLiveModelSources, subscribeLiveModelSources } from './live-model-sources.js';
import { ANALYSIS_METRICS, analysisSeries } from './session-analysis.js';
import { toolNode as node, toolButton as button } from './tools-view-helpers.js';

const MAX_MODELS = 12;
const statusNames = {tracking: 'Tracking', paused: 'Paused', stopped: 'Stopped', waiting: 'Waiting for first sample',
    offline: 'No connection', retry: 'Waiting to retry', reset: 'Session reset in another tab', unavailable: 'Unavailable', stale: 'Stale / suspended'};

export function createLiveComparisonState() {
    return {selected: new Set(), choices: new Map(), known: new Map(), snapshots: new Map(), colors: new Map(),
        autoPicked: false, frozen: false, frozenAt: 0, windowMs: 3600000, pickerOpen: false, chartState: null, chartIds: []};
}

// A Library controller: it reads published aggregate snapshots and gives only
// analysis values to the chart. It never scans, saves a recording or changes a
// live session, and subscriptions exist only while this view is open.
export function renderLiveModelsComparison(parent, {state, getMetric, metricControl}) {
    const root = node(parent, 'section'); root.id = 'tools-live-models';
    node(root, 'h3', 'Live models comparison');
    node(root, 'p', 'Uses scans from your other TierScope tabs. No additional API requests.', 'tools-muted');
    const controls = node(root, 'div', undefined, 'tools-actions');
    const freeze = button(controls, '', () => {
        state.frozen = !state.frozen;
        state.frozenAt = state.frozen ? state.displayAt || Date.now() : 0;
        plotSignature = ''; refresh();
    }, 'tools-live-freeze');
    freeze.className = 'tools-primary';
    button(controls, 'Refresh sources', () => refresh(true), 'tools-live-refresh');
    const rangeLabel = node(controls, 'label', 'Show '), windowSelect = node(rangeLabel, 'select'); windowSelect.id = 'tools-live-window';
    for (const [value, label] of [[900000, 'Last 15 minutes'], [3600000, 'Last hour'], [14400000, 'Last 4 hours'], [Infinity, 'Full sessions']]) {
        const option = node(windowSelect, 'option', label); option.value = String(value);
    }
    windowSelect.value = String(state.windowMs);
    windowSelect.onchange = () => { state.windowMs = Number(windowSelect.value); clearChart(); state.chartState = null; plotSignature = ''; refresh(); };
    const status = node(root, 'p', '', 'tools-muted'); status.id = 'tools-live-status'; status.setAttribute('role', 'status');
    const chooser = node(root, 'details'); chooser.id = 'tools-live-chooser'; chooser.open = state.pickerOpen;
    chooser.ontoggle = () => {if (!disposed) state.pickerOpen = chooser.open;};
    const chooserTitle = node(chooser, 'summary', 'Models being tracked');
    node(chooser, 'p', 'Choose up to 12 models. When a model is open in several tabs, the session with the most samples is used. Ties keep the current source. Tracking status and sample age are shown separately.', 'tools-muted');
    const rowsElement = node(chooser, 'div', undefined, 'tools-live-sources');
    const empty = node(chooser, 'p', '', 'tools-muted'); empty.id = 'tools-live-empty';
    metricControl(root, () => {plotSignature = ''; refresh();});
    const chartHost = node(root, 'div');
    const reports = node(root, 'div', undefined, 'tools-scroll');
    const table = node(reports, 'table'); table.id = 'tools-live-samples';
    node(table, 'caption', 'Latest accepted sample in each displayed snapshot');
    const heading = node(node(table, 'thead'), 'tr');
    ['Model', 'Count', 'Sample time', 'Samples', 'Source status'].forEach(text => {node(heading, 'th', text).scope = 'col';});
    const reportBody = node(table, 'tbody');
    node(root, 'p', 'The chart uses actual dates and clock times, including midnight crossings. Gaps stay gaps and lines end at their last accepted sample. A stale source may be suspended or closed; its old counts are never treated as a fresh scan. Keeping sessions in Library remains a separate choice.', 'tools-muted');
    let disposed = false, refreshing = false, view = null, observer = null, detach = null;
    let rows = new Map(), topology = '', plotSignature = '', notice = '', userNotice = '';
    function age(time, at) {
        if (!Number.isFinite(time)) return 'No sample';
        const seconds = Math.max(0, Math.floor((at - time) / 1000));
        return seconds < 60 ? seconds + 's ago' : seconds < 3600 ? Math.floor(seconds / 60) + 'm ago' : Math.floor(seconds / 3600) + 'h ago';
    }
    function describe(source) { return statusNames[source.status] || 'Unavailable'; }
    function clearChart() {
        if (view) {state.chartState = view.capture(); view.dispose(); view = null;}
        if (observer) {observer.disconnect(); observer = null;}
        chartHost.replaceChildren();
    }
    function choose(source, checked) {
        state.autoPicked = true;
        if (checked && !state.selected.has(source.id) && state.selected.size >= MAX_MODELS) {
            userNotice = 'Choose up to 12 models. Uncheck another model first.'; refresh(); return;
        }
        if (checked) state.selected.add(source.id); else state.selected.delete(source.id);
        plotSignature = ''; userNotice = ''; refresh();
    }
    function sourceText(source, index, at) {
        return 'Tab ' + (index + 1) + ' · ' + describe(source) + ' · ' + (source.sampleAt ? new Date(source.sampleAt).toLocaleTimeString() : 'no sample');
    }
    function updateRows(groups, at) {
        const nextTopology = [...groups].map(([room, sources]) => room + ':' + sources.map(source => source.id).join('|')).join('\n');
        if (nextTopology !== topology) {
            topology = nextTopology; rowsElement.replaceChildren(); rows = new Map();
            for (const [room, sources] of groups) {
                const row = node(rowsElement, 'div', undefined, 'tools-live-source'); row.dataset.liveRoom = room;
                const label = node(row, 'label', undefined, 'tools-live-model');
                const check = node(label, 'input'); check.type = 'checkbox'; node(label, 'strong', room);
                const select = node(row, 'select'); select.dataset.liveTab = room; select.setAttribute('aria-label', 'Source tab for ' + room);
                for (const source of sources) {const option = node(select, 'option'); option.value = source.id;}
                const tabNote = node(row, 'span', '', 'tools-muted'); tabNote.dataset.liveTabNote = '';
                const detail = node(row, 'span', '', 'tools-muted'); detail.dataset.liveStatus = '';
                const snapshot = node(row, 'span', '', 'tools-muted'); snapshot.dataset.liveSample = '';
                rows.set(room, {row, check, select, tabNote, detail, snapshot});
                check.onchange = () => choose(state.known.get(state.choices.get(room)), check.checked);
                select.onchange = () => {
                    const old = state.choices.get(room), checked = state.selected.delete(old);
                    state.choices.set(room, select.value);
                    if (checked) state.selected.add(select.value);
                    state.autoPicked = true; plotSignature = ''; userNotice = ''; refresh();
                };
            }
        }
        for (const [room, sources] of groups) {
            const row = rows.get(room), source = state.known.get(state.choices.get(room));
            row.check.dataset.liveSource = source.id;
            row.check.checked = state.selected.has(source.id);
            row.check.disabled = state.frozen || !row.check.checked && (!source.sampleCount || source.status === 'reset' || source.status === 'unavailable');
            const changedSession = sources.some(other => other.publisherId === source.publisherId && other.id !== source.id);
            row.select.value = source.id;
            row.select.hidden = !changedSession || !['unavailable', 'reset'].includes(source.status);
            row.select.disabled = state.frozen;
            [...row.select.options].forEach((option, index) => {option.textContent = sourceText(sources[index], index, at);});
            const publishers = new Set(sources.filter(item => item.status !== 'unavailable' && item.status !== 'reset').map(item => item.publisherId));
            row.tabNote.hidden = publishers.size < 2;
            row.tabNote.textContent = publishers.size + ' tabs · using the session with the most samples';
            row.detail.textContent = describe(source);
            row.snapshot.textContent = source.sampleCount ? source.sampleCount.toLocaleString() + ' samples · latest ' + age(source.sampleAt, at) : 'Waiting for a first accepted sample';
            row.row.dataset.liveState = source.status;
            row.row.dataset.liveSampleCount = String(source.sampleCount);
        }
    }
    function updateChart(sources, at, force) {
        if (!state.frozen) {
            for (const source of sources) {
                if (!source.sampleCount || ['reset', 'unavailable'].includes(source.status)) continue;
                const previous = state.snapshots.get(source.id);
                if (!force && previous?.revision === source.revision && previous.recordKey === source.recordKey) continue;
                try {
                    const archive = readLiveModelArchive(source);
                    if (archive) state.snapshots.set(source.id, {archive, revision: source.revision, recordKey: source.recordKey});
                } catch (error) { notice = 'Some source data is unavailable. Previous displayed snapshots are retained.'; }
            }
        }
        const selected = sources.filter(source => state.snapshots.has(source.id));
        const ids = selected.map(source => source.id), archives = selected.map(source => state.snapshots.get(source.id).archive);
        const signature = [getMetric(), state.windowMs, state.frozen, Math.floor((state.frozen ? state.frozenAt : at) / 30000),
            ...selected.map(source => source.id + ':' + source.status + ':' + state.snapshots.get(source.id).revision)].join('|');
        if (signature === plotSignature && !force) return;
        plotSignature = signature;
        if (!selected.length) {clearChart(); reportBody.replaceChildren(); table.hidden = true; return;}
        const data = buildLiveModelSeries(archives, getMetric(), {now: state.frozen ? state.frozenAt : at, windowMs: state.windowMs});
        const same = state.chartIds.length === ids.length && ids.every((id, index) => state.chartIds[index] === id);
        if (!same) {clearChart(); state.chartState = null;}
        state.colors = allocateLiveModelColors(selected.map(source => source.room), state.colors);
        const config = {originAt: data.originAt, sourceIds: ids, colorIndices: selected.map(source => state.colors.get(source.room))};
        if (view) view.update(data.series, data.axisMs, ANALYSIS_METRICS[getMetric()], 'live', config);
        else {
            view = renderAnalysisChart(chartHost, data.series, selected.map(source => source.room), data.axisMs,
                ANALYSIS_METRICS[getMetric()], same ? state.chartState : null, 'live', config);
            if (window.ResizeObserver) {observer = new window.ResizeObserver(view.draw); observer.observe(view.canvas);}
        }
        state.chartIds = ids.slice();
        state.displayAt = state.frozen ? state.frozenAt : at;
        reportBody.replaceChildren(); table.hidden = false;
        for (const source of selected) {
            const archive = state.snapshots.get(source.id).archive, history = archive.session.history;
            const row = node(reportBody, 'tr'); row.dataset.liveReport = source.room;
            node(row, 'th', source.room).scope = 'row';
            node(row, 'td', analysisSeries(archive, getMetric()).values.at(-1).toLocaleString());
            node(row, 'td', new Date(history.timestamps.at(-1)).toLocaleString());
            node(row, 'td', history.timestamps.length.toLocaleString());
            node(row, 'td', describe(source) + (state.frozen ? ' · chart frozen' : ''));
        }
    }
    function refresh(force = false) {
        if (disposed || refreshing) return;
        refreshing = true;
        try {
            notice = '';
            const at = Date.now(), result = readLiveModelSources(force), sources = [...(result.sources || [])], available = new Map(sources.map(source => [source.id, source]));
            if (result.error) notice = 'Live sharing is unavailable: ' + result.error + '. Previous snapshots are retained.';
            for (const id of state.selected) {
                if (available.has(id)) continue;
                const previous = state.known.get(id);
                if (previous) sources.push({...previous, status: 'unavailable'});
            }
            const groups = new Map();
            sources.sort((a, b) => a.room.localeCompare(b.room) || a.id.localeCompare(b.id));
            for (const source of sources) {
                state.known.set(source.id, source);
                if (!groups.has(source.room)) groups.set(source.room, []);
                groups.get(source.room).push(source);
            }
            for (const [room, entries] of groups) {
                const choice = state.choices.get(room), previous = state.known.get(choice);
                const candidates = entries.filter(source => available.has(source.id) && !['reset', 'unavailable', 'stale'].includes(source.status));
                const preferred = candidates.sort((a, b) => b.sampleCount - a.sampleCount ||
                    Number(b.id === choice) - Number(a.id === choice) || (b.sampleAt || 0) - (a.sampleAt || 0) || a.id.localeCompare(b.id))[0];
                // Duplicate-tab preference is explicit. A Reset/new session in
                // the same tab still needs a deliberate source choice instead
                // of replacing the old session behind the user's back.
                const changedSession = previous && entries.some(source => available.has(source.id) &&
                    source.publisherId === previous.publisherId && source.id !== choice);
                if (!state.frozen && preferred && !result.error && (!choice || !state.selected.has(choice) ||
                    previous?.status !== 'reset' && !changedSession &&
                    (!available.has(choice) || previous?.status === 'stale' || preferred.sampleCount > previous.sampleCount))) {
                    if (state.selected.delete(choice)) state.selected.add(preferred.id);
                    state.choices.set(room, preferred.id);
                } else if (!choice) state.choices.set(room, entries[0].id);
            }
            if (!state.autoPicked) {
                const initial = [...groups].map(([room]) => state.known.get(state.choices.get(room)))
                    .filter(source => source.sampleCount && !['reset', 'unavailable', 'stale'].includes(source.status)).slice(0, MAX_MODELS);
                if (initial.length) {initial.forEach(source => state.selected.add(source.id)); state.autoPicked = true;}
            }
            updateRows(groups, at);
            const selected = [...state.selected].map(id => state.known.get(id)).filter(value => !!value);
            updateChart(selected, at, force);
            freeze.textContent = state.frozen ? 'Resume comparison' : 'Freeze comparison';
            freeze.setAttribute('aria-pressed', String(state.frozen)); freeze.disabled = !state.snapshots.size;
            chooserTitle.textContent = 'Models being tracked · ' + groups.size + ' · ' + state.selected.size + ' selected';
            empty.hidden = groups.size > 0;
            empty.textContent = 'Open broadcast rooms in other tabs with this TierScope beta enabled. Models appear after their tabs start tracking; no favorite or saved Library session is required.';
            const unavailable = selected.filter(source => ['unavailable', 'reset', 'stale'].includes(source.status)).length;
            status.textContent = (state.frozen ? 'Frozen at ' + new Date(state.frozenAt).toLocaleTimeString() + ' · source status still updates.' : 'Following new scans · ' + state.selected.size + ' / 12 models selected.') +
                (unavailable ? ' ' + unavailable + ' source(s) unavailable or stale; open Models being tracked for details.' : '') +
                (notice ? ' ' + notice : '') + (userNotice ? ' ' + userNotice : '');
            if (!groups.size) {chooser.open = true; status.textContent = 'Open a room in another TierScope tab to start comparing live models.';}
            for (const id of [...state.snapshots.keys()]) if (!state.selected.has(id)) state.snapshots.delete(id);
            for (const id of [...state.known.keys()]) if (!available.has(id) && !state.selected.has(id) && ![...state.choices.values()].includes(id)) state.known.delete(id);
        } catch (error) {status.textContent = 'Live comparison unavailable: ' + error.message + '. Existing session data is unchanged.';}
        finally {refreshing = false;}
    }
    refresh();
    detach = subscribeLiveModelSources(() => refresh());
    return {
        refresh, draw() {if (view) view.draw();},
        dispose() {
            if (disposed) return; disposed = true;
            if (detach) detach();
            if (view) {state.chartState = view.capture(); view.dispose();}
            if (observer) observer.disconnect();
        }
    };
}
