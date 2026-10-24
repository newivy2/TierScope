const test = require('node:test'), assert = require('node:assert/strict');

async function fixture() {
    const module = await import('../src/live-model-sources.js'), data = await import('../src/live-model-data.js');
    let at = 1000000, fail = '', reads = 0, lists = 0, validations = 0;
    const values = new Map(), epochs = new Map();
    const exchange = module.createLiveModelExchange({now: () => at,
        list: () => {lists++; if (fail === 'list') throw Error('Unavailable'); return [...values.keys()];},
        get: (key, fallback) => {reads++; if (fail === key) throw Error('Unavailable'); return values.get(key) ?? fallback;},
        remove: key => values.delete(key), epoch: room => epochs.get(room) || 'legacy', archive: (room, session) => {
            validations++; return {room, session: {history: structuredClone(session.history), sessionStartedAt: session.sessionStartedAt}};
        }});
    function seed(publisherId = 'tab-a', room = 'alice', options = {}) {
        const source = {version: 1, publisherId, room, roomEpoch: 'legacy', sessionStartedAt: at - 10000,
            lastSeenAt: at, sampleCount: 2, sampleAt: at - 1000, recordSavedAt: at, status: 'tracking',
            recordKey: 'tierscope:tab:v2:' + room + ':record-' + publisherId, revision: 'revision-' + publisherId, ...options};
        source.sessionId = source.roomEpoch + '@' + (source.sessionStartedAt === null ? 'pending' : source.sessionStartedAt);
        source.id = publisherId + ':' + room + ':' + source.sessionId;
        values.set(data.LIVE_MODEL_PREFIX + publisherId, source);
        if (source.recordKey) values.set(source.recordKey, JSON.stringify({timestamp: source.recordSavedAt, roomEpoch: source.roomEpoch,
            sessionStartedAt: source.sessionStartedAt, history: {timestamps: [source.sampleAt - 1000, source.sampleAt], total: [8, 9]}}));
        return source;
    }
    return {module, data, exchange, values, epochs, seed, now: () => at, advance: ms => {at += ms;}, fail: value => {fail = value;},
        stats: () => ({reads, lists, validations})};
}

test('live discovery reads bounded metadata, distinguishes tab freshness, and retains independent duplicate-room publishers', async () => {
    const h = await fixture(), a = h.seed(), b = h.seed('tab-b'), c = h.seed('tab-c', 'bob', {status: 'paused'});
    h.values.set('tierscope:library:unrelated', 'protected');
    const found = h.exchange.readSources();
    assert.equal(found.error, ''); assert.equal(found.sources.length, 3);
    assert.notEqual(found.sources[0].id, found.sources[1].id);
    assert.equal(h.stats().validations, 0, 'discovery never parses any growing histories');
    assert.equal(h.stats().reads, 3);
    h.advance(180001);
    const stale = h.exchange.readSources().sources;
    assert(stale.every(source => source.status === 'stale'));
    assert.equal(stale[0].sampleAt, a.sampleAt, 'heartbeat expiry never invents a fresh sample');
    h.values.set(h.data.LIVE_MODEL_PREFIX + c.publisherId, {...c, lastSeenAt: h.now()});
    assert.equal(h.exchange.readSources().sources.find(source => source.id === c.id).status, 'paused');
    h.epochs.set('alice', 'reset-epoch');
    assert(h.exchange.readSources().sources.filter(source => source.room === 'alice').every(source => source.status === 'reset'));
    assert.equal(h.values.get('tierscope:library:unrelated'), 'protected');
    assert.equal(h.values.size, 7, 'discovery never deletes another tab or any protected record');
});

test('discovery key scans are cached and invalidated by notifications without caching heartbeat age', async () => {
    const h = await fixture(); h.seed();
    h.exchange.readSources(); h.advance(5000); h.exchange.readSources();
    assert.equal(h.stats().lists, 1);
    h.seed('tab-b', 'bob'); h.exchange.invalidate();
    assert.equal(h.exchange.readSources().sources.length, 2); assert.equal(h.stats().lists, 2);
    h.advance(10000); h.exchange.readSources(); assert.equal(h.stats().lists, 3);
    h.seed('tab-c', 'charlie');
    assert.equal(h.exchange.readSources().sources.length, 2);
    assert.equal(h.exchange.readSources(true).sources.length, 3, 'manual refresh bypasses the discovery cache');
    assert.equal(h.stats().lists, 4);
    h.fail('list'); h.exchange.invalidate();
    assert.match(h.exchange.readSources().error, /unavailable/);
});

