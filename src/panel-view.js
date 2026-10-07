import { updateCompactDashboard } from './compact-view.js';
import { anonymousRegisteredRatio, femaleTransDescription, displayHigh, displayHighDescription, displayHighLabel } from './display-values.js';
import { paintFavoriteButton } from './favorite-view.js';

export function paintPanelFrame(frame) {
    var counts = frame.counts;
    var total = frame.total;
    var withTokens = frame.withTokens;
    var anonymousCount = frame.anonymousCount;
    var fullRoomTotal = frame.fullRoomTotal;
    var roomTotalHigh = frame.roomTotalHigh;
    var displayHistory = frame.history;
    var highlights = frame.highlights;
    updateCollapsedRowStatus(frame, highlights);
    var genderRow = document.getElementById('tier-row-female-trans');
    if (genderRow) genderRow.title = femaleTransDescription(frame);
    var withTokensPct = total > 0 ? Math.round((withTokens / total) * 100) + '%' : '0%';
    var registeredPct = fullRoomTotal > 0 ? Math.round((total / fullRoomTotal) * 100) + '%' : '0%';
    var headerText = document.getElementById('header-text');
    if (headerText) {
        headerText.textContent = frame.modelName === 'unknown' ? 'TierScope' : frame.modelName;
        headerText.title = (frame.isPlayback ? 'Replay: ' : frame.stopped ? 'Stopped session: ' : frame.isRestored ? 'Saved session: ' : 'Live room: ') + frame.modelName;
    }
    var favorite = document.getElementById('btn-model-favorite');
    if (favorite) paintFavoriteButton(favorite, frame.modelName, frame.favorite);
    var miniWithTokens = document.getElementById('mini-withtokens');
    var miniWithTokensPct = document.getElementById('mini-withtokens-pct');
    var miniTotal = document.getElementById('mini-total');
    var miniTotalPct = document.getElementById('mini-total-pct');
    if (miniWithTokens) miniWithTokens.textContent = withTokens;
    if (miniWithTokensPct) miniWithTokensPct.textContent = withTokensPct;
    if (miniTotal) miniTotal.textContent = total;
    if (miniTotalPct) miniTotalPct.textContent = registeredPct;
    var miniChange = document.getElementById('mini-room-change');
    if (miniChange) miniChange.style.display = frame.minimized ? 'inline' : 'none';
    if (miniWithTokens) miniWithTokens.parentElement && (miniWithTokens.parentElement.title = 'With Tokens: ' + withTokens.toLocaleString() + ' (' + withTokensPct + ' of registered users)');
    if (miniTotal) miniTotal.parentElement && (miniTotal.parentElement.title = 'Registered: ' + total.toLocaleString() + ' (' + registeredPct + ' of room total)');
    updateCompactDashboard(frame);
    if (!frame.minimized) {
        var roomCount = document.getElementById('count-roomTotal'), roomHigh = document.getElementById('high-roomTotal');
        var roomRow = document.getElementById('tier-row-roomTotal'), roomResult = displayHigh(frame, 'roomTotal');
        if (roomCount) {
            roomCount.textContent = fullRoomTotal.toLocaleString();
            roomCount.style.fontSize = fullRoomTotal >= 100000 ? '9px' : fullRoomTotal >= 10000 ? '11px' : '14px';
        }
        if (roomHigh) { roomHigh.textContent = displayHighLabel(roomResult, true); roomHigh.title = displayHighDescription(roomResult); }
        if (roomRow) roomRow.style.background = highlights.roomTotal ? 'rgba(50, 205, 50, 0.22)' : 'rgba(255,105,180,.08)';
        frame.tierKeys.forEach(function(tier) {
            var countEl = document.getElementById('count-' + tier);
            var highEl = document.getElementById('high-' + tier);
            var rowEl = document.getElementById('tier-row-' + tier);
            var currentVal = counts[tier];
            var highResult = displayHigh(frame, tier, currentVal);
            if (countEl) countEl.textContent = currentVal;
            if (highEl) { highEl.textContent = displayHighLabel(highResult, true); highEl.title = displayHighDescription(highResult); }
            if (rowEl) {
                if (highlights && highlights[tier]) {
                    rowEl.style.background = 'rgba(50, 205, 50, 0.22)';
                } else {
                    rowEl.style.background = 'rgba(var(--panel-row-rgb),calc(0.05 * var(--tier-background-scale, 1)))';
                }
            }
        });
        
        var withTokensCountEl = document.getElementById('count-withtokens');
        var withTokensPctEl = document.getElementById('pct-withtokens');
        var withTokensHighEl = document.getElementById('high-withtokens');
        var withTokensRowEl = document.getElementById('tier-row-withtokens');
        var withTokensResult = displayHigh(frame, 'withTokens', withTokens);
        if (withTokensCountEl) withTokensCountEl.textContent = withTokens;
        if (withTokensPctEl) withTokensPctEl.textContent = withTokensPct;
        if (withTokensHighEl) { withTokensHighEl.textContent = displayHighLabel(withTokensResult, true); withTokensHighEl.title = displayHighDescription(withTokensResult); }
        if (withTokensRowEl) {
            if (highlights && highlights['withTokens']) {
                withTokensRowEl.style.background = 'rgba(50, 205, 50, 0.22)';
            } else {
                withTokensRowEl.style.background = 'rgba(255,212,59,0.15)';
            }
        }
        
        var totalEl = document.getElementById('count-total');
        var totalHighEl = document.getElementById('high-total');
        var totalRowEl = document.getElementById('tier-row-total');
        var totalResult = displayHigh(frame, 'total', total);
        if (totalEl) totalEl.textContent = total;
        if (totalHighEl) { totalHighEl.textContent = displayHighLabel(totalResult, true); totalHighEl.title = displayHighDescription(totalResult); }
        if (totalRowEl) {
            if (highlights && highlights['total']) {
                totalRowEl.style.background = 'rgba(50, 205, 50, 0.22)';
            } else {
                totalRowEl.style.background = 'rgba(var(--panel-row-rgb),0.1)';
            }
        }
        
        var fullAnonText = document.getElementById('anon-ratio-full');
        var anonHighEl = document.getElementById('high-anon');
        var anonRowEl = document.getElementById('tier-row-anon');
        var anonResult = displayHigh(frame, 'anonymous', anonymousCount);
        if (fullAnonText) {
            var anonLabel = anonymousCount > 0 ? anonymousCount.toLocaleString() : '0';
            var digits = String(Math.abs(anonymousCount)).length;
            fullAnonText.textContent = anonLabel;
            fullAnonText.style.fontSize = digits >= 6 ? '9px' : digits === 5 ? '11px' : '13px';
        }
        var anonRatio = document.getElementById('anon-registered-ratio');
        if (anonRatio) {
            var ratioLabel = anonymousRegisteredRatio(anonymousCount, total);
            anonRatio.textContent = ratioLabel;
            anonRatio.style.fontSize = ratioLabel.length > 7 ? '8px' : '9px';
            anonRatio.title = 'Anons / registered viewers: ' + ratioLabel + '. ' +
                (total > 0 ? anonymousCount.toLocaleString() + ' / ' + total.toLocaleString() + '. 1:1 means within 5% of equal.' : 'No registered viewers; ratio unavailable.');
            anonRatio.setAttribute('aria-label', anonRatio.title);
        }
        if (anonHighEl) { anonHighEl.textContent = displayHighLabel(anonResult, true); anonHighEl.title = displayHighDescription(anonResult); }
        if (anonRowEl) {
            if (highlights && highlights['anonymous']) {
                anonRowEl.style.background = 'rgba(50, 205, 50, 0.22)';
            } else {
                anonRowEl.style.background = 'rgba(136,136,136,0.15)';
            }
        }
    }
}

