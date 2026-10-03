import { drawAllSparklines, hideChartTooltip } from './charts.js';
import { getAnonymousCount } from './dom.js';
import { cancelHighPulse, cancelHighPulses, getDisplayHigh, highDescription, highLabel } from './highs.js';
import { updateDisplay } from './panel.js';
import { paintPlayback } from './replay.js';
import { runtime } from './runtime.js';
import { getTierMarker, log } from './utils.js';

export function loadCollapsedRows() {
    try {
        var raw = GM_getValue(runtime.COLLAPSED_ROWS_KEY, null);
        if (raw !== null && typeof raw !== 'undefined') {
            var saved = JSON.parse(raw);
            if (!Array.isArray(saved) || !saved.every(function(key) {
                return runtime.PANEL_ROWS.some(function(row) { return row.key === key; });
            })) throw new Error('Invalid collapsed-row preferences');
            return new Set(saved);
        }
    } catch (error) {
        log('Could not restore row preferences: ' + error.message);
    }
    return new Set(['red', 'green']);
}

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

export function setRowCollapsed(key, collapsed) {
    cancelHighPulse(key);
    if (!runtime.PANEL_ROWS.some(function(row) { return row.key === key; })) return;
    if (collapsed) runtime.collapsedRows.add(key);
    else runtime.collapsedRows.delete(key);
    try { GM_setValue(runtime.COLLAPSED_ROWS_KEY, JSON.stringify(Array.from(runtime.collapsedRows))); }
    catch (error) { log('Could not save row preferences: ' + error.message); }
    applyRowLayout();
    if (runtime.presentationMode === 'PLAYBACK') {
        // Repaint this exact frame; customizing the panel never advances Replay.
        paintPlayback(runtime.playback);
    } else {
        updateDisplay();
        drawAllSparklines();
    }
    constrainPanelPosition();
    var target = document.getElementById((collapsed ? 'restore-row-' : 'collapse-row-') + key);
    if (target) target.focus({ preventScroll: true });
}

export function bindRowControls() {
    runtime.panelChartRegionHeight = null; // A newly created panel gets its own baseline.
    runtime.PANEL_ROWS.forEach(function(row) {
        [false, true].forEach(function(collapsed) {
            var button = document.getElementById((collapsed ? 'collapse-row-' : 'restore-row-') + row.key);
            if (button) button.onclick = function(event) {
                event.stopPropagation();
                setRowCollapsed(row.key, collapsed);
            };
        });
    });
    var container = document.getElementById('tracker-container');
    if (container) container.addEventListener('transitionend', function(event) {
        if (event.target === container && event.propertyName === 'width') { redrawPanelCharts(); constrainPanelPosition(); }
    });
    applyRowLayout();
}

export function redrawPanelCharts() {
    if (runtime.isMinimized) return;
    runtime.chartLayoutRevision++;
    if (runtime.presentationMode === 'PLAYBACK') paintPlayback(runtime.playback);
    else drawAllSparklines();
}

export function updateCollapsedRowStatus(frame, highlights) {
    runtime.PANEL_ROWS.forEach(function(row) {
        var button = document.getElementById('restore-row-' + row.key);
        if (!button) return;
        var value = row.key === 'withtokens' ? frame.withTokens : row.key === 'total' ? frame.total :
            row.key === 'anon' ? frame.anonymousCount : frame.counts[row.key];
        var historyKey = row.key === 'withtokens' ? 'withTokens' : row.key === 'anon' ? 'anonymous' : row.key;
        var high = getDisplayHigh(frame, historyKey, value);
        var context = frame.isPlayback ? 'Replay' : frame.isRestored ? 'Saved sample' : 'Latest sample';
        button.title = row.label + ': ' + value.toLocaleString() + ' (' + highLabel(high) +
            '). ' + highDescription(high) + '. ' + context + '. Click to restore row.';
        button.setAttribute('aria-label', 'Restore ' + row.label + ' row. ' + context + ': ' + value.toLocaleString());
        button.style.background = highlights && highlights[historyKey] ?
            'rgba(50, 205, 50, 0.22)' : 'rgba(var(--panel-row-rgb),calc(0.05 * var(--tier-background-scale, 1)))';
    });
}

export function cleanupDragListeners() {
    for (var i = 0; i < runtime.dragListeners.length; i++) {
        var listener = runtime.dragListeners[i];
        document.removeEventListener(listener.type, listener.fn, listener.options);
    }
    runtime.dragListeners = [];
}

