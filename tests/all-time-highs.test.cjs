const test = require('node:test');
const assert = require('node:assert/strict');
const {harness, source} = require('./helpers/harness.cjs');
const clean = value => JSON.parse(JSON.stringify(value));
const instrumented = source.replace('downloadTrackingReport: downloadTrackingReport,', `
  __ath: {read: readAllTimeHighs, store: storeAllTimeHighs, toggle: toggleHighMode,
    clear: clearAllTimeHighs, add: addFileToAllTimeHighs, archive: captureSessionFile,
    open: openSessionReplay, empty: emptyAllTimeHighs,
    view: () => ({mode: highMode, room: displayedHighRoom(), highs: displayedAllTimeState().highs,
      position: playback && playback.samplePosition, playing: playback && playback.playing})},
  downloadTrackingReport: downloadTrackingReport,`);
function setup(storage = new Map()) {
  const h = harness(storage, instrumented);
  h.t.initPanel();
  return Object.assign(h, {ath: h.api.__ath});
}
function response(count, roomTotal = 100) {
  return roomTotal + ',testroom|o|f|0,' + Array.from({length: count}, (_, i) => 'mod' + i + '|m|m|0').join(',');
}
async function scan(h, count, roomTotal = 100) {
  h.advance(60000);
  h.setResponse(response(count, roomTotal));
  await h.t.performScanThenReturn();
}
const high = (h, room = 'testroom', key = 'red') => clean(h.ath.read(room).highs[key]);
const athKeys = h => [...h.storage.keys()].filter(k => k.startsWith('tierscope:ath:v1:'));
function records(h, values) {
  const highs = h.ath.empty();
  for (const [key, value] of Object.entries(values)) highs[key] = {value, time: h.context.Date.now(), source: 'live'};
  return highs;
}

test('ATH records accepted peaks and original times across ties, session Reset, Stop/Start and expiry', async () => {
  const h = setup();
  await scan(h, 5, 100);
  const peak = high(h);
  assert.equal(peak.value, 5);
  assert.equal(peak.source, 'live');
  await scan(h, 5, 100);
  await scan(h, 2, 50);
  assert.deepEqual(high(h), peak);
  assert.equal(high(h, 'testroom', 'roomTotal').value, 106);
  h.ath.toggle();
  assert.equal(h.e('high-red').textContent, 'ATH:5');
  assert.match(h.e('high-red').title, /Recorded live/);
  h.t.stopTracking('manual');
  h.setResponse(response(1, 10));
  h.t.startNewSession();
  await h.drain();
  await scan(h, 1, 10);
  assert.equal(high(h).value, 5);
  assert.equal(h.t.getSessionHigh('red', 0).value, 1);
  h.t.resetAllTracking();
  assert.equal(h.t.state().history.timestamps.length, 0);
  assert.deepEqual(high(h), peak);
  const reload = harness(h.storage, instrumented);
  reload.advance(24 * 60 * 60000);
  reload.t.initPanel();
  assert.equal(reload.api.__ath.view().mode, 'ath');
  assert.equal(reload.e('high-red').textContent, 'ATH:5');
  assert.equal(reload.t.state().history.timestamps.length, 0);
  assert.equal(athKeys(h).length, 1, 'normal recording compacts to one small record per room');
});

test('mode changes affect labels and highlights, preserve session exports, and both modes track records', async () => {
  const h = setup();
  await scan(h, 8);
  h.t.resetAllTracking();
  await scan(h, 3);
  const archive = clean(h.ath.archive()), history = clean(h.t.state().history);
  assert.equal(h.e('high-red').textContent, 'SH:3');
  assert.match(h.e('restore-row-red').style.background, /50, 205, 50/);
  h.ath.toggle();
  assert.equal(h.e('high-red').textContent, 'ATH:8');
  assert.doesNotMatch(h.e('restore-row-red').style.background, /50, 205, 50/);
  assert.deepEqual(clean(h.ath.archive()), archive);
  assert.deepEqual(clean(h.t.state().history), history);
  await scan(h, 9);
  assert.equal(high(h).value, 9);
  assert.equal(h.t.getSessionHigh('red', 0).value, 9);
  assert.match(h.e('restore-row-red').style.background, /50, 205, 50/);
  h.ath.toggle();
  assert.equal(h.e('high-red').textContent, 'SH:9');
});

