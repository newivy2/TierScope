const {instrument, prepareSource} = require('./helpers/instrument.cjs');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const engine = process.env.TIERSCOPE_BROWSER || 'chromium';
const source = prepareSource(fs.readFileSync(path.join(__dirname, '../tierscope.user.js'), 'utf8'))
  .replaceAll('scheduleInit(2000);', '')
  .replace('downloadTrackingReport: downloadTrackingReport,', `
    __ath: {init, scan: performScanThenReturn, pause: pauseAutoRefresh, archive: captureSessionFile,
      records: room => readAllTimeHighs(room).highs,
      state: () => ({history, mode: highMode, room: displayedHighRoom(),
        imported: !!(playback && playback.imported), position: playback && playback.samplePosition,
        playing: !!(playback && playback.playing)})},
    downloadTrackingReport: downloadTrackingReport,`);

(async () => {
  const browser = await require('playwright')[engine].launch({headless: true,
    executablePath: process.env.TIERSCOPE_CHROMIUM_PATH,
    args: JSON.parse(process.env.TIERSCOPE_CHROMIUM_ARGS || '[]')});
  try {
    const context = await browser.newContext({viewport: {width: 1100, height: 1100}, reducedMotion: 'reduce'});
    await context.addInitScript(() => {
      window.GM_listValues = () => Object.keys(localStorage);
      window.GM_getValue = (key, fallback) => localStorage.getItem(key) === null ? fallback : JSON.parse(localStorage.getItem(key));
      window.GM_setValue = (key, value) => localStorage.setItem(key, JSON.stringify(value));
      window.GM_deleteValue = key => localStorage.removeItem(key);
      window.pulses = [];
      const animate = Element.prototype.animate;
      Element.prototype.animate = function(frames, options) {window.pulses.push(this.id); return animate.call(this, frames, options);};
    });
    const page = await context.newPage(), errors = [], dialogs = [];
    page.on('pageerror', error => errors.push(error.message));
    let count = 6, owner = 'testroom', acceptDialog = true, apiRequests = 0;
    page.on('dialog', dialog => {dialogs.push(dialog.message()); return acceptDialog ? dialog.accept() : dialog.dismiss();});
    await page.route('https://tierscope.test/**', route => {
      if (route.request().url().includes('/api/')) apiRequests++;
      return route.fulfill({
      contentType: route.request().url().includes('/api/') ? 'text/plain' : 'text/html',
      body: route.request().url().includes('/api/') ? '20,' + owner + '|o|f|0,' +
        Array.from({length: count}, (_, i) => 'mod' + i + '|m|m|0').concat(['purple1|l|m|0', 'purple2|l|m|0']).join(',') :
        '<!doctype html><html><body style="background:#303846"></body></html>',
      });
    });
    const state = () => page.evaluate(() => ViewerTracker.__ath.state());
    async function load(room = 'testroom') {
      owner = room;
      await page.goto('https://tierscope.test/' + room + '/');
      await page.addScriptTag({content:instrument(source)});
      await page.evaluate(() => ViewerTracker.__ath.init());
      await page.waitForFunction(() => ViewerTracker.__ath.state().history.timestamps.length > 0);
      await page.evaluate(() => ViewerTracker.__ath.pause());
      await page.waitForTimeout(350);
    }
    async function scan(n) {
      count = n;
      await page.evaluate(() => {window.pulses = []; return ViewerTracker.__ath.scan();});
      return page.evaluate(() => window.pulses);
    }
    await load();
    const panel = page.locator('#tracker-container'), toggle = page.locator('#btn-high-mode');
    const high = page.locator('#high-red'), options = page.locator('#btn-panel-options');
    const replayAdd = page.locator('#tools-add-all-time');
    assert(!(await replayAdd.isVisible()), 'file Add is hidden during live tracking');
    await page.click('#restore-row-red');
    const bounds = await panel.boundingBox();
    const toggleBox = await toggle.boundingBox(), optionsBox = await options.boundingBox();
    assert(toggleBox.x + toggleBox.width <= optionsBox.x, 'SH/ATH is left of the chart-window menu');
    assert.equal(await high.textContent(), 'SH:6');
    await toggle.focus(); await page.keyboard.press('Space');
    assert.equal(await high.textContent(), 'ATH:6');
    assert.match(await high.getAttribute('title'), /testroom.*Recorded live/);
    assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
    assert.deepEqual(await panel.boundingBox(), bounds, 'changing high mode adds no panel height');
    await page.keyboard.press('Space');
    count = 2;
    await page.click('#btn-main-reset');
    await page.waitForFunction(() => document.getElementById('high-red').textContent === 'SH:2');
    assert.equal(await page.locator('#tier-row-red').evaluate(e => getComputedStyle(e).backgroundColor), 'rgba(50, 205, 50, 0.22)');
    await toggle.click();
    assert.equal(await high.textContent(), 'ATH:6');
    assert.notEqual(await page.locator('#tier-row-red').evaluate(e => getComputedStyle(e).backgroundColor), 'rgba(50, 205, 50, 0.22)');
    await page.click('#collapse-row-red');
    assert.match(await page.locator('#restore-row-red').getAttribute('title'), /ATH:6/);
    await page.click('#restore-row-red');
    await page.click('#btn-toggle');
    assert.match(await page.locator('#mini-high').textContent(), /^ATH:/);
    await page.click('#mini-high');
    assert.match(await page.locator('#mini-high').textContent(), /^SH:/);
    await page.click('#btn-expand');
    assert.equal(await high.textContent(), 'SH:2');
    await toggle.click();

    await page.emulateMedia({reducedMotion: 'no-preference'});
    assert((await scan(9)).includes('tier-row-red'), 'a live ATH pulses');
    assert(!(await scan(9)).includes('tier-row-red'), 'a plateau does not repeat the pulse');
    assert(!(await scan(8)).includes('tier-row-red'));
    assert((await scan(9)).includes('tier-row-red'), 'returning to ATH pulses');
    await page.emulateMedia({reducedMotion: 'reduce'});

    const archive = await page.evaluate(() => ViewerTracker.__ath.archive());
    archive.room = 'archived_room';
    archive.session.sessionHighs.red = {value: 1234567, time: archive.session.timestamp - 86400000};
    archive.session.roomTotalHigh = 2000000;
    archive.session.roomTotalHighTime = archive.session.timestamp - 86400000;
    const live = (await state()).history;
    const openFile = () => page.locator('#session-file-input').setInputFiles({name: 'archived.tierscope.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(archive))});
    await openFile();
    await page.waitForFunction(() => ViewerTracker.__ath.state().imported);
    assert.equal(await high.textContent(), 'ATH:—', 'opening a file cannot import its records');
    await page.click('#btn-playback-library');
    assert(await replayAdd.isVisible(), 'file Add is available in Library');
    assert(!(await page.locator('#panel-options').isVisible()), 'Library needs no header menu');
    const replayBounds = await panel.boundingBox();
    await page.click('#playback-next');
    const replay = await state();
    await replayAdd.focus(); await page.keyboard.press('Enter');
    assert.equal(await high.textContent(), 'ATH:1.2m');
    assert.match(await page.locator('#tools-message').textContent(), /All-time highs updated for archived_room/);
    assert.deepEqual(await panel.boundingBox(), replayBounds, 'confirmation does not grow or move the panel');
    assert.match(await high.getAttribute('title'), /archived_room: 1,234,567.*Added from a session file/);
    assert.equal((await state()).position, replay.position);
    assert.equal((await state()).playing, false);
    assert.deepEqual((await state()).history, live);
    assert.equal(await page.evaluate(() => ViewerTracker.__ath.records('testroom').red.value), 9);
    assert(await high.evaluate(e => e.scrollWidth <= e.clientWidth), 'large ATH labels fit their column');
    if (process.env.TIERSCOPE_ATH_SCREENSHOT) await panel.screenshot({path: process.env.TIERSCOPE_ATH_SCREENSHOT.replace('.png', '-replay.png')});
    await options.click();
    await page.click('#btn-add-all-time');
    assert.match(await page.locator('#all-time-action-status').textContent(), /No higher records/);
    await replayAdd.click();assert.match(await page.locator('#tools-message').textContent(), /No higher records for archived_room/);
    await options.click();
    if (process.env.TIERSCOPE_ATH_SCREENSHOT) await panel.screenshot({path: process.env.TIERSCOPE_ATH_SCREENSHOT});
    acceptDialog = false;
    await page.click('#btn-clear-all-time');
    assert.equal(await high.textContent(), 'ATH:1.2m');
    acceptDialog = true;
    await page.click('#btn-clear-all-time');
    assert.match(dialogs.at(-1), /Clear all-time highs for archived_room/);
    assert.equal(await high.textContent(), 'ATH:—');
    assert.equal(await page.evaluate(() => ViewerTracker.__ath.records('testroom').red.value), 9);
    await page.click('#btn-add-all-time');
    await page.click('#panel-options-close');
    await scan(12);
    assert.equal(await high.textContent(), 'ATH:1.2m', 'live scans cannot replace the file room records');
    await page.click('#playback-return');
    assert.equal(await high.textContent(), 'ATH:12');
    assert.equal(await page.locator('#tools-current-room').textContent(),'testroom','Library switches back to the live room');
    await page.click('#btn-replay');
    assert.equal(await page.locator('#tools-current-kind').textContent(),'Replay snapshot');
    await page.click('#playback-return');
    count = 4;
    await load('archived_room');
    assert.equal(await high.textContent(), 'ATH:1.2m', 'the file records belong to the model when visiting its actual room');
    assert.equal(await toggle.textContent(), 'ATH', 'mode preference persists across rooms and reloads');
    await page.locator('#dark-mode-toggle').uncheck();
    assert.equal(await high.textContent(), 'ATH:1.2m');
    const controls = await page.locator('#drag-handle button').evaluateAll(buttons => buttons.filter(b => b.getBoundingClientRect().width).map(b => ({x: b.getBoundingClientRect().x, right: b.getBoundingClientRect().right})));
    for (let i = 1; i < controls.length; i++) assert(controls[i].x >= controls[i - 1].right, 'header buttons do not overlap');
    const storedRecords = () => page.evaluate(() => Object.entries(localStorage).filter(([key]) =>
      /^(tierscope:tab:|tierscope:epoch:|tierscope:ath:|tierscope:ath-epoch:|tierscope:v1:)/.test(key)).sort());
    const requestsBeforeDirectory = apiRequests;
    await page.goto('https://tierscope.test/tags/testroom/');
    // The old page saves its final timestamp on unload. Freeze the records
    // after that save and before TierScope starts on the directory.
    const protectedRecords = await storedRecords();
    await page.addScriptTag({content: instrument(source)});
    await page.evaluate(() => ViewerTracker.__ath.init());
    await page.click('#btn-expand');
    assert(await page.locator('#btn-main-reset').isDisabled(), 'directory Reset is disabled');
    await options.click();
    assert(await page.locator('#btn-clear-all-time').isDisabled(), 'directory ATH Clear has no room target');
    assert.equal((await state()).room, null);
    assert.deepEqual(await storedRecords(), protectedRecords, 'directory startup preserves stored room records');
    assert.equal(apiRequests, requestsBeforeDirectory, 'directory startup cannot scan its last path segment');
    await page.click('#panel-options-close');
    await openFile();
    await page.waitForFunction(() => ViewerTracker.__ath.state().imported);
    assert.equal((await state()).room, 'archived_room');
    assert(await page.locator('#btn-main-reset').isDisabled(), 'file replay does not enable directory Reset');
    await options.click();
    assert(await page.locator('#btn-clear-all-time').isEnabled(), 'file room is a valid ATH target on a directory');
    const directoryReplay = await state();
    acceptDialog = false;
    await page.click('#btn-clear-all-time');
    assert.match(dialogs.at(-1), /Clear all-time highs for archived_room/);
    assert.deepEqual(await storedRecords(), protectedRecords, 'cancel leaves stored records intact');
    acceptDialog = true;
    await page.click('#btn-clear-all-time');
    assert.equal(await page.evaluate(() => ViewerTracker.__ath.records('archived_room').red.value), 0);
    assert.equal(await page.evaluate(() => ViewerTracker.__ath.records('testroom').red.value), 12);
    assert.deepEqual(await state(), directoryReplay, 'clearing file ATH preserves replay and live state');
    await page.click('#panel-options-close');
    await page.click('#btn-playback-library');await replayAdd.click();
    assert.equal(await page.evaluate(() => ViewerTracker.__ath.records('archived_room').red.value), 1234567);
    await page.click('#playback-return');
    await options.click();
    assert(await page.locator('#btn-clear-all-time').isDisabled(), 'closing file removes its ATH target');
    assert.equal(apiRequests, requestsBeforeDirectory);
    assert.deepEqual(errors, []);
    console.log('PASS directory Reset/ATH guards and directory file-room Add/Clear with confirmation and room isolation');
    console.log('PASS per-room ATH persistence, SH/ATH header and compact controls, keyboard/theme/layout, mode-specific highlights and pulses, explicit file Add, room isolation, clear confirmation and replay preservation');
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
