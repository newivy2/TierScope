const assert = require('node:assert/strict'), path = require('node:path');
const engine = process.env.TIERSCOPE_BROWSER || 'chromium';
const bundle = require('esbuild').buildSync({stdin: {contents: `
import {renderAnalysisChart} from './src/analysis-chart-view.js';
import {buildLiveModelSeries} from './src/live-model-chart-data.js';
window.chartFixture={renderAnalysisChart,buildLiveModelSeries};`, resolveDir: path.join(__dirname, '..')},
    bundle: true, write: false, format: 'iife', target: 'es2022'}).outputFiles[0].text;
(async () => {
    const browser = await require('playwright')[engine].launch({headless: true, executablePath: process.env.TIERSCOPE_CHROMIUM_PATH,
        args: JSON.parse(process.env.TIERSCOPE_CHROMIUM_ARGS || '[]')});
    try {
        const page = await browser.newPage({viewport: {width: 900, height: 1100}, timezoneId: 'UTC'}), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setContent(`<style>body{background:#15131e;color:white;font:12px Arial}#view{width:500px;--panel-text:#fff;--panel-muted:#aaa;--panel-divider:#555}canvas{display:block;width:100%;height:200px}.tools-chart-legend{display:flex;gap:12px}.tools-series-swatch{display:inline-block;width:15px;border-top:2px solid}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:3px}</style><main id="view" data-theme="dark"></main>`);
        await page.addScriptTag({content: bundle});
        await page.evaluate(() => {
            window.strokeLog = [];
            const stroke = CanvasRenderingContext2D.prototype.stroke;
            CanvasRenderingContext2D.prototype.stroke = function(...args) {
                if (Math.abs(this.lineWidth - 1.8) < 0.01) strokeLog.push({alpha: this.globalAlpha, dash: this.getLineDash(), color: this.strokeStyle});
                return stroke.apply(this, args);
            };
            window.now = Date.UTC(2026, 9, 24, 0, 2);
            window.archives = [
                {room: 'alice', session: {history: {timestamps: [now - 180000, now - 60000], breaks: [false, false], total: [40, 60], anonymous: [5, 5]}}},
                {room: 'brenda', session: {history: {timestamps: [now - 120000, now], breaks: [false, false], total: [70, 80], anonymous: [5, 5]}}}
            ];
            const projection = chartFixture.buildLiveModelSeries(archives, 'room', {now, windowMs: 240000});
            window.chartConfig = {originAt: projection.originAt, sourceIds: ['tab-alice', 'tab-brenda'], colorIndices: [0, 1]};
            window.chart = chartFixture.renderAnalysisChart(document.getElementById('view'), projection.series, projection.labels,
                projection.axisMs, 'Room audience', null, 'live', chartConfig);
            window.initialCanvas = chart.canvas;
        });
        assert.deepEqual(await page.locator('.tools-chart-legend label span:last-child').allTextContents(), ['alice', 'brenda']);
        assert.deepEqual(await page.locator('.tools-series-swatch').evaluateAll(nodes => nodes.map(node => [node.style.borderTopStyle, node.style.opacity])), [['solid', '1'], ['solid', '1']]);
        assert.equal(await page.getByText(/Latest session/).count(), 0);
        const colors = await page.locator('.tools-chart-legend label').evaluateAll(nodes => nodes.map(node => node.style.color));
        assert.notEqual(colors[0], colors[1]);
        assert(await page.evaluate(() => strokeLog.length >= 2 && strokeLog.every(stroke => stroke.alpha === 1 && !stroke.dash.length)));
        assert.match(await page.locator('#tools-chart-range').textContent(), /10\/23\/2026.*10\/24\/2026/);
        const canvas = page.locator('canvas#tools-analysis-chart'); await canvas.focus();
        await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
        assert.equal(await page.locator('#tools-chart-inspection tbody tr').first().locator('td').first().textContent(), '45');
        assert.match(await page.locator('#tools-chart-inspection caption').textContent(), /10\/23\/2026/);
        await page.keyboard.press('End');
        assert.deepEqual(await page.locator('#tools-chart-inspection tbody tr td:first-of-type').allTextContents(), ['—', '85']);
        assert.match(await page.locator('#tools-chart-inspection tbody tr').first().textContent(), /No accepted sample/);
        await page.keyboard.press('ArrowLeft'); await page.click('#tools-chart-zoom-in');
        await page.uncheck('[data-analysis-series="1"]');
        const before = await page.evaluate(() => {const state = chart.capture(); return {
            cursor: state.originAt + state.cursor, start: state.originAt + state.start, end: state.originAt + state.end};});
        await page.evaluate(() => {
            now += 30000;
            archives[0].session.history.timestamps.push(now); archives[0].session.history.total.push(90); archives[0].session.history.anonymous.push(5); archives[0].session.history.breaks.push(false);
            const projection = chartFixture.buildLiveModelSeries(archives, 'room', {now, windowMs: 240000});
            chartConfig = {...chartConfig, originAt: projection.originAt};
            chart.update(projection.series, projection.axisMs, 'Room audience', 'live', chartConfig);
        });
        const after = await page.evaluate(() => {const state = chart.capture(); return {
            cursor: state.originAt + state.cursor, start: state.originAt + state.start, end: state.originAt + state.end};});
        assert.deepEqual(after, before, 'new samples keep a pinned real timestamp and zoom range');
        assert.equal(await page.evaluate(() => chart.canvas === initialCanvas), true);
        assert.equal(await page.locator('[data-analysis-series="1"]').isChecked(), false);
        assert.deepEqual(await page.locator('.tools-chart-legend label').evaluateAll(nodes => nodes.map(node => node.style.color)), colors);
        await page.evaluate(() => {document.getElementById('view').dataset.theme = 'bright'; chart.draw();});
        const brightColors = await page.locator('.tools-chart-legend label').evaluateAll(nodes => nodes.map(node => node.style.color));
        assert.notDeepEqual(brightColors, colors); assert.notEqual(brightColors[0], brightColors[1]);
        assert.deepEqual(errors, []); await page.close();
        console.log(engine + ': live chart real-date alignment, midnight, solid distinct colors, no future holds, model inspection and stable pinned zoom/visibility across updates passed');
    } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
