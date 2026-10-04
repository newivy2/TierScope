
// Used only on freshly copied recording/display data, never on a live store.
/** @template T @param {T} value @returns {T} */
export function freezeRecordingData(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        for (const item of Object.values(value)) freezeRecordingData(item);
        Object.freeze(value);
    }
    return value;
}
