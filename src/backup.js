import { allTimeRoom, emptyAllTimeHighs, mergeAllTimeHighs, readAllTimeHighs, validateAllTimeRecord } from './highs-store.js';
import { makeStorageId } from './record-validation.js';
import { runtime } from './runtime.js';
import { ANALYSIS_PREFERENCE_KEY, validateAnalysisPreferences } from './analysis-preference-data.js';
import { validateSessionFile } from './session-file-format.js';
import { LIBRARY_PREFIX, finalizeLibraryWrites, libraryTitle, libraryMetadata, planLibraryAdditions, readSessionLibrary, verifyLibraryCapacity } from './session-library.js';
import { planModelFavoriteWrites, readModelFavorites, validateFavoriteModels } from './library-models.js';
import { LIBRARY_TRANSFER_MAX_BYTES, LIBRARY_TRANSFER_MAX_COUNT } from './library-capacity-data.js';

export const BACKUP_MAX_BYTES = LIBRARY_TRANSFER_MAX_BYTES;
const preferenceKeys = Object.freeze({ theme: 'tierscope:ui:theme:v1', highMode: 'tierscope:ui:highMode:v1',
    miniMetric: 'tierscope:ui:miniMetric:v1', chartWindow: 'tierscope:ui:chartWindow:v1',
    collapsedRows: 'tierscope:ui:collapsedRows:v1', geometry: 'tierscope:ui:geometry:v1' });

export function validateBackupPreferences(preferences) {
    if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) throw new Error('Invalid saved preferences.');
    const clean = {};
    for (const [name, value] of Object.entries(preferences)) {
        if (!Object.prototype.hasOwnProperty.call(preferenceKeys, name)) throw new Error('Unknown saved preference: ' + name);
        const choices = { theme: ['dark', 'bright'], highMode: ['sh', 'ath'], miniMetric: ['room', 'withTokens', 'total'],
            chartWindow: ['full', 'fourHours', 'twoHours', 'hour', 'halfHour', 'quarter'] };
        if (name === 'geometry') {
            if (!value || !Number.isFinite(value.left) || !Number.isFinite(value.top) ||
                !Number.isFinite(value.scale) || value.scale < 0.5 || value.scale > 3) throw new Error('Invalid panel geometry.');
            clean[name] = { left: value.left, top: value.top, scale: value.scale };
        } else if (name === 'collapsedRows') {
            if (!Array.isArray(value) || value.length > runtime.PANEL_ROWS.length ||
                value.some(key => !runtime.PANEL_ROWS.some(row => row.key === key))) throw new Error('Invalid collapsed rows.');
            clean[name] = [...new Set(value)];
        } else {
            if (!choices[name].includes(value)) throw new Error('Invalid preference: ' + name);
            clean[name] = value;
        }
    }
    return clean;
}

export function validateTierScopeBackup(input) {
    if (!input || input.format !== 'TierScopeBackup' || input.formatVersion !== 1 ||
        typeof input.producerVersion !== 'string' || input.producerVersion.length > 40 ||
        !Array.isArray(input.rooms) || input.rooms.length > LIBRARY_TRANSFER_MAX_COUNT || !Array.isArray(input.library) || input.library.length > LIBRARY_TRANSFER_MAX_COUNT) {
        throw new Error('This is not a supported TierScope backup.');
    }
    const seen = new Set();
    const rooms = input.rooms.map(record => {
        const room = record && allTimeRoom(record.room);
        if (!room || seen.has(room)) throw new Error('Invalid or duplicate room in backup.');
        seen.add(room);
        validateAllTimeRecord({ schemaVersion: 1, room, epoch: 'backup', highs: record.highs }, room);
        const highs = emptyAllTimeHighs();
        mergeAllTimeHighs(highs, record.highs);
        return { room, highs };
    });
    const library = input.library.map(entry => ({ title: libraryTitle(entry.title), ...libraryMetadata(entry), archive: validateSessionFile(entry.archive) }));
    const backup = { format: 'TierScopeBackup', formatVersion: 1, producerVersion: input.producerVersion,
        rooms, preferences: validateBackupPreferences(input.preferences), library };
    backup.favoriteModels = validateFavoriteModels(input.favoriteModels === undefined ? library.filter(entry => entry.favorite).map(entry => entry.archive.room) : input.favoriteModels);
    if (input.analysisPreferences !== undefined) backup.analysisPreferences = validateAnalysisPreferences(input.analysisPreferences);
    if (input.recovery !== undefined) {
        const keys = input.recovery && input.recovery.omittedLibraryKeys;
        if (!Array.isArray(keys) || !keys.length || keys.length > 10000 ||
            keys.some(key => typeof key !== 'string' || !key.startsWith(LIBRARY_PREFIX) || key.length > 256) ||
            new Set(keys).size !== keys.length) throw new Error('Invalid partial-backup recovery notice.');
        backup.recovery = {omittedLibraryKeys: keys.slice()};
    }
    if (new Blob([JSON.stringify(backup)]).size > BACKUP_MAX_BYTES) throw new Error('Backup exceeds 300 MB.');
    return backup;
}

