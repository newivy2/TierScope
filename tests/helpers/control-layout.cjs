const assert = require('node:assert/strict');
module.exports = async function checkControlLayout(page) {
  const result = await page.evaluate(() => {
    const status = document.getElementById('control-next-scan'), original = status.textContent;
    const ids = ['control-session-row', 'control-session-buttons', 'btn-replay', 'btn-control-library', 'control-next-scan'];
    const measure = () => ids.map(id => {
      const r = document.getElementById(id).getBoundingClientRect();
      return {id, x: r.x, y: r.y, width: r.width, height: r.height};
    });
    const samples = ['Next: 9s', 'Next: 300s', 'Scanning...', 'Paused', 'Stopped', 'Reduced: 300s', 'Check: 60s',
      'Checking...', 'Access denied (403)', 'Rate limited · 15m', 'Retry in 60s'];
    try {
      return samples.map(text => {
        status.textContent = text;
        return {text, bounds: measure(), clipped: status.scrollWidth > status.clientWidth};
      });
    } finally { status.textContent = original; }
  });
  for (const sample of result) {
    assert.deepEqual(sample.bounds, result[0].bounds, 'status must not shift the row: ' + sample.text);
    const [row, buttons, replay, library, status] = sample.bounds;
    assert(status.x >= buttons.x + buttons.width);
    assert(status.x + status.width <= row.x + row.width + .1);
    assert(library.x >= replay.x + replay.width);
    if (/^(Next|Scanning|Paused|Stopped|Reduced|Check)/.test(sample.text)) assert(!sample.clipped, 'normal status fits: ' + sample.text);
  }
};