export function addDragListener(type, fn, options) {
    document.addEventListener(type, fn, options);
    runtime.dragListeners.push({ type: type, fn: fn, options: options });
}

export function loadPanelGeometry() {
    try {
        var raw = GM_getValue(runtime.PANEL_GEOMETRY_KEY, null);
        if (raw === null) return null;
        var data = JSON.parse(raw);
        if (!data || !Number.isFinite(data.left) || !Number.isFinite(data.top) ||
            !Number.isFinite(data.scale) || data.scale < 0.5 || data.scale > 3) return null;
        return { left: data.left, top: data.top, scale: data.scale };
    } catch (error) { return null; }
}

export function constrainPanelPosition() {
    var container = document.getElementById('tracker-container');
    if (!container) return;
    var rect = container.getBoundingClientRect();
    container.style.left = Math.max(0, Math.min(rect.left, Math.max(0, window.innerWidth - rect.width))) + 'px';
    container.style.top = Math.max(0, Math.min(rect.top, Math.max(0, window.innerHeight - rect.height))) + 'px';
    container.style.right = 'auto';
}

export function savePanelGeometry() {
    var container = document.getElementById('tracker-container');
    if (!container) return;
    var rect = container.getBoundingClientRect();
    runtime.panelGeometry = { left: rect.left, top: rect.top, scale: runtime.currentScale };
    try { GM_setValue(runtime.PANEL_GEOMETRY_KEY, JSON.stringify(runtime.panelGeometry)); }
    catch (error) { log('Could not save panel position/scale: ' + error.message); }
}

export function restorePanelGeometry() {
    var container = document.getElementById('tracker-container');
    if (!container) return;
    if (runtime.panelGeometry) {
        container.style.left = runtime.panelGeometry.left + 'px';
        container.style.top = runtime.panelGeometry.top + 'px';
        container.style.right = 'auto';
        applyScale(runtime.panelGeometry.scale);
    } else applyScale(runtime.currentScale);
    constrainPanelPosition();
    redrawPanelCharts();
}

export function restoreStandardSize() {
    applyScale(1);
    redrawPanelCharts();
    constrainPanelPosition();
    savePanelGeometry();
}

export function applyScale(scale) {
    runtime.currentScale = scale;
    var container = document.getElementById('tracker-container');
    if (!container) return;
    container.style.transform = 'scale(' + scale + ')';
    container.style.transformOrigin = 'top left';
    container.dataset.scale = scale;
}

export function setupResizable() {
    var container = document.getElementById('tracker-container');
    if (!container) return;
    var resizeHandle = document.createElement('div');
    resizeHandle.id = 'resize-handle';
    resizeHandle.style.cssText =
        'position:absolute;top:0;left:0;width:16px;height:16px;' +
        'background:linear-gradient(135deg, #ff69b4 50%, transparent 50%);' +
        'cursor:nw-resize;z-index:999999;border-top-left-radius:6px;' +
        'opacity:0.8;transition:opacity 0.2s;';
    resizeHandle.addEventListener('mouseenter', function() {
        this.style.opacity = '1';
    });
    resizeHandle.addEventListener('mouseleave', function() {
        this.style.opacity = '0.8';
    });
    container.appendChild(resizeHandle);
    var startResize = function(e) {
        if (runtime.isDragging) return;
        runtime.isResizing = true;
        runtime.resizeStartX = e.clientX;
        runtime.resizeStartY = e.clientY;
        var rect = container.getBoundingClientRect();
        runtime.resizeStartWidth = rect.width;
        runtime.resizeStartHeight = rect.height;
        e.preventDefault();
        e.stopPropagation();
    };
    var doResize = function(e) {
        if (!runtime.isResizing) return;
        var deltaX = runtime.resizeStartX - e.clientX;
        var deltaY = runtime.resizeStartY - e.clientY;
        var newWidth = runtime.resizeStartWidth + deltaX;
        var baseWidth = container.offsetWidth;
        var newScale = Math.max(0.5, Math.min(3.0, newWidth / baseWidth));
        applyScale(newScale);
    };
    var stopResize = function() {
        if (!runtime.isResizing) return;
        runtime.isResizing = false;
        redrawPanelCharts();
        constrainPanelPosition();
        savePanelGeometry();
    };
    resizeHandle.addEventListener('mousedown', startResize);
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);
    window._trackerResizeCleanup = function() {
        resizeHandle.removeEventListener('mousedown', startResize);
        document.removeEventListener('mousemove', doResize);
        document.removeEventListener('mouseup', stopResize);
    };
}

