import { ANALYSIS_METRICS, ANALYSIS_MAX_THRESHOLDS } from './session-analysis.js';

export const ANALYSIS_PREFERENCE_KEY = 'tierscope:ui:analysis:v1';
export const DEFAULT_ANALYSIS_PREFERENCES = Object.freeze({metric: 'room', threshold: 100,
    summaryThresholds: Object.freeze([25, 50, 100]), sharedLength: true});

/** @param {unknown} input */
export function validateAnalysisPreferences(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid analysis preferences.');
    const value = /** @type {Record<string, any>} */ (input);
    if (Object.keys(value).some(key => !Object.hasOwn(DEFAULT_ANALYSIS_PREFERENCES, key)) ||
        !Object.hasOwn(ANALYSIS_METRICS, value.metric) || !Number.isSafeInteger(value.threshold) || value.threshold < 0 ||
        typeof value.sharedLength !== 'boolean' || !Array.isArray(value.summaryThresholds) ||
        !value.summaryThresholds.length || value.summaryThresholds.length > ANALYSIS_MAX_THRESHOLDS ||
        value.summaryThresholds.some(number => !Number.isSafeInteger(number) || number < 0)) throw new Error('Invalid analysis preferences.');
    return Object.freeze({metric: String(value.metric), threshold: Number(value.threshold), sharedLength: value.sharedLength,
        summaryThresholds: Object.freeze([...new Set(/** @type {number[]} */ (value.summaryThresholds))].sort((a, b) => a - b))});
}
