import { runtime } from './runtime.js';

// Console methods can be missing, replaced, or throw. Diagnostics are optional
// and must never interrupt acquisition, request restrictions, or persistence.
export function diagnostic(level, message, ...details) {
    try { console[level]('[TierScope ' + runtime.TIERSCOPE_VERSION + '] ' + message, ...details); }
    catch (error) { /* Do not try another logger from inside a logging failure. */ }
}
