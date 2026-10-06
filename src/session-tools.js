import { CLOCK_DAY_MS, clockSessionDuration, projectClockSeries } from './analysis-clock-data.js';
import { createAnalysisFollower } from './analysis-follow.js';
import { renderMetricStrip } from './analysis-metric-view.js';
import { automaticLibraryStatus, keepFavoriteSession } from './automatic-library.js';
import { changeModelFavorite } from './favorite-controls.js';
import { paintFavoriteButton } from './favorite-view.js';
import { BACKUP_MAX_BYTES, createLibraryRecoveryExport, createTierScopeBackup, restoreTierScopeBackup, validateTierScopeBackup } from './backup.js';
import { readAnalysisPreferences, rememberAnalysisPreferences } from './analysis-preferences.js';
import { downloadDataFile, readDataFile } from './data-io.js';
import { cancelGifExport, generateGifFromHistory } from './gif.js';
import { displayedHighRoom } from './high-selectors.js';
import { readAllTimeHighs, sessionAllTimeHighs, storeAllTimeHighs } from './highs-store.js';
import { repaintHighMode } from './highs.js';
import { attachLibraryDock } from './library-dock.js';
import { LIBRARY_TRANSFER_MAX_COUNT } from './library-capacity-data.js';
import { readAutomaticKeepingMinutes, saveAutomaticKeepingMinutes, readLibraryLimits, saveLibraryLimits } from './library-capacity.js';
import { renderAutomaticKeepingSettings, renderLibraryCapacity } from './library-capacity-view.js';
import { libraryShell } from './library-shell.js';
import { migrateRecordingFavorites, readModelFavorites, readModelFavorite } from './library-models.js';
import { createLibraryDrafts } from './library-drafts.js';
import { renderLibraryBrowser, renderRecordingNotes } from './library-browser-view.js';
import { createModelCardReader, filterLibraryEntries } from './library-query.js';
import { recordingFilters } from './tools-view-helpers.js';
import { exportLibrarySelection, importLibraryBundle, libraryImportBundle } from './library-transfer.js';
import { renderAnalysisChart } from './analysis-chart-view.js';
import { createModelHistoryReader, previousModelSessionIds } from './model-history.js';
import { renderModelHistoryView } from './model-history-view.js';
import { freezeRecordingData } from './immutable-data.js';
import { isPlaybackCurrent } from './playback-data.js';
import { setPlaybackAllTimeState } from './playback-state.js';
import { getStorageKey } from './record-validation.js';
import { downloadRecording } from './recording-exports.js';
import { downloadTrackingReport } from './reports.js';
import { runtime } from './runtime.js';
import { ANALYSIS_METRICS, analysisSeries, averageAnalysisThresholds, compareRecordingSet, parseAnalysisThresholds, summarizeAudience, summarizeSession, summarizeThresholds } from './session-analysis.js';
import { captureSessionFile, captureLiveSessionFile } from './session-capture.js';
import { validateSessionFile } from './session-file-format.js';
import { getSessionSaveState } from './session-health.js';
import { LIBRARY_PREFIX, compareLibrarySessions, createLibraryReader, keepSessionInLibrary, removeLibrarySession, renameLibrarySession, updateLibraryMetadata } from './session-library.js';
import { openSessionReplay } from './session-replay.js';
import { formatElapsedTime, getModelName } from './utils.js';

const noteDrafts = createLibraryDrafts();
let draftUnloadAttached = false;
function warnUnsavedNotes(event) { if (noteDrafts.size) { event.preventDefault(); event.returnValue = ''; } }
function syncDraftWarning() {
    if (noteDrafts.size && !draftUnloadAttached) window.addEventListener('beforeunload', warnUnsavedNotes);
    if (!noteDrafts.size && draftUnloadAttached) window.removeEventListener('beforeunload', warnUnsavedNotes);
    draftUnloadAttached = noteDrafts.size > 0;
}
let closeSessionTools = null;
let refreshSessionTools = null;

