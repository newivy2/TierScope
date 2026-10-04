import { hideChartTooltip } from './chart-view.js';
import { drawAllSparklines, drawHistorySparklines } from './charts.js';
import { cancelGifExport } from './gif.js';
import { setAllTimeActionStatus } from './high-feedback.js';
import { cancelHighPulses } from './high-pulses.js';
import { readAllTimeHighs } from './highs-store.js';
import { createPlaybackSnapshot, getPlaybackFrame, getPlaybackSampleIndex, isPlaybackCurrent } from './playback-data.js';
import { advanceOwnedPlayback, changeOwnedPlaybackSpeed, closeOwnedPlayback, markPlaybackPainted, moveOwnedPlayback, nextSessionFileRequest, openOwnedPlayback, pauseOwnedPlayback, resumeOwnedPlayback, seekOwnedPlayback, startOwnedPlaybackClock, stopOwnedPlaybackClock } from './playback-state.js';
import { updateAcquisitionStatus } from './presentation-status.js';
import { refreshPanelOptions, refreshScanCountdown, renderDisplayFrame, updateDisplay, updateTrendDisplay } from './presentation.js';
import { getStorageKey } from './record-validation.js';
import { runtime } from './runtime.js';
import { captureSessionFile } from './session-capture.js';
import { formatElapsedTime, getModelName, log } from './utils.js';

export function setPlaybackSamplePosition(state, position) {
    return moveOwnedPlayback(state, position);
}

export function stopPlaybackClock(state) { stopOwnedPlaybackClock(state); }

export function startPlaybackClock(state) { startOwnedPlaybackClock(state, tickPlayback); }

export function paintPlayback(state) {
    if (!isPlaybackCurrent(state)) return false;
    try {
        var index = getPlaybackSampleIndex(state.snapshot, state.positionMs, state.stepIndex);
        if (state.paintedPosition !== state.samplePosition || state.paintLayout !== runtime.chartLayoutRevision) {
            renderPlaybackFrame(getPlaybackFrame(state.snapshot, state.positionMs, state.stepIndex), state.samplePosition - index);
            markPlaybackPainted(state, runtime.chartLayoutRevision);
        }
        updatePlaybackControls();
        return true;
    } catch (error) {
        pauseOwnedPlayback(state);
        log('Playback paused after a presentation error: ' + error.message);
        try { updatePlaybackControls(); } catch (controlError) { }
        return false;
    }
}

export function enterPlayback() {
    if (runtime.playback) {
        if (isPlaybackCurrent(runtime.playback)) return true;
        leavePlayback(false);
    }
    var model = getModelName();
    if (!model || model === 'unknown' || runtime.lastUrl !== location.href ||
        runtime.activeSessionStorageKey !== getStorageKey(model) || !runtime.history.timestamps.length) return false;
    try {
        var archive = captureSessionFile();
        var snapshot = createPlaybackSnapshot(archive.session.history);
        openOwnedPlayback({url: location.href, key: runtime.activeSessionStorageKey, generation: runtime.initGuard,
            archive: archive, snapshot: snapshot, allTimeState: readAllTimeHighs(model)}, Date.now(), true);
        cancelHighPulses();
        setPlaybackLayout(true);
        if (!paintPlayback(runtime.playback)) return false;
        startPlaybackClock(runtime.playback);
        return true;
    } catch (error) {
        if (runtime.playback) {
            pauseOwnedPlayback(runtime.playback);
        }
        log('Could not start playback: ' + error.message);
        return false;
    }
}

export function leavePlayback(renderLive) {
    nextSessionFileRequest();
    setAllTimeActionStatus('');
    hideChartTooltip();
    cancelHighPulses();
    cancelGifExport();
    if (typeof renderLive === 'undefined') renderLive = true;
    if (!runtime.playback && runtime.presentationMode === 'LIVE') return false;
    var canRenderLive = renderLive && isPlaybackCurrent(runtime.playback);
    closeOwnedPlayback();
    try {
        setPlaybackLayout(false);
        if (canRenderLive) repaintLivePresentation();
        else clearPlaybackPresentation();
    } catch (error) {
        log('Could not repaint after playback: ' + error.message);
    }
    return true;
}

