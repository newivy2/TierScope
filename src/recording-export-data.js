
// Archive exports use only the selected recording, never the current room or
// replay playhead. CSV retains the existing column order and real timestamps.
export function recordingCSV(archive) {
    const h = archive.session.history;
    function cell(value) {
        let text = String(value);
        if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
        return '"' + text.replace(/"/g, '""') + '"';
    }
    const rows = [['room', 'sample_index', 'timestamp_utc', 'elapsed_seconds', 'room_total',
        'registered', 'anonymous', 'with_tokens', 'moderators', 'fan_club', 'dark_purple',
        'light_purple', 'dark_blue', 'light_blue', 'grey', 'female_trans']];
    h.timestamps.forEach((time, i) => rows.push([archive.room, i + 1, new Date(time).toISOString(),
        Math.max(0, time - h.timestamps[0]) / 1000, h.total[i] + h.anonymous[i], h.total[i], h.anonymous[i],
        h.withTokens[i], h.red[i], h.green[i], h.purple[i], h.pink[i], h['dark-blue'][i], h['light-blue'][i], h.gray[i], h['female-trans'][i]]));
    return '\ufeff' + rows.map(row => row.map(cell).join(',')).join('\r\n') + '\r\n';
}

export function recordingText(archive, version, generatedAt) {
    const s = archive.session, h = s.history, last = h.timestamps.length - 1;
    const time = value => value === null ? 'Not recorded' : new Date(value).toISOString();
    const report = ['================================', 'TIERSCOPE RECORDING REPORT', '================================', '',
        'Model: ' + archive.room, 'TierScope Version: ' + version, 'Recording Producer Version: ' + archive.producerVersion,
        'Report Generated: ' + time(generatedAt), 'Session Start: ' + time(s.sessionStartedAt) + (s.sessionStartEstimated ? ' (estimated)' : ''),
        'Recording State: ' + (s.isStopped ? 'Stopped' : s.isPaused ? 'Paused snapshot' : 'Running snapshot'),
        'Recorded Active Seconds: ' + s.pausedElapsedTime / 1000, 'Retained Samples: ' + h.timestamps.length,
        'First Retained Sample: ' + time(h.timestamps[0]), 'Last Retained Sample: ' + time(h.timestamps[last]),
        'Recording Gaps: ' + (h.breaks || []).filter(value => value).length, '',
        '--- SESSION HIGHS ---', 'High timestamps use real recording time, including pauses.',
        'Room Total High: ' + s.roomTotalHigh + ' at ' + time(s.roomTotalHighTime)];
    const names = {red: 'Moderators', green: 'Fan Club', purple: 'Dark Purple', pink: 'Light Purple',
        'dark-blue': 'Dark Blue', 'light-blue': 'Light Blue', gray: 'Grey', 'female-trans': 'Female / Trans',
        withTokens: 'With Tokens', total: 'Registered', anonymous: 'Anonymous'};
    for (const [key, label] of Object.entries(names)) {
        const high = s.sessionHighs[key]; report.push(label + ' High: ' + high.value + ' at ' + time(high.time));
    }
    report.push('', '--- LAST RECORDED SAMPLE ---', 'Room Total: ' + (h.total[last] + h.anonymous[last]));
    for (const [key, label] of Object.entries(names)) report.push(label + ': ' + h[key][last]);
    report.push('', 'This report describes the full selected recording, not the replay cursor or another live room.', '');
    return report.join('\n');
}
