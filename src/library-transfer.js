import { BACKUP_MAX_BYTES, restoreTierScopeBackup, validateTierScopeBackup } from './backup.js';
import { libraryMetadata, readSessionLibrary } from './session-library.js';
import { validateSessionFile } from './session-file-format.js';
import { LIBRARY_TRANSFER_MAX_COUNT } from './library-capacity-data.js';
import { readModelFavorites } from './library-models.js';

export function libraryImportBundle(values, version) {
    if (!Array.isArray(values) || !values.length || values.length > LIBRARY_TRANSFER_MAX_COUNT) throw new Error('Choose 1–10,000 session files or library bundles.');
    if (new Blob([JSON.stringify(values)]).size > BACKUP_MAX_BYTES) throw new Error('Selected files exceed 300 MB.');
    const library = [], favoriteModels = new Set();
    for (const value of values) {
        if (value && value.format === 'TierScopeBackup') {
            const backup = validateTierScopeBackup(value);
            if (backup.recovery) throw new Error('Use Backup to review and restore a partial backup with missing sessions.');
            library.push(...backup.library);
            backup.favoriteModels.forEach(room => favoriteModels.add(room));
        } else {
            const archive = validateSessionFile(value); library.push({title: archive.room, archive});
        }
        if (library.length > LIBRARY_TRANSFER_MAX_COUNT) throw new Error('Import up to 10,000 sessions at once.');
    }
    if (!library.length) throw new Error('These files contain no library sessions.');
    return validateTierScopeBackup({format: 'TierScopeBackup', formatVersion: 1, producerVersion: version, rooms: [], preferences: {}, library, favoriteModels: [...favoriteModels]});
}

export function importLibraryBundle(bundle) {
    return restoreTierScopeBackup(bundle, {highs: false, preferences: false, library: true});
}

export function exportLibrarySelection(ids, version) {
    if (!ids.length || new Set(ids).size !== ids.length) throw new Error('Select one or more sessions.');
    const state = readSessionLibrary();
    const library = ids.map(id => {
        const entry = state.entries.find(entry => entry.id === id);
        if (!entry) throw new Error('A selected session changed or could not be read. Refresh and select it again.');
        return {title: entry.title, notes: libraryMetadata(entry).notes, archive: entry.archive};
    });
    const rooms = new Set(library.map(entry => entry.archive.room.toLowerCase())), models = readModelFavorites(state.entries);
    if (models.errors.some(room => rooms.has(room))) throw new Error('A selected model’s favorite could not be read. Refresh and try again.');
    return validateTierScopeBackup({format: 'TierScopeBackup', formatVersion: 1, producerVersion: version, rooms: [], preferences: {}, library,
        favoriteModels: [...models.favorites].filter(room => rooms.has(room))});
}
