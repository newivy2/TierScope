import { getAnonymousCount } from './dom.js';
import { getSessionHigh } from './high-selectors.js';
import { runtime } from './runtime.js';
import { absencePauseDescription, isAbsencePaused, stopDescription } from './session-selectors.js';
import { getStorageReportStatus } from './storage.js';
import { formatDateTime, formatElapsedTime, getModelName } from './utils.js';

export function downloadTrackingReport() {
    var modelName = getModelName();
    var restored = runtime.restoredDisplayFrame;
    var sessionStart = runtime.sessionStartedAt !== null ? formatDateTime(runtime.sessionStartedAt) : 'Not started';
    var totalTime = runtime.trackingStartTime ? formatElapsedTime(runtime.isPaused ? runtime.pausedElapsedTime : (Date.now() - runtime.trackingStartTime)) : '00:00:00';
    var now = Date.now();
    var storageReport = getStorageReportStatus(modelName);
    var report = [
        '================================',
        'CHATURBATE TRACKING REPORT',
        '================================',
        '',
        'Model: ' + modelName,
        'Session Start: ' + sessionStart + (runtime.sessionStartEstimated ? ' (estimated from legacy data)' : ''),
        'Report Generated: ' + formatDateTime(now),
        'TierScope Version: ' + runtime.TIERSCOPE_VERSION,
        'Storage Schema Version: ' + runtime.STORAGE_SCHEMA_VERSION,
        'Saved Session Producer Version: ' + storageReport.producer,
        'Session Storage: ' + storageReport.access,
        'Last Accepted Acquisition Source: ' + (runtime.lastAcceptedAcquisition ? runtime.lastAcceptedAcquisition.source : 'None'),
        'Last Accepted Sample Time: ' + (runtime.lastAcceptedAcquisition ? new Date(runtime.lastAcceptedAcquisition.timestamp).toISOString() : 'None'),
        'Total Tracking Time: ' + totalTime,
        ''
    ];
    if (runtime.isStopped) {
        report.push('Session State: STOPPED — ' + stopDescription());
        report.push('Stopped At: ' + new Date(runtime.stoppedAt).toISOString());
        report.push('Displayed Data: Final retained sample; this session is closed.');
        report.push('');
    } else if (isAbsencePaused()) {
        report.push('Session State: AUTO-PAUSED — broadcaster absent');
        report.push('Auto-paused At: ' + new Date(runtime.absencePausedAt).toISOString());
        report.push('Displayed Data: Last retained sample; presence checks do not record audience counts.');
        report.push(absencePauseDescription());
        report.push('');
    }
    if (runtime.absenceOverrideActive) report.push('Absence Automation: Manually overridden until the broadcaster is detected again.', '');
    if (restored) {
        report.push('Displayed Data: Last saved snapshot; no fresh sample accepted since restore.');
        report.push('Saved Snapshot Time: ' + new Date(restored.timestamp).toISOString());
        report.push('');
    }
    if (runtime.lastAcceptedAcquisition && runtime.lastAcceptedAcquisition.api) {
        report.push('API Anonymous Count: ' + runtime.lastAcceptedAcquisition.api.anonymousCount);
        report.push('API Registered Record Count: ' + runtime.lastAcceptedAcquisition.api.registeredCount);
        report.push('API Total Users: ' + runtime.lastAcceptedAcquisition.api.totalUsers);
        report.push('API Owner Record Present: ' + (runtime.lastAcceptedAcquisition.api.ownerCount > 0 ? 'yes' : 'no'));
        report.push('Registered includes broadcaster/owner and unclassified records outside the seven viewer tiers.');
        report.push('');
    }
    report.push('--- SESSION HIGHS ---');
    report.push('Offsets below are wall time since session start, including pauses.');
    if (runtime.sessionStartEstimated) report.push('Legacy tier highs were recovered from retained samples; older discarded peaks are unavailable.');
    report.push('');
    if (runtime.roomTotalHigh > 0 && runtime.roomTotalHighTime) {
        var elapsed = formatElapsedTime(runtime.roomTotalHighTime - runtime.sessionStartedAt);
        report.push('Room Total High: ' + runtime.roomTotalHigh.toLocaleString() + ' users');
        report.push('  Recorded at: ' + formatDateTime(runtime.roomTotalHighTime) + ' (' + elapsed + ' into session)');
        report.push('');
    }
    Object.keys(runtime.TIERS).forEach(function(tier) {
        var highResult = getSessionHigh(tier, 0);
        var highVal = highResult.value;
        var highTime = runtime.tierHighTimes[tier];
        if (highVal > 0 && highTime) {
            var elapsed = formatElapsedTime(highTime - runtime.sessionStartedAt);
            report.push(runtime.TIERS[tier].name + ' High: ' + highVal.toLocaleString());
            report.push('  Recorded at: ' + formatDateTime(highTime) + ' (' + elapsed + ' into session)');
            report.push('');
        }
    });
    var withTokensResult = getSessionHigh('withTokens', 0);
    var withTokensHigh = withTokensResult.value;
    if (withTokensHigh > 0 && runtime.withTokensHighTime) {
        var elapsed = formatElapsedTime(runtime.withTokensHighTime - runtime.sessionStartedAt);
        report.push('With Tokens High: ' + withTokensHigh.toLocaleString());
        report.push('  Recorded at: ' + formatDateTime(runtime.withTokensHighTime) + ' (' + elapsed + ' into session)');
        report.push('');
    }
    var totalResult = getSessionHigh('total', 0);
    var totalHigh = totalResult.value;
    if (totalHigh > 0 && runtime.totalHighTime) {
        var elapsed = formatElapsedTime(runtime.totalHighTime - runtime.sessionStartedAt);
        report.push('Registered Users High: ' + totalHigh.toLocaleString());
        report.push('  Recorded at: ' + formatDateTime(runtime.totalHighTime) + ' (' + elapsed + ' into session)');
        report.push('');
    }
    var anonResult = getSessionHigh('anonymous', 0);
    var anonHigh = anonResult.value;
    if (anonHigh > 0 && runtime.anonHighTime) {
        var elapsed = formatElapsedTime(runtime.anonHighTime - runtime.sessionStartedAt);
        report.push('Anonymous High: ' + anonHigh.toLocaleString());
        report.push('  Recorded at: ' + formatDateTime(runtime.anonHighTime) + ' (' + elapsed + ' into session)');
        report.push('');
    }
    report.push(runtime.isStopped ? '--- STOPPED SESSION STATS (NOT A LIVE SAMPLE) ---' : isAbsencePaused() ? '--- AUTO-PAUSED STATS (NOT A LIVE SAMPLE) ---' : restored ? '--- LAST SAVED STATS (NOT A LIVE SAMPLE) ---' : '--- CURRENT STATS ---');
    report.push('');
    var counts = { 'red': 0, 'green': 0, 'purple': 0, 'pink': 0, 'dark-blue': 0, 'light-blue': 0, 'gray': 0, 'female-trans': 0 };
    runtime.users.forEach(function(data) {
        if (counts[data.tier] !== undefined) counts[data.tier]++;
        if (data.gender === 'female' || data.gender === 'trans') {
            counts['female-trans']++;
        }
    });
    var total = runtime.users.size;
    var withTokens = counts['red'] + counts['green'] + counts['purple'] + counts['pink'] + counts['dark-blue'] + counts['light-blue'];
    var anonymousCount = getAnonymousCount();
    var fullRoomTotal = runtime.roomTotal > total ? runtime.roomTotal : (total + anonymousCount);
    if (restored) {
        counts = restored.counts;
        total = restored.total;
        withTokens = restored.withTokens;
        anonymousCount = restored.anonymousCount;
        fullRoomTotal = restored.fullRoomTotal;
    }
    var totalHighCurrent = getSessionHigh('total', total).value;
    var withTokensHighCurrent = getSessionHigh('withTokens', withTokens).value;
    var anonHighCurrent = getSessionHigh('anonymous', anonymousCount).value;
    var statsLabel = runtime.isStopped ? 'Final ' : restored ? 'Saved ' : 'Current ';
    var reportedRoomHigh = restored ? restored.roomTotalHigh : runtime.roomTotalHigh;
    report.push(statsLabel + 'Room Total: ' + fullRoomTotal.toLocaleString() + ' (High: ' + reportedRoomHigh.toLocaleString() + ')');
    report.push(statsLabel + 'Registered: ' + total.toLocaleString() + ' (High: ' + totalHighCurrent.toLocaleString() + ')');
    report.push(statsLabel + 'With Tokens: ' + withTokens.toLocaleString() + ' (High: ' + withTokensHighCurrent.toLocaleString() + ')');
    report.push(statsLabel + 'Anonymous: ' + anonymousCount.toLocaleString() + ' (High: ' + anonHighCurrent.toLocaleString() + ')');
    report.push('');
    report.push(restored ? '--- SAVED TIER BREAKDOWN ---' : '--- TIER BREAKDOWN ---');
    report.push('');
    Object.keys(runtime.TIERS).forEach(function(tier) {
        var current = counts[tier] || 0;
        var high = getSessionHigh(tier, current).value;
        report.push(runtime.TIERS[tier].name + ': ' + current.toLocaleString() + ' (High: ' + high.toLocaleString() + ')');
    });
    report.push('');
    report.push('================================');
    report.push('End of Report');
    report.push('================================');
    var date = new Date();
    var dateStr = date.toISOString().slice(0, 10);
    var timeStr = date.getHours().toString().padStart(2, '0') + '-' +
                 date.getMinutes().toString().padStart(2, '0') + '-' +
                 date.getSeconds().toString().padStart(2, '0');
    var filename = modelName + '-tracking-report-' + dateStr + '-' + timeStr + '.txt';
    var blob = new Blob([report.join('\n')], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function downloadTrackingCSV() {
    if (!runtime.history.timestamps.length) {
        alert('No recorded history to export yet.');
        return;
    }
    var model = getModelName();
    function cell(value) {
        var text = String(value);
        // Quoting handles CSV delimiters; the prefix prevents spreadsheet formulas.
        if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
        return '"' + text.replace(/"/g, '""') + '"';
    }
    var rows = [['room', 'sample_index', 'timestamp_utc', 'elapsed_seconds', 'room_total',
        'registered', 'anonymous', 'with_tokens', 'moderators', 'fan_club', 'dark_purple',
        'light_purple', 'dark_blue', 'light_blue', 'grey', 'female_trans']];
    runtime.history.timestamps.forEach(function(timestamp, i) {
        rows.push([model, i + 1, new Date(timestamp).toISOString(),
            Math.max(0, timestamp - runtime.history.timestamps[0]) / 1000,
            runtime.history.total[i] + runtime.history.anonymous[i], runtime.history.total[i], runtime.history.anonymous[i],
            runtime.history.withTokens[i], runtime.history.red[i], runtime.history.green[i], runtime.history.purple[i],
            runtime.history.pink[i], runtime.history['dark-blue'][i], runtime.history['light-blue'][i], runtime.history.gray[i], runtime.history['female-trans'][i]]);
    });
    var blob = new Blob(['\ufeff' + rows.map(function(row) { return row.map(cell).join(','); }).join('\r\n') + '\r\n'],
        { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = model.replace(/[^a-z0-9_-]/gi, '_') + '-history-' + new Date().toISOString().replace(/[:.]/g, '-') + '.csv';
    document.body.appendChild(link);
    try { link.click(); } finally {
        link.remove();
        setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
    }
}
