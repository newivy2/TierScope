import { runtime } from './runtime.js';

export function getTierMarker(tier) {
    var config = runtime.TIERS[tier];
    if (tier === 'female-trans') return config.name;
    return '<span role="img" aria-label="' + config.name + '" title="' + config.name + '" ' +
        'style="display:inline-block;width:10px;height:10px;border-radius:50%;vertical-align:middle;background:' + config.color + ';"></span>';
}

export function log(msg) {
    console.log('[TierScope ' + runtime.TIERSCOPE_VERSION + '] ' + msg);
}

export function getModelNameFromUrl(url) {
    if (!url) return 'unknown';
    var path = new URL(url).pathname;
    var bMatch = path.match(/\/b\/([^\/\?#]+)/);
    if (bMatch) return bMatch[1];
    var camMatch = path.match(/^\/([^\/]+)\/cam\/?$/);
    if (camMatch) return camMatch[1];
    var normalMatch = path.match(/\/([^\/\?#]+)\/?$/);
    if (normalMatch) {
        var name = normalMatch[1];
        var nonRoomPaths = ['followed', 'featured', 'tags', 'accounts', 'login', 'register',
                           'supporter', 'settings', 'apps', 'explore', 'trending', 'new',
                           'female', 'male', 'couple', 'trans', 'hd', 'north-american',
                           'european', 'asian', 'south-american', 'exhibitionist',
                           'followed-cams', 'female-cams', 'trans-cams', 'male-cams', 'couple-cams'];
        if (nonRoomPaths.indexOf(name) === -1) return name;
    }
    return 'unknown';
}

export function isBroadcastRoom() {
    var path = window.location.pathname;
    var pathParts = path.split('/').filter(function(p) { return p; });
    if (pathParts.length === 0) return false;
    var nonRoomPaths = ['followed', 'featured', 'tags', 'accounts', 'login', 'register',
                       'supporter', 'settings', 'apps', 'explore', 'trending', 'new',
                       'female', 'male', 'couple', 'trans', 'hd', 'north-american',
                       'european', 'asian', 'south-american', 'exhibitionist',
                       'followed-cams', 'female-cams', 'trans-cams', 'male-cams', 'couple-cams'];
    if (nonRoomPaths.indexOf(pathParts[0]) !== -1) return false;
    if (pathParts[0] === 'b' && pathParts.length >= 2) return true;
    if (pathParts.length === 1) return true;
    if (pathParts.length === 2 && pathParts[1] === 'cam') return true;
    return false;
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
