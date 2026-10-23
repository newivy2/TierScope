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
    assert.deepEqual([...h.data.keys()], [prefix + 'slot', prefix + 'priority']);
    assert.deepEqual(JSON.parse(h.data.get(prefix + 'priority')).waiters, []);
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

test('foreground tabs remain paced after a fifteen-minute cooldown with background work paused', async () => {
    const {createRequestCoordinator} = await import(moduleUrl), h = setup(), starts = [];
    const background = createRequestCoordinator('viewer-probe', true, h.options);
    await background.waitForSlot(() => true); background.publish(h.now() + 900000);
    h.advance(900000);
    const base = h.options.storage();
    const storage = {...base, setItem(key, value) {
        if (key === prefix + 'slot') starts.push(JSON.parse(value).next - 3000);
        base.setItem(key, value);
    }};
    const tabs = Array.from({length: 3}, () => createRequestCoordinator('tierscope', false, {...h.options, storage: () => storage}));
    const accepted = await Promise.all(tabs.map(tab => tab.waitForSlot(() => true)));
    assert(accepted.every(Boolean));
    assert.deepEqual(starts, [1900000, 1903000, 1906000]);
});

test('reading an active cooldown never renews its deadline or starts a request', async () => {
    const {createRequestCoordinator} = await import(moduleUrl), h = setup();
    const main = createRequestCoordinator('tierscope', false, h.options), until = h.now() + 900000;
    main.publish(until);
    for (let i = 0; i < 60; i++) {
        assert.equal(main.deadline(), until); assert.equal(await main.waitForSlot(() => true), false);
        h.advance(15000);
    }
    assert.equal(h.data.has(prefix + 'slot'), false);
    assert.equal(main.deadline(), until); assert(await main.waitForSlot(() => true));
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
    assert.match(h.e('control-next-scan').textContent, /API queue/);
    assert.match(h.e('control-next-scan').title, /Waiting for API slot/);
    assert.match(h.e('acquisition-status').textContent, /Waiting for API slot/);
    h.t.toggleAutoRefresh(); h.advance(250); h.runTimers(timer => !timer.repeat && timer.ms === 250); await pending;
    assert.equal(h.fetchCount(), 0); assert.equal(h.t.readRequestPolicy().failures, 0);
    assert.equal(h.t.state().isPaused, true); assert.equal(h.t.state().history.timestamps.length, 0);
    assert(!h.logs.some(line => line.includes('Attempting DOM fallback')));
    assert.deepEqual(JSON.parse(browserStore.get(prefix + 'priority')).waiters, []);
});

function manualClock() {
    const h = setup(), timers = [];
    let held = false, tail = Promise.resolve();
    const locks = {request(key, operation) {
        const work = tail.then(() => {held = true; try {return operation();} finally {held = false;}});
        tail = work.catch(() => {}); return work;
    }};
    const options = {...h.options, locks: () => locks, delay: ms => {
        assert.equal(held, false, 'sleeping never holds the shared Web Lock');
        return new Promise(resolve => timers.push({at: h.now() + ms, resolve}));
    }};
    async function drain() {for (let i = 0; i < 40; i++) await Promise.resolve();}
    async function tick(ms) {
        for (let elapsed = 0; elapsed < ms; elapsed += 250) {
            h.advance(Math.min(250, ms - elapsed));
            for (const timer of timers.splice(0)) {if (timer.at <= h.now()) timer.resolve(); else timers.push(timer);}
            await drain();
        }
    }
    return {...h, options, drain, tick, timers};
}

test('foreground scans overtake waiting background work, keep FIFO order, and leave room for background requests', async () => {
    const {createRequestCoordinator} = await import(moduleUrl), h = manualClock(), order = [];
    const background = createRequestCoordinator('viewer-probe', true, h.options);
    await background.waitForSlot(() => true);
    const bg = background.waitForSlot(() => true).then(ok => {assert(ok); order.push(['background', h.now()]);});
    await h.drain();
    const first = createRequestCoordinator('tierscope', false, h.options).waitForSlot(() => true).then(ok => {assert(ok); order.push(['first', h.now()]);});
    const second = createRequestCoordinator('tierscope', false, h.options).waitForSlot(() => true).then(ok => {assert(ok); order.push(['second', h.now()]);});
    await h.drain(); await h.tick(9000); await Promise.all([first, second, bg]);
    assert.deepEqual(order, [['first', 1003000], ['second', 1006000], ['background', 1009000]]);
    assert.deepEqual(JSON.parse(h.data.get(prefix + 'priority')).waiters, []);
});

