import { getHistoryBreaks } from './charts.js';
import { addFileToAllTimeHighs, cancelHighPulses, clearAllTimeHighs, getSessionHigh, readAllTimeHighs, toggleHighMode, updateHighControls } from './highs.js';
import { redrawPanelCharts, toggleView } from './layout.js';
import { createPlaybackSnapshot, isPlaybackCurrent, leavePlayback, paintPlayback, setPlaybackLayout } from './replay.js';
import { runtime } from './runtime.js';
import { getStorageKey, hasStorageField, isStorageNumber, isStorageObject, isStorageTimestamp, normalizeStoredSession, validateStoredSession } from './storage.js';
import { getModelName, log } from './utils.js';

export function setChartWindow(value) {
    if (!hasStorageField(runtime.CHART_WINDOWS, value)) return;
    runtime.chartWindowMode = value;
    try { GM_setValue(runtime.CHART_WINDOW_KEY, value); } catch (error) { log('Could not save chart window preference'); }
    runtime.chartLayoutRevision++;
    updatePanelOptions();
    redrawPanelCharts();
}

export function captureSessionFile() {
    if (isPlaybackCurrent(runtime.playback) && runtime.playback.archive) return runtime.playback.archive;
    if (!runtime.history.timestamps.length || runtime.activeSessionStorageKey !== getStorageKey(getModelName()) || location.href !== runtime.lastUrl) {
        throw new Error('No recorded session to save yet.');
    }
    var now = Date.now();
    var data = {
        schemaVersion: runtime.STORAGE_SCHEMA_VERSION, timestamp: now,
        history: { timestamps: runtime.history.timestamps.slice(), breaks: getHistoryBreaks(runtime.history).slice() },
        sessionStartedAt: runtime.sessionStartedAt, sessionStartEstimated: runtime.sessionStartEstimated,
        sessionHighs: {}, roomTotalHigh: runtime.roomTotalHigh, roomTotalHighTime: runtime.roomTotalHighTime,
        pausedElapsedTime: runtime.isPaused ? runtime.pausedElapsedTime : runtime.trackingStartTime ? Math.max(0, now - runtime.trackingStartTime) : 0,
        isPaused: runtime.isPaused, isStopped: runtime.isStopped, stoppedAt: runtime.stoppedAt, stopReason: runtime.stopReason
    };
    runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
        data.history[key] = runtime.history[key].slice();
        data.sessionHighs[key] = getSessionHigh(key, 0);
    });
    runtime.history.timestamps.forEach(function(time, i) {
        var total = runtime.history.total[i] + runtime.history.anonymous[i];
        if (total > data.roomTotalHigh) { data.roomTotalHigh = total; data.roomTotalHighTime = time; }
    });
    return validateSessionFile({ format: runtime.SESSION_FILE_FORMAT, formatVersion: runtime.SESSION_FILE_VERSION,
        producerVersion: runtime.TIERSCOPE_VERSION, room: getModelName(), session: data });
}

