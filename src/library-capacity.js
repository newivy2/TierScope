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

// Local automatic-keeping preference; imports/backups do not enable or alter it.
export const AUTOMATIC_KEEPING_KEY = 'tierscope:automatic-keeping:v1';
export function readAutomaticKeepingMinutes() {
    try {
        const raw = GM_getValue(AUTOMATIC_KEEPING_KEY, undefined);
        if (raw === undefined) return 5;
        const record = JSON.parse(raw);
        if (record.schemaVersion !== 1) throw new Error('Unsupported automatic keeping settings.');
        return validateAutomaticKeepingMinutes(record.minimumMinutes);
    } catch (error) { throw new Error('Automatic keeping settings could not be read. Save them again in Library → Storage limits → Automatic keeping.'); }
}
function validateAutomaticKeepingMinutes(value) {
    if (!Number.isInteger(value) || value < 0 || value > 1440) throw new Error('Choose a whole number from 0 to 1,440 minutes.');
    return value;
}
export function saveAutomaticKeepingMinutes(value) {
    const minutes = validateAutomaticKeepingMinutes(value), before = GM_getValue(AUTOMATIC_KEEPING_KEY, undefined);
    const raw = JSON.stringify({schemaVersion: 1, minimumMinutes: minutes});
    try {
        GM_setValue(AUTOMATIC_KEEPING_KEY, raw);
        if (GM_getValue(AUTOMATIC_KEEPING_KEY, undefined) !== raw) throw new Error('Automatic keeping settings could not be verified.');
    } catch (error) {
        if (GM_getValue(AUTOMATIC_KEEPING_KEY, undefined) === raw) {
            if (before === undefined) GM_deleteValue(AUTOMATIC_KEEPING_KEY); else GM_setValue(AUTOMATIC_KEEPING_KEY, before);
        }
        throw error;
    }
    return minutes;
}