test('a throttled background timer cannot hold up a foreground scan in another tab', async () => {
    const {createRequestCoordinator} = await import(moduleUrl), h = manualClock();
    let wake;
    const background = createRequestCoordinator('viewer-probe', true, {...h.options, delay: () => new Promise(resolve => {wake = resolve;})});
    await background.waitForSlot(() => true);
    let active = true;
    const sleeping = background.waitForSlot(() => active); await h.drain();
    assert.equal(typeof wake, 'function');
    let accepted = false;
    const foreground = createRequestCoordinator('tierscope', false, h.options).waitForSlot(() => true).then(ok => {accepted = ok;});
    await h.drain(); await h.tick(3000); await foreground;
    assert.equal(accepted, true, 'foreground completes while the background timer is still suspended');
    active = false; wake(); assert.equal(await sleeping, false);
});

test('suspended foreground leases expire, and cancellation or a new cooldown releases only its own priority', async () => {
    const {createRequestCoordinator} = await import(moduleUrl), h = manualClock();
    const background = createRequestCoordinator('viewer-probe', true, h.options);
    await background.waitForSlot(() => true);
    let wake, active = true;
    const suspended = createRequestCoordinator('tierscope', false, {...h.options, delay: () => new Promise(resolve => {wake = resolve;})});
    const pending = suspended.waitForSlot(() => active); await h.drain();
    const resumed = background.waitForSlot(() => true); await h.drain(); await h.tick(3000);
    assert.equal(await resumed, true, 'a closed/suspended foreground tab does not starve background work');
    active = false; wake(); assert.equal(await pending, false);
    assert.deepEqual(JSON.parse(h.data.get(prefix + 'priority')).waiters, []);
    const a = createRequestCoordinator('tierscope', false, h.options), b = createRequestCoordinator('tierscope', false, h.options);
    let current = true;
    const cancelled = a.waitForSlot(() => current), allowed = b.waitForSlot(() => true); await h.drain();
    current = false; await h.tick(250); assert.equal(await cancelled, false);
    assert.equal(JSON.parse(h.data.get(prefix + 'priority')).waiters.length, 1, 'another tab keeps its lease');
    background.publish(h.now() + 900000); await h.tick(250); assert.equal(await allowed, false);
    assert.deepEqual(JSON.parse(h.data.get(prefix + 'priority')).waiters, []);
});

test('the status changes from API queue to scanning only when the network request starts', async () => {
    const {harness} = require('./helpers/harness.cjs'), h = harness(), data = new Map();
    h.context.localStorage = {getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value)};
    h.t.initPanel(); const at = h.context.Date.now(); let respond;
    h.setResponse(() => new Promise(resolve => {respond = resolve;}));
    data.set(prefix + 'slot', JSON.stringify({version: 1, next: at + 3000, backgroundAt: at}));
    const scan = h.t.performScanThenReturn(); await h.drain();
    assert.equal(h.fetchCount(), 0); assert.match(h.e('control-next-scan').textContent, /API queue/);
    for (let i = 0; i < 12; i++) {h.advance(250); h.runTimers(timer => !timer.repeat && timer.ms === 250); await h.drain();}
    assert.equal(h.fetchCount(), 1); assert.equal(h.e('control-next-scan').textContent, 'Scanning...');
    assert.doesNotMatch(h.e('control-next-scan').title, /Waiting for API slot/);
    respond({ok: true, text: async () => '5,0,testroom|o|f|0,alice|t|f|0'}); await scan;
    assert.equal(h.t.readRequestPolicy().failures, 0);
    assert.equal(h.t.state().history.timestamps.length, 1);
});

