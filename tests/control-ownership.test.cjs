const test = require('node:test');
const assert = require('node:assert/strict');
const {harness, source} = require('./helpers/harness.cjs');
const policy = (extra = {}) => ({until: 0, failures: 0, blocked: 0, status: 0, revision: '', ...extra});
async function acquisition() {
  const owner = await import('../src/acquisition-state.js');
  const state = {scanEpoch: 0, initGuard: 0, isScanning: false, lastAcquisitionAttemptSource: 'API',
    domHealthStatus: {lastCheck: 0, userListTabFound: false, consecutiveFailures: 0, isHealthy: true},
    domFallbackReadyAtByRoom: new Map(), requestPolicyCache: policy(), requestPolicyUnsaved: false,
    scanIntervalSeconds: 60, countdownSeconds: 60, lastScheduledIntervalSeconds: 60, nextScanAt: 0,
    countdownInterval: null, trackingTimerInterval: null, healthCheckInterval: null};
  const callbacks = [], stopped = [];
  owner.initializeAcquisitionState(state, {start: fn => callbacks.push(fn) - 1, stop: id => stopped.push(id)});
  return {owner, state, callbacks, stopped};
}

test('late completions cannot release a newer scan after reset or navigation', async () => {
  const {owner: o, state: s} = await acquisition();
  const first = o.beginAcquisition('/room/', 'room', policy(), 100, false);
  assert.equal(o.beginAcquisition('/room/', 'room', policy(), 100, false), null, 'one pending scan');
  o.invalidateAcquisition();
  const next = o.beginAcquisition('/room/', 'room', policy(), 200, false);
  assert.equal(o.finishAcquisition(first, '/room/'), false);
  assert.equal(s.isScanning, true);
  o.resetAcquisitionForRoom();
  const third = o.beginAcquisition('/other/', 'other', policy(), 300, false);
  assert.equal(o.finishAcquisition(next, '/other/'), false);
  assert.equal(o.finishAcquisition(third, '/wrong/'), false);
  assert.equal(s.isScanning, true);
  assert.equal(o.finishAcquisition(third, '/other/'), true);
  assert.equal(s.isScanning, false);
  assert(Object.isFrozen(third));
});

test('request restrictions survive navigation and a shorter scan interval', async () => {
  const {owner: o, state: s} = await acquisition();
  o.stageRequestPolicy(policy({until: 300000, failures: 2, revision: 'local'}));
  o.deferDOMFallback('ROOM', 500000);
  o.deferDOMFallback('room', 200000);
  o.resetAcquisitionForRoom();
  o.selectScanInterval(30);
  o.scheduleNextAcquisition(30, 100000, s.requestPolicyCache.until, false);
  assert.equal(s.nextScanAt, 300000);
  assert.equal(s.domFallbackReadyAtByRoom.get('room'), 500000);
  o.refreshAcquisitionCountdown(120000, 400000, true);
  assert.equal(s.countdownSeconds, 280);
  assert.equal(o.beginAcquisition('/room/', 'room', s.requestPolicyCache, 100000, false), null);
  assert.equal(o.beginAcquisition('/room/', 'room', policy({blocked: 403}), 400000, false), null);
  assert.equal(o.beginAcquisition('/room/', 'room', policy(), 400000, true), null);
  assert.equal(s.isScanning, false);
  o.scheduleNextAcquisition(30, 100000, 400000, true);
  assert.equal(s.nextScanAt, 0, 'Stop clears the deadline without clearing restrictions');
});

test('pending local restrictions merge with another tab and only the current revision can clear them', async () => {
  const {owner: o, state: s} = await acquisition();
  o.stageRequestPolicy(policy({until: 500, failures: 2, revision: 'local', serverUntil: 400}));
  o.reconcileRequestPolicy(null);
  assert.equal(s.requestPolicyCache.until, 500);
  o.reconcileRequestPolicy(policy({until: 700, failures: 3, revision: 'remote', serverUntil: 650, status: 429}));
  assert.deepEqual(s.requestPolicyCache, policy({until: 700, failures: 3, revision: 'local', serverUntil: 650, status: 429}));
  o.confirmRequestPolicySaved('older');
  assert.equal(s.requestPolicyUnsaved, true);
  assert.equal(o.clearOwnedRequestFailures('older'), false);
  o.confirmRequestPolicySaved('local');
  assert.equal(s.requestPolicyUnsaved, false);
  o.reconcileRequestPolicy(policy({blocked: 403, failures: 1, revision: 'blocked'}));
  assert.equal(o.clearOwnedRequestFailures('blocked'), false);
  o.reconcileRequestPolicy(policy({failures: 1, revision: 'retry'}));
  assert.equal(o.clearOwnedRequestFailures('retry'), true);
  assert.deepEqual(s.requestPolicyCache, policy());
});

