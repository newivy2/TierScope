// Same-origin coordination stores timing only. Userscript GM stores remain private.
export function createRequestCoordinator(participant, background = false, options = {}) {
    const prefix = 'cb-api-coordination:v1:', spacing = 3000, lease = 1500;
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
    async function locked(operation) {
        let manager;
        try { manager = locks(); } catch (_) { /* Use best-effort storage pacing. */ }
        if (manager && typeof manager.request === 'function') {
            let entered = false;
            try { return await manager.request(prefix + 'request', () => { entered = true; return operation(); }); }
            catch (error) { if (entered) throw error; }
        }
        return operation();
    }
    function priority(at) {
        const value = read('priority');
        const sequence = value?.version === 1 && Number.isSafeInteger(value.sequence) && value.sequence >= 0 && value.sequence <= at + 10000 ? value.sequence : at;
        const waiters = value?.version === 1 && Array.isArray(value.waiters) ? value.waiters.slice(0, 128).filter(entry =>
            Number.isSafeInteger(entry?.ticket) && entry.ticket > 0 && entry.ticket <= sequence &&
            Number.isSafeInteger(entry.until) && entry.until > at && entry.until <= at + lease) : [];
        return {version: 1, sequence, waiters};
    }
    async function waitForSlot(current) {
        let ticket = 0;
        try {
            while (true) {
                const result = await locked(() => {
                    if (!current() || deadline() > now()) return false;
                    const at = now(), slot = read('slot');
                    const backgroundAt = slot?.version === 1 && Number.isSafeInteger(slot.backgroundAt) && slot.backgroundAt <= at ? slot.backgroundAt : 0;
                    // Keep pacing enabled through long cooldowns and closed
                    // background tabs, so foreground tabs cannot resume in a burst.
                    const coordinated = background || backgroundAt > 0;
                    const next = slot?.version === 1 && Number.isSafeInteger(slot.next) && slot.next <= at + spacing ? slot.next : 0;
                    const wait = coordinated ? Math.max(background ? lastStart + spacing : 0, next) - at : 0;
                    const queue = priority(at);
                    if (!background && (wait > 0 || queue.waiters.length)) {
                        let entry = queue.waiters.find(entry => entry.ticket === ticket);
                        if (!entry && queue.waiters.length < 128) {
                            ticket = ++queue.sequence;
                            entry = {ticket, until: at + lease};
                            queue.waiters.push(entry);
                        }
                        if (entry) entry.until = at + lease;
                        write('priority', queue);
                    }
                    // Foreground scans take the next slot in arrival order. A
                    // suspended tab loses its short lease instead of blocking it.
                    if (queue.waiters.length && (background || queue.waiters[0].ticket !== ticket)) return 250;
                    if (wait > 0) return Math.min(250, wait);
                    lastStart = now();
                    write('slot', {version: 1, next: lastStart + spacing, backgroundAt: background ? lastStart : backgroundAt});
                    if (ticket) {
                        queue.waiters = queue.waiters.filter(entry => entry.ticket !== ticket);
                        write('priority', queue);
                        ticket = 0;
                    }
                    return true;
                });
                if (typeof result === 'boolean') return result;
                // Never hold a Web Lock while sleeping or fetching. Background
                // timer throttling must not stall scans in another tab.
                await delay(result);
            }
        } finally {
            if (ticket) await locked(() => {
                const queue = priority(now());
                queue.waiters = queue.waiters.filter(entry => entry.ticket !== ticket);
                write('priority', queue);
            });
        }
    }
    return {deadline, publish, waitForSlot};
}

export const requestCoordinator = createRequestCoordinator('tierscope');