test('retry tooltips expose the stored HTTP error without changing or bypassing the countdown', () => {
    const {harness} = require('./helpers/harness.cjs');
    for (const status of [404, 500]) {
        const h = harness(); h.t.initPanel(); h.t.recordRequestFailure({status}); h.t.updateCountdownDisplay(); h.t.updateAcquisitionStatus();
        assert.match(h.e('control-next-scan').title, new RegExp('HTTP ' + status));
        assert.match(h.e('acquisition-status').title, new RegExp('HTTP ' + status));
        assert.match(h.e('control-next-scan').textContent, /Retry in/);
        assert.equal(h.fetchCount(), 0);
        const restored = harness(h.storage); restored.t.initPanel(); restored.t.updateCountdownDisplay();
        assert.match(restored.e('control-next-scan').title, new RegExp('HTTP ' + status));
        assert.equal(restored.fetchCount(), 0);
    }
});

test('upgrading the parser recovers an old non-HTTP format backoff once without losing the session', async()=>{
    const {harness}=require('./helpers/harness.cjs'), h=harness(), key='tierscope:requests:v1:https://chaturbate.com', now=h.context.Date.now();
    h.t.initPanel();h.t.sample(2);const before=h.t.state().history.timestamps.slice();
    h.storage.set(key,JSON.stringify({until:now+900000,responseUntil:now+900000,serverUntil:0,connectionUntil:0,connectionFailures:0,
        failures:7,status:0,blocked:0,revision:'old-format'}));
    h.setResponse('5,123,testroom|o|f|0,viewer|t|m|0');
    assert.equal(h.t.readRequestPolicy().until,0);await h.t.performScanThenReturn();
    assert.equal(h.fetchCount(),1);assert.equal(h.t.state().history.timestamps.length,before.length+1);
    assert.deepEqual(h.t.state().history.timestamps.slice(0,before.length),before);
    h.t.recordRequestFailure({status:0});const current=h.t.readRequestPolicy();
    assert.equal(current.userListFormatVersion,2);assert.equal(current.failures,1);
    assert(current.until>h.context.Date.now(),'new client failures still retain backoff');
});

test('format recovery preserves real HTTP/server restrictions, ambiguous legacy records and newer tab failures', ()=>{
    const {harness}=require('./helpers/harness.cjs'), key='tierscope:requests:v1:https://chaturbate.com';
    for(const change of [{status:429},{status:500},{status:404},{blocked:403},{serverUntil:1780000900000},
        {responseUntil:undefined,connectionUntil:undefined,connectionFailures:undefined}]) {
        const h=harness(), now=h.context.Date.now();
        h.storage.set(key,JSON.stringify({until:now+900000,responseUntil:now+900000,serverUntil:0,connectionUntil:0,connectionFailures:0,
            failures:7,status:0,blocked:0,revision:'protected',...change}));
        assert.equal(h.t.readRequestPolicy().until,now+900000);
    }
    const h=harness(),now=h.context.Date.now();
    const old=JSON.stringify({until:now+900000,responseUntil:now+900000,serverUntil:0,connectionUntil:0,connectionFailures:0,
        failures:7,status:0,blocked:0,revision:'old-format'});
    const newer=JSON.stringify({...JSON.parse(old),status:429,serverUntil:now+900000,revision:'newer'});
    h.storage.set(key,old);const get=h.context.GM_getValue;let reads=0;
    h.context.GM_getValue=(k,d)=>{if(k===key && ++reads===2)h.storage.set(key,newer);return get(k,d);};
    h.t.readRequestPolicy();assert.equal(h.storage.get(key),newer);
    assert.equal(h.t.readRequestPolicy().status,429);
});

test('recovering a format wait cannot bypass a cooldown reported by another client', async()=>{
    const {harness}=require('./helpers/harness.cjs'),h=harness(),now=h.context.Date.now(),until=now+900000,browserStore=new Map();
    h.context.localStorage={getItem:key=>browserStore.get(key)??null,setItem:(key,value)=>browserStore.set(key,value)};
    browserStore.set(prefix+'cooldown:viewer-probe',JSON.stringify({version:1,until}));
    h.storage.set('tierscope:requests:v1:https://chaturbate.com',JSON.stringify({until,responseUntil:until,serverUntil:0,
        connectionUntil:0,connectionFailures:0,failures:7,status:0,blocked:0,revision:'old-format'}));
    h.t.initPanel();assert.equal(h.t.readRequestPolicy().until,0);await h.t.performScanThenReturn();
    assert.equal(h.fetchCount(),0);assert.equal(JSON.parse(browserStore.get(prefix+'cooldown:viewer-probe')).until,until);
});