test('metadata cleanup removes only supported expired announcements and discovery is not starved by old keys', async () => {
    const h = await fixture(); h.advance(20000000);
    const oldAt = h.now() - 10800001;
    let old;
    for (let i = 0; i < 205; i++) old = h.seed('old-' + i, 'oldroom', {lastSeenAt: oldAt, sampleAt: oldAt - 1000,
        sessionStartedAt: oldAt - 10000, recordSavedAt: oldAt});
    const fresh = h.seed('fresh-tab', 'freshroom');
    const corruptKey = h.data.LIVE_MODEL_PREFIX + 'corrupt'; h.values.set(corruptKey, {version: 2, lastSeenAt: 0});
    const protectedKey = 'tierscope:tab:v2:protected:record'; h.values.set(protectedKey, 'unreadable protected history');
    assert.equal(h.exchange.readSources().sources.some(source => source.id === fresh.id), true, 'older keys cannot consume the result bound');
    h.exchange.cleanupExpired();
    assert.equal(h.values.has(corruptKey), true);
    assert.equal(h.values.get(protectedKey), 'unreadable protected history');
    assert.equal(h.values.has(fresh.recordKey), true);
    assert.equal(h.values.has(h.data.LIVE_MODEL_PREFIX + old.publisherId), false);
    assert.equal(h.values.has(old.recordKey), true, 'cleanup never deletes the history behind an expired announcement');
});

test('publisher heartbeat runs only in valid room contexts and explicit stop cannot be undone by later saves', async () => {
    const module = await import('../src/live-model-sources.js'), {runtime} = await import('../src/runtime.js');
    const keys = ['location', 'window', 'GM_getValue', 'GM_setValue', 'GM_listValues', 'GM_deleteValue', 'setInterval', 'clearInterval'];
    const previous = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    const values = new Map(), timers = new Map(); let timerId = 0;
    Object.assign(globalThis, {location: new URL('https://chaturbate.com/female-cams/'), window: {navigator: {onLine: true}},
        GM_getValue: (key, fallback) => values.get(key) ?? fallback, GM_setValue: (key, value) => values.set(key, value),
        GM_listValues: () => [...values.keys()], GM_deleteValue: key => values.delete(key),
        setInterval: (fn, delay) => {timers.set(++timerId, {fn, delay}); return timerId;}, clearInterval: id => timers.delete(id)});
    Object.assign(runtime, {lastUrl: globalThis.location.href, activeSessionStorageKey: null, activeRoomEpoch: 'legacy',
        STORAGE_KEY_PREFIX: 'tierscope:v1:', ROOM_EPOCH_PREFIX: 'tierscope:epoch:v2:', TAB_RECORD_PREFIX: 'tierscope:tab:v2:',
        tabRecords: new Map(), history: {timestamps: []}, sessionStartedAt: null, isStopped: false, isPaused: false,
        isAutoRefreshOn: true, requestPolicyCache: {blocked: 0, until: 0}});
    function enterRoom() {globalThis.location = new URL('https://chaturbate.com/testroom/'); runtime.lastUrl = location.href; runtime.activeSessionStorageKey = 'tierscope:v1:testroom';}
    try {
        module.initializeLiveModelSources(); assert.equal(timers.size, 0, 'directories have no publisher heartbeat');
        enterRoom(); module.publishLiveModelSource(); assert.equal(timers.size, 1);
        assert.equal([...values.keys()].filter(key => key.startsWith('tierscope:live:v1:source:')).length, 1);
        const savedAt = Date.now(); runtime.sessionStartedAt = savedAt - 1000; runtime.history.timestamps = [savedAt - 1000, savedAt];
        runtime.tabRecords.set('tierscope:v1:testroom', {id: 'record-a', savedAt: savedAt + 25});
        module.publishLiveModelSource(savedAt);
        const announced = [...values.entries()].find(([key]) => key.startsWith('tierscope:live:v1:source:'))[1];
        assert.equal(announced.recordSavedAt, savedAt, 'metadata binds the serialized timestamp even when completing the write takes longer');
        assert.notEqual(announced.recordSavedAt, runtime.tabRecords.get('tierscope:v1:testroom').savedAt);
        globalThis.location = new URL('https://chaturbate.com/'); runtime.lastUrl = location.href; runtime.activeSessionStorageKey = null;
        module.publishLiveModelSource(); assert.equal(timers.size, 0, 'navigation retires the room heartbeat');
        enterRoom(); module.publishLiveModelSource(); assert.equal(timers.size, 1, 'a new room starts its heartbeat');
        assert.equal([...values.entries()].find(([key]) => key.startsWith('tierscope:live:v1:source:'))[1].recordKey, null,
            'returning after navigation cannot resurrect an earlier binding without a new successful save');
        module.stopLiveModelSources(); module.publishLiveModelSource(); assert.equal(timers.size, 0);
        assert.equal([...values.keys()].filter(key => key.startsWith('tierscope:live:v1:source:')).length, 0);
        module.initializeLiveModelSources(); assert.equal(timers.size, 1, 'only explicit reinitialization can restore a stopped publisher');
    } finally {
        module.stopLiveModelSources();
        for (const [key, descriptor] of previous) {if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];}
    }
});

