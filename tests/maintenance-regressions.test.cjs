const test = require('node:test');
const assert = require('node:assert/strict');
const {harness, source} = require('./helpers/harness.cjs');
const clean = value => JSON.parse(JSON.stringify(value));
const testSource = source.replace('downloadTrackingReport: downloadTrackingReport,', `
  __maintenance: {model: getModelNameFromUrl, isRoom: isBroadcastRoom, health: validateDOMHealth,
    healthState: () => ({...domHealthStatus}), attempt: () => lastAcquisitionAttemptSource,
    clear: clearAllTimeHighs, read: readAllTimeHighs, add: addFileToAllTimeHighs,
    archive: captureSessionFile, open: openSessionReplay, directReset: resetTrackingData,
    view: () => ({room: displayedHighRoom(), imported: !!(playback && playback.imported),
      position: playback && playback.samplePosition, history: JSON.stringify(history)})},
  downloadTrackingReport: downloadTrackingReport,`);
function fresh(storage = new Map(), pathname = '/testroom/') {
  const h = harness(storage, testSource);
  h.context.location = new URL('https://chaturbate.com' + pathname);
  h.t.checkUrlChange(); h.t.initPanel();
  return Object.assign(h, {m: h.api.__maintenance});
}
async function record(h) {
  h.setResponse('10,testroom|o|f|0,viewer|m|m|0');
  await h.t.performScanThenReturn();
  return h.m.archive();
}
function breakConsole(h, mode) {
  if (mode === 'absent') { h.context.console = undefined; return; }
  for (const method of ['log', 'warn', 'error']) {
    if (mode === 'missing') delete h.context.console[method];
    else if (mode === 'getter') Object.defineProperty(h.context.console, method, {get() { throw new Error('console getter failed'); }});
    else h.context.console[method] = () => { throw new Error('console method failed'); };
  }
}

for (const status of [401, 403, 429, 503]) {
  test('console failures cannot bypass HTTP ' + status + ' restrictions, including reload', async () => {
    for (const mode of ['throws', 'getter', 'missing', 'absent']) {
      const h = fresh(); breakConsole(h, mode);
      const denied = status === 401 || status === 403;
      h.setResponse(() => ({ok: false, status, headers: {get: () => denied ? null : '180'}, text: async () => ''}));
      await h.t.performScanThenReturn();
      const policy = h.t.readRequestPolicy();
      assert.equal(policy.blocked, denied ? status : 0, mode);
      assert.equal(policy.until - h.context.Date.now(), denied ? 60000 : 180000, mode);
      assert.equal(h.m.attempt(), 'API', 'no DOM fallback around server restrictions');
      assert.equal(h.t.state().isScanning, false);
      assert.equal(h.t.state().history.timestamps.length, 0);
      if (denied) { assert.equal(h.t.state().isAutoRefreshOn, false); assert.equal(h.t.state().isPaused, true); }
      await h.t.performScanThenReturn(); assert.equal(h.fetchCount(), 1);
      const next = fresh(h.storage); await next.t.performScanThenReturn();
      assert.equal(next.fetchCount(), 0, 'restriction survives another tab/reload');
      assert.equal(next.t.readRequestPolicy().blocked, policy.blocked);
    }
  });
}

test('broken logging preserves DOM fallback, backoff, gaps and later successful scans', async () => {
  const h = fresh(); await record(h);
  const prior = clean(h.t.state().history); breakConsole(h, 'throws');
  h.advance(60000); h.setResponse(() => ({ok: false, status: 500, headers: {get: () => null}}));
  await h.t.performScanThenReturn();
  assert.equal(h.m.attempt(), 'DOM');
  assert.equal(h.t.readRequestPolicy().until - h.context.Date.now(), 60000);
  assert.deepEqual(clean(h.t.state().history), prior);
  assert.equal(h.t.pendingGap(), true); assert.equal(h.t.state().isScanning, false);
  h.advance(60000); await record(h);
  assert.equal(h.t.readRequestPolicy().failures, 0);
  assert.equal(h.t.state().history.timestamps.length, 2);
  assert.equal(h.t.state().history.breaks[1], true);
  assert.equal(h.m.read('testroom').highs.red.value, 1);
  const saved = JSON.parse(h.t.readSavedSession('tierscope:v1:testroom'));
  assert.deepEqual(saved.history, clean(h.t.state().history));
});

test('DOM health still warns on screen, pauses and recovers when console methods throw', () => {
  const h = fresh(); breakConsole(h, 'throws');
  h.m.health(); assert.equal(h.e('auto-status').textContent, 'DOM mismatch - check console');
  for (let i = 0; i < 5; i++) h.m.health();
  assert.equal(h.m.healthState().consecutiveFailures, 6);
  assert.equal(h.t.state().isAutoRefreshOn, false); assert.equal(h.t.state().isPaused, true);
  h.context.document.querySelector = () => ({});
  h.m.health(); assert.equal(h.m.healthState().isHealthy, true);
  assert.equal(h.m.healthState().consecutiveFailures, 0);
  assert.equal(h.t.state().isAutoRefreshOn, false, 'health recovery does not silently resume tracking');
});