export function setupResizeHandler() {
    if (runtime.windowResizeHandler) {
        window.removeEventListener('resize', runtime.windowResizeHandler);
        runtime.windowResizeHandler = null;
    }
    var resizeTimeout;
    runtime.windowResizeHandler = function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            constrainPanelPosition();
            redrawPanelCharts();
        }, 100);
    };
    window.addEventListener('resize', runtime.windowResizeHandler);
}

export function setupDraggable() {
    var container = document.getElementById('tracker-container');
    var dragHandle = document.getElementById('drag-handle');
    if (!container || !dragHandle) return;
    var startDrag = function(e) {
        if (runtime.isResizing || (e.target.closest && e.target.closest('button, input, select, a'))) return;
        runtime.isDragging = true;
        var rect = container.getBoundingClientRect();
        var scale = runtime.currentScale || 1;
        runtime.dragOffsetX = (e.clientX - rect.left) / scale;
        runtime.dragOffsetY = (e.clientY - rect.top) / scale;
        if (container.style.right !== 'auto') {
            container.style.left = rect.left + 'px';
            container.style.right = 'auto';
        }
        addDragListener('mousemove', doDrag, false);
        addDragListener('mouseup', stopDrag, false);
        e.preventDefault();
    };
    var doDrag = function(e) {
        if (!runtime.isDragging) return;
        var scale = runtime.currentScale || 1;
        var newX = e.clientX - (runtime.dragOffsetX * scale);
        var newY = e.clientY - (runtime.dragOffsetY * scale);
        var maxX = window.innerWidth - (container.offsetWidth * scale);
        var maxY = window.innerHeight - (container.offsetHeight * scale);
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
        container.style.left = newX + 'px';
        container.style.top = newY + 'px';
    };
    var stopDrag = function() {
        runtime.isDragging = false;
        cleanupDragListeners();
        savePanelGeometry();
    };
    dragHandle.addEventListener('mousedown', startDrag, false);
}

export function toggleView() {
    hideChartTooltip();
    if (runtime.presentationMode === 'PLAYBACK') return;
    cancelHighPulses();
    runtime.isMinimized = !runtime.isMinimized;
    var fullView = document.getElementById('full-view');
    var miniView = document.getElementById('minimized-view');
    var toggleBtn = document.getElementById('btn-toggle');
    var container = document.getElementById('tracker-container');
    var headerText = document.getElementById('header-text');
    var resizeHandle = document.getElementById('resize-handle');
    var anonymousCount = getAnonymousCount();
    var previousTransition = container ? container.style.transition : '';
    // Measure the final expanded size immediately, not an intermediate
    // animated width. Clamping must also work without transition events.
    if (container) container.style.transition = 'none';
    if (runtime.isMinimized) {
        if (fullView) fullView.style.display = 'none';
        if (miniView) miniView.style.display = 'block';
        if (toggleBtn) toggleBtn.textContent = '+';
        if (container) container.style.width = runtime.BASE_WIDTH_MINI + 'px';
        if (resizeHandle) resizeHandle.style.display = 'none';
        if (runtime.isResizing) runtime.isResizing = false;
        var currentTotal = runtime.roomTotal > 0 ? runtime.roomTotal : (runtime.users.size + anonymousCount);
        if (headerText) headerText.textContent = currentTotal.toLocaleString() + ' (H:' + runtime.roomTotalHigh.toLocaleString() + ')';
    } else {
        if (fullView) fullView.style.display = 'block';
        if (miniView) miniView.style.display = 'none';
        if (toggleBtn) toggleBtn.textContent = '−';
        if (container) container.style.width = runtime.BASE_WIDTH_FULL + 'px';
        if (resizeHandle) resizeHandle.style.display = 'block';
        var currentTotal = runtime.roomTotal > 0 ? runtime.roomTotal : (runtime.users.size + anonymousCount);
        if (headerText) headerText.textContent = 'USERS: ' + currentTotal.toLocaleString() + ' (H:' + runtime.roomTotalHigh.toLocaleString() + ')';

    }
    var settings = document.getElementById('mini-settings');
    if (settings) settings.style.display = 'none';
    var settingsButton = document.getElementById('mini-settings-toggle');
    if (settingsButton) settingsButton.setAttribute('aria-expanded', 'false');
    updateDisplay();
    if (!runtime.isMinimized) {
        drawAllSparklines();
        constrainPanelPosition();
    }
    constrainPanelPosition();
    if (container) container.style.transition = previousTransition;
}