test('selected histories are checked against exact publishers, session/epoch identity, sample revision and frozen once', async () => {
    const h = await fixture(), source = h.seed();
    const archive = h.exchange.readArchive(source);
    assert.equal(archive.room, 'alice'); assert(Object.isFrozen(archive)); assert(Object.isFrozen(archive.session.history.total));
    assert.equal(Reflect.set(archive.session.history.total, '0', 900), false);
    assert.equal(h.exchange.readArchive(source), archive); assert.equal(h.stats().validations, 1);
    h.epochs.set('alice', 'reset-epoch');
    assert.throws(() => h.exchange.readArchive(source), /changed|unavailable/);
    h.epochs.clear();
    const replacement = h.seed('tab-a', 'alice', {sessionStartedAt: h.now(), sampleAt: h.now(), revision: 'new-session'});
    assert.notEqual(replacement.id, source.id);
    assert.throws(() => h.exchange.readArchive(source), /changed|unavailable/);
    assert.equal(archive.session.history.total[0], 8, 'a changed source leaves its prior immutable snapshot intact');
});

test('source readers reject mismatched records, corrupt metadata and storage failures without overwriting them', async () => {
    const h = await fixture(), source = h.seed(), original = h.values.get(source.recordKey);
    for (const patch of [{roomEpoch: 'old'}, {sessionStartedAt: 0}, {timestamp: 1}, {history: {timestamps: [1], total: [9]}}]) {
        h.values.set(source.recordKey, JSON.stringify({...JSON.parse(original), ...patch}));
        assert.throws(() => h.exchange.readArchive(source), /changed while reading/);
    }
    h.values.set(source.recordKey, original); h.fail(source.recordKey);
    assert.throws(() => h.exchange.readArchive(source), /Unavailable/);
    h.fail('');
    const key = h.data.LIVE_MODEL_PREFIX + source.publisherId;
    for (const patch of [{version: 2}, {sampleAt: h.now() + 1000}, {lastSeenAt: h.now() + 10000},
        {room: '<room>'}, {recordKey: 'tierscope:tab:v2:other:record'}, {sampleCount: -1}, {id: 'somebody-else'}]) {
        const invalid = {...source, ...patch}; h.values.set(key, invalid);
        assert.equal(h.exchange.readSources().sources.length, 0);
        assert.deepEqual(h.values.get(key), invalid, 'unsupported/corrupt data is retained for recovery');
    }
});

test('waiting sources announce no history and stale metadata cannot direct a reader to arbitrary GM records', async () => {
    const h = await fixture(), source = h.seed('tab-a', 'alice', {sessionStartedAt: null, sampleAt: null,
        sampleCount: 0, recordKey: null, recordSavedAt: null, revision: '', status: 'waiting'});
    assert.equal(h.exchange.readSources().sources[0].status, 'waiting');
    assert.throws(() => h.exchange.readArchive(source), /unavailable/);
    assert.equal(h.stats().validations, 0);
    const key = h.data.LIVE_MODEL_PREFIX + source.publisherId;
    for (const recordKey of ['tierscope:ath:v1:alice', 'tierscope:tab:v2:alice:../secret', 'tierscope:tab:v2:bob:record']) {
        h.values.set(key, {...source, recordKey, recordSavedAt: h.now(), revision: 'x'});
        assert.equal(h.exchange.readSources().sources.length, 0);
    }
});