export function validateSessionFile(file) {
    if (!isStorageObject(file) || file.format !== runtime.SESSION_FILE_FORMAT || file.formatVersion !== runtime.SESSION_FILE_VERSION) {
        throw new Error('This is not a supported TierScope session file.');
    }
    if (typeof file.room !== 'string' || !/^[a-z0-9_-]{1,100}$/i.test(file.room) ||
        typeof file.producerVersion !== 'string' || file.producerVersion.length > 40) {
        throw new Error('Invalid session file information.');
    }
    var data = file.session;
    validateStoredSession(data);
    if (data.schemaVersion !== runtime.STORAGE_SCHEMA_VERSION || !data.history.timestamps.length ||
        !isStorageObject(data.sessionHighs) || !isStorageNumber(data.roomTotalHigh) ||
        !(data.sessionStartedAt === null || isStorageTimestamp(data.sessionStartedAt)) ||
        typeof data.sessionStartEstimated !== 'boolean' || !isStorageTimestamp(data.pausedElapsedTime) ||
        typeof data.isPaused !== 'boolean' || typeof data.isStopped !== 'boolean' ||
        !(data.roomTotalHighTime === null || isStorageTimestamp(data.roomTotalHighTime))) {
        throw new Error('Session file is incomplete.');
    }
    runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
        if (!data.history[key].every(Number.isSafeInteger) || !Number.isSafeInteger(data.sessionHighs[key].value)) {
            throw new Error('Session counts must be whole numbers.');
        }
    });
    var roomPeak = 0;
    data.history.timestamps.forEach(function(_, i) {
        var total = data.history.total[i] + data.history.anonymous[i];
        if (!Number.isSafeInteger(total)) throw new Error('Invalid session room total.');
        roomPeak = Math.max(roomPeak, total);
    });
    if (!Number.isSafeInteger(data.roomTotalHigh) || data.roomTotalHigh < roomPeak) throw new Error('Invalid session room high.');
    // Copy only supported aggregate fields. Ignore extra fields, including
    // obsolete username collections; imported data never enters live storage.
    var normalized = normalizeStoredSession(data);
    var clean = { schemaVersion: runtime.STORAGE_SCHEMA_VERSION };
    ['timestamp', 'history', 'sessionStartedAt', 'sessionStartEstimated', 'sessionHighs',
        'roomTotalHigh', 'roomTotalHighTime', 'pausedElapsedTime', 'isPaused', 'isStopped', 'stoppedAt', 'stopReason'].forEach(function(key) {
        clean[key] = normalized[key];
    });
    return { format: runtime.SESSION_FILE_FORMAT, formatVersion: runtime.SESSION_FILE_VERSION,
        producerVersion: file.producerVersion, room: file.room, session: clean };
}

export function downloadSessionFile() {
    try {
        var archive = captureSessionFile();
        var blob = new Blob([JSON.stringify(archive)], { type: 'application/json;charset=utf-8' });
        var url = URL.createObjectURL(blob), link = document.createElement('a');
        link.href = url;
        link.download = archive.room + '-session-' + new Date(archive.session.timestamp).toISOString().replace(/[:.]/g, '-') + '.tierscope.json';
        document.body.appendChild(link);
        try { link.click(); } finally { link.remove(); setTimeout(function() { URL.revokeObjectURL(url); }, 60000); }
    } catch (error) { alert('Could not save session file: ' + error.message); }
}

export function openSessionReplay(file) {
    var archive = validateSessionFile(file);
    leavePlayback(false);
    if (runtime.isMinimized) toggleView();
    runtime.playback = { url: location.href, key: runtime.activeSessionStorageKey, generation: runtime.initGuard,
        imported: true, archive: archive, snapshot: createPlaybackSnapshot(archive.session.history),
        allTimeState: readAllTimeHighs(archive.room),
        positionMs: 0, samplePosition: 0, stepIndex: 0, speed: 1, lastTickAt: Date.now(), playing: false, timer: null };
    cancelHighPulses();
    runtime.presentationMode = 'PLAYBACK';
    setPlaybackLayout(true);
    return paintPlayback(runtime.playback);
}

export async function readSessionFile(file) {
    if (!file) return false;
    var request = ++runtime.sessionFileLoadGeneration, url = location.href, generation = runtime.initGuard;
    function current() { return request === runtime.sessionFileLoadGeneration && url === location.href && generation === runtime.initGuard; }
    try {
        if (file.size > runtime.SESSION_FILE_MAX_BYTES) throw new Error('Session files must be 8 MB or smaller.');
        var text = await file.text();
        if (!current()) return false;
        if (text.length > runtime.SESSION_FILE_MAX_BYTES) throw new Error('Session file is too large.');
        return openSessionReplay(JSON.parse(text.replace(/^\uFEFF/, '')));
    } catch (error) {
        if (current()) alert('Could not open session file: ' + error.message);
        return false;
    }
}