export function updateSessionToolsStatus(reload = false) {
    if (refreshSessionTools) refreshSessionTools(reload);
    const element = document.getElementById('session-save-info');
    if (!element) return;
    const state = getSessionSaveState(getModelName());
    const warning = state.error || runtime.sessionStorageNotice;
    element.textContent = warning ? 'Session saving unavailable. Keep this tab open or download a session file.' :
        state.savedAt ? 'Session saved in this browser at ' + new Date(state.savedAt).toLocaleTimeString() + '.' : 'No session saved in this tab yet.';
    element.style.color = warning ? 'var(--panel-warning)' : 'var(--panel-muted)';
    element.hidden = !warning;
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
    let currentArchive = null, liveComparisonArchive = null, library = null, tab = 'library', fileRequest = 0, chartObserver = null;
    const libraryReader = createLibraryReader();
    const modelHistoryReader = createModelHistoryReader();
    const modelCardReader = createModelCardReader();
    let historyLimit = Infinity, historySelected = '', compareAxis = 'elapsed';
    let optionsLibrary = null, optionsArchive = null, optionsLiveArchive = null, options = [];
    const savedAnalysis = readAnalysisPreferences();
    let {metric, threshold, sharedLength} = savedAnalysis.preferences;
    let summaryThresholds = [], summaryThresholdSource = null, summaryAutomatic = true, thresholdDirty = false;
    let selectedA = 'current', selectedB = '', selectedExtra = [], pendingBackup = null;
    const libraryFilters = {room: '', query: '', from: '', to: '', sort: 'newest', favorites: false}, librarySelection = new Set();
    const libraryDisclosures = {book: false, search: false};
    const analysisFilters = {room: '', query: '', from: '', to: ''};
    let filteredSources = null, chartDispose = null;
    const pickerOpen = {summary: false, compare: true};
    let analysisView = null, analysisOutput = null, analysisSources = null, analysisReports = null;
    const analysisStates = new Map();
    let libraryRoom = null, chartDraw = null, analysisPreferenceError = savedAnalysis.error;
    let observedSource = null, observedSignature = '';
    let refreshCapacity = null, capacityCheckpoint = '';
    let detachDock = null, historyView = null, followControls = null, liveCapture = null, historyDiscovery = '';
    let currentArchiveIsReplay = isPlaybackCurrent(runtime.playback);
    const followers = {summary: createAnalysisFollower(), compare: createAnalysisFollower(), history: createAnalysisFollower()};
    try { currentArchive = captureSessionFile(); } catch (error) { /* Tools also work on directory pages. */ }
    const content = dialog.querySelector('#tools-content'), message = dialog.querySelector('#tools-message');
    const current = () => dialog.isConnected && dialog.open && origin === location.href && generation === runtime.initGuard;
    function tell(text, error = false) { message.textContent = text; message.style.color = error ? 'var(--panel-negative)' : 'var(--panel-positive)'; }
    function rememberAnalysis(patch) {
        const result = rememberAnalysisPreferences(patch);
        ({metric, threshold, sharedLength} = result.preferences);
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
    function action(fn) { return (...args) => { try { return fn(...args); } catch (error) { tell(error.message, true); } }; }
    function button(parent, text, fn, id) {
        const element = document.createElement('button'); element.type = 'button'; element.textContent = text;
        if (id) element.id = id; element.onclick = action(fn); parent.appendChild(element); return element;
    }
    function node(parent, tag, text, className) {
        const element = document.createElement(tag); if (text !== undefined) element.textContent = text;
        if (className) element.className = className; parent.appendChild(element); return element;
    }
    function chooseFile(maxBytes, accept, multiple = false) {
        const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json'; input.hidden = true; input.multiple = multiple;
        const request = ++fileRequest, playbackAtRequest = runtime.playback; dialog.appendChild(input);
        const stillSelected = () => current() && request === fileRequest && runtime.playback === playbackAtRequest;
        input.onchange = async () => {
            const files = Array.from(input.files || []); if (!files.length) { input.remove(); return; }
            try {
                if (files.length > (multiple ? LIBRARY_TRANSFER_MAX_COUNT : 1) || files.reduce((total, file) => total + file.size, 0) > maxBytes) throw new Error('Choose ' + (multiple ? 'up to 10,000 files' : 'one file') + ' totaling at most ' + Math.round(maxBytes / 1024 / 1024) + ' MB.');
                const values = [];
                for (const file of files) { values.push(await readDataFile(file, maxBytes)); if (!stillSelected()) return; }
                const value = multiple ? values : values[0];
                if (stillSelected()) accept(value);
            } catch (error) { if (stillSelected()) tell(error.message, true); }
            finally { input.remove(); }
        };
        input.addEventListener('cancel', () => input.remove(), { once: true }); input.click();
    }
    function readLibrary() {
        library = libraryReader.read(); options = []; optionsLibrary = null; optionsArchive = null;
        let migrationError = '';
        try { migrateRecordingFavorites(library.entries); } catch (error) { migrationError = 'Previous stars could not yet be saved as model favorites. Refresh to retry.'; }
        try {
            const models = readModelFavorites(library.entries);
            library.favoriteModels = models.favorites; library.automaticModels = models.automatic;
            library.favoriteError = migrationError || (models.errors.length ? 'Some model favorites could not be read. Refresh to retry; sessions remain available.' : '');
        } catch (error) { library.favoriteModels = new Set(); library.favoriteError = 'Model favorites could not be read. Refresh to retry; sessions remain available.'; }
        library.entries = library.entries.map(entry => ({...entry, modelFavorite: library.favoriteModels.has(entry.archive.room.toLowerCase()), autoKeep: library.automaticModels?.has(entry.archive.room.toLowerCase()) || false}));
        for (const follower of Object.values(followers)) {
            const aliases = follower.reconcile(library.entries), remap = id => aliases.get(id) || id;
            selectedA = remap(selectedA); selectedB = remap(selectedB); selectedExtra = selectedExtra.map(remap); historySelected = remap(historySelected);
            if (summaryThresholdSource) summaryThresholdSource.id = remap(summaryThresholdSource.id);
            for (const saved of analysisStates.values()) saved.ids = saved.ids.map(remap);
        }
        noteDrafts.reconcile(library.entries); updateDraftNotice();
        return library;
    }
    function updateDraftNotice() {
        syncDraftWarning();
        const notice = dialog.querySelector('#tools-review-notes');
        notice.hidden = !noteDrafts.size;
        notice.textContent = noteDrafts.size + ' unsaved ' + (noteDrafts.size === 1 ? 'note' : 'notes') + ' · Review';
    }
    const noteActions = {
        note: entry => noteDrafts.read(entry),
        editNote: (entry, value) => { noteDrafts.edit(entry, value); updateDraftNotice(); },
        discardNote: entry => { noteDrafts.discard(noteDrafts.read(entry).id); updateDraftNotice(); render(tab); },
        saveNote: action(entry => {
            const draft = noteDrafts.read(entry);
            if (!draft.dirty) return;
            const fresh = libraryReader.read();
            const latest = fresh.entries.find(item => item.id === draft.id || draft.lineage && item.lineage === draft.lineage || item.records.some(record => record.key === LIBRARY_PREFIX + draft.id));
            if (!latest) throw new Error('This session changed or is unavailable. Your draft is kept in Review unsaved notes.');
            if ((latest.notes || '') !== draft.base && latest.notes !== draft.value &&
                !confirm('Saved notes for this session changed in another tab. Replace them with your draft?')) return;
            updateLibraryMetadata(latest.id, {notes: draft.value});
            noteDrafts.discard(draft.id); updateDraftNotice(); render(tab); tell('Session notes saved.');
        })
    };
    function renderDrafts() {
        const state = readLibrary();
        button(content, '‹ Sessions', () => render('library'), 'tools-drafts-back');
        node(content, 'h3', 'Unsaved notes');
        node(content, 'p', 'Drafts stay in this tab when Library closes. Save them before refreshing or leaving the site.', 'tools-muted');
        if (!noteDrafts.size) node(content, 'p', 'All notes are saved or discarded.', 'tools-muted');
        for (const draft of noteDrafts.list()) {
            const entry = state.entries.find(entry => entry.id === draft.id);
            const card = node(content, 'section', undefined, 'tools-row');
            node(card, 'strong', draft.title); node(card, 'p', draft.room + ' · ' + new Date(draft.time).toLocaleString(), 'tools-muted');
            renderRecordingNotes(card, entry || {id: draft.id, title: draft.title, notes: draft.base,
                archive: {room: draft.room, session: {history: {timestamps: [draft.time]}}}}, noteActions, !entry);
        }
    }
    function sourceOptions() {
        if (optionsLibrary === library && optionsArchive === currentArchive && optionsLiveArchive === liveComparisonArchive) return followers[tab] ? followers[tab].project(options) : options;
        const items = [];
        if (liveComparisonArchive) items.push({id: 'live', title: 'Live snapshot — ' + liveComparisonArchive.room, archive: liveComparisonArchive});
        if (currentArchive) items.push({ id: 'current', title: 'Current / replayed snapshot — ' + currentArchive.room, archive: currentArchive });
        for (const entry of library.entries) {
            const title = entry.title && entry.title.trim().toLowerCase() !== entry.archive.room.toLowerCase() ? ' — ' + entry.title : '';
            items.push({...entry, title: entry.archive.room + title + ' — ' + new Date(entry.archive.session.history.timestamps[0]).toLocaleString()});
        }
        optionsLibrary = library; optionsArchive = currentArchive; optionsLiveArchive = liveComparisonArchive; options = items;
        return followers[tab] ? followers[tab].project(options) : options;
    }
    function selectSource(parent, label, id, selected, changed) {
        const wrapper = node(parent, 'label', label), select = node(wrapper, 'select'); select.id = id;
        const matches = filteredSources || sourceOptions(), choices = matches.slice();
        const retained = sourceOptions().find(item => item.id === selected);
        if (retained && !choices.some(item => item.id === selected)) choices.unshift({...retained, title: retained.title + ' (selected; outside filters)'});
        if (selected && selected !== 'current' && selected !== 'live' && !retained) choices.unshift({id: selected, title: 'Session changed or removed — choose another'});
        for (const item of choices) { const option = node(select, 'option', item.title); option.value = item.id; }
        if (choices.some(item => item.id === selected)) select.value = selected;
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
    function followContext() {
        const room = getModelName(), history = runtime.history;
        const identity = room + ':' + runtime.sessionStartedAt + ':' + runtime.activeRoomEpoch;
        if (!current() || room === 'unknown' || location.href !== runtime.lastUrl || runtime.activeSessionStorageKey !== getStorageKey(room) || !history.timestamps.length) {
            return {identity, reason: 'Waiting for a live session in this room.'};
        }
        try {
            if (!readModelFavorite(room).autoKeep) return {identity, reason: 'Confirm this model as a favorite to follow their live session.'};
        } catch (error) { return {identity, reason: 'Favorite setting unavailable; this view is frozen.'}; }
        return {identity, room, signature: [identity, history.timestamps[0], history.timestamps.at(-1), history.timestamps.length, runtime.isPaused, runtime.isStopped, runtime.stoppedAt].join(':')};
    }
    function followedEntries() {
        return followers.history.project(library.entries);
    }
    function updateFollowing() {
        const follower = followers[tab];
        if (!follower) return false;
        const context = followContext();
        let reason = context.reason || '', changed = false, candidates = [];
        if (!follower.check(context.identity)) reason = 'Session changed. Choose or refresh a session to follow the new session.';
        if (reason && follower.identity) follower.toggle(false);
        if (!reason) {
            if (tab === 'history' && follower.enabled && !follower.identity) {
                const saved = automaticLibraryStatus(context.room).savedAt;
                if (saved && historyDiscovery !== String(saved)) { historyDiscovery = String(saved); readLibrary(); }
            }
            const items = tab === 'history' ? followedEntries() : sourceOptions().filter(item =>
                (tab === 'summary' ? [selectedA] : [selectedA, selectedB, ...selectedExtra]).includes(item.id));
            candidates = items.filter(item => !(item.id === 'current' && currentArchiveIsReplay) &&
                item.archive.room.toLowerCase() === context.room.toLowerCase() &&
                item.archive.session.sessionStartedAt === runtime.sessionStartedAt &&
                (tab !== 'history' || libraryRoom === context.room.toLowerCase()));
            if (!candidates.length) reason = 'Choose this favorite model’s current live session to follow new scans.';
            if (candidates.length && follower.enabled) {
                if (!liveCapture || liveCapture.signature !== context.signature || liveCapture.source !== runtime.history) {
                    liveCapture = {signature: context.signature, source: runtime.history, archive: freezeRecordingData(captureLiveSessionFile())};
                }
                candidates = candidates.filter(item => {
                    if (item.archive === liveCapture.archive || follower.identity === context.identity && follower.get(item.id)?.archive === item.archive) return true;
                    const order = compareLibrarySessions(item.archive, liveCapture.archive);
                    return order === 0 || order === 1;
                });
                if (!candidates.length) reason = 'This session differs from the live session. Its snapshot is kept.';
                else changed = follower.update(context.identity, context.signature, candidates, liveCapture.archive);
            }
        }
        if (followControls) {
            const {check, status} = followControls;
            check.disabled = !!reason;
            check.checked = follower.enabled && !reason;
            status.textContent = reason || (!follower.enabled ? 'Frozen for inspection. Turn on to catch up.' :
                (runtime.isStopped ? 'Stopped' : runtime.isPaused ? 'Paused' : 'Following live') +
                ' · latest sample ' + new Date(runtime.history.timestamps.at(-1)).toLocaleTimeString() +
                (automaticLibraryStatus(context.room).error ? ' · Library save pending; showing live data.' : '') +
                (tab === 'compare' && compareAxis === 'elapsed' && sharedLength ? ' · Match shared length limits the chart to the shortest session.' : ''));
        }
        return changed;
    }
    function followControl(parent) {
        const row = node(parent, 'div', undefined, 'tools-actions tools-follow');
        const check = checkbox(row, 'tools-follow-live', 'Follow live');
        const status = node(row, 'span', '', 'tools-muted'); status.id = 'tools-follow-status';
        check.setAttribute('aria-describedby', status.id);
        followControls = {check, status};
        check.onchange = action(() => {
            followers[tab].toggle(check.checked);
            const changed = updateFollowing();
            if (changed) refreshFollowedView();
        });
        updateFollowing();
    }
    function refreshFollowedView() {
        const scrollTop = content.scrollTop;
        if (tab === 'history' && historyView) historyView.update(modelHistoryReader.read(followedEntries(), libraryRoom, metric, historyLimit), historySelected);
        else if (tab === 'history') render('history');
        else if ((tab === 'summary' || tab === 'compare') && analysisOutput) refreshAnalysis(true, true);
        content.scrollTop = scrollTop;
    }
    function selectNewFollowSource() {
        if (followers[tab]) followers[tab].reset();
    }
    function refreshCurrent() {
        if (followers[tab] && updateFollowing()) refreshFollowedView();
        const checkpoint = automaticLibraryStatus(getModelName());
        const checkpointSignature = [checkpoint.identity, checkpoint.signature, checkpoint.savedAt, checkpoint.error].join(':');
        if (refreshCapacity && capacityCheckpoint !== checkpointSignature) {
            capacityCheckpoint = checkpointSignature;
            try { refreshCapacity(libraryReader.read(), readLibraryLimits(), ''); }
            catch (error) { refreshCapacity(library, null, error.message); }
        }
        const playback = isPlaybackCurrent(runtime.playback) ? runtime.playback : null;
        const source = playback ? playback.archive : runtime.history;
        const history = playback ? source.session.history : runtime.history;
        const room = playback ? source.room : getModelName();
        const available = history.timestamps.length > 0 && (playback || runtime.activeSessionStorageKey === getStorageKey(room) && runtime.lastUrl === location.href);
        const signature = [room, !!playback, history.timestamps.length, history.timestamps.at(-1), runtime.isPaused, runtime.isStopped].join(':');
        if (source === observedSource && signature === observedSignature) { refreshCards(); return; }
        const replaced = source !== observedSource, firstCapture = !currentArchive && available;
        observedSource = source; observedSignature = signature;
        if (replaced || !currentArchive) {
            const replayChanged = !!playback !== currentArchiveIsReplay;
            // A live Reset freezes a followed analysis. Entering/leaving Replay
            // still chooses that explicit source, which never follows live scans.
            if (!followers[tab]?.identity || replayChanged || playback) {
                currentArchiveIsReplay = !!playback;
                try { currentArchive = captureSessionFile(); } catch (error) { currentArchive = null; }
                if (replayChanged || playback) for (const follower of Object.values(followers)) follower.forget('current');
            }
        }
        refreshCards();
        if ((replaced || firstCapture) && (tab === 'summary' && selectedA === 'current' || tab === 'compare' && [selectedA, selectedB, ...selectedExtra].includes('current'))) render(tab);
    }
    function favoriteAction(room, enableOnly = false) {
        if (!changeModelFavorite(room, enableOnly)) return;
        const state = readModelFavorite(room);
        document.querySelectorAll('[data-favorite-room]').forEach(button => {
            if (button.dataset.favoriteRoom === room) paintFavoriteButton(button, room, state);
        });
        render('library');
        const pending = automaticLibraryStatus(room).error;
        tell(pending ? 'Favorite saved; Library save pending. ' + pending :
            state.autoKeep ? 'Favorite saved. Automatic keeping is on for ' + room + '.' : 'Favorite removed. Kept sessions remain in Library.', !!pending);
    }
    function refreshCards() {
        for (const replay of [false, true]) {
            const suffix = replay ? '-replay' : '', card = dialog.querySelector('#tools-current-card' + suffix);
            if (!card) continue;
            const playback = isPlaybackCurrent(runtime.playback) ? runtime.playback : null;
            card.hidden = replay && !playback;
            if (card.hidden) continue;
            const room = replay ? playback.archive.room : getModelName();
            const history = replay ? playback.archive.session.history : runtime.history;
            const available = !!history.timestamps.length && (replay || runtime.activeSessionStorageKey === getStorageKey(room) && runtime.lastUrl === location.href);
            card.querySelector('[data-card-kind]').textContent = replay ? (playback.imported ? 'File / Library Replay' : 'Replay Snapshot') : 'Current Live Session';
            card.querySelector('[data-card-room]').textContent = room === 'unknown' ? 'Open a model’s room' : room;
            card.querySelector('[data-card-meta]').textContent = (replay ? '' : runtime.isStopped ? 'Stopped · ' : runtime.isPaused ? 'Paused · ' : '') +
                (available ? history.timestamps.length.toLocaleString() + ' samples · ' + new Date(history.timestamps[0]).toLocaleString() : 'Waiting for the first recorded sample.');
            card.querySelectorAll('[data-current-action]').forEach(button => {
                button.dataset.currentAvailable = String(available);
                button.disabled = !available || button.dataset.gif === 'true' && !!runtime.gifExportJob;
            });
            const star = card.querySelector('[data-card-star]'), info = card.querySelector('[data-card-auto]');
            let preference = {favorite: false, autoKeep: false};
            try { if (room !== 'unknown') preference = readModelFavorite(room); }
            catch (error) { preference.error = 'Favorites unavailable. Refresh to retry.'; }
            paintFavoriteButton(star, room, preference);
            const status = automaticLibraryStatus(room);
            info.textContent = replay ? 'Replay is a snapshot. Keep it explicitly to add or update it in Library.' :
                preference.error || (status.error ? 'Automatic keep pending: ' + status.error :
                preference.autoKeep ? status.waiting ? 'Automatic keeping requires ' + status.minimumMinutes + ' minutes of recorded coverage · ' + formatElapsedTime(status.coveredMs) + ' recorded.' : status.savedAt ? 'Automatically kept at ' + new Date(status.savedAt).toLocaleTimeString() + '. Updates as you record.' :
                    'Automatic keeping on · waiting for a recorded sample.' : preference.favorite ? 'Favorite · automatic keeping is off until you confirm.' : 'Favorite this model to automatically keep their live sessions.');
            info.style.color = !replay && status.error ? 'var(--panel-warning)' : 'var(--panel-muted)';
            const automatic = card.querySelector('#tools-auto-keep');
            if (automatic) {
                automatic.checked = preference.autoKeep;
                automatic.disabled = preference.autoKeep || room === 'unknown' || !!preference.error;
                automatic.parentElement.dataset.locked = String(preference.autoKeep);
                automatic.parentElement.title = preference.error || (preference.autoKeep ?
                    'Automatic keeping is on for this favorite. Remove the star to turn it off; kept sessions stay in Library.' :
                    'Favorite this model and confirm to automatically keep their live sessions.');
                automatic.parentElement.querySelector('[data-auto-lock]').hidden = !preference.autoKeep;
            }
            const compare = card.querySelector('#tools-compare-previous');
            if (compare) {
                const previous = available ? previousModelSessionIds(library?.entries || [], {room, session: {
                    sessionStartedAt: runtime.sessionStartedAt, history: {timestamps: history.timestamps}}}) : [];
                compare.disabled = !available || !previous.length;
                compare.title = !available ? 'Record a sample first.' : previous.length ?
                    'Compare this live snapshot with ' + previous.length + ' earlier saved session(s) for ' + room + '.' :
                    'Keep an earlier session for this model to compare with.';
            }
            const retry = card.querySelector('[data-card-retry]'); retry.hidden = replay || !status.error;
            const historyButton = card.querySelector('[data-card-history]');
            historyButton.disabled = room === 'unknown'; historyButton.parentElement.hidden = room === 'unknown';
            const count = library?.entries.filter(entry => entry.archive.room.toLowerCase() === room.toLowerCase()).length || 0;
            historyButton.textContent = 'History · ' + count;
            historyButton.title = count + ' saved sessions for ' + room;
        }
    }
    function currentCard(replay = false) {
        const suffix = replay ? '-replay' : '';
        const card = node(content, 'section', undefined, 'tools-current'); card.id = 'tools-current-card' + suffix;
        card.setAttribute('aria-label', replay ? 'Replayed session' : 'Current Live Session');
        const kind = node(card, 'div', '', 'tools-eyebrow'); kind.id = 'tools-current-kind' + suffix; kind.dataset.cardKind = '';
        const name = node(card, 'div', undefined, 'tools-model-name');
        const title = node(name, 'strong', ''); title.id = 'tools-current-room' + suffix; title.dataset.cardRoom = '';
        const star = button(name, '☆', () => favoriteAction(star.dataset.favoriteRoom), 'tools-current-favorite' + suffix); star.dataset.cardStar = '';
        const meta = node(card, 'div', '', 'tools-muted'); meta.id = 'tools-current-meta' + suffix; meta.dataset.cardMeta = '';
        const capture = replay ? () => {
            if (!isPlaybackCurrent(runtime.playback)) throw new Error('Replay has closed.');
            return runtime.playback.archive;
        } : () => captureLiveSessionFile();
        const actions = node(card, 'div', undefined, 'tools-actions');
        function currentButton(parent, text, fn, id) {
            const control = button(parent, text, () => fn(capture()), id + suffix); control.dataset.currentAction = 'true'; return control;
        }
        currentButton(actions, 'Keep in Library', archive => {
            const result = keepSessionInLibrary(archive); libraryRoom = archive.room.toLowerCase();
            Object.assign(libraryFilters, {room: libraryRoom, query: '', from: '', to: '', favorites: false});
            render('library', true); tell(result.added ? 'Session kept in the library.' : result.updated ? 'Library session updated; its name and notes were preserved.' : 'An equal or fuller session is already in the library.');
        }, 'tools-keep').className = 'tools-history-keep';
        if (replay) currentButton(actions, 'Save file', archive => downloadDataFile(archive, archiveName(archive)), 'tools-save-session');
        else {
            const label = node(actions, 'label', undefined, 'tools-auto-keep'), check = node(label, 'input');
            check.type = 'checkbox'; check.id = 'tools-auto-keep';
            node(label, 'span', 'Auto');
            const lock = node(label, 'span', '🔒'); lock.dataset.autoLock = ''; lock.setAttribute('aria-hidden', 'true');
            check.onchange = action(() => {
                const room = star.dataset.favoriteRoom;
                try { refreshCards(); if (!readModelFavorite(room).autoKeep) favoriteAction(room, true); }
                finally { refreshCards(); }
            });
        }
        const shortcuts = node(replay ? actions : card, replay ? 'span' : 'div', undefined, replay ? 'tools-history-shortcut' : 'tools-actions tools-history-shortcut');
        shortcuts.id = 'tools-room-shortcuts' + suffix;
        if (!replay) button(shortcuts, 'Compare with previous', compareLiveWithPrevious, 'tools-compare-previous').className = 'tools-primary';
        const history = button(shortcuts, 'History · 0', () => openHistory(star.dataset.favoriteRoom.toLowerCase()), 'tools-room-history' + suffix);
        history.dataset.cardHistory = '';
        if (replay) {
            const exports = node(card, 'div', undefined, 'tools-actions tools-exports');
            node(exports, 'span', 'Download', 'tools-muted');
            currentButton(exports, 'TXT', archive => downloadRecording(archive, 'txt'), 'tools-export-txt').title = 'Download a text report for this session';
            currentButton(exports, 'CSV', archive => downloadRecording(archive, 'csv'), 'tools-export-csv').title = 'Download every retained sample with its real timestamp';
            const gif = currentButton(exports, 'GIF', archive => generateGifFromHistory(archive), 'btn-export-gif'); gif.dataset.gif = 'true';
            currentButton(exports, 'Add to ATH', addArchiveHighs, 'tools-add-all-time').title = 'Add this session’s highs to all-time highs';
        }
        const automatic = node(card, 'div', '', 'tools-muted'); automatic.dataset.cardAuto = ''; automatic.setAttribute('role', 'status');
        const retry = button(card, 'Retry keeping', () => { keepFavoriteSession(star.dataset.favoriteRoom, true); render('library'); }, 'tools-retry-automatic' + suffix); retry.dataset.cardRetry = '';
        if (!replay) {
            const status = node(card, 'div', '', 'tools-muted'); status.id = 'session-save-info'; status.setAttribute('role', 'status');
        }
    }
    function compareLiveWithPrevious() {
        const snapshot = captureLiveSessionFile();
        const state = readLibrary(), ids = previousModelSessionIds(state.entries, snapshot);
        if (!ids.length) { refreshCards(); tell('No earlier saved sessions for ' + snapshot.room + '. Keep a session in Library to compare with a later one.'); return; }
        liveComparisonArchive = snapshot; followers.compare.reset();
        selectedA = 'live'; selectedB = ids[0]; selectedExtra = ids.slice(1);
        Object.assign(analysisFilters, {room: snapshot.room.toLowerCase(), query: '', from: '', to: ''});
        pickerOpen.compare = false; render('compare');
        (dialog.querySelector('#tools-analysis-chart') || dialog.querySelector('#tools-session-picker > summary'))?.focus();
    }
    function openHistory(room) {
        readLibrary();
        libraryRoom = room; render('history'); dialog.querySelector('#tools-history-back').focus();
    }
    function renderLibrary() {
        const state = readLibrary();
        currentCard(); currentCard(true); observedSignature = ''; refreshCurrent(); updateSessionToolsStatus();
        let limits = null, capacityError = '';
        try { limits = readLibraryLimits(); } catch (error) { capacityError = error.message; }
        const checkpoint = automaticLibraryStatus(getModelName());
        capacityCheckpoint = [checkpoint.identity, checkpoint.signature, checkpoint.savedAt, checkpoint.error].join(':');
        refreshCapacity = renderLibraryCapacity(content, state, limits, capacityError, value => {
            saveLibraryLimits(value); render('library'); tell('Storage limits saved for this browser. Existing sessions were kept.');
            dialog.querySelector('#tools-storage-settings > summary').focus();
        });
        let automaticMinutes = null, automaticError = '';
        try { automaticMinutes = readAutomaticKeepingMinutes(); } catch (error) { automaticError = error.message; }
        renderAutomaticKeepingSettings(dialog.querySelector('#tools-storage-settings'), automaticMinutes, automaticError, value => {
            saveAutomaticKeepingMinutes(value); keepFavoriteSession(getModelName(), true);
            render('library'); tell('Automatic keeping minimum saved for this browser. Existing sessions were kept.');
            dialog.querySelector('#tools-storage-settings > summary').focus();
        });
        if (state.favoriteError) node(content, 'p', state.favoriteError, 'tools-muted');
        libraryFilters.room = libraryRoom || '';
        if (libraryRoom && libraryRoom !== '*' && !state.entries.some(entry => entry.archive.room.toLowerCase() === libraryRoom)) libraryFilters.room = libraryRoom = '';
        const callbacks = {
            cardSummary: entries => modelCardReader.read(entries),
            duration: formatElapsedTime,
            room: room => { libraryRoom = room; },
            history: openHistory,
            compare: ids => { selectedA = ids[0]; selectedB = ids[1]; selectedExtra = ids.slice(2); Object.assign(analysisFilters, {room: '', query: '', from: '', to: ''}); render('compare'); },
            export: ids => { downloadDataFile(exportLibrarySelection(ids, runtime.TIERSCOPE_VERSION), 'TierScope-library-selection-' + new Date().toISOString().slice(0, 10) + '.json'); tell('Selected sessions exported, including titles, notes and favorite models.'); },
            favoriteModel: room => {
                if (state.favoriteError) throw new Error('Model favorites are not fully available. Refresh before changing them.');
                favoriteAction(room);
            },
            enableAutomatic: room => favoriteAction(room, true),
            replay: entry => { openSessionReplay(entry.archive); observedSignature = ''; refreshCurrent(); tell('Replaying ' + (entry.title || entry.archive.room) + '.'); },
            summary: entry => { selectedA = entry.id; render('summary'); },
            save: entry => downloadDataFile(entry.archive, archiveName(entry.archive)),
            txt: entry => downloadRecording(entry.archive, 'txt'), csv: entry => downloadRecording(entry.archive, 'csv'), gif: entry => generateGifFromHistory(entry.archive),
            highs: entry => addArchiveHighs(entry.archive),
            ...noteActions,
            rename: entry => { const title = window.prompt('Session title (up to 80 characters):', entry.title); if (title !== null) { renameLibrarySession(entry.id, title); render('library'); } },
            delete: entry => { if (confirm('Delete this library session: ' + (entry.title || entry.archive.room) + '?\n\nLive tracking, ATH and downloaded files are unchanged.')) { removeLibrarySession(entry.id); render('library'); tell('Library session deleted.'); } }
        };
        renderLibraryBrowser(content, state.entries, libraryFilters, librarySelection, Object.fromEntries(Object.entries(callbacks).map(([key, fn]) => [key, action(fn)])), libraryDisclosures);
        if (state.damaged.length) {
            node(content, 'p', state.damaged.length + ' unreadable library record(s) were retained.', 'tools-muted');
            if (state.unavailable.length) node(content, 'p', 'Some records could not be read. The displayed storage size excludes them; saving new sessions waits until they can be read.', 'tools-muted');
            button(content, 'Download unreadable records', downloadUnreadableRecords, 'tools-recovery-download');
            button(content, 'Remove unreadable library records…', () => {
                if (!confirm('Delete the ' + state.damaged.length + ' unreadable library record(s)? This cannot be undone.')) return;
                for (const key of state.damaged) removeLibrarySession(key.slice(LIBRARY_PREFIX.length));
                render('library');
            });
        }
        const actions = node(content, 'div', undefined, 'tools-actions tools-library-management'); actions.id = 'tools-library-management';
        button(actions, 'Open saved file…', () => chooseFile(runtime.SESSION_FILE_MAX_BYTES, value => {
            openSessionReplay(validateSessionFile(value)); observedSignature = ''; refreshCurrent();
            tell('File opened in replay. Use Keep in library to store it here.');
        }), 'tools-open-session');
        button(actions, 'Import to library…', () => chooseFile(BACKUP_MAX_BYTES, values => {
            const bundle = libraryImportBundle(values, runtime.TIERSCOPE_VERSION), result = importLibraryBundle(bundle);
            const rooms = new Set(bundle.library.map(entry => entry.archive.room.toLowerCase()));
            libraryRoom = rooms.size === 1 ? [...rooms][0] : '*';
            Object.assign(libraryFilters, {room: libraryRoom, query: '', from: '', to: '', favorites: false});
            render('library', true); tell('Imported: ' + result.recordings + ' new, ' + result.updatedRecordings + ' updated, ' + result.favoriteModels + ' favorite models added; existing sessions and model choices were preserved.');
        }, true), 'tools-import-session').title = 'Import session files or Library bundles. Imported favorites need confirmation before automatic keeping.';
        button(actions, 'Refresh', () => render('library'), 'tools-refresh-library').title = 'Refresh list from this browser';
    }
    function metricStrip(parent, changed, id = 'tools-metric') {
        const rowKeys = {room: 'roomTotal', withTokens: 'withtokens', anonymous: 'anon'};
        const choices = Object.entries(ANALYSIS_METRICS).map(([key, label]) => {
            const row = runtime.PANEL_ROWS.find(row => row.key === (rowKeys[key] || key));
            return {key, label, icon: row.icon || (key === 'female-trans' ? '♀⚧' : ''),
                color: key === 'total' ? 'var(--panel-secondary)' : row.color};
        });
        return renderMetricStrip(parent, choices, metric, action(value => { rememberAnalysis({metric: value}); changed(); }), id);
    }
    function comparisonAxis(parent) {
        const controls = node(parent, 'div', undefined, 'tools-actions');
        const label = node(controls, 'label', 'X axis '), select = node(label, 'select'); select.id = 'tools-compare-axis';
        for (const [value, text] of [['elapsed', 'Elapsed time'], ['clock', '24h time of day']]) {
            const option = node(select, 'option', text); option.value = value;
        }
        select.value = compareAxis;
        const hint = node(parent, 'p', '', 'tools-muted'); hint.id = 'tools-compare-axis-hint';
        select.setAttribute('aria-describedby', hint.id);
        select.onchange = () => { compareAxis = select.value; updateFollowing(); refreshAnalysis(); };
    }
    function syncComparisonAxis() {
        if (tab !== 'compare') return;
        const clock = compareAxis === 'clock', check = dialog.querySelector('#tools-shared-length');
        check.disabled = clock; check.checked = sharedLength;
        check.title = clock ? 'Match shared length applies to elapsed-time comparison.' : '';
        dialog.querySelector('#tools-compare-axis-hint').textContent = clock ?
            '24h uses your local time (' + Intl.DateTimeFormat().resolvedOptions().timeZone + '). Statistics use full sessions; Match shared length applies in elapsed mode.' : '';
    }
    function clearAnalysisChart() {
        if (!analysisView) return;
        const hadFocus = analysisView.element.contains(document.activeElement);
        analysisStates.set(tab, {...analysisSources, state: analysisView.capture()});
        const range = dialog.querySelector('#tools-comparison-range');
        if (range) content.insertBefore(range, analysisOutput);
        if (chartObserver) { chartObserver.disconnect(); chartObserver = null; }
        if (chartDispose) chartDispose();
        analysisView.element.remove(); analysisView = null; analysisSources = null; chartDraw = null; chartDispose = null;
        if (hadFocus) dialog.querySelector('#tools-compare-axis').focus({preventScroll: true});
    }
    function comparisonRange() {
        const controls = node(content, 'div', undefined, 'tools-comparison-range'); controls.id = 'tools-comparison-range';
        const label = node(controls, 'label'), check = node(label, 'input'); check.type = 'checkbox'; check.checked = sharedLength; check.id = 'tools-shared-length';
        node(label, 'span', 'Match shared length'); check.onchange = () => { rememberAnalysis({sharedLength: check.checked}); updateFollowing(); refreshAnalysis(); };
        return controls;
    }
    function thresholdSelection(parent, comparing) {
        const controls = node(parent, 'div', undefined, 'tools-actions'); controls.id = 'tools-threshold-controls';
        const thresholdLabel = node(controls, 'label', comparing ? 'Threshold ' : 'Thresholds '), input = node(thresholdLabel, 'input');
        input.id = 'tools-threshold'; input.style.width = comparing ? '105px' : '200px';
        if (comparing) {
            input.type = 'number'; input.min = '0'; input.max = '9007199254740991'; input.step = '1'; input.value = threshold;
        } else {
            input.type = 'text'; input.maxLength = 160; input.value = summaryThresholds.join(', '); input.placeholder = 'Not enough covered time';
            input.title = 'Defaults: session average −25%, average, +25%, rounded to whole viewers. Or enter up to 8 counts separated by commas for this session and metric.';
        }
        input.oninput = () => { thresholdDirty = true; input.setCustomValidity(''); };
        function applyThreshold() {
            try {
                if (comparing) {
                    if (!Number.isSafeInteger(input.valueAsNumber) || input.valueAsNumber < 0) throw new Error('Enter a non-negative whole number.');
                    rememberAnalysis({threshold: input.valueAsNumber});
                } else { summaryThresholds = parseAnalysisThresholds(input.value); summaryAutomatic = false; }
            } catch (error) { input.setCustomValidity(error.message); input.reportValidity(); return; }
            input.setCustomValidity(''); thresholdDirty = false;
            refreshAnalysis(false);
        }
        input.onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); applyThreshold(); } };
        button(controls, comparing ? 'Apply threshold' : 'Apply thresholds', applyThreshold, 'tools-apply-threshold');
        if (!comparing) button(controls, 'Use average', () => { summaryThresholdSource = null; summaryAutomatic = true; thresholdDirty = false; refreshAnalysis(false); }, 'tools-average-thresholds').title = 'Recalculate from this session: average −25%, average, +25%';
        return controls;
    }
    function analysisControls(comparing) {
        if (!library) readLibrary();
        if (!sourceOptions().length) { node(content, 'p', 'Record a session or import one into the library to see analysis.'); return null; }
        const pickerTab = comparing ? 'compare' : 'summary';
        const picker = node(content, 'details'); picker.id = 'tools-recording-picker'; picker.open = pickerOpen[pickerTab];
        node(picker, 'summary', 'Choose sessions & filters');
        picker.ontoggle = () => { if (picker.isConnected) pickerOpen[pickerTab] = picker.open; };
        recordingFilters(picker, sourceOptions(), analysisFilters, 'tools-analysis', () => render(tab));
        try { filteredSources = filterLibraryEntries(sourceOptions(), analysisFilters); }
        catch (error) { filteredSources = []; tell(error.message, true); }
        node(picker, 'p', filteredSources.length + ' matching sessions. Existing selections stay available when outside the filters.', 'tools-muted');
        const sourceControls = node(picker, 'div', undefined, 'tools-actions');
        if (liveComparisonArchive) button(sourceControls, 'Refresh live snapshot', () => { liveComparisonArchive = captureLiveSessionFile(); selectNewFollowSource(); render(tab); }, 'tools-refresh-live-snapshot');
        if (currentArchive) button(sourceControls, 'Refresh current / replayed snapshot', () => { currentArchive = captureSessionFile(); currentArchiveIsReplay = isPlaybackCurrent(runtime.playback); selectNewFollowSource(); render(tab); }, 'tools-refresh-snapshot');
        selectedA = selectSource(sourceControls, comparing ? 'A ' : 'Session ', 'tools-source-a', selectedA, value => { selectedA = value; selectNewFollowSource(); render(tab); });
        if (comparing) {
            if (!selectedB) selectedB = (sourceOptions().find(item => item.id !== selectedA) || sourceOptions()[0]).id;
            selectedB = selectSource(sourceControls, 'B ', 'tools-source-b', selectedB, value => { selectedB = value; selectNewFollowSource(); render(tab); });
            selectedExtra.forEach((id, index) => {
                selectedExtra[index] = selectSource(sourceControls, String.fromCharCode(67 + index) + ' ', 'tools-source-' + String.fromCharCode(99 + index), id, value => { selectedExtra[index] = value; selectNewFollowSource(); render(tab); });
                button(sourceControls, 'Remove ' + String.fromCharCode(67 + index), () => { selectedExtra.splice(index, 1); render(tab); });
            });
            const used = new Set([selectedA, selectedB, ...selectedExtra]);
            const next = filteredSources.find(item => !used.has(item.id));
            button(sourceControls, 'Add session', () => { if (next && selectedExtra.length < 4) { selectedExtra.push(next.id); render(tab); } }, 'tools-compare-add').disabled = selectedExtra.length >= 4 || !next;
            node(sourceControls, 'span', (2 + selectedExtra.length) + ' / 6 slots', 'tools-muted');

        }
        followControl(content);
        if (comparing) comparisonAxis(content);
        metricStrip(content, refreshAnalysis);
        return sourceOptions();
    }
    const number = value => value === null ? 'Not enough data' : value.toLocaleString(undefined, { maximumFractionDigits: 1 });
    const percent = value => value === null ? 'Not enough data' : number(value) + '%';
    function renderHistory() {
        if (!library) readLibrary();
        const heading = node(content, 'div', undefined, 'tools-actions');
        button(heading, '‹ Sessions', () => {
            render('library', true); (dialog.querySelector('#tools-model-history') || dialog.querySelector('#tools-sessions-book-toggle')).focus();
        }, 'tools-history-back');
        node(heading, 'h3', 'Model history · ' + libraryRoom);
        const controls = node(content, 'div', undefined, 'tools-actions');
        const rangeLabel = node(controls, 'label', 'Show '), range = node(rangeLabel, 'select'); range.id = 'tools-history-range';
        for (const [value, label] of [['Infinity', 'All sessions'], ['30', 'Latest 30'], ['10', 'Latest 10']]) {
            const option = node(range, 'option', label); option.value = value;
        }
        range.value = String(historyLimit); range.onchange = () => { historyLimit = Number(range.value); render('history'); };
        button(controls, 'Refresh', () => { readLibrary(); followers.history.reset(); render('history'); }, 'tools-history-refresh').title = 'Read the latest saved sessions from this browser';
        followControl(content);
        const overview = modelHistoryReader.read(followedEntries(), libraryRoom, metric, historyLimit);
        const view = renderModelHistoryView(content, overview, {
            metricLabel: ANALYSIS_METRICS[metric], duration: formatElapsedTime,
            selected: historySelected, select: id => { historySelected = id; },
            summary: action(id => { selectedA = id; render('summary'); }),
            replay: action(id => {
                const entry = followedEntries().find(entry => entry.id === id);
                openSessionReplay(entry.archive); observedSignature = ''; refreshCurrent(); tell('Replaying ' + (entry.title || entry.archive.room) + '.');
            }),
            metricControl: parent => metricStrip(parent, () => render('history'), 'tools-history-metric'),
            compare: ids => {
                [selectedA, selectedB] = ids; selectedExtra = ids.slice(2);
                Object.assign(analysisFilters, {room: libraryRoom, query: '', from: '', to: ''});
                pickerOpen.compare = false; render('compare');
                (dialog.querySelector('#tools-analysis-chart') || dialog.querySelector('#tools-session-picker > summary'))?.focus();
            }
        });
        historyView = view;
        if (view) {
            chartDraw = view.draw;
            if (window.ResizeObserver) { chartObserver = new window.ResizeObserver(view.draw); chartObserver.observe(view.canvas); }
        }
        if (library.damaged.length) node(content, 'p', library.damaged.length + ' unreadable library record(s) are excluded. Return to Sessions for recovery options.', 'tools-muted');
    }
    function audienceOverview(archive, parent) {
        const overview = summarizeAudience(archive), coverage = overview.audience[0];
        node(parent, 'h3', 'Audience overview');
        node(parent, 'p', archive.room + ' · ' + coverage.samples + ' samples · Covered time ' + formatElapsedTime(coverage.coveredMs) +
            ' · Excluded gaps ' + formatElapsedTime(coverage.gapMs) + ' · Coverage ' + percent(coverage.coverage), 'tools-muted');
        const scroll = node(parent, 'div', undefined, 'tools-scroll'), table = node(scroll, 'table'); table.id = 'tools-audience-table';
        node(table, 'caption', 'Audience across the retained session');
        const head = node(node(table, 'thead'), 'tr');
        ['Audience', 'Time-weighted average', 'Peak in session', 'Full-session high'].forEach(label => { node(head, 'th', label).scope = 'col'; });
        const body = node(table, 'tbody');
        for (const summary of overview.audience) {
            const row = node(body, 'tr'); node(row, 'th', ANALYSIS_METRICS[summary.metric]).scope = 'row';
            node(row, 'td', number(summary.mean));
            const peak = node(row, 'td', number(summary.peak));
            if (summary.peakTime !== null) peak.title = 'First recorded at ' + new Date(summary.peakTime).toLocaleString();
            node(row, 'td', number(summary.sessionPeak));
        }
        node(parent, 'p', 'Room audience = registered + anonymous viewers. A full-session high may predate retained history. Hover a session peak for its first recorded time.', 'tools-muted');
        const shares = node(parent, 'div'); shares.id = 'tools-audience-shares';
        node(shares, 'h3', 'Audience proportions');
        node(shares, 'p', 'Token holders / registered viewers: ' + percent(overview.tokenShareRegistered));
        node(shares, 'p', 'Token holders / whole room: ' + percent(overview.tokenShareRoom));
        node(shares, 'p', 'Anonymous / whole room: ' + percent(overview.anonymousShareRoom));
        node(shares, 'p', 'Shares use viewer-time over covered intervals. A crowded interval contributes more than a quiet interval of the same length; gaps contribute nothing.', 'tools-muted');
    }
    function thresholdTable(archive, parent) {
        if (!summaryThresholds.length) {
            node(parent, 'p', 'Not enough covered session time to calculate average-based thresholds.', 'tools-muted'); return;
        }
        const scroll = node(parent, 'div', undefined, 'tools-scroll'), table = node(scroll, 'table'); table.id = 'tools-threshold-table';
        node(table, 'caption', ANALYSIS_METRICS[metric] + ' — time at or above selected thresholds');
        const head = node(node(table, 'thead'), 'tr');
        ['Threshold', 'Time at or above', '% of covered time'].forEach(label => { node(head, 'th', label).scope = 'col'; });
        const body = node(table, 'tbody');
        for (const result of summarizeThresholds(archive, metric, summaryThresholds)) {
            const row = node(body, 'tr'); node(row, 'th', number(result.threshold)).scope = 'row';
            node(row, 'td', result.durationMs === null ? 'Not enough data' : formatElapsedTime(result.durationMs));
            node(row, 'td', percent(result.percent));
        }
        node(parent, 'p', 'Includes samples equal to the threshold. Percentages use covered session time; gaps and time after the final sample are excluded.', 'tools-muted');
    }
    function summaryTable(summaries, labels, comparing, parent) {
        const scroll = node(parent, 'div', undefined, 'tools-scroll'), table = node(scroll, 'table'); table.id = 'tools-summary-table';
        node(table, 'caption', ANALYSIS_METRICS[metric] + ' — retained session statistics');
        const head = node(table, 'thead'), headRow = node(head, 'tr'); node(headRow, 'th', 'Measure');
        labels.forEach(label => node(headRow, 'th', label));
        const body = node(table, 'tbody');
        const rows = [ ['Samples in range', s => number(s.samples)], ['Elapsed span', s => formatElapsedTime(s.spanMs)],
            ['Covered session time', s => formatElapsedTime(s.coveredMs)], ['Excluded gaps', s => formatElapsedTime(s.gapMs)],
            ['Coverage', s => s.coverage === null ? 'Not enough data' : number(s.coverage) + '%'],
            ['Time-weighted average', s => number(s.mean)], ['Peak in range', s => number(s.peak)],
            ['Full-session high', s => number(s.sessionPeak)], ['Token-holder share of registered viewers', s => s.tokenShare === null ? 'Not enough data' : number(s.tokenShare) + '%'] ];
        if (comparing) rows.push(['Time at or above ' + threshold.toLocaleString(), s => s.coveredMs ? formatElapsedTime(s.atOrAboveMs) : 'Not enough data']);
        for (const [label, value] of rows) {
            const row = node(body, 'tr'); const cell = node(row, 'th', label); cell.scope = 'row';
            summaries.forEach(summary => node(row, 'td', value(summary)));
        }
        node(parent, 'p', 'The full-session high can predate retained history and is not limited by “Match shared length.” Token-holder share is weighted by recorded registered-viewer time.', 'tools-muted');
    }
    function chart(archives, labels, endMs, ids) {
        const axisMode = tab === 'compare' ? compareAxis : 'elapsed';
        const series = archives.map(archive => {
            const source = {...analysisSeries(archive, metric), timestamps: archive.session.history.timestamps};
            return axisMode === 'clock' ? {...source, clock: projectClockSeries(source)} : source;
        });
        if (analysisView) { analysisSources = {archives, ids}; analysisView.update(series, endMs, ANALYSIS_METRICS[metric], axisMode); return; }
        const saved = analysisStates.get(tab);
        const same = saved && (saved.state.axisMode || 'elapsed') === axisMode && saved.ids.length === ids.length && ids.every((id, index) => saved.archives[saved.ids.indexOf(id)] === archives[index]);
        const restored = same ? {...saved.state, hidden: saved.state.hidden.map(index => ids.indexOf(saved.ids[index]))} : null;
        const view = renderAnalysisChart(content, series, labels, endMs, ANALYSIS_METRICS[metric], restored, axisMode);
        const range = dialog.querySelector('#tools-comparison-range');
        if (range) view.settings.appendChild(range);
        content.appendChild(analysisOutput);
        analysisView = view; analysisSources = {archives, ids};
        chartDraw = view.draw; chartDispose = view.dispose;
        if (window.ResizeObserver) { chartObserver = new window.ResizeObserver(view.draw); chartObserver.observe(view.canvas); }
    }
    function renderAnalysis(comparing) {
        const options = analysisControls(comparing); if (!options) return;
        if (comparing) comparisonRange();
        analysisOutput = node(content, 'div'); analysisOutput.id = 'tools-analysis-output';
        // Keep the controls attached while live reports change, so unfinished
        // threshold edits, keyboard focus and selection survive incoming scans.
        analysisReports = {overview: node(analysisOutput, 'div'), controls: thresholdSelection(analysisOutput, comparing), results: node(analysisOutput, 'div')};
        refreshAnalysis();
    }
    function refreshAnalysis(redrawChart = true, liveUpdate = false) {
        const comparing = tab === 'compare', options = sourceOptions();
        if (!analysisOutput) return;
        const {overview, controls, results} = analysisReports;
        syncComparisonAxis();
        overview.replaceChildren(); results.replaceChildren(); controls.hidden = false; message.textContent = '';
        const a = options.find(item => item.id === selectedA), b = options.find(item => item.id === selectedB);
        if (!a || comparing && (!b || selectedExtra.some(id => !options.some(item => item.id === id)))) {
            controls.hidden = true; node(overview, 'p', 'Choose available sessions in each slot. A previous selection may have changed or been removed; clear filters to find another session.'); return;
        }
        if (comparing) {
            if (new Set([selectedA, selectedB, ...selectedExtra]).size !== 2 + selectedExtra.length) { controls.hidden = true; node(overview, 'p', 'Choose a different session in each comparison slot.'); return; }
            const ids = [...new Set([selectedA, selectedB, ...selectedExtra])], recordings = ids.map(id => options.find(item => item.id === id)).filter(item => !!item);
            const archives = recordings.map(item => item.archive), clock = compareAxis === 'clock';
            const result = compareRecordingSet(archives, metric, threshold, !clock && sharedLength);
            const tooLong = clock ? archives.flatMap((archive, index) => clockSessionDuration(archive) > CLOCK_DAY_MS ? [String.fromCharCode(65 + index)] : []) : [];
            if (tooLong.length) {
                clearAnalysisChart();
                node(overview, 'p', '24h chart unavailable: session' + (tooLong.length > 1 ? 's ' : ' ') + tooLong.join(', ') +
                    ' exceed' + (tooLong.length === 1 ? 's' : '') + ' 24 hours. Choose Elapsed time or select shorter sessions.', 'tools-muted');
            } else if (redrawChart) chart(archives, recordings.map(item => item.title), clock ? CLOCK_DAY_MS : result.axisMs, ids);
            summaryTable(result.summaries, recordings.map((item, index) => String.fromCharCode(65 + index)), true, results);
        } else {
            const summary = summarizeSession(a.archive, metric, threshold);
            // A custom choice belongs to this displayed snapshot and metric only.
            // Never reuse another recording's thresholds or a global saved default.
            const continuing = liveUpdate && summaryThresholdSource?.id === a.id && summaryThresholdSource.metric === metric;
            if (!summaryThresholdSource || summaryThresholdSource.archive !== a.archive || summaryThresholdSource.id !== a.id || summaryThresholdSource.metric !== metric) {
                if (!continuing) { summaryAutomatic = true; thresholdDirty = false; }
                summaryThresholdSource = {archive: a.archive, id: a.id, metric};
                if (summaryAutomatic) summaryThresholds = averageAnalysisThresholds(summary.mean);
                const input = dialog.querySelector('#tools-threshold');
                if (!thresholdDirty) { input.value = summaryThresholds.join(', '); input.setCustomValidity(''); }
            }
            dialog.querySelector('#tools-average-thresholds').disabled = summary.mean === null;
            if (redrawChart) chart([a.archive], [a.title], summary.spanMs, [a.id]);
            audienceOverview(a.archive, overview); thresholdTable(a.archive, results);
            node(results, 'h3', ANALYSIS_METRICS[metric] + ' — details');
            summaryTable([summary], [a.archive.room], false, results);
        }
        if (analysisPreferenceError) tell(analysisPreferenceError, true);
    }
    function checkbox(parent, id, text, checked = true) {
        const label = node(parent, 'label'), input = node(label, 'input'); input.type = 'checkbox'; input.id = id; input.checked = checked; node(label, 'span', text); return input;
    }
    function renderBackup() {
        node(content, 'h3', 'Back up this browser');
        node(content, 'p', 'Download ATH for every room and your saved preferences: theme, panel size/position, collapsed rows, compact metric, chart window, SH/ATH mode and analysis choices. Keep this file somewhere safe. Session-only controls such as the scan interval are not saved preferences.', 'tools-muted');
        const include = checkbox(content, 'tools-backup-library', 'Include library sessions and favorite models');
        const state = readLibrary();
        let partial = null;
        if (state.damaged.length) {
            node(content, 'p', state.damaged.length + ' unreadable library record(s) are retained. You can back up healthy sessions and download the unreadable values separately for recovery.', 'tools-muted');
            partial = checkbox(content, 'tools-backup-partial', 'Back up healthy sessions; omit unreadable entries', false);
            button(content, 'Download unreadable records', downloadUnreadableRecords, 'tools-backup-recovery');
        }
        const actions = node(content, 'div', undefined, 'tools-actions');
        button(actions, 'Download backup', () => {
            const backup = createTierScopeBackup(include.checked, !!(partial && partial.checked));
            const omitted = backup.recovery ? backup.recovery.omittedLibraryKeys.length : 0;
            downloadDataFile(backup, 'TierScope-' + (omitted ? 'partial-backup-' : 'backup-') + new Date().toISOString().slice(0, 10) + '.json');
            tell(omitted ? 'Partial backup download requested: ' + backup.library.length + ' healthy sessions included; ' + omitted + ' unreadable entries omitted and left untouched. Download unreadable records separately for recovery.' :
                'Backup download requested. Check your browser downloads.', !!omitted);
        }, 'tools-backup-download');
        node(content, 'h3', 'Restore a backup');
        node(content, 'p', 'ATH is merged without lowering existing records. New library sessions are added; fuller versions of the same session update its entry and keep its name. Saved preferences take effect after refreshing your room tabs. Storage limits stay local to this browser; raise them in Sessions → Storage limits if the sessions need more room. Backups up to 300 MB / 10,000 sessions can be opened.', 'tools-muted');
        button(content, 'Choose backup…', () => {
            pendingBackup = null; render('backup');
            chooseFile(BACKUP_MAX_BYTES, value => {
                pendingBackup = validateTierScopeBackup(value); render('backup'); tell('Backup validated. Review the contents and choose what to restore.');
            });
        }, 'tools-backup-open');
        if (pendingBackup) {
            if (pendingBackup.recovery) node(content, 'p', 'This is a partial backup. ' + pendingBackup.recovery.omittedLibraryKeys.length + ' unreadable library entries were excluded when it was created; they cannot be restored from this file.', 'tools-muted');
            node(content, 'p', pendingBackup.rooms.length + ' rooms · ' + (Object.keys(pendingBackup.preferences).length + (pendingBackup.analysisPreferences ? 1 : 0)) + ' saved preferences · ' + pendingBackup.library.length + ' sessions', 'tools-muted');
            node(content, 'p', pendingBackup.favoriteModels.length + ' favorite models. Restoring Library adds these where no local model choice exists.', 'tools-muted');
            const choices = node(content, 'div', undefined, 'tools-actions');
            const highs = checkbox(choices, 'tools-restore-highs', 'Merge ATH'), preferences = checkbox(choices, 'tools-restore-preferences', 'Restore preferences'), recordings = checkbox(choices, 'tools-restore-library', 'Add sessions and favorite models');
            button(content, 'Restore selected data', () => {
                if (!highs.checked && !preferences.checked && !recordings.checked) throw new Error('Choose at least one kind of data to restore.');
                if (!confirm('Restore the selected backup data?\n\nATH will be merged, library sessions added or updated with fuller versions, and selected saved preferences replaced. Your live session is not replaced.' +
                    (pendingBackup.recovery ? '\n\nThis partial backup excludes ' + pendingBackup.recovery.omittedLibraryKeys.length + ' unreadable library entries.' : ''))) return;
                const result = restoreTierScopeBackup(pendingBackup, { highs: highs.checked, preferences: preferences.checked, library: recordings.checked });
                library = null;
                if (runtime.playback) setPlaybackAllTimeState(runtime.playback, readAllTimeHighs(displayedHighRoom()));
                repaintHighMode();
                tell('Restored: ' + result.rooms + ' room ATH updates, ' + result.recordings + ' new sessions, ' + result.updatedRecordings + ' updated sessions, ' + result.favoriteModels + ' favorite models, ' + result.preferences + ' preferences.' + (result.preferences ? '\nRefresh your room tabs when convenient to apply preferences.' : ''));
            }, 'tools-backup-restore');
        }
    }
    function render(next, revealSessions = false) {
        refreshCapacity = null; historyView = null; followControls = null;
        const focusedId = dialog.contains(document.activeElement) ? document.activeElement.id : '';
        // Read synchronously before replacing nodes: native toggle events can be queued.
        for (const [key, id] of [['book', 'tools-sessions-book'], ['search', 'tools-library-search-menu']]) {
            const details = dialog.querySelector('#' + id);
            if (details) libraryDisclosures[key] = details.open;
        }
        if (revealSessions) libraryDisclosures.book = true;
        const existingPicker = dialog.querySelector('#tools-recording-picker');
        if (existingPicker) pickerOpen[tab] = existingPicker.open;
        if (analysisView) analysisStates.set(tab, {...analysisSources, state: analysisView.capture()});
        analysisView = null; analysisSources = null; analysisOutput = null; analysisReports = null;
        if (next !== tab) library = null;
        tab = next; fileRequest++; chartDraw = null;
        if (chartDispose) { chartDispose(); chartDispose = null; }
        if (chartObserver) { chartObserver.disconnect(); chartObserver = null; }
        content.replaceChildren(); message.textContent = '';
        dialog.querySelectorAll('[data-tools-tab]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.toolsTab === (tab === 'history' || tab === 'drafts' ? 'library' : tab))));
        try {
            if (tab === 'library') renderLibrary(); else if (tab === 'drafts') renderDrafts(); else if (tab === 'history') renderHistory(); else if (tab === 'backup') renderBackup(); else renderAnalysis(tab === 'compare');
            if ((tab === 'summary' || tab === 'compare' || tab === 'history') && analysisPreferenceError) tell(analysisPreferenceError, true);
        } catch (error) { tell(error.message, true); }
        if (focusedId) {
            const target = document.getElementById(focusedId);
            if (target && dialog.contains(target)) {
                // Reveal controls through every enclosing disclosure, but preserve
                // a summary's own open/closed choice when restoring its focus.
                let ancestor = target.tagName === 'SUMMARY' ? target.parentElement.parentElement : target;
                for (let details = ancestor.closest('details'); details; details = details.parentElement.closest('details')) details.open = true;
                target.focus();
            } else if (focusedId.startsWith('tools-model-favorite-')) dialog.querySelector('#tools-sessions-book-toggle')?.focus();
        }
    }
    function close() {
        fileRequest++; refreshSessionTools = null; refreshCapacity = null; chartDraw = null; historyView = null; followControls = null; liveCapture = null;
        if (chartDispose) { chartDispose(); chartDispose = null; }
        analysisStates.clear(); analysisView = null; analysisSources = null; analysisOutput = null; analysisReports = null;
        libraryReader.clear(); modelHistoryReader.clear(); options = []; optionsLibrary = null; optionsArchive = null; optionsLiveArchive = null; library = null; currentArchive = null; liveComparisonArchive = null;
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
    refreshSessionTools = reload => { if (reload && tab === 'library') render('library'); else refreshCurrent(); };
    document.addEventListener('keydown', escape);
    dialog.querySelector('#btn-cancel-gif').onclick = cancelGifExport;
    for (const id of ['btn-control-library', 'btn-playback-library']) {
        const button = document.getElementById(id); if (button) button.setAttribute('aria-expanded', 'true');
    }
    dialog.querySelector('#tools-close').onclick = close;
    dialog.querySelector('#tools-review-notes').onclick = () => render('drafts');
    updateDraftNotice();
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('close', () => { if (dialog.isConnected) close(); });
    dialog.querySelectorAll('[data-tools-tab]').forEach(button => { button.onclick = () => render(button.dataset.toolsTab); });
    dialog.show();
    detachDock = attachLibraryDock(document.getElementById('tracker-container'), dialog, () => { if (chartDraw) chartDraw(); });
    render('library'); dialog.querySelector('#tools-close').focus();
}
