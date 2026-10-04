import { setPlaybackAllTimeState } from './playback-state.js';
import { createTierScopeBackup, restoreTierScopeBackup, validateTierScopeBackup, BACKUP_MAX_BYTES } from './backup.js';
import { downloadDataFile, readDataFile } from './data-io.js';
import { captureSessionFile, openSessionReplay, validateSessionFile } from './files.js';
import { displayedHighRoom, readAllTimeHighs, repaintHighMode } from './highs.js';
import { ANALYSIS_METRICS, analysisSeries, compareSessions, parseAnalysisThresholds, summarizeAudience, summarizeSession, summarizeThresholds } from './session-analysis.js';
import { getSessionSaveState } from './session-health.js';
import { keepSessionInLibrary, readSessionLibrary, removeLibrarySession, renameLibrarySession, LIBRARY_PREFIX, LIBRARY_MAX_COUNT, LIBRARY_MAX_BYTES } from './session-library.js';
import { runtime } from './runtime.js';
import { isPlaybackCurrent } from './replay.js';
import { setThemeVariables } from './theme.js';
import { formatElapsedTime, getModelName } from './utils.js';

let closeSessionTools = null;
let replayKeepState = { archive: null, label: 'Keep in library', message: '' };

export function updateReplayLibraryButton() {
    const button = document.getElementById('btn-playback-keep-library');
    if (!button) return;
    const archive = isPlaybackCurrent(runtime.playback) ? runtime.playback.archive : null;
    if (replayKeepState.archive !== archive) replayKeepState = { archive, label: 'Keep in library', message: '' };
    button.disabled = !archive;
    // Playback repaints frequently; announce feedback only when it changes.
    if (button.textContent !== replayKeepState.label) button.textContent = replayKeepState.label;
    const title = replayKeepState.message || 'Keep the full replayed recording in this browser\'s library';
    if (button.title !== title) button.title = title;
    const label = replayKeepState.label + '. ' + title;
    if (button.getAttribute('aria-label') !== label) button.setAttribute('aria-label', label);
}

export function keepReplayInLibrary() {
    if (!isPlaybackCurrent(runtime.playback) || !runtime.playback.archive) return;
    const archive = runtime.playback.archive;
    try {
        const result = keepSessionInLibrary(archive);
        replayKeepState = { archive, label: result.added ? 'Kept in library' : result.updated ? 'Updated library' : 'Already kept',
            message: archive.room + ': ' + (result.added ? 'Full recording kept in the library.' : result.updated ?
                'Library recording updated; its name was preserved.' : 'An equal or fuller recording is already in the library.') };
    } catch (error) {
        replayKeepState = { archive, label: 'Retry keep', message: 'Could not keep this recording: ' + error.message };
        alert(replayKeepState.message);
    }
    updateReplayLibraryButton();
}

export function updateSessionToolsStatus() {
    updateReplayLibraryButton();
    const element = document.getElementById('session-save-info');
    if (!element) return;
    const state = getSessionSaveState(getModelName());
    const warning = state.error || runtime.sessionStorageNotice;
    element.textContent = warning ? 'Session saving unavailable. Keep this tab open or download a session file.' :
        state.savedAt ? 'Session saved in this browser at ' + new Date(state.savedAt).toLocaleTimeString() + '.' : 'No session saved in this tab yet.';
    element.style.color = warning ? 'var(--panel-warning)' : 'var(--panel-muted)';
}

export function bindSessionTools(menu) {
    document.getElementById('btn-playback-keep-library').onclick = keepReplayInLibrary;
    const libraryButton = document.getElementById('btn-control-library');
    libraryButton.onclick = () => openSessionTools(libraryButton);
    const button = document.createElement('button');
    button.id = 'btn-session-tools'; button.type = 'button'; button.textContent = 'Session library, analysis & backup…';
    button.style.cssText = 'display:block;width:100%;margin:8px 0 4px;padding:5px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:3px;cursor:pointer;';
    button.onclick = () => { menu.style.display = 'none'; document.getElementById('btn-panel-options').setAttribute('aria-expanded', 'false'); openSessionTools(); };
    menu.appendChild(button);
    const status = document.createElement('div'); status.id = 'session-save-info'; status.setAttribute('role', 'status');
    status.style.cssText = 'font-size:10px;line-height:1.4;margin-top:6px;'; menu.appendChild(status);
    menu.style.maxHeight = '75vh'; menu.style.overflowY = 'auto';
    updateSessionToolsStatus();
    return () => { if (closeSessionTools) closeSessionTools(); };
}

