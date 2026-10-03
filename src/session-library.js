import { validateSessionFile } from './files.js';
import { makeStorageId } from './storage.js';

export const LIBRARY_PREFIX = 'tierscope:library:v1:';
export const LIBRARY_MAX_COUNT = 50;
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

export function readSessionLibrary() {
    const entries = [], damaged = [];
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
            entries.push({ id, title: libraryTitle(record.title), addedAt: record.addedAt, archive: validateSessionFile(record.archive) });
        } catch (error) { damaged.push(key); }
    }
    entries.sort((a, b) => b.archive.session.history.timestamps[0] - a.archive.session.history.timestamps[0] || b.addedAt - a.addedAt || a.id.localeCompare(b.id));
    return { entries, damaged, bytes, count: entries.length + damaged.length };
}

export function planLibraryAdditions(incoming, library = readSessionLibrary()) {
    const seen = new Set(library.entries.map(entry => libraryIdentity(entry.archive)));
    const writes = [];
    let bytes = library.bytes;
    for (const entry of incoming) {
        const archive = validateSessionFile(entry.archive), title = libraryTitle(entry.title || archive.room);
        const signature = libraryIdentity(archive);
        if (seen.has(signature)) continue;
        seen.add(signature);
        const id = makeStorageId();
        const raw = JSON.stringify({ schemaVersion: 1, addedAt: Date.now(), title, archive });
        bytes += new Blob([raw]).size;
        writes.push({ key: libraryRecordKey(id), value: raw, id });
    }
    if (library.count + writes.length > LIBRARY_MAX_COUNT || bytes > LIBRARY_MAX_BYTES) {
        throw new Error('Library full (50 recordings / 25 MB). Export and remove recordings before adding more.');
    }
    return writes;
}

export function keepSessionInLibrary(archive, title = '') {
    const library = readSessionLibrary(), clean = validateSessionFile(archive);
    const writes = planLibraryAdditions([{ archive: clean, title }], library);
    if (!writes.length) return { added: false, id: library.entries.find(entry => libraryIdentity(entry.archive) === libraryIdentity(clean)).id };
    try {
        GM_setValue(writes[0].key, writes[0].value);
        verifyLibraryCapacity();
    } catch (error) {
        try { if (GM_getValue(writes[0].key, null) === writes[0].value) GM_deleteValue(writes[0].key); }
        catch (cleanupError) { throw new Error('Library save could not be completed or undone. Refresh the list before retrying.'); }
        throw error;
    }
    return { added: true, id: writes[0].id };
}

export function verifyLibraryCapacity() {
    const state = readSessionLibrary();
    if (state.count > LIBRARY_MAX_COUNT || state.bytes > LIBRARY_MAX_BYTES) throw new Error('Library limit reached, possibly by another tab. Refresh the list and remove recordings before retrying.');
}

export function removeLibrarySession(id) {
    GM_deleteValue(libraryRecordKey(id));
}

export function renameLibrarySession(id, title) {
    const key = libraryRecordKey(id), raw = GM_getValue(key, null);
    if (raw === null) throw new Error('This recording was removed in another tab.');
    const record = JSON.parse(raw);
    validateSessionFile(record.archive);
    record.title = libraryTitle(title);
    const value = JSON.stringify(record);
    if (readSessionLibrary().bytes + new Blob([value]).size - new Blob([raw]).size > LIBRARY_MAX_BYTES) throw new Error('Library full. Use a shorter title or remove a recording.');
    GM_setValue(key, value);
}
