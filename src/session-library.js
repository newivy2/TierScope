import { validateSessionFile } from './files.js';
import { makeStorageId } from './storage.js';

export const LIBRARY_PREFIX = 'tierscope:library:v1:';
export const LIBRARY_MAX_COUNT = 500;
export const LIBRARY_MAX_BYTES = 25 * 1024 * 1024;

export function libraryRecordKey(id) {
    if (typeof id !== 'string' || !/^[a-z0-9_-]{1,100}$/i.test(id)) throw new Error('Invalid library record.');
    return LIBRARY_PREFIX + id;
}

export function libraryTitle(title) {
    if (typeof title !== 'string' || title.length > 80 || /[\x00-\x1f]/.test(title)) throw new Error('Use a title of up to 80 characters.');
    return title.trim();
}

export function libraryIdentity(archive) {
    // Export time and producer version do not make a new recording.
    return JSON.stringify({ room: archive.room.toLowerCase(), session: { ...archive.session, timestamp: 0 } });
}

export function librarySessionKey(archive) {
    return archive.room.toLowerCase() + ':' + (archive.session.sessionStartedAt ?? archive.session.history.timestamps[0]);
}

// 1: incoming is fuller/newer; -1: the existing copy is fuller/newer;
// 0: unchanged; null: different or conflicting recordings, keep separately.
export function compareLibrarySessions(existing, incoming) {
    if (librarySessionKey(existing) !== librarySessionKey(incoming)) return null;
    if (libraryIdentity(existing) === libraryIdentity(incoming)) return 0;
    const a = existing.session, b = incoming.session, ah = a.history, bh = b.history;
    const at = ah.timestamps, bt = bh.timestamps;
    let ai = at.indexOf(bt[0]), bi = 0;
    if (ai < 0) { ai = 0; bi = bt.indexOf(at[0]); }
    if (bi < 0) {
        // After history rollover there may be no overlap. Only a known session
        // start can link those copies; estimated legacy starts are ambiguous.
        if (a.sessionStartEstimated || b.sessionStartEstimated ||
            !(at.at(-1) < bt[0] || bt.at(-1) < at[0])) return null;
    } else {
        const series = Object.keys(ah).filter(key => key !== 'timestamps' && key !== 'breaks');
        for (; ai < at.length && bi < bt.length; ai++, bi++) {
            if (at[ai] !== bt[bi] || series.some(key => ah[key][ai] !== bh[key][bi]) ||
                (ai > 0 && bi > 0 && ah.breaks[ai] !== bh.breaks[bi])) return null;
        }
    }
    const dominates = (left, right) => left.history.timestamps.length >= right.history.timestamps.length &&
        left.history.timestamps.at(-1) >= right.history.timestamps.at(-1) && left.roomTotalHigh >= right.roomTotalHigh &&
        Object.keys(right.sessionHighs).every(key => left.sessionHighs[key].value >= right.sessionHighs[key].value);
    const newer = dominates(b, a), older = dominates(a, b);
    if (newer && older) return b.timestamp > a.timestamp ? 1 : -1;
    return newer ? 1 : older ? -1 : null;
}

export function readSessionLibrary() {
    const entries = [], damaged = [], sessions = new Map();
    let bytes = 0;
    for (const key of GM_listValues().filter(key => key.startsWith(LIBRARY_PREFIX))) {
        const raw = GM_getValue(key, null);
        if (raw === null) continue;
        bytes += new Blob([typeof raw === 'string' ? raw : JSON.stringify(raw)]).size;
        try {
            const record = JSON.parse(raw);
            if (record.schemaVersion !== 1 || !Number.isSafeInteger(record.addedAt) || record.addedAt < 0) throw new Error('Invalid library record.');
            const id = key.slice(LIBRARY_PREFIX.length);
            libraryRecordKey(id);
            const entry = { id, title: libraryTitle(record.title), addedAt: record.addedAt, archive: validateSessionFile(record.archive), records: [{ key, value: raw }] };
            const sessionKey = librarySessionKey(entry.archive), siblings = sessions.get(sessionKey) || [];
            const previous = siblings.find(other => compareLibrarySessions(other.archive, entry.archive) !== null);
            if (previous) {
                const records = previous.records.concat(entry.records), addedAt = Math.min(previous.addedAt, entry.addedAt);
                if (compareLibrarySessions(previous.archive, entry.archive) === 1) Object.assign(previous, entry);
                previous.records = records; previous.addedAt = addedAt;
            } else { entries.push(entry); siblings.push(entry); sessions.set(sessionKey, siblings); }
        } catch (error) { damaged.push(key); }
    }
    entries.sort((a, b) => b.archive.session.history.timestamps[0] - a.archive.session.history.timestamps[0] || b.addedAt - a.addedAt || a.id.localeCompare(b.id));
    return { entries, damaged, bytes, count: entries.length + damaged.length };
}

