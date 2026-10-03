import { drawAllSparklines, getHistoryBreaks } from './charts.js';
import { getAnonymousCount } from './dom.js';
import { getSessionHigh, syncHighTimes } from './highs.js';
import { runtime } from './runtime.js';

export function saveToHistory() {
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
    var now = Date.now();
    
    if (runtime.sessionStartedAt === null) runtime.sessionStartedAt = now;
    var sample = Object.assign({}, counts, { withTokens: withTokens, total: total, anonymous: anonymousCount });
    runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
        var previous = getSessionHigh(key, 0);
        var value = sample[key];
        if (value > previous.value) runtime.sessionHighs[key] = { value: value, time: now };
        else if (!runtime.sessionHighs[key]) runtime.sessionHighs[key] = previous;
        if (value > 0 && value >= runtime.sessionHighs[key].value) runtime.newHighTiers[key] = true;
        else delete runtime.newHighTiers[key];
    });
    syncHighTimes();

    if (!runtime.history.breaks || runtime.history.breaks.length !== runtime.history.timestamps.length) runtime.history.breaks = getHistoryBreaks(runtime.history).slice();
    var lastTime = runtime.history.timestamps.length ? runtime.history.timestamps[runtime.history.timestamps.length - 1] : null;
    runtime.history.breaks.push(lastTime !== null && (runtime.pendingHistoryGap || now - lastTime > Math.max(runtime.scanIntervalSeconds, runtime.lastScheduledIntervalSeconds) * 2000 + runtime.API_TIMEOUT_MS));
    runtime.pendingHistoryGap = false;
    runtime.history.timestamps.push(now);
    Object.keys(counts).forEach(function(tier) {
        runtime.history[tier].push(counts[tier]);
    });
    runtime.history['withTokens'].push(withTokens);
    runtime.history['total'].push(total);
    runtime.history['anonymous'].push(anonymousCount);
    if (runtime.history.timestamps.length > runtime.MAX_HISTORY_LENGTH) {
        runtime.history.timestamps.shift();
        runtime.history.breaks.shift();
        Object.keys(counts).forEach(function(tier) { runtime.history[tier].shift(); });
        runtime.history['withTokens'].shift();
        runtime.history['total'].shift();
        runtime.history['anonymous'].shift();
    }
    if (!runtime.isMinimized) {
        drawAllSparklines();
    }
}
