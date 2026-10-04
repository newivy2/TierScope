import { BACKUP_MAX_BYTES, createLibraryRecoveryExport, createTierScopeBackup, restoreTierScopeBackup, validateTierScopeBackup } from './backup.js';
import { readAnalysisPreferences, rememberAnalysisPreferences } from './analysis-preferences.js';
import { downloadDataFile, readDataFile } from './data-io.js';
import { cancelGifExport, generateGifFromHistory } from './gif.js';
import { displayedHighRoom } from './high-selectors.js';
import { readAllTimeHighs, sessionAllTimeHighs, storeAllTimeHighs } from './highs-store.js';
import { repaintHighMode } from './highs.js';
import { attachLibraryDock } from './library-dock.js';
import { libraryShell } from './library-shell.js';
import { createModelHistoryReader } from './model-history.js';
import { renderModelHistoryView } from './model-history-view.js';
import { isPlaybackCurrent } from './playback-data.js';
import { setPlaybackAllTimeState } from './playback-state.js';
import { getStorageKey } from './record-validation.js';
import { downloadRecording } from './recording-exports.js';
import { downloadTrackingReport } from './reports.js';
import { runtime } from './runtime.js';
import { ANALYSIS_METRICS, analysisSeries, compareSessions, parseAnalysisThresholds, summarizeAudience, summarizeSession, summarizeThresholds } from './session-analysis.js';
import { captureSessionFile } from './session-capture.js';
import { validateSessionFile } from './session-file-format.js';
import { getSessionSaveState } from './session-health.js';
import { LIBRARY_MAX_BYTES, LIBRARY_MAX_COUNT, LIBRARY_PREFIX, createLibraryReader, keepSessionInLibrary, removeLibrarySession, renameLibrarySession } from './session-library.js';
import { openSessionReplay } from './session-replay.js';
import { formatElapsedTime, getModelName } from './utils.js';

let closeSessionTools = null;
let refreshSessionTools = null;

export function updateSessionToolsStatus() {
    if (refreshSessionTools) refreshSessionTools();
    const element = document.getElementById('session-save-info');
    if (!element) return;
    if (isPlaybackCurrent(runtime.playback)) { element.textContent = 'Replay snapshot — use Keep in library to retain it here.'; element.style.color = 'var(--panel-muted)'; return; }
    const state = getSessionSaveState(getModelName());
    const warning = state.error || runtime.sessionStorageNotice;
    element.textContent = warning ? 'Session saving unavailable. Keep this tab open or download a session file.' :
        state.savedAt ? 'Session saved in this browser at ' + new Date(state.savedAt).toLocaleTimeString() + '.' : 'No session saved in this tab yet.';
    element.style.color = warning ? 'var(--panel-warning)' : 'var(--panel-muted)';
}

export function bindSessionTools() {
    for (const id of ['btn-control-library', 'btn-playback-library']) {
        const button = document.getElementById(id);
        if (button) button.onclick = () => { if (closeSessionTools) closeSessionTools(); else openSessionTools(button); };
    }
    return () => { if (closeSessionTools) closeSessionTools(); };
}

