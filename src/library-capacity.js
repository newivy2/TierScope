import { DEFAULT_LIBRARY_LIMITS, validateLibraryLimits } from './library-capacity-data.js';

export const LIBRARY_LIMITS_KEY = 'tierscope:library-limits:v1';

export function readLibraryLimits() {
    try {
        const raw = GM_getValue(LIBRARY_LIMITS_KEY, undefined);
        if (raw === undefined) return {...DEFAULT_LIBRARY_LIMITS};
        const record = JSON.parse(raw);
        if (record.schemaVersion !== 1) throw new Error('Unsupported storage limits.');
        return validateLibraryLimits(record);
    } catch (error) {
        // Unknown limits must not silently become permission to save more.
        throw new Error('Library storage limits could not be read. Open Storage limits to save them again, or refresh to retry.');
    }
}

export function saveLibraryLimits(value) {
    const limits = validateLibraryLimits(value), before = GM_getValue(LIBRARY_LIMITS_KEY, undefined);
    const raw = JSON.stringify({schemaVersion: 1, ...limits});
    try {
        GM_setValue(LIBRARY_LIMITS_KEY, raw);
        if (GM_getValue(LIBRARY_LIMITS_KEY, undefined) !== raw) throw new Error('Storage limits could not be verified. Refresh and retry.');
    } catch (error) {
        try {
            if (GM_getValue(LIBRARY_LIMITS_KEY, undefined) === raw) {
                if (before === undefined) GM_deleteValue(LIBRARY_LIMITS_KEY); else GM_setValue(LIBRARY_LIMITS_KEY, before);
            }
        } catch (rollbackError) { throw new Error('Storage limits could not be saved or restored. Refresh to check the current limits.'); }
        throw error;
    }
    return limits;
}
