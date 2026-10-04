import { drawSparkline, hideChartTooltip } from './chart-view.js';
import { getHistoryBreaks } from './history-data.js';
import { applyRowLayout } from './row-layout.js';
import { runtime } from './runtime.js';
import { roomTotalSeries } from './room-total-series.js';
import { themeColor } from './theme-values.js';

// Preserve first/last and extrema in each pixel column, in sample order.
// Only drawing is reduced; tooltips, histories and exports retain every sample.

export function drawAllSparklines() {
    if (runtime.presentationMode === 'PLAYBACK') return;
    drawHistorySparklines(runtime.history);
}

export function drawHistorySparklines(displayHistory, lastIndex, replayProgress) {
    hideChartTooltip();
    if (runtime.rowLayoutNeedsMeasure) applyRowLayout();
    var breaks = getHistoryBreaks(displayHistory);
    runtime.PANEL_ROWS.forEach(function(row) {
        if (runtime.collapsedRows.has(row.key)) return;
        var key = row.key === 'withtokens' ? 'withTokens' : row.key === 'anon' ? 'anonymous' : row.key;
        drawSparkline('spark-' + row.key, key === 'roomTotal' ? roomTotalSeries(displayHistory) : displayHistory[key], row.key === 'total' ? themeColor('text') : row.key === 'roomTotal' ? themeColor('positive') : row.color,
            runtime.panelChartHeights[row.key] || row.height, displayHistory.timestamps, breaks, lastIndex, row.label, replayProgress);
    });
}