test('room naming and room detection agree on complete routes and reject directory/malformed URLs', () => {
  const h = fresh();
  const valid = ['/testroom', '/testroom/', '/b/testroom/', '/testroom/cam/', '/Test_Room-2/?x=1#chat'];
  for (const pathname of valid) {
    h.context.location = new URL('https://chaturbate.com' + pathname);
    assert.equal(h.m.model(h.context.location.href), pathname.includes('Test_Room') ? 'Test_Room-2' : 'testroom');
    assert.equal(h.m.isRoom(), true, pathname);
  }
  const invalid = ['/', '/tags/', '/tags/testroom/', '/tags/testroom/cam/', '/tags/b/testroom/',
    '/accounts/testroom/', '/female-cams/', '/testroom/extra/', '/b/', '/b/testroom/extra/',
    '/b/tags/', '/unknown/', '/UNKNOWN/', '/TAGS/', '/testroom//', '/%74estroom/', '/@SUM(A1)/', '/' + 'x'.repeat(101) + '/'];
  for (const pathname of invalid) {
    h.context.location = new URL('https://chaturbate.com' + pathname);
    assert.equal(h.m.model(h.context.location.href), 'unknown', pathname);
    assert.equal(h.m.isRoom(), false, pathname);
  }
  for (const url of ['', null, undefined, 'not a URL', 'https://[', '/testroom/']) assert.equal(h.m.model(url), 'unknown');
});

test('directory Reset and ATH Clear cannot prompt, delete records, reset replay or schedule scans', async () => {
  const seed = fresh(); await record(seed);
  for (const pathname of ['/tags/testroom/', '/accounts/testroom/', '/tags/b/testroom/', '/testroom/extra/', '/']) {
    const h = fresh(new Map(seed.storage), pathname);
    assert.equal(h.m.read('testroom').highs.red.value, 1);
    assert(h.t.readSavedSession('tierscope:v1:testroom'));
    assert.equal(h.e('btn-main-reset').disabled, true); assert.equal(h.e('btn-clear-all-time').disabled, true);
    const before = [...h.storage], state = clean(h.t.state()), timers = h.timers.size;
    h.context.confirm = () => { assert.fail('non-room action must not ask for confirmation'); };
    h.t.resetAllTracking(); h.m.directReset(true); h.m.clear();
    assert.deepEqual([...h.storage], before, pathname);
    assert.deepEqual(clean(h.t.state()), state, pathname);
    assert.equal(h.timers.size, timers); assert.equal(h.fetchCount(), 0);
  }
});

test('Reset retains confirmation and room isolation on all supported room routes', async () => {
  for (const pathname of ['/testroom/', '/b/testroom/', '/testroom/cam/']) {
    const h = fresh(new Map(), pathname); await record(h);
    h.storage.set('tierscope:v1:otherroom', 'unrelated room record');
    const before = [...h.storage]; h.context.confirm = () => false;
    h.t.resetAllTracking(); assert.deepEqual([...h.storage], before);
    assert.equal(h.e('btn-main-reset').disabled, false);
    h.context.confirm = () => true; h.t.resetAllTracking();
    assert.equal(h.t.state().history.timestamps.length, 0);
    assert.equal(h.m.read('testroom').highs.red.value, 1, 'Reset retains ATH');
    assert.equal(h.storage.get('tierscope:v1:otherroom'), 'unrelated room record');
    h.m.clear(); assert.equal(h.m.read('testroom').highs.red.value, 0);
    assert.equal(h.storage.get('tierscope:v1:otherroom'), 'unrelated room record');
  }
});

test('file replay on a directory can add and clear only its own room ATH', async () => {
  const seed = fresh(), archive = await record(seed); archive.room = 'archived_room';
  const h = fresh(seed.storage, '/tags/testroom/'); h.m.open(archive); h.m.add();
  assert.equal(h.m.read('archived_room').highs.red.value, 1);
  assert.equal(h.m.read('testroom').highs.red.value, 1);
  assert.equal(h.e('btn-main-reset').disabled, true); assert.equal(h.e('btn-clear-all-time').disabled, false);
  const view = clean(h.m.view()), before = [...h.storage]; let prompts = [];
  h.context.confirm = message => { prompts.push(message); return false; };
  h.t.resetAllTracking(); assert.deepEqual(prompts, [], 'Reset cannot affect a file on a directory');
  h.m.clear(); assert.match(prompts[0], /for archived_room\?/); assert.deepEqual([...h.storage], before);
  h.context.confirm = () => true; h.m.clear();
  assert.equal(h.m.read('archived_room').highs.red.value, 0);
  assert.equal(h.m.read('testroom').highs.red.value, 1);
  assert.deepEqual(clean(h.m.view()), view, 'ATH clear preserves file, playhead and live history');
  h.t.leavePlayback(true); assert.equal(h.e('btn-clear-all-time').disabled, true);
});
