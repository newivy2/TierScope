import { runtime } from './runtime.js';

export function getStorageKey(model) {
    return runtime.STORAGE_KEY_PREFIX + model.toLowerCase();
}

export function isStorageObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function hasStorageField(data, field) {
    return Object.prototype.hasOwnProperty.call(data, field);
}

export function isStorageNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
}

export function isStorageTimestamp(value) {
    return Number.isSafeInteger(value) && value >= 0 && value <= 8640000000000000;
}

export function makeStorageId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + '-' + Math.random().toString(36).slice(2);
}