export function updateCollapsedRowStatus(frame, highlights) {
    frame.rows.forEach(function(row) {
        var button = document.getElementById('restore-row-' + row.key);
        if (!button) return;
        var value = row.key === 'withtokens' ? frame.withTokens : row.key === 'total' ? frame.total :
            row.key === 'anon' ? frame.anonymousCount : row.key === 'roomTotal' ? frame.fullRoomTotal : frame.counts[row.key];
        var historyKey = row.key === 'withtokens' ? 'withTokens' : row.key === 'anon' ? 'anonymous' : row.key;
        var high = displayHigh(frame, historyKey, value);
        var context = frame.isPlayback ? 'Replay' : frame.isRestored ? 'Saved sample' : 'Latest sample';
        button.title = row.label + ': ' + value.toLocaleString() + ' (' + displayHighLabel(high) +
            '). ' + displayHighDescription(high) + '. ' + context + '. Click to restore row.';
        if (row.key === 'female-trans') button.title += '\n' + femaleTransDescription(frame);
        button.setAttribute('aria-label', 'Restore ' + row.label + ' row. ' + context + ': ' + value.toLocaleString());
        button.style.background = highlights && highlights[historyKey] ?
            'rgba(50, 205, 50, 0.22)' : 'rgba(var(--panel-row-rgb),calc(0.05 * var(--tier-background-scale, 1)))';
    });
}