test('ATH pulses ignore lower session highs and fire when the first live sample after reload reaches ATH', async () => {
  const h = setup(); await scan(h, 6); h.ath.toggle(); h.t.resetAllTracking();
  let pulses = 0;
  h.e('restore-row-red').animate = () => {pulses++; return {cancel() {}};};
  await scan(h, 3);
  assert.equal(pulses, 0, 'a new SH below ATH must not pulse in ATH mode');
  await scan(h, 6);
  assert.equal(pulses, 1, 'reaching the existing ATH pulses');
  await scan(h, 6);
  assert.equal(pulses, 1, 'the plateau does not pulse repeatedly');
  const reload = setup(h.storage);
  reload.advance(h.context.Date.now() - reload.context.Date.now());
  reload.e('restore-row-red').animate = () => {pulses++; return {cancel() {}};};
  await scan(reload, 6);
  assert.equal(pulses, 2, 'the first accepted sample at ATH after reload should pulse');
});

test('opening and replaying a file cannot import ATH; explicit Add targets the file room only', async () => {
  const h = setup();
  await scan(h, 3);
  const own = high(h), archive = clean(h.ath.archive()), live = clean(h.t.state());
  archive.room = 'ARCHIVE_ROOM';
  archive.session.sessionHighs.red = {value: 80, time: h.context.Date.now() - 86400000};
  h.ath.open(archive);
  h.ath.toggle();
  assert.equal(h.e('high-red').textContent, 'ATH:—');
  h.t.stepPlayback(1);
  assert.equal(high(h, 'archive_room').source, null);
  const view = clean(h.ath.view());
  h.ath.add();
  assert.equal(h.ath.view().position, view.position);
  assert.equal(h.ath.view().playing, view.playing);
  assert.deepEqual(high(h, 'archive_room'), {value: 80, time: archive.session.sessionHighs.red.time, source: 'file'});
  assert.equal(h.e('high-red').textContent, 'ATH:80');
  assert.match(h.e('high-red').title, /archive_room.*Added from a session file/);
  assert.deepEqual(high(h), own);
  assert.deepEqual(clean(h.t.state().history), live.history);
  const keys = athKeys(h);
  h.ath.add();
  assert.deepEqual(athKeys(h), keys, 'adding the same file again is idempotent');
  assert.match(h.e('all-time-action-status').textContent, /No higher records/);
  h.t.leavePlayback(true);
  assert.equal(h.e('high-red').textContent, 'ATH:3');
  const reload = setup(h.storage);
  assert.equal(high(reload, 'archive_room').value, 80);
});

test('live recording behind another room file Replay updates only the live room and preserves Replay', async () => {
  const h = setup();
  await scan(h, 2);
  const archive = clean(h.ath.archive()); archive.room = 'otherroom';
  h.ath.open(archive); h.ath.add(); h.ath.toggle();
  const view = clean(h.ath.view());
  await scan(h, 7);
  assert.equal(high(h).value, 7);
  assert.equal(high(h, 'otherroom').value, 2);
  assert.deepEqual(clean(h.ath.view()), view);
  assert.equal(h.e('high-red').textContent, 'ATH:2');
});

test('failed acquisition cannot raise ATH; paint failure retains valid highs and failed writes retry local peaks', async () => {
  const h = setup(); await scan(h, 3);
  const original = high(h), history = clean(h.t.state().history);
  h.setResponse(new Error('offline')); await h.t.performScanThenReturn();
  assert.deepEqual(high(h), original);
  h.storage.delete('tierscope:requests:v1:' + h.context.location.origin);
  const canvas = h.e('spark-purple'), getContext = canvas.getContext;
  canvas.getContext = () => {throw Error('paint failed');};
  await scan(h, 5);
  assert.equal(high(h).value, 5);
  assert.equal(h.t.state().history.red.length, history.red.length + 1);
  assert.equal(h.e('acquisition-status').textContent, 'Display needs refresh');
  canvas.getContext = getContext;
  const set = h.context.GM_setValue;
  h.context.GM_setValue = (key, value) => {if (key.startsWith('tierscope:ath:v1:')) throw Error('quota'); return set(key, value);};
  await scan(h, 9);
  assert.equal(high(h).value, 9);
  h.ath.toggle();
  assert.match(h.e('high-red').title, /Local only, not saved/);
  assert.match(h.e('all-time-info').textContent, /local only/, 'changing modes must not hide an unsaved-record warning');
  const other = setup(h.storage);
  assert.equal(high(other).value, 5, 'the unsaved peak must not be presented as persisted');
  h.context.GM_setValue = set;
  await scan(h, 4);
  assert.equal(h.ath.read('testroom').pending, false);
  assert.doesNotMatch(h.e('all-time-info').textContent, /local only/, 'a successful retry clears the warning');
  assert.equal(high(setup(h.storage)).value, 9, 'a later smaller scan still retries the highest unsaved value');
});

