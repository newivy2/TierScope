/** Recorded timestamp coverage, excluding marked gaps and clock regressions. */
export function recordedCoverageMs(history) {
    let previous = 0, coveredMs = 0;
    const origin = history.timestamps[0];
    for (let i = 1; i < history.timestamps.length; i++) {
        const next = Math.max(previous, history.timestamps[i] - origin, 0);
        if (!history.breaks?.[i]) coveredMs += next - previous;
        previous = next;
    }
    return coveredMs;
}

// One reader per Library opening. Only immutable histories reuse covered time;
// model cards aggregate sessions matching the active filters, including overlaps.
export function createModelCardReader() {
    /** @type {WeakMap<{timestamps:number[],breaks?:boolean[]},number>} */
    const cache = new WeakMap();
    /** @param {{timestamps:number[],breaks?:boolean[]}} history */
    function coverage(history) {
        const immutable = Object.isFrozen(history) && Object.isFrozen(history.timestamps) &&
            (!history.breaks || Object.isFrozen(history.breaks));
        if (immutable && cache.has(history)) return cache.get(history);
        const coveredMs = recordedCoverageMs(history);
        if (immutable) cache.set(history, coveredMs);
        return coveredMs;
    }
    /** @param {{archive:{session:{history:{timestamps:number[],breaks?:boolean[]}}}}[]} entries */
    function read(entries) {
        let first = Infinity, latest = -Infinity, coveredMs = 0;
        for (const entry of entries) {
            const history = entry.archive.session.history, start = history.timestamps[0];
            if (start === undefined) continue;
            first = Math.min(first, start); latest = Math.max(latest, start); coveredMs += coverage(history);
        }
        return {first: first === Infinity ? null : first, latest: latest === -Infinity ? null : latest, coveredMs};
    }
    return {read};
}

// Dates are inclusive browser-local calendar days, based on the first retained
// sample. No timezone conversion through Date.parse('YYYY-MM-DD').
/** @param {string} text @param {boolean} after */
export function libraryDateBoundary(text, after = false) {
    if (!text) return after ? Infinity : -Infinity;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error('Use a valid calendar date.');
    const [year, month, day] = text.split('-').map(Number);
    const date = new Date(0); date.setFullYear(year, month - 1, day); date.setHours(0, 0, 0, 0);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) throw new Error('Use a valid calendar date.');
    if (after) { date.setDate(date.getDate() + 1); date.setHours(0, 0, 0, 0); }
    return date.getTime();
}

/** @param {Array<{id:string,title:string,notes?:string,modelFavorite?:boolean,archive:{room:string,session:{history:{timestamps:number[]}}}}>} entries
 * @param {{room?:string,query?:string,from?:string,to?:string,favorites?:boolean,sort?:string}} filters */
export function filterLibraryEntries(entries, filters = {}) {
    const start = libraryDateBoundary(filters.from || ''), end = libraryDateBoundary(filters.to || '', true);
    if (start >= end) throw new Error('The start date must not be after the end date.');
    const query = (filters.query || '').trim().toLowerCase(), room = (filters.room || '').toLowerCase();
    const result = entries.filter(entry => {
        const time = entry.archive.session.history.timestamps[0];
        return (!room || room === '*' || entry.archive.room.toLowerCase() === room) && time >= start && time < end &&
            (!filters.favorites || entry.modelFavorite) && (!query || (entry.title + ' ' + entry.archive.room + ' ' + (entry.notes || '')).toLowerCase().includes(query));
    });
    const byDate = (a, b) => b.archive.session.history.timestamps[0] - a.archive.session.history.timestamps[0] || a.id.localeCompare(b.id);
    return result.sort((a, b) => filters.sort === 'oldest' ? -byDate(a, b) : filters.sort === 'title' ? a.title.localeCompare(b.title) || byDate(a, b) :
        filters.sort === 'model' ? a.archive.room.localeCompare(b.archive.room) || byDate(a, b) : filters.sort === 'favorites' ? Number(!!b.modelFavorite) - Number(!!a.modelFavorite) || byDate(a, b) : byDate(a, b));
}
