export const LIBRARY_MEGABYTE = 1024 * 1024;
export const DEFAULT_LIBRARY_LIMITS = Object.freeze({maxSessions: 1000, maxMegabytes: 50});
export const LIBRARY_LIMIT_RANGES = Object.freeze({maxSessions: 10000, maxMegabytes: 250});
// File validation is independent of the local save allowance. A backup must
// remain readable/exportable after limits are lowered, and on a fresh browser.
export const LIBRARY_TRANSFER_MAX_COUNT = LIBRARY_LIMIT_RANGES.maxSessions;
export const LIBRARY_TRANSFER_MAX_BYTES = 300 * LIBRARY_MEGABYTE;

/** @param {unknown} value */
export function validateLibraryLimits(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        !('maxSessions' in value) || !('maxMegabytes' in value) ||
        typeof value.maxSessions !== 'number' || !Number.isSafeInteger(value.maxSessions) || value.maxSessions < 1 || value.maxSessions > LIBRARY_LIMIT_RANGES.maxSessions ||
        typeof value.maxMegabytes !== 'number' || !Number.isSafeInteger(value.maxMegabytes) || value.maxMegabytes < 1 || value.maxMegabytes > LIBRARY_LIMIT_RANGES.maxMegabytes) {
        throw new Error('Use whole numbers: 1–10,000 sessions and 1–250 MB.');
    }
    return {maxSessions: value.maxSessions, maxMegabytes: value.maxMegabytes};
}

/** @param {{count: number, bytes: number, unavailable?: string[]}} usage
 * @param {{maxSessions: number, maxMegabytes: number}} limits */
export function libraryCapacityNotice(usage, limits) {
    if (usage.unavailable?.length) return 'Some recordings could not be read. Storage usage is incomplete; new saves wait until they can be read or removed.';
    const ratio = Math.max(usage.count / limits.maxSessions, usage.bytes / (limits.maxMegabytes * LIBRARY_MEGABYTE));
    if (ratio >= 1) return 'Library limit reached. Existing sessions are kept. Raise the limits or export and remove sessions to make room.';
    if (ratio >= 0.8) return 'Library is nearing its limit. Raise the limits or export and remove sessions before it fills up.';
    return '';
}
