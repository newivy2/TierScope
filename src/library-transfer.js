import { BACKUP_MAX_BYTES, restoreTierScopeBackup, validateTierScopeBackup } from './backup.js';
import { LIBRARY_MAX_COUNT, libraryMetadata, readSessionLibrary } from './session-library.js';
import { validateSessionFile } from './session-file-format.js';

export function libraryImportBundle(values, version) {
    if (!Array.isArray(values) || !values.length || values.length > LIBRARY_MAX_COUNT) throw new Error('Choose 1–500 recording files or library bundles.');
    if (new Blob([JSON.stringify(values)]).size > BACKUP_MAX_BYTES) throw new Error('Selected files exceed 32 MB.');
    const library = [];
    for (const value of values) {
        if (value && value.format === 'TierScopeBackup') {
            const backup = validateTierScopeBackup(value);
            if (backup.recovery) throw new Error('Use Backup to review and restore a partial backup with missing recordings.');
            library.push(...backup.library);
        } else {
            const archive = validateSessionFile(value); library.push({title: archive.room, archive});
        }
        if (library.length > LIBRARY_MAX_COUNT) throw new Error('Import up to 500 recordings at once.');
    }
    if (!library.length) throw new Error('These files contain no library recordings.');
    return validateTierScopeBackup({format: 'TierScopeBackup', formatVersion: 1, producerVersion: version, rooms: [], preferences: {}, library});
}

export function importLibraryBundle(bundle) {
    return restoreTierScopeBackup(bundle, {highs: false, preferences: false, library: true});
}

export function exportLibrarySelection(ids, version) {
    if (!ids.length || new Set(ids).size !== ids.length) throw new Error('Select one or more recordings.');
    const state = readSessionLibrary();
    const library = ids.map(id => {
        const entry = state.entries.find(entry => entry.id === id);
        if (!entry) throw new Error('A selected recording changed or could not be read. Refresh and select it again.');
        return {title: entry.title, ...libraryMetadata(entry), archive: entry.archive};
    });
    return validateTierScopeBackup({format: 'TierScopeBackup', formatVersion: 1, producerVersion: version, rooms: [], preferences: {}, library});
}
