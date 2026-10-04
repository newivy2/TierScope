import { initializeAcquisitionState } from './acquisition-state.js';
import { updatePanelOptions } from './files.js';
import { cancelGifExport, generateGifFromHistory } from './gif.js';
import { cancelHighPulses } from './high-pulses.js';
import { loadCollapsedRows, loadPanelGeometry } from './layout.js';
import { initializeLifecycle, resetAllTracking, updateCountdownDisplay } from './lifecycle.js';
import { initializeLiveSession } from './live-session.js';
import { initializePanelPreferences } from './panel-preferences.js';
import { initializePlaybackState } from './playback-state.js';
import { initializePresentation } from './presentation.js';
import { hasStorageField } from './record-validation.js';
import { leavePlayback, updateReplayAvailability } from './replay.js';
import { downloadTrackingCSV, downloadTrackingReport } from './reports.js';
import { runtime } from './runtime.js';
import { parseGetChatUserListResponse, performScanThenReturn } from './scanning.js';
import { saveSession } from './session-persistence.js';
import { checkUrlChange, scheduleInit } from './startup.js';
import { getModelName, log } from './utils.js';

// Initialize defaults and effects in their original order, after modules load.

export function initializeRuntime() {
    runtime.TIERSCOPE_VERSION = __TIERSCOPE_VERSION__;
    runtime.API_TIMEOUT_MS = 10000;
    runtime.DEFAULT_API_INTERVAL_SECONDS = 60;
    runtime.DOM_FALLBACK_INTERVAL_SECONDS = 60;
    runtime.STORAGE_SCHEMA_VERSION = 2;
    runtime.STORAGE_KEY_PREFIX = 'tierscope:v1:';
    runtime.STORAGE_MAX_AGE_MS = 3 * 60 * 60 * 1000;
    runtime.STORAGE_HISTORY_SERIES = ['red', 'green', 'purple', 'pink', 'dark-blue', 'light-blue', 'gray',
        'female-trans', 'withTokens', 'total', 'anonymous'];
    runtime.STORAGE_NULLABLE_TIMES = ['withTokensHighTime', 'totalHighTime', 'anonHighTime',
        'femaleTransHighTime', 'roomTotalHighTime', 'trackingStartTime', 'sessionStartedAt'];
    runtime.sessionStorageStatus = new Map();
    runtime.sessionRecordWarnings = new Map();
    runtime.activeSessionStorageKey = null;
    // Tabs never overwrite each other's records. The shared epoch changes only on Reset.
    runtime.TAB_RECORD_PREFIX = 'tierscope:tab:v2:';
    runtime.ROOM_EPOCH_PREFIX = 'tierscope:epoch:v2:';
    runtime.activeRoomEpoch = null;
    runtime.tabRecords = new Map();
    runtime.sessionStorageNotice = '';
    runtime.sessionStartedAt = null;
    runtime.sessionStartEstimated = false;
    runtime.sessionHighs = {};
    runtime.ALL_TIME_PREFIX = 'tierscope:ath:v1:';
    runtime.ALL_TIME_EPOCH_PREFIX = 'tierscope:ath-epoch:v1:';
    runtime.HIGH_MODE_KEY = 'tierscope:ui:highMode:v1';
    runtime.ALL_TIME_SERIES = runtime.STORAGE_HISTORY_SERIES.concat(['roomTotal']);
    runtime.allTimeCache = new Map();
    runtime.highMode = 'sh';
    try { if (GM_getValue(runtime.HIGH_MODE_KEY, 'sh') === 'ath') runtime.highMode = 'ath'; }
    catch (error) { /* Session highs remain the default. */ }
    // GIF Export State
    runtime.gifExportJob = null;
    runtime.DOM_SELECTORS = {
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
    runtime.domHealthStatus = {
        lastCheck: 0,
        userListTabFound: false,
        consecutiveFailures: 0,
        isHealthy: true
    };
    runtime.healthCheckInterval = null;
    runtime.initGuard = 0;
    runtime.urlCheckInterval = null;
    runtime.scanEpoch = 0;
    runtime.lastAcceptedAcquisition = null;
    // Aggregate saved counts are presentation-only until a fresh scan succeeds.
    runtime.restoredDisplayFrame = null;
    runtime.lastAcquisitionAttemptSource = 'API';
    runtime.domFallbackReadyAtByRoom = new Map();
    runtime.freshnessInterval = null;
    runtime.nextScanAt = 0;
    runtime.windowResizeHandler = null;
    runtime.miniSettingsKeyHandler = null;
    runtime.previousCounts = {
        'red': 0, 'green': 0, 'purple': 0, 'pink': 0,
        'dark-blue': 0, 'light-blue': 0, 'gray': 0, 'female-trans': 0,
        'withTokens': 0, 'total': 0, 'anonymous': 0
    };
    runtime.hasTrendBaseline = false;
    runtime.trendComparisonMode = 'last';
    runtime.autoTrendEscalation = true;
    runtime.newHighTiers = {};
    runtime.highPulseAnimations = new Map();
    runtime.highPulseMotion = typeof window.matchMedia === 'function' ?
        window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (runtime.highPulseMotion) {
        runtime.motionChanged = function(event) { if (event.matches) cancelHighPulses(); };
        if (runtime.highPulseMotion.addEventListener) runtime.highPulseMotion.addEventListener('change', runtime.motionChanged);
        else if (runtime.highPulseMotion.addListener) runtime.highPulseMotion.addListener(runtime.motionChanged);
    }
    runtime.users = new Map();
    runtime.previousUserCount = 0;
    runtime.previousRoomTotal = 0;
    runtime.isMinimized = true;
    runtime.roomTotal = 0;
    runtime.roomTotalHigh = 0;
    runtime.isDragging = false;
    runtime.dragOffsetX = 0;
    runtime.dragOffsetY = 0;
    runtime.countdownInterval = null;
    runtime.isAutoRefreshOn = true;
    runtime.isScanning = false;
    runtime.countdownSeconds = runtime.DEFAULT_API_INTERVAL_SECONDS;
    runtime.scanIntervalSeconds = runtime.DEFAULT_API_INTERVAL_SECONDS;
    runtime.trackingStartTime = null;
    runtime.trackingTimerInterval = null;
    runtime.isPaused = false;
    runtime.isStopped = false;
    runtime.stoppedAt = null;
    runtime.stopReason = null;
    runtime.broadcasterAbsence = { since: null, missing: 0 };
    runtime.absencePausedAt = null;
    runtime.absenceOverrideActive = false;
    runtime.lastScheduledIntervalSeconds = runtime.DEFAULT_API_INTERVAL_SECONDS;
    runtime.ABSENCE_PAUSE_MS = 15 * 60 * 1000;
    runtime.ABSENCE_CHECK_SECONDS = 60;
    runtime.ABSENCE_STOP_MS = 3 * 60 * 60 * 1000;
    runtime.pausedElapsedTime = 0;
    runtime.dragListeners = [];
    runtime.isResizing = false;
    runtime.resizeStartX = 0;
    runtime.resizeStartY = 0;
    runtime.resizeStartWidth = 0;
    runtime.resizeStartHeight = 0;
    runtime.currentScale = 1.0;
    runtime.PANEL_GEOMETRY_KEY = 'tierscope:ui:geometry:v1';
    runtime.panelGeometry = loadPanelGeometry();
    runtime.PANEL_THEME_KEY = 'tierscope:ui:theme:v1';
    // Dark mode is the default; theme is a UI preference, independent of Reset.
    runtime.isDarkMode = true;
    try { runtime.isDarkMode = GM_getValue(runtime.PANEL_THEME_KEY, 'dark') !== 'bright'; }
    catch (error) { /* Keep dark mode when preferences are unavailable. */ }
    runtime.PANEL_THEME_COLORS = {
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
        gap: ['#e89b45', '#ad5f10'],
        negative: ['#ff4444', '#b52332'],
        paused: ['#ff9999', '#b52332'],
        'delta-up': ['#69BE45', '#357b21'],
        'delta-down': ['#ff7777', '#b52332'],
        accent: ['#ff69b4', '#b42370']
    };
    runtime.MINI_METRIC_KEY = 'tierscope:ui:miniMetric:v1';
    runtime.MINI_METRICS = ['room', 'withTokens', 'total'];
    runtime.miniMetric = 'room';
    try {
        runtime.savedMiniMetric = GM_getValue(runtime.MINI_METRIC_KEY, 'room');
        if (runtime.MINI_METRICS.indexOf(runtime.savedMiniMetric) !== -1) runtime.miniMetric = runtime.savedMiniMetric;
    } catch (error) { /* Use the default metric if preferences are unavailable. */ }
    runtime.BASE_WIDTH_MINI = 140;
    runtime.BASE_WIDTH_FULL = 280;
    runtime.roomTotalHighTime = null;
    runtime.tierHighTimes = {};
    runtime.withTokensHighTime = null;
    runtime.totalHighTime = null;
    runtime.anonHighTime = null;
    runtime.femaleTransHighTime = null;
    runtime.pendingHistoryGap = false;
    runtime.history = {
        timestamps: [], breaks: [],
        'red': [], 'green': [], 'purple': [], 'pink': [], 'dark-blue': [], 'light-blue': [], 'gray': [], 'female-trans': [],
        'withTokens': [], 'total': [], 'anonymous': []
    };
    runtime.MAX_HISTORY_LENGTH = 10000;
    runtime.TIERS = {
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
    runtime.COLLAPSED_ROWS_KEY = 'tierscope:ui:collapsedRows:v1';
    runtime.PANEL_ROWS = Object.keys(runtime.TIERS).map(function(key) {
        return { key: key, label: key === 'red' ? 'Moderators' : key === 'green' ? 'Fan Club' :
            key === 'female-trans' ? 'Female/Trans' : runtime.TIERS[key].name,
            color: runtime.TIERS[key].color, height: 28, display: 'flex' };
    }).concat([
        { key: 'withtokens', label: 'With Tokens', icon: '💎', color: '#ff69b4', height: 28, display: 'flex' },
        { key: 'total', label: 'Registered', icon: '📊', color: '#ffffff', height: 28, display: 'flex' },
        { key: 'anon', label: 'Anonymous', icon: '👻', color: '#888888', height: 50, display: 'block' },
        { key: 'roomTotal', label: 'Room Total', icon: '👥', color: 'var(--panel-warning)', height: 28, display: 'flex' }
    ]);
    runtime.collapsedRows = loadCollapsedRows();
    runtime.panelChartHeights = {};
    runtime.rowLayoutNeedsMeasure = true;
    runtime.panelChartRegionHeight = null;
    runtime.chartLayoutRevision = 0;
    runtime.TREND_ICONS = {
        up: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--panel-positive)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>',
        down: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--panel-negative)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>',
        stable: '<svg width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="var(--panel-warning)"/></svg>'
    };
    runtime.TREND_PRESETS = {
        'last': { label: 'Last', ms: 0 },
        '5min': { label: '5m', ms: 5 * 60 * 1000 },
        '15min': { label: '15m', ms: 15 * 60 * 1000 },
        '30min': { label: '30m', ms: 30 * 60 * 1000 },
        '1hour': { label: '1h', ms: 60 * 60 * 1000 },
        'start': { label: 'Start', ms: -1 }
    };
    runtime.presentationMode = 'LIVE';
    runtime.playback = null;
    runtime.sessionFileLoadGeneration = 0;
    runtime.panelOptionsCleanup = null;
    runtime.SESSION_FILE_FORMAT = 'TierScopeSession';
    runtime.SESSION_FILE_VERSION = 1;
    runtime.SESSION_FILE_MAX_BYTES = 8 * 1024 * 1024;
    runtime.CHART_WINDOW_KEY = 'tierscope:ui:chartWindow:v1';
    runtime.CHART_WINDOWS = { full: 0, fourHours: 240 * 60000, twoHours: 120 * 60000, hour: 60 * 60000, halfHour: 30 * 60000, quarter: 15 * 60000 };
    runtime.chartWindowMode = 'full';
    try {
        runtime.savedWindow = GM_getValue(runtime.CHART_WINDOW_KEY, 'full');
        if (typeof runtime.savedWindow === 'string' && hasStorageField(runtime.CHART_WINDOWS, runtime.savedWindow)) runtime.chartWindowMode = runtime.savedWindow;
    } catch (error) { /* Full history is the default. */ }
    runtime.playbackLayoutState = null;
    // A small indexed-color renderer: each rectangle updates the canvas and its
    // matching palette index buffer. Bitmap lettering needs no antialiasing,
    // RGB matching, dithering or quantizer. Only one frame is retained at a time.
    runtime.GIF_WIDTH = 480;
    runtime.GIF_HEIGHT = 640;
    runtime.GIF_MAX_FRAMES = 60;
    runtime.GIF_DURATION_CS = 1000;
    // GIF delay units are hundredths of a second.
    runtime.GIF_GAP_COLOR_INDEX = 12;
    runtime.GIF_FONT = {
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
    runtime.REQUEST_POLICY_KEY = 'tierscope:requests:v1:' + location.origin;
    runtime.requestPolicyUnsaved = false;
    runtime.requestPolicyCache = { until: 0, failures: 0, blocked: 0, status: 0, revision: '' };
    runtime.chartTimeCache = new WeakMap();
    runtime.panelBackgroundPercent = 95;
    runtime.lastUrl = location.href;
    initializeLiveSession(runtime);
    initializePlaybackState(runtime, {start: tick => setInterval(tick, 50), stop: handle => clearInterval(handle)});
    initializeAcquisitionState(runtime, {start: (tick, delay) => setInterval(tick, delay), stop: handle => clearInterval(handle)});
    initializePanelPreferences(runtime);
    initializeLifecycle({scan: performScanThenReturn});
    initializePresentation({refreshOptions: updatePanelOptions, refreshReplayAvailability: updateReplayAvailability, refreshCountdown: updateCountdownDisplay});
    runtime.urlCheckInterval = setInterval(checkUrlChange, 500);
    window.addEventListener('beforeunload', function() {
        cancelGifExport();
        leavePlayback(false);
        var modelName = getModelName();
        if (modelName && modelName !== 'unknown') {
            saveSession(modelName, true);
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
        getHealth: function() { return runtime.domHealthStatus; },
        parseGetChatUserListResponse: parseGetChatUserListResponse,
        generateGifFromHistory: generateGifFromHistory,
        cancelGifExport: cancelGifExport
    };
}