export function openSessionTools(focusTarget) {
    if (closeSessionTools) closeSessionTools();
    const origin = location.href, generation = runtime.initGuard, focusBefore = focusTarget || document.getElementById('btn-control-library') || document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.id = 'tierscope-session-tools'; dialog.setAttribute('aria-labelledby', 'tools-title');
    dialog.setAttribute('aria-modal', 'false');
    dialog.innerHTML = libraryShell();
    document.body.appendChild(dialog);
    let currentArchive = null, library = null, tab = 'library', fileRequest = 0, chartObserver = null;
    const libraryReader = createLibraryReader();
    const modelHistoryReader = createModelHistoryReader();
    let historyLimit = Infinity, historySelected = '';
    let optionsLibrary = null, optionsArchive = null, options = [];
    const savedAnalysis = readAnalysisPreferences();
    let {metric, threshold, sharedLength, summaryThresholds} = savedAnalysis.preferences;
    let selectedA = 'current', selectedB = '', pendingBackup = null;
    let libraryRoom = null, chartDraw = null, analysisPreferenceError = savedAnalysis.error;
    let observedSource = null, observedSignature = '';
    let detachDock = null;
    try { currentArchive = captureSessionFile(); } catch (error) { /* Tools also work on directory pages. */ }
    const content = dialog.querySelector('#tools-content'), message = dialog.querySelector('#tools-message');
    const current = () => dialog.isConnected && dialog.open && origin === location.href && generation === runtime.initGuard;
    function tell(text, error = false) { message.textContent = text; message.style.color = error ? 'var(--panel-negative)' : 'var(--panel-positive)'; }
    function rememberAnalysis(patch) {
        const result = rememberAnalysisPreferences(patch);
        ({metric, threshold, sharedLength, summaryThresholds} = result.preferences);
        analysisPreferenceError = result.error;
    }
    function downloadUnreadableRecords() {
        const recovery = createLibraryRecoveryExport();
        if (!recovery.records.length) { tell('No unreadable library records remain. Refresh the list.'); return; }
        downloadDataFile(recovery, 'TierScope-library-recovery-' + new Date().toISOString().slice(0, 10) + '.json');
        const missing = recovery.records.filter(record => record.error).length;
        tell('Recovery download requested. Originals were kept. This file is for manual recovery, not normal backup restore.' +
            (missing ? ' ' + missing + ' record(s) could not be exported; the file lists those errors.' : ''), !!missing);
    }
    function action(fn) { return (...args) => { try { fn(...args); } catch (error) { tell(error.message, true); } }; }
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
        const request = ++fileRequest, playbackAtRequest = runtime.playback; dialog.appendChild(input);
        const stillSelected = () => current() && request === fileRequest && runtime.playback === playbackAtRequest;
        input.onchange = async () => {
            const file = input.files && input.files[0]; if (!file) { input.remove(); return; }
            try {
                const value = await readDataFile(file, maxBytes);
                if (stillSelected()) accept(value);
            } catch (error) { if (stillSelected()) tell(error.message, true); }
            finally { input.remove(); }
        };
        input.addEventListener('cancel', () => input.remove(), { once: true }); input.click();
    }
    function readLibrary() {
        library = libraryReader.read(); options = []; optionsLibrary = null; optionsArchive = null;
        return library;
    }
    function sourceOptions() {
        if (optionsLibrary === library && optionsArchive === currentArchive) return options;
        const items = [];
        if (currentArchive) items.push({ id: 'current', title: 'Current / replayed snapshot — ' + currentArchive.room, archive: currentArchive });
        for (const entry of library.entries) items.push({ id: entry.id, title: (entry.title || entry.archive.room) + ' — ' + new Date(entry.archive.session.history.timestamps[0]).toLocaleString(), archive: entry.archive });
        optionsLibrary = library; optionsArchive = currentArchive; options = items;
        return options;
    }
    function selectSource(parent, label, id, selected, changed) {
        const wrapper = node(parent, 'label', label), select = node(wrapper, 'select'); select.id = id;
        for (const item of sourceOptions()) { const option = node(select, 'option', item.title); option.value = item.id; }
        if (sourceOptions().some(item => item.id === selected)) select.value = selected;
        select.onchange = () => changed(select.value); return select.value;
    }
    function archiveName(archive) {
        return archive.room + '-session-' + new Date(archive.session.timestamp).toISOString().replace(/[:.]/g, '-') + '.tierscope.json';
    }
    function addArchiveHighs(archive) {
        const result = storeAllTimeHighs(archive.room, sessionAllTimeHighs(archive.session, 'file'));
        if (isPlaybackCurrent(runtime.playback) && runtime.playback.archive.room.toLowerCase() === archive.room.toLowerCase()) {
            setPlaybackAllTimeState(runtime.playback, result.state);
        }
        repaintHighMode();
        tell(result.saved ? (result.changed ? 'All-time highs updated for ' : 'No higher records for ') + archive.room + '.' :
            result.state.error || 'Records changed in another tab. Try again.', !result.saved);
    }
    function refreshCurrent() {
        const playback = isPlaybackCurrent(runtime.playback) ? runtime.playback : null;
        const source = playback ? playback.archive : runtime.history;
        const history = playback ? source.session.history : runtime.history;
        const room = playback ? source.room : getModelName();
        const available = history.timestamps.length > 0 && (playback || runtime.activeSessionStorageKey === getStorageKey(room) && runtime.lastUrl === location.href);
        const signature = [room, !!playback, history.timestamps.length, history.timestamps.at(-1), runtime.isPaused, runtime.isStopped].join(':');
        if (source === observedSource && signature === observedSignature) return;
        const replaced = source !== observedSource;
        observedSource = source; observedSignature = signature;
        if (replaced || !currentArchive) { try { currentArchive = captureSessionFile(); } catch (error) { currentArchive = null; } }
        const title = dialog.querySelector('#tools-current-room'), meta = dialog.querySelector('#tools-current-meta'), label = dialog.querySelector('#tools-current-kind');
        if (title) title.textContent = room === 'unknown' ? 'No room session' : room;
        if (label) label.textContent = playback ? (playback.imported ? 'File / library replay' : 'Replay snapshot') : runtime.isStopped ? 'Stopped session' : runtime.isPaused ? 'Paused session' : 'Current live session';
        if (meta) meta.textContent = available ? history.timestamps.length.toLocaleString() + ' samples · ' +
            new Date(history.timestamps[0]).toLocaleString() : 'Record a sample or open a saved session to get started.';
        dialog.querySelectorAll('[data-current-action]').forEach(button => {
            button.dataset.currentAvailable = String(!!available);
            button.disabled = !available || button.id === 'btn-export-gif' && !!runtime.gifExportJob;
        });
        if (replaced && (tab === 'summary' || tab === 'compare')) render(tab);
    }
    function currentCard() {
        const card = node(content, 'section', undefined, 'tools-current'); card.setAttribute('aria-label', 'Current or replayed recording');
        node(card, 'div', '', 'tools-eyebrow').id = 'tools-current-kind';
        node(card, 'strong', '').id = 'tools-current-room';
        node(card, 'div', '', 'tools-muted').id = 'tools-current-meta';
        const actions = node(card, 'div', undefined, 'tools-actions');
        function currentButton(parent, text, fn, id) {
            const control = button(parent, text, () => fn(captureSessionFile()), id); control.dataset.currentAction = 'true'; return control;
        }
        currentButton(actions, 'Keep in library', archive => {
            const result = keepSessionInLibrary(archive); currentArchive = archive; libraryRoom = archive.room.toLowerCase();
            render('library'); tell(result.added ? 'Recording kept in the library.' : result.updated ? 'Library recording updated; its name was preserved.' : 'An equal or fuller recording is already in the library.');
        }, 'tools-keep').className = 'tools-primary';
        currentButton(actions, 'Save file', archive => downloadDataFile(archive, archiveName(archive)), 'tools-save-session');
        const exports = node(card, 'div', undefined, 'tools-actions');
        currentButton(exports, 'TXT', archive => {
            if (isPlaybackCurrent(runtime.playback)) downloadRecording(archive, 'txt'); else downloadTrackingReport();
        }, 'tools-export-txt').title = 'Download a text report for this recording';
        currentButton(exports, 'CSV', archive => downloadRecording(archive, 'csv'), 'tools-export-csv').title = 'Download every retained sample with its real timestamp';
        currentButton(exports, 'GIF', archive => generateGifFromHistory(archive), 'btn-export-gif').title = 'Download an animated GIF of the full recording';
        currentButton(exports, 'Add to all-time highs', addArchiveHighs, 'tools-add-all-time');
        const status = node(card, 'div', '', 'tools-muted'); status.id = 'session-save-info'; status.setAttribute('role', 'status');
        observedSignature = ''; refreshCurrent(); updateSessionToolsStatus();
    }
    function renderLibrary() {
        const state = readLibrary();
        currentCard();
        const actions = node(content, 'div', undefined, 'tools-actions');
        button(actions, 'Open saved file…', () => chooseFile(runtime.SESSION_FILE_MAX_BYTES, value => {
            openSessionReplay(validateSessionFile(value)); observedSignature = ''; refreshCurrent();
            tell('File opened in replay. Use Keep in library to store it here.');
        }), 'tools-open-session');
        button(actions, 'Import to library…', () => chooseFile(runtime.SESSION_FILE_MAX_BYTES, value => {
            const archive = validateSessionFile(value), result = keepSessionInLibrary(archive);
            libraryRoom = archive.room.toLowerCase();
            render('library'); tell(result.added ? 'Recording imported into the library.' : result.updated ? 'Library recording updated from the file.' : 'An equal or fuller recording is already in the library.');
        }), 'tools-import-session');
        button(actions, 'Refresh', () => render('library'), 'tools-refresh-library').title = 'Refresh list from this browser';
        node(content, 'p', state.count + ' / ' + LIBRARY_MAX_COUNT + ' recordings · ' + (state.bytes / 1024 / 1024).toFixed(2) + ' / ' + LIBRARY_MAX_BYTES / 1024 / 1024 + ' MB · Kept until you delete them.', 'tools-muted');
        const folders = new Map();
        for (const entry of state.entries) {
            const room = entry.archive.room.toLowerCase();
            if (!folders.has(room)) folders.set(room, []);
            folders.get(room).push(entry);
        }
        if (libraryRoom && !folders.has(libraryRoom)) libraryRoom = null;
        const searchLabel = node(content, 'label', 'Find ', 'tools-search'), search = node(searchLabel, 'input');
        search.type = 'search'; search.id = 'tools-library-search'; search.placeholder = 'Model or recording title';
        search.title = 'Search all recordings, including other model folders.';
        const list = node(content, 'div'); list.id = 'tools-library-list';
        let shown = 50;
        function rows() {
            list.replaceChildren();
            const query = search.value.trim().toLowerCase(), browsingFolders = !query && !libraryRoom;
            const visible = query ? state.entries.filter(entry => (entry.title + ' ' + entry.archive.room).toLowerCase().includes(query)) :
                libraryRoom ? folders.get(libraryRoom) : [...folders.keys()].sort((a, b) => a.localeCompare(b));
            const heading = node(list, 'div', undefined, 'tools-actions');
            if (!browsingFolders) button(heading, '‹ All models', () => {
                const previous = libraryRoom; libraryRoom = null; search.value = ''; shown = 50; rows();
                (document.getElementById('tools-folder-' + previous) || search).focus();
            }, 'tools-library-all-models');
            node(heading, 'h3', query ? 'Search results — all models' : libraryRoom ? 'Folder: ' + libraryRoom : 'Model folders');
            if (libraryRoom && !query) button(heading, 'History overview', () => {
                render('history'); dialog.querySelector('#tools-history-back').focus();
            }, 'tools-model-history').className = 'tools-primary';
            if (!visible.length) node(list, 'p', state.entries.length ? 'No matching recordings.' : 'Your library is empty. Keep a recording above or import a session file.', 'tools-muted');
            if (browsingFolders) for (const room of visible.slice(0, shown)) {
                const entries = folders.get(room), row = node(list, 'div', undefined, 'tools-folder');
                const open = button(row, '', () => {
                    libraryRoom = room; shown = 50; rows(); document.getElementById('tools-library-all-models').focus();
                }, 'tools-folder-' + room);
                open.setAttribute('aria-label', 'Open recordings for ' + room);
                node(open, 'span', '▱  ' + room, 'tools-folder-name');
                node(open, 'span', entries.length + (entries.length === 1 ? ' recording' : ' recordings') + ' · Latest ' +
                    new Date(entries[0].archive.session.history.timestamps[0]).toLocaleDateString(), 'tools-folder-meta');
            }
            else for (const entry of visible.slice(0, shown)) {
                const row = node(list, 'article', undefined, 'tools-row'); row.dataset.libraryId = entry.id;
                node(row, 'strong', entry.title || entry.archive.room);
                node(row, 'div', new Date(entry.archive.session.history.timestamps[0]).toLocaleString() + ' · ' + entry.archive.session.history.timestamps.length + ' samples', 'tools-muted');
                if (query) node(row, 'div', entry.archive.room, 'tools-muted');
                const actions = node(row, 'div', undefined, 'tools-actions');
                button(actions, 'Replay', () => { openSessionReplay(entry.archive); observedSignature = ''; refreshCurrent(); tell('Replaying ' + (entry.title || entry.archive.room) + '.'); }).className = 'tools-primary';
                button(actions, 'Summary', () => { selectedA = entry.id; render('summary'); });
                const more = node(actions, 'details', undefined, 'tools-more'); node(more, 'summary', 'More…');
                const extras = node(more, 'div', undefined, 'tools-more-actions');
                button(extras, 'Save file', () => downloadDataFile(entry.archive, archiveName(entry.archive)));
                button(extras, 'TXT', () => downloadRecording(entry.archive, 'txt'));
                button(extras, 'CSV', () => downloadRecording(entry.archive, 'csv'));
                button(extras, 'GIF', () => generateGifFromHistory(entry.archive));
                button(extras, 'Add to all-time highs', () => addArchiveHighs(entry.archive));
                button(extras, 'Rename', () => {
                    const title = window.prompt('Recording title (up to 80 characters):', entry.title);
                    if (title !== null) { renameLibrarySession(entry.id, title); render('library'); }
                });
                button(extras, 'Delete', () => {
                    if (!confirm('Delete this library recording: ' + (entry.title || entry.archive.room) + '?\n\nLive tracking, ATH and downloaded files are unchanged.')) return;
                    removeLibrarySession(entry.id); render('library'); tell('Library recording deleted.');
                }).className = 'tools-danger';
            }
            if (visible.length > 50) node(list, 'p', 'Showing ' + Math.min(shown, visible.length) + ' of ' + visible.length +
                (browsingFolders ? ' model folders.' : ' matching recordings.'), 'tools-muted');
            if (shown < visible.length) button(list, 'Show ' + Math.min(50, visible.length - shown) + ' more', () => {
                shown += 50; rows(); (document.getElementById('tools-library-more') || search).focus();
            }, 'tools-library-more');
        }
        search.oninput = () => { shown = 50; rows(); }; rows();
        if (state.damaged.length) {
            node(content, 'p', state.damaged.length + ' unreadable library record(s) were retained.', 'tools-muted');
            if (state.unavailable.length) node(content, 'p', 'Some records could not be read. The displayed storage size excludes them; saving new recordings waits until they can be read.', 'tools-muted');
            button(content, 'Download unreadable records', downloadUnreadableRecords, 'tools-recovery-download');
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
        metricSelect.value = metric; metricSelect.onchange = () => { rememberAnalysis({metric: metricSelect.value}); render(tab); };
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
                    rememberAnalysis({threshold: input.valueAsNumber});
                } else rememberAnalysis({summaryThresholds: parseAnalysisThresholds(input.value)});
            } catch (error) { input.setCustomValidity(error.message); input.reportValidity(); return; }
            input.setCustomValidity('');
            render(tab);
        }
        input.onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); applyThreshold(); } };
        button(controls, comparing ? 'Apply threshold' : 'Apply thresholds', applyThreshold, 'tools-apply-threshold');
        if (comparing) {
            const label = node(controls, 'label'), check = node(label, 'input'); check.type = 'checkbox'; check.checked = sharedLength; check.id = 'tools-shared-length';
            node(label, 'span', 'Match shared length'); check.onchange = () => { rememberAnalysis({sharedLength: check.checked}); render(tab); };
        }
        node(content, 'p', 'Aligned from the first retained sample, using real elapsed time. Averages and threshold durations hold each sample until the next; recording gaps are excluded. The final sample has no assumed duration.', 'tools-muted');
        if (comparing) node(content, 'p', 'A: ' + sourceOptions().find(item => item.id === selectedA).title + ' · B: ' + sourceOptions().find(item => item.id === selectedB).title, 'tools-muted');
        return sourceOptions();
    }
    const number = value => value === null ? 'Not enough data' : value.toLocaleString(undefined, { maximumFractionDigits: 1 });
    const percent = value => value === null ? 'Not enough data' : number(value) + '%';
    function renderHistory() {
        if (!library) readLibrary();
        const heading = node(content, 'div', undefined, 'tools-actions');
        button(heading, '‹ Recordings', () => {
            render('library'); (dialog.querySelector('#tools-model-history') || dialog.querySelector('#tools-library-search')).focus();
        }, 'tools-history-back');
        node(heading, 'h3', 'Model history · ' + libraryRoom);
        const controls = node(content, 'div', undefined, 'tools-actions');
        const metricLabel = node(controls, 'label', 'Metric '), metricSelect = node(metricLabel, 'select'); metricSelect.id = 'tools-history-metric';
        for (const [key, name] of Object.entries(ANALYSIS_METRICS)) { const option = node(metricSelect, 'option', name); option.value = key; }
        metricSelect.value = metric; metricSelect.onchange = () => { rememberAnalysis({metric: metricSelect.value}); render('history'); };
        const rangeLabel = node(controls, 'label', 'Show '), range = node(rangeLabel, 'select'); range.id = 'tools-history-range';
        for (const [value, label] of [['Infinity', 'All recordings'], ['30', 'Latest 30'], ['10', 'Latest 10']]) {
            const option = node(range, 'option', label); option.value = value;
        }
        range.value = String(historyLimit); range.onchange = () => { historyLimit = Number(range.value); render('history'); };
        button(controls, 'Refresh', () => { readLibrary(); render('history'); }, 'tools-history-refresh').title = 'Read the latest saved recordings from this browser';
        const overview = modelHistoryReader.read(library.entries, libraryRoom, metric, historyLimit);
        const view = renderModelHistoryView(content, overview, {
            metricLabel: ANALYSIS_METRICS[metric], duration: formatElapsedTime,
            selected: historySelected, select: id => { historySelected = id; },
            summary: action(id => { selectedA = id; render('summary'); }),
            replay: action(id => {
                const entry = library.entries.find(entry => entry.id === id);
                openSessionReplay(entry.archive); observedSignature = ''; refreshCurrent(); tell('Replaying ' + (entry.title || entry.archive.room) + '.');
            }),
            compare: (a, b) => { selectedA = a; selectedB = b; render('compare'); }
        });
        if (view) {
            chartDraw = view.draw;
            if (window.ResizeObserver) { chartObserver = new window.ResizeObserver(view.draw); chartObserver.observe(view.canvas); }
        }
        if (library.damaged.length) node(content, 'p', library.damaged.length + ' unreadable library record(s) are excluded. Return to Recordings for recovery options.', 'tools-muted');
    }
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
            const width = Math.max(260, canvas.clientWidth), height = 200, ratio = window.devicePixelRatio || 1;
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
        chartDraw = draw; draw();
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
            chart([a.archive], [a.archive.room], summary.spanMs);
            audienceOverview(a.archive); thresholdTable(a.archive);
            node(content, 'h3', ANALYSIS_METRICS[metric] + ' — details');
            summaryTable([summary], [a.archive.room], false);
        }
    }
    function checkbox(parent, id, text, checked = true) {
        const label = node(parent, 'label'), input = node(label, 'input'); input.type = 'checkbox'; input.id = id; input.checked = checked; node(label, 'span', text); return input;
    }
    function renderBackup() {
        node(content, 'h3', 'Back up this browser');
        node(content, 'p', 'Download ATH for every room and your saved preferences: theme, panel size/position, collapsed rows, compact metric, chart window, SH/ATH mode and analysis choices. Keep this file somewhere safe. Session-only controls such as the scan interval are not saved preferences.', 'tools-muted');
        const include = checkbox(content, 'tools-backup-library', 'Include library recordings');
        const state = readLibrary();
        let partial = null;
        if (state.damaged.length) {
            node(content, 'p', state.damaged.length + ' unreadable library record(s) are retained. You can back up healthy recordings and download the unreadable values separately for recovery.', 'tools-muted');
            partial = checkbox(content, 'tools-backup-partial', 'Back up healthy recordings; omit unreadable entries', false);
            button(content, 'Download unreadable records', downloadUnreadableRecords, 'tools-backup-recovery');
        }
        const actions = node(content, 'div', undefined, 'tools-actions');
        button(actions, 'Download backup', () => {
            const backup = createTierScopeBackup(include.checked, !!(partial && partial.checked));
            const omitted = backup.recovery ? backup.recovery.omittedLibraryKeys.length : 0;
            downloadDataFile(backup, 'TierScope-' + (omitted ? 'partial-backup-' : 'backup-') + new Date().toISOString().slice(0, 10) + '.json');
            tell(omitted ? 'Partial backup download requested: ' + backup.library.length + ' healthy recordings included; ' + omitted + ' unreadable entries omitted and left untouched. Download unreadable records separately for recovery.' :
                'Backup download requested. Check your browser downloads.', !!omitted);
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
            if (pendingBackup.recovery) node(content, 'p', 'This is a partial backup. ' + pendingBackup.recovery.omittedLibraryKeys.length + ' unreadable library entries were excluded when it was created; they cannot be restored from this file.', 'tools-muted');
            node(content, 'p', pendingBackup.rooms.length + ' rooms · ' + (Object.keys(pendingBackup.preferences).length + (pendingBackup.analysisPreferences ? 1 : 0)) + ' saved preferences · ' + pendingBackup.library.length + ' recordings', 'tools-muted');
            const choices = node(content, 'div', undefined, 'tools-actions');
            const highs = checkbox(choices, 'tools-restore-highs', 'Merge ATH'), preferences = checkbox(choices, 'tools-restore-preferences', 'Restore preferences'), recordings = checkbox(choices, 'tools-restore-library', 'Add library recordings');
            button(content, 'Restore selected data', () => {
                if (!highs.checked && !preferences.checked && !recordings.checked) throw new Error('Choose at least one kind of data to restore.');
                if (!confirm('Restore the selected backup data?\n\nATH will be merged, library recordings added or updated with fuller versions, and selected saved preferences replaced. Your live session is not replaced.' +
                    (pendingBackup.recovery ? '\n\nThis partial backup excludes ' + pendingBackup.recovery.omittedLibraryKeys.length + ' unreadable library entries.' : ''))) return;
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
        tab = next; fileRequest++; chartDraw = null;
        if (chartObserver) { chartObserver.disconnect(); chartObserver = null; }
        content.replaceChildren(); message.textContent = '';
        dialog.querySelectorAll('[data-tools-tab]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.toolsTab === (tab === 'history' ? 'library' : tab))));
        try {
            if (tab === 'library') renderLibrary(); else if (tab === 'history') renderHistory(); else if (tab === 'backup') renderBackup(); else renderAnalysis(tab === 'compare');
            if ((tab === 'summary' || tab === 'compare' || tab === 'history') && analysisPreferenceError) tell(analysisPreferenceError, true);
        } catch (error) { tell(error.message, true); }
        if (focusedId) {
            const target = document.getElementById(focusedId);
            if (target && dialog.contains(target)) target.focus();
        }
    }
    function close() {
        fileRequest++; refreshSessionTools = null;
        libraryReader.clear(); modelHistoryReader.clear(); options = []; optionsLibrary = null; optionsArchive = null; library = null; currentArchive = null;
        cancelGifExport();
        if (detachDock) detachDock();
        document.removeEventListener('keydown', escape);
        for (const id of ['btn-control-library', 'btn-playback-library']) {
            const button = document.getElementById(id); if (button) button.setAttribute('aria-expanded', 'false');
        }
        if (chartObserver) chartObserver.disconnect();
        if (dialog.open) dialog.close(); dialog.remove();
        if (closeSessionTools === close) closeSessionTools = null;
        let focus = focusBefore;
        if (!focus || !focus.isConnected || !focus.getClientRects().length || window.getComputedStyle(focus).visibility === 'hidden') {
            focus = document.getElementById(isPlaybackCurrent(runtime.playback) ? 'btn-playback-library' : 'btn-control-library');
        }
        if (focus) focus.focus();
    }
    function escape(event) {
        if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); close(); }
    }
    closeSessionTools = close;
    refreshSessionTools = refreshCurrent;
    document.addEventListener('keydown', escape);
    dialog.querySelector('#btn-cancel-gif').onclick = cancelGifExport;
    for (const id of ['btn-control-library', 'btn-playback-library']) {
        const button = document.getElementById(id); if (button) button.setAttribute('aria-expanded', 'true');
    }
    dialog.querySelector('#tools-close').onclick = close;
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('close', () => { if (dialog.isConnected) close(); });
    dialog.querySelectorAll('[data-tools-tab]').forEach(button => { button.onclick = () => render(button.dataset.toolsTab); });
    dialog.show();
    detachDock = attachLibraryDock(document.getElementById('tracker-container'), dialog, () => { if (chartDraw) chartDraw(); });
    render('library'); dialog.querySelector('#tools-close').focus();
}