test('interleaved tab writes preserve the greatest value per metric and safely compact snapshots', () => {
  const storage = new Map(), a = setup(storage), b = setup(storage);
  a.ath.store('testroom', records(a, {red: 10, total: 20}));
  const set = a.context.GM_setValue;
  let interleave = true;
  a.context.GM_setValue = (key, value) => {
    if (interleave && key.startsWith('tierscope:ath:v1:')) {
      interleave = false;
      b.ath.store('testroom', records(b, {red: 30, total: 25}));
    }
    return set(key, value);
  };
  a.ath.store('testroom', records(a, {red: 15, total: 40}));
  assert.equal(high(a).value, 30);
  assert.equal(high(a, 'testroom', 'total').value, 40);
  assert.equal(athKeys(a).length, 2, 'both concurrent snapshots survive');
  a.ath.store('testroom', a.ath.empty());
  assert.equal(athKeys(a).length, 1);
  assert.equal(high(b).value, 30);
  assert.equal(high(b, 'testroom', 'total').value, 40);
});

test('explicit Clear is room-specific, survives reload, and rejects an older in-flight write', async () => {
  const storage = new Map(), a = setup(storage), b = setup(storage);
  await scan(a, 9);
  a.ath.store('otherroom', records(a, {red: 12}));
  a.context.confirm = () => false;
  a.ath.clear(); assert.equal(high(a).value, 9);
  a.context.confirm = () => true;
  const set = a.context.GM_setValue;
  let interleave = true;
  a.context.GM_setValue = (key, value) => {
    if (interleave && key.startsWith('tierscope:ath:v1:')) {interleave = false; b.ath.clear();}
    return set(key, value);
  };
  a.ath.store('testroom', records(a, {red: 50}));
  assert.equal(high(a).source, null, 'a late old-generation write must not undo Clear');
  assert.equal(high(a, 'otherroom').value, 12);
  assert.equal(high(setup(storage)).source, null, 'old session highs must not repopulate deliberately cleared ATH');
  assert.equal(a.t.getSessionHigh('red', 0).value, 9);
  await scan(a, 2, 10);
  assert.equal(high(a).value, 2, 'record the new sample, not the old session maximum');
});

test('first upgrade seeds available local session highs, while invalid records are preserved and isolated', () => {
  const h = setup(); h.t.sample(20); h.t.saveSession('testroom');
  assert.equal(athKeys(h).length, 0);
  const upgrade = setup(h.storage);
  assert.equal(high(upgrade).value, 20);
  assert.equal(high(upgrade).source, 'saved');
  h.storage.set('tierscope:ath:v1:testroom:bad', '{broken');
  const future = {schemaVersion: 999, room: 'testroom'};
  h.storage.set('tierscope:ath:v1:testroom:future', JSON.stringify(future));
  const state = upgrade.ath.read('testroom');
  assert.equal(state.skipped, 2);
  upgrade.ath.store('testroom', records(upgrade, {red: 30}));
  assert.equal(h.storage.get('tierscope:ath:v1:testroom:bad'), '{broken');
  assert.equal(h.storage.get('tierscope:ath:v1:testroom:future'), JSON.stringify(future));
  assert.equal(high(upgrade).value, 30);
  const get = upgrade.context.GM_getValue;
  upgrade.context.GM_getValue = () => {throw Error('read denied');};
  upgrade.ath.store('testroom', records(upgrade, {red: 40}));
  assert.equal(upgrade.ath.read('testroom').pending, true);
  upgrade.context.GM_getValue = get;
  assert.equal(high(setup(h.storage)).value, 30);
});

test('empty sessions do not invent ATH and invalid candidate counts cannot poison stored or displayed records', () => {
  const h = setup(); h.t.saveSession('testroom');
  const reload = setup(h.storage);
  assert.equal(high(reload).source, null);
  assert.equal(athKeys(reload).length, 0);
  reload.ath.store('testroom', records(reload, {red: 5}));
  for (const value of [NaN, -1, Infinity, 9.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(reload.ath.store('testroom', records(reload, {red: value})).saved, false);
    assert.equal(high(reload).value, 5);
  }
  assert.equal(high(setup(h.storage)).value, 5);
});
