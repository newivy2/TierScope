import { runtime } from './runtime.js';
import { getHistoryBreaks } from './history-data.js';

export function createPlaybackSnapshot(sourceHistory) {
    var copiedHistory = { timestamps: sourceHistory.timestamps.slice(), breaks: getHistoryBreaks(sourceHistory).slice() };
    var timeline = [];
    var highs = { roomTotal: [] };
    var firstTimestamp = copiedHistory.timestamps.length ? copiedHistory.timestamps[0] : 0;
    runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
        copiedHistory[key] = sourceHistory[key].slice();
        highs[key] = [];
    });
    copiedHistory.timestamps.forEach(function(timestamp, index) {
        timeline.push(Math.max(index ? timeline[index - 1] : 0, timestamp - firstTimestamp));
        runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
            highs[key].push(Math.max(index ? highs[key][index - 1] : 0, copiedHistory[key][index]));
        });
        var total = copiedHistory.total[index] + copiedHistory.anonymous[index];
        highs.roomTotal.push(Math.max(index ? highs.roomTotal[index - 1] : 0, total));
    });
    var durationMs = timeline.length ? timeline[timeline.length - 1] : 0;
    return { history: copiedHistory, timeline: timeline, highs: highs,
        // Recording gaps affect the chart's time axis, not how long Replay
        // waits for its next sample. Keep one second per step, capped at 30s.
        durationMs: durationMs, replayDurationMs: Math.min(30000, Math.max(0, timeline.length - 1) * 1000) };
}

export function getPlaybackSampleIndex(snapshot, positionMs, exactIndex) {
    if (!snapshot || !snapshot.timeline.length) return -1;
    var position = Number(positionMs);
    position = Number.isFinite(position) ? Math.max(0, Math.min(snapshot.durationMs, position)) : 0;
    var low = 0;
    var high = snapshot.timeline.length;
    while (low < high) {
        var middle = Math.floor((low + high) / 2);
        if (snapshot.timeline[middle] <= position) low = middle + 1;
        else high = middle;
    }
    return Number.isInteger(exactIndex) ? Math.max(0, Math.min(snapshot.timeline.length - 1, exactIndex)) : Math.max(0, low - 1);
}

export function getPlaybackFrame(snapshot, positionMs, exactIndex) {
    var index = getPlaybackSampleIndex(snapshot, positionMs, exactIndex);
    if (index < 0) return null;
    var frameHistory = snapshot.history;
    var frameHighs = {};
    var counts = {};
    var playbackNewHighTiers = {};
    runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
        frameHighs[key] = snapshot.highs[key][index];
        var count = snapshot.history[key][index];
        if (Object.prototype.hasOwnProperty.call(runtime.TIERS, key)) counts[key] = count;
        if (count > 0 && count >= snapshot.highs[key][index]) {
            playbackNewHighTiers[key] = true;
        }
    });
    frameHighs.roomTotal = snapshot.highs.roomTotal[index];
    var total = snapshot.history.total[index];
    var anonymousCount = snapshot.history.anonymous[index];
    return { counts: counts, total: total, withTokens: snapshot.history.withTokens[index],
        anonymousCount: anonymousCount, fullRoomTotal: total + anonymousCount,
        roomTotalHigh: frameHighs.roomTotal, history: frameHistory, historyEndIndex: index, highs: frameHighs,
        index: index, timestamp: snapshot.history.timestamps[index],
        playbackNewHighTiers: playbackNewHighTiers };
}
