import { getDisplayHigh, highDescription, highLabel } from './high-selectors.js';
import { freezeRecordingData } from './immutable-data.js';
import { readModelFavorite } from './library-models.js';
import { captureDisplayHistory, liveDisplayData } from './presentation-data.js';
import { runtime } from './runtime.js';
import { getComparisonCounts } from './session-selectors.js';
import { buildFreshnessModel } from './status-model.js';
import { themeColor } from './theme-values.js';
import { getModelName, getTierMarker } from './utils.js';

// Read selectors prepare display values. DOM renderers receive this data and
// cannot access a live session, playback controls, or browser storage themselves.
export function buildLiveDisplayFrame() {
    return runtime.restoredDisplayFrame || liveDisplayData(runtime, Object.keys(runtime.TIERS));
}

export function buildPanelDisplayModel(frame) {
    const displayHighs = {};
    const highlights = {...((frame.isPlayback || frame.isRestored) ? frame.playbackNewHighTiers : runtime.newHighTiers)};
    if (runtime.highMode === 'ath') for (const key of Object.keys(highlights)) delete highlights[key];
    for (const key of runtime.ALL_TIME_SERIES) {
        const value = key === 'roomTotal' ? frame.fullRoomTotal : key === 'withTokens' ? frame.withTokens :
            key === 'total' ? frame.total : key === 'anonymous' ? frame.anonymousCount : frame.counts[key];
        const high = getDisplayHigh(frame, key, value);
        displayHighs[key] = {...high, label: highLabel(high), shortLabel: highLabel(high, true), description: highDescription(high)};
        if (runtime.highMode === 'ath' && high.source && value > 0 && value >= high.value) highlights[key] = true;
    }
    const comparison = !frame.isRestored && runtime.hasTrendBaseline ? getComparisonCounts().counts : null;
    const modelName = frame.isPlayback && runtime.playback && runtime.playback.archive ? runtime.playback.archive.room : getModelName();
    let favorite = {favorite: false, autoKeep: false};
    if (modelName !== 'unknown') {
        try { favorite = readModelFavorite(modelName); }
        catch (error) { favorite = {...favorite, error: 'Favorite unavailable. Open Library and refresh to retry.'}; }
    }
    if (runtime.highMode !== 'ath' && frame.fullRoomTotal > 0 && frame.fullRoomTotal >= frame.roomTotalHigh) highlights.roomTotal = true;
    return freezeRecordingData({counts: {...frame.counts}, total: frame.total, withTokens: frame.withTokens,
        anonymousCount: frame.anonymousCount, fullRoomTotal: frame.fullRoomTotal, roomTotalHigh: frame.roomTotalHigh,
        history: captureDisplayHistory(frame.history), historyEndIndex: frame.historyEndIndex,
        isPlayback: frame.isPlayback === true, isRestored: frame.isRestored === true,
        displayHighs, highlights, stopped: runtime.isStopped, minimized: runtime.isMinimized,
        replayRoom: frame.isPlayback && runtime.playback && runtime.playback.archive ? runtime.playback.archive.room : '',
        imported: !!(frame.isPlayback && runtime.playback && runtime.playback.imported),
        tierKeys: Object.keys(runtime.TIERS), rows: runtime.PANEL_ROWS.map(row => ({...row})),
        roomName: getModelName(), modelName, favorite, miniMetric: runtime.miniMetric, highMode: runtime.highMode, textColor: themeColor('text'),
        comparison: comparison ? {...comparison} : null,
        comparisonLabel: runtime.trendComparisonMode === 'last' ? 'previous sample' : runtime.trendComparisonMode === 'start' ? 'first retained sample' : runtime.trendComparisonMode,
        freshness: runtime.isMinimized ? buildFreshnessModel() : null});
}

export function buildTrendDisplayModel() {
    const frame = buildLiveDisplayFrame(), comparison = getComparisonCounts();
    return freezeRecordingData({isPlayback: runtime.presentationMode === 'PLAYBACK', isRestored: !!runtime.restoredDisplayFrame,
        stopped: runtime.isStopped, hasTrendBaseline: runtime.hasTrendBaseline, counts: {...frame.counts},
        total: frame.total, withTokens: frame.withTokens, anonymousCount: frame.anonymousCount,
        historyLength: runtime.history.timestamps.length,
        comparison: {...comparison, counts: comparison.counts ? {...comparison.counts} : null},
        tierMarkers: Object.fromEntries(Object.keys(runtime.TIERS).map(key => [key, getTierMarker(key)]))});
}
