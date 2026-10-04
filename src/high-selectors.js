import { compactNumber } from './format.js';
import { allTimeRoom, readAllTimeHighs } from './highs-store.js';
import { readSessionHigh } from './live-session.js';
import { isPlaybackCurrent } from './playback-data.js';
import { runtime } from './runtime.js';
import { getModelName } from './utils.js';

export function displayedHighRoom() {
    return allTimeRoom(isPlaybackCurrent(runtime.playback) && runtime.playback.archive ? runtime.playback.archive.room : getModelName());
}

export function displayedAllTimeState() {
    if (isPlaybackCurrent(runtime.playback) && runtime.playback.allTimeState) return runtime.playback.allTimeState;
    var room = displayedHighRoom();
    return runtime.allTimeCache.get(room) || readAllTimeHighs(room);
}

export function getSessionHigh(key, current) {
    return readSessionHigh(key, current);
}

export function getDisplayHigh(frame, key, current) {
    if (runtime.highMode === 'ath') return displayedAllTimeState().highs[key];
    if (key === 'roomTotal') return { value: frame.roomTotalHigh, time: frame.isPlayback ? null : runtime.roomTotalHighTime };
    return frame.isPlayback ? { value: Math.max(frame.highs[key] || 0, current || 0), isNew: false } : getSessionHigh(key, current);
}

export function highLabel(high, compact) {
    return runtime.highMode.toUpperCase() + ':' + (runtime.highMode === 'ath' && !high.source ? '—' : compact ? compactNumber(high.value) : high.value.toLocaleString());
}

export function highDescription(high) {
    var label = runtime.highMode === 'ath' ? 'All-time high for ' + displayedHighRoom() : 'Session high';
    if (runtime.highMode === 'ath' && !high.source) return label + ': no record yet';
    return label + ': ' + high.value.toLocaleString() + (high.time != null ? ' · ' + new Date(high.time).toLocaleString() : '') +
        (runtime.highMode === 'ath' ? (high.source === 'file' ? ' · Added from a session file' : high.source === 'saved' ? ' · Restored local session' : ' · Recorded live') +
            (displayedAllTimeState().pending ? ' · Local only, not saved' : '') : '');
}

export function getHighValue(data, currentValue, timestamp) {
    var historyMax = data && data.length > 0 ? Math.max.apply(null, data) : 0;
    var newHigh = Math.max(historyMax, currentValue || 0);
    if (timestamp && newHigh > historyMax) {
        return { value: newHigh, isNew: true, time: timestamp };
    }
    return { value: newHigh, isNew: false };
}
