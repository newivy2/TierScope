import { appendCurrentSessionSample } from './live-session.js';
import { drawAllSparklines, getHistoryBreaks } from './charts.js';
import { runtime } from './runtime.js';

export function getSessionSamplePolicy() {
    return {breaks: getHistoryBreaks(runtime.history), intervalSeconds: runtime.scanIntervalSeconds,
        lastIntervalSeconds: runtime.lastScheduledIntervalSeconds, timeoutMs: runtime.API_TIMEOUT_MS};
}

export function saveToHistory() {
    appendCurrentSessionSample(Date.now(), getSessionSamplePolicy());
    if (!runtime.isMinimized) drawAllSparklines();
}
