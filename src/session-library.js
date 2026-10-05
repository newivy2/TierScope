import { readLibraryLimits } from './library-capacity.js';
import { LIBRARY_MEGABYTE } from './library-capacity-data.js';
import { makeStorageId } from './record-validation.js';
import { validateSessionFile } from './session-file-format.js';
import { freezeRecordingData } from './immutable-data.js';

export const LIBRARY_PREFIX = 'tierscope:library:v1:';
export const LIBRARY_CACHE_MAX_COUNT = 500;
export const LIBRARY_CACHE_MAX_BYTES = 25 * LIBRARY_MEGABYTE;

export function libraryRecordKey(id) {
    if (typeof id !== 'string' || !/^[a-z0-9_-]{1,100}$/i.test(id)) throw new Error('Invalid library record.');
    return LIBRARY_PREFIX + id;
}

export function libraryTitle(title) {
    if (typeof title !== 'string' || title.length > 80 || /[\x00-\x1f]/.test(title)) throw new Error('Use a title of up to 80 characters.');
    return title.trim();
}

export function libraryMetadata(value) {
    // Keep beta 1's legacy flag readable for migration; new stars belong to models.
    const favorite = value.favorite === undefined ? false : value.favorite, notes = value.notes === undefined ? '' : value.notes;
    if (typeof favorite !== 'boolean' || typeof notes !== 'string' || notes.length > 2000 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(notes)) {
        throw new Error('Recording notes must be plain text of up to 2,000 characters; favorite must be true or false.');
    }
    return {...(value.favorite === undefined ? {} : {favorite}), notes};
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

// One reader belongs to one open Library. Always re-read keys/raw values so a
// changed, deleted or unreadable record in another tab cannot reuse stale data.
export function createLibraryReader() {
    const cache = new Map();
    return {read: () => readSessionLibrary(cache), clear: () => cache.clear()};
}

export function readSessionLibrary(cache = null) {
    const entries = [], damaged = [], unavailable = [], sessions = new Map();
    let bytes = 0, cachedBytes = 0, cachedCount = 0;
    let keys;
    try { keys = GM_listValues().filter(key => key.startsWith(LIBRARY_PREFIX)); }
    catch (error) { if (cache) cache.clear(); throw error; }
    if (cache) {
        const present = new Set(keys);
        for (const key of cache.keys()) if (!present.has(key)) cache.delete(key);
    }
    for (const key of keys) {
        let raw;
        try { raw = GM_getValue(key, undefined); }
        catch (error) { if (cache) cache.delete(key); damaged.push(key); unavailable.push(key); continue; }
        let cached = cache && cache.get(key);
        if (cached && cached.raw !== raw) { cache.delete(key); cached = null; }
        if (raw === undefined) { if (cache) cache.delete(key); continue; }
        let recordBytes;
        try {
            recordBytes = cached ? cached.bytes : new TextEncoder().encode(typeof raw === 'string' ? raw : JSON.stringify(raw)).byteLength;
            bytes += recordBytes;
        } catch (error) { if (cache) cache.delete(key); damaged.push(key); unavailable.push(key); continue; }
        try {
            const id = key.slice(LIBRARY_PREFIX.length);
            let data = cached && cached.data;
            if (!data) {
                const record = JSON.parse(raw);
                if (record.schemaVersion !== 1 || !Number.isSafeInteger(record.addedAt) || record.addedAt < 0) throw new Error('Invalid library record.');
                libraryRecordKey(id);
                const lineage = record.lineage === undefined ? id : record.lineage;
                libraryRecordKey(lineage);
                data = {title: libraryTitle(record.title), ...libraryMetadata(record), lineage, addedAt: record.addedAt, archive: validateSessionFile(record.archive)};
            }
            if (cache) {
                if (typeof raw === 'string' && cachedCount < LIBRARY_CACHE_MAX_COUNT && cachedBytes + recordBytes <= LIBRARY_CACHE_MAX_BYTES) {
                    if (!cached) {
                        // Validation copied these arrays and checked every item
                        // as a primitive. Freeze them without visiting every
                        // sample again, then freeze the small enclosing record.
                        for (const values of Object.values(data.archive.session.history)) Object.freeze(values);
                        cache.set(key, {raw, bytes: recordBytes, data: freezeRecordingData(data)});
                    }
                    cachedBytes += recordBytes; cachedCount++;
                } else cache.delete(key);
            }
            // Grouping and callers receive fresh containers; only validated,
            // frozen recording data can be shared with a later read.
            const entry = { id, ...data, records: [{ key, value: raw }] };
            const sessionKey = librarySessionKey(entry.archive), siblings = sessions.get(sessionKey) || [];
            const previous = siblings.find(other => compareLibrarySessions(other.archive, entry.archive) !== null);
            if (previous) {
                const records = previous.records.concat(entry.records), addedAt = Math.min(previous.addedAt, entry.addedAt);
                if (compareLibrarySessions(previous.archive, entry.archive) === 1) Object.assign(previous, entry);
                previous.records = records; previous.addedAt = addedAt;
            } else { entries.push(entry); siblings.push(entry); sessions.set(sessionKey, siblings); }
        } catch (error) { if (cache) cache.delete(key); damaged.push(key); }
    }
    entries.sort((a, b) => b.archive.session.history.timestamps[0] - a.archive.session.history.timestamps[0] || b.addedAt - a.addedAt || a.id.localeCompare(b.id));
    return { entries, damaged, unavailable, bytes, count: entries.length + damaged.length };
}

export function planLibraryAdditions(incoming, library = readSessionLibrary()) {
    const limits = readLibraryLimits();
    if (library.unavailable && library.unavailable.length) throw new Error('Some library records could not be read. Refresh the list before saving more recordings.');
    const entries = library.entries.slice(), writes = [];
    let bytes = library.bytes;
    for (const entry of incoming) {
        const archive = validateSessionFile(entry.archive);
        const index = entries.findIndex(saved => compareLibrarySessions(saved.archive, archive) !== null);
        const previous = index >= 0 ? entries[index] : null;
        if (previous && compareLibrarySessions(previous.archive, archive) !== 1) continue;
        const title = previous ? previous.title : libraryTitle(entry.title || archive.room);
        const metadata = libraryMetadata(previous || entry);
        const id = makeStorageId();
        const addedAt = previous ? previous.addedAt : Date.now();
        // Internal identity survives proven updates, including automatic keeps.
        // Imports do not supply it, so a deleted/reimported session cannot claim
        // an old note draft by matching timestamps or an external identifier.
        const lineage = previous ? previous.lineage || previous.id : id;
        const raw = JSON.stringify({ schemaVersion: 1, addedAt, title, ...metadata, lineage, archive }), key = libraryRecordKey(id);
        // Retain the old copy until every new write has succeeded. Budget for
        // that temporary space too; a failed update must leave it recoverable.
        bytes += new Blob([raw]).size;
        writes.push({ key, value: raw, id, updated: !!previous, replaces: previous ? previous.records : [] });
        const next = { id, title, ...metadata, lineage, addedAt, archive, records: [{ key, value: raw }] };
        if (previous) entries[index] = next; else entries.push(next);
    }
    if (library.count - library.entries.length + entries.length > limits.maxSessions || bytes > limits.maxMegabytes * LIBRARY_MEGABYTE) {
        throw new Error('Library full (' + limits.maxSessions.toLocaleString() + ' sessions / ' + limits.maxMegabytes + ' MB). Raise Storage limits or export and remove sessions before saving more. Updates also need temporary space.');
    }
    return writes;
}

export function finalizeLibraryWrites(writes) {
    for (const write of writes) for (const old of write.replaces) {
        try { if (GM_getValue(old.key, null) === old.value) GM_deleteValue(old.key); }
        catch (error) { /* Redundant snapshots remain recoverable and read as one recording. */ }
    }
}

export function keepSessionInLibrary(archive, title = '', reader = null) {
    const library = reader ? reader.read() : readSessionLibrary(), clean = validateSessionFile(archive);
    const writes = planLibraryAdditions([{ archive: clean, title }], library);
    if (!writes.length) return { added: false, updated: false,
        id: library.entries.find(entry => compareLibrarySessions(entry.archive, clean) !== null).id };
    function unchangedSource() {
        for (const old of writes[0].replaces) if (GM_getValue(old.key, undefined) !== old.value) {
            throw new Error('This session changed in another tab. Refresh or retry keeping it.');
        }
    }
    try {
        unchangedSource();
        GM_setValue(writes[0].key, writes[0].value);
        if (GM_getValue(writes[0].key, undefined) !== writes[0].value) throw new Error('The library save could not be verified. Try again.');
        verifyLibraryCapacity(reader);
        unchangedSource();
    } catch (error) {
        try { if (GM_getValue(writes[0].key, null) === writes[0].value) GM_deleteValue(writes[0].key); }
        catch (cleanupError) { throw new Error('Library save could not be completed or undone. Refresh the list before retrying.'); }
        throw error;
    }
    finalizeLibraryWrites(writes);
    return { added: !writes[0].updated, updated: writes[0].updated, id: writes[0].id };
}

export function verifyLibraryCapacity(reader = null) {
    const limits = readLibraryLimits(), state = reader ? reader.read() : readSessionLibrary();
    if (state.unavailable.length) throw new Error('Library capacity could not be checked because some records could not be read.');
    if (state.count > limits.maxSessions || state.bytes > limits.maxMegabytes * LIBRARY_MEGABYTE) throw new Error('Library limit reached, possibly by another tab. Refresh the list, raise Storage limits or remove sessions before retrying.');
}

export function removeLibrarySession(id) {
    const key = libraryRecordKey(id), state = readSessionLibrary();
    const entry = state.entries.find(entry => entry.records.some(record => record.key === key));
    if (!entry) { if (state.damaged.includes(key)) GM_deleteValue(key); return; }
    for (const record of entry.records) if (GM_getValue(record.key, null) === record.value) GM_deleteValue(record.key);
}

export function renameLibrarySession(id, title) {
    return updateLibraryMetadata(id, {title});
}

export function updateLibraryMetadata(id, patch) {
    const limits = readLibraryLimits();
    if (!patch || Object.keys(patch).some(key => !['title', 'notes'].includes(key))) throw new Error('Invalid recording metadata.');
    const key = libraryRecordKey(id), state = readSessionLibrary();
    if (state.unavailable.length) throw new Error('Some library records could not be read. Refresh the list before editing.');
    const entry = state.entries.find(entry => entry.records.some(record => record.key === key));
    if (!entry) throw new Error('This recording changed in another tab. Refresh the list.');
    const clean = {...libraryMetadata({...entry, ...patch}), title: libraryTitle(patch.title === undefined ? entry.title : patch.title)};
    const writes = entry.records.map(record => ({ ...record, next: JSON.stringify({ ...JSON.parse(record.value), ...clean }) }));
    const bytes = state.bytes + writes.reduce((total, write) => total + new Blob([write.next]).size - new Blob([write.value]).size, 0);
    if (bytes > limits.maxMegabytes * LIBRARY_MEGABYTE) throw new Error('Library full. Raise Storage limits, use shorter notes or a shorter title, or remove a session.');
    const touched = [];
    try {
        for (const write of writes) {
            if (GM_getValue(write.key, null) !== write.value) throw new Error('This recording changed in another tab. Refresh the list.');
            touched.push(write); GM_setValue(write.key, write.next);
        }
        verifyLibraryCapacity();
    } catch (error) {
        let failed = false;
        for (const write of touched.reverse()) {
            try { if (GM_getValue(write.key, null) === write.next) GM_setValue(write.key, write.value); }
            catch (rollbackError) { failed = true; }
        }
        if (failed) throw new Error('Some recording edits could not be undone. Refresh the library before retrying.');
        throw error;
    }
}
