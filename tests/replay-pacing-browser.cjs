const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const engine = process.env.TIERSCOPE_BROWSER || 'chromium';
const source = fs.readFileSync(path.join(__dirname, '../tierscope.user.js'), 'utf8')
  .replaceAll('scheduleInit(2000);', '')
  .replace('downloadTrackingReport: downloadTrackingReport,', `
    __pacing: {
      setup() {
        loadSession(getModelName());
        var now = Date.now(), times = [now - 3960000, now - 3900000, now - 300000, now];
        var data = {timestamps: times, breaks: [false, false, true, false]};
        STORAGE_HISTORY_SERIES.forEach(key => data[key] = [10, 20, 20, 40]);
        restoreSessionState(normalizeStoredSession({timestamp: now, history: data, isPaused: true, pausedElapsedTime: 60000}));
        isAutoRefreshOn = false; isMinimized = true; createPanel(); toggleView();
        collapsedRows = new Set(); applyRowLayout(); repaintLivePresentation();
      },
      archive: captureSessionFile,
      state: () => ({index: playback && getPlaybackSampleIndex(playback.snapshot, playback.positionMs, playback.stepIndex),
        playing: !!(playback && playback.playing), samplePosition: playback && playback.samplePosition,
        imported: !!(playback && playback.imported), history})
    },
    downloadTrackingReport: downloadTrackingReport,`);

(async () => {
  const browser = await require('playwright')[engine].launch({
    headless: true,
    executablePath: process.env.TIERSCOPE_CHROMIUM_PATH,
    args: JSON.parse(process.env.TIERSCOPE_CHROMIUM_ARGS || '[]'),
  });
  try {
    const page = await browser.newPage({viewport: {width: 1100, height: 1100}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({time: new Date('2026-08-01T12:00:00Z')});
    await page.clock.pauseAt(new Date('2026-08-01T12:01:00Z'));
    await page.route('https://tierscope.test/**', route => route.fulfill({
      contentType: 'text/html', body: '<!doctype html><html><body></body></html>',
    }));
    await page.addInitScript(() => {
      window.GM_listValues = () => Object.keys(localStorage);
      window.GM_getValue = (key, fallback) => localStorage.getItem(key) === null ? fallback : JSON.parse(localStorage.getItem(key));
      window.GM_setValue = (key, value) => localStorage.setItem(key, JSON.stringify(value));
      window.GM_deleteValue = key => localStorage.removeItem(key);
    });
    await page.goto('https://tierscope.test/testroom/');
    await page.addScriptTag({content: source});
    await page.evaluate(() => ViewerTracker.__pacing.setup());
    const history = await page.evaluate(() => ViewerTracker.__pacing.state().history);
    const archive = await page.evaluate(() => ViewerTracker.__pacing.archive());
    const canvas = page.locator('#spark-red');
    const state = () => page.evaluate(() => ViewerTracker.__pacing.state());
    const drawing = () => canvas.evaluate(c => {
      const {plot} = c._tierScopeChart;
      const pixels = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let orange = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (Math.abs(pixels[i] - 232) < 4 && Math.abs(pixels[i + 1] - 155) < 4 && Math.abs(pixels[i + 2] - 69) < 4 && pixels[i + 3] > 0) orange++;
      }
      return {pixels: c.toDataURL(), end: plot.end, endTime: plot.endTime, gap: !!plot.continuation?.gap, orange};
    });

    for (const imported of [false, true]) {
      if (imported) {
        await page.locator('#session-file-input').setInputFiles({
          name: 'paused-session.tierscope.json', mimeType: 'application/json',
          buffer: Buffer.from(JSON.stringify(archive)),
        });
        await page.waitForFunction(() => ViewerTracker.__pacing.state().imported);
        assert.equal((await state()).playing, false);
        await page.locator('#playback-play').click({force: true});
      } else {
        await page.locator('#btn-replay').click({force: true});
      }
      await page.clock.runFor(1000);
      assert.equal((await state()).index, 1);
      await page.clock.runFor(250);
      const early = await drawing();
      assert(early.gap, 'draw an animated dashed bridge inside the recorded pause');
      assert(early.orange > 0, 'the gap bridge uses orange dashes');
      assert.equal(await page.locator('#count-red').textContent(), '20');
      await page.clock.runFor(400);
      const later = await drawing();
      assert.equal(later.end, 1, 'animation cannot create a recorded sample');
      assert(later.endTime > early.endTime);
      assert.notEqual(later.pixels, early.pixels, 'even a flat gap must visibly keep moving');
      assert.equal(await page.locator('#count-red').textContent(), '20');
      assert.equal(await page.locator('#high-red').textContent(), 'SH:20');
      assert(Math.abs(Number(await page.locator('#playback-scrubber').inputValue()) - 1.65) < 1e-9);

      await page.locator('#playback-play').click({force: true});
      const paused = await drawing();
      await page.clock.runFor(10000);
      assert.deepEqual(await drawing(), paused, 'Replay Pause freezes the animated connection');
      await page.locator('#playback-play').click({force: true});
      await page.clock.runFor(350);
      assert.equal((await state()).index, 2);
      await page.clock.runFor(1000);
      assert.equal((await state()).index, 3);
      assert.equal((await state()).playing, false);
      assert.equal(await page.locator('#count-red').textContent(), '40');

      await page.locator('#playback-scrubber').evaluate(input => {
        input.value = '1.5'; input.dispatchEvent(new Event('input'));
      });
      assert.equal((await state()).index, 1);
      assert.equal((await state()).playing, false);
      await page.locator('#playback-next').click({force: true});
      assert.equal((await state()).index, 2);
      assert.deepEqual((await state()).history, history, 'Replay leaves recorded timestamps and gap markers intact');
      await page.locator('#playback-return').click({force: true});
    }
    assert.deepEqual(errors, []);
    console.log('PASS ordinary and file Replay: even sample pacing, moving gap connections, exact counts/highs, pause/resume, seeking, stepping, and unchanged history');
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
