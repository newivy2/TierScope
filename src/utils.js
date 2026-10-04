import { diagnostic } from './diagnostics.js';
import { roomFromUrl } from './room-context.js';
import { runtime } from './runtime.js';

export function getTierMarker(tier) {
    var config = runtime.TIERS[tier];
    if (tier === 'female-trans') return config.name;
    return '<span role="img" aria-label="' + config.name + '" title="' + config.name + '" ' +
        'style="display:inline-block;width:10px;height:10px;border-radius:50%;vertical-align:middle;background:' + config.color + ';"></span>';
}

export function log(msg) {
    diagnostic('log', msg);
}

export function getModelNameFromUrl(url) {
    return roomFromUrl(url) || 'unknown';
}

export function isBroadcastRoom() {
    return roomFromUrl(location.href) !== null;
}

export function formatElapsedTime(ms) {
    ms = Math.max(0, ms);
    var totalSeconds = Math.floor(ms / 1000);
    var hours = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;
    return (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}

export function formatDateTime(timestamp) {
    return new Date(timestamp).toLocaleString();
}

export function formatSampleAge(timestamp) {
    var seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (seconds < 60) return seconds + 's';
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm';
    var hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h' + (minutes % 60 ? ' ' + (minutes % 60) + 'm' : '');
    var days = Math.floor(hours / 24);
    return days + 'd' + (hours % 24 ? ' ' + (hours % 24) + 'h' : '');
}

export function getModelName() {
    return getModelNameFromUrl(location.href);
}
