import { runtime } from './runtime.js';
import { getTierMarker } from './utils.js';
export function panelRowMarker(row) {
    return row.icon || getTierMarker(row.key);
}

export function collapseMarkerHtml(key) {
    var row = runtime.PANEL_ROWS.find(function(item) { return item.key === key; });
    return '<button type="button" class="tier-collapse-marker" id="collapse-row-' + key +
        '" aria-controls="tier-row-' + key + '" aria-expanded="true" aria-label="Collapse ' + row.label +
        ' row" title="Collapse ' + row.label + ' row" style="display:inline-flex;align-items:center;' +
        'justify-content:center;width:26px;height:24px;padding:0;border:0;border-radius:3px;' +
        'background:transparent;color:inherit;font-size:14px;line-height:1;cursor:pointer;">' +
        panelRowMarker(row) + '</button>';
}

export function collapsedTrayHtml() {
    return '<div id="collapsed-tier-tray" role="group" aria-label="Collapsed rows. Click an icon to restore its row." ' +
        'style="display:none;flex-wrap:wrap;align-items:center;gap:3px;margin-bottom:4px;">' +
        runtime.PANEL_ROWS.map(function(row) {
            return '<button type="button" id="restore-row-' + row.key +
                '" aria-controls="tier-row-' + row.key + '" aria-expanded="false" ' +
                'aria-label="Restore ' + row.label + ' row" title="Restore ' + row.label + ' row" ' +
                'style="display:none;align-items:center;justify-content:center;flex:0 0 22px;width:22px;height:22px;' +
                'box-sizing:border-box;padding:0;border:1px solid ' + (row.key === 'total' ? 'var(--panel-text)' : row.color) + ';border-radius:3px;' +
                'background:rgba(var(--panel-row-rgb),0.05);color:var(--panel-text);font-size:12px;line-height:1;cursor:pointer;">' +
                panelRowMarker(row) + '</button>';
        }).join('') + '</div>';
}

export function applyRowLayout() {
    runtime.chartLayoutRevision++;
    var region = document.getElementById('tier-chart-region');
    var tray = document.getElementById('collapsed-tier-tray');
    var group = document.getElementById('summary-tier-rows');
    var measurable = region && region.offsetHeight > 0;
    var visibleCount = runtime.PANEL_ROWS.length - runtime.collapsedRows.size;
    // Temporarily restore natural layout to measure actual minimum row
    // heights. A text column can be taller than the nominal canvas, depending
    // on inherited line spacing, fonts and the displayed numbers.
    if (region) region.style.height = 'auto';
    runtime.PANEL_ROWS.forEach(function(row) {
        runtime.panelChartHeights[row.key] = row.height;
        var canvas = document.getElementById('spark-' + row.key);
        if (canvas) canvas.style.height = row.height + 'px';
        var element = document.getElementById('tier-row-' + row.key);
        if (measurable && element) element.style.display = row.display;
    });
    if (measurable && tray) tray.style.display = 'none';
    if (measurable && group) group.style.display = 'block';
    if (measurable) {
        runtime.PANEL_ROWS.forEach(function(row) {
            var canvas = document.getElementById('spark-' + row.key);
            if (!canvas) return;
            var parent = canvas.parentElement;
            var style = window.getComputedStyle(parent);
            // clientHeight is unaffected by the panel's CSS scale. Subtract
            // padding to get the flex content height shared with the text.
            var minimum = parent.clientHeight - (parseFloat(style.paddingTop) || 0) -
                (parseFloat(style.paddingBottom) || 0);
            runtime.panelChartHeights[row.key] = Math.max(row.height, minimum);
            canvas.style.height = runtime.panelChartHeights[row.key] + 'px';
        });
        if (runtime.panelChartRegionHeight === null) runtime.panelChartRegionHeight = region.offsetHeight;
    }
    if (tray) tray.style.display = runtime.collapsedRows.size ? 'flex' : 'none';
    runtime.PANEL_ROWS.forEach(function(row) {
        var collapsed = runtime.collapsedRows.has(row.key);
        var element = document.getElementById('tier-row-' + row.key);
        if (element) element.style.display = collapsed ? 'none' : row.display;
        var restore = document.getElementById('restore-row-' + row.key);
        if (restore) restore.style.display = collapsed ? 'inline-flex' : 'none';
        var collapse = document.getElementById('collapse-row-' + row.key);
        if (collapse) collapse.setAttribute('aria-expanded', String(!collapsed));
    });
    if (group) group.style.display = runtime.collapsedRows.has('withtokens') && runtime.collapsedRows.has('total') ? 'none' : 'block';
    var extra = measurable && visibleCount ? Math.max(0, runtime.panelChartRegionHeight - region.offsetHeight) / visibleCount : 0;
    runtime.PANEL_ROWS.forEach(function(row) {
        if (runtime.collapsedRows.has(row.key)) return;
        runtime.panelChartHeights[row.key] += extra;
        var canvas = document.getElementById('spark-' + row.key);
        if (canvas) canvas.style.height = runtime.panelChartHeights[row.key] + 'px';
    });
    // Pin the region instead of allowing fractional canvas rounding to move
    // the rest of the panel. With no open rows, let it shrink to the strip.
    if (region && visibleCount && runtime.panelChartRegionHeight !== null) {
        region.style.height = runtime.panelChartRegionHeight + 'px';
    }
    // Creation/compact mode may hide the region. Measure once it is visible,
    // rather than changing row layout on every scan or Replay animation frame.
    runtime.rowLayoutNeedsMeasure = !measurable;
}