export function updatePanelOptions() {
    updateHighControls();
    var button = document.getElementById('btn-panel-options');
    if (button) {
        button.style.display = runtime.isMinimized ? 'none' : '';
        button.textContent = ({ full: 'Full', fourHours: '4h', twoHours: '2h', hour: '1h', halfHour: '30m', quarter: '15m' })[runtime.chartWindowMode] + ' ▾';
        button.title = 'Chart window and session files. Showing ' + ({ full: 'full history', fourHours: 'the last 4 hours', twoHours: 'the last 2 hours', hour: 'the last hour', halfHour: 'the last 30 minutes', quarter: 'the last 15 minutes' })[runtime.chartWindowMode] + '.';
    }
    var select = document.getElementById('chart-window-select');
    if (select) select.value = runtime.chartWindowMode;
    ['btn-save-session', 'btn-control-save-session', 'btn-playback-save-session'].forEach(function(id) {
        var save = document.getElementById(id);
        if (save) save.disabled = !((isPlaybackCurrent(runtime.playback) && runtime.playback.archive) || runtime.history.timestamps.length);
    });
    var info = document.getElementById('session-file-info');
    if (info) {
        var archive = isPlaybackCurrent(runtime.playback) && runtime.playback.imported ? runtime.playback.archive : null;
        info.style.display = archive ? 'block' : 'none';
        if (archive) info.textContent = archive.room + ' · ' + archive.session.history.timestamps.length + ' samples\n' +
            'Saved ' + new Date(archive.session.timestamp).toLocaleString() + '\nSession room high: ' + archive.session.roomTotalHigh.toLocaleString();
    }
}

export function bindPanelOptions() {
    var button = document.getElementById('btn-panel-options'), menu = document.getElementById('panel-options');
    var input = document.getElementById('session-file-input');
    function close(focus) { menu.style.display = 'none'; button.setAttribute('aria-expanded', 'false'); if (focus) button.focus(); }
    button.onmousedown = function(event) { event.stopPropagation(); };
    button.onclick = function(event) {
        event.stopPropagation(); updatePanelOptions();
        var open = menu.style.display === 'none'; menu.style.display = open ? 'block' : 'none';
        button.setAttribute('aria-expanded', String(open));
        if (open) document.getElementById('chart-window-select').focus();
    };
    document.getElementById('panel-options-close').onclick = function() { close(true); };
    document.getElementById('chart-window-select').onchange = function() { setChartWindow(this.value); };
    document.getElementById('btn-save-session').onclick = function() { downloadSessionFile(); close(true); };
    document.getElementById('btn-control-save-session').onclick = downloadSessionFile;
    document.getElementById('btn-playback-save-session').onclick = downloadSessionFile;
    function chooseSessionFile() { input.value = ''; input.click(); }
    document.getElementById('btn-open-session').onclick = chooseSessionFile;
    document.getElementById('btn-control-open-session').onclick = chooseSessionFile;
    document.getElementById('btn-playback-open-session').onclick = chooseSessionFile;
    document.getElementById('btn-high-mode').onclick = toggleHighMode;
    document.getElementById('mini-high').onclick = toggleHighMode;
    document.getElementById('btn-add-all-time').onclick = addFileToAllTimeHighs;
    document.getElementById('btn-playback-add-all-time').onclick = addFileToAllTimeHighs;
    document.getElementById('btn-clear-all-time').onclick = clearAllTimeHighs;
    input.onchange = function() { var file = input.files && input.files[0]; if (file) { close(false); readSessionFile(file); } };
    function outside(event) { if (!menu.contains(event.target) && !button.contains(event.target)) close(false); }
    function escape(event) {
        if (event.key === 'Escape' && menu.style.display !== 'none') { close(true); event.stopPropagation(); }
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape, true);
    runtime.panelOptionsCleanup = function() {
        document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape, true);
    };
    updatePanelOptions();
}
