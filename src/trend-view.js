
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
    // UPDATED: Removed arrows/dots, using color-coded backgrounds only
    function buildTrendItem(name, current, prev, isSpecial, isLarge) {
        var diff = current - prev;
        var deltaText = diff !== 0 ? (diff > 0 ? '+' + diff : diff) : '';
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
        if (isSpecial) bgStyle += 'border:1px solid #ff69b4;';
        var padding = isLarge ? '6px 12px' : '2px 6px';
        var fontSize = isLarge ? '12px' : '10px';
        var deltaFont = fontSize;
        if (deltaText) {
            var dlen = String(Math.abs(diff)).length;
            if (dlen >= 4) deltaFont = '8px';
            else if (dlen === 3) deltaFont = '10px';
        }
        // Removed the trendIcon span - only colors indicate direction now
        return '<div style="display:flex;align-items:center;gap:4px;' + bgStyle + 'padding:' + padding + ';border-radius:4px;">' +
            '<span style="font-size:' + fontSize + ';">' + name + '</span>' +
            (deltaText ? '<span style="font-size:' + deltaFont + ';font-weight:bold;color:' + deltaColor + ';">' + deltaText + '</span>' : '') +
            '</div>';
    }
    var headerLabel = '📈 TREND';
    var shortLabel = getShortLabel();
    var html = '<div style="display:flex;justify-content:center;gap:6px;padding:4px 0;">';
    html += buildTrendItem(model.tierMarkers['red'], counts['red'] || 0, comparisonCounts['red'] || 0, false, false);
    html += buildTrendItem(model.tierMarkers['green'], counts['green'] || 0, comparisonCounts['green'] || 0, false, false);
    html += buildTrendItem(model.tierMarkers['purple'], counts['purple'] || 0, comparisonCounts['purple'] || 0, false, false);
    html += buildTrendItem(model.tierMarkers['pink'], counts['pink'] || 0, comparisonCounts['pink'] || 0, false, false);
    html += '</div>';
    html += '<div style="display:flex;justify-content:center;gap:6px;padding:4px 0;">';
    html += buildTrendItem(model.tierMarkers['dark-blue'], counts['dark-blue'] || 0, comparisonCounts['dark-blue'] || 0, false, false);
    html += buildTrendItem(model.tierMarkers['light-blue'], counts['light-blue'] || 0, comparisonCounts['light-blue'] || 0, false, false);
    html += buildTrendItem(model.tierMarkers['gray'], counts['gray'] || 0, comparisonCounts['gray'] || 0, false, false);
    html += buildTrendItem(model.tierMarkers['female-trans'], counts['female-trans'] || 0, comparisonCounts['female-trans'] || 0, false, false);
    html += '</div>';
    html += '<div style="display:flex;justify-content:center;gap:8px;padding:4px 0;">';
    html += buildTrendItem('💎', withTokens || 0, comparisonCounts.withTokens || 0, true, true);
    html += buildTrendItem('📊', total || 0, comparisonCounts.total || 0, false, true);
    html += buildTrendItem('👻', anonymousCount || 0, comparisonCounts.anonymous || 0, false, true);
    html += '</div>';
    trendContainer.innerHTML = html;
    if (trendHeaderLabel) {
        trendHeaderLabel.textContent = headerLabel + shortLabel;
    }
}