export function createTierScopeBackup(includeLibrary = true, allowPartialLibrary = false) {
    const rooms = new Set();
    for (const key of GM_listValues()) {
        if (key.startsWith(runtime.ALL_TIME_PREFIX)) {
            const room = allTimeRoom(key.slice(runtime.ALL_TIME_PREFIX.length).split(':')[0]);
            if (room) rooms.add(room);
        }
    }
    // Include unsaved highs still available in this tab.
    for (const room of runtime.allTimeCache.keys()) if (allTimeRoom(room)) rooms.add(room);
    const records = [...rooms].sort().map(room => {
        const state = readAllTimeHighs(room);
        if (state.error || state.skipped) throw new Error('Could not read all ATH records for ' + room + '. Existing data was left intact.');
        return { room, highs: state.highs };
    });
    const preferences = { theme: runtime.isDarkMode ? 'dark' : 'bright', highMode: runtime.highMode,
        miniMetric: runtime.miniMetric, chartWindow: runtime.chartWindowMode, collapsedRows: [...runtime.collapsedRows] };
    if (runtime.panelGeometry) preferences.geometry = runtime.panelGeometry;
    for (const [name, key] of Object.entries(preferenceKeys)) {
        const saved = GM_getValue(key, null);
        if (saved !== null) preferences[name] = name === 'geometry' || name === 'collapsedRows' ? JSON.parse(saved) : saved;
    }
    const library = includeLibrary ? readSessionLibrary() : { entries: [], damaged: [] };
    if (library.damaged.length && !allowPartialLibrary) throw new Error('The library contains unreadable recordings. Choose the healthy-recordings option to make a partial backup, or export ATH/preferences separately.');
    const rawAnalysis = GM_getValue(ANALYSIS_PREFERENCE_KEY, null);
    const modelState = includeLibrary ? readModelFavorites(library.entries) : {favorites: new Set(), errors: []};
    if (modelState.errors.length) throw new Error('Some model favorites could not be read. Refresh the library or back up without Library until they can be read.');
    return validateTierScopeBackup({ format: 'TierScopeBackup', formatVersion: 1, producerVersion: runtime.TIERSCOPE_VERSION,
        rooms: records, preferences, library: library.entries.map(entry => ({ title: entry.title, notes: entry.notes, archive: entry.archive })),
        favoriteModels: [...modelState.favorites],
        ...(rawAnalysis === null ? {} : {analysisPreferences: validateAnalysisPreferences(JSON.parse(rawAnalysis))}),
        ...(library.damaged.length ? {recovery: {omittedLibraryKeys: library.damaged}} : {}) });
}

