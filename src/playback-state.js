/** @typedef {import('./playback-types').PlaybackData} PlaybackData */
/** @typedef {import('./playback-types').PlaybackView} PlaybackView */
/** @typedef {import('./playback-types').PlaybackRoot} PlaybackRoot */

// The only writer of playback position, source, speed, clock and file requests.
// Views keep their identity while their getters expose the current owned values.
// Recording data is copied and frozen once, not recopied on every animation tick.
export const PLAYBACK_FIELDS = Object.freeze(['playback', 'presentationMode', 'sessionFileLoadGeneration']);
/** @type {PlaybackRoot} */
let playbackState;
/** @type {import('./playback-types').PlaybackClock} */
let playbackClock;
/** @type {WeakMap<PlaybackView, PlaybackData>} */
const playbackRecords = new WeakMap();

/** @param {PlaybackRoot} target @param {import('./playback-types').PlaybackClock} clock */
export function initializePlaybackState(target, clock) {
    playbackState = {playback: target.playback, presentationMode: target.presentationMode,
        sessionFileLoadGeneration: target.sessionFileLoadGeneration};
    playbackClock = clock;
    for (const key of PLAYBACK_FIELDS) {
        Object.defineProperty(target, key, {enumerable: true, configurable: false, get: () => playbackState[key]});
    }
}

/** @template T @param {T} value @returns {T} */
function copyPlaybackData(value) {
    if (Array.isArray(value)) return /** @type {T} */ (Object.freeze(value.map(item => copyPlaybackData(item))));
    if (value && typeof value === 'object') return /** @type {T} */ (Object.freeze(Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, copyPlaybackData(item)]))));
    return value;
}

/** @param {PlaybackView} view */
function activePlaybackData(view) {
    return view && view === playbackState.playback ? playbackRecords.get(view) : null;
}

/** @param {import('./playback-types').PlaybackOptions} options @param {number} now @param {boolean} playing */
export function openOwnedPlayback(options, now, playing) {
    closeOwnedPlayback();
    /** @type {PlaybackData} */
    const data = {url: options.url, key: options.key, generation: options.generation, imported: options.imported === true,
        archive: copyPlaybackData(options.archive), snapshot: copyPlaybackData(options.snapshot),
        allTimeState: copyPlaybackData(options.allTimeState), positionMs: 0, samplePosition: 0, stepIndex: 0,
        speed: 1, lastTickAt: now, playing: playing && options.snapshot.replayDurationMs > 0, timer: null,
        paintedPosition: undefined, paintLayout: undefined};
    const view = /** @type {PlaybackView} */ (Object.create(null));
    for (const key of Object.keys(data)) Object.defineProperty(view, key, {enumerable: true, get: () => data[key]});
    Object.freeze(view);
    playbackRecords.set(view, data);
    playbackState.playback = view;
    playbackState.presentationMode = 'PLAYBACK';
    return view;
}

export function nextSessionFileRequest() { return ++playbackState.sessionFileLoadGeneration; }

export function closeOwnedPlayback() {
    stopOwnedPlaybackClock(playbackState.playback);
    playbackState.playback = null;
    playbackState.presentationMode = 'LIVE';
}

/** @param {PlaybackView} view */
export function stopOwnedPlaybackClock(view) {
    const data = view && playbackRecords.get(view);
    if (!data || data.timer === null) return;
    playbackClock.stop(data.timer);
    data.timer = null;
}

/** @param {PlaybackView} view @param {(view: PlaybackView) => unknown} tick */
export function startOwnedPlaybackClock(view, tick) {
    const data = activePlaybackData(view);
    if (!data || !data.playing || data.timer !== null) return;
    data.timer = playbackClock.start(() => { if (activePlaybackData(view)) tick(view); });
}

/** @param {PlaybackData} data @param {number} position */
function movePlaybackPosition(data, position) {
    const last = data.snapshot.timeline.length - 1;
    data.samplePosition = Math.max(0, Math.min(last, position));
    if (Math.abs(data.samplePosition - Math.round(data.samplePosition)) < 1e-9) data.samplePosition = Math.round(data.samplePosition);
    data.stepIndex = Math.floor(data.samplePosition);
    const time = data.snapshot.timeline[data.stepIndex], nextTime = data.snapshot.timeline[Math.min(last, data.stepIndex + 1)];
    data.positionMs = time + (nextTime - time) * (data.samplePosition - data.stepIndex);
}

/** @param {PlaybackView} view @param {number} position */
export function moveOwnedPlayback(view, position) {
    const data = activePlaybackData(view);
    if (!data || !Number.isFinite(position)) return false;
    movePlaybackPosition(data, position);
    return true;
}

/** @param {PlaybackView} view @param {number} now */
export function advanceOwnedPlayback(view, now) {
    const data = activePlaybackData(view);
    if (!data || !data.playing) return false;
    const elapsed = Math.max(0, now - data.lastTickAt);
    data.lastTickAt = now;
    const last = data.snapshot.timeline.length - 1;
    const rate = data.snapshot.replayDurationMs > 0 ? last / data.snapshot.replayDurationMs : 0;
    movePlaybackPosition(data, data.samplePosition + elapsed * rate * data.speed);
    if (data.samplePosition >= last) pauseOwnedPlayback(view);
    return true;
}

/** @param {PlaybackView} view */
export function pauseOwnedPlayback(view) {
    const data = activePlaybackData(view);
    if (!data) return false;
    data.playing = false;
    stopOwnedPlaybackClock(view);
    return true;
}

/** @param {PlaybackView} view @param {number} now */
export function resumeOwnedPlayback(view, now) {
    const data = activePlaybackData(view);
    if (!data || !data.snapshot.replayDurationMs) return false;
    if (data.samplePosition >= data.snapshot.timeline.length - 1) movePlaybackPosition(data, 0);
    data.playing = true;
    data.lastTickAt = now;
    return true;
}

/** @param {PlaybackView} view @param {number} position @param {number} now */
export function seekOwnedPlayback(view, position, now) {
    const data = activePlaybackData(view);
    if (!data || !Number.isFinite(position)) return false;
    pauseOwnedPlayback(view);
    movePlaybackPosition(data, position);
    data.lastTickAt = now;
    return true;
}

/** @param {PlaybackView} view @param {number} speed @param {number} now */
export function changeOwnedPlaybackSpeed(view, speed, now) {
    const data = activePlaybackData(view);
    if (!data || ![0.5, 1, 2].includes(speed)) return false;
    data.speed = speed;
    data.lastTickAt = now;
    return true;
}

/** @param {PlaybackView} view @param {number} revision */
export function markPlaybackPainted(view, revision) {
    const data = activePlaybackData(view);
    if (!data) return;
    data.paintedPosition = data.samplePosition;
    data.paintLayout = revision;
}

/** @param {PlaybackView} view @param {object} records */
export function setPlaybackAllTimeState(view, records) {
    const data = activePlaybackData(view);
    if (!data) return false;
    data.allTimeState = copyPlaybackData(records);
    return true;
}