export function planLibraryAdditions(incoming, library = readSessionLibrary()) {
    const entries = library.entries.slice(), writes = [];
    let bytes = library.bytes;
    for (const entry of incoming) {
        const archive = validateSessionFile(entry.archive);
        const index = entries.findIndex(saved => compareLibrarySessions(saved.archive, archive) !== null);
        const previous = index >= 0 ? entries[index] : null;
        if (previous && compareLibrarySessions(previous.archive, archive) !== 1) continue;
        const title = previous ? previous.title : libraryTitle(entry.title || archive.room);
        const id = makeStorageId();
        const addedAt = previous ? previous.addedAt : Date.now();
        const raw = JSON.stringify({ schemaVersion: 1, addedAt, title, archive }), key = libraryRecordKey(id);
        // Retain the old copy until every new write has succeeded. Budget for
        // that temporary space too; a failed update must leave it recoverable.
        bytes += new Blob([raw]).size;
        writes.push({ key, value: raw, id, updated: !!previous, replaces: previous ? previous.records : [] });
        const next = { id, title, addedAt, archive, records: [{ key, value: raw }] };
        if (previous) entries[index] = next; else entries.push(next);
    }
    if (library.count - library.entries.length + entries.length > LIBRARY_MAX_COUNT || bytes > LIBRARY_MAX_BYTES) {
        throw new Error('Library full (' + LIBRARY_MAX_COUNT + ' recordings / ' + LIBRARY_MAX_BYTES / 1024 / 1024 + ' MB). Export and remove recordings before adding more.');
    }
    return writes;
}

export function finalizeLibraryWrites(writes) {
    for (const write of writes) for (const old of write.replaces) {
        try { if (GM_getValue(old.key, null) === old.value) GM_deleteValue(old.key); }
        catch (error) { /* Redundant snapshots remain recoverable and read as one recording. */ }
    }
}

export function keepSessionInLibrary(archive, title = '') {
    const library = readSessionLibrary(), clean = validateSessionFile(archive);
    const writes = planLibraryAdditions([{ archive: clean, title }], library);
    if (!writes.length) return { added: false, updated: false,
        id: library.entries.find(entry => compareLibrarySessions(entry.archive, clean) !== null).id };
    try {
        GM_setValue(writes[0].key, writes[0].value);
        verifyLibraryCapacity();
    } catch (error) {
        try { if (GM_getValue(writes[0].key, null) === writes[0].value) GM_deleteValue(writes[0].key); }
        catch (cleanupError) { throw new Error('Library save could not be completed or undone. Refresh the list before retrying.'); }
        throw error;
    }
    finalizeLibraryWrites(writes);
    return { added: !writes[0].updated, updated: writes[0].updated, id: writes[0].id };
}

export function verifyLibraryCapacity() {
    const state = readSessionLibrary();
    if (state.count > LIBRARY_MAX_COUNT || state.bytes > LIBRARY_MAX_BYTES) throw new Error('Library limit reached, possibly by another tab. Refresh the list and remove recordings before retrying.');
}

export function removeLibrarySession(id) {
    const key = libraryRecordKey(id), state = readSessionLibrary();
    const entry = state.entries.find(entry => entry.records.some(record => record.key === key));
    if (!entry) { if (state.damaged.includes(key)) GM_deleteValue(key); return; }
    for (const record of entry.records) if (GM_getValue(record.key, null) === record.value) GM_deleteValue(record.key);
}

export function renameLibrarySession(id, title) {
    const key = libraryRecordKey(id), state = readSessionLibrary();
    const entry = state.entries.find(entry => entry.records.some(record => record.key === key));
    if (!entry) throw new Error('This recording changed in another tab. Refresh the list.');
    const cleanTitle = libraryTitle(title);
    const writes = entry.records.map(record => ({ ...record, next: JSON.stringify({ ...JSON.parse(record.value), title: cleanTitle }) }));
    const bytes = state.bytes + writes.reduce((total, write) => total + new Blob([write.next]).size - new Blob([write.value]).size, 0);
    if (bytes > LIBRARY_MAX_BYTES) throw new Error('Library full. Use a shorter title or remove a recording.');
    for (const write of writes) {
        if (GM_getValue(write.key, null) !== write.value) throw new Error('This recording changed in another tab. Refresh the list.');
        GM_setValue(write.key, write.next);
    }
}
