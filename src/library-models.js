import { allTimeRoom } from './highs-store.js';

export const MODEL_FAVORITE_PREFIX = 'tierscope:library-model:v1:';

export function modelFavoriteKey(room) {
    const normalized = allTimeRoom(room);
    if (!normalized) throw new Error('Invalid favorite model.');
    return MODEL_FAVORITE_PREFIX + normalized;
}

export function validateFavoriteModels(value) {
    if (!Array.isArray(value) || value.length > 10000 || value.some(room => !allTimeRoom(room))) throw new Error('Invalid favorite models.');
    return [...new Set(value.map(allTimeRoom))].sort();
}

export function readModelFavorite(room) {
    const key = modelFavoriteKey(room), normalized = allTimeRoom(room), raw = GM_getValue(key, undefined);
    if (raw === undefined) return {favorite: false, autoKeep: false};
    const record = JSON.parse(raw);
    if (record.schemaVersion !== 1 || record.room !== normalized || typeof record.favorite !== 'boolean' ||
        record.autoKeep !== undefined && typeof record.autoKeep !== 'boolean') throw new Error('Invalid favorite model record.');
    // Old stars and imported favorites never imply consent to automatic storage.
    return {favorite: record.favorite, autoKeep: record.favorite && record.autoKeep === true};
}

// Beta 1's recording stars seed model favorites until an explicit model choice
// exists. False is a durable choice, so imports/migration cannot re-star it.
export function readModelFavorites(entries = []) {
    const favorites = new Set(entries.filter(entry => entry.favorite).map(entry => entry.archive.room.toLowerCase()));
    const errors = [], automatic = new Set();
    for (const key of GM_listValues().filter(key => key.startsWith(MODEL_FAVORITE_PREFIX))) {
        const room = key.slice(MODEL_FAVORITE_PREFIX.length);
        try {
            if (modelFavoriteKey(room) !== key) throw new Error('Invalid favorite model key.');
            const record = readModelFavorite(room);
            if (record.favorite) favorites.add(room); else favorites.delete(room);
            if (record.autoKeep) automatic.add(room);
        } catch (error) { favorites.delete(room); errors.push(room); }
    }
    return {favorites, automatic, errors};
}

export function planModelFavoriteWrites(rooms) {
    const writes = [];
    for (const room of validateFavoriteModels(rooms)) {
        const key = modelFavoriteKey(room);
        if (GM_getValue(key, undefined) === undefined) writes.push({key, expectedBefore: undefined,
            value: JSON.stringify({schemaVersion: 1, room, favorite: true})});
    }
    return writes;
}

export function setModelFavorite(room, favorite, autoKeep = false) {
    const key = modelFavoriteKey(room);
    if (typeof favorite !== 'boolean' || typeof autoKeep !== 'boolean' || autoKeep && !favorite) throw new Error('Invalid favorite model choice.');
    const before = GM_getValue(key, undefined), value = JSON.stringify({schemaVersion: 1, room: allTimeRoom(room), favorite, autoKeep});
    try {
        GM_setValue(key, value);
        if (GM_getValue(key, undefined) !== value) throw new Error('Favorite changed in another tab. Refresh the library.');
    } catch (error) {
        try {
            if (GM_getValue(key, undefined) === value) {
                if (before === undefined) GM_deleteValue(key); else GM_setValue(key, before);
            }
        } catch (rollbackError) { throw new Error('The favorite could not be saved or restored. Refresh the library before retrying.'); }
        throw error;
    }
}

export function migrateRecordingFavorites(entries) {
    const rooms = entries.filter(entry => entry.favorite).map(entry => entry.archive.room);
    for (const write of planModelFavoriteWrites(rooms)) {
        if (GM_getValue(write.key, undefined) === undefined) setModelFavorite(write.key.slice(MODEL_FAVORITE_PREFIX.length), true);
    }
}
