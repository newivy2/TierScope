import { displayedAllTimeState } from './high-selectors.js';
import { runtime } from './runtime.js';
import { log } from './utils.js';
export function cancelHighPulse(key) {
    var animation = runtime.highPulseAnimations.get(key);
    runtime.highPulseAnimations.delete(key);
    if (animation) {
        try { animation.cancel(); } catch (error) { /* A decoration must not affect tracking. */ }
    }
}

export function cancelHighPulses() {
    Array.from(runtime.highPulseAnimations.keys()).forEach(cancelHighPulse);
}

// Called once, after a live sample commits successfully. Rendering, Replay,
// restoration and layout changes never generate notification events.
export function pulseAcceptedHighs(priorState) {
    try {
        if (runtime.presentationMode !== 'LIVE' || runtime.isMinimized || runtime.restoredDisplayFrame ||
            document.visibilityState === 'hidden' || (runtime.highPulseMotion && runtime.highPulseMotion.matches)) {
            cancelHighPulses();
            return;
        }
        runtime.PANEL_ROWS.forEach(function(row) {
            var key = row.key === 'withtokens' ? 'withTokens' : row.key === 'anon' ? 'anonymous' : row.key;
            var atHigh = runtime.newHighTiers[key], wasAtHigh = priorState.newHighTiers[key];
            var previousHigh = priorState.sessionHighs[key];
            var raisedHigh = runtime.sessionHighs[key].value > (previousHigh ? previousHigh.value : 0);
            if (runtime.highMode === 'ath') {
                var high = displayedAllTimeState().highs[key], before = priorState.allTimeHighs[key];
                var current = runtime.history[key][runtime.history[key].length - 1];
                var oldValue = priorState.history[key][priorState.history[key].length - 1];
                atHigh = high.source && current > 0 && current >= high.value;
                wasAtHigh = priorState.lastAcceptedAcquisition && before.source && oldValue > 0 && oldValue >= before.value;
                raisedHigh = high.value > before.value;
            }
            if (!atHigh) { cancelHighPulse(row.key); return; }
            if (wasAtHigh && !raisedHigh) return;
            var target = document.getElementById((runtime.collapsedRows.has(row.key) ? 'restore-row-' : 'tier-row-') + row.key);
            if (!target || typeof target.animate !== 'function') return;
            cancelHighPulse(row.key);
            var animation = target.animate([
                { backgroundColor: 'rgba(50, 205, 50, 0.22)', boxShadow: 'inset 0 0 0 1px rgba(105, 190, 69, 0)', offset: 0 },
                { backgroundColor: 'rgba(50, 205, 50, 0.40)', boxShadow: 'inset 0 0 0 1px rgba(105, 190, 69, 0.75)', offset: 0.5 },
                { backgroundColor: 'rgba(50, 205, 50, 0.22)', boxShadow: 'inset 0 0 0 1px rgba(105, 190, 69, 0)', offset: 1 }
            ], { duration: 850, iterations: 2, easing: 'ease-in-out', fill: 'none' });
            runtime.highPulseAnimations.set(row.key, animation);
            animation.onfinish = animation.oncancel = function() {
                if (runtime.highPulseAnimations.get(row.key) === animation) runtime.highPulseAnimations.delete(row.key);
            };
        });
    } catch (error) { log('High pulse unavailable: ' + error.message); }
}

