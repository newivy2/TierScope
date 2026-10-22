const test = require('node:test'), assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url'), path = require('node:path');
const moduleUrl = pathToFileURL(path.join(__dirname, '../src/request-coordination.js')).href;
const prefix = 'cb-api-coordination:v1:';
function setup() {
    let at = 1000000, available = true, tail = Promise.resolve();
    const data = new Map();
    const storage = {getItem: key => {if (!available) throw Error('Unavailable'); return data.get(key) ?? null;},
        setItem: (key, value) => {if (!available) throw Error('Unavailable'); data.set(key, value);}};
    const locks = {request: (key, fn) => {const work = tail.then(fn); tail = work.catch(() => {}); return work;}};
    return {data, options: {storage: () => storage, locks: () => locks, now: () => at, delay: async ms => {at += ms;}},
        now: () => at, advance: ms => {at += ms;}, unavailable: () => {available = false;}};
}
test('background requests and foreground scans share one origin-wide pace across instances', async () => {
    const {createRequestCoordinator} = await import(moduleUrl), h = setup(), starts = [];
    const a = createRequestCoordinator('viewer-probe', true, h.options), b = createRequestCoordinator('viewer-probe', true, h.options);
    const main = createRequestCoordinator('tierscope', false, h.options);
    for (const client of [a, b, main, a]) {
        assert(await client.waitForSlot(() => true)); starts.push(h.now());
    }
    assert.deepEqual(starts, [1000000, 1003000, 1006000, 1009000]);
    assert.deepEqual([...h.data.keys()], [prefix + 'slot']);
    const fresh = setup(), solo = createRequestCoordinator('tierscope', false, fresh.options);
    await solo.waitForSlot(() => true); await solo.waitForSlot(() => true);
    assert.equal(fresh.now(), 1000000, 'ordinary scan scheduling is unchanged when no background pacing is active');
});
test('cooldowns survive reloads and independent publishers cannot shorten each other’s waits', async () => {
    const {createRequestCoordinator} = await import(moduleUrl), h = setup();
    const main = createRequestCoordinator('tierscope', false, h.options), peer = createRequestCoordinator('viewer-probe', true, h.options);
    main.publish(h.now() + 900000); peer.publish(h.now() + 60000);
    assert.equal(peer.deadline(), h.now() + 900000); assert.equal(main.deadline(), peer.deadline());
    assert.equal(await peer.waitForSlot(() => true), false);
    const reload = createRequestCoordinator('viewer-probe', true, h.options);
    assert.equal(reload.deadline(), h.now() + 900000);
    main.publish(h.now() + 1000); assert.equal(reload.deadline(), h.now() + 900000);
    h.unavailable(); assert.equal(reload.deadline(), h.now() + 900000, 'a failed read retains the last observed wait');
    h.advance(900000); assert(await reload.waitForSlot(() => true));
});
test('invalid records are ignored, waiting can be cancelled, and new cooldowns stop queued requests', async () => {
    const {createRequestCoordinator} = await import(moduleUrl), h = setup();
    h.data.set(prefix + 'cooldown:tierscope', JSON.stringify({version: 1, until: '999999999'}));
    h.data.set(prefix + 'slot', JSON.stringify({version: 1, next: h.now() + 999999, backgroundAt: h.now()}));
    const peer = createRequestCoordinator('viewer-probe', true, h.options);
    assert.equal(peer.deadline(), 0); assert(await peer.waitForSlot(() => true));
    let current = true;
    const cancelling = createRequestCoordinator('viewer-probe', true, {...h.options, delay: async () => {current = false;}});
    assert.equal(await cancelling.waitForSlot(() => current), false);
    const limited = createRequestCoordinator('viewer-probe', true, {...h.options, delay: async () => {peer.publish(h.now() + 120000);}});
    assert.equal(await limited.waitForSlot(() => true), false);
    assert.equal(limited.deadline(), h.now() + 120000);
});
test('TierScope adopts a shared cooldown without incrementing failures, using fallback or clearing it on Reset', async () => {
    const {harness} = require('./helpers/harness.cjs'), h = harness(), browserStore = new Map();
    h.context.localStorage = {getItem: key => browserStore.get(key) ?? null, setItem: (key, value) => browserStore.set(key, value)};
    h.t.initPanel();
    const until = h.context.Date.now() + 600000;
    browserStore.set(prefix + 'cooldown:viewer-probe', JSON.stringify({version: 1, until}));
    await h.t.performScanThenReturn(); h.t.updateCountdownDisplay();
    assert.equal(h.fetchCount(), 0); assert.equal(h.t.readRequestPolicy().failures, 0);
    assert.match(h.e('control-next-scan').textContent, /API cooldown/);
    h.t.resetAllTracking(); await h.t.performScanThenReturn(); assert.equal(h.fetchCount(), 0);
    assert(!h.logs.some(line => line.includes('Attempting DOM fallback')));
    h.advance(600000); await h.t.performScanThenReturn(); assert.equal(h.fetchCount(), 1);
    assert.equal(JSON.parse(browserStore.get(prefix + 'cooldown:viewer-probe')).until, until);
});
test('an existing TierScope server wait is advertised while connection failures stay local', async () => {
    const {harness} = require('./helpers/harness.cjs'), h = harness(), browserStore = new Map();
    h.context.localStorage = {getItem: key => browserStore.get(key) ?? null, setItem: (key, value) => browserStore.set(key, value)};
    h.t.initPanel(); const now = h.context.Date.now();
    h.t.recordRequestFailure({connectionFailure: true});
    assert.equal(browserStore.has(prefix + 'cooldown:tierscope'), false);
    h.advance(15000); h.setResponse(() => ({ok: false, status: 429, headers: {get: () => '600'}}));
    await h.t.performScanThenReturn();
    assert.equal(JSON.parse(browserStore.get(prefix + 'cooldown:tierscope')).until, h.context.Date.now() + 600000);
    h.t.updateCountdownDisplay(); assert.match(h.e('control-next-scan').textContent, /Rate limited/);
    assert.equal(h.t.readRequestPolicy().failures, 1); assert(h.context.Date.now() > now);
});

test('pausing while waiting for a request slot cancels the queued scan without recording a failure', async () => {
    const {harness} = require('./helpers/harness.cjs'), h = harness(), browserStore = new Map();
    h.context.localStorage = {getItem: key => browserStore.get(key) ?? null, setItem: (key, value) => browserStore.set(key, value)};
    h.t.initPanel(); const now = h.context.Date.now();
    browserStore.set(prefix + 'slot', JSON.stringify({version: 1, next: now + 3000, backgroundAt: now}));
    const pending = h.t.performScanThenReturn(); await h.drain(); assert.equal(h.fetchCount(), 0);
    h.t.toggleAutoRefresh(); h.advance(250); h.runTimers(timer => !timer.repeat && timer.ms === 250); await pending;
    assert.equal(h.fetchCount(), 0); assert.equal(h.t.readRequestPolicy().failures, 0);
    assert.equal(h.t.state().isPaused, true); assert.equal(h.t.state().history.timestamps.length, 0);
    assert(!h.logs.some(line => line.includes('Attempting DOM fallback')));
});
