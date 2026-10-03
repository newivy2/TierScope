const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {harness, source} = require('./helpers/harness.cjs');
const fixture = require('./fixtures/user-list-tiers.json');
const testSource = source.replace('downloadTrackingReport: downloadTrackingReport,',
  '__review: {readAllTimeHighs, updateHighControls, mode: value => highMode = value}, downloadTrackingReport: downloadTrackingReport,');
const clean = value => JSON.parse(JSON.stringify(value));
const response = count => '8,testroom|o|f|0,' + Array.from({length: count}, (_, i) => 'viewer_' + i + '|m|m|0').join(',');
const saved = h => JSON.parse(h.t.readSavedSession('tierscope:v1:testroom'));

for (const scope of ['accepted-scan diagnostics', 'all logging']) {
  test('throwing ' + scope + ' cannot roll back a stored sample or skip ATH', async () => {
    const h = harness(new Map(), testSource); h.t.initPanel();
    h.setResponse(response(1)); await h.t.performScanThenReturn();
    const originalLog = h.context.console.log;
    h.context.console.log = (...args) => {
      if (scope === 'all logging' || args[0].includes('API scan accepted')) throw new Error('diagnostic failure');
      originalLog(...args);
    };
    h.advance(60000); h.setResponse(response(5)); await h.t.performScanThenReturn();
    assert.deepEqual(clean(h.t.state().history), saved(h).history);
    assert.deepEqual(clean(h.t.highState().sessionHighs), saved(h).sessionHighs);
    assert.equal(h.t.state().history.red.length, 2);
    assert.equal(h.t.highState().sessionHighs.red.value, 5);
    assert.equal(h.api.__review.readAllTimeHighs('testroom').highs.red.value, 5);
    assert.equal(h.t.state().isScanning, false);
    assert.equal(h.t.pendingGap(), false);
    h.advance(60000); h.setResponse(response(6)); await h.t.performScanThenReturn();
    assert.equal(h.t.state().history.red.length, 3, 'subsequent scans still run');
  });
}

test('a session-storage failure keeps the accepted live sample and independent ATH; the next save catches up', async () => {
  const h = harness(new Map(), testSource); h.t.initPanel();
  h.setResponse(response(1)); await h.t.performScanThenReturn();
  const set = h.context.GM_setValue;
  h.context.GM_setValue = (key, value) => {
    if (key.startsWith('tierscope:tab:')) throw new Error('session storage unavailable');
    return set(key, value);
  };
  h.advance(60000); h.setResponse(response(5)); await h.t.performScanThenReturn();
  assert.equal(saved(h).history.red.length, 1);
  assert.equal(h.t.state().history.red.length, 2);
  assert.equal(h.api.__review.readAllTimeHighs('testroom').highs.red.value, 5);
  assert.equal(h.t.state().isScanning, false);
  h.context.GM_setValue = set; h.t.saveSession('testroom');
  assert.deepEqual(clean(h.t.state().history), saved(h).history);
});

test('room navigation to an unsaved room clears session highs and start before its first scan', async () => {
  const h = harness(new Map(), testSource); h.t.initPanel();
  h.setResponse(response(5)); await h.t.performScanThenReturn();
  const firstStart = h.t.highState().sessionStartedAt;
  h.advance(60000); h.context.location = new URL('https://chaturbate.com/otherroom/');
  h.t.checkUrlChange();
  assert.deepEqual(clean(h.t.highState().sessionHighs), {});
  assert.equal(h.t.highState().sessionStartedAt, null);
  assert.equal(h.t.loadSession('otherroom'), false);
  h.t.initPanel(); h.setResponse('8,otherroom|o|f|0,viewer_0|m|m|0');
  await h.t.performScanThenReturn();
  assert.equal(h.t.highState().sessionHighs.red.value, 1);
  assert.equal(h.t.highState().sessionStartedAt, h.context.Date.now());
  assert.notEqual(h.t.highState().sessionStartedAt, firstStart);
  assert.equal(h.api.__review.readAllTimeHighs('testroom').highs.red.value, 5);
  assert.equal(h.api.__review.readAllTimeHighs('otherroom').highs.red.value, 1);
});

test('synthetic user-list fixture locks all seven tier totals through history and persistence', async () => {
  const h = harness(); h.t.initPanel(); h.setResponse(fixture.body);
  await h.t.performScanThenReturn();
  for (const [key, count] of Object.entries(fixture.expected)) {
    if (key === 'roomTotal') assert.equal(h.t.state().roomTotal, count);
    else {
      assert.equal(h.t.state().history[key].at(-1), count, key);
      assert.equal(saved(h).sessionHighs[key].value, count, 'persisted ' + key);
    }
  }
});

test('SH and ATH tooltips explain Reset, expiry and saved files without changing the layout', () => {
  const h = harness(new Map(), testSource); h.t.initPanel();
  h.api.__review.mode('sh'); h.api.__review.updateHighControls();
  assert.match(h.e('btn-high-mode').title, /3 hours after their last save/);
  assert.match(h.e('btn-high-mode').title, /Downloaded files do not expire/);
  h.api.__review.mode('ath'); h.api.__review.updateHighControls();
  assert.match(h.e('btn-high-mode').title, /survive session Reset and expiry/);
});

test('the unmodified installable script exposes no control API to the page and needs no global GIF writer', () => {
  const h = harness(); delete h.context.ViewerTracker;
  h.context.unsafeWindow = {};
  assert.equal(h.context.GifWriter, undefined);
  vm.runInContext(fs.readFileSync(require.resolve('../tierscope.user.js'), 'utf8'), h.context);
  assert.equal(h.context.ViewerTracker, undefined);
  assert.equal(h.context.unsafeWindow.ViewerTracker, undefined);
});
