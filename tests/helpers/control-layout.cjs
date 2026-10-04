const assert = require('node:assert/strict');
module.exports = async function checkControlLayout(page) {
  const result = await page.evaluate(() => {
    const status = document.getElementById('control-next-scan'), original = status.textContent;
    const timer = document.getElementById('control-tracking-timer'), originalTime = timer.textContent;
    const ids = ['control-session-row', 'control-tracking-timer', 'control-next-scan', 'control-action-row',
      'btn-control-library', 'btn-replay', 'btn-control-auto', 'btn-control-stop', 'btn-main-reset', 'dark-mode-control'];
    const measure = () => ids.map(id => {
      const r = document.getElementById(id).getBoundingClientRect();
      return {id, x: r.x, y: r.y, width: r.width, height: r.height};
    });
    const samples = ['Next: 9s', 'Next: 300s', 'Scanning...', 'Paused', 'Stopped', 'Reduced: 300s', 'Check: 60s',
      'Checking...', 'Access denied (403)', 'Rate limited · 15m', 'Retry in 60s'];
    try {
      return ['00:00:09', '12:34:56', '100:00:00'].flatMap(time => samples.map(text => {
        status.textContent = text; timer.textContent = time;
        return {text, time, bounds: measure(), clipped: status.scrollWidth > status.clientWidth};
      }));
    } finally { status.textContent = original; timer.textContent = originalTime; }
  });
  for (const sample of result) {
    assert.deepEqual(sample.bounds, result[0].bounds, 'status/time must not shift controls: ' + sample.text + ', ' + sample.time);
    const [top, timer, status, bottom, ...buttons] = sample.bounds;
    assert(status.x >= timer.x + timer.width, 'countdown follows elapsed time');
    assert(status.x + status.width <= top.x + top.width + .1);
    assert(timer.y >= top.y && timer.y + timer.height <= top.y + top.height + .1, 'elapsed time is on top');
    assert(bottom.y >= top.y + top.height, 'actions follow timing row');
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      assert(button.x >= bottom.x && button.x + button.width <= bottom.x + bottom.width + .1);
      assert(button.y >= bottom.y && button.y + button.height <= bottom.y + bottom.height + .1, button.id + ' stays on bottom');
      if (i) assert(button.x >= buttons[i - 1].x + buttons[i - 1].width, 'bottom controls follow requested order');
    }
    if (/^(Next|Scanning|Paused|Stopped|Reduced|Check)/.test(sample.text)) assert(!sample.clipped, 'normal status fits: ' + sample.text);
  }
};
