import { buildLiveDisplayFrame, buildPanelDisplayModel, buildTrendDisplayModel } from './display-model.js';
import { paintPanelFrame } from './panel-view.js';
import { runtime } from './runtime.js';
import { renderTrendDisplay } from './trend-view.js';

// Concrete callbacks are wired once by bootstrap; views do not import controls.
let presentationEffects;
export function initializePresentation(effects) { presentationEffects = effects; }
export function updateDisplay() {
    presentationEffects.refreshReplayAvailability();
    if (runtime.presentationMode !== 'PLAYBACK') renderDisplayFrame(buildLiveDisplayFrame());
}
export function renderDisplayFrame(frame) {
    presentationEffects.refreshOptions();
    paintPanelFrame(buildPanelDisplayModel(frame));
}

export function updateTrendDisplay() {
    if (runtime.presentationMode === 'PLAYBACK') return;
    renderTrendDisplay(buildTrendDisplayModel());
}

export function refreshPanelOptions() { presentationEffects.refreshOptions(); }
export function refreshScanCountdown() { presentationEffects.refreshCountdown(); }
