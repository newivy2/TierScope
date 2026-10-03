const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const engine = process.env.TIERSCOPE_BROWSER || 'chromium';
const source = fs.readFileSync(path.join(__dirname, '../tierscope.user.js'), 'utf8')
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
    let count = 6, owner = 'testroom', acceptDialog = true;
    page.on('dialog', dialog => {dialogs.push(dialog.message()); return acceptDialog ? dialog.accept() : dialog.dismiss();});
    await page.route('https://tierscope.test/**', route => route.fulfill({
      contentType: route.request().url().includes('/api/') ? 'text/plain' : 'text/html',
      body: route.request().url().includes('/api/') ? '20,' + owner + '|o|f|0,' +
        Array.from({length: count}, (_, i) => 'mod' + i + '|m|m|0').concat(['purple1|l|m|0', 'purple2|l|m|0']).join(',') :
        '<!doctype html><html><body style="background:#303846"></body></html>',
    }));
    const state = () => page.evaluate(() => ViewerTracker.__ath.state());
    async function load(room = 'testroom') {
      owner = room;
      await page.goto('https://tierscope.test/' + room + '/');
      await page.addScriptTag({content: source});
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
    const replayAdd = page.locator('#btn-playback-add-all-time');
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
    assert(await replayAdd.isVisible(), 'file Add is available directly in the replay controls');
    assert(!(await page.locator('#panel-options').isVisible()), 'file Add needs no menu');
    const roomBox = await page.locator('#playback-room').boundingBox(), addBox = await replayAdd.boundingBox();
    assert(roomBox.x + roomBox.width <= addBox.x, 'file Add sits beside the room without overlap');
    assert.equal(roomBox.y + roomBox.height / 2, addBox.y + addBox.height / 2, 'room and Add share a row');
    const replayBounds = await panel.boundingBox();
    await page.click('#playback-next');
    const replay = await state();
    await replayAdd.focus(); await page.keyboard.press('Enter');
    assert.equal(await high.textContent(), 'ATH:1.2m');
    assert.equal(await replayAdd.textContent(), 'Added to ATH', 'the replay controls confirm the addition');
    assert.match(await replayAdd.getAttribute('title'), /Records updated for archived_room/);
    assert.deepEqual(await panel.boundingBox(), replayBounds, 'confirmation does not grow or move the panel');
    assert.match(await high.getAttribute('title'), /archived_room: 1,234,567.*Added from a session file/);
    assert.match(await page.locator('#all-time-action-status').textContent(), /Records updated for archived_room/);
    assert.equal((await state()).position, replay.position);
    assert.equal((await state()).playing, false);
    assert.deepEqual((await state()).history, live);
    assert.equal(await page.evaluate(() => ViewerTracker.__ath.records('testroom').red.value), 9);
    assert(await high.evaluate(e => e.scrollWidth <= e.clientWidth), 'large ATH labels fit their column');
    if (process.env.TIERSCOPE_ATH_SCREENSHOT) await panel.screenshot({path: process.env.TIERSCOPE_ATH_SCREENSHOT.replace('.png', '-replay.png')});
    await options.click();
    await page.click('#btn-add-all-time');
    assert.match(await page.locator('#all-time-action-status').textContent(), /No higher records/);
    assert.equal(await replayAdd.textContent(), 'Already in ATH', 'both buttons share action feedback');
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
    assert(!(await replayAdd.isVisible()), 'file Add disappears when the file closes');
    await page.click('#btn-replay');
    assert(!(await replayAdd.isVisible()), 'file Add stays hidden in ordinary Replay');
    await page.click('#playback-return');
    count = 4;
    await load('archived_room');
    assert.equal(await high.textContent(), 'ATH:1.2m', 'the file records belong to the model when visiting its actual room');
    assert.equal(await toggle.textContent(), 'ATH', 'mode preference persists across rooms and reloads');
    await page.locator('#dark-mode-toggle').uncheck();
    assert.equal(await high.textContent(), 'ATH:1.2m');
    const controls = await page.locator('#drag-handle button').evaluateAll(buttons => buttons.filter(b => b.getBoundingClientRect().width).map(b => ({x: b.getBoundingClientRect().x, right: b.getBoundingClientRect().right})));
    for (let i = 1; i < controls.length; i++) assert(controls[i].x >= controls[i - 1].right, 'header buttons do not overlap');
    assert.deepEqual(errors, []);
    console.log('PASS per-room ATH persistence, SH/ATH header and compact controls, keyboard/theme/layout, mode-specific highlights and pulses, explicit file Add, room isolation, clear confirmation and replay preservation');
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
