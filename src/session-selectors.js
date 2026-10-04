import { runtime } from './runtime.js';

export function getComparisonCounts() {
    var comparisonNow = runtime.isStopped ? (runtime.history.timestamps[runtime.history.timestamps.length - 1] || runtime.stoppedAt) : Date.now();
    if (runtime.trendComparisonMode === 'last') {
        if (runtime.history.timestamps.length < 2) {
            return { counts: null, short: false, actualMinutes: 0 };
        }
        var lastIdx = runtime.history.timestamps.length - 2;
        var actualMinutes = Math.round((comparisonNow - runtime.history.timestamps[lastIdx]) / 60000);
        return {
            counts: {
                'red': runtime.history['red'][lastIdx] || 0,
                'green': runtime.history['green'][lastIdx] || 0,
                'purple': runtime.history['purple'][lastIdx] || 0,
                'pink': runtime.history['pink'][lastIdx] || 0,
                'dark-blue': runtime.history['dark-blue'][lastIdx] || 0,
                'light-blue': runtime.history['light-blue'][lastIdx] || 0,
                'gray': runtime.history['gray'][lastIdx] || 0,
                'female-trans': runtime.history['female-trans'][lastIdx] || 0,
                'withTokens': runtime.history['withTokens'][lastIdx] || 0,
                'total': runtime.history['total'][lastIdx] || 0,
                'anonymous': runtime.history['anonymous'][lastIdx] || 0
            },
            short: false,
            actualMinutes: actualMinutes
        };
    }
    if (runtime.trendComparisonMode === 'start') {
        if (runtime.history.timestamps.length === 0) {
            return {
                counts: {
                    'red': 0, 'green': 0, 'purple': 0, 'pink': 0,
                    'dark-blue': 0, 'light-blue': 0, 'gray': 0, 'female-trans': 0,
                    'withTokens': 0, 'total': 0, 'anonymous': 0
                },
                short: false,
                actualMinutes: 0
            };
        }
        var startMinutes = Math.round((comparisonNow - runtime.history.timestamps[0]) / 60000);
        return {
            counts: {
                'red': runtime.history['red'][0] || 0,
                'green': runtime.history['green'][0] || 0,
                'purple': runtime.history['purple'][0] || 0,
                'pink': runtime.history['pink'][0] || 0,
                'dark-blue': runtime.history['dark-blue'][0] || 0,
                'light-blue': runtime.history['light-blue'][0] || 0,
                'gray': runtime.history['gray'][0] || 0,
                'female-trans': runtime.history['female-trans'][0] || 0,
                'withTokens': runtime.history['withTokens'][0] || 0,
                'total': runtime.history['total'][0] || 0,
                'anonymous': runtime.history['anonymous'][0] || 0
            },
            short: false,
            actualMinutes: startMinutes
        };
    }
    var preset = runtime.TREND_PRESETS[runtime.trendComparisonMode];
    if (!preset || preset.ms <= 0) return { counts: runtime.previousCounts, short: false, actualMinutes: 0 };
    var targetTime = comparisonNow - preset.ms;
    var idx = -1;
    for (var i = 0; i < runtime.history.timestamps.length; i++) {
        if (runtime.history.timestamps[i] <= targetTime) {
            idx = i;
        } else {
            break;
        }
    }
    var short = idx === -1;
    if (short) idx = 0;
    if (idx === -1 || runtime.history.timestamps.length === 0) {
        return { counts: runtime.previousCounts, short: false, actualMinutes: 0 };
    }
    var actualMs = comparisonNow - runtime.history.timestamps[idx];
    var actualMinutes = Math.round(actualMs / 60000);
    return {
        counts: {
            'red': runtime.history['red'][idx] || 0,
            'green': runtime.history['green'][idx] || 0,
            'purple': runtime.history['purple'][idx] || 0,
            'pink': runtime.history['pink'][idx] || 0,
            'dark-blue': runtime.history['dark-blue'][idx] || 0,
            'light-blue': runtime.history['light-blue'][idx] || 0,
            'gray': runtime.history['gray'][idx] || 0,
            'female-trans': runtime.history['female-trans'][idx] || 0,
            'withTokens': runtime.history['withTokens'][idx] || 0,
            'total': runtime.history['total'][idx] || 0,
            'anonymous': runtime.history['anonymous'][idx] || 0
        },
        short: short,
        actualMinutes: actualMinutes
    };
}

export function isAbsencePaused() {
    return runtime.absencePausedAt !== null && runtime.isPaused && runtime.isAutoRefreshOn && !runtime.isStopped;
}

export function absencePauseDescription() {
    return 'Recording and elapsed time paused after 15 minutes without the broadcaster. ' +
        'API return checks every minute, subject to retry restrictions. A confirmed return resumes recording. ' +
        'Automatic Stop at ' + new Date(runtime.absencePausedAt + runtime.ABSENCE_STOP_MS).toLocaleString() +
        ' (3 hours after auto-pause). Use Resume to keep recording during this absence.';
}

export function getEffectiveScanIntervalSeconds() {
    if (isAbsencePaused()) return runtime.ABSENCE_CHECK_SECONDS;
    if (runtime.absenceOverrideActive) return runtime.scanIntervalSeconds;
    if (runtime.broadcasterAbsence.missing < 2 || runtime.broadcasterAbsence.since === null) return runtime.scanIntervalSeconds;
    return Math.max(runtime.scanIntervalSeconds, Date.now() - runtime.broadcasterAbsence.since >= 10 * 60000 ? 300 : 120);
}

export function stopDescription() {
    return runtime.stopReason === 'absence' ? (runtime.absencePausedAt !== null ?
        'Stopped after 3 hours auto-paused for broadcaster absence' : 'Stopped after 3 hours of broadcaster absence') : 'Session stopped';
}