test('replaced or stopped timer callbacks cannot run, including a zero-valued handle', async () => {
  const {owner: o, state: s, callbacks, stopped} = await acquisition();
  let ticks = 0;
  o.startAcquisitionClock('countdownInterval', () => ticks++, 1000);
  const first = callbacks[0];
  o.startAcquisitionClock('countdownInterval', () => ticks += 10, 1000);
  first(); callbacks[1]();
  assert.equal(ticks, 10);
  assert.deepEqual(stopped, [0]);
  o.stopAcquisitionClock('countdownInterval'); callbacks[1]();
  assert.equal(ticks, 10); assert.equal(s.countdownInterval, null);
  o.startAcquisitionClock('healthCheckInterval', () => ticks++, 30000);
  o.resetAcquisitionForRoom(); callbacks[2]();
  assert.equal(ticks, 10);
});

test('acquisition read views cannot mutate health, restrictions or fallback deadlines', async () => {
  const {owner: o, state: s} = await acquisition();
  assert.equal(Reflect.set(s, 'scanEpoch', 900), false);
  assert.equal(Reflect.set(s.domHealthStatus, 'consecutiveFailures', 99), false);
  assert.equal(Reflect.set(s.requestPolicyCache, 'until', 999), false);
  assert.equal(s.domFallbackReadyAtByRoom.set, undefined);
  o.noteDOMHealth(20, true, false);
  assert.equal(s.domHealthStatus.consecutiveFailures, 1);
  assert.equal(s.domHealthStatus.isHealthy, false);
  o.clearDOMFailures();
  assert.equal(s.domHealthStatus.consecutiveFailures, 0);
});

test('panel choices remain separate from session trend resets and expose no mutable collections', async () => {
  const o = await import('../src/panel-preferences.js');
  const geometry = {left: 10, top: 20, scale: 1}, rows = new Set(['red']);
  const s = {highMode: 'sh', panelGeometry: geometry, isDarkMode: true, miniMetric: 'room',
    collapsedRows: rows, chartWindowMode: 'full', currentScale: 1, panelBackgroundPercent: 95,
    isMinimized: true, trendComparisonMode: 'last', autoTrendEscalation: true,
    PANEL_ROWS: [{key: 'red'}, {key: 'total'}], MINI_METRICS: ['room', 'withTokens', 'total'],
    CHART_WINDOWS: {full: 0, hour: 3600000}, TREND_PRESETS: {last: {}, '5min': {}, start: {}}};
  o.initializePanelPreferences(s);
  geometry.left = 999; rows.clear();
  assert.equal(s.panelGeometry.left, 10); assert(s.collapsedRows.has('red'));
  o.selectCollapsedRow('total', true); o.selectCollapsedRow('invalid', true);
  assert.deepEqual([...s.collapsedRows], ['red', 'total']);
  assert.equal(s.collapsedRows.add, undefined);
  assert.equal(Reflect.set(s.panelGeometry, 'scale', 999), false);
  assert.equal(Reflect.set(s, 'isDarkMode', false), false);
  o.selectPanelTheme(false); o.switchHighPreference(); o.cycleMiniMetric();
  o.selectChartWindow('hour'); o.selectChartWindow('invalid');
  o.selectPanelOpacity(150); o.selectPanelScale(1.2);
  o.restoreTrendPreferences('5min', false); o.resetTrendPreferences();
  assert.equal(s.trendComparisonMode, 'last'); assert.equal(s.autoTrendEscalation, true);
  assert.equal(s.chartWindowMode, 'hour'); assert.equal(s.highMode, 'ath');
  assert.equal(s.isDarkMode, false); assert.equal(s.panelBackgroundPercent, 100);
  assert.equal(s.currentScale, 1.2); assert.equal(s.miniMetric, 'withTokens');
});

test('failed preference writes keep the selected UI locally and do not alter the live session', async () => {
  const text = source.replace('downloadTrackingReport: downloadTrackingReport,', `
    __preferences: {runtime, toggleHighMode, setChartWindow}, downloadTrackingReport: downloadTrackingReport,`);
  const h = harness(new Map(), text); h.t.initPanel();
  await h.t.performScanThenReturn();
  const before = JSON.stringify(h.t.state().history), p = h.api.__preferences;
  h.context.GM_setValue = () => {throw Error('storage unavailable');};
  p.toggleHighMode(); p.setChartWindow('hour');
  assert.equal(p.runtime.highMode, 'ath'); assert.equal(p.runtime.chartWindowMode, 'hour');
  assert.equal(JSON.stringify(h.t.state().history), before);
});