export function tickPlayback(expectedState) {
    if (expectedState && expectedState !== runtime.playback) return false;
    var state = runtime.playback;
    if (!isPlaybackCurrent(state)) {
        if (state) leavePlayback(false);
        return false;
    }
    if (!advanceOwnedPlayback(state, Date.now())) return false;
    return paintPlayback(state);
}

export function togglePlayback() {
    var state = runtime.playback;
    if (!isPlaybackCurrent(state)) {
        if (state) leavePlayback(false);
        return false;
    }
    if (!state.snapshot.replayDurationMs) return false;
    if (state.playing) {
        tickPlayback(state);
        pauseOwnedPlayback(state);
    } else {
        resumeOwnedPlayback(state, Date.now());
    }
    if (!paintPlayback(state)) return false;
    startPlaybackClock(state);
    return true;
}

export function scrubPlayback(samplePosition) {
    var state = runtime.playback;
    if (!isPlaybackCurrent(state)) {
        if (state) leavePlayback(false);
        return false;
    }
    var position = Number(samplePosition);
    if (!Number.isFinite(position)) return false;
    seekOwnedPlayback(state, position, Date.now());
    return paintPlayback(state);
}

export function stepPlayback(direction) {
    var state = runtime.playback;
    if (!isPlaybackCurrent(state)) return false;
    var index = getPlaybackSampleIndex(state.snapshot, state.positionMs, state.stepIndex);
    if (index < 0) return false;
    seekOwnedPlayback(state, index + direction, Date.now());
    return paintPlayback(state);
}

export function setPlaybackSpeed(value) {
    var state = runtime.playback;
    if (!isPlaybackCurrent(state)) {
        if (state) leavePlayback(false);
        return false;
    }
    var speed = Number(value);
    if ([0.5, 1, 2].indexOf(speed) === -1) return false;
    if (state.playing) tickPlayback(state);
    changeOwnedPlaybackSpeed(state, speed, Date.now());
    return paintPlayback(state);
}

export function updateReplayAvailability() {
    var button = document.getElementById('btn-replay');
    if (!button) return;
    button.disabled = !runtime.history.timestamps.length || runtime.activeSessionStorageKey !== getStorageKey(getModelName()) || location.href !== runtime.lastUrl;
    button.title = button.disabled ? 'No recorded history for this room yet' : 'Replay recorded history; live acquisition continues';
}

export function bindPlaybackControls() {
    var bindings = { 'btn-replay': enterPlayback, 'playback-play': togglePlayback,
        'playback-previous': function() { stepPlayback(-1); },
        'playback-next': function() { stepPlayback(1); },
        'playback-return': function() { leavePlayback(true); } };
    Object.keys(bindings).forEach(function(id) {
        var button = document.getElementById(id);
        if (button) button.onclick = bindings[id];
    });
    var slider = document.getElementById('playback-scrubber');
    if (slider) slider.oninput = function() { scrubPlayback(Number(this.value)); };
    var speed = document.getElementById('playback-speed');
    if (speed) speed.onchange = function() { setPlaybackSpeed(Number(this.value)); };
}

export function setPlaybackLayout(active) {
    if (active) {
        runtime.playbackLayoutState = [];
        var toggle = document.getElementById('btn-toggle');
        if (toggle) toggle.disabled = true;
        [['live-trend', 'visibility', 'hidden'], ['control-field', 'visibility', 'hidden'],
            ['acquisition-status', 'visibility', 'hidden'],
            ['btn-toggle', 'visibility', 'hidden'], ['playback-controls', 'display', 'grid']].forEach(function(change) {
            var element = document.getElementById(change[0]);
            if (!element) return;
            runtime.playbackLayoutState.push({ element: element, property: change[1], value: element.style[change[1]] || '' });
            element.style[change[1]] = change[2];
        });
    } else if (runtime.playbackLayoutState) {
        runtime.playbackLayoutState.forEach(function(saved) { saved.element.style[saved.property] = saved.value; });
        runtime.playbackLayoutState = null;
        var toggle = document.getElementById('btn-toggle');
        if (toggle) toggle.disabled = false;
    }
}

