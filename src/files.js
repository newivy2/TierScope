import { addFileToAllTimeHighs, clearAllTimeHighs, toggleHighMode, updateHighControls } from './highs.js';
import { redrawPanelCharts } from './layout.js';
import { selectChartWindow } from './panel-preferences.js';
import { isPlaybackCurrent } from './playback-data.js';
import { hasStorageField } from './record-validation.js';
import { runtime } from './runtime.js';
import { captureSessionFile } from './session-capture.js';
import { readSessionFile } from './session-replay.js';
import { bindSessionTools, updateSessionToolsStatus } from './session-tools.js';
import { log } from './utils.js';

export function setChartWindow(value) {
    if (!hasStorageField(runtime.CHART_WINDOWS, value)) return;
    selectChartWindow(value);
    try { GM_setValue(runtime.CHART_WINDOW_KEY, value); } catch (error) { log('Could not save chart window preference'); }
    runtime.chartLayoutRevision++;
    updatePanelOptions();
    redrawPanelCharts();
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

export function updatePanelOptions() {
    updateSessionToolsStatus();
    updateHighControls();
    var button = document.getElementById('btn-panel-options');
    if (button) {
        button.style.display = runtime.isMinimized ? 'none' : '';
        button.textContent = 'Charts ▾';
        button.title = 'Chart window and highs. Showing ' + ({ full: 'full history', fourHours: 'the last 4 hours', twoHours: 'the last 2 hours', hour: 'the last hour', halfHour: 'the last 30 minutes', quarter: 'the last 15 minutes' })[runtime.chartWindowMode] + '.';
    }
    var select = document.getElementById('chart-window-select');
    if (select) select.value = runtime.chartWindowMode;
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
    var cleanupSessionTools = bindSessionTools();
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
    document.getElementById('btn-high-mode').onclick = toggleHighMode;
    document.getElementById('mini-high').onclick = toggleHighMode;
    document.getElementById('btn-add-all-time').onclick = addFileToAllTimeHighs;
    document.getElementById('btn-clear-all-time').onclick = clearAllTimeHighs;
    input.onchange = function() { var file = input.files && input.files[0]; if (file) { close(false); readSessionFile(file); } };
    function outside(event) { if (!menu.contains(event.target) && !button.contains(event.target)) close(false); }
    function escape(event) {
        if (event.key === 'Escape' && menu.style.display !== 'none') { close(true); event.stopPropagation(); }
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape, true);
    runtime.panelOptionsCleanup = function() {
        cleanupSessionTools();
        document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape, true);
    };
    updatePanelOptions();
}
