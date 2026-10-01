// ==UserScript==
// @name         TierScope - Chaturbate Viewers Visualizer
// @namespace    http://tampermonkey.net/
// @version      3.1.16
// @description  TierScope - Viewer visualizer with trend tracking, reports, and GIF export
// @author       newivy
// @match        https://chaturbate.com/*
// @match        https://*.chaturbate.com/*
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @require      https://cdn.jsdelivr.net/npm/omggif@1.0.10/omggif.js
// @run-at       document-end
// ==/UserScript==

const ViewerTracker = (function() {
    'use strict';

    const TIERSCOPE_VERSION = '3.1.16';
    const API_TIMEOUT_MS = 10000;
    const DEFAULT_API_INTERVAL_SECONDS = 60;
    const DOM_FALLBACK_INTERVAL_SECONDS = 60;
    const STORAGE_SCHEMA_VERSION = 2;
    const STORAGE_KEY_PREFIX = 'tierscope:v1:';
    const STORAGE_MAX_AGE_MS = 3 * 60 * 60 * 1000;
    const STORAGE_HISTORY_SERIES = ['red', 'green', 'purple', 'pink', 'dark-blue', 'light-blue', 'gray',
        'female-trans', 'withTokens', 'total', 'anonymous'];
    const STORAGE_NULLABLE_TIMES = ['withTokensHighTime', 'totalHighTime', 'anonHighTime',
        'femaleTransHighTime', 'roomTotalHighTime', 'trackingStartTime', 'sessionStartedAt'];
    var sessionStorageStatus = new Map();
    var sessionRecordWarnings = new Map();
    var activeSessionStorageKey = null;
    // Tabs never overwrite each other's records. The shared epoch changes only on Reset.
    const TAB_RECORD_PREFIX = 'tierscope:tab:v2:';
    const ROOM_EPOCH_PREFIX = 'tierscope:epoch:v2:';
    var activeRoomEpoch = null;
    var tabRecords = new Map();
    var sessionStorageNotice = '';
    var sessionStartedAt = null;
    var sessionStartEstimated = false;
    var sessionHighs = {};

    // GIF Export State
    var gifExportJob = null;

    const DOM_SELECTORS = {
        userListTab: '#UserListTab',
        usernameElements: [
            '[data-testid="username-label"]',
            '[data-testid="username"]',
            '.username',
            'a[href^="/b/"]',
            'a[href^="/p/"]'
        ],
        roomTotal: [
            '[data-testid="users-tab-default"]',
            '.users-tab',
            '[data-paction-name="USERS"]',
            'button[data-tab="users"]',
            '[class*="users"]'
        ],
        tabs: {
            users: [
                '[data-tab="users"]',
                '[data-testid="users-tab"]',
                '[data-testid="users-tab-default"]',
                '.users-tab',
                'button[data-paction-name="USERS"]'
            ],
            chat: [
                '[data-tab="chat"]',
                '[data-testid="chat-tab"]',
                '[data-testid="chat-tab-default"]',
                '.chat-tab',
                'button[data-paction-name="CHAT"]'
            ]
        }
    };

    let domHealthStatus = {
        lastCheck: 0,
        userListTabFound: false,
        consecutiveFailures: 0,
        isHealthy: true
    };

    var healthCheckInterval = null;
    var initGuard = 0;
    var urlCheckInterval = null;
    var scanEpoch = 0;
    var lastAcceptedAcquisition = null;
    // Aggregate saved counts are presentation-only until a fresh scan succeeds.
    var restoredDisplayFrame = null;
    var lastAcquisitionAttemptSource = 'API';
    var domFallbackReadyAtByRoom = new Map();
    var freshnessInterval = null;
    var nextScanAt = 0;
    var windowResizeHandler = null;
    var miniSettingsKeyHandler = null;

    var previousCounts = {
        'red': 0, 'green': 0, 'purple': 0, 'pink': 0,
        'dark-blue': 0, 'light-blue': 0, 'gray': 0, 'female-trans': 0,
        'withTokens': 0, 'total': 0, 'anonymous': 0
    };

    var hasTrendBaseline = false;
    var trendComparisonMode = 'last';
    var autoTrendEscalation = true;
    var newHighTiers = {};
    var highPulseAnimations = new Map();
    var highPulseMotion = typeof window.matchMedia === 'function' ?
        window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (highPulseMotion) {
        var motionChanged = function(event) { if (event.matches) cancelHighPulses(); };
        if (highPulseMotion.addEventListener) highPulseMotion.addEventListener('change', motionChanged);
        else if (highPulseMotion.addListener) highPulseMotion.addListener(motionChanged);
    }

    function cancelHighPulse(key) {
        var animation = highPulseAnimations.get(key);
        highPulseAnimations.delete(key);
        if (animation) {
            try { animation.cancel(); } catch (error) { /* A decoration must not affect tracking. */ }
        }
    }

    function cancelHighPulses() {
        Array.from(highPulseAnimations.keys()).forEach(cancelHighPulse);
    }

    // Called once, after a live sample commits successfully. Rendering, Replay,
    // restoration and layout changes never generate notification events.
    function pulseAcceptedHighs(priorState) {
        try {
            if (presentationMode !== 'LIVE' || isMinimized || restoredDisplayFrame ||
                document.visibilityState === 'hidden' || (highPulseMotion && highPulseMotion.matches)) {
                cancelHighPulses();
                return;
            }
            PANEL_ROWS.forEach(function(row) {
                var key = row.key === 'withtokens' ? 'withTokens' : row.key === 'anon' ? 'anonymous' : row.key;
                if (!newHighTiers[key]) { cancelHighPulse(row.key); return; }
                var previousHigh = priorState.sessionHighs[key];
                var raisedHigh = sessionHighs[key].value > (previousHigh ? previousHigh.value : 0);
                if (priorState.newHighTiers[key] && !raisedHigh) return;
                var target = document.getElementById((collapsedRows.has(row.key) ? 'restore-row-' : 'tier-row-') + row.key);
                if (!target || typeof target.animate !== 'function') return;
                cancelHighPulse(row.key);
                var animation = target.animate([
                    { backgroundColor: 'rgba(50, 205, 50, 0.22)', boxShadow: 'inset 0 0 0 1px rgba(105, 190, 69, 0)', offset: 0 },
                    { backgroundColor: 'rgba(50, 205, 50, 0.40)', boxShadow: 'inset 0 0 0 1px rgba(105, 190, 69, 0.75)', offset: 0.5 },
                    { backgroundColor: 'rgba(50, 205, 50, 0.22)', boxShadow: 'inset 0 0 0 1px rgba(105, 190, 69, 0)', offset: 1 }
                ], { duration: 850, iterations: 2, easing: 'ease-in-out', fill: 'none' });
                highPulseAnimations.set(row.key, animation);
                animation.onfinish = animation.oncancel = function() {
                    if (highPulseAnimations.get(row.key) === animation) highPulseAnimations.delete(row.key);
                };
            });
        } catch (error) { log('High pulse unavailable: ' + error.message); }
    }


    function validateDOMHealth() {
        const now = Date.now();
        const container = document.getElementById('tracker-container');
        const userListTab = document.querySelector(DOM_SELECTORS.userListTab);
        const hasUserList = !!userListTab;
        let hasUsernameElements = false;
        for (let i = 0; i < DOM_SELECTORS.usernameElements.length; i++) {
            if (document.querySelector(DOM_SELECTORS.usernameElements[i])) {
                hasUsernameElements = true;
                break;
            }
        }
        const health = {
            timestamp: now,
            userListTab: hasUserList,
            usernameElements: hasUsernameElements,
            container: !!container,
            roomTotalSelectors: DOM_SELECTORS.roomTotal.some(sel => !!document.querySelector(sel))
        };
        const wasHealthy = domHealthStatus.isHealthy;
        domHealthStatus.isHealthy = health.userListTab && health.usernameElements;
        domHealthStatus.lastCheck = now;
        domHealthStatus.userListTabFound = hasUserList;
        if (!domHealthStatus.isHealthy) {
            domHealthStatus.consecutiveFailures++;
            if (domHealthStatus.consecutiveFailures === 1 || domHealthStatus.consecutiveFailures % 10 === 0) {
                console.warn('[TierScope ' + TIERSCOPE_VERSION + '] DOM health check failed:', health);
                if (container) {
                    const statusEl = document.getElementById('auto-status');
                    if (statusEl) {
                        statusEl.textContent = 'DOM mismatch - check console';
                        statusEl.style.color = 'var(--panel-negative)';
                    }
                }
            }
            if (domHealthStatus.consecutiveFailures > 5 && isAutoRefreshOn) {
                console.warn('[TierScope ' + TIERSCOPE_VERSION + '] Auto-pausing due to DOM health issues');
                toggleAutoRefresh();
            }
        } else {
            if (!wasHealthy && domHealthStatus.consecutiveFailures > 0) {
                console.log('[TierScope ' + TIERSCOPE_VERSION + '] DOM health restored');
                const statusEl = document.getElementById('auto-status');
                if (statusEl && isAutoRefreshOn) {
                    statusEl.textContent = 'Next: ' + countdownSeconds + 's';
                    statusEl.style.color = 'var(--panel-positive)';
                }
            }
            domHealthStatus.consecutiveFailures = 0;
        }
        return health;
    }

    var users = new Map();
    var previousUserCount = 0;
    var previousRoomTotal = 0;
    var isMinimized = true;
    var roomTotal = 0;
    var roomTotalHigh = 0;
    var isDragging = false;
    var dragOffsetX = 0;
    var dragOffsetY = 0;
    var countdownInterval = null;
    var isAutoRefreshOn = true;
    var isScanning = false;
    var countdownSeconds = DEFAULT_API_INTERVAL_SECONDS;
    var scanIntervalSeconds = DEFAULT_API_INTERVAL_SECONDS;
    var trackingStartTime = null;
    var trackingTimerInterval = null;
    var isPaused = false;
    var pausedElapsedTime = 0;
    var dragListeners = [];
    var isResizing = false;
    var resizeStartX = 0;
    var resizeStartY = 0;
    var resizeStartWidth = 0;
    var resizeStartHeight = 0;
    var currentScale = 1.0;
    const PANEL_GEOMETRY_KEY = 'tierscope:ui:geometry:v1';
    var panelGeometry = loadPanelGeometry();
    const PANEL_THEME_KEY = 'tierscope:ui:theme:v1';
    // Dark mode is the default; theme is a UI preference, independent of Reset.
    var isDarkMode = true;
    try { isDarkMode = GM_getValue(PANEL_THEME_KEY, 'dark') !== 'bright'; }
    catch (error) { /* Keep dark mode when preferences are unavailable. */ }
    const PANEL_THEME_COLORS = {
        rgb: ['20,20,30', '248,249,252'],
        text: ['#ffffff', '#202330'],
        muted: ['#aaa', '#596174'],
        secondary: ['#ddd', '#41485a'],
        subtle: ['#888', '#626978'],
        faint: ['#666', '#687183'],
        button: ['#333', '#e3e6ed'],
        'button-strong': ['#444', '#d7dce6'],
        divider: ['#555', '#b6bdca'],
        'row-rgb': ['255,255,255', '0,0,0'],
        settings: ['#20202b', '#f0f2f7'],
        solid: ['#14141e', '#f8f9fc'],
        tooltip: ['#171722', '#ffffff'],
        positive: ['#32CD32', '#23751f'],
        warning: ['#ffd43b', '#825d00'],
        negative: ['#ff4444', '#b52332'],
        paused: ['#ff9999', '#b52332'],
        'delta-up': ['#69BE45', '#357b21'],
        'delta-down': ['#ff7777', '#b52332'],
        accent: ['#ff69b4', '#b42370']
    };

    function themeColor(token) { return PANEL_THEME_COLORS[token][isDarkMode ? 0 : 1]; }

    function setThemeVariables(element) {
        if (!element) return;
        Object.keys(PANEL_THEME_COLORS).forEach(function(token) {
            element.style.setProperty('--panel-' + token, themeColor(token));
        });
        element.style.colorScheme = isDarkMode ? 'dark' : 'light';
    }

    function applyPanelTheme(redraw) {
        var container = document.getElementById('tracker-container');
        if (!container) return;
        setThemeVariables(container);
        container.setAttribute('data-theme', isDarkMode ? 'dark' : 'bright');
        setThemeVariables(document.getElementById('tierscope-chart-tooltip'));
        var toggle = document.getElementById('dark-mode-toggle');
        if (toggle) toggle.checked = isDarkMode;
        var control = document.getElementById('dark-mode-control');
        if (control) control.title = isDarkMode ? 'Dark mode on — switch to bright mode' : 'Bright mode on — switch to dark mode';
        updateContainerOpacity(panelBackgroundPercent);
        if (redraw) {
            hideChartTooltip();
            updateDisplay();
            redrawPanelCharts();
        }
    }

    const MINI_METRIC_KEY = 'tierscope:ui:miniMetric:v1';
    const MINI_METRICS = ['room', 'withTokens', 'total'];
    var miniMetric = 'room';
    try {
        var savedMiniMetric = GM_getValue(MINI_METRIC_KEY, 'room');
        if (MINI_METRICS.indexOf(savedMiniMetric) !== -1) miniMetric = savedMiniMetric;
    } catch (error) { /* Use the default metric if preferences are unavailable. */ }

    function compactNumber(value) {
        return value >= 1000000 ? (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'm' :
            value >= 10000 ? (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(value);
    }

    function updateMiniFreshness() {
        var el = document.getElementById('mini-freshness');
        if (!el) return;
        var sample = lastAcceptedAcquisition || restoredDisplayFrame;
        var source = lastAcceptedAcquisition ? lastAcceptedAcquisition.source : sample ? 'Saved' : 'No sample';
        el.textContent = sessionStorageNotice ? 'Local only' : (isAutoRefreshOn ? source : 'Paused') +
            (sample ? ' · ' + formatSampleAge(sample.timestamp) : '');
        el.style.color = sessionStorageNotice ? 'var(--panel-warning)' : isAutoRefreshOn ? 'var(--panel-muted)' : 'var(--panel-paused)';
        var policyMessage = requestPolicyMessage(readRequestPolicy());
        if (policyMessage && !sessionStorageNotice) { el.textContent = policyMessage; el.style.color = 'var(--panel-warning)'; }
        el.title = sessionStorageNotice || (policyMessage ? policyMessage + '. ' : '') + source + (sample ? ': ' + new Date(sample.timestamp).toISOString() : '') +
            '. Age of the last accepted sample. ' + (isAutoRefreshOn ? 'Next attempt: ' + countdownSeconds + 's.' : 'Automatic scans paused.');
    }

    function updateCompactDashboard(frame) {
        if (!isMinimized) return;
        var comparison = !frame.isRestored && hasTrendBaseline ? getComparisonCounts().counts : null;
        var mode = trendComparisonMode === 'last' ? 'previous sample' : trendComparisonMode === 'start' ? 'first retained sample' : trendComparisonMode;
        function delta(id, value, old) {
            var el = document.getElementById(id);
            if (!el) return '';
            var change = comparison ? value - old : null;
            var text = change === null ? '' : change > 0 ? '+' + compactNumber(change) : change < 0 ? '−' + compactNumber(-change) : '0';
            el.textContent = text;
            el.style.color = change > 0 ? 'var(--panel-delta-up)' : change < 0 ? 'var(--panel-delta-down)' : 'var(--panel-warning)';
            el.title = change === null ? 'Waiting for a fresh sample and comparison history' : 'Change versus ' + mode + ': ' + change;
            return text;
        }
        delta('mini-withtokens-change', frame.withTokens, comparison && comparison.withTokens);
        delta('mini-total-change', frame.total, comparison && comparison.total);
        var roomChange = delta('mini-room-change', frame.fullRoomTotal, comparison && comparison.total + comparison.anonymous);
        var header = document.getElementById('header-text');
        if (header) {
            header.textContent = (frame.isRestored ? 'SAVED: ' : '') + compactNumber(frame.fullRoomTotal);
            header.title = getModelName() + ' — Room total: ' + frame.fullRoomTotal.toLocaleString() +
                '; session high: ' + frame.roomTotalHigh.toLocaleString() + (roomChange ? '; change: ' + roomChange + ' versus ' + mode : '');
        }
        ['withtokens', 'total'].forEach(function(key) {
            var el = document.getElementById('mini-' + key);
            var value = key === 'total' ? frame.total : frame.withTokens;
            if (el) { el.textContent = compactNumber(value); el.title = value.toLocaleString() + (key === 'total' ? ' registered users' : ' users in token-classified tiers'); }
        });
        var label = document.getElementById('mini-metric');
        var names = { room: 'Room total', withTokens: 'With Tokens', total: 'Registered' };
        if (label) { label.textContent = (miniMetric === 'room' ? 'Room total' : miniMetric === 'withTokens' ? '💎' : '📊') + ' ▾'; label.setAttribute('aria-label', names[miniMetric] + ' chart. Activate to change metric.'); label.title = 'Click to cycle Room total, With Tokens, and Registered. Showing the last 15 recorded minutes.'; }
        var high = document.getElementById('mini-high');
        var peak = miniMetric === 'room' ? frame.roomTotalHigh : getSessionHigh(miniMetric, 0).value;
        if (high) { high.textContent = 'H:' + compactNumber(peak); high.title = 'Session high: ' + peak.toLocaleString(); }
        var canvas = document.getElementById('mini-chart');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        if (!ctx) return;
        var width = 140, height = 36, scale = window.devicePixelRatio || 1;
        canvas.width = Math.ceil(width * scale); canvas.height = Math.ceil(height * scale);
        ctx.scale(scale, scale); ctx.clearRect(0, 0, width, height);
        var times = frame.history.timestamps;
        canvas.title = names[miniMetric] + ' — last 15 recorded minutes; vertical scale fits the visible values';
        if (!times.length) return;
        var end = times[times.length - 1], start = end - 15 * 60000;
        var breaks = getHistoryBreaks(frame.history);
        var points = [];
        times.forEach(function(time, i) {
            if (time >= start && time <= end) points.push({ time: time, gap: breaks[i], value: miniMetric === 'room' ?
                frame.history.total[i] + frame.history.anonymous[i] : frame.history[miniMetric][i] });
        });
        var values = points.map(function(p) { return p.value; });
        var min = Math.min.apply(null, values), max = Math.max.apply(null, values);
        canvas.title += '; range ' + min + '–' + max + '; ' + points.length + ' samples through ' + new Date(end).toISOString();
        ctx.strokeStyle = miniMetric === 'withTokens' ? '#ff69b4' : miniMetric === 'total' ? themeColor('text') : '#69BE45';
        ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 2; ctx.lineJoin = 'round';
        ctx.beginPath();
        points.forEach(function(point, i) {
            var x = 2 + (point.time - start) / (15 * 60000) * (width - 4);
            var y = max === min ? height / 2 : height - 3 - (point.value - min) / (max - min) * (height - 6);
            if (i === 0 || point.gap) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            if ((i === 0 || point.gap) && (i === points.length - 1 || points[i + 1].gap)) ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
        });
        ctx.stroke();
        updateMiniFreshness();
    }

    var BASE_WIDTH_MINI = 140;
    var BASE_WIDTH_FULL = 280;
    var roomTotalHighTime = null;
    var tierHighTimes = {};
    var withTokensHighTime = null;
    var totalHighTime = null;
    var anonHighTime = null;
    var femaleTransHighTime = null;
    var pendingHistoryGap = false;
    var history = {
        timestamps: [], breaks: [],
        'red': [], 'green': [], 'purple': [], 'pink': [], 'dark-blue': [], 'light-blue': [], 'gray': [], 'female-trans': [],
        'withTokens': [], 'total': [], 'anonymous': []
    };
    var MAX_HISTORY_LENGTH = 10000;

    var TIERS = {
        'red': { name: 'Red', desc: '', color: '#DC0000' },
        'green': { name: 'Green', desc: '', color: '#69BE45' },
        'purple': { name: 'Dark Purple', desc: '', color: '#804BAA' },
        'pink': { name: 'Light Purple', desc: '', color: '#BE6AFF' },
        'dark-blue': { name: 'Dark Blue', desc: '', color: '#393993' },
        'light-blue': { name: 'Light Blue', desc: '', color: '#1E5FC8' },
        'gray': { name: 'Grey', desc: '', color: '#6B6A6F' },
        'female-trans': { name: '♀⚧', desc: '', color: '#FF1493' }
    };

    // Presentation preferences are shared across rooms and separate from sessions.
    const COLLAPSED_ROWS_KEY = 'tierscope:ui:collapsedRows:v1';
    const PANEL_ROWS = Object.keys(TIERS).map(function(key) {
        return { key: key, label: key === 'red' ? 'Moderators' : key === 'green' ? 'Fan Club' :
            key === 'female-trans' ? 'Female/Trans' : TIERS[key].name,
            color: TIERS[key].color, height: 28, display: 'flex' };
    }).concat([
        { key: 'withtokens', label: 'With Tokens', icon: '💎', color: '#ff69b4', height: 28, display: 'flex' },
        { key: 'total', label: 'Registered', icon: '📊', color: '#ffffff', height: 28, display: 'flex' },
        { key: 'anon', label: 'Anonymous', icon: '👻', color: '#888888', height: 50, display: 'block' }
    ]);
    var collapsedRows = loadCollapsedRows();
    var panelChartHeights = {};
    var rowLayoutNeedsMeasure = true;
    var panelChartRegionHeight = null;

    function loadCollapsedRows() {
        try {
            var raw = GM_getValue(COLLAPSED_ROWS_KEY, null);
            if (raw !== null && typeof raw !== 'undefined') {
                var saved = JSON.parse(raw);
                if (!Array.isArray(saved) || !saved.every(function(key) {
                    return PANEL_ROWS.some(function(row) { return row.key === key; });
                })) throw new Error('Invalid collapsed-row preferences');
                return new Set(saved);
            }
        } catch (error) {
            log('Could not restore row preferences: ' + error.message);
        }
        return new Set(['red', 'green']);
    }

    function panelRowMarker(row) {
        return row.icon || getTierMarker(row.key);
    }

    function collapseMarkerHtml(key) {
        var row = PANEL_ROWS.find(function(item) { return item.key === key; });
        return '<button type="button" class="tier-collapse-marker" id="collapse-row-' + key +
            '" aria-controls="tier-row-' + key + '" aria-expanded="true" aria-label="Collapse ' + row.label +
            ' row" title="Collapse ' + row.label + ' row" style="display:inline-flex;align-items:center;' +
            'justify-content:center;width:26px;height:24px;padding:0;border:0;border-radius:3px;' +
            'background:transparent;color:inherit;font-size:14px;line-height:1;cursor:pointer;">' +
            panelRowMarker(row) + '</button>';
    }

    function collapsedTrayHtml() {
        return '<div id="collapsed-tier-tray" role="group" aria-label="Collapsed rows. Click an icon to restore its row." ' +
            'style="display:none;flex-wrap:wrap;align-items:center;gap:3px;margin-bottom:4px;">' +
            PANEL_ROWS.map(function(row) {
                return '<button type="button" id="restore-row-' + row.key +
                    '" aria-controls="tier-row-' + row.key + '" aria-expanded="false" ' +
                    'aria-label="Restore ' + row.label + ' row" title="Restore ' + row.label + ' row" ' +
                    'style="display:none;align-items:center;justify-content:center;flex:0 0 22px;width:22px;height:22px;' +
                    'box-sizing:border-box;padding:0;border:1px solid ' + (row.key === 'total' ? 'var(--panel-text)' : row.color) + ';border-radius:3px;' +
                    'background:rgba(var(--panel-row-rgb),0.05);color:var(--panel-text);font-size:12px;line-height:1;cursor:pointer;">' +
                    panelRowMarker(row) + '</button>';
            }).join('') + '</div>';
    }

    var chartLayoutRevision = 0;
    function applyRowLayout() {
        chartLayoutRevision++;
        var region = document.getElementById('tier-chart-region');
        var tray = document.getElementById('collapsed-tier-tray');
        var group = document.getElementById('summary-tier-rows');
        var measurable = region && region.offsetHeight > 0;
        var visibleCount = PANEL_ROWS.length - collapsedRows.size;
        // Temporarily restore natural layout to measure actual minimum row
        // heights. A text column can be taller than the nominal canvas, depending
        // on inherited line spacing, fonts and the displayed numbers.
        if (region) region.style.height = 'auto';
        PANEL_ROWS.forEach(function(row) {
            panelChartHeights[row.key] = row.height;
            var canvas = document.getElementById('spark-' + row.key);
            if (canvas) canvas.style.height = row.height + 'px';
            var element = document.getElementById('tier-row-' + row.key);
            if (measurable && element) element.style.display = row.display;
        });
        if (measurable && tray) tray.style.display = 'none';
        if (measurable && group) group.style.display = 'block';
        if (measurable) {
            PANEL_ROWS.forEach(function(row) {
                var canvas = document.getElementById('spark-' + row.key);
                if (!canvas) return;
                var parent = canvas.parentElement;
                var style = window.getComputedStyle(parent);
                // clientHeight is unaffected by the panel's CSS scale. Subtract
                // padding to get the flex content height shared with the text.
                var minimum = parent.clientHeight - (parseFloat(style.paddingTop) || 0) -
                    (parseFloat(style.paddingBottom) || 0);
                panelChartHeights[row.key] = Math.max(row.height, minimum);
                canvas.style.height = panelChartHeights[row.key] + 'px';
            });
            if (panelChartRegionHeight === null) panelChartRegionHeight = region.offsetHeight;
        }
        if (tray) tray.style.display = collapsedRows.size ? 'flex' : 'none';
        PANEL_ROWS.forEach(function(row) {
            var collapsed = collapsedRows.has(row.key);
            var element = document.getElementById('tier-row-' + row.key);
            if (element) element.style.display = collapsed ? 'none' : row.display;
            var restore = document.getElementById('restore-row-' + row.key);
            if (restore) restore.style.display = collapsed ? 'inline-flex' : 'none';
            var collapse = document.getElementById('collapse-row-' + row.key);
            if (collapse) collapse.setAttribute('aria-expanded', String(!collapsed));
        });
        if (group) group.style.display = collapsedRows.has('withtokens') && collapsedRows.has('total') ? 'none' : 'block';
        var extra = measurable && visibleCount ? Math.max(0, panelChartRegionHeight - region.offsetHeight) / visibleCount : 0;
        PANEL_ROWS.forEach(function(row) {
            if (collapsedRows.has(row.key)) return;
            panelChartHeights[row.key] += extra;
            var canvas = document.getElementById('spark-' + row.key);
            if (canvas) canvas.style.height = panelChartHeights[row.key] + 'px';
        });
        // Pin the region instead of allowing fractional canvas rounding to move
        // the rest of the panel. With no open rows, let it shrink to the strip.
        if (region && visibleCount && panelChartRegionHeight !== null) {
            region.style.height = panelChartRegionHeight + 'px';
        }
        // Creation/compact mode may hide the region. Measure once it is visible,
        // rather than changing row layout on every scan or Replay animation frame.
        rowLayoutNeedsMeasure = !measurable;
    }

    function setRowCollapsed(key, collapsed) {
        cancelHighPulse(key);
        if (!PANEL_ROWS.some(function(row) { return row.key === key; })) return;
        if (collapsed) collapsedRows.add(key);
        else collapsedRows.delete(key);
        try { GM_setValue(COLLAPSED_ROWS_KEY, JSON.stringify(Array.from(collapsedRows))); }
        catch (error) { log('Could not save row preferences: ' + error.message); }
        applyRowLayout();
        if (presentationMode === 'PLAYBACK') {
            // Repaint this exact frame; customizing the panel never advances Replay.
            paintPlayback(playback);
        } else {
            updateDisplay();
            drawAllSparklines();
        }
        constrainPanelPosition();
        var target = document.getElementById((collapsed ? 'restore-row-' : 'collapse-row-') + key);
        if (target) target.focus({ preventScroll: true });
    }

    function bindRowControls() {
        panelChartRegionHeight = null; // A newly created panel gets its own baseline.
        PANEL_ROWS.forEach(function(row) {
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

    function redrawPanelCharts() {
        if (isMinimized) return;
        chartLayoutRevision++;
        if (presentationMode === 'PLAYBACK') paintPlayback(playback);
        else drawAllSparklines();
    }

    function updateCollapsedRowStatus(frame, highlights) {
        PANEL_ROWS.forEach(function(row) {
            var button = document.getElementById('restore-row-' + row.key);
            if (!button) return;
            var value = row.key === 'withtokens' ? frame.withTokens : row.key === 'total' ? frame.total :
                row.key === 'anon' ? frame.anonymousCount : frame.counts[row.key];
            var historyKey = row.key === 'withtokens' ? 'withTokens' : row.key === 'anon' ? 'anonymous' : row.key;
            var high = getDisplayHigh(frame, historyKey, value).value;
            var context = frame.isPlayback ? 'Replay' : frame.isRestored ? 'Saved sample' : 'Latest sample';
            button.title = row.label + ': ' + value.toLocaleString() + ' (High: ' + high.toLocaleString() +
                '). ' + context + '. Click to restore row.';
            button.setAttribute('aria-label', 'Restore ' + row.label + ' row. ' + context + ': ' + value.toLocaleString());
            button.style.background = highlights && highlights[historyKey] ?
                'rgba(50, 205, 50, 0.22)' : 'rgba(var(--panel-row-rgb),calc(0.05 * var(--tier-background-scale, 1)))';
        });
    }

    const TREND_ICONS = {
        up: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--panel-positive)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>',
        down: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--panel-negative)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>',
        stable: '<svg width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="var(--panel-warning)"/></svg>'
    };

    const TREND_PRESETS = {
        'last': { label: 'Last', ms: 0 },
        '5min': { label: '5m', ms: 5 * 60 * 1000 },
        '15min': { label: '15m', ms: 15 * 60 * 1000 },
        '30min': { label: '30m', ms: 30 * 60 * 1000 },
        '1hour': { label: '1h', ms: 60 * 60 * 1000 },
        'start': { label: 'Start', ms: -1 }
    };

    var presentationMode = 'LIVE';
    var playback = null;

    function createPlaybackSnapshot(sourceHistory) {
        var copiedHistory = { timestamps: sourceHistory.timestamps.slice(), breaks: getHistoryBreaks(sourceHistory).slice() };
        var timeline = [];
        var highs = { roomTotal: [] };
        var firstTimestamp = copiedHistory.timestamps.length ? copiedHistory.timestamps[0] : 0;
        STORAGE_HISTORY_SERIES.forEach(function(key) {
            copiedHistory[key] = sourceHistory[key].slice();
            highs[key] = [];
        });
        copiedHistory.timestamps.forEach(function(timestamp, index) {
            timeline.push(Math.max(index ? timeline[index - 1] : 0, timestamp - firstTimestamp));
            STORAGE_HISTORY_SERIES.forEach(function(key) {
                highs[key].push(Math.max(index ? highs[key][index - 1] : 0, copiedHistory[key][index]));
            });
            var total = copiedHistory.total[index] + copiedHistory.anonymous[index];
            highs.roomTotal.push(Math.max(index ? highs.roomTotal[index - 1] : 0, total));
        });
        var durationMs = timeline.length ? timeline[timeline.length - 1] : 0;
        return { history: copiedHistory, timeline: timeline, highs: highs,
            durationMs: durationMs, replayDurationMs: Math.min(30000, durationMs / 60) };
    }

    function getPlaybackSampleIndex(snapshot, positionMs, exactIndex) {
        if (!snapshot || !snapshot.timeline.length) return -1;
        var position = Number(positionMs);
        position = Number.isFinite(position) ? Math.max(0, Math.min(snapshot.durationMs, position)) : 0;
        var low = 0;
        var high = snapshot.timeline.length;
        while (low < high) {
            var middle = Math.floor((low + high) / 2);
            if (snapshot.timeline[middle] <= position) low = middle + 1;
            else high = middle;
        }
        return Number.isInteger(exactIndex) ? Math.max(0, Math.min(snapshot.timeline.length - 1, exactIndex)) : Math.max(0, low - 1);
    }

    function getPlaybackFrame(snapshot, positionMs, exactIndex) {
        var index = getPlaybackSampleIndex(snapshot, positionMs, exactIndex);
        if (index < 0) return null;
        var frameHistory = snapshot.history;
        var frameHighs = {};
        var counts = {};
        var playbackNewHighTiers = {};
        STORAGE_HISTORY_SERIES.forEach(function(key) {
            frameHighs[key] = snapshot.highs[key][index];
            var count = snapshot.history[key][index];
            if (hasStorageField(TIERS, key)) counts[key] = count;
            if (count > 0 && count >= snapshot.highs[key][index]) {
                playbackNewHighTiers[key] = true;
            }
        });
        frameHighs.roomTotal = snapshot.highs.roomTotal[index];
        var total = snapshot.history.total[index];
        var anonymousCount = snapshot.history.anonymous[index];
        return { counts: counts, total: total, withTokens: snapshot.history.withTokens[index],
            anonymousCount: anonymousCount, fullRoomTotal: total + anonymousCount,
            roomTotalHigh: frameHighs.roomTotal, history: frameHistory, historyEndIndex: index, highs: frameHighs,
            index: index, timestamp: snapshot.history.timestamps[index],
            playbackNewHighTiers: playbackNewHighTiers };
    }

    function isPlaybackCurrent(state) {
        return !!state && state === playback && presentationMode === 'PLAYBACK' &&
            state.url === location.href && lastUrl === location.href && state.generation === initGuard &&
            state.key === activeSessionStorageKey && state.key === getStorageKey(getModelName());
    }

    function stopPlaybackClock(state) {
        if (state && state.timer !== null) {
            clearInterval(state.timer);
            state.timer = null;
        }
    }

    function startPlaybackClock(state) {
        if (!state.playing || state.timer !== null) return;
        state.timer = setInterval(function() {
            if (playback === state) tickPlayback(state);
        }, 50);
    }

    function paintPlayback(state) {
        if (!isPlaybackCurrent(state)) return false;
        try {
            var index = getPlaybackSampleIndex(state.snapshot, state.positionMs, state.stepIndex);
            if (state.paintedIndex !== index || state.paintLayout !== chartLayoutRevision) {
                renderPlaybackFrame(getPlaybackFrame(state.snapshot, state.positionMs, state.stepIndex));
                state.paintedIndex = index;
                state.paintLayout = chartLayoutRevision;
            }
            updatePlaybackControls();
            return true;
        } catch (error) {
            state.playing = false;
            stopPlaybackClock(state);
            log('Playback paused after a presentation error: ' + error.message);
            try { updatePlaybackControls(); } catch (controlError) { }
            return false;
        }
    }

    function enterPlayback() {
        if (playback) {
            if (isPlaybackCurrent(playback)) return true;
            leavePlayback(false);
        }
        var model = getModelName();
        if (!model || model === 'unknown' || lastUrl !== location.href ||
            activeSessionStorageKey !== getStorageKey(model) || !history.timestamps.length) return false;
        try {
            var snapshot = createPlaybackSnapshot(history);
            playback = { url: location.href, key: activeSessionStorageKey, generation: initGuard,
                snapshot: snapshot, positionMs: 0, speed: 1, lastTickAt: Date.now(),
                playing: snapshot.durationMs > 0, timer: null };
            cancelHighPulses();
            presentationMode = 'PLAYBACK';
            setPlaybackLayout(true);
            if (!paintPlayback(playback)) return false;
            startPlaybackClock(playback);
            return true;
        } catch (error) {
            if (playback) {
                playback.playing = false;
                stopPlaybackClock(playback);
            }
            log('Could not start playback: ' + error.message);
            return false;
        }
    }

    function leavePlayback(renderLive) {
        hideChartTooltip();
        cancelHighPulses();
        cancelGifExport();
        if (typeof renderLive === 'undefined') renderLive = true;
        if (!playback && presentationMode === 'LIVE') return false;
        var canRenderLive = renderLive && isPlaybackCurrent(playback);
        stopPlaybackClock(playback);
        playback = null;
        presentationMode = 'LIVE';
        try {
            setPlaybackLayout(false);
            if (canRenderLive) repaintLivePresentation();
            else clearPlaybackPresentation();
        } catch (error) {
            log('Could not repaint after playback: ' + error.message);
        }
        return true;
    }

    function tickPlayback(expectedState) {
        if (expectedState && expectedState !== playback) return false;
        var state = playback;
        if (!isPlaybackCurrent(state)) {
            if (state) leavePlayback(false);
            return false;
        }
        if (!state.playing) return false;
        state.stepIndex = null;
        var now = Date.now();
        var elapsed = Math.max(0, now - state.lastTickAt);
        state.lastTickAt = now;
        var rate = state.snapshot.replayDurationMs > 0 ?
            state.snapshot.durationMs / state.snapshot.replayDurationMs : 0;
        state.positionMs = Math.min(state.snapshot.durationMs, state.positionMs + elapsed * rate * state.speed);
        if (state.positionMs >= state.snapshot.durationMs) {
            state.playing = false;
            stopPlaybackClock(state);
        }
        return paintPlayback(state);
    }

    function togglePlayback() {
        var state = playback;
        if (!isPlaybackCurrent(state)) {
            if (state) leavePlayback(false);
            return false;
        }
        if (!state.snapshot.durationMs) return false;
        if (state.playing) {
            tickPlayback(state);
            state.playing = false;
            stopPlaybackClock(state);
        } else {
            if (state.positionMs >= state.snapshot.durationMs) state.positionMs = 0;
            state.playing = true;
            state.stepIndex = null;
            state.lastTickAt = Date.now();
        }
        if (!paintPlayback(state)) return false;
        startPlaybackClock(state);
        return true;
    }

    function scrubPlayback(positionMs) {
        var state = playback;
        if (!isPlaybackCurrent(state)) {
            if (state) leavePlayback(false);
            return false;
        }
        var position = Number(positionMs);
        if (!Number.isFinite(position)) return false;
        state.playing = false;
        stopPlaybackClock(state);
        state.stepIndex = null;
        state.positionMs = Math.max(0, Math.min(state.snapshot.durationMs, position));
        state.lastTickAt = Date.now();
        return paintPlayback(state);
    }

    function stepPlayback(direction) {
        var state = playback;
        if (!isPlaybackCurrent(state)) return false;
        var index = getPlaybackSampleIndex(state.snapshot, state.positionMs, state.stepIndex);
        if (index < 0) return false;
        state.playing = false;
        stopPlaybackClock(state);
        state.stepIndex = Math.max(0, Math.min(state.snapshot.timeline.length - 1, index + direction));
        state.positionMs = state.snapshot.timeline[state.stepIndex];
        state.lastTickAt = Date.now();
        return paintPlayback(state);
    }

    function setPlaybackSpeed(value) {
        var state = playback;
        if (!isPlaybackCurrent(state)) {
            if (state) leavePlayback(false);
            return false;
        }
        var speed = Number(value);
        if ([0.5, 1, 2].indexOf(speed) === -1) return false;
        if (state.playing) tickPlayback(state);
        state.speed = speed;
        state.lastTickAt = Date.now();
        return paintPlayback(state);
    }

    var playbackLayoutState = null;

    function updateReplayAvailability() {
        var button = document.getElementById('btn-replay');
        if (!button) return;
        button.disabled = !history.timestamps.length || activeSessionStorageKey !== getStorageKey(getModelName()) || location.href !== lastUrl;
        button.title = button.disabled ? 'No recorded history for this room yet' : 'Replay recorded history; live acquisition continues';
    }

    function bindPlaybackControls() {
        var bindings = { 'btn-replay': enterPlayback, 'playback-play': togglePlayback,
            'playback-previous': function() { stepPlayback(-1); },
            'playback-next': function() { stepPlayback(1); },
            'playback-return': function() { leavePlayback(true); } };
        Object.keys(bindings).forEach(function(id) {
            var button = document.getElementById(id);
            if (button) button.onclick = bindings[id];
        });
        var slider = document.getElementById('playback-scrubber');
        if (slider) slider.oninput = function() { scrubPlayback(Number(this.value)); };
        var speed = document.getElementById('playback-speed');
        if (speed) speed.onchange = function() { setPlaybackSpeed(Number(this.value)); };
    }

    function setPlaybackLayout(active) {
        if (active) {
            playbackLayoutState = [];
            var toggle = document.getElementById('btn-toggle');
            if (toggle) toggle.disabled = true;
            [['live-trend', 'visibility', 'hidden'], ['control-field', 'visibility', 'hidden'],
                ['acquisition-status', 'visibility', 'hidden'],
                ['btn-toggle', 'visibility', 'hidden'], ['playback-controls', 'display', 'grid']].forEach(function(change) {
                var element = document.getElementById(change[0]);
                if (!element) return;
                playbackLayoutState.push({ element: element, property: change[1], value: element.style[change[1]] || '' });
                element.style[change[1]] = change[2];
            });
        } else if (playbackLayoutState) {
            playbackLayoutState.forEach(function(saved) { saved.element.style[saved.property] = saved.value; });
            playbackLayoutState = null;
            var toggle = document.getElementById('btn-toggle');
            if (toggle) toggle.disabled = false;
        }
    }

    function updatePlaybackControls() {
        if (!playback) return;
        var index = getPlaybackSampleIndex(playback.snapshot, playback.positionMs, playback.stepIndex);
        var previous = document.getElementById('playback-previous');
        var next = document.getElementById('playback-next');
        if (previous) previous.disabled = index <= 0;
        if (next) next.disabled = index < 0 || index === playback.snapshot.timeline.length - 1;
        var button = document.getElementById('playback-play');
        if (button) {
            button.textContent = playback.playing ? 'Pause' : 'Play';
            button.disabled = playback.snapshot.durationMs === 0;
            button.title = playback.playing ? 'Pause playback only' : 'Play recorded history';
        }
        var slider = document.getElementById('playback-scrubber');
        if (slider) {
            slider.max = String(playback.snapshot.durationMs);
            slider.value = String(playback.positionMs);
            slider.disabled = playback.snapshot.durationMs === 0;
        }
        var speed = document.getElementById('playback-speed');
        if (speed) speed.value = String(playback.speed);
        var position = document.getElementById('playback-position');
        if (position) {
            position.textContent = formatElapsedTime(playback.positionMs) + ' / ' + formatElapsedTime(playback.snapshot.durationMs);
            position.title = 'Sample ' + (index + 1) + ' of ' + playback.snapshot.timeline.length + '. Recorded range captured on Replay entry. Highs are through the selected sample. Live acquisition continues independently.';
        }
    }

    function renderPlaybackFrame(frame) {
        renderDisplayFrame(Object.assign({}, frame, { isPlayback: true }));
        drawHistorySparklines(frame.history, frame.historyEndIndex);
    }

    function clearPlaybackPresentation() {
        var emptyHistory = { timestamps: [] };
        var counts = {};
        STORAGE_HISTORY_SERIES.forEach(function(key) { emptyHistory[key] = []; counts[key] = 0; });
        renderDisplayFrame({ counts: counts, total: 0, withTokens: 0, anonymousCount: 0,
            fullRoomTotal: 0, roomTotalHigh: 0, history: emptyHistory, isPlayback: false });
        drawHistorySparklines(emptyHistory);
    }

    function repaintLivePresentation() {
        updateDisplay();
        updateTrendDisplay();
        drawAllSparklines();
        updateAcquisitionStatus();
        updateCountdownDisplay();
    }

    function getTierMarker(tier) {
        var config = TIERS[tier];
        if (tier === 'female-trans') return config.name;
        return '<span role="img" aria-label="' + config.name + '" title="' + config.name + '" ' +
            'style="display:inline-block;width:10px;height:10px;border-radius:50%;vertical-align:middle;background:' + config.color + ';"></span>';
    }

    function log(msg) {
        console.log('[TierScope ' + TIERSCOPE_VERSION + '] ' + msg);
    }

    function getModelNameFromUrl(url) {
        if (!url) return 'unknown';
        var path = new URL(url).pathname;
        var bMatch = path.match(/\/b\/([^\/\?#]+)/);
        if (bMatch) return bMatch[1];
        var camMatch = path.match(/^\/([^\/]+)\/cam\/?$/);
        if (camMatch) return camMatch[1];
        var normalMatch = path.match(/\/([^\/\?#]+)\/?$/);
        if (normalMatch) {
            var name = normalMatch[1];
            var nonRoomPaths = ['followed', 'featured', 'tags', 'accounts', 'login', 'register',
                               'supporter', 'settings', 'apps', 'explore', 'trending', 'new',
                               'female', 'male', 'couple', 'trans', 'hd', 'north-american',
                               'european', 'asian', 'south-american', 'exhibitionist',
                               'followed-cams', 'female-cams', 'trans-cams', 'male-cams', 'couple-cams'];
            if (nonRoomPaths.indexOf(name) === -1) return name;
        }
        return 'unknown';
    }

    function getStorageKey(model) {
        return STORAGE_KEY_PREFIX + model.toLowerCase();
    }

    function isStorageObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    function hasStorageField(data, field) {
        return Object.prototype.hasOwnProperty.call(data, field);
    }

    function isStorageNumber(value) {
        return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
    }

    function isStorageTimestamp(value) {
        return Number.isSafeInteger(value) && value >= 0 && value <= 8640000000000000;
    }

    function makeStorageId() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
        return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + '-' + Math.random().toString(36).slice(2);
    }

    function roomEpochKey(key) { return ROOM_EPOCH_PREFIX + key.slice(STORAGE_KEY_PREFIX.length); }
    function roomTabPrefix(key) { return TAB_RECORD_PREFIX + key.slice(STORAGE_KEY_PREFIX.length) + ':'; }
    function getRoomEpoch(key) { return GM_getValue(roomEpochKey(key), 'legacy'); }

    function readSavedSession(key) {
        var epoch = getRoomEpoch(key);
        var keys = GM_listValues().filter(function(candidate) { return candidate.indexOf(roomTabPrefix(key)) === 0; });
        if (epoch === 'legacy') keys.unshift(key);
        var selected;
        var warnings = [];
        keys.forEach(function(candidate) {
            try {
                var raw = GM_getValue(candidate, undefined);
                if (typeof raw === 'undefined') return;
                if (typeof raw !== 'string') throw new Error('Saved session must be JSON text');
                var parsed = JSON.parse(raw);
                var data = migrateStoredSession(parsed, determineStorageSchema(parsed));
                validateStoredSession(data);
                if (candidate !== key && typeof data.roomEpoch !== 'string') throw new Error('Missing tab record epoch');
                // Ignore obsolete names on restore without rewriting another tab's record.
                // New saves contain only aggregate session data. Existing source records
                // keep their normal expiration/Reset lifecycle.
                if (hasStorageField(parsed, 'sessionUniqueUsers') || hasStorageField(parsed, 'sessionFemaleTransUsers')) {
                    delete parsed.sessionUniqueUsers; delete parsed.sessionFemaleTransUsers;
                    raw = JSON.stringify(parsed);
                }
                // Validate before any deletion. Unsupported or corrupt records remain
                // untouched, and cannot prevent a compatible sibling from restoring.
                // Expiration also applies to old epochs, including late post-Reset writes.
                if (Date.now() - data.timestamp > STORAGE_MAX_AGE_MS) {
                    if (candidate !== key) GM_deleteValue(candidate);
                    return;
                }
                if (candidate !== key && data.roomEpoch !== epoch) return;
                var times = data.history.timestamps;
                var sampleTime = times.length ? Math.max.apply(null, times) : -1;
                var rank = [sampleTime, times.length, data.timestamp, candidate === key ? 0 : 1, candidate];
                if (!selected || rank.some(function(value, i) {
                    return value > selected.rank[i] && rank.slice(0, i).every(function(v, j) { return v === selected.rank[j]; });
                })) selected = { raw: raw, rank: rank };
            } catch (error) {
                warnings.push(candidate + ': ' + error.message);
            }
        });
        var previous = sessionRecordWarnings.get(key) || [];
        warnings.forEach(function(warning) {
            if (previous.indexOf(warning) === -1) log('Saved record skipped and retained: ' + warning);
        });
        sessionRecordWarnings.set(key, warnings);
        return selected ? selected.raw : undefined;
    }

    function determineStorageSchema(data) {
        if (!isStorageObject(data)) throw new Error('Saved session must be an object');
        if (!hasStorageField(data, 'schemaVersion')) return { version: 1, legacy: true };
        if (!Number.isSafeInteger(data.schemaVersion) || data.schemaVersion < 0) {
            throw new Error('Invalid storage schemaVersion');
        }
        return { version: data.schemaVersion, legacy: false };
    }

    function migrateStoredSession(data, schema) {
        if (schema.version > STORAGE_SCHEMA_VERSION) {
            throw new Error('Newer storage schema ' + schema.version + '; this build supports ' + STORAGE_SCHEMA_VERSION);
        }
        if (schema.version === 1) return Object.assign({}, data, { schemaVersion: STORAGE_SCHEMA_VERSION });
        if (schema.version !== STORAGE_SCHEMA_VERSION) {
            throw new Error('Unsupported storage schema ' + schema.version + '; no migration path to ' + STORAGE_SCHEMA_VERSION);
        }
        return data;
    }

    function validateStoredSession(data) {
        function requireField(condition, field) {
            if (!condition) throw new Error('Invalid saved-session field: ' + field);
        }
        requireField(isStorageObject(data), 'record');
        if (hasStorageField(data, 'schemaVersion')) {
            requireField(data.schemaVersion === STORAGE_SCHEMA_VERSION, 'schemaVersion');
        }
        if (hasStorageField(data, 'producerVersion')) {
            requireField(typeof data.producerVersion === 'string', 'producerVersion');
        }
        requireField(isStorageTimestamp(data.timestamp), 'timestamp');
        requireField(isStorageObject(data.history), 'history');
        requireField(Array.isArray(data.history.timestamps), 'history.timestamps');
        requireField(data.history.timestamps.length <= MAX_HISTORY_LENGTH, 'history length');
        requireField(data.history.timestamps.every(isStorageTimestamp), 'history.timestamps');
        STORAGE_HISTORY_SERIES.forEach(function(field) {
            var series = data.history[field];
            requireField(Array.isArray(series) && series.length === data.history.timestamps.length &&
                series.every(isStorageNumber), 'history.' + field);
        });
        if (hasStorageField(data.history, 'breaks')) {
            requireField(Array.isArray(data.history.breaks) && data.history.breaks.length === data.history.timestamps.length &&
                data.history.breaks.every(function(value) { return typeof value === 'boolean'; }), 'history.breaks');
        }
        if (hasStorageField(data, 'previousCounts')) {
            requireField(isStorageObject(data.previousCounts), 'previousCounts');
            STORAGE_HISTORY_SERIES.forEach(function(field) {
                requireField(isStorageNumber(data.previousCounts[field]), 'previousCounts.' + field);
            });
        }
        if (hasStorageField(data, 'tierHighTimes')) {
            requireField(isStorageObject(data.tierHighTimes), 'tierHighTimes');
            Object.keys(data.tierHighTimes).forEach(function(tier) {
                requireField(hasStorageField(TIERS, tier) &&
                    (data.tierHighTimes[tier] === null || isStorageTimestamp(data.tierHighTimes[tier])), 'tierHighTimes.' + tier);
            });
        }
        STORAGE_NULLABLE_TIMES.forEach(function(field) {
            if (hasStorageField(data, field)) {
                requireField(data[field] === null || isStorageTimestamp(data[field]), field);
            }
        });
        if (hasStorageField(data, 'roomEpoch')) requireField(typeof data.roomEpoch === 'string', 'roomEpoch');
        if (hasStorageField(data, 'sessionStartEstimated')) requireField(typeof data.sessionStartEstimated === 'boolean', 'sessionStartEstimated');
        if (hasStorageField(data, 'sessionHighs')) {
            requireField(isStorageObject(data.sessionHighs), 'sessionHighs');
            STORAGE_HISTORY_SERIES.forEach(function(key) {
                var high = data.sessionHighs[key];
                requireField(isStorageObject(high) && isStorageNumber(high.value) &&
                    (high.time === null || isStorageTimestamp(high.time)), 'sessionHighs.' + key);
                requireField(high.value >= Math.max.apply(null, [0].concat(data.history[key])), 'sessionHighs.' + key + ' below retained history');
                requireField(high.value === 0 || high.time !== null, 'sessionHighs.' + key + '.time');
            });
        }
        if (hasStorageField(data, 'roomTotalHigh')) requireField(isStorageNumber(data.roomTotalHigh), 'roomTotalHigh');
        if (hasStorageField(data, 'pausedElapsedTime')) {
            requireField(isStorageTimestamp(data.pausedElapsedTime) &&
                data.pausedElapsedTime <= Math.min(data.timestamp, Date.now()), 'pausedElapsedTime');
        }
        if (hasStorageField(data, 'trendComparisonMode')) {
            requireField(typeof data.trendComparisonMode === 'string' &&
                hasStorageField(TREND_PRESETS, data.trendComparisonMode), 'trendComparisonMode');
        }
        ['isPaused', 'hasTrendBaseline', 'autoTrendEscalation'].forEach(function(field) {
            if (hasStorageField(data, field)) requireField(typeof data[field] === 'boolean', field);
        });
    }

    function normalizeStoredSession(data) {
        var normalized = {
            timestamp: data.timestamp,
            history: Object.fromEntries(['timestamps'].concat(STORAGE_HISTORY_SERIES).map(function(field) {
                return [field, data.history[field].slice()];
            })),
            previousCounts: Object.fromEntries(STORAGE_HISTORY_SERIES.map(function(field) {
                return [field, hasStorageField(data, 'previousCounts') ? data.previousCounts[field] : 0];
            })),
            hasTrendBaseline: hasStorageField(data, 'previousCounts') && data.hasTrendBaseline === true,
            isPaused: data.isPaused === true,
            trendComparisonMode: hasStorageField(data, 'trendComparisonMode') ? data.trendComparisonMode : 'last',
            autoTrendEscalation: !hasStorageField(data, 'autoTrendEscalation') || data.autoTrendEscalation,
            roomTotalHigh: hasStorageField(data, 'roomTotalHigh') ? data.roomTotalHigh : 0,
            pausedElapsedTime: hasStorageField(data, 'pausedElapsedTime') ? data.pausedElapsedTime : 0
        };
        ['tierHighTimes'].forEach(function(field) {
            normalized[field] = hasStorageField(data, field) ? Object.fromEntries(Object.entries(data[field])) : {};
        });
        STORAGE_NULLABLE_TIMES.forEach(function(field) {
            normalized[field] = hasStorageField(data, field) ? data[field] : null;
        });
        normalized.history.breaks = getHistoryBreaks(data.history).slice();
        normalized.sessionHighs = {};
        STORAGE_HISTORY_SERIES.forEach(function(key) {
            if (data.sessionHighs && data.sessionHighs[key]) {
                normalized.sessionHighs[key] = Object.assign({}, data.sessionHighs[key]);
            } else {
                // Legacy highs cannot be recovered beyond retained history. Rebuild
                // both the value and its timestamp from the same actual sample.
                var values = normalized.history[key];
                var value = Math.max.apply(null, [0].concat(values));
                normalized.sessionHighs[key] = { value: value,
                    time: value > 0 ? normalized.history.timestamps[values.indexOf(value)] : null };
            }
        });
        normalized.sessionStartEstimated = data.sessionStartEstimated === true;
        if (!hasStorageField(data, 'sessionStartedAt')) {
            var knownTimes = [data.trackingStartTime, data.roomTotalHighTime].concat(normalized.history.timestamps)
                .filter(function(time) { return typeof time === 'number' && time > 0; });
            normalized.sessionStartedAt = knownTimes.length ? Math.min.apply(null, knownTimes) : null;
            normalized.sessionStartEstimated = knownTimes.length > 0;
        }
        return normalized;
    }

    function protectSessionStorage(key, reason, producerVersion) {
        var prior = sessionStorageStatus.get(key);
        if (prior && prior.protected) return prior;
        var status = { protected: true, reason: reason, producerVersion: producerVersion == null ? null : producerVersion };
        sessionStorageStatus.set(key, status);
        log('Storage protected for ' + key + ': ' + reason +
            '. Saved data retained; automatic writes disabled until explicit Reset. Using a clean in-memory session on load.');
        return status;
    }

    function inspectStoredSession(model, restore) {
        var key = getStorageKey(model);
        var prior = sessionStorageStatus.get(key);
        if (prior && prior.protected) return prior;
        var producerVersion = null;
        try {
            var raw = readSavedSession(key);
            if (!restore && prior && prior.raw === raw) return prior;
            if (typeof raw === 'undefined') {
                var empty = { protected: false, raw: raw, producerVersion: null };
                sessionStorageStatus.set(key, empty);
                return empty;
            }
            if (typeof raw !== 'string') throw new Error('Saved session must be JSON text');
            var parsed = JSON.parse(raw);
            if (isStorageObject(parsed) && typeof parsed.producerVersion === 'string') producerVersion = parsed.producerVersion;
            var schema = determineStorageSchema(parsed);
            var migrated = migrateStoredSession(parsed, schema);
            validateStoredSession(migrated);
            var status = { protected: false, raw: raw, producerVersion: producerVersion, legacy: schema.legacy };
            sessionStorageStatus.set(key, status);
            return restore ? Object.assign({}, status, { data: normalizeStoredSession(migrated) }) : status;
        } catch (e) {
            return protectSessionStorage(key, e.message, producerVersion);
        }
    }

    function restoreSessionState(data) {
        users = new Map();
        roomTotal = 0;
        previousUserCount = 0;
        previousRoomTotal = 0;
        lastAcceptedAcquisition = null;
        newHighTiers = {};
        history = data.history;
        pendingHistoryGap = true;
        tierHighTimes = data.tierHighTimes;
        withTokensHighTime = data.withTokensHighTime;
        totalHighTime = data.totalHighTime;
        anonHighTime = data.anonHighTime;
        femaleTransHighTime = data.femaleTransHighTime;
        roomTotalHigh = data.roomTotalHigh;
        roomTotalHighTime = data.roomTotalHighTime;
        trackingStartTime = data.trackingStartTime;
        sessionStartedAt = data.sessionStartedAt;
        sessionStartEstimated = data.sessionStartEstimated;
        sessionHighs = data.sessionHighs;
        syncHighTimes();
        isPaused = data.isPaused;
        pausedElapsedTime = data.pausedElapsedTime;
        previousCounts = data.previousCounts;
        hasTrendBaseline = data.hasTrendBaseline;
        trendComparisonMode = data.trendComparisonMode;
        autoTrendEscalation = data.autoTrendEscalation;
        var snapshot = createPlaybackSnapshot(history);
        restoredDisplayFrame = getPlaybackFrame(snapshot, snapshot.durationMs);
        if (restoredDisplayFrame) {
            restoredDisplayFrame.isRestored = true;
            restoredDisplayFrame.playbackNewHighTiers = {};
            STORAGE_HISTORY_SERIES.forEach(function(key) {
                var value = history[key][history[key].length - 1];
                if (value > 0 && value >= getSessionHigh(key, 0).value) restoredDisplayFrame.playbackNewHighTiers[key] = true;
            });
            restoredDisplayFrame.roomTotalHigh = Math.max(roomTotalHigh, restoredDisplayFrame.roomTotalHigh);
        }
    }

    function getStorageReportStatus(model) {
        if (!model || model === 'unknown') return { producer: 'Unknown (no saved session)', access: 'No room' };
        var status = inspectStoredSession(model, false);
        var warnings = sessionRecordWarnings.get(getStorageKey(model)) || [];
        return {
            producer: status.producerVersion === null ? (status.legacy ? 'Unknown (legacy session)' : 'Unknown') :
                (status.producerVersion || '(empty string)'),
            access: status.protected ? 'Protected / read-only: ' + status.reason :
                (sessionStorageNotice || (activeSessionStorageKey === getStorageKey(model) ? 'Writable (separate tab record)' : 'Not initialized')) +
                (warnings.length ? '; ' + warnings.length + ' skipped record(s) retained; see console' : '')
        };
    }

    function saveSession(model) {
        if (!model || model === 'unknown') return;
        var key = getStorageKey(model);
        if (activeSessionStorageKey !== key || inspectStoredSession(model, false).protected) return;
        if (getRoomEpoch(key) !== activeRoomEpoch) {
            sessionStorageNotice = 'Reset in another tab — local data only; export TXT/CSV before reloading';
            updateAcquisitionStatus();
            return;
        }
        STORAGE_HISTORY_SERIES.forEach(function(series) {
            if (!sessionHighs[series]) sessionHighs[series] = getSessionHigh(series, 0);
        });
        var saveData = {
            schemaVersion: STORAGE_SCHEMA_VERSION,
            producerVersion: TIERSCOPE_VERSION,
            timestamp: Date.now(),
            history: history,
            tierHighTimes: tierHighTimes,
            withTokensHighTime: withTokensHighTime,
            totalHighTime: totalHighTime,
            anonHighTime: anonHighTime,
            femaleTransHighTime: femaleTransHighTime,
            roomTotalHigh: roomTotalHigh,
            roomTotalHighTime: roomTotalHighTime,
            trackingStartTime: trackingStartTime,
            sessionStartedAt: sessionStartedAt,
            sessionStartEstimated: sessionStartEstimated,
            sessionHighs: sessionHighs,
            roomEpoch: activeRoomEpoch,
            isPaused: isPaused,
            pausedElapsedTime: pausedElapsedTime,
            previousCounts: previousCounts,
            hasTrendBaseline: hasTrendBaseline,
            trendComparisonMode: trendComparisonMode,
            autoTrendEscalation: autoTrendEscalation
        };
        try {
            validateStoredSession(saveData);
            var raw = JSON.stringify(saveData);
            // A tab returning after expiration gets a new record ID. No read/modify/
            // write of a shared history key, even when two tabs save simultaneously.
            var tabRecord = tabRecords.get(key);
            if (!tabRecord || Date.now() - tabRecord.savedAt > STORAGE_MAX_AGE_MS) {
                tabRecord = { id: makeStorageId(), savedAt: Date.now() };
            }
            GM_setValue(roomTabPrefix(key) + tabRecord.id, raw);
            tabRecord.savedAt = Date.now();
            tabRecords.set(key, tabRecord);
            sessionStorageStatus.set(key, { protected: false, raw: raw, producerVersion: TIERSCOPE_VERSION, legacy: false });
            log('Session saved for ' + model + ' (storage schema ' + STORAGE_SCHEMA_VERSION + ', producer ' + TIERSCOPE_VERSION + ')');
        } catch (e) {
            log('Failed to save session: ' + e);
        }
    }

    function loadSession(model) {
        restoredDisplayFrame = null;
        if (!model || model === 'unknown') return false;
        leavePlayback(false);
        var key = getStorageKey(model);
        activeSessionStorageKey = key;
        activeRoomEpoch = getRoomEpoch(key);
        sessionStorageNotice = '';
        var saved = inspectStoredSession(model, true);
        if (saved.protected || !saved.data) return false;
        var age = Date.now() - saved.data.timestamp;
        restoreSessionState(saved.data);
        log('Session restored for ' + model + ' (' + Math.round(age/60000) + ' min old; ' +
            (saved.legacy ? 'validated legacy schema 1' : 'storage schema ' + STORAGE_SCHEMA_VERSION) +
            '; producer ' + (saved.producerVersion === null ? 'unknown' : saved.producerVersion) + ')');
        return true;
    }

    function deleteSession(model) {
        if (!model || model === 'unknown') return;
        var key = getStorageKey(model);
        try {
            // Invalidate every old tab before clearing this tab's data. Late writes
            // carry the old epoch and cannot become the restored session.
            activeRoomEpoch = makeStorageId();
            GM_setValue(roomEpochKey(key), activeRoomEpoch);
            GM_listValues().filter(function(candidate) { return candidate.indexOf(roomTabPrefix(key)) === 0; })
                .forEach(function(candidate) { GM_deleteValue(candidate); });
            GM_deleteValue(key);
            sessionStorageStatus.delete(key);
            sessionRecordWarnings.delete(key);
            sessionStorageNotice = '';
            log('Session deleted for ' + model);
        } catch (e) {
            protectSessionStorage(key, 'Explicit Reset could not delete saved session: ' + e.message,
                (sessionStorageStatus.get(key) || {}).producerVersion);
            log('Reset cleared live tracking but saved storage remains protected: ' + e.message);
        }
    }

    function isBroadcastRoom() {
        var path = window.location.pathname;
        var pathParts = path.split('/').filter(function(p) { return p; });
        if (pathParts.length === 0) return false;
        var nonRoomPaths = ['followed', 'featured', 'tags', 'accounts', 'login', 'register',
                           'supporter', 'settings', 'apps', 'explore', 'trending', 'new',
                           'female', 'male', 'couple', 'trans', 'hd', 'north-american',
                           'european', 'asian', 'south-american', 'exhibitionist',
                           'followed-cams', 'female-cams', 'trans-cams', 'male-cams', 'couple-cams'];
        if (nonRoomPaths.indexOf(pathParts[0]) !== -1) return false;
        if (pathParts[0] === 'b' && pathParts.length >= 2) return true;
        if (pathParts.length === 1) return true;
        if (pathParts.length === 2 && pathParts[1] === 'cam') return true;
        return false;
    }

    function formatElapsedTime(ms) {
        ms = Math.max(0, ms);
        var totalSeconds = Math.floor(ms / 1000);
        var hours = Math.floor(totalSeconds / 3600);
        var minutes = Math.floor((totalSeconds % 3600) / 60);
        var seconds = totalSeconds % 60;
        return (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    }

    function formatDateTime(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    function formatSampleAge(timestamp) {
        var seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
        if (seconds < 60) return seconds + 's';
        var minutes = Math.floor(seconds / 60);
        if (minutes < 60) return minutes + 'm';
        var hours = Math.floor(minutes / 60);
        if (hours < 24) return hours + 'h' + (minutes % 60 ? ' ' + (minutes % 60) + 'm' : '');
        var days = Math.floor(hours / 24);
        return days + 'd' + (hours % 24 ? ' ' + (hours % 24) + 'h' : '');
    }

    function getModelName() {
        return getModelNameFromUrl(location.href);
    }

    function checkTrendAutoEscalation() {
        if (!autoTrendEscalation || !trackingStartTime) return;
        var elapsedMs = isPaused ? pausedElapsedTime : (Date.now() - trackingStartTime);
        var elapsedMin = elapsedMs / 60000;
        var targetMode = 'last';
        if (elapsedMin >= 60) targetMode = '1hour';
        else if (elapsedMin >= 30) targetMode = '30min';
        else if (elapsedMin >= 15) targetMode = '15min';
        else if (elapsedMin >= 5) targetMode = '5min';
        if (targetMode !== trendComparisonMode) {
            log('Auto-escalating trend mode: ' + trendComparisonMode + ' -> ' + targetMode + ' (' + Math.floor(elapsedMin) + ' min elapsed)');
            if (users.size === 0) {
                trendComparisonMode = targetMode;
                updateTrendPresetButtons();
                updateAutoTrendButton();
                saveSession(getModelName());
                return;
            }
            setTrendComparisonMode(targetMode);
        }
    }

    function updateTrackingTimer() {
        var controlTimerEl = document.getElementById('control-tracking-timer');
        var displayTime = '00:00:00';
        var displayColor = 'var(--panel-subtle)';
        if (isPaused) {
            displayTime = formatElapsedTime(pausedElapsedTime);
            displayColor = 'var(--panel-negative)';
        } else if (trackingStartTime) {
            displayTime = formatElapsedTime(Date.now() - trackingStartTime);
            displayColor = 'var(--panel-warning)';
        }
        if (controlTimerEl) {
            controlTimerEl.textContent = displayTime;
            controlTimerEl.style.color = displayColor;
        }
        checkTrendAutoEscalation();
    }

    function startTrackingTimer() {
        if (sessionStartedAt === null) sessionStartedAt = Date.now();
        if (isPaused) {
            isPaused = false;
            trackingStartTime = Date.now() - pausedElapsedTime;
        } else if (!trackingStartTime) {
            trackingStartTime = Date.now();
        }
        if (trackingTimerInterval) {
            clearInterval(trackingTimerInterval);
            trackingTimerInterval = null;
        }
        trackingTimerInterval = setInterval(updateTrackingTimer, 1000);
        updateTrackingTimer();
        saveSession(getModelName());
    }

    function pauseTrackingTimer() {
        if (isPaused) return;
        pendingHistoryGap = true;
        isPaused = true;
        pausedElapsedTime = trackingStartTime ? Math.max(0, Date.now() - trackingStartTime) : 0;
        if (trackingTimerInterval) {
            clearInterval(trackingTimerInterval);
            trackingTimerInterval = null;
        }
        updateTrackingTimer();
        saveSession(getModelName());
    }

    function stopTrackingTimer() {
        if (trackingTimerInterval) {
            clearInterval(trackingTimerInterval);
            trackingTimerInterval = null;
        }
        trackingStartTime = null;
        sessionStartedAt = null;
        sessionStartEstimated = false;
        sessionHighs = {};
        pausedElapsedTime = 0;
        isPaused = false;
        roomTotalHighTime = null;
        tierHighTimes = {};
        withTokensHighTime = null;
        totalHighTime = null;
        anonHighTime = null;
        femaleTransHighTime = null;
        previousCounts = {
            'red': 0, 'green': 0, 'purple': 0, 'pink': 0,
            'dark-blue': 0, 'light-blue': 0, 'gray': 0, 'female-trans': 0,
            'withTokens': 0, 'total': 0, 'anonymous': 0
        };
        hasTrendBaseline = false;
        trendComparisonMode = 'last';
        autoTrendEscalation = true;
        newHighTiers = {};
        updateTrackingTimer();
    }

    function toggleAutoTrendEscalation() {
        autoTrendEscalation = !autoTrendEscalation;
        updateAutoTrendButton();
        log('Auto trend escalation ' + (autoTrendEscalation ? 'enabled' : 'disabled'));
        saveSession(getModelName());
        if (autoTrendEscalation) {
            checkTrendAutoEscalation();
        }
    }

    function updateAutoTrendButton() {
        var btn = document.getElementById('btn-trend-auto');
        if (btn) {
            if (autoTrendEscalation) {
                btn.style.background = '#32CD32';
                btn.style.color = '#fff';
                btn.style.borderColor = '#32CD32';
                btn.title = 'Auto-escalation ON - Click to disable';
            } else {
                btn.style.background = 'var(--panel-button)';
                btn.style.color = 'var(--panel-muted)';
                btn.style.borderColor = 'var(--panel-divider)';
                btn.title = 'Auto-escalation OFF - Click to enable';
            }
        }
    }

    function resetAllTracking() {
        if (!confirm('Reset all tracking data?\n\nThis will clear:\n- All session history\n- Trend tracking\n- Elapsed timer\n\nA new scan will start immediately.')) {
            return;
        }
        var modelName = getModelName();
        leavePlayback(false);
        cancelGifExport();
        log('Performing main reset...');
        deleteSession(modelName);
        activeSessionStorageKey = getStorageKey(modelName);
        scanEpoch++;
        isScanning = false;
        stopCountdown();
        stopTrackingTimer();
        // Reset the elapsed timer without changing the automatic scanning preference.
        isPaused = !isAutoRefreshOn;
        users.clear();
        lastAcceptedAcquisition = null;
        restoredDisplayFrame = null;
        lastAcquisitionAttemptSource = 'API';
        domHealthStatus.consecutiveFailures = 0;
        updateAcquisitionStatus();
        previousUserCount = 0;
        previousRoomTotal = 0;
        roomTotal = 0;
        roomTotalHigh = 0;
        previousCounts = {
            'red': 0, 'green': 0, 'purple': 0, 'pink': 0,
            'dark-blue': 0, 'light-blue': 0, 'gray': 0, 'female-trans': 0,
            'withTokens': 0, 'total': 0, 'anonymous': 0
        };
        hasTrendBaseline = false;
        trendComparisonMode = 'last';
        autoTrendEscalation = true;
        newHighTiers = {};
        history = {
            timestamps: [],
            'red': [], 'green': [], 'purple': [], 'pink': [], 'dark-blue': [], 'light-blue': [], 'gray': [], 'female-trans': [],
            'withTokens': [], 'total': [], 'anonymous': []
        };
        roomTotalHighTime = null;
        tierHighTimes = {};
        withTokensHighTime = null;
        totalHighTime = null;
        anonHighTime = null;
        femaleTransHighTime = null;
        resetCountdown();
        updateDisplay();
        updateTrendDisplay();
        updateTrackingTimer();
        updateCountdownDisplay();
        drawAllSparklines();
        if (isAutoRefreshOn) {
            startTrackingTimer();
            startCountdown();
        }
        // Persist even when paused, before the deferred one-off scan can run or fail.
        saveSession(modelName);
        var resetContext = { epoch: scanEpoch, generation: initGuard, url: location.href };
        setTimeout(function() {
            if (isAcquisitionCurrent(resetContext)) performScanThenReturn(true);
        }, 500);
        updateTrendPresetButtons();
        updateAutoTrendButton();
        log('Reset complete - starting fresh scan (epoch: ' + scanEpoch + ')');
    }

    function getTierFromClassList(classList) {
        for (var i = 0; i < classList.length; i++) {
            var className = classList[i];
            var lower = className.toLowerCase();
            if (className === 'tippedTonsRecently' || lower === 'tippedtonsrecently') return 'purple';
            if (className === 'tippedALotRecently' || lower === 'tippedalotrecently') return 'pink';
            if (className === 'tippedRecently' || lower === 'tippedrecently') return 'dark-blue';
            if (className === 'inFanClub' || lower === 'infanclub') return 'green';
            if (className === 'mod' || lower === 'moderator') return 'red';
            if (className === 'hasTokens' || lower === 'hastokens') return 'light-blue';
            if (className === 'defaultUser' || lower === 'defaultuser') return 'gray';
        }
        return null;
    }

    function getTierFromElement(el) {
        var tier = getTierFromClassList(el.classList);
        if (tier) return tier;
        var parent = el.parentElement;
        for (var i = 0; i < 4 && parent; i++) {
            tier = getTierFromClassList(parent.classList);
            if (tier) return tier;
            parent = parent.parentElement;
        }
        return 'gray';
    }

    function getGenderFromElement(el) {
        var genderImg = el.querySelector('img[data-testid="gender-icon"], img[title="Trans"], img[title="Female"], img[title="Male"], img[title="Couple"]');
        if (!genderImg) {
            var parent = el.parentElement;
            for (var i = 0; i < 3 && parent; i++) {
                genderImg = parent.querySelector('img[data-testid="gender-icon"], img[title="Trans"], img[title="Female"], img[title="Male"], img[title="Couple"]');
                if (genderImg) break;
                parent = parent.parentElement;
            }
        }
        if (genderImg) {
            var src = genderImg.src || '';
            var title = genderImg.title || '';
            if (src.indexOf('female') !== -1 || title === 'Female') return 'female';
            if (src.indexOf('trans') !== -1 || title === 'Trans') return 'trans';
            if (src.indexOf('male') !== -1 || title === 'Male') return 'male';
            if (src.indexOf('couple') !== -1 || title === 'Couple') return 'couple';
        }
        return 'unknown';
    }

    function getRoomTotal() {
        for (var i = 0; i < DOM_SELECTORS.roomTotal.length; i++) {
            var el = document.querySelector(DOM_SELECTORS.roomTotal[i]);
            if (el) {
                var text = el.textContent || '';
                var match = text.match(/USERS\s*\(?(\d[\d,]*)\)?/i);
                if (match) return parseInt(match[1].replace(/,/g, ''));
            }
        }
        return 0;
    }

    function getAnonymousCount() {
        if (lastAcceptedAcquisition && lastAcceptedAcquisition.source === 'API') {
            return lastAcceptedAcquisition.api.anonymousCount;
        }
        var tracked = users.size;
        if (roomTotal > tracked) return roomTotal - tracked;
        return 0;
    }

    function extractUsername(text) {
        if (!text) return null;
        text = text.trim().split('\n')[0];
        var match = text.match(/^([^\s\(\[\<\,]+)/);
        if (match) {
            var candidate = match[1].trim();
            if (candidate.length >= 2 && candidate.length <= 30) {
                var clean = candidate.replace(/[^\w\-]+$/, '');
                if (clean.length >= 2) return clean;
            }
        }
        return null;
    }

    function findTab(tabName) {
        var selectors = DOM_SELECTORS.tabs[tabName.toLowerCase()] || [];
        for (var i = 0; i < selectors.length; i++) {
            var el = document.querySelector(selectors[i]);
            if (el) return el;
        }
        var buttons = document.querySelectorAll('button, div[role="tab"]');
        for (var j = 0; j < buttons.length; j++) {
            var btn = buttons[j];
            var text = (btn.textContent || '').toUpperCase();
            if (text.indexOf(tabName.toUpperCase()) !== -1) return btn;
        }
        return null;
    }

    function isScanValid(newUserCount, newRoomTotal) {
        if (previousRoomTotal === 0) return true;
        if (newRoomTotal === 0 && previousRoomTotal > 0) {
            log('Scan rejected: room total is 0 but previous was ' + previousRoomTotal);
            return false;
        }
        var roomTotalChange = Math.abs(newRoomTotal - previousRoomTotal) / previousRoomTotal;
        if (roomTotalChange > 0.10) return true;
        var userDrop = previousUserCount > 0 ? (previousUserCount - newUserCount) / previousUserCount : 0;
        if (userDrop > 0.50) {
            log('Scan rejected: user count dropped ' + Math.round(userDrop * 100) + '% (' +
                previousUserCount + ' -> ' + newUserCount + ') while room total stable (' +
                previousRoomTotal + ' -> ' + newRoomTotal + ')');
            return false;
        }
        return true;
    }

    function downloadTrackingReport() {
        var modelName = getModelName();
        var restored = restoredDisplayFrame;
        var sessionStart = sessionStartedAt !== null ? formatDateTime(sessionStartedAt) : 'Not started';
        var totalTime = trackingStartTime ? formatElapsedTime(isPaused ? pausedElapsedTime : (Date.now() - trackingStartTime)) : '00:00:00';
        var now = Date.now();
        var storageReport = getStorageReportStatus(modelName);
        var report = [
            '================================',
            'CHATURBATE TRACKING REPORT',
            '================================',
            '',
            'Model: ' + modelName,
            'Session Start: ' + sessionStart + (sessionStartEstimated ? ' (estimated from legacy data)' : ''),
            'Report Generated: ' + formatDateTime(now),
            'TierScope Version: ' + TIERSCOPE_VERSION,
            'Storage Schema Version: ' + STORAGE_SCHEMA_VERSION,
            'Saved Session Producer Version: ' + storageReport.producer,
            'Session Storage: ' + storageReport.access,
            'Last Accepted Acquisition Source: ' + (lastAcceptedAcquisition ? lastAcceptedAcquisition.source : 'None'),
            'Last Accepted Sample Time: ' + (lastAcceptedAcquisition ? new Date(lastAcceptedAcquisition.timestamp).toISOString() : 'None'),
            'Total Tracking Time: ' + totalTime,
            ''
        ];
        if (restored) {
            report.push('Displayed Data: Last saved snapshot; no fresh sample accepted since restore.');
            report.push('Saved Snapshot Time: ' + new Date(restored.timestamp).toISOString());
            report.push('');
        }
        if (lastAcceptedAcquisition && lastAcceptedAcquisition.api) {
            report.push('API Anonymous Count: ' + lastAcceptedAcquisition.api.anonymousCount);
            report.push('API Registered Record Count: ' + lastAcceptedAcquisition.api.registeredCount);
            report.push('API Total Users: ' + lastAcceptedAcquisition.api.totalUsers);
            report.push('API Owner Record Present: ' + (lastAcceptedAcquisition.api.ownerCount > 0 ? 'yes' : 'no'));
            report.push('Registered includes broadcaster/owner and unclassified records outside the seven viewer tiers.');
            report.push('');
        }
        report.push('--- SESSION HIGHS ---');
        report.push('Offsets below are wall time since session start, including pauses.');
        if (sessionStartEstimated) report.push('Legacy tier highs were recovered from retained samples; older discarded peaks are unavailable.');
        report.push('');
        if (roomTotalHigh > 0 && roomTotalHighTime) {
            var elapsed = formatElapsedTime(roomTotalHighTime - sessionStartedAt);
            report.push('Room Total High: ' + roomTotalHigh.toLocaleString() + ' users');
            report.push('  Recorded at: ' + formatDateTime(roomTotalHighTime) + ' (' + elapsed + ' into session)');
            report.push('');
        }
        Object.keys(TIERS).forEach(function(tier) {
            var highResult = getSessionHigh(tier, 0);
            var highVal = highResult.value;
            var highTime = tierHighTimes[tier];
            if (highVal > 0 && highTime) {
                var elapsed = formatElapsedTime(highTime - sessionStartedAt);
                report.push(TIERS[tier].name + ' High: ' + highVal.toLocaleString());
                report.push('  Recorded at: ' + formatDateTime(highTime) + ' (' + elapsed + ' into session)');
                report.push('');
            }
        });
        var withTokensResult = getSessionHigh('withTokens', 0);
        var withTokensHigh = withTokensResult.value;
        if (withTokensHigh > 0 && withTokensHighTime) {
            var elapsed = formatElapsedTime(withTokensHighTime - sessionStartedAt);
            report.push('With Tokens High: ' + withTokensHigh.toLocaleString());
            report.push('  Recorded at: ' + formatDateTime(withTokensHighTime) + ' (' + elapsed + ' into session)');
            report.push('');
        }
        var totalResult = getSessionHigh('total', 0);
        var totalHigh = totalResult.value;
        if (totalHigh > 0 && totalHighTime) {
            var elapsed = formatElapsedTime(totalHighTime - sessionStartedAt);
            report.push('Registered Users High: ' + totalHigh.toLocaleString());
            report.push('  Recorded at: ' + formatDateTime(totalHighTime) + ' (' + elapsed + ' into session)');
            report.push('');
        }
        var anonResult = getSessionHigh('anonymous', 0);
        var anonHigh = anonResult.value;
        if (anonHigh > 0 && anonHighTime) {
            var elapsed = formatElapsedTime(anonHighTime - sessionStartedAt);
            report.push('Anonymous High: ' + anonHigh.toLocaleString());
            report.push('  Recorded at: ' + formatDateTime(anonHighTime) + ' (' + elapsed + ' into session)');
            report.push('');
        }
        report.push(restored ? '--- LAST SAVED STATS (NOT A LIVE SAMPLE) ---' : '--- CURRENT STATS ---');
        report.push('');
        var counts = { 'red': 0, 'green': 0, 'purple': 0, 'pink': 0, 'dark-blue': 0, 'light-blue': 0, 'gray': 0, 'female-trans': 0 };
        users.forEach(function(data) {
            if (counts[data.tier] !== undefined) counts[data.tier]++;
            if (data.gender === 'female' || data.gender === 'trans') {
                counts['female-trans']++;
            }
        });
        var total = users.size;
        var withTokens = counts['red'] + counts['green'] + counts['purple'] + counts['pink'] + counts['dark-blue'] + counts['light-blue'];
        var anonymousCount = getAnonymousCount();
        var fullRoomTotal = roomTotal > total ? roomTotal : (total + anonymousCount);
        if (restored) {
            counts = restored.counts;
            total = restored.total;
            withTokens = restored.withTokens;
            anonymousCount = restored.anonymousCount;
            fullRoomTotal = restored.fullRoomTotal;
        }
        var totalHighCurrent = getSessionHigh('total', total).value;
        var withTokensHighCurrent = getSessionHigh('withTokens', withTokens).value;
        var anonHighCurrent = getSessionHigh('anonymous', anonymousCount).value;
        var statsLabel = restored ? 'Saved ' : 'Current ';
        var reportedRoomHigh = restored ? restored.roomTotalHigh : roomTotalHigh;
        report.push(statsLabel + 'Room Total: ' + fullRoomTotal.toLocaleString() + ' (High: ' + reportedRoomHigh.toLocaleString() + ')');
        report.push(statsLabel + 'Registered: ' + total.toLocaleString() + ' (High: ' + totalHighCurrent.toLocaleString() + ')');
        report.push(statsLabel + 'With Tokens: ' + withTokens.toLocaleString() + ' (High: ' + withTokensHighCurrent.toLocaleString() + ')');
        report.push(statsLabel + 'Anonymous: ' + anonymousCount.toLocaleString() + ' (High: ' + anonHighCurrent.toLocaleString() + ')');
        report.push('');
        report.push(restored ? '--- SAVED TIER BREAKDOWN ---' : '--- TIER BREAKDOWN ---');
        report.push('');
        Object.keys(TIERS).forEach(function(tier) {
            var current = counts[tier] || 0;
            var high = getSessionHigh(tier, current).value;
            report.push(TIERS[tier].name + ': ' + current.toLocaleString() + ' (High: ' + high.toLocaleString() + ')');
        });
        report.push('');
        report.push('================================');
        report.push('End of Report');
        report.push('================================');
        var date = new Date();
        var dateStr = date.toISOString().slice(0, 10);
        var timeStr = date.getHours().toString().padStart(2, '0') + '-' +
                     date.getMinutes().toString().padStart(2, '0') + '-' +
                     date.getSeconds().toString().padStart(2, '0');
        var filename = modelName + '-tracking-report-' + dateStr + '-' + timeStr + '.txt';
        var blob = new Blob([report.join('\n')], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function downloadTrackingCSV() {
        if (!history.timestamps.length) {
            alert('No recorded history to export yet.');
            return;
        }
        var model = getModelName();
        function cell(value) {
            var text = String(value);
            // Quoting handles CSV delimiters; the prefix prevents spreadsheet formulas.
            if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
            return '"' + text.replace(/"/g, '""') + '"';
        }
        var rows = [['room', 'sample_index', 'timestamp_utc', 'elapsed_seconds', 'room_total',
            'registered', 'anonymous', 'with_tokens', 'moderators', 'fan_club', 'dark_purple',
            'light_purple', 'dark_blue', 'light_blue', 'grey', 'female_trans']];
        history.timestamps.forEach(function(timestamp, i) {
            rows.push([model, i + 1, new Date(timestamp).toISOString(),
                Math.max(0, timestamp - history.timestamps[0]) / 1000,
                history.total[i] + history.anonymous[i], history.total[i], history.anonymous[i],
                history.withTokens[i], history.red[i], history.green[i], history.purple[i],
                history.pink[i], history['dark-blue'][i], history['light-blue'][i], history.gray[i], history['female-trans'][i]]);
        });
        var blob = new Blob(['\ufeff' + rows.map(function(row) { return row.map(cell).join(','); }).join('\r\n') + '\r\n'],
            { type: 'text/csv;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = model.replace(/[^a-z0-9_-]/gi, '_') + '-history-' + new Date().toISOString().replace(/[:.]/g, '-') + '.csv';
        document.body.appendChild(link);
        try { link.click(); } finally {
            link.remove();
            setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
        }
    }

    // A small indexed-color renderer: each rectangle updates the canvas and its
    // matching palette index buffer. Bitmap lettering needs no antialiasing,
    // RGB matching, dithering or quantizer. Only one frame is retained at a time.
    const GIF_WIDTH = 480;
    const GIF_HEIGHT = 640;
    const GIF_MAX_FRAMES = 60;
    const GIF_DURATION_CS = 1000; // GIF delay units are hundredths of a second.
    const GIF_FONT = {
        ' ': [0,0,0,0,0,0,0],
        A:[14,17,17,31,17,17,17], B:[30,17,17,30,17,17,30],
        C:[14,17,16,16,16,17,14], D:[30,17,17,17,17,17,30],
        E:[31,16,16,30,16,16,31], F:[31,16,16,30,16,16,16],
        G:[14,17,16,23,17,17,15], H:[17,17,17,31,17,17,17],
        I:[14,4,4,4,4,4,14], J:[7,2,2,2,18,18,12],
        K:[17,18,20,24,20,18,17], L:[16,16,16,16,16,16,31],
        M:[17,27,21,21,17,17,17], N:[17,25,21,19,17,17,17],
        O:[14,17,17,17,17,17,14], P:[30,17,17,30,16,16,16],
        Q:[14,17,17,17,21,18,13], R:[30,17,17,30,20,18,17],
        S:[15,16,16,14,1,1,30], T:[31,4,4,4,4,4,4],
        U:[17,17,17,17,17,17,14], V:[17,17,17,17,17,10,4],
        W:[17,17,17,21,21,21,10], X:[17,17,10,4,10,17,17],
        Y:[17,17,10,4,4,4,4], Z:[31,1,2,4,8,16,31],
        '0':[14,17,19,21,25,17,14], '1':[4,12,4,4,4,4,14],
        '2':[14,17,1,2,4,8,31], '3':[30,1,1,14,1,1,30],
        '4':[2,6,10,18,31,2,2], '5':[31,16,16,30,1,1,30],
        '6':[14,16,16,30,17,17,14], '7':[31,1,2,4,8,8,8],
        '8':[14,17,17,14,17,17,14], '9':[14,17,17,15,1,1,14],
        ':':[0,4,4,0,4,4,0], '/':[1,2,2,4,8,8,16],
        '-':[0,0,0,31,0,0,0], '.':[0,0,0,0,0,6,6],
        '+':[0,4,4,31,4,4,0], '?':[14,17,1,2,4,0,4]
    };

    function createGifSurface(palette) {
        var canvas = document.createElement('canvas');
        canvas.width = GIF_WIDTH; canvas.height = GIF_HEIGHT;
        var ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) throw new Error('Canvas is unavailable.');
        var pixels = new Uint8Array(GIF_WIDTH * GIF_HEIGHT);
        var colors = palette.map(function(color) { return '#' + color.toString(16).padStart(6, '0'); });
        function rect(x, y, width, height, color) {
            x = Math.round(x); y = Math.round(y);
            width = Math.round(width); height = Math.round(height);
            var left = Math.max(0, x), top = Math.max(0, y);
            var right = Math.min(GIF_WIDTH, x + width), bottom = Math.min(GIF_HEIGHT, y + height);
            if (right <= left || bottom <= top) return;
            ctx.fillStyle = colors[color];
            ctx.fillRect(left, top, right - left, bottom - top);
            for (var row = top; row < bottom; row++) {
                pixels.fill(color, row * GIF_WIDTH + left, row * GIF_WIDTH + right);
            }
        }
        function text(value, x, y, color, scale, rightAlign) {
            scale = scale || 1;
            value = String(value).toUpperCase();
            if (rightAlign) x -= (value.length * 6 - 1) * scale;
            for (var i = 0; i < value.length; i++) {
                var glyph = GIF_FONT[value[i]] || GIF_FONT['?'];
                for (var row = 0; row < 7; row++) {
                    for (var col = 0; col < 5; col++) {
                        if (glyph[row] & (1 << (4 - col))) {
                            rect(x + (i * 6 + col) * scale, y + row * scale, scale, scale, color);
                        }
                    }
                }
            }
        }
        return { canvas: canvas, pixels: pixels, rect: rect, text: text };
    }

    function gifCount(value) {
        value = Math.max(0, Number(value) || 0);
        var text = String(Math.round(value));
        return text.length <= 10 ? text : value.toExponential(2);
    }

    function getGifSampleIndex(snapshot, frameIndex, frameCount) {
        var last = snapshot.timeline.length - 1;
        if (snapshot.timeline.length <= GIF_MAX_FRAMES) return frameIndex;
        if (frameIndex === 0) return 0;
        if (frameIndex === frameCount - 1) return last;
        // At most 60 evenly spaced moments in the recorded time range. Keep
        // the actual saved counts (no interpolation between acquisitions).
        var position = snapshot.durationMs * frameIndex / (frameCount - 1);
        var low = 0, high = snapshot.timeline.length;
        while (low < high) {
            var middle = Math.floor((low + high) / 2);
            if (snapshot.timeline[middle] <= position) low = middle + 1;
            else high = middle;
        }
        return Math.max(0, low - 1);
    }

    function drawGifSparkline(surface, values, lastIndex, color, bounds, times, breaks) {
        // Match the panel: show only history through the selected sample, with
        // each tier scaled to its own visible minimum/maximum and elapsed time.
        // Reserve space for the two-pixel stroke at the right and bottom edges.
        var left = bounds.left, top = bounds.top;
        var plotWidth = bounds.width - 2, plotHeight = bounds.height - 2;
        var minimum = values[0], maximum = values[0];
        for (var i = 1; i <= lastIndex; i++) {
            minimum = Math.min(minimum, values[i]);
            maximum = Math.max(maximum, values[i]);
        }
        var range = maximum - minimum || 1;
        function y(value) { return maximum === minimum ? top + Math.round(plotHeight / 2) : top + plotHeight - Math.round((value - minimum) / range * plotHeight); }
        function line(x0, y0, x1, y1) {
            // Integer rasterization keeps every pixel in the fixed GIF palette.
            var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
            var dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
            var error = dx + dy;
            while (true) {
                surface.rect(x0, y0, 2, 2, color);
                if (x0 === x1 && y0 === y1) break;
                var twiceError = 2 * error;
                if (twiceError >= dy) { error += dy; x0 += sx; }
                if (twiceError <= dx) { error += dx; y0 += sy; }
            }
        }
        var plot = buildChartPlot(values, times || values.map(function(_, i) { return i; }), breaks || [], plotWidth, lastIndex);
        var previous = null;
        plot.points.forEach(function(point) {
            var x = left + Math.round(point.x), nextY = y(point.value);
            if (previous && !point.move) line(previous.x, previous.y, x, nextY);
            else surface.rect(x, nextY, 2, 2, color);
            previous = { x: x, y: nextY };
        });
    }

    function drawGifSummary(surface, snapshot, index, tiers) {
        var data = snapshot.history;
        var margin = 16, rowStart = 90, rowStep = 44, groupGap = 12;
        var chartLeft = 176, countWidth = 70, columnGap = 10;
        var chartWidth = GIF_WIDTH - chartLeft - margin - countWidth - columnGap;
        surface.rect(0, 0, GIF_WIDTH, GIF_HEIGHT, 0);
        surface.text('TIERSCOPE REPLAY', margin, 12, 1, 3);
        surface.text(formatElapsedTime(snapshot.timeline[index]) + ' / ' +
            formatElapsedTime(snapshot.durationMs), margin, 46, 1, 2);
        surface.text('LINES SCALED PER SERIES', margin, 67, 1, 1);
        surface.rect(margin, 80, GIF_WIDTH - margin * 2, 2, 1);
        function drawRow(label, values, top, color) {
            surface.rect(margin, top + 14, 6, 14, color);
            surface.text(label, 30, top + 14, 1, 2);
            drawGifSparkline(surface, values, index, color,
                { left: chartLeft, top: top + 2, width: chartWidth, height: 36 }, data.timestamps, getHistoryBreaks(data));
            var count = gifCount(values[index]);
            // Keep unusually large counts inside their column without truncation.
            var countScale = (count.length * 6 - 1) * 2 <= countWidth ? 2 : 1;
            surface.text(count, GIF_WIDTH - margin, top + (countScale === 2 ? 14 : 18), color, countScale, true);
        }
        tiers.forEach(function(tier, row) {
            drawRow(tier === 'female-trans' ? 'FEMALE/TRANS' : TIERS[tier].name,
                data[tier], rowStart + row * rowStep, row + 2);
        });
        var totalsStart = rowStart + tiers.length * rowStep;
        surface.rect(margin, totalsStart, GIF_WIDTH - margin * 2, 2, 1);
        totalsStart += groupGap;
        var roomTotals = data.total.map(function(value, i) { return value + data.anonymous[i]; });
        drawRow('TOTAL', roomTotals, totalsStart, 1);
        drawRow('WITH TOKENS', data.withTokens, totalsStart + rowStep, 10);
        drawRow('REGISTERED', data.total, totalsStart + rowStep * 2, 1);
        drawRow('ANONYMOUS', data.anonymous, totalsStart + rowStep * 3, 11);
    }

    function cancelGifExport() {
        if (gifExportJob) gifExportJob.cancelled = true;
    }

    async function generateGifFromHistory() {
        if (gifExportJob) return;
        var button = document.getElementById('btn-export-gif');
        var status = document.getElementById('gif-export-status');
        var cancel = document.getElementById('btn-cancel-gif');
        var progress = document.getElementById('gif-export-controls');
        var job = { cancelled: false, url: location.href, generation: initGuard,
            key: activeSessionStorageKey };
        gifExportJob = job;
        if (button) button.disabled = true;
        if (progress) progress.style.display = 'flex';
        if (cancel) cancel.hidden = false;
        if (status) status.textContent = 'Preparing GIF…';
        function checkJob() {
            if (job.cancelled || location.href !== job.url || initGuard !== job.generation ||
                activeSessionStorageKey !== job.key) throw new Error('GIF export cancelled.');
        }
        try {
            if (typeof GifWriter !== 'function') {
                throw new Error('GIF encoder missing. Reinstall the complete script, including its @require header.');
            }
            var model = getModelName();
            if (!model || model === 'unknown' || location.href !== lastUrl ||
                activeSessionStorageKey !== getStorageKey(model)) {
                throw new Error('Wait for this room to finish loading before exporting.');
            }
            // Playback owns a frozen snapshot. Live acquisition can keep appending
            // samples without changing the range or counts of this export.
            if (!isPlaybackCurrent(playback)) throw new Error('Open Replay before downloading a GIF.');
            var snapshot = playback.snapshot;
            if (!snapshot.timeline.length) throw new Error('No recorded history to export yet.');
            var tiers = Object.keys(TIERS);
            var palette = [0x14141e, 0xffffff].concat(tiers.map(function(tier) {
                return parseInt(TIERS[tier].color.slice(1), 16);
            }));
            palette.push(0xff69b4, 0x888888); // With Tokens and Anonymous summary lines.
            // GIF color-table lengths must be powers of two. Unused slots stay dark.
            while ((palette.length & (palette.length - 1)) !== 0) palette.push(palette[0]);
            var surface = createGifSurface(palette);
            var frameCount = Math.min(GIF_MAX_FRAMES, snapshot.timeline.length);
            // Grow only the compressed output. Reserve conservative worst-case LZW
            // space before addFrame: <2 bytes/pixel plus block/header overhead.
            var bytes = new Uint8Array(256 * 1024);
            var writer = new GifWriter(bytes, GIF_WIDTH, GIF_HEIGHT, { palette: palette, loop: 0 });
            for (var i = 0; i < frameCount; i++) {
                await new Promise(function(resolve) { setTimeout(resolve, 0); });
                checkJob();
                var index = getGifSampleIndex(snapshot, i, frameCount);
                drawGifSummary(surface, snapshot, index, tiers);
                var needed = writer.getOutputBufferPosition() + GIF_WIDTH * GIF_HEIGHT * 2 + 1024;
                if (needed > bytes.length) {
                    var grown = new Uint8Array(Math.max(bytes.length * 2, needed));
                    grown.set(bytes); bytes = grown; writer.setOutputBuffer(bytes);
                }
                // Integer centiseconds sum to exactly ten seconds, even with 60 frames.
                var delay = Math.round((i + 1) * GIF_DURATION_CS / frameCount) -
                    Math.round(i * GIF_DURATION_CS / frameCount);
                writer.addFrame(0, 0, GIF_WIDTH, GIF_HEIGHT, surface.pixels, { delay: delay, disposal: 1 });
                if (status) status.textContent = 'GIF ' + Math.round((i + 1) / frameCount * 100) + '%';
            }
            checkJob();
            var length = writer.end();
            if (length > bytes.length) throw new Error('GIF output buffer overflow.');
            var blob = new Blob([bytes.subarray(0, length)], { type: 'image/gif' });
            var url = URL.createObjectURL(blob);
            try {
                var link = document.createElement('a');
                link.href = url;
                link.download = model.replace(/[^a-z0-9_-]/gi, '_') + '-replay-' + new Date().toISOString().slice(0, 10) + '.gif';
                document.body.appendChild(link);
                try { link.click(); } finally { link.remove(); }
            } finally {
                setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
            }
            if (status) status.textContent = 'GIF downloaded';
            log('GIF export complete: ' + frameCount + ' frames, ' + length + ' bytes');
        } catch (error) {
            if (status) status.textContent = error.message;
            log('GIF export: ' + error.message);
            if (!job.cancelled && location.href === job.url && initGuard === job.generation) alert(error.message);
        } finally {
            if (button) button.disabled = false;
            if (cancel) cancel.hidden = true;
            if (progress) progress.style.display = 'none';
            if (button && status) button.title = status.textContent;
            if (gifExportJob === job) gifExportJob = null;
        }
    }

    const REQUEST_POLICY_KEY = 'tierscope:requests:v1:' + location.origin;
    var requestPolicyUnsaved = false;
    var requestPolicyCache = { until: 0, failures: 0, blocked: 0, status: 0, revision: '' };

    function readRequestPolicy() {
        try {
            var raw = GM_getValue(REQUEST_POLICY_KEY, null);
            if (raw === null && !requestPolicyUnsaved) requestPolicyCache = { until: 0, failures: 0, blocked: 0, status: 0, revision: '' };
            else if (raw !== null) {
                var value = JSON.parse(raw);
                if (value && Number.isFinite(value.until) && value.until >= 0 && Number.isInteger(value.failures) &&
                    value.failures >= 0 && (value.blocked === 0 || value.blocked === 401 || value.blocked === 403) &&
                    Number.isInteger(value.status) && (!value.serverUntil || isStorageTimestamp(value.serverUntil)) && typeof value.revision === 'string') {
                    if (requestPolicyUnsaved) {
                        value = Object.assign({}, value, {
                            until: Math.max(value.until, requestPolicyCache.until),
                            serverUntil: Math.max(value.serverUntil || 0, requestPolicyCache.serverUntil || 0),
                            failures: Math.max(value.failures, requestPolicyCache.failures),
                            blocked: requestPolicyCache.blocked || value.blocked,
                            status: requestPolicyCache.until >= value.until ? requestPolicyCache.status : value.status,
                            revision: requestPolicyCache.revision
                        });
                    }
                    requestPolicyCache = value;
                }
            }
        } catch (error) { /* Retain the in-memory restriction if storage cannot be read. */ }
        return requestPolicyCache;
    }

    function writeRequestPolicy(policy) {
        policy.revision = makeStorageId(); requestPolicyCache = policy;
        requestPolicyUnsaved = true;
        try { GM_setValue(REQUEST_POLICY_KEY, JSON.stringify(policy)); requestPolicyUnsaved = false; }
        catch (error) { log('Request restriction is local to this tab: ' + error.message); }
    }

    function retryAfterTime(value, now) {
        if (typeof value !== 'string' || !value.trim()) return 0;
        value = value.trim();
        if (/^\d+$/.test(value)) {
            var until = now + Number(value) * 1000;
            return Number.isSafeInteger(until) && until <= 8640000000000000 ? until : 0;
        }
        var parsed = Date.parse(value);
        return Number.isFinite(parsed) && parsed > now ? parsed : 0;
    }

    function recordRequestFailure(error) {
        var old = readRequestPolicy();
        var failures = Math.min(20, old.failures + 1);
        var status = error.status || 0;
        var delay = Math.min(900000, Math.max(60000, scanIntervalSeconds * 1000) * Math.pow(2, failures - 1));
        var policy = { until: Math.max(old.until, Date.now() + delay, error.retryAt || 0), failures: failures,
            blocked: status === 401 || status === 403 ? status : old.blocked, status: status,
            serverUntil: Math.max(old.serverUntil || 0, error.retryAt || 0, status === 429 ? Date.now() + delay : 0), revision: '' };
        writeRequestPolicy(policy);
        return policy;
    }

    function clearRequestFailures(revision) {
        var current = readRequestPolicy();
        // An older in-flight request must not undo a newer restriction from another tab.
        if (current.revision !== revision || current.blocked || !current.failures) return;
        requestPolicyCache = { until: 0, failures: 0, blocked: 0, status: 0, revision: '' };
        requestPolicyUnsaved = false;
        try { GM_deleteValue(REQUEST_POLICY_KEY); } catch (error) { /* Retrying later is safe. */ }
    }

    function requestPolicyMessage(policy) {
        if (policy.blocked) return 'Access denied (' + policy.blocked + ')';
        var seconds = Math.max(0, Math.ceil((policy.until - Date.now()) / 1000));
        if (!seconds) return '';
        return (policy.status === 429 ? 'Rate limited · ' : 'Retry in ') +
            (seconds >= 60 ? Math.ceil(seconds / 60) + 'm' : seconds + 's');
    }

    function pauseForAccessRestriction() {
        if (isAutoRefreshOn) toggleAutoRefresh();
        else pauseTrackingTimer();
    }

    function parseGetChatUserListResponse(text) {
        if (typeof text !== 'string' || !text.trim()) throw new Error('Empty API response');
        var parts = text.trim().split(',');
        if (!/^\d+$/.test(parts[0])) throw new Error('Invalid API anonymous count');
        var anonymousCount = Number(parts[0]);
        if (!Number.isSafeInteger(anonymousCount)) throw new Error('Unsafe API anonymous count');
        var classTiers = { m: 'red', f: 'green', l: 'purple', p: 'pink', tr: 'dark-blue', t: 'light-blue', g: 'gray' };
        var genders = { m: 'male', f: 'female', s: 'trans', c: 'couple' };
        var seen = new Set();
        var parsedUsers = [];
        var unknownClasses = Object.create(null);
        var unknownGenders = Object.create(null);
        for (var i = 1; i < parts.length; i++) {
            var fields = parts[i].split('|');
            if (fields.length !== 4 || !/^[A-Za-z0-9_-]{2,30}$/.test(fields[0]) ||
                fields.slice(1).some(function(field) { return !/^[^\s|,<>\x00-\x1f]+$/.test(field); })) {
                throw new Error('Malformed API record at index ' + i);
            }
            var username = fields[0];
            var key = username.toLowerCase();
            if (seen.has(key)) throw new Error('Duplicate API username at index ' + i);
            seen.add(key);
            var rawClass = fields[1];
            var genderCode = fields[2];
            var isOwner = rawClass === 'o';
            var tier = Object.prototype.hasOwnProperty.call(classTiers, rawClass) ? classTiers[rawClass] : null;
            var gender = Object.prototype.hasOwnProperty.call(genders, genderCode) ? genders[genderCode] : 'unknown';
            if (!tier && !isOwner) unknownClasses[rawClass] = (unknownClasses[rawClass] || 0) + 1;
            if (gender === 'unknown') unknownGenders[genderCode] = (unknownGenders[genderCode] || 0) + 1;
            parsedUsers.push({ username: username, rawClass: rawClass, tier: tier,
                genderCode: genderCode, gender: gender, rawFlag: fields[3], isOwner: isOwner });
        }
        var registeredCount = parsedUsers.length;
        var totalUsers = anonymousCount + registeredCount;
        if (!Number.isSafeInteger(totalUsers)) throw new Error('Unsafe API total users');
        return { anonymousCount: anonymousCount, registeredCount: registeredCount,
            totalUsers: totalUsers, users: parsedUsers,
            diagnostics: { unknownClasses: unknownClasses, unknownGenders: unknownGenders } };
    }

    function isAcquisitionCurrent(context) {
        return context.epoch === scanEpoch && context.generation === initGuard &&
            context.url === location.href;
    }

    function validateRoomSnapshot(snapshot) {
        if (!snapshot || !Number.isSafeInteger(snapshot.roomTotal) || snapshot.roomTotal < 0 ||
            !Array.isArray(snapshot.users)) throw new Error('Invalid room snapshot');
        if (snapshot.source === 'API' &&
            (!Number.isSafeInteger(snapshot.anonymousCount) || snapshot.anonymousCount < 0 ||
             snapshot.registeredCount !== snapshot.users.length ||
             snapshot.totalUsers !== snapshot.anonymousCount + snapshot.registeredCount ||
             snapshot.roomTotal !== snapshot.totalUsers)) {
            throw new Error('Inconsistent API anonymous, registered, or total user counts');
        }
        if (!isScanValid(snapshot.users.length, snapshot.roomTotal)) {
            throw new Error('Sample rejected by 3.0.0 scan-validity checks');
        }
    }

    async function acquireAPISnapshot(context) {
        if (!context.room || context.room === 'unknown') throw new Error('No current room username');
        var url = new URL('/api/getchatuserlist/', location.origin);
        url.searchParams.set('roomname', context.room);
        url.searchParams.set('private', 'false');
        url.searchParams.set('sort_by', 'a');
        url.searchParams.set('exclude_staff', 'false');
        var controller = new AbortController();
        var timeout;
        try {
            var text = await Promise.race([
                (async function() {
                    var response = await fetch(url.href, { method: 'GET', credentials: 'same-origin',
                        mode: 'same-origin', cache: 'no-store', redirect: 'error', signal: controller.signal });
                    if (!response.ok) {
                        var error = new Error('API HTTP ' + response.status);
                        error.status = response.status;
                        error.retryAt = retryAfterTime(response.headers && response.headers.get('Retry-After'), Date.now());
                        throw error;
                    }
                    return response.text();
                })(),
                new Promise(function(resolve, reject) {
                    timeout = setTimeout(function() {
                        reject(new Error('API request timed out after ' + API_TIMEOUT_MS + ' ms'));
                        controller.abort();
                    }, API_TIMEOUT_MS);
                })
            ]);
            var snapshot = parseGetChatUserListResponse(text);
            snapshot.roomTotal = snapshot.totalUsers;
            snapshot.source = 'API';
            snapshot.timestamp = Date.now();
            return snapshot;
        } finally {
            clearTimeout(timeout);
        }
    }

    async function acquireDOMSnapshot(context, returnToChat) {
        var usersTab = findTab('users');
        var chatTab = findTab('chat');
        if (!usersTab) throw new Error('USERS tab not found');
        var openedUsers = false;
        try {
            usersTab.click();
            openedUsers = true;
            await new Promise(function(resolve) { setTimeout(resolve, 800); });
            if (!isAcquisitionCurrent(context)) return null;
            return scanUsers();
        } finally {
            if (openedUsers && isAcquisitionCurrent(context) && returnToChat && chatTab) {
                try { chatTab.click(); }
                catch (err) { log('DOM fallback could not return to CHAT: ' + err.message); }
            }
        }
    }

    function getDOMFallbackWaitSeconds(modelName) {
        var readyAt = domFallbackReadyAtByRoom.get(modelName.toLowerCase()) || 0;
        return Math.max(0, Math.ceil((readyAt - Date.now()) / 1000));
    }

    async function acquireRoomSnapshot(context, returnToChat) {
        lastAcquisitionAttemptSource = 'API';
        try {
            var snapshot = await acquireAPISnapshot(context);
            if (!isAcquisitionCurrent(context)) return null;
            validateRoomSnapshot(snapshot);
            domHealthStatus.consecutiveFailures = 0;
            clearRequestFailures(context.policyRevision);
            return snapshot;
        } catch (err) {
            if (!isAcquisitionCurrent(context)) return null;
            console.warn('[TierScope ' + TIERSCOPE_VERSION + '] API failed: ' + err.message);
            var policy = recordRequestFailure(err);
            if (policy.blocked) { pauseForAccessRestriction(); return null; }
            // Do not switch acquisition routes around a rate limit or explicit server wait.
            if (err.status === 429 || err.retryAt > Date.now()) return null;
        }
        lastAcquisitionAttemptSource = 'DOM';
        var fallbackWait = getDOMFallbackWaitSeconds(context.room);
        if (fallbackWait > 0) {
            log('DOM fallback deferred for ' + fallbackWait + 's; retaining previous valid data (no history point)');
            return null;
        }
        var roomKey = context.room.toLowerCase();
        var fallbackIntervalMs = Math.max(DOM_FALLBACK_INTERVAL_SECONDS, scanIntervalSeconds) * 1000;
        domFallbackReadyAtByRoom.set(roomKey, Date.now() + fallbackIntervalMs);
        log('Attempting DOM fallback; room=' + context.room);
        try {
            var fallback = await acquireDOMSnapshot(context, returnToChat);
            if (!isAcquisitionCurrent(context)) return null;
            validateRoomSnapshot(fallback);
            log('DOM fallback succeeded; room=' + context.room + ' records=' + fallback.users.length);
            return fallback;
        } catch (err) {
            if (!isAcquisitionCurrent(context)) return null;
            console.warn('[TierScope ' + TIERSCOPE_VERSION + '] DOM fallback failed: ' + err.message +
                '; retaining previous valid data (no history point)');
            return null;
        } finally {
            domFallbackReadyAtByRoom.set(roomKey, Math.max(domFallbackReadyAtByRoom.get(roomKey) || 0,
                Date.now() + fallbackIntervalMs));
        }
    }

    function acceptRoomSnapshot(snapshot, modelName) {
        restoredDisplayFrame = null;
        users = new Map(snapshot.users.map(function(user) { return [user.username, user]; }));
        roomTotal = snapshot.roomTotal;
        lastAcceptedAcquisition = { source: snapshot.source, timestamp: snapshot.timestamp, api: null };
        if (snapshot.source === 'API') {
            var owners = snapshot.users.filter(function(user) { return user.isOwner; });
            var tierSum = snapshot.users.filter(function(user) { return user.tier !== null; }).length;
            var unknownClasses = snapshot.diagnostics.unknownClasses;
            var unknownGenders = snapshot.diagnostics.unknownGenders;
            lastAcceptedAcquisition.api = { anonymousCount: snapshot.anonymousCount,
                registeredCount: snapshot.registeredCount, totalUsers: snapshot.totalUsers, ownerCount: owners.length };
            return {
                room: modelName, anonymousCount: snapshot.anonymousCount,
                registeredCount: snapshot.registeredCount, totalUsers: snapshot.totalUsers,
                ownerCount: owners.length,
                unknownClasses: Object.values(unknownClasses).reduce(function(a, b) { return a + b; }, 0),
                unknownGenders: Object.values(unknownGenders).reduce(function(a, b) { return a + b; }, 0),
                unknownClassCodes: unknownClasses, unknownGenderCodes: unknownGenders,
                viewerTierSum: tierSum, registeredMinusTierSum: users.size - tierSum,
                viewerTierGapExplanation: 'Owner and unknown-class records count toward Registered, outside the seven viewer tiers',
                timestamp: new Date(snapshot.timestamp).toISOString()
            };
        }
        return null;
    }

    function updateAcquisitionStatus() {
        updateMiniFreshness();
        var el = document.getElementById('acquisition-status');
        if (!el) return;
        if (sessionStorageNotice) {
            el.textContent = 'Local only • room reset';
            el.title = sessionStorageNotice;
            return;
        }
        var policyMessage = requestPolicyMessage(readRequestPolicy());
        if (policyMessage) {
            var sample = lastAcceptedAcquisition || restoredDisplayFrame;
            el.textContent = policyMessage;
            el.title = policyMessage + (sample ? '. Last sample: ' + new Date(sample.timestamp).toISOString() : '. No accepted sample.');
            return;
        }
        if (!lastAcceptedAcquisition) {
            if (restoredDisplayFrame) {
                el.textContent = 'Saved • ' + formatSampleAge(restoredDisplayFrame.timestamp);
                el.title = 'Saved sample recorded at: ' + new Date(restoredDisplayFrame.timestamp).toISOString() +
                    '. Age is measured from the sample time, not the session save time.' +
                    ' Waiting for the first fresh sample since restore.';
            } else {
                el.textContent = 'No sample';
                el.title = 'No accepted sample in this page session';
            }
            return;
        }
        el.textContent = lastAcceptedAcquisition.source + ' • ' + formatSampleAge(lastAcceptedAcquisition.timestamp);
        el.title = 'Last accepted sample: ' + new Date(lastAcceptedAcquisition.timestamp).toISOString() +
            '. TierScope and the USERS tab refresh independently.';
    }

    async function performScanThenReturn(returnToChat) {
        if (typeof returnToChat === 'undefined') returnToChat = true;
        if (isScanning) return;
        var policy = readRequestPolicy();
        if (policy.blocked) { pauseForAccessRestriction(); updateCountdownDisplay(); return; }
        if (policy.until > Date.now()) { updateCountdownDisplay(); return; }
        isScanning = true;
        var context = { epoch: ++scanEpoch, generation: initGuard, url: location.href, room: getModelName(), policyRevision: policy.revision };
        var priorState = null;
        var statusEl = document.getElementById('auto-status');
        updateCountdownDisplay();
        try {
            var snapshot = await acquireRoomSnapshot(context, returnToChat);
            if (!isAcquisitionCurrent(context)) return;
            if (!snapshot) {
                pendingHistoryGap = true;
                if (statusEl) {
                    statusEl.textContent = 'Scan skipped (unreliable)';
                    statusEl.style.color = 'var(--panel-negative)';
                }
                return;
            }
            priorState = {
                users: users, roomTotal: roomTotal, previousUserCount: previousUserCount,
                previousRoomTotal: previousRoomTotal, previousCounts: previousCounts,
                hasTrendBaseline: hasTrendBaseline, lastAcceptedAcquisition: lastAcceptedAcquisition,
                restoredDisplayFrame: restoredDisplayFrame, pendingHistoryGap: pendingHistoryGap,
                trendHTML: (document.getElementById('trend-container') || {}).innerHTML,
                trendHeaderText: (document.getElementById('trend-header-label') || {}).textContent,
                history: Object.fromEntries(Object.keys(history).map(function(key) { return [key, history[key].slice()]; })),
                roomTotalHigh: roomTotalHigh, roomTotalHighTime: roomTotalHighTime,
                tierHighTimes: Object.fromEntries(Object.entries(tierHighTimes)),
                withTokensHighTime: withTokensHighTime, totalHighTime: totalHighTime,
                anonHighTime: anonHighTime, femaleTransHighTime: femaleTransHighTime,
                sessionStartedAt: sessionStartedAt,
                sessionHighs: Object.fromEntries(Object.entries(sessionHighs).map(function(entry) { return [entry[0], Object.assign({}, entry[1])]; })),
                newHighTiers: Object.fromEntries(Object.entries(newHighTiers))
            };
            var diagnostics = acceptRoomSnapshot(snapshot, context.room);
            var counts = { 'red': 0, 'green': 0, 'purple': 0, 'pink': 0, 'dark-blue': 0, 'light-blue': 0, 'gray': 0, 'female-trans': 0 };
            users.forEach(function(data) {
                if (counts[data.tier] !== undefined) counts[data.tier]++;
                if (data.gender === 'female' || data.gender === 'trans') {
                    counts['female-trans']++;
                }
            });
            var total = users.size;
            var withTokens = counts['red'] + counts['green'] + counts['purple'] + counts['pink'] + counts['dark-blue'] + counts['light-blue'];
            var anonymousCount = getAnonymousCount();
            previousUserCount = total;
            previousRoomTotal = roomTotal;
            var currentRoomTotal = roomTotal > 0 ? roomTotal : (total + anonymousCount);
            if (currentRoomTotal > roomTotalHigh) {
                roomTotalHigh = currentRoomTotal;
                roomTotalHighTime = Date.now();
            }
            saveToHistory();
            hasTrendBaseline = true;
            updateDisplay();
            updateTrendDisplay();
            previousCounts = {
                'red': counts['red'] || 0,
                'green': counts['green'] || 0,
                'purple': counts['purple'] || 0,
                'pink': counts['pink'] || 0,
                'dark-blue': counts['dark-blue'] || 0,
                'light-blue': counts['light-blue'] || 0,
                'gray': counts['gray'] || 0,
                'female-trans': counts['female-trans'] || 0,
                'withTokens': withTokens || 0,
                'total': total || 0,
                'anonymous': anonymousCount || 0
            };
            updateAcquisitionStatus();
            saveSession(context.room);
            pulseAcceptedHighs(priorState);
            if (diagnostics) console.log('[TierScope ' + TIERSCOPE_VERSION + '] API scan accepted', diagnostics);
        } catch (err) {
            if (priorState) {
                users = priorState.users;
                roomTotal = priorState.roomTotal;
                previousUserCount = priorState.previousUserCount;
                previousRoomTotal = priorState.previousRoomTotal;
                previousCounts = priorState.previousCounts;
                hasTrendBaseline = priorState.hasTrendBaseline;
                lastAcceptedAcquisition = priorState.lastAcceptedAcquisition;
                restoredDisplayFrame = priorState.restoredDisplayFrame;
                history = priorState.history;
                pendingHistoryGap = priorState.pendingHistoryGap;
                roomTotalHigh = priorState.roomTotalHigh;
                roomTotalHighTime = priorState.roomTotalHighTime;
                tierHighTimes = priorState.tierHighTimes;
                withTokensHighTime = priorState.withTokensHighTime;
                totalHighTime = priorState.totalHighTime;
                anonHighTime = priorState.anonHighTime;
                femaleTransHighTime = priorState.femaleTransHighTime;
                sessionStartedAt = priorState.sessionStartedAt;
                sessionHighs = priorState.sessionHighs;
                newHighTiers = priorState.newHighTiers || {};
                try {
                    var trendEl = document.getElementById('trend-container');
                    if (trendEl && typeof priorState.trendHTML === 'string') trendEl.innerHTML = priorState.trendHTML;
                    var trendHeader = document.getElementById('trend-header-label');
                    if (trendHeader && typeof priorState.trendHeaderText === 'string') trendHeader.textContent = priorState.trendHeaderText;
                    updateDisplay();
                    updateAcquisitionStatus();
                    if (!isMinimized) drawAllSparklines();
                }
                catch (displayError) { log('Could not repaint previous data: ' + displayError.message); }
            }
            pendingHistoryGap = true;
            log('Error during scan; retaining previous valid data: ' + err.message);
        } finally {
            if (isAcquisitionCurrent(context)) {
                isScanning = false;
                resetCountdown();
                updateAcquisitionStatus();
            }
        }
    }

    function getComparisonCounts() {
        if (trendComparisonMode === 'last') {
            if (history.timestamps.length < 2) {
                return { counts: null, short: false, actualMinutes: 0 };
            }
            var lastIdx = history.timestamps.length - 2;
            var actualMinutes = Math.round((Date.now() - history.timestamps[lastIdx]) / 60000);
            return {
                counts: {
                    'red': history['red'][lastIdx] || 0,
                    'green': history['green'][lastIdx] || 0,
                    'purple': history['purple'][lastIdx] || 0,
                    'pink': history['pink'][lastIdx] || 0,
                    'dark-blue': history['dark-blue'][lastIdx] || 0,
                    'light-blue': history['light-blue'][lastIdx] || 0,
                    'gray': history['gray'][lastIdx] || 0,
                    'female-trans': history['female-trans'][lastIdx] || 0,
                    'withTokens': history['withTokens'][lastIdx] || 0,
                    'total': history['total'][lastIdx] || 0,
                    'anonymous': history['anonymous'][lastIdx] || 0
                },
                short: false,
                actualMinutes: actualMinutes
            };
        }
        if (trendComparisonMode === 'start') {
            if (history.timestamps.length === 0) {
                return {
                    counts: {
                        'red': 0, 'green': 0, 'purple': 0, 'pink': 0,
                        'dark-blue': 0, 'light-blue': 0, 'gray': 0, 'female-trans': 0,
                        'withTokens': 0, 'total': 0, 'anonymous': 0
                    },
                    short: false,
                    actualMinutes: 0
                };
            }
            var startMinutes = Math.round((Date.now() - history.timestamps[0]) / 60000);
            return {
                counts: {
                    'red': history['red'][0] || 0,
                    'green': history['green'][0] || 0,
                    'purple': history['purple'][0] || 0,
                    'pink': history['pink'][0] || 0,
                    'dark-blue': history['dark-blue'][0] || 0,
                    'light-blue': history['light-blue'][0] || 0,
                    'gray': history['gray'][0] || 0,
                    'female-trans': history['female-trans'][0] || 0,
                    'withTokens': history['withTokens'][0] || 0,
                    'total': history['total'][0] || 0,
                    'anonymous': history['anonymous'][0] || 0
                },
                short: false,
                actualMinutes: startMinutes
            };
        }
        var preset = TREND_PRESETS[trendComparisonMode];
        if (!preset || preset.ms <= 0) return { counts: previousCounts, short: false, actualMinutes: 0 };
        var targetTime = Date.now() - preset.ms;
        var idx = -1;
        for (var i = 0; i < history.timestamps.length; i++) {
            if (history.timestamps[i] <= targetTime) {
                idx = i;
            } else {
                break;
            }
        }
        var short = idx === -1;
        if (short) idx = 0;
        if (idx === -1 || history.timestamps.length === 0) {
            return { counts: previousCounts, short: false, actualMinutes: 0 };
        }
        var actualMs = Date.now() - history.timestamps[idx];
        var actualMinutes = Math.round(actualMs / 60000);
        return {
            counts: {
                'red': history['red'][idx] || 0,
                'green': history['green'][idx] || 0,
                'purple': history['purple'][idx] || 0,
                'pink': history['pink'][idx] || 0,
                'dark-blue': history['dark-blue'][idx] || 0,
                'light-blue': history['light-blue'][idx] || 0,
                'gray': history['gray'][idx] || 0,
                'female-trans': history['female-trans'][idx] || 0,
                'withTokens': history['withTokens'][idx] || 0,
                'total': history['total'][idx] || 0,
                'anonymous': history['anonymous'][idx] || 0
            },
            short: short,
            actualMinutes: actualMinutes
        };
    }

    function setTrendComparisonMode(mode) {
        if (!TREND_PRESETS[mode] && mode !== 'last') return;
        trendComparisonMode = mode;
        updateTrendDisplay();
        updateTrendPresetButtons();
        saveSession(getModelName());
    }

    function updateTrendPresetButtons() {
        var buttons = document.querySelectorAll('.trend-preset-btn');
        buttons.forEach(function(btn) {
            var mode = btn.dataset.mode;
            if (mode === trendComparisonMode) {
                btn.style.background = '#4169E1';
                btn.style.color = '#fff';
                btn.style.borderColor = '#4169E1';
            } else {
                btn.style.background = 'var(--panel-button)';
                btn.style.color = 'var(--panel-muted)';
                btn.style.borderColor = 'var(--panel-divider)';
            }
        });
    }

    function updateTrendDisplay() {
        if (presentationMode === 'PLAYBACK') return;
        var trendContainer = document.getElementById('trend-container');
        var trendHeaderLabel = document.getElementById('trend-header-label');
        if (!trendContainer) return;
        if (restoredDisplayFrame) {
            trendContainer.innerHTML = '<div style="font-size:8px;color:var(--panel-muted);text-align:center;padding:8px;">Saved snapshot — trends resume after a new sample.</div>';
            if (trendHeaderLabel) trendHeaderLabel.textContent = '📈 TREND';
            return;
        }
        if (!hasTrendBaseline) {
            trendContainer.innerHTML = '<div style="font-size:8px;color:var(--panel-faint);text-align:center;padding:8px;">Waiting for scan...</div>';
            if (trendHeaderLabel) trendHeaderLabel.textContent = '📈 TREND';
            return;
        }
        var counts = { 'red': 0, 'green': 0, 'purple': 0, 'pink': 0, 'dark-blue': 0, 'light-blue': 0, 'gray': 0, 'female-trans': 0 };
        users.forEach(function(data) {
            if (counts[data.tier] !== undefined) counts[data.tier]++;
            if (data.gender === 'female' || data.gender === 'trans') {
                counts['female-trans']++;
            }
        });
        var total = users.size;
        var withTokens = counts['red'] + counts['green'] + counts['purple'] + counts['pink'] + counts['dark-blue'] + counts['light-blue'];
        var anonymousCount = getAnonymousCount();
        var comparison = getComparisonCounts();
        var comparisonCounts = comparison.counts;
        var shortSession = comparison.short;
        var actualMinutes = comparison.actualMinutes;
        if (!comparisonCounts) {
            var waitingText = history.timestamps.length === 1 ? 'Waiting for second scan...' : 'Waiting for scan...';
            trendContainer.innerHTML = '<div style="font-size:8px;color:var(--panel-faint);text-align:center;padding:8px;">' + waitingText + '</div>';
            if (trendHeaderLabel) trendHeaderLabel.textContent = '📈 TREND';
            return;
        }
        var getShortLabel = function() {
            if (!shortSession || actualMinutes <= 0) return '';
            if (actualMinutes < 60) return ' vs ' + actualMinutes + 'm';
            var hours = Math.floor(actualMinutes / 60);
            var mins = actualMinutes % 60;
            return ' vs ' + hours + 'h' + (mins > 0 ? mins : '');
        };
        // UPDATED: Removed arrows/dots, using color-coded backgrounds only
        function buildTrendItem(name, current, prev, isSpecial, isLarge) {
            var diff = current - prev;
            var deltaText = diff !== 0 ? (diff > 0 ? '+' + diff : diff) : '';
            var deltaColor = diff > 0 ? 'var(--panel-positive)' : 'var(--panel-negative)';
            // Color-coded background based on delta direction
            var bgStyle;
            if (diff > 0) {
                bgStyle = 'background:rgba(50, 205, 50, 0.22);';  // Green for positive
            } else if (diff < 0) {
                bgStyle = 'background:rgba(255, 85, 85, 0.15);';   // Red for negative
            } else {
                bgStyle = 'background:rgba(255, 215, 0, 0.15);';   // Yellow for stable
            }
            if (isSpecial) bgStyle += 'border:1px solid #ff69b4;';
            var padding = isLarge ? '6px 12px' : '2px 6px';
            var fontSize = isLarge ? '12px' : '10px';
            var deltaFont = fontSize;
            if (deltaText) {
                var dlen = String(Math.abs(diff)).length;
                if (dlen >= 4) deltaFont = '8px';
                else if (dlen === 3) deltaFont = '10px';
            }
            // Removed the trendIcon span - only colors indicate direction now
            return '<div style="display:flex;align-items:center;gap:4px;' + bgStyle + 'padding:' + padding + ';border-radius:4px;">' +
                '<span style="font-size:' + fontSize + ';">' + name + '</span>' +
                (deltaText ? '<span style="font-size:' + deltaFont + ';font-weight:bold;color:' + deltaColor + ';">' + deltaText + '</span>' : '') +
                '</div>';
        }
        var headerLabel = '📈 TREND';
        var shortLabel = getShortLabel();
        var html = '<div style="display:flex;justify-content:center;gap:6px;padding:4px 0;">';
        html += buildTrendItem(getTierMarker('red'), counts['red'] || 0, comparisonCounts['red'] || 0, false, false);
        html += buildTrendItem(getTierMarker('green'), counts['green'] || 0, comparisonCounts['green'] || 0, false, false);
        html += buildTrendItem(getTierMarker('purple'), counts['purple'] || 0, comparisonCounts['purple'] || 0, false, false);
        html += buildTrendItem(getTierMarker('pink'), counts['pink'] || 0, comparisonCounts['pink'] || 0, false, false);
        html += '</div>';
        html += '<div style="display:flex;justify-content:center;gap:6px;padding:4px 0;">';
        html += buildTrendItem(getTierMarker('dark-blue'), counts['dark-blue'] || 0, comparisonCounts['dark-blue'] || 0, false, false);
        html += buildTrendItem(getTierMarker('light-blue'), counts['light-blue'] || 0, comparisonCounts['light-blue'] || 0, false, false);
        html += buildTrendItem(getTierMarker('gray'), counts['gray'] || 0, comparisonCounts['gray'] || 0, false, false);
        html += buildTrendItem(getTierMarker('female-trans'), counts['female-trans'] || 0, comparisonCounts['female-trans'] || 0, false, false);
        html += '</div>';
        html += '<div style="display:flex;justify-content:center;gap:8px;padding:4px 0;">';
        html += buildTrendItem('💎', withTokens || 0, comparisonCounts.withTokens || 0, true, true);
        html += buildTrendItem('📊', total || 0, comparisonCounts.total || 0, false, true);
        html += buildTrendItem('👻', anonymousCount || 0, comparisonCounts.anonymous || 0, false, true);
        html += '</div>';
        trendContainer.innerHTML = html;
        if (trendHeaderLabel) {
            trendHeaderLabel.textContent = headerLabel + shortLabel;
        }
    }

    function saveToHistory() {
        var counts = { 'red': 0, 'green': 0, 'purple': 0, 'pink': 0, 'dark-blue': 0, 'light-blue': 0, 'gray': 0, 'female-trans': 0 };
        users.forEach(function(data) {
            if (counts[data.tier] !== undefined) counts[data.tier]++;
            if (data.gender === 'female' || data.gender === 'trans') {
                counts['female-trans']++;
            }
        });
        var total = users.size;
        var withTokens = counts['red'] + counts['green'] + counts['purple'] + counts['pink'] + counts['dark-blue'] + counts['light-blue'];
        var anonymousCount = getAnonymousCount();
        var now = Date.now();
        
        if (sessionStartedAt === null) sessionStartedAt = now;
        var sample = Object.assign({}, counts, { withTokens: withTokens, total: total, anonymous: anonymousCount });
        STORAGE_HISTORY_SERIES.forEach(function(key) {
            var previous = getSessionHigh(key, 0);
            var value = sample[key];
            if (value > previous.value) sessionHighs[key] = { value: value, time: now };
            else if (!sessionHighs[key]) sessionHighs[key] = previous;
            if (value > 0 && value >= sessionHighs[key].value) newHighTiers[key] = true;
            else delete newHighTiers[key];
        });
        syncHighTimes();

        if (!history.breaks || history.breaks.length !== history.timestamps.length) history.breaks = getHistoryBreaks(history).slice();
        var lastTime = history.timestamps.length ? history.timestamps[history.timestamps.length - 1] : null;
        history.breaks.push(lastTime !== null && (pendingHistoryGap || now - lastTime > scanIntervalSeconds * 2000 + API_TIMEOUT_MS));
        pendingHistoryGap = false;
        history.timestamps.push(now);
        Object.keys(counts).forEach(function(tier) {
            history[tier].push(counts[tier]);
        });
        history['withTokens'].push(withTokens);
        history['total'].push(total);
        history['anonymous'].push(anonymousCount);
        if (history.timestamps.length > MAX_HISTORY_LENGTH) {
            history.timestamps.shift();
            history.breaks.shift();
            Object.keys(counts).forEach(function(tier) { history[tier].shift(); });
            history['withTokens'].shift();
            history['total'].shift();
            history['anonymous'].shift();
        }
        if (!isMinimized) {
            drawAllSparklines();
        }
    }

    var chartTimeCache = new WeakMap();
    function getChartTimes(times) {
        var cached = chartTimeCache.get(times);
        var last = times.length ? times[times.length - 1] : 0;
        if (cached && cached.length === times.length && cached.last === last && cached.first === times[0]) return cached.axis;
        var axis = [];
        times.forEach(function(time, i) { axis.push(i ? Math.max(axis[i - 1], time) : time); });
        chartTimeCache.set(times, { length: times.length, first: times[0], last: last, axis: axis });
        return axis;
    }

    function getHistoryBreaks(data) {
        if (data.breaks && data.breaks.length === data.timestamps.length) return data.breaks;
        // Legacy records lack pause metadata. Infer only unusually long intervals.
        var times = getChartTimes(data.timestamps), intervals = [];
        for (var i = 1; i < times.length; i++) if (times[i] > times[i - 1]) intervals.push(times[i] - times[i - 1]);
        intervals.sort(function(a, b) { return a - b; });
        var typical = intervals.length ? intervals[Math.floor((intervals.length - 1) / 2)] : 60000;
        var threshold = Math.max(120000, typical * 2 + API_TIMEOUT_MS);
        return times.map(function(time, i) { return i > 0 && time - times[i - 1] > threshold; });
    }

    // Preserve first/last and extrema in each pixel column, in sample order.
    // Only drawing is reduced; tooltips, histories and exports retain every sample.
    function buildChartPlot(values, times, breaks, width, lastIndex) {
        var end = Math.min(values.length, times.length) - 1;
        if (Number.isInteger(lastIndex)) end = Math.min(end, lastIndex);
        if (end < 0) return { points: [], min: 0, max: 0, end: -1 };
        var axis = getChartTimes(times), startTime = axis[0], span = axis[end] - startTime;
        var min = Infinity, max = -Infinity, points = [], bucket = null, breakNext = true;
        function flush() {
            if (!bucket) return;
            var indices = [bucket.first, bucket.low, bucket.high, bucket.last].sort(function(a, b) { return a - b; });
            indices.forEach(function(index, j) {
                if (j && index === indices[j - 1]) return;
                points.push({ index: index, x: span ? (axis[index] - startTime) / span * width : width / 2,
                    value: values[index], move: breakNext });
                breakNext = false;
            });
            bucket = null;
        }
        for (var i = 0; i <= end; i++) {
            var value = values[i]; min = Math.min(min, value); max = Math.max(max, value);
            var column = span ? Math.floor((axis[i] - startTime) / span * width) : 0;
            if (breaks && breaks[i]) { flush(); breakNext = true; }
            if (!bucket || bucket.column !== column) {
                flush(); bucket = { column: column, first: i, last: i, low: i, high: i };
            } else {
                bucket.last = i;
                if (value < values[bucket.low]) bucket.low = i;
                if (value > values[bucket.high]) bucket.high = i;
            }
        }
        flush();
        return { points: points, min: min, max: max, end: end, startTime: startTime, endTime: axis[end] };
    }

    function hideChartTooltip() {
        var tooltip = document.getElementById('tierscope-chart-tooltip');
        if (tooltip) tooltip.style.display = 'none';
    }

    function nearestChartSample(times, end, target) {
        var low = 0, high = end + 1;
        while (low < high) { var middle = Math.floor((low + high) / 2); if (times[middle] <= target) low = middle + 1; else high = middle; }
        if (low === 0) return 0;
        if (low > end) return end;
        return target - times[low - 1] <= times[low] - target ? low - 1 : low;
    }

    function showChartTooltip(canvas, index, clientX, clientY, inGap) {
        var model = canvas._tierScopeChart;
        if (!model || model.plot.end < 0) return;
        index = Math.max(0, Math.min(model.plot.end, index));
        canvas._tierScopeIndex = index;
        var tooltip = document.getElementById('tierscope-chart-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div'); tooltip.id = 'tierscope-chart-tooltip';
            tooltip.setAttribute('role', 'tooltip');
            tooltip.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;max-width:310px;padding:7px 9px;background:var(--panel-tooltip);color:var(--panel-text);border:1px solid #a36acb;border-radius:5px;font:12px/1.5 Arial,sans-serif;white-space:pre-line;box-shadow:0 3px 12px #0008;';
            document.body.appendChild(tooltip);
        }
        setThemeVariables(tooltip);
        tooltip.textContent = model.label + ' · ' + model.values[index].toLocaleString() + '\n' +
            new Date(model.times[index]).toLocaleString() + '\n' +
            'Range: ' + model.plot.min.toLocaleString() + '–' + model.plot.max.toLocaleString() +
            ' · Sample ' + (index + 1) + '/' + (model.plot.end + 1) +
            (inGap ? '\nNo samples in this gap; showing nearest sample.' : '');
        tooltip.style.display = 'block';
        var rect = tooltip.getBoundingClientRect();
        tooltip.style.left = Math.max(4, Math.min(clientX + 12, window.innerWidth - rect.width - 4)) + 'px';
        tooltip.style.top = Math.max(4, Math.min(clientY + 12, window.innerHeight - rect.height - 4)) + 'px';
    }

    function bindChartInspection(canvas, model) {
        canvas._tierScopeChart = model;
        canvas.setAttribute('tabindex', '0'); canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-describedby', 'tierscope-chart-tooltip');
        canvas.setAttribute('aria-label', model.label + ' history. ' + (model.plot.end < 0 ? 'No samples.' :
            'Range ' + model.plot.min + ' to ' + model.plot.max + '. ' + (model.plot.end + 1) + ' samples. Use Left and Right arrows to inspect samples; Home and End to jump; Escape to close.'));
        if (canvas._tierScopeBound) return;
        canvas._tierScopeBound = true;
        canvas.addEventListener('pointermove', function(event) {
            var m = canvas._tierScopeChart;
            if (m.plot.end < 0) return;
            var rect = canvas.getBoundingClientRect();
            var fraction = Math.max(0, Math.min(1, ((event.clientX - rect.left) / rect.width * m.width - 2) / (m.width - 4)));
            var time = m.plot.startTime + fraction * (m.plot.endTime - m.plot.startTime);
            var axis = getChartTimes(m.times), index = nearestChartSample(axis, m.plot.end, time);
            var next = axis[index] > time ? index : index + 1;
            var gap = next > 0 && next <= m.plot.end && m.breaks[next] && time > axis[next - 1] && time < axis[next];
            showChartTooltip(canvas, index, event.clientX, event.clientY, gap);
        });
        canvas.addEventListener('pointerleave', hideChartTooltip);
        canvas.addEventListener('blur', hideChartTooltip);
        canvas.addEventListener('focus', function() {
            var rect = canvas.getBoundingClientRect();
            showChartTooltip(canvas, canvas._tierScopeChart.plot.end, rect.left + rect.width / 2, rect.top + rect.height, false);
        });
        canvas.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') { hideChartTooltip(); event.stopPropagation(); return; }
            var end = canvas._tierScopeChart.plot.end, index = canvas._tierScopeIndex === undefined ? end : canvas._tierScopeIndex;
            if (event.key === 'ArrowLeft') index--; else if (event.key === 'ArrowRight') index++;
            else if (event.key === 'Home') index = 0; else if (event.key === 'End') index = end; else return;
            event.preventDefault(); event.stopPropagation();
            var rect = canvas.getBoundingClientRect();
            showChartTooltip(canvas, index, rect.left + rect.width / 2, rect.top + rect.height, false);
        });
    }

    function drawSparkline(canvasId, data, color, customHeight, times, breaks, lastIndex, label) {
        var canvas = document.getElementById(canvasId);
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        if (!ctx) return;
        var scale = Math.max(1, (currentScale || 1) * (window.devicePixelRatio || 1));
        var height = customHeight || 28;
        canvas.style.width = '105px'; canvas.style.minWidth = '0'; canvas.style.height = height + 'px';
        var width = canvas.clientWidth || 105;
        canvas.width = Math.ceil(width * scale); canvas.height = Math.ceil(height * scale);
        ctx.scale(scale, scale); ctx.clearRect(0, 0, width, height);
        var plot = buildChartPlot(data, times, breaks, Math.max(1, width - 4), lastIndex);
        bindChartInspection(canvas, { values: data, times: times, breaks: breaks, plot: plot, width: width, label: label });
        ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath();
        plot.points.forEach(function(point, i) {
            var x = 2 + point.x;
            var y = plot.max === plot.min ? height / 2 : height - 2 - (point.value - plot.min) / (plot.max - plot.min) * (height - 4);
            if (point.move) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            if (point.move && (i === plot.points.length - 1 || plot.points[i + 1].move)) ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
        });
        ctx.stroke();
    }

    function drawAllSparklines() {
        if (presentationMode === 'PLAYBACK') return;
        drawHistorySparklines(history);
    }

    function drawHistorySparklines(displayHistory, lastIndex) {
        hideChartTooltip();
        if (rowLayoutNeedsMeasure) applyRowLayout();
        var breaks = getHistoryBreaks(displayHistory);
        PANEL_ROWS.forEach(function(row) {
            if (collapsedRows.has(row.key)) return;
            var key = row.key === 'withtokens' ? 'withTokens' : row.key === 'anon' ? 'anonymous' : row.key;
            drawSparkline('spark-' + row.key, displayHistory[key], row.key === 'total' ? themeColor('text') : row.color,
                panelChartHeights[row.key] || row.height, displayHistory.timestamps, breaks, lastIndex, row.label);
        });
    }

    function getSessionHigh(key, current) {
        var saved = sessionHighs[key];
        if (!saved) {
            var values = history[key] || [];
            var value = Math.max.apply(null, [0].concat(values));
            saved = { value: value, time: value > 0 ? history.timestamps[values.indexOf(value)] : null };
        }
        return { value: Math.max(saved.value, current || 0), time: saved.time };
    }

    function syncHighTimes() {
        Object.keys(TIERS).forEach(function(key) { tierHighTimes[key] = getSessionHigh(key, 0).time; });
        withTokensHighTime = getSessionHigh('withTokens', 0).time;
        totalHighTime = getSessionHigh('total', 0).time;
        anonHighTime = getSessionHigh('anonymous', 0).time;
        femaleTransHighTime = getSessionHigh('female-trans', 0).time;
    }

    function getDisplayHigh(frame, key, current) {
        return frame.isPlayback ? { value: Math.max(frame.highs[key] || 0, current || 0), isNew: false } : getSessionHigh(key, current);
    }

    function getHighValue(data, currentValue, timestamp) {
        var historyMax = data && data.length > 0 ? Math.max.apply(null, data) : 0;
        var newHigh = Math.max(historyMax, currentValue || 0);
        if (timestamp && newHigh > historyMax) {
            return { value: newHigh, isNew: true, time: timestamp };
        }
        return { value: newHigh, isNew: false };
    }

    function resetCountdown() {
        countdownSeconds = scanIntervalSeconds;
        nextScanAt = Math.max(Date.now() + scanIntervalSeconds * 1000, readRequestPolicy().until);
        updateCountdownDisplay();
    }

    function updateCountdownDisplay() {
        var policy = readRequestPolicy();
        if (policy.blocked && isAutoRefreshOn) pauseForAccessRestriction();
        var policyMessage = requestPolicyMessage(policy);
        if (isAutoRefreshOn && policy.until > nextScanAt) nextScanAt = policy.until;
        updateMiniFreshness();
        if (isAutoRefreshOn && !isScanning && nextScanAt) {
            countdownSeconds = Math.max(0, Math.ceil((nextScanAt - Date.now()) / 1000));
        }
        var fallbackWait = getDOMFallbackWaitSeconds(getModelName());
        var timingTitle = 'Next API attempt after the countdown. ' + (fallbackWait > 0 ?
            'DOM fallback eligible in ' + fallbackWait + 's if the API fails.' :
            'DOM fallback eligible if the API fails.');
        var statusEl = document.getElementById('auto-status');
        var timerDisplay = document.getElementById('timer-display');
        var expandedCountdown = document.getElementById('expanded-countdown');
        var controlNextScan = document.getElementById('control-next-scan');
        [statusEl, expandedCountdown, controlNextScan].forEach(function(el) {
            if (el) el.title = isAutoRefreshOn ? timingTitle :
                'Automatic scans paused. An in-flight scan may finish. ' + timingTitle;
        });
        if (timerDisplay) {
            timerDisplay.textContent = scanIntervalSeconds + 's';
        }
        if (expandedCountdown) {
            if (isScanning) {
                expandedCountdown.textContent = 'scanning...';
                expandedCountdown.style.color = 'var(--panel-warning)';
            } else if (isAutoRefreshOn) {
                expandedCountdown.textContent = 'next: ' + countdownSeconds + 's';
                expandedCountdown.style.color = 'var(--panel-positive)';
            } else {
                expandedCountdown.textContent = 'paused';
                expandedCountdown.style.color = 'var(--panel-negative)';
            }
        }
        if (controlNextScan) {
            if (isScanning) {
                controlNextScan.textContent = 'Scanning...';
                controlNextScan.style.color = 'var(--panel-warning)';
            } else if (isAutoRefreshOn) {
                controlNextScan.textContent = 'Next: ' + countdownSeconds + 's';
                controlNextScan.style.color = 'var(--panel-positive)';
            } else {
                controlNextScan.textContent = 'Paused';
                controlNextScan.style.color = 'var(--panel-negative)';
            }
        }
        if (policyMessage) {
            [statusEl, expandedCountdown, controlNextScan].forEach(function(el) {
                if (!el) return;
                el.textContent = policyMessage; el.style.color = 'var(--panel-warning)';
                el.title = policyMessage + (policy.blocked ? '. Automatic scans stopped. After resolving access, use Resume to retry.' :
                    '. No API or DOM acquisition before ' + new Date(policy.until).toLocaleString() + '.');
            });
            return;
        }
        if (!statusEl) return;
        if (isScanning) {
            statusEl.textContent = 'Scanning...';
            statusEl.style.color = 'var(--panel-warning)';
        } else if (isAutoRefreshOn) {
            statusEl.textContent = 'Next: ' + countdownSeconds + 's';
            statusEl.style.color = 'var(--panel-positive)';
        } else {
            statusEl.textContent = 'Auto: OFF';
            statusEl.style.color = 'var(--panel-negative)';
        }
    }

    function adjustTimer(delta) {
        var newValue = scanIntervalSeconds + delta;
        if (newValue < 30) scanIntervalSeconds = 30;
        else if (newValue > 300) scanIntervalSeconds = 300;
        else scanIntervalSeconds = newValue;
        if (isAutoRefreshOn) {
            stopCountdown();
            resetCountdown();
            startCountdown();
        } else {
            resetCountdown();
            var timerDisplay = document.getElementById('timer-display');
            if (timerDisplay) {
                timerDisplay.textContent = scanIntervalSeconds + 's';
            }
        }
        updateCountdownDisplay();
    }

    function startCountdown() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        if (!nextScanAt) resetCountdown();
        updateCountdownDisplay();
        countdownInterval = setInterval(function() {
            if (!isAutoRefreshOn || isScanning) return;
            updateCountdownDisplay();
            if (countdownSeconds <= 0) {
                performScanThenReturn(true);
            }
        }, 1000);
    }

    function stopCountdown() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
    }

    function cleanupDragListeners() {
        for (var i = 0; i < dragListeners.length; i++) {
            var listener = dragListeners[i];
            document.removeEventListener(listener.type, listener.fn, listener.options);
        }
        dragListeners = [];
    }

    function addDragListener(type, fn, options) {
        document.addEventListener(type, fn, options);
        dragListeners.push({ type: type, fn: fn, options: options });
    }

    function loadPanelGeometry() {
        try {
            var raw = GM_getValue(PANEL_GEOMETRY_KEY, null);
            if (raw === null) return null;
            var data = JSON.parse(raw);
            if (!data || !Number.isFinite(data.left) || !Number.isFinite(data.top) ||
                !Number.isFinite(data.scale) || data.scale < 0.5 || data.scale > 3) return null;
            return { left: data.left, top: data.top, scale: data.scale };
        } catch (error) { return null; }
    }

    function constrainPanelPosition() {
        var container = document.getElementById('tracker-container');
        if (!container) return;
        var rect = container.getBoundingClientRect();
        container.style.left = Math.max(0, Math.min(rect.left, Math.max(0, window.innerWidth - rect.width))) + 'px';
        container.style.top = Math.max(0, Math.min(rect.top, Math.max(0, window.innerHeight - rect.height))) + 'px';
        container.style.right = 'auto';
    }

    function savePanelGeometry() {
        var container = document.getElementById('tracker-container');
        if (!container) return;
        var rect = container.getBoundingClientRect();
        panelGeometry = { left: rect.left, top: rect.top, scale: currentScale };
        try { GM_setValue(PANEL_GEOMETRY_KEY, JSON.stringify(panelGeometry)); }
        catch (error) { log('Could not save panel position/scale: ' + error.message); }
    }

    function restorePanelGeometry() {
        var container = document.getElementById('tracker-container');
        if (!container) return;
        if (panelGeometry) {
            container.style.left = panelGeometry.left + 'px';
            container.style.top = panelGeometry.top + 'px';
            container.style.right = 'auto';
            applyScale(panelGeometry.scale);
        } else applyScale(currentScale);
        constrainPanelPosition();
        redrawPanelCharts();
    }

    function restoreStandardSize() {
        applyScale(1);
        redrawPanelCharts();
        constrainPanelPosition();
        savePanelGeometry();
    }

    function applyScale(scale) {
        currentScale = scale;
        var container = document.getElementById('tracker-container');
        if (!container) return;
        container.style.transform = 'scale(' + scale + ')';
        container.style.transformOrigin = 'top left';
        container.dataset.scale = scale;
    }

    function setupResizable() {
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
            if (isDragging) return;
            isResizing = true;
            resizeStartX = e.clientX;
            resizeStartY = e.clientY;
            var rect = container.getBoundingClientRect();
            resizeStartWidth = rect.width;
            resizeStartHeight = rect.height;
            e.preventDefault();
            e.stopPropagation();
        };
        var doResize = function(e) {
            if (!isResizing) return;
            var deltaX = resizeStartX - e.clientX;
            var deltaY = resizeStartY - e.clientY;
            var newWidth = resizeStartWidth + deltaX;
            var baseWidth = container.offsetWidth;
            var newScale = Math.max(0.5, Math.min(3.0, newWidth / baseWidth));
            applyScale(newScale);
        };
        var stopResize = function() {
            if (!isResizing) return;
            isResizing = false;
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

    function setupResizeHandler() {
        if (windowResizeHandler) {
            window.removeEventListener('resize', windowResizeHandler);
            windowResizeHandler = null;
        }
        var resizeTimeout;
        windowResizeHandler = function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function() {
                constrainPanelPosition();
                redrawPanelCharts();
            }, 100);
        };
        window.addEventListener('resize', windowResizeHandler);
    }

    var panelBackgroundPercent = 95;

    function updateContainerOpacity(value) {
        var numeric = Number(value);
        if (!Number.isFinite(numeric)) return;
        panelBackgroundPercent = Math.max(30, Math.min(100, numeric));
        var container = document.getElementById('tracker-container');
        if (!container) return;
        container.style.backgroundColor = 'rgba(' + themeColor('rgb') + ',' + panelBackgroundPercent / 100 + ')';
        // Only standard tier fills use this variable. Green highlights retain their
        // original fixed alpha, as do summary rows, controls, text and borders.
        container.style.setProperty('--tier-background-scale', String(panelBackgroundPercent / 95));
        var slider = document.getElementById('opacity-slider');
        if (slider) {
            slider.value = String(panelBackgroundPercent);
            slider.setAttribute('aria-valuetext', panelBackgroundPercent + '% background opacity');
        }
        var label = document.getElementById('opacity-value');
        if (label) label.textContent = panelBackgroundPercent + '%';
    }

    function createPanel() {
        hideChartTooltip();
        cancelGifExport();
        leavePlayback(false);
        cleanupDragListeners();
        if (miniSettingsKeyHandler) {
            document.removeEventListener('keydown', miniSettingsKeyHandler, true);
            miniSettingsKeyHandler = null;
        }
        if (windowResizeHandler) {
            window.removeEventListener('resize', windowResizeHandler);
            windowResizeHandler = null;
        }
        if (window._trackerResizeCleanup) {
            window._trackerResizeCleanup();
            window._trackerResizeCleanup = null;
        }
        var existing = document.getElementById('cb-tier-tracker');
        if (existing) existing.remove();

        var div = document.createElement('div');
        div.id = 'cb-tier-tracker';

        var html =
            '<div id="tracker-container" style="' +
                'position:fixed;top:80px;right:20px;background:rgba(20,20,30,0.95);color:var(--panel-text);padding:5px;' +
                'border-radius:6px;font-family:Arial,sans-serif;font-size:9px;z-index:999999;width:' + BASE_WIDTH_MINI + 'px;' +
                'border:1px solid #ff69b4;transition:width 0.3s ease;cursor:default;user-select:none;' +
            '">' +
                '<div id="drag-handle" style="' +
                    'display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;' +
                    'border-bottom:1px solid #ff69b4;padding-bottom:3px;cursor:move;' +
                '">' +
                    '<span id="header-text" style="font-weight:bold;color:var(--panel-accent);font-size:10px;">USERS: 0 (H:0)</span>' +
                    '<span id="mini-room-change" style="font-size:8px;margin:0 3px;display:none;"></span>' +
                    '<div style="display:flex;align-items:center;gap:5px;">' +
                        '<button type="button" id="btn-standard-size" title="Restore standard panel size (100%)" aria-label="Restore standard panel size" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-text);border-radius:3px;cursor:pointer;font-size:8px;padding:1px 3px;">100%</button>' +
                        '<button id="btn-toggle" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-text);border-radius:3px;cursor:pointer;font-size:9px;padding:1px 4px;flex-shrink:0;">+</button>' +
                    '</div>' +
                '</div>' +

                '<div id="minimized-view" style="display:block;position:relative;">' +
                    '<div style="display:flex;align-items:center;justify-content:space-between;gap:3px;">' +
                        '<button type="button" id="mini-metric" style="background:transparent;border:0;color:var(--panel-secondary);font:inherit;cursor:pointer;padding:2px 0;" aria-label="Cycle chart metric">Room total ▾</button>' +
                        '<span id="mini-high" style="color:var(--panel-subtle);font-size:8px;"></span>' +
                    '</div>' +
                    '<canvas id="mini-chart" width="140" height="36" style="display:block;width:100%;height:36px;" role="img" aria-label="Recent audience history"></canvas>' +
                    '<div style="display:flex;justify-content:space-between;gap:4px;margin:3px 0;">' +
                        '<span title="With Tokens">💎 <span id="mini-withtokens">0</span> <span id="mini-withtokens-change"></span></span>' +
                        '<span title="Registered">📊 <span id="mini-total">0</span> <span id="mini-total-change"></span></span>' +
                    '</div>' +
                    '<div style="display:flex;align-items:center;gap:3px;">' +
                        '<span id="mini-freshness" style="flex:1;min-width:0;font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">No sample</span>' +
                        '<button type="button" id="btn-auto" style="background:var(--panel-button);border:0;color:var(--panel-text);border-radius:3px;cursor:pointer;" title="Pause or resume scans">⏸</button>' +
                        '<button type="button" id="mini-settings-toggle" style="background:var(--panel-button);border:0;color:var(--panel-text);border-radius:3px;cursor:pointer;" aria-label="Scan interval settings" aria-expanded="false" aria-controls="mini-settings">◷</button>' +
                        '<button type="button" id="btn-expand" style="background:var(--panel-button);border:0;color:var(--panel-text);border-radius:3px;font-size:9px;cursor:pointer;" title="Expand panel" aria-label="Expand panel">↗</button>' +
                    '</div>' +
                    '<div id="mini-settings" style="display:none;position:absolute;left:0;right:0;top:17px;background:var(--panel-settings);border:1px solid #ff69b4;border-radius:4px;padding:5px;z-index:2;" role="group" aria-label="Scan interval">' +
                        '<div style="display:flex;justify-content:space-between;align-items:center;font-size:9px;color:var(--panel-secondary);">Scan interval <button type="button" id="mini-settings-close" aria-label="Close scan interval settings" title="Close (Escape)" style="background:var(--panel-button);color:var(--panel-text);border:0;border-radius:3px;cursor:pointer;padding:1px 5px;font-size:13px;">×</button></div>' +
                    '<div style="display:flex;align-items:center;justify-content:center;gap:3px;margin:3px 0;padding:2px;background:rgba(var(--panel-row-rgb),0.05);border-radius:3px;">' +
                        '<button id="btn-timer-down" style="background:var(--panel-button-strong);border:none;color:var(--panel-text);border-radius:2px;cursor:pointer;font-size:9px;padding:1px 4px;font-weight:bold;">−</button>' +
                        '<span id="timer-display" style="font-size:11px;color:var(--panel-warning);font-weight:bold;min-width:28px;">60s</span>' +
                        '<button id="btn-timer-up" style="background:var(--panel-button-strong);border:none;color:var(--panel-text);border-radius:2px;cursor:pointer;font-size:9px;padding:1px 4px;font-weight:bold;">+</button>' +
                    '</div>' +

                    '<div style="display:flex;gap:2px;justify-content:center;margin-top:3px;">' +
                        '<button class="timer-preset" data-time="30" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 3px;">30s</button>' +
                        '<button class="timer-preset" data-time="60" style="background:#ff69b4;border:1px solid #ff69b4;color:#fff;border-radius:2px;cursor:pointer;font-size:7px;padding:1px 3px;">60s</button>' +
                        '<button class="timer-preset" data-time="120" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 3px;">2m</button>' +
                        '<button class="timer-preset" data-time="300" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 3px;">5m</button>' +
                    '</div>' +

                        '<div id="auto-status" style="margin-top:3px;font-size:8px;color:var(--panel-muted);">Starting...</div>' +
                    '</div>' +
                '</div>' +

                '<div id="full-view" style="display:none;">' +
                '<div id="tier-chart-region" style="display:flow-root;">' + collapsedTrayHtml();

        Object.keys(TIERS).forEach(function(key) {
            var t = TIERS[key];
            html +=
                '<div id="tier-row-' + key + '" data-tier="' + key + '" style="display:flex;align-items:center;padding:1px 3px;margin:1px 0;background:rgba(var(--panel-row-rgb),calc(0.05 * var(--tier-background-scale, 1)));border-radius:3px;border-left:3px solid ' + t.color + ';">' +
                    '<div style="width:30px;flex-shrink:0;text-align:center;">' +
                        collapseMarkerHtml(key) +
                    '</div>' +
                    '<canvas id="spark-' + key + '" width="105" height="28" style="flex:1;margin:0 4px;"></canvas>' +
                    '<div style="text-align:right;width:48px;flex-shrink:0;">' +
                        '<span id="count-' + key + '" style="font-weight:bold;color:' + t.color + ';font-size:14px;">0</span>' +
                        '<div id="high-' + key + '" style="font-size:8px;color:var(--panel-positive);margin-top:1px;">H:0</div>' +
                    '</div>' +
                '</div>';
        });

        html +=
                '<div id="summary-tier-rows" style="border-top:1px solid var(--panel-divider);margin-top:4px;padding-top:4px;">' +
                    '<div id="tier-row-withtokens" data-tier="withtokens" style="display:flex;align-items:center;padding:2px 3px;background:rgba(255,105,180,0.15);border-radius:3px;border:1px solid #ff69b4;margin-bottom:3px;">' +
                        '<div style="width:30px;flex-shrink:0;text-align:center;">' +
                            collapseMarkerHtml('withtokens') +
                        '</div>' +
                        '<canvas id="spark-withtokens" width="105" height="28" style="flex:1;margin:0 4px;"></canvas>' +
                        '<div style="text-align:right;width:48px;flex-shrink:0;">' +
                            '<span id="count-withtokens" style="font-weight:bold;color:#ff69b4;font-size:14px;">0</span>' +
                            '<span id="pct-withtokens" style="font-size:8px;color:#ff69b4;margin-left:2px;">0%</span>' +
                            '<div id="high-withtokens" style="font-size:8px;color:var(--panel-positive);margin-top:1px;">H:0</div>' +
                        '</div>' +
                    '</div>' +
                    '<div id="tier-row-total" data-tier="total" style="display:flex;align-items:center;padding:2px 3px;background:rgba(var(--panel-row-rgb),0.1);border-radius:3px;">' +
                        '<div style="width:30px;flex-shrink:0;text-align:center;">' +
                            collapseMarkerHtml('total') +
                        '</div>' +
                        '<canvas id="spark-total" width="105" height="28" style="flex:1;margin:0 4px;"></canvas>' +
                        '<div style="text-align:right;width:48px;flex-shrink:0;">' +
                            '<span id="count-total" style="font-weight:bold;color:var(--panel-text);font-size:14px;">0</span>' +
                            '<div id="high-total" style="font-size:8px;color:var(--panel-positive);margin-top:1px;">H:0</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +

                '<div id="tier-row-anon" data-tier="anonymous" style="margin-top:5px;padding:5px;background:rgba(136,136,136,0.15);border-radius:3px;border:1px solid #888;">' +
                    '<div style="display:flex;align-items:center;">' +
                        '<div style="width:30px;flex-shrink:0;text-align:center;">' +
                            collapseMarkerHtml('anon') +
                        '</div>' +
                        '<canvas id="spark-anon" width="105" height="50" style="flex:1;margin:0 4px;"></canvas>' +
                        '<div style="text-align:right;width:48px;flex-shrink:0;">' +
                            '<span id="anon-ratio-full" style="font-size:13px;font-weight:bold;color:#ff69b4;">--</span>' +
                            '<div id="high-anon" style="font-size:8px;color:var(--panel-positive);margin-top:1px;">H:0</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +

                '</div>' +
                '<div id="trend-section" style="position:relative;border-top:1px solid #4169E1;margin-top:5px;padding-top:5px;">' +
                    '<div id="live-trend">' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;flex-wrap:wrap;gap:2px;">' +
                        '<span id="trend-header-label" style="font-size:9px;font-weight:bold;color:#4169E1;">📈 TREND</span>' +
                        '<div style="display:flex;gap:2px;flex-wrap:wrap;">' +
                            '<button class="trend-preset-btn" data-mode="last" style="background:#4169E1;border:1px solid #4169E1;color:#fff;border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">Last</button>' +
                            '<button class="trend-preset-btn" data-mode="5min" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">5m</button>' +
                            '<button class="trend-preset-btn" data-mode="15min" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">15m</button>' +
                            '<button class="trend-preset-btn" data-mode="30min" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">30m</button>' +
                            '<button class="trend-preset-btn" data-mode="1hour" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">1h</button>' +
                            '<button class="trend-preset-btn" data-mode="start" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">Start</button>' +
                            '<button id="btn-trend-auto" style="background:#32CD32;border:1px solid #32CD32;color:#fff;border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;" title="Auto-escalation ON - Click to disable">AUTO</button>' +
                        '</div>' +
                    '</div>' +
                    '<div id="trend-container" style="min-height:30px;">' +
                        '<div style="font-size:8px;color:var(--panel-faint);text-align:center;padding:8px;">Waiting for scan...</div>' +
                    '</div>' +
                    '</div>' +
                    '<div id="playback-controls" style="display:none;position:absolute;top:5px;left:0;right:0;bottom:0;padding:0 2px;box-sizing:border-box;grid-template-rows:minmax(14px,1fr) 14px 12px;gap:2px;" aria-label="Playback controls">' +
                        '<div id="gif-export-controls" style="display:none;position:absolute;inset:0;z-index:1;align-items:center;justify-content:center;gap:5px;background:var(--panel-solid);border-radius:3px;padding:3px;">' +
                            '<span id="gif-export-status" role="status" style="font-size:8px;color:var(--panel-secondary);overflow-wrap:anywhere;"></span>' +
                            '<button id="btn-cancel-gif" hidden style="font-size:8px;cursor:pointer;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:2px;">Cancel</button>' +
                        '</div>' +
                        '<div style="display:flex;align-items:center;justify-content:space-between;gap:3px;">' +
                            '<strong style="font-size:9px;color:var(--panel-warning);">PLAYBACK</strong>' +
                            '<button id="playback-play" style="font-size:8px;line-height:12px;margin:0;padding:0 4px;background:#4169E1;color:white;border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;">Pause</button>' +
                            '<select id="playback-speed" aria-label="Playback speed" style="font-size:8px;height:15px;margin:0;padding:0;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select>' +
                            '<button id="btn-export-gif" style="font-size:8px;line-height:12px;margin:0;padding:0 4px;background:#ff69b4;color:white;border:1px solid #ff69b4;border-radius:2px;cursor:pointer;" title="Download this Replay as a ' + GIF_WIDTH + ' × ' + GIF_HEIGHT + ' GIF">GIF</button>' +
                            '<button id="playback-return" style="font-size:8px;line-height:12px;margin:0;padding:0 4px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;">Return to Live</button>' +
                        '</div>' +
                        '<div style="display:flex;align-items:center;gap:4px;min-width:0;">' +
                        '<button type="button" id="playback-previous" title="Previous recorded sample (pauses Replay)" aria-label="Previous recorded sample" style="flex:0 0 20px;height:14px;padding:0;font-size:9px;line-height:10px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;">|&#9664;</button>' +
                        '<input id="playback-scrubber" type="range" min="0" max="0" value="0" step="1" aria-label="Playback timeline" style="flex:1;min-width:0;width:100%;height:12px;margin:0;accent-color:var(--panel-warning);cursor:pointer;">' +
                        '<button type="button" id="playback-next" title="Next recorded sample (pauses Replay)" aria-label="Next recorded sample" style="flex:0 0 20px;height:14px;padding:0;font-size:9px;line-height:10px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;">&#9654;|</button></div>' +
                        '<div id="playback-position" style="font-size:9px;line-height:12px;text-align:center;color:var(--panel-secondary);font-family:monospace;">00:00:00 / 00:00:00</div>' +
                    '</div>' +
                '</div>' +

                '<div id="control-field" style="margin-top:5px;padding:4px;background:rgba(65,105,225,0.15);border-radius:3px;border:1px solid #4169E1;">' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
                        '<span style="font-size:9px;font-weight:bold;color:#4169E1;">🎛️ CONTROLS</span>' +
                        '<button id="btn-replay" style="font-size:8px;line-height:11px;height:13px;box-sizing:border-box;margin:0;padding:0 4px;background:var(--panel-button);color:var(--panel-warning);border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;" title="Replay recorded history">Replay</button>' +
                        '<span style="font-size:11px;color:var(--panel-positive);font-weight:bold;" id="control-next-scan">Next: 60s</span>' +
                    '</div>' +
                    '<div id="control-action-row" style="display:grid;grid-template-columns:minmax(max-content,1fr) auto minmax(0,1fr);align-items:center;gap:3px;">' +
                        '<span style="font-size:12px;color:var(--panel-warning);font-family:monospace;font-weight:bold;flex-shrink:0;" id="control-tracking-timer">00:00:00</span>' +
                        '<div id="control-action-buttons" style="display:flex;gap:3px;align-items:center;">' +
                            '<button id="btn-download-report" style="background:#4169E1;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:8px;padding:2px 4px;display:flex;align-items:center;gap:2px;" title="Download tracking report">' +
                                '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                                    '<line x1="12" y1="4" x2="12" y2="16"/>' +
                                    '<polyline points="6 10 12 16 18 10"/>' +
                                    '<line x1="4" y1="20" x2="20" y2="20"/>' +
                                '</svg>' +
                                'TXT' +
                            '</button>' +
                            '<button id="btn-download-csv" style="background:#4169E1;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:8px;padding:2px 4px;display:flex;align-items:center;gap:2px;" title="Download all retained history as CSV">' +
                                '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                                    '<line x1="12" y1="4" x2="12" y2="16"/>' +
                                    '<polyline points="6 10 12 16 18 10"/>' +
                                    '<line x1="4" y1="20" x2="20" y2="20"/>' +
                                '</svg>' +
                                'CSV' +
                            '</button>' +
                            '<button id="btn-control-auto" style="background:#32CD32;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:8px;padding:2px 4px;min-width:24px;" title="Auto-Refresh ON">⏸</button>' +
                            '<button id="btn-main-reset" style="background:#ff4444;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:8px;padding:2px 4px;display:flex;align-items:center;gap:2px;" title="Reset all tracking data">' +
                                '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                                    '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12"/>' +
                                    '<path d="M3 3v9h9"/>' +
                                '</svg>' +
                                'Reset' +
                            '</button>' +
                        '</div>' +
                        '<label id="dark-mode-control" style="justify-self:end;display:inline-flex;align-items:center;gap:2px;cursor:pointer;color:var(--panel-secondary);line-height:1;">' +
                            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 13a9 9 0 0 1-10-10 9 9 0 1 0 10 10Z"/></svg>' +
                            '<input type="checkbox" id="dark-mode-toggle" checked aria-label="Dark mode" style="appearance:auto;width:12px;height:12px;margin:0;cursor:pointer;accent-color:#4169E1;">' +
                        '</label>' +
                    '</div>' +
                '</div>' +

                '<div id="tracker-footer" style="display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:4px;margin-top:5px;min-height:14px;">' +
                    '<div id="acquisition-status" style="max-width:80px;font-size:7px;color:var(--panel-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="No accepted sample yet">No sample</div>' +
                    '<div id="background-slider-controls" style="display:flex;align-items:center;gap:3px;min-width:0;">' +
                        '<svg width="11" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--panel-warning)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0;"><path d="M9 18h6M10 22h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 4H9c0-2 0-3-1-4Z"/></svg>' +
                        '<input type="range" id="opacity-slider" min="30" max="100" value="95" aria-label="Background opacity" style="flex:1;min-width:0;width:100%;height:12px;margin:0;cursor:pointer;accent-color:#ff69b4;" title="Main and standard tier background opacity">' +
                        '<span id="opacity-value" style="font-size:8px;color:var(--panel-secondary);min-width:23px;">95%</span>' +
                    '</div>' +
                    '<div id="tierscope-logo" style="justify-self:end;display:flex;align-items:center;gap:3px;white-space:nowrap;opacity:0.6;transition:opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.6">' +
                    '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ff69b4" stroke-width="2" style="flex-shrink:0;">' +
                        '<circle cx="12" cy="12" r="10"/>' +
                        '<line x1="12" y1="2" x2="12" y2="22"/>' +
                        '<line x1="2" y1="12" x2="22" y2="12"/>' +
                    '</svg>' +
                    '<span title="TierScope ' + TIERSCOPE_VERSION + '" style="font-size:7px;font-family:\'Courier New\',monospace;font-weight:bold;color:var(--panel-accent);letter-spacing:1px;">TIERSCOPE</span>' +
                    '</div>' +
                '</div>' +
            '</div>';

        div.innerHTML = html;
        document.body.appendChild(div);
        applyPanelTheme(false);
        document.getElementById('dark-mode-toggle').addEventListener('change', function() {
            isDarkMode = this.checked;
            try { GM_setValue(PANEL_THEME_KEY, isDarkMode ? 'dark' : 'bright'); }
            catch (error) { log('Could not save theme preference'); }
            applyPanelTheme(true);
        });

        var standardSize = document.getElementById('btn-standard-size');
        if (standardSize) {
            standardSize.onmousedown = function(event) { event.stopPropagation(); };
            standardSize.onclick = function(event) { event.stopPropagation(); restoreStandardSize(); };
        }
        var btnCSV = document.getElementById('btn-download-csv');
        if (btnCSV) btnCSV.onclick = downloadTrackingCSV;
        var btnDownload = document.getElementById('btn-download-report');
        var btnMainReset = document.getElementById('btn-main-reset');
        var btnControlAuto = document.getElementById('btn-control-auto');
        var btnExportGif = document.getElementById('btn-export-gif');
        var opacitySlider = document.getElementById('opacity-slider');

        if (btnDownload) btnDownload.addEventListener('click', downloadTrackingReport);
        if (btnMainReset) btnMainReset.addEventListener('click', resetAllTracking);
        if (btnControlAuto) btnControlAuto.addEventListener('click', toggleAutoRefresh);
        if (btnExportGif) btnExportGif.addEventListener('click', generateGifFromHistory);
        document.getElementById('btn-cancel-gif').onclick = cancelGifExport;
        updateContainerOpacity(panelBackgroundPercent);
        if (opacitySlider) {
            opacitySlider.addEventListener('input', function() {
                updateContainerOpacity(this.value);
            });
        }

        bindPlaybackControls();
        bindRowControls();
        updateReplayAvailability();
        setupDraggable();
        setupResizable();
        setupResizeHandler();

        var btnToggle = document.getElementById('btn-toggle');
        var btnExpand = document.getElementById('btn-expand');
        var btnAuto = document.getElementById('btn-auto');
        var btnTimerDown = document.getElementById('btn-timer-down');
        var btnTimerUp = document.getElementById('btn-timer-up');

        var miniMetricButton = document.getElementById('mini-metric');
        if (miniMetricButton) miniMetricButton.onclick = function() {
            miniMetric = MINI_METRICS[(MINI_METRICS.indexOf(miniMetric) + 1) % MINI_METRICS.length];
            try { GM_setValue(MINI_METRIC_KEY, miniMetric); } catch (error) { log('Could not save compact chart preference'); }
            updateDisplay();
        };
        var miniSettingsButton = document.getElementById('mini-settings-toggle');
        var miniSettings = document.getElementById('mini-settings');
        if (miniSettingsButton && miniSettings) {
            var miniSettingsClose = document.getElementById('mini-settings-close');
            function closeMiniSettings() {
                miniSettings.style.display = 'none';
                miniSettingsButton.setAttribute('aria-expanded', 'false');
                miniSettingsButton.focus();
            }
            if (miniSettingsClose) miniSettingsClose.onclick = closeMiniSettings;
            miniSettingsButton.onclick = function() {
                if (miniSettings.style.display !== 'none') { closeMiniSettings(); return; }
                miniSettings.style.display = 'block';
                miniSettingsButton.setAttribute('aria-expanded', 'true');
                if (miniSettingsClose) miniSettingsClose.focus();
            };
            // Capture Escape even after focus moves to the page. The listener is
            // replaced on rebuild, independently of transient drag listeners.
            miniSettingsKeyHandler = function(event) {
                if (event.key === 'Escape' && miniSettings.style.display !== 'none') {
                    event.preventDefault();
                    event.stopPropagation();
                    closeMiniSettings();
                }
            };
            document.addEventListener('keydown', miniSettingsKeyHandler, true);
        }
        if (btnToggle) btnToggle.onclick = toggleView;
        if (btnExpand) btnExpand.onclick = toggleView;
        if (btnAuto) btnAuto.onclick = toggleAutoRefresh;
        if (btnTimerDown) btnTimerDown.onclick = function() { adjustTimer(-10); };
        if (btnTimerUp) btnTimerUp.onclick = function() { adjustTimer(10); };

        var presetBtns = document.querySelectorAll('.timer-preset');
        for (var i = 0; i < presetBtns.length; i++) {
            presetBtns[i].onclick = function() {
                var time = parseInt(this.dataset.time);
                scanIntervalSeconds = time;
                if (isAutoRefreshOn) {
                    stopCountdown();
                    resetCountdown();
                    startCountdown();
                } else {
                    resetCountdown();
                }
                updateCountdownDisplay();
                var allPresets = document.querySelectorAll('.timer-preset');
                for (var j = 0; j < allPresets.length; j++) {
                    allPresets[j].style.background = 'var(--panel-button)';
                    allPresets[j].style.color = 'var(--panel-muted)';
                    allPresets[j].style.borderColor = 'var(--panel-divider)';
                }
                this.style.background = '#ff69b4';
                this.style.color = '#fff';
                this.style.borderColor = '#ff69b4';
            };
        }
        
        var trendPresetBtns = document.querySelectorAll('.trend-preset-btn');
        for (var k = 0; k < trendPresetBtns.length; k++) {
            trendPresetBtns[k].onclick = function() {
                autoTrendEscalation = false;
                updateAutoTrendButton();
                var mode = this.dataset.mode;
                setTrendComparisonMode(mode);
            };
        }
        
        var btnTrendAuto = document.getElementById('btn-trend-auto');
        if (btnTrendAuto) {
            btnTrendAuto.onclick = toggleAutoTrendEscalation;
        }
        
        updateTrendPresetButtons();
        updateAutoTrendButton();
    }

    function toggleAutoRefresh() {
        // Only an explicit Resume clears access denial. Reset/reload cannot bypass it.
        if (!isAutoRefreshOn) {
            var policy = readRequestPolicy();
            if (policy.blocked) {
                writeRequestPolicy({ until: policy.serverUntil || 0, serverUntil: policy.serverUntil || 0, failures: 0, blocked: 0, status: 0, revision: '' });
            }
        }
        isAutoRefreshOn = !isAutoRefreshOn;
        var btn = document.getElementById('btn-auto');
        var btnControl = document.getElementById('btn-control-auto');
        if (isAutoRefreshOn) {
            if (btn) {
                btn.style.background = '#32CD32';
                btn.innerHTML = '⏸';
                btn.title = 'Auto-Refresh ON - Click to pause';
            }
            if (btnControl) {
                btnControl.style.background = '#32CD32';
                btnControl.innerHTML = '⏸';
                btnControl.title = 'Auto-Refresh ON - Click to pause';
            }
            startTrackingTimer();
            startCountdown();
            performScanThenReturn(true);
        } else {
            if (btn) {
                btn.style.background = '#ff4444';
                btn.innerHTML = '▶';
                btn.title = 'Auto-Refresh OFF - Click to start';
            }
            if (btnControl) {
                btnControl.style.background = '#ff4444';
                btnControl.innerHTML = '▶';
                btnControl.title = 'Auto-Refresh OFF - Click to start';
            }
            stopCountdown();
            pauseTrackingTimer();
            updateCountdownDisplay();
        }
    }

    function setupDraggable() {
        var container = document.getElementById('tracker-container');
        var dragHandle = document.getElementById('drag-handle');
        if (!container || !dragHandle) return;
        var startDrag = function(e) {
            if (isResizing || (e.target.closest && e.target.closest('button, input, select, a'))) return;
            isDragging = true;
            var rect = container.getBoundingClientRect();
            var scale = currentScale || 1;
            dragOffsetX = (e.clientX - rect.left) / scale;
            dragOffsetY = (e.clientY - rect.top) / scale;
            if (container.style.right !== 'auto') {
                container.style.left = rect.left + 'px';
                container.style.right = 'auto';
            }
            addDragListener('mousemove', doDrag, false);
            addDragListener('mouseup', stopDrag, false);
            e.preventDefault();
        };
        var doDrag = function(e) {
            if (!isDragging) return;
            var scale = currentScale || 1;
            var newX = e.clientX - (dragOffsetX * scale);
            var newY = e.clientY - (dragOffsetY * scale);
            var maxX = window.innerWidth - (container.offsetWidth * scale);
            var maxY = window.innerHeight - (container.offsetHeight * scale);
            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));
            container.style.left = newX + 'px';
            container.style.top = newY + 'px';
        };
        var stopDrag = function() {
            isDragging = false;
            cleanupDragListeners();
            savePanelGeometry();
        };
        dragHandle.addEventListener('mousedown', startDrag, false);
    }

    function toggleView() {
        hideChartTooltip();
        if (presentationMode === 'PLAYBACK') return;
        cancelHighPulses();
        isMinimized = !isMinimized;
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
        if (isMinimized) {
            if (fullView) fullView.style.display = 'none';
            if (miniView) miniView.style.display = 'block';
            if (toggleBtn) toggleBtn.textContent = '+';
            if (container) container.style.width = BASE_WIDTH_MINI + 'px';
            if (resizeHandle) resizeHandle.style.display = 'none';
            if (isResizing) isResizing = false;
            var currentTotal = roomTotal > 0 ? roomTotal : (users.size + anonymousCount);
            if (headerText) headerText.textContent = currentTotal.toLocaleString() + ' (H:' + roomTotalHigh.toLocaleString() + ')';
        } else {
            if (fullView) fullView.style.display = 'block';
            if (miniView) miniView.style.display = 'none';
            if (toggleBtn) toggleBtn.textContent = '−';
            if (container) container.style.width = BASE_WIDTH_FULL + 'px';
            if (resizeHandle) resizeHandle.style.display = 'block';
            var currentTotal = roomTotal > 0 ? roomTotal : (users.size + anonymousCount);
            if (headerText) headerText.textContent = 'USERS: ' + currentTotal.toLocaleString() + ' (H:' + roomTotalHigh.toLocaleString() + ')';

        }
        var settings = document.getElementById('mini-settings');
        if (settings) settings.style.display = 'none';
        var settingsButton = document.getElementById('mini-settings-toggle');
        if (settingsButton) settingsButton.setAttribute('aria-expanded', 'false');
        updateDisplay();
        if (!isMinimized) {
            drawAllSparklines();
            constrainPanelPosition();
        }
        constrainPanelPosition();
        if (container) container.style.transition = previousTransition;
    }

    function scanUsers() {
        var userListTab = document.querySelector(DOM_SELECTORS.userListTab);
        if (!userListTab) throw new Error('UserListTab not found');
        var snapshotUsers = new Map();
        var snapshotRoomTotal = getRoomTotal();
        if (!snapshotRoomTotal) throw new Error('DOM room total missing or zero');
        var userElements = [];
        for (var i = 0; i < DOM_SELECTORS.usernameElements.length; i++) {
            var found = userListTab.querySelectorAll(DOM_SELECTORS.usernameElements[i]);
            for (var j = 0; j < found.length; j++) {
                userElements.push(found[j]);
            }
        }
        for (var i = 0; i < userElements.length; i++) {
            var el = userElements[i];
            var rawText = (el.textContent || '').trim() || (el.getAttribute('data-username') || '').trim();
            var username = extractUsername(rawText);
            if (username && !snapshotUsers.has(username)) {
                var tier = getTierFromElement(el);
                var gender = getGenderFromElement(el);
                snapshotUsers.set(username, { username: username, rawClass: null, tier: tier,
                    genderCode: null, gender: gender, rawFlag: null, isOwner: null });
            }
        }
        if (!snapshotUsers.size) throw new Error('DOM sample contains no readable users');
        return { source: 'DOM', timestamp: Date.now(), roomTotal: snapshotRoomTotal,
            users: Array.from(snapshotUsers.values()) };
    }

    function updateDisplay() {
        updateReplayAvailability();
        if (restoredDisplayFrame) {
            if (presentationMode !== 'PLAYBACK') renderDisplayFrame(restoredDisplayFrame);
            return;
        }
        var counts = { 'red': 0, 'green': 0, 'purple': 0, 'pink': 0, 'dark-blue': 0, 'light-blue': 0, 'gray': 0, 'female-trans': 0 };
        users.forEach(function(data) {
            if (counts[data.tier] !== undefined) counts[data.tier]++;
            if (data.gender === 'female' || data.gender === 'trans') {
                counts['female-trans']++;
            }
        });
        var total = users.size;
        var withTokens = counts['red'] + counts['green'] + counts['purple'] + counts['pink'] + counts['dark-blue'] + counts['light-blue'];
        var anonymousCount = getAnonymousCount();
        var fullRoomTotal = roomTotal > total ? roomTotal : (total + anonymousCount);
        if (fullRoomTotal > roomTotalHigh) {
            roomTotalHigh = fullRoomTotal;
            roomTotalHighTime = Date.now();
        }
        if (presentationMode === 'PLAYBACK') return;
        renderDisplayFrame({ counts: counts, total: total, withTokens: withTokens,
            anonymousCount: anonymousCount, fullRoomTotal: fullRoomTotal, roomTotalHigh: roomTotalHigh,
            history: history, isPlayback: false });
    }

    function renderDisplayFrame(frame) {
        var counts = frame.counts;
        var total = frame.total;
        var withTokens = frame.withTokens;
        var anonymousCount = frame.anonymousCount;
        var fullRoomTotal = frame.fullRoomTotal;
        var roomTotalHigh = frame.roomTotalHigh;
        var displayHistory = frame.history;
        var highlights = (frame.isPlayback || frame.isRestored) ? frame.playbackNewHighTiers : newHighTiers;
        updateCollapsedRowStatus(frame, highlights);
        var withTokensPct = total > 0 ? Math.round((withTokens / total) * 100) + '%' : '0%';
        var registeredPct = fullRoomTotal > 0 ? Math.round((total / fullRoomTotal) * 100) + '%' : '0%';
        var headerText = document.getElementById('header-text');
        if (headerText) {
            if (isMinimized) {
                headerText.textContent = (frame.isPlayback ? 'PLAYBACK: ' : (frame.isRestored ? 'SAVED: ' : '')) + fullRoomTotal.toLocaleString() + ' (H:' + roomTotalHigh.toLocaleString() + ')';
            } else {
                headerText.textContent = (frame.isPlayback ? 'PLAYBACK: ' : (frame.isRestored ? 'SAVED: ' : 'USERS: ')) + fullRoomTotal.toLocaleString() + ' (H:' + roomTotalHigh.toLocaleString() + ')';
            }
        }
        var miniWithTokens = document.getElementById('mini-withtokens');
        var miniWithTokensPct = document.getElementById('mini-withtokens-pct');
        var miniTotal = document.getElementById('mini-total');
        var miniTotalPct = document.getElementById('mini-total-pct');
        if (miniWithTokens) miniWithTokens.textContent = withTokens;
        if (miniWithTokensPct) miniWithTokensPct.textContent = withTokensPct;
        if (miniTotal) miniTotal.textContent = total;
        if (miniTotalPct) miniTotalPct.textContent = registeredPct;
        var miniChange = document.getElementById('mini-room-change');
        if (miniChange) miniChange.style.display = isMinimized ? 'inline' : 'none';
        if (miniWithTokens) miniWithTokens.parentElement && (miniWithTokens.parentElement.title = 'With Tokens: ' + withTokens.toLocaleString() + ' (' + withTokensPct + ' of registered users)');
        if (miniTotal) miniTotal.parentElement && (miniTotal.parentElement.title = 'Registered: ' + total.toLocaleString() + ' (' + registeredPct + ' of room total)');
        updateCompactDashboard(frame);
        if (!isMinimized) {
            Object.keys(TIERS).forEach(function(tier) {
                var countEl = document.getElementById('count-' + tier);
                var highEl = document.getElementById('high-' + tier);
                var rowEl = document.getElementById('tier-row-' + tier);
                var currentVal = counts[tier];
                var highResult = getDisplayHigh(frame, tier, currentVal);
                var highVal = highResult.value;
                if (countEl) countEl.textContent = currentVal;
                if (highEl) highEl.textContent = 'H:' + highVal.toLocaleString();
                if (rowEl) {
                    if (highlights && highlights[tier]) {
                        rowEl.style.background = 'rgba(50, 205, 50, 0.22)';
                    } else {
                        rowEl.style.background = 'rgba(var(--panel-row-rgb),calc(0.05 * var(--tier-background-scale, 1)))';
                    }
                }
            });
            
            var withTokensCountEl = document.getElementById('count-withtokens');
            var withTokensPctEl = document.getElementById('pct-withtokens');
            var withTokensHighEl = document.getElementById('high-withtokens');
            var withTokensRowEl = document.getElementById('tier-row-withtokens');
            var withTokensResult = getDisplayHigh(frame, 'withTokens', withTokens);
            if (withTokensCountEl) withTokensCountEl.textContent = withTokens;
            if (withTokensPctEl) withTokensPctEl.textContent = withTokensPct;
            if (withTokensHighEl) withTokensHighEl.textContent = 'H:' + withTokensResult.value.toLocaleString();
            if (withTokensRowEl) {
                if (highlights && highlights['withTokens']) {
                    withTokensRowEl.style.background = 'rgba(50, 205, 50, 0.22)';
                } else {
                    withTokensRowEl.style.background = 'rgba(255,105,180,0.15)';
                }
            }
            
            var totalEl = document.getElementById('count-total');
            var totalHighEl = document.getElementById('high-total');
            var totalRowEl = document.getElementById('tier-row-total');
            var totalResult = getDisplayHigh(frame, 'total', total);
            if (totalEl) totalEl.textContent = total;
            if (totalHighEl) totalHighEl.textContent = 'H:' + totalResult.value.toLocaleString();
            if (totalRowEl) {
                if (highlights && highlights['total']) {
                    totalRowEl.style.background = 'rgba(50, 205, 50, 0.22)';
                } else {
                    totalRowEl.style.background = 'rgba(var(--panel-row-rgb),0.1)';
                }
            }
            
            var fullAnonText = document.getElementById('anon-ratio-full');
            var anonHighEl = document.getElementById('high-anon');
            var anonRowEl = document.getElementById('tier-row-anon');
            var anonResult = getDisplayHigh(frame, 'anonymous', anonymousCount);
            if (fullAnonText) {
                var anonLabel = anonymousCount > 0 ? anonymousCount.toLocaleString() : '0';
                var digits = String(Math.abs(anonymousCount)).length;
                fullAnonText.textContent = anonLabel;
                fullAnonText.style.fontSize = digits >= 6 ? '9px' : digits === 5 ? '11px' : '13px';
            }
            if (anonHighEl) anonHighEl.textContent = 'H:' + anonResult.value.toLocaleString();
            if (anonRowEl) {
                if (highlights && highlights['anonymous']) {
                    anonRowEl.style.background = 'rgba(50, 205, 50, 0.22)';
                } else {
                    anonRowEl.style.background = 'rgba(136,136,136,0.15)';
                }
            }
        }
    }

    function scheduleInit(delay) {
        var generation = initGuard;
        var url = location.href;
        setTimeout(function() {
            if (generation === initGuard && url === location.href) init();
        }, delay);
    }

    function init() {
        leavePlayback(false);
        var myGeneration = ++initGuard;
        isScanning = false;
        log('Initializing... (generation ' + myGeneration + ')');
        if (healthCheckInterval) {
            clearInterval(healthCheckInterval);
            healthCheckInterval = null;
        }
        if (freshnessInterval) clearInterval(freshnessInterval);
        freshnessInterval = setInterval(function() {
            updateAcquisitionStatus();
            updateCountdownDisplay();
        }, 1000);
        var isRoom = isBroadcastRoom();
        var modelName = getModelName();
        var loaded = false;
        if (isRoom && modelName !== 'unknown') {
            loaded = loadSession(modelName);
        }
        if (!loaded) {
            isMinimized = !isRoom;
            isAutoRefreshOn = isRoom;
        } else {
            isMinimized = false;
            isAutoRefreshOn = !isPaused;
        }
        try {
            createPanel();
        } catch (e) {
            log('Error creating panel: ' + e);
            return;
        }
        var resizeHandle = document.getElementById('resize-handle');
        if (resizeHandle) {
            resizeHandle.style.display = isMinimized ? 'none' : 'block';
        }
        if (!isMinimized) {
            var fullView = document.getElementById('full-view');
            var miniView = document.getElementById('minimized-view');
            var toggleBtn = document.getElementById('btn-toggle');
            var container = document.getElementById('tracker-container');
            if (fullView) fullView.style.display = 'block';
            if (miniView) miniView.style.display = 'none';
            if (toggleBtn) toggleBtn.textContent = '−';
            if (container) container.style.width = BASE_WIDTH_FULL + 'px';
            drawAllSparklines();
            updateDisplay();
        }
        updateDisplay();
        updateTrendDisplay();
        updateAcquisitionStatus();
        restorePanelGeometry();
        var attempts = 0;
        var maxAttempts = 30;
        var checkInterval = setInterval(function() {
            if (myGeneration !== initGuard) {
                clearInterval(checkInterval);
                log('Init ' + myGeneration + ' superseded by newer generation');
                return;
            }
            attempts++;
            if ((isRoom && modelName !== 'unknown') || document.querySelector(DOM_SELECTORS.userListTab) || attempts >= maxAttempts) {
                clearInterval(checkInterval);
                if (!isRoom && attempts >= maxAttempts && !document.querySelector(DOM_SELECTORS.userListTab)) {
                    log('UserListTab not found after 30s, giving up');
                    var statusEl = document.getElementById('auto-status');
                    if (statusEl) {
                        statusEl.textContent = 'No chat detected';
                        statusEl.style.color = 'var(--panel-negative)';
                    }
                    return;
                }
                if (!isPaused) {
                    performScanThenReturn(true);
                }
                setTimeout(function() {
                    if (myGeneration !== initGuard) return;
                    if (isAutoRefreshOn && !isPaused) {
                        startTrackingTimer();
                        startCountdown();
                    } else {
                        var btnAuto = document.getElementById('btn-auto');
                        var btnControlAuto = document.getElementById('btn-control-auto');
                        if (btnAuto) {
                            btnAuto.style.background = '#ff4444';
                            btnAuto.innerHTML = '▶';
                            btnAuto.title = 'Auto-Refresh OFF - Click to start';
                        }
                        if (btnControlAuto) {
                            btnControlAuto.style.background = '#ff4444';
                            btnControlAuto.innerHTML = '▶';
                            btnControlAuto.title = 'Auto-Refresh OFF - Click to start';
                        }
                        var statusEl = document.getElementById('auto-status');
                        if (statusEl) {
                            statusEl.textContent = isPaused ? 'Paused (restored)' : 'Paused';
                            statusEl.style.color = 'var(--panel-negative)';
                        }
                        updateTrackingTimer();
                    }
                }, 2002);
            }
        }, 1000);
        healthCheckInterval = setInterval(function() {
            if (myGeneration === initGuard && lastAcquisitionAttemptSource === 'DOM' && !isScanning) {
                validateDOMHealth();
            }
        }, 30000);
    }

    var lastUrl = location.href;
    function checkUrlChange() {
        if (location.href !== lastUrl) {
            leavePlayback(false);
            var oldModel = getModelNameFromUrl(lastUrl);
            lastUrl = location.href;
            if (oldModel && oldModel !== 'unknown') {
                saveSession(oldModel);
            }
            newHighTiers = {};
            activeSessionStorageKey = null;
            stopCountdown();
            nextScanAt = 0;
            countdownSeconds = scanIntervalSeconds;
            stopTrackingTimer();
            cleanupDragListeners();
            if (miniSettingsKeyHandler) {
                document.removeEventListener('keydown', miniSettingsKeyHandler, true);
                miniSettingsKeyHandler = null;
            }
            isScanning = false;
            if (healthCheckInterval) {
                clearInterval(healthCheckInterval);
                healthCheckInterval = null;
            }
            currentScale = panelGeometry ? panelGeometry.scale : currentScale;
            users.clear();
            roomTotal = 0;
            lastAcceptedAcquisition = null;
            restoredDisplayFrame = null;
            lastAcquisitionAttemptSource = 'API';
            domHealthStatus.consecutiveFailures = 0;
            updateAcquisitionStatus();
            previousUserCount = 0;
            previousRoomTotal = 0;
            Object.keys(history).forEach(function(k) { history[k] = []; });
            previousCounts = {
                'red': 0, 'green': 0, 'purple': 0, 'pink': 0,
                'dark-blue': 0, 'light-blue': 0, 'gray': 0, 'female-trans': 0,
                'withTokens': 0, 'total': 0, 'anonymous': 0
            };
            hasTrendBaseline = false;
            trendComparisonMode = 'last';
            autoTrendEscalation = true;
            roomTotalHigh = 0;
            roomTotalHighTime = null;
            tierHighTimes = {};
            withTokensHighTime = null;
            totalHighTime = null;
            anonHighTime = null;
            femaleTransHighTime = null;
            initGuard++;
            scheduleInit(2002);
        }
    }
    urlCheckInterval = setInterval(checkUrlChange, 500);

    window.addEventListener('beforeunload', function() {
        cancelGifExport();
        leavePlayback(false);
        var modelName = getModelName();
        if (modelName && modelName !== 'unknown') {
            saveSession(modelName);
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            scheduleInit(2000);
        });
    } else {
        scheduleInit(2000);
    }
    log('Script loaded and waiting for init');

    return {
        downloadTrackingReport: downloadTrackingReport,
        downloadTrackingCSV: downloadTrackingCSV,
        resetAllTracking: resetAllTracking,
        getHealth: function() { return domHealthStatus; },
        parseGetChatUserListResponse: parseGetChatUserListResponse,
        generateGifFromHistory: generateGifFromHistory,
        cancelGifExport: cancelGifExport
    };
})();

if (typeof unsafeWindow !== 'undefined') {
    unsafeWindow.ViewerTracker = ViewerTracker;
} else {
    window.ViewerTracker = ViewerTracker;
}
