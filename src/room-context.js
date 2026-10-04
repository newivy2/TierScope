
const NON_ROOM_PATHS = new Set(['b', 'followed', 'featured', 'tags', 'accounts', 'login', 'register',
    'supporter', 'settings', 'apps', 'explore', 'trending', 'new',
    'female', 'male', 'couple', 'trans', 'hd', 'north-american',
    'european', 'asian', 'south-american', 'exhibitionist',
    'followed-cams', 'female-cams', 'trans-cams', 'male-cams', 'couple-cams', 'unknown']);

// Recognize complete room routes, never the final segment of a directory URL.
// Preserve the room's spelling so existing session storage keys stay compatible.
export function roomFromUrl(url) {
    try {
        const path = new URL(url).pathname;
        const match = path.match(/^\/b\/([a-z0-9_-]{1,100})\/?$/i) ||
            path.match(/^\/([a-z0-9_-]{1,100})\/cam\/?$/i) ||
            path.match(/^\/([a-z0-9_-]{1,100})\/?$/i);
        return match && !NON_ROOM_PATHS.has(match[1].toLowerCase()) ? match[1] : null;
    } catch (error) { return null; }
}