export function updatePlaybackControls() {
    if (!runtime.playback) return;
    refreshPanelOptions();
    var label = document.getElementById('playback-label');
    if (label) { label.textContent = runtime.playback.imported ? 'FILE REPLAY' : 'PLAYBACK'; label.title = runtime.playback.archive ? runtime.playback.archive.room : ''; }
    var room = document.getElementById('playback-room');
    if (room) {
        var sourceRoom = runtime.playback.imported && runtime.playback.archive ? runtime.playback.archive.room : '';
        room.textContent = sourceRoom ? 'Room: ' + sourceRoom : '';
        room.title = sourceRoom ? 'Saved session from ' + sourceRoom : '';
        room.style.display = sourceRoom ? 'block' : 'none';
    }
    var fileControls = document.getElementById('playback-file-controls');
    if (fileControls) fileControls.style.display = runtime.playback.imported ? 'flex' : 'none';
    // A saved/empty trend is shorter than the live trend grid. The hidden
    // Controls area below it provides room for the file label without
    // changing the panel's dimensions.
    var controls = document.getElementById('playback-controls');
    if (controls) controls.style.minHeight = runtime.playback.imported ? '66px' : '';
    var back = document.getElementById('playback-return');
    if (back) { back.textContent = runtime.playback.imported ? 'Close Replay' : 'Return to Live'; back.title = runtime.playback.imported ? 'Close this file and return to the current room session' : 'Return to the current room session'; }
    var index = getPlaybackSampleIndex(runtime.playback.snapshot, runtime.playback.positionMs, runtime.playback.stepIndex);
    var previous = document.getElementById('playback-previous');
    var next = document.getElementById('playback-next');
    if (previous) previous.disabled = index <= 0;
    if (next) next.disabled = index < 0 || index === runtime.playback.snapshot.timeline.length - 1;
    var button = document.getElementById('playback-play');
    if (button) {
        button.textContent = runtime.playback.playing ? 'Pause' : 'Play';
        button.disabled = runtime.playback.snapshot.replayDurationMs === 0;
        button.title = runtime.playback.playing ? 'Pause playback only' : 'Play recorded samples at an even pace';
    }
    var slider = document.getElementById('playback-scrubber');
    if (slider) {
        slider.max = String(Math.max(0, runtime.playback.snapshot.timeline.length - 1));
        slider.value = String(runtime.playback.samplePosition);
        slider.disabled = runtime.playback.snapshot.replayDurationMs === 0;
        slider.setAttribute('aria-valuetext', 'Sample ' + (index + 1) + ' of ' + runtime.playback.snapshot.timeline.length);
    }
    var speed = document.getElementById('playback-speed');
    if (speed) speed.value = String(runtime.playback.speed);
    var position = document.getElementById('playback-position');
    if (position) {
        position.textContent = formatElapsedTime(runtime.playback.positionMs) + ' / ' + formatElapsedTime(runtime.playback.snapshot.durationMs);
        position.title = 'Sample ' + (index + 1) + ' of ' + runtime.playback.snapshot.timeline.length + '. Samples play at an even pace; the time display and chart gaps retain recorded timing. The moving line connects recorded samples; counts and highs change only at a recorded sample. Live acquisition continues independently.';
        if (runtime.playback.archive) position.title += '\n' + runtime.playback.archive.room + ' · ' +
            new Date(runtime.playback.archive.session.timestamp).toLocaleString() + ' · Active time: ' + formatElapsedTime(runtime.playback.archive.session.pausedElapsedTime) +
            (runtime.playback.archive.session.isStopped ? ' · Stopped session' : runtime.playback.archive.session.isPaused ? ' · Paused session' : ' · Running session snapshot');
    }
}

export function renderPlaybackFrame(frame, progress) {
    renderDisplayFrame(Object.assign({}, frame, { isPlayback: true }));
    drawHistorySparklines(frame.history, frame.historyEndIndex, progress);
}

export function clearPlaybackPresentation() {
    var emptyHistory = { timestamps: [] };
    var counts = {};
    runtime.STORAGE_HISTORY_SERIES.forEach(function(key) { emptyHistory[key] = []; counts[key] = 0; });
    renderDisplayFrame({ counts: counts, total: 0, withTokens: 0, anonymousCount: 0,
        fullRoomTotal: 0, roomTotalHigh: 0, history: emptyHistory, isPlayback: false });
    drawHistorySparklines(emptyHistory);
}

export function repaintLivePresentation() {
    updateDisplay();
    updateTrendDisplay();
    drawAllSparklines();
    updateAcquisitionStatus();
    refreshScanCountdown();
}
