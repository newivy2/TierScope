import { drawAllSparklines } from './charts.js';
import { diagnostic } from './diagnostics.js';
import { clearPresentationFailure, getPresentationFailure, notePresentationFailure } from './presentation-health.js';
import { updateAcquisitionStatus } from './presentation-status.js';
import { updateDisplay, updateTrendDisplay } from './presentation.js';
import { runtime } from './runtime.js';

// Repaint committed data only. Retry never accepts a sample, writes storage or pulses.
export function presentAcceptedSample() {
    const history = runtime.history, generation = runtime.initGuard, url = location.href;
    const current = () => history === runtime.history && generation === runtime.initGuard && url === location.href;
    try {
        if (!runtime.isMinimized) drawAllSparklines();
        if (!current()) return false;
        updateDisplay();
        if (!current()) return false;
        updateTrendDisplay();
        if (!current()) return false;
        clearPresentationFailure(history, generation, url);
        updateAcquisitionStatus();
        return current();
    } catch (error) {
        if (current()) {
            const previous = getPresentationFailure(history, generation, url);
            notePresentationFailure(history, generation, url, error);
            const message = getPresentationFailure(history, generation, url);
            if (message !== previous) diagnostic('warn', 'Display unavailable; committed data retained: ' + message);
            try { updateAcquisitionStatus(); } catch (statusError) { /* A failed status view cannot affect recording. */ }
        }
        return false;
    }
}

export function retrySamplePresentation() {
    if (getPresentationFailure(runtime.history, runtime.initGuard, location.href) && runtime.presentationMode !== 'PLAYBACK') {
        presentAcceptedSample();
    }
}