export function openSessionTools(focusTarget) {
    if (closeSessionTools) closeSessionTools();
    const origin = location.href, generation = runtime.initGuard, focusBefore = focusTarget || document.getElementById('btn-panel-options') || document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.id = 'tierscope-session-tools'; dialog.setAttribute('aria-labelledby', 'tools-title');
    dialog.style.cssText = 'box-sizing:border-box;width:min(780px,94vw);max-height:90vh;padding:20px;border:1px solid #ff69b4;border-radius:10px;background:var(--panel-solid);color:var(--panel-text);font:14px/1.5 Arial,sans-serif;overflow:auto;';
    setThemeVariables(dialog);
    dialog.innerHTML = '<style>#tierscope-session-tools::backdrop{background:#0009}#tierscope-session-tools *{box-sizing:border-box}#tierscope-session-tools button,#tierscope-session-tools select,#tierscope-session-tools input{font:inherit;color:var(--panel-text);background:var(--panel-button);border:1px solid var(--panel-divider);border-radius:5px;padding:5px 8px;max-width:100%}#tierscope-session-tools button{cursor:pointer}#tierscope-session-tools button:disabled{opacity:.5;cursor:default}#tierscope-session-tools button:focus-visible,#tierscope-session-tools select:focus-visible,#tierscope-session-tools input:focus-visible{outline:2px solid #ff69b4;outline-offset:2px}#tierscope-session-tools button[aria-pressed=true]{border-color:#ff69b4}#tierscope-session-tools .tools-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:12px 0}#tierscope-session-tools .tools-muted{color:var(--panel-muted);font-size:12px}#tierscope-session-tools .tools-row{border-top:1px solid var(--panel-divider);padding:12px 0;overflow-wrap:anywhere}#tierscope-session-tools table{width:100%;border-collapse:collapse;font-size:13px}#tierscope-session-tools th,#tierscope-session-tools td{text-align:left;padding:7px;border-bottom:1px solid var(--panel-divider)}#tierscope-session-tools caption{text-align:left;font-weight:bold;padding:8px 0}#tierscope-session-tools .tools-scroll{overflow-x:auto}#tierscope-session-tools canvas{display:block;width:100%;height:240px}#tierscope-session-tools label{display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap;min-width:0;max-width:100%}#tierscope-session-tools h3{font-size:16px;margin:12px 0}</style>' +
        '<div class="tools-actions" style="justify-content:space-between;margin-top:0"><h2 id="tools-title" style="font-size:20px;margin:0">Session tools</h2><button id="tools-close" aria-label="Close session tools">Close</button></div>' +
        '<nav class="tools-actions" aria-label="Session tools"><button data-tools-tab="library">Library</button><button data-tools-tab="summary">Summary</button><button data-tools-tab="compare">Compare</button><button data-tools-tab="backup">Backup &amp; restore</button></nav>' +
        '<div id="tools-message" role="status" aria-live="polite" style="white-space:pre-line;overflow-wrap:anywhere"></div><div id="tools-content"></div>';
    document.body.appendChild(dialog);
    let currentArchive = null, library = null, tab = 'library', fileRequest = 0, chartObserver = null;
    let selectedA = 'current', selectedB = '', metric = 'room', threshold = 100, sharedLength = true, pendingBackup = null;
    let summaryThresholds = [25, 50, 100], libraryRoom = null;
    try { currentArchive = captureSessionFile(); } catch (error) { /* Tools also work on directory pages. */ }
    const content = dialog.querySelector('#tools-content'), message = dialog.querySelector('#tools-message');
    const current = () => dialog.isConnected && dialog.open && origin === location.href && generation === runtime.initGuard;
    function tell(text, error = false) { message.textContent = text; message.style.color = error ? 'var(--panel-negative)' : 'var(--panel-positive)'; }
    function action(fn) { return () => { try { fn(); } catch (error) { tell(error.message, true); } }; }
    function button(parent, text, fn, id) {
        const element = document.createElement('button'); element.type = 'button'; element.textContent = text;
        if (id) element.id = id; element.onclick = action(fn); parent.appendChild(element); return element;
    }
    function node(parent, tag, text, className) {
        const element = document.createElement(tag); if (text !== undefined) element.textContent = text;
        if (className) element.className = className; parent.appendChild(element); return element;
    }
    function chooseFile(maxBytes, accept) {
        const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json'; input.hidden = true;
        const request = ++fileRequest; dialog.appendChild(input);
        input.onchange = async () => {
            const file = input.files && input.files[0]; if (!file) { input.remove(); return; }
            try {
                const value = await readDataFile(file, maxBytes);
                if (current() && request === fileRequest) accept(value);
            } catch (error) { if (current() && request === fileRequest) tell(error.message, true); }
            finally { input.remove(); }
        };
        input.addEventListener('cancel', () => input.remove(), { once: true }); input.click();
    }
    function readLibrary() { library = readSessionLibrary(); return library; }
    function sourceOptions() {
        const items = [];
        if (currentArchive) items.push({ id: 'current', title: 'Current / replayed snapshot — ' + currentArchive.room, archive: currentArchive });
        for (const entry of library.entries) items.push({ id: entry.id, title: (entry.title || entry.archive.room) + ' — ' + new Date(entry.archive.session.history.timestamps[0]).toLocaleString(), archive: entry.archive });
        return items;
    }
    function selectSource(parent, label, id, selected, changed) {
        const wrapper = node(parent, 'label', label), select = node(wrapper, 'select'); select.id = id;
        for (const item of sourceOptions()) { const option = node(select, 'option', item.title); option.value = item.id; }
        if (sourceOptions().some(item => item.id === selected)) select.value = selected;
        select.onchange = () => changed(select.value); return select.value;
    }
    function renderLibrary() {
        const state = readLibrary();
        const folders = new Map();
        for (const entry of state.entries) {
            const room = entry.archive.room.toLowerCase();
            if (!folders.has(room)) folders.set(room, []);
            folders.get(room).push(entry);
        }
        if (libraryRoom && !folders.has(libraryRoom)) libraryRoom = null;
        node(content, 'p', state.count + ' / ' + LIBRARY_MAX_COUNT + ' recordings · ' + (state.bytes / 1024 / 1024).toFixed(2) + ' / ' + LIBRARY_MAX_BYTES / 1024 / 1024 + ' MB. Kept until you delete them; nothing is removed automatically.', 'tools-muted');
        const actions = node(content, 'div', undefined, 'tools-actions');
        button(actions, 'Keep current / replayed session in library', () => {
            const archive = captureSessionFile();
            const result = keepSessionInLibrary(archive);
            currentArchive = archive; libraryRoom = archive.room.toLowerCase();
            render('library'); tell(result.added ? 'Recording kept in the library.' : result.updated ? 'Library recording updated.' : 'An equal or fuller recording is already in the library.');
        }, 'tools-keep').disabled = !currentArchive;
        button(actions, 'Import session file…', () => chooseFile(runtime.SESSION_FILE_MAX_BYTES, value => {
            const archive = validateSessionFile(value), result = keepSessionInLibrary(archive);
            libraryRoom = archive.room.toLowerCase();
            render('library'); tell(result.added ? 'Recording imported into the library.' : result.updated ? 'Library recording updated from the file.' : 'An equal or fuller recording is already in the library.');
        }), 'tools-import-session');
        button(actions, 'Refresh list', () => render('library'));
        const searchLabel = node(content, 'label', 'Find a recording '), search = node(searchLabel, 'input');
        search.type = 'search'; search.id = 'tools-library-search'; search.placeholder = 'Model or title — all models';
        search.title = 'Search all recordings, including those in other model folders.';
        const list = node(content, 'div'); list.id = 'tools-library-list';
        let shown = 50;
        function rows() {
            list.replaceChildren();
            const query = search.value.trim().toLowerCase();
            const browsingFolders = !query && !libraryRoom;
            const visible = query ? state.entries.filter(entry => (entry.title + ' ' + entry.archive.room).toLowerCase().includes(query)) :
                libraryRoom ? folders.get(libraryRoom) : [...folders.keys()].sort((a, b) => a.localeCompare(b));
            const heading = node(list, 'div', undefined, 'tools-actions');
            if (!browsingFolders) button(heading, 'All models', () => {
                const previous = libraryRoom; libraryRoom = null; search.value = ''; shown = 50; rows();
                (document.getElementById('tools-folder-' + previous) || search).focus();
            }, 'tools-library-all-models');
            node(heading, 'h3', query ? 'Search results — all models' : libraryRoom ? 'Folder: ' + libraryRoom : 'Model folders');
            if (browsingFolders) node(list, 'p', folders.size + ' model folder(s). Open a folder to see its recordings, newest first.', 'tools-muted');
            if (!visible.length) node(list, 'p', state.entries.length ? 'No matching recordings.' : 'No recordings yet. Keep a session or import a session file.');
            if (browsingFolders) for (const room of visible.slice(0, shown)) {
                const entries = folders.get(room), row = node(list, 'div', undefined, 'tools-folder');
                row.style.cssText = 'border-top:1px solid var(--panel-divider);padding:12px 0;overflow-wrap:anywhere;';
                const open = button(row, '📁 ' + room, () => {
                    libraryRoom = room; shown = 50; rows();
                    document.getElementById('tools-library-all-models').focus();
                }, 'tools-folder-' + room);
                open.setAttribute('aria-label', 'Open recordings for ' + room);
                node(row, 'div', entries.length + (entries.length === 1 ? ' recording' : ' recordings') + ' · Latest: ' +
                    new Date(entries[0].archive.session.history.timestamps[0]).toLocaleString(), 'tools-muted');
            }
            else for (const entry of visible.slice(0, shown)) {
                const row = node(list, 'div', undefined, 'tools-row'); row.dataset.libraryId = entry.id;
                node(row, 'strong', entry.title || entry.archive.room);
                node(row, 'div', entry.archive.room + ' · ' + new Date(entry.archive.session.history.timestamps[0]).toLocaleString() + ' · ' + entry.archive.session.history.timestamps.length + ' samples', 'tools-muted');
                const actions = node(row, 'div', undefined, 'tools-actions');
                button(actions, 'Replay', () => { openSessionReplay(entry.archive); close(); });
                button(actions, 'Summary', () => { selectedA = entry.id; render('summary'); });
                button(actions, 'Download', () => downloadDataFile(entry.archive, entry.archive.room + '-session.tierscope.json'));
                button(actions, 'Rename', () => {
                    const title = window.prompt('Recording title (up to 80 characters):', entry.title);
                    if (title !== null) { renameLibrarySession(entry.id, title); render('library'); }
                });
                button(actions, 'Delete', () => {
                    if (!confirm('Delete this library recording: ' + (entry.title || entry.archive.room) + '?\n\nLive tracking, ATH and downloaded files are unchanged.')) return;
                    removeLibrarySession(entry.id); render('library'); tell('Library recording deleted.');
                });
            }
            if (visible.length > 50) node(list, 'p', 'Showing ' + Math.min(shown, visible.length) + ' of ' + visible.length +
                (browsingFolders ? ' model folders.' : ' matching recordings.'), 'tools-muted');
            if (shown < visible.length) button(list, 'Show ' + Math.min(50, visible.length - shown) + ' more', () => {
                shown += 50; rows();
                (document.getElementById('tools-library-more') || search).focus();
            }, 'tools-library-more');
        }
        search.oninput = () => { shown = 50; rows(); }; rows();
        if (state.damaged.length) {
            node(content, 'p', state.damaged.length + ' unreadable library record(s) were retained.', 'tools-muted');
            button(content, 'Remove unreadable library records…', () => {
                if (!confirm('Delete the ' + state.damaged.length + ' unreadable library record(s)? This cannot be undone.')) return;
                for (const key of state.damaged) removeLibrarySession(key.slice(LIBRARY_PREFIX.length));
                render('library');
            });
        }
    }
    function analysisControls(comparing) {
        if (!library) readLibrary();
        if (!sourceOptions().length) { node(content, 'p', 'Record a session or import one into the library to see analysis.'); return null; }
        const controls = node(content, 'div', undefined, 'tools-actions');
        if (currentArchive) button(controls, 'Refresh current / replayed snapshot', () => { currentArchive = captureSessionFile(); render(tab); }, 'tools-refresh-snapshot');
        selectedA = selectSource(controls, comparing ? 'A ' : 'Recording ', 'tools-source-a', selectedA, value => { selectedA = value; render(tab); });
        if (comparing) {
            if (!sourceOptions().some(item => item.id === selectedB)) selectedB = (sourceOptions().find(item => item.id !== selectedA) || sourceOptions()[0]).id;
            selectedB = selectSource(controls, 'B ', 'tools-source-b', selectedB, value => { selectedB = value; render(tab); });
        }
        const label = node(controls, 'label', 'Metric '), metricSelect = node(label, 'select'); metricSelect.id = 'tools-metric';
        for (const [key, name] of Object.entries(ANALYSIS_METRICS)) { const option = node(metricSelect, 'option', name); option.value = key; }
        metricSelect.value = metric; metricSelect.onchange = () => { metric = metricSelect.value; render(tab); };
        const thresholdLabel = node(controls, 'label', comparing ? 'Threshold ' : 'Thresholds '), input = node(thresholdLabel, 'input');
        input.id = 'tools-threshold'; input.style.width = comparing ? '105px' : '200px';
        if (comparing) {
            input.type = 'number'; input.min = '0'; input.max = '9007199254740991'; input.step = '1'; input.value = threshold;
        } else {
            input.type = 'text'; input.maxLength = 160; input.value = summaryThresholds.join(', '); input.placeholder = '25, 50, 100';
            input.title = 'Up to 8 counts separated by commas. Applies to the selected metric.';
        }
        input.oninput = () => input.setCustomValidity('');
        function applyThreshold() {
            try {
                if (comparing) {
                    if (!Number.isSafeInteger(input.valueAsNumber) || input.valueAsNumber < 0) throw new Error('Enter a non-negative whole number.');
                    threshold = input.valueAsNumber;
                } else summaryThresholds = parseAnalysisThresholds(input.value);
            } catch (error) { input.setCustomValidity(error.message); input.reportValidity(); return; }
            input.setCustomValidity('');
            render(tab);
        }
        input.onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); applyThreshold(); } };
        button(controls, comparing ? 'Apply threshold' : 'Apply thresholds', applyThreshold, 'tools-apply-threshold');
        if (comparing) {
            const label = node(controls, 'label'), check = node(label, 'input'); check.type = 'checkbox'; check.checked = sharedLength; check.id = 'tools-shared-length';
            node(label, 'span', 'Match shared length'); check.onchange = () => { sharedLength = check.checked; render(tab); };
        }
        node(content, 'p', 'Aligned from the first retained sample, using real elapsed time. Averages and threshold durations hold each sample until the next; recording gaps are excluded. The final sample has no assumed duration.', 'tools-muted');
        if (comparing) node(content, 'p', 'A: ' + sourceOptions().find(item => item.id === selectedA).title + ' · B: ' + sourceOptions().find(item => item.id === selectedB).title, 'tools-muted');
        return sourceOptions();
    }
    const number = value => value === null ? 'Not enough data' : value.toLocaleString(undefined, { maximumFractionDigits: 1 });
    const percent = value => value === null ? 'Not enough data' : number(value) + '%';
    function audienceOverview(archive) {
        const overview = summarizeAudience(archive), coverage = overview.audience[0];
        node(content, 'h3', 'Audience overview');
        node(content, 'p', archive.room + ' · ' + coverage.samples + ' samples · Covered time ' + formatElapsedTime(coverage.coveredMs) +
            ' · Excluded gaps ' + formatElapsedTime(coverage.gapMs) + ' · Coverage ' + percent(coverage.coverage), 'tools-muted');
        const scroll = node(content, 'div', undefined, 'tools-scroll'), table = node(scroll, 'table'); table.id = 'tools-audience-table';
        node(table, 'caption', 'Audience across the retained recording');
        const head = node(node(table, 'thead'), 'tr');
        ['Audience', 'Time-weighted average', 'Peak in recording', 'Full-session high'].forEach(label => { node(head, 'th', label).scope = 'col'; });
        const body = node(table, 'tbody');
        for (const summary of overview.audience) {
            const row = node(body, 'tr'); node(row, 'th', ANALYSIS_METRICS[summary.metric]).scope = 'row';
            node(row, 'td', number(summary.mean));
            const peak = node(row, 'td', number(summary.peak));
            if (summary.peakTime !== null) peak.title = 'First recorded at ' + new Date(summary.peakTime).toLocaleString();
            node(row, 'td', number(summary.sessionPeak));
        }
        node(content, 'p', 'Room audience = registered + anonymous viewers. A full-session high may predate retained history. Hover a recording peak for its first recorded time.', 'tools-muted');
        const shares = node(content, 'div'); shares.id = 'tools-audience-shares';
        node(shares, 'h3', 'Audience proportions');
        node(shares, 'p', 'Token holders / registered viewers: ' + percent(overview.tokenShareRegistered));
        node(shares, 'p', 'Token holders / whole room: ' + percent(overview.tokenShareRoom));
        node(shares, 'p', 'Anonymous / whole room: ' + percent(overview.anonymousShareRoom));
        node(shares, 'p', 'Shares use viewer-time over covered intervals. A crowded interval contributes more than a quiet interval of the same length; gaps contribute nothing.', 'tools-muted');
    }
    function thresholdTable(archive) {
        const scroll = node(content, 'div', undefined, 'tools-scroll'), table = node(scroll, 'table'); table.id = 'tools-threshold-table';
        node(table, 'caption', ANALYSIS_METRICS[metric] + ' — time at or above selected thresholds');
        const head = node(node(table, 'thead'), 'tr');
        ['Threshold', 'Time at or above', '% of covered time'].forEach(label => { node(head, 'th', label).scope = 'col'; });
        const body = node(table, 'tbody');
        for (const result of summarizeThresholds(archive, metric, summaryThresholds)) {
            const row = node(body, 'tr'); node(row, 'th', number(result.threshold)).scope = 'row';
            node(row, 'td', result.durationMs === null ? 'Not enough data' : formatElapsedTime(result.durationMs));
            node(row, 'td', percent(result.percent));
        }
        node(content, 'p', 'Includes samples equal to the threshold. Percentages use covered recording time; gaps and time after the final sample are excluded.', 'tools-muted');
    }
    function summaryTable(summaries, labels, comparing = true) {
        const scroll = node(content, 'div', undefined, 'tools-scroll'), table = node(scroll, 'table'); table.id = 'tools-summary-table';
        node(table, 'caption', ANALYSIS_METRICS[metric] + ' — retained recording statistics');
        const head = node(table, 'thead'), headRow = node(head, 'tr'); node(headRow, 'th', 'Measure');
        labels.forEach(label => node(headRow, 'th', label));
        const body = node(table, 'tbody');
        const rows = [ ['Samples in range', s => number(s.samples)], ['Elapsed span', s => formatElapsedTime(s.spanMs)],
            ['Covered recording time', s => formatElapsedTime(s.coveredMs)], ['Excluded gaps', s => formatElapsedTime(s.gapMs)],
            ['Coverage', s => s.coverage === null ? 'Not enough data' : number(s.coverage) + '%'],
            ['Time-weighted average', s => number(s.mean)], ['Peak in range', s => number(s.peak)],
            ['Full-session high', s => number(s.sessionPeak)], ['Token-holder share of registered viewers', s => s.tokenShare === null ? 'Not enough data' : number(s.tokenShare) + '%'] ];
        if (comparing) rows.push(['Time at or above ' + threshold.toLocaleString(), s => s.coveredMs ? formatElapsedTime(s.atOrAboveMs) : 'Not enough data']);
        for (const [label, value] of rows) {
            const row = node(body, 'tr'); const cell = node(row, 'th', label); cell.scope = 'row';
            summaries.forEach(summary => node(row, 'td', value(summary)));
        }
        node(content, 'p', 'The full-session high can predate retained history and is not limited by “Match shared length.” Token-holder share is weighted by recorded registered-viewer time.', 'tools-muted');
    }
    function chart(archives, labels, endMs) {
        const legend = node(content, 'p', labels.map((label, i) => (i ? 'B (dashed blue): ' : 'A (pink): ') + label).join(' · '), 'tools-muted');
        const canvas = node(content, 'canvas'); canvas.id = 'tools-analysis-chart'; canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', ANALYSIS_METRICS[metric] + ' by minutes since the first retained sample. ' + legend.textContent + '. Statistics are in the table below.');
        function draw() {
            const width = Math.max(260, canvas.clientWidth), height = 240, ratio = window.devicePixelRatio || 1;
            canvas.width = width * ratio; canvas.height = height * ratio;
            const ctx = canvas.getContext('2d'); ctx.scale(ratio, ratio);
            const series = archives.map(archive => analysisSeries(archive, metric));
            let max = 1;
            series.forEach(s => s.values.forEach((value, i) => { if (s.times[i] <= endMs) max = Math.max(max, value); }));
            const left = 58, top = 16, right = width - 12, bottom = height - 38, span = endMs || 1;
            ctx.strokeStyle = runtime.isDarkMode ? '#686875' : '#b6bdca'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, bottom); ctx.lineTo(right, bottom); ctx.stroke();
            ctx.fillStyle = runtime.isDarkMode ? '#ddd' : '#41485a'; ctx.font = '11px Arial'; ctx.textAlign = 'left';
            ctx.fillText(number(max), 2, top + 8); ctx.fillText('0', 30, bottom); ctx.fillText('0m', left, bottom + 19);
            ctx.textAlign = 'right'; ctx.fillText(number(endMs / 60000) + 'm', right, bottom + 19);
            series.forEach((s, j) => {
                ctx.strokeStyle = j ? (runtime.isDarkMode ? '#79baff' : '#175db0') : (runtime.isDarkMode ? '#ff69b4' : '#b42370');
                ctx.lineWidth = 2; ctx.setLineDash(j ? [6, 4] : []); ctx.beginPath();
                const isolated = [];
                let previousX = null, previousY = null;
                for (let i = 0; i < s.times.length && s.times[i] <= endMs; i++) {
                    const x = left + s.times[i] / span * (right - left), y = bottom - s.values[i] / max * (bottom - top);
                    if (previousX === null || s.breaks[i]) ctx.moveTo(x, y);
                    else { ctx.lineTo(x, previousY); ctx.lineTo(x, y); }
                    previousX = x; previousY = y;
                    if ((i === 0 || s.breaks[i]) && (i + 1 === s.times.length || s.breaks[i + 1] || s.times[i + 1] > endMs)) isolated.push([x, y]);
                    // Carry a recorded value only to the visible boundary, never through a gap.
                    if (i + 1 < s.times.length && s.times[i + 1] > endMs && !s.breaks[i + 1]) ctx.lineTo(right, y);
                }
                ctx.stroke(); ctx.setLineDash([]);
                ctx.fillStyle = ctx.strokeStyle;
                isolated.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); });
            });
        }
        draw();
        if (window.ResizeObserver) { chartObserver = new window.ResizeObserver(draw); chartObserver.observe(canvas); }
    }
    function renderAnalysis(comparing) {
        const options = analysisControls(comparing); if (!options) return;
        const a = options.find(item => item.id === selectedA), b = options.find(item => item.id === selectedB);
        if (comparing) {
            if (a.id === b.id) node(content, 'p', 'Choose a second recording to make a comparison.', 'tools-muted');
            const result = compareSessions(a.archive, b.archive, metric, threshold, sharedLength);
            chart([a.archive, b.archive], [a.archive.room, b.archive.room], result.axisMs);
            summaryTable([result.a, result.b], ['A', 'B']);
        } else {
            const summary = summarizeSession(a.archive, metric, threshold);
            audienceOverview(a.archive); thresholdTable(a.archive);
            node(content, 'h3', ANALYSIS_METRICS[metric] + ' — chart and details');
            chart([a.archive], [a.archive.room], summary.spanMs); summaryTable([summary], [a.archive.room], false);
        }
    }
    function checkbox(parent, id, text, checked = true) {
        const label = node(parent, 'label'), input = node(label, 'input'); input.type = 'checkbox'; input.id = id; input.checked = checked; node(label, 'span', text); return input;
    }
    function renderBackup() {
        node(content, 'h3', 'Back up this browser');
        node(content, 'p', 'Download ATH for every room and your saved preferences: theme, panel size/position, collapsed rows, compact metric, chart window and SH/ATH mode. Keep this file somewhere safe. Session-only controls such as the scan interval are not saved preferences.', 'tools-muted');
        const include = checkbox(content, 'tools-backup-library', 'Include library recordings');
        const actions = node(content, 'div', undefined, 'tools-actions');
        button(actions, 'Download backup', () => {
            downloadDataFile(createTierScopeBackup(include.checked), 'TierScope-backup-' + new Date().toISOString().slice(0, 10) + '.json');
            tell('Backup download requested. Check your browser downloads.');
        }, 'tools-backup-download');
        node(content, 'h3', 'Restore a backup');
        node(content, 'p', 'ATH is merged without lowering existing records. New library sessions are added; fuller versions of the same session update its entry and keep its name. Saved preferences take effect after refreshing your room tabs.', 'tools-muted');
        button(content, 'Choose backup…', () => {
            pendingBackup = null; render('backup');
            chooseFile(BACKUP_MAX_BYTES, value => {
                pendingBackup = validateTierScopeBackup(value); render('backup'); tell('Backup validated. Review the contents and choose what to restore.');
            });
        }, 'tools-backup-open');
        if (pendingBackup) {
            node(content, 'p', pendingBackup.rooms.length + ' rooms · ' + Object.keys(pendingBackup.preferences).length + ' saved preferences · ' + pendingBackup.library.length + ' recordings', 'tools-muted');
            const choices = node(content, 'div', undefined, 'tools-actions');
            const highs = checkbox(choices, 'tools-restore-highs', 'Merge ATH'), preferences = checkbox(choices, 'tools-restore-preferences', 'Restore preferences'), recordings = checkbox(choices, 'tools-restore-library', 'Add library recordings');
            button(content, 'Restore selected data', () => {
                if (!highs.checked && !preferences.checked && !recordings.checked) throw new Error('Choose at least one kind of data to restore.');
                if (!confirm('Restore the selected backup data?\n\nATH will be merged, library recordings added or updated with fuller versions, and selected saved preferences replaced. Your live session is not replaced.')) return;
                const result = restoreTierScopeBackup(pendingBackup, { highs: highs.checked, preferences: preferences.checked, library: recordings.checked });
                library = null;
                if (runtime.playback) setPlaybackAllTimeState(runtime.playback, readAllTimeHighs(displayedHighRoom()));
                repaintHighMode();
                tell('Restored: ' + result.rooms + ' room ATH updates, ' + result.recordings + ' new recordings, ' + result.updatedRecordings + ' updated recordings, ' + result.preferences + ' preferences.' + (result.preferences ? '\nRefresh your room tabs when convenient to apply preferences.' : ''));
            }, 'tools-backup-restore');
        }
    }
    function render(next) {
        const focusedId = dialog.contains(document.activeElement) ? document.activeElement.id : '';
        if (next !== tab) library = null;
        tab = next; fileRequest++;
        if (chartObserver) { chartObserver.disconnect(); chartObserver = null; }
        content.replaceChildren(); message.textContent = '';
        dialog.querySelectorAll('[data-tools-tab]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.toolsTab === tab)));
        try {
            if (tab === 'library') renderLibrary(); else if (tab === 'backup') renderBackup(); else renderAnalysis(tab === 'compare');
        } catch (error) { tell(error.message, true); }
        if (focusedId) {
            const target = document.getElementById(focusedId);
            if (target && dialog.contains(target)) target.focus();
        }
    }
    function close() {
        fileRequest++;
        if (chartObserver) chartObserver.disconnect();
        if (dialog.open) dialog.close(); dialog.remove();
        if (closeSessionTools === close) closeSessionTools = null;
        if (focusBefore && focusBefore.isConnected) focusBefore.focus();
    }
    closeSessionTools = close;
    dialog.querySelector('#tools-close').onclick = close;
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('close', () => { if (dialog.isConnected) close(); });
    dialog.querySelectorAll('[data-tools-tab]').forEach(button => { button.onclick = () => render(button.dataset.toolsTab); });
    dialog.showModal(); render('library');
}
