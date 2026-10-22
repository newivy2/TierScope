// Same-origin coordination stores timing only. Userscript GM stores remain private.
export function createRequestCoordinator(participant, background = false, options = {}) {
    const prefix = 'cb-api-coordination:v1:', spacing = 3000;
    const now = options.now || (() => Date.now());
    const delay = options.delay || (ms => new Promise(resolve => setTimeout(resolve, ms)));
    const storage = options.storage || (() => window.localStorage);
    const locks = options.locks || (() => window.navigator?.locks);
    let rememberedUntil = 0, lastStart = -Infinity;
    function read(key) {
        try { return JSON.parse(storage().getItem(prefix + key)); } catch (_) { return null; }
    }
    function write(key, value) {
        try { storage().setItem(prefix + key, JSON.stringify(value)); } catch (_) { /* Local protection remains active. */ }
    }
    function validUntil(value) {
        return value?.version === 1 && Number.isSafeInteger(value.until) && value.until >= 0 && value.until <= 8640000000000000 ? value.until : 0;
    }
    function deadline() {
        for (const owner of ['tierscope', 'viewer-probe']) rememberedUntil = Math.max(rememberedUntil, validUntil(read('cooldown:' + owner)));
        return rememberedUntil;
    }
    function publish(until) {
        if (!Number.isSafeInteger(until) || until < 0 || until > 8640000000000000) return;
        rememberedUntil = Math.max(rememberedUntil, until);
        const key = 'cooldown:' + participant, previous = validUntil(read(key));
        if (until <= previous) return;
        write(key, {version: 1, until});
        // Repair simultaneous writes from tabs of the same participant under a
        // separate short lock. Never hold the pacing lock for a network request.
        try {
            const manager = locks();
            if (manager && typeof manager.request === 'function') {
                Promise.resolve(manager.request(prefix + key, () => {
                    const stored = validUntil(read(key));
                    if (until > stored) write(key, {version: 1, until});
                })).catch(() => {});
            }
        } catch (_) { /* The synchronous publication and local deadline remain. */ }
    }
    async function waitForSlot(current) {
        const reserve = async () => {
            while (true) {
                if (!current() || deadline() > now()) return false;
                const at = now(), slot = read('slot');
                const backgroundAt = slot?.version === 1 && Number.isSafeInteger(slot.backgroundAt) && slot.backgroundAt <= at ? slot.backgroundAt : 0;
                const coordinated = background || backgroundAt > 0 && at - backgroundAt <= 90000;
                const next = slot?.version === 1 && Number.isSafeInteger(slot.next) && slot.next <= at + spacing ? slot.next : 0;
                const wait = coordinated ? Math.max(background ? lastStart + spacing : 0, next) - at : 0;
                if (wait > 0) { await delay(Math.min(250, wait)); continue; }
                // Recheck after every wait and while holding the origin lock.
                if (!current() || deadline() > now()) return false;
                lastStart = now();
                write('slot', {version: 1, next: lastStart + spacing, backgroundAt: background ? lastStart : backgroundAt});
                return true;
            }
        };
        let manager;
        try { manager = locks(); } catch (_) { /* Use best-effort storage pacing. */ }
        if (manager && typeof manager.request === 'function') {
            try { return await manager.request(prefix + 'request', reserve); }
            catch (_) { /* Fall back when Web Locks access is unavailable. */ }
        }
        return reserve();
    }
    return {deadline, publish, waitForSlot};
}

export const requestCoordinator = createRequestCoordinator('tierscope');