// A separate download preserves raw damaged values for manual recovery. It is
// deliberately not a TierScopeBackup and cannot be imported as valid sessions.
export function createLibraryRecoveryExport() {
    const state = readSessionLibrary();
    const records = state.damaged.map(key => {
        try {
            const value = GM_getValue(key, undefined);
            if (value === undefined) return {key, error: 'Record no longer present.'};
            if (JSON.stringify(value) === undefined) throw new Error('Value is not JSON data.');
            return {key, value};
        } catch (error) { return {key, error: 'Record could not be read or exported: ' + String(error.message || error)}; }
    });
    return {format: 'TierScopeLibraryRecovery', formatVersion: 1, producerVersion: runtime.TIERSCOPE_VERSION, records};
}

export function restoreTierScopeBackup(input, options = { highs: true, preferences: true, library: true }) {
    // Validate every part and preflight capacity before the first write.
    const backup = validateTierScopeBackup(input), writes = [], epochs = [];
    const newLibrary = options.library ? planLibraryAdditions(backup.library) : [];
    if (options.highs) for (const record of backup.rooms) {
        const state = readAllTimeHighs(record.room);
        if (state.error || state.skipped) throw new Error('Cannot safely merge ATH for ' + record.room + '. No backup data was written.');
        const highs = emptyAllTimeHighs(); mergeAllTimeHighs(highs, state.highs);
        if (mergeAllTimeHighs(highs, record.highs)) {
            const key = runtime.ALL_TIME_PREFIX + record.room + ':' + state.epoch + ':' + makeStorageId();
            writes.push({ key, value: JSON.stringify({ schemaVersion: 1, room: record.room, epoch: state.epoch, highs }) });
            epochs.push({ room: record.room, epoch: state.epoch });
        }
    }
    writes.push(...newLibrary);
    const modelWrites = options.library ? planModelFavoriteWrites(backup.favoriteModels) : [];
    writes.push(...modelWrites);
    if (options.preferences) for (const [name, value] of Object.entries(backup.preferences)) {
        writes.push({ key: preferenceKeys[name], value: name === 'geometry' || name === 'collapsedRows' ? JSON.stringify(value) : value });
    }
    if (options.preferences && backup.analysisPreferences) writes.push({key: ANALYSIS_PREFERENCE_KEY, value: JSON.stringify(backup.analysisPreferences)});
    const touched = [];
    try {
        for (const write of writes) {
            const before = GM_getValue(write.key, undefined);
            if (Object.prototype.hasOwnProperty.call(write, 'expectedBefore') && before !== write.expectedBefore) throw new Error('Model favorites changed in another tab. Refresh and retry.');
            touched.push({ ...write, before });
            GM_setValue(write.key, write.value);
        }
        for (const { room, epoch } of epochs) {
            if (GM_getValue(runtime.ALL_TIME_EPOCH_PREFIX + room, 'initial') !== epoch) throw new Error('ATH was cleared in another tab during restore.');
        }
        if (newLibrary.length) verifyLibraryCapacity();
    } catch (error) {
        let rollbackFailed = false;
        for (const write of touched.reverse()) {
            try {
                // Undo only our own values; never replace another tab's newer write.
                if (GM_getValue(write.key, null) !== write.value) continue;
                if (write.before === undefined) GM_deleteValue(write.key);
                else GM_setValue(write.key, write.before);
            } catch (rollbackError) { rollbackFailed = true; }
        }
        backup.rooms.forEach(record => readAllTimeHighs(record.room));
        throw new Error((rollbackFailed ? 'Restore incomplete; some changes may remain. Keep the backup and retry. ' : 'Restore failed; its writes were rolled back. ') + error.message);
    }
    finalizeLibraryWrites(newLibrary);
    backup.rooms.forEach(record => readAllTimeHighs(record.room));
    return { rooms: epochs.length, recordings: newLibrary.filter(write => !write.updated).length,
        updatedRecordings: newLibrary.filter(write => write.updated).length,
        favoriteModels: modelWrites.length,
        preferences: options.preferences ? Object.keys(backup.preferences).length + (backup.analysisPreferences ? 1 : 0) : 0 };
}
