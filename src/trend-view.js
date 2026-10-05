import { compactNumber } from './format.js';
export function renderTrendDisplay(model) {
    if (model.isPlayback) return;
    var trendContainer = document.getElementById('trend-container');
    var trendHeaderLabel = document.getElementById('trend-header-label');
    if (!trendContainer) return;
    if (model.isRestored) {
        trendContainer.innerHTML = '<div style="font-size:8px;color:var(--panel-muted);text-align:center;padding:8px;">' + (model.stopped ? 'Session stopped — history remains available in Replay.' : 'Saved snapshot — trends resume after a new sample.') + '</div>';
        if (trendHeaderLabel) trendHeaderLabel.textContent = '📈 TREND';
        return;
    }
    if (!model.hasTrendBaseline) {
        trendContainer.innerHTML = '<div style="font-size:8px;color:var(--panel-faint);text-align:center;padding:8px;">Waiting for scan...</div>';
        if (trendHeaderLabel) trendHeaderLabel.textContent = '📈 TREND';
        return;
    }
    var counts = model.counts, total = model.total, withTokens = model.withTokens, anonymousCount = model.anonymousCount;
    var comparison = model.comparison;
    var comparisonCounts = comparison.counts;
    var shortSession = comparison.short;
    var actualMinutes = comparison.actualMinutes;
    if (!comparisonCounts) {
        var waitingText = model.historyLength === 1 ? 'Waiting for second scan...' : 'Waiting for scan...';
        trendContainer.innerHTML = '<div style="font-size:8px;color:var(--panel-faint);text-align:center;padding:8px;">' + waitingText + '</div>';
        if (trendHeaderLabel) trendHeaderLabel.textContent = '📈 TREND';
        return;
    }
    var getShortLabel = function() {
        if (!shortSession || actualMinutes <= 0) return '';
        if (actualMinutes < 60) return ' vs ' + actualMinutes + 'm';
        var hours = Math.floor(actualMinutes / 60);
        var mins = actualMinutes % 60;
        return ' vs ' + hours + 'h' + (mins > 0 ? mins : '');
    };
    function buildTrendItem(key, name, current, prev, isLarge = false, border = 'transparent') {
        var diff = current - prev;
        var deltaText = diff !== 0 ? (diff > 0 ? '+' : '−') + compactNumber(Math.abs(diff)) : '';
        var deltaColor = diff > 0 ? 'var(--panel-positive)' : 'var(--panel-negative)';
        // Color-coded background based on delta direction
        var bgStyle;
        if (diff > 0) {
            bgStyle = 'background:rgba(50, 205, 50, 0.22);';  // Green for positive
        } else if (diff < 0) {
            bgStyle = 'background:rgba(255, 85, 85, 0.15);';   // Red for negative
        } else {
            bgStyle = 'background:rgba(255, 215, 0, 0.15);';   // Yellow for stable
        }
        bgStyle += 'border:1px solid ' + border + ';';
        var padding = isLarge ? '6px 4px' : '2px 4px';
        var fontSize = isLarge ? '12px' : '10px';
        var deltaFont = Math.min(isLarge ? 12 : 10, Math.max(7, 14 - deltaText.length)) + 'px';
        var label = ({withTokens: 'With Tokens', total: 'Registered viewers', anonymous: 'Anons', roomTotal: 'Room Total'})[key] || model.tierLabels[key];
        var description = label + ': ' + current.toLocaleString() + '. Change ' + (diff > 0 ? '+' : '') + diff.toLocaleString() + ' from ' + prev.toLocaleString() + '.';
        return '<div data-trend-key="' + key + '" role="img" aria-label="' + description + '" title="' + description + '" style="display:flex;justify-content:center;align-items:center;gap:3px;min-width:0;min-height:' + (isLarge ? 32 : 20) + 'px;box-sizing:border-box;white-space:nowrap;' + bgStyle + 'padding:' + padding + ';border-radius:4px;">' +
            '<span aria-hidden="true" style="flex-shrink:0;font-size:' + fontSize + ';line-height:14px;">' + name + '</span>' +
            (deltaText ? '<span data-trend-delta aria-hidden="true" style="min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:' + deltaFont + ';line-height:14px;font-weight:bold;color:' + deltaColor + ';">' + deltaText + '</span>' : '') +
            '</div>';
    }
    var headerLabel = '📈 TREND';
    var shortLabel = getShortLabel();
    var rowStart = '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;padding:4px 0;">';
    var html = '';
    for (var keys of [['red', 'green', 'purple', 'pink'], ['dark-blue', 'light-blue', 'gray', 'female-trans']]) {
        html += rowStart;
        for (var key of keys) html += buildTrendItem(key, model.tierMarkers[key], counts[key] || 0, comparisonCounts[key] || 0);
        html += '</div>';
    }
    html += rowStart;
    html += buildTrendItem('withTokens', '💎', withTokens || 0, comparisonCounts.withTokens || 0, true, 'var(--panel-warning)');
    html += buildTrendItem('total', '📊', total || 0, comparisonCounts.total || 0, true);
    html += buildTrendItem('anonymous', '👻', anonymousCount || 0, comparisonCounts.anonymous || 0, true);
    html += buildTrendItem('roomTotal', '👥', model.fullRoomTotal || 0, (comparisonCounts.total || 0) + (comparisonCounts.anonymous || 0), true, 'var(--panel-accent)');
    html += '</div>';
    trendContainer.innerHTML = html;
    if (trendHeaderLabel) {
        trendHeaderLabel.textContent = headerLabel + shortLabel;
    }
}
