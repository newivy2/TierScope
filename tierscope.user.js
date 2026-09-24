// ==UserScript==
// @name         TierScope - Chaturbate Viewers Visualizer
// @namespace    http://tampermonkey.net/
// @version      2.9.9.2
// @description  TierScope - Advanced tracking with spike detection, reports, and persistence
// @author       newivy
// @match        https://chaturbate.com/*
// @match        https://*.chaturbate.com/*
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @run-at       document-end
// ==/UserScript==

const ViewerTracker = (function() {
    'use strict';

    const STORAGE_KEY_PREFIX = 'tierscope:v1:';
    const STORAGE_MAX_AGE_MS = 3 * 60 * 60 * 1000; // 3 hours

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

    // Session-persistent unique tracking
    var sessionUniqueUsers = {};

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
                console.warn('[TierTracker] DOM health check failed:', health);
                if (container) {
                    const statusEl = document.getElementById('auto-status');
                    if (statusEl) {
                        statusEl.textContent = 'DOM mismatch - check console';
                        statusEl.style.color = '#ff4444';
                    }
                }
            }
            if (domHealthStatus.consecutiveFailures > 5 && isAutoRefreshOn) {
                console.warn('[TierTracker] Auto-pausing due to DOM health issues');
                toggleAutoRefresh();
            }
        } else {
            if (!wasHealthy && domHealthStatus.consecutiveFailures > 0) {
                console.log('[TierTracker] DOM health restored');
                const statusEl = document.getElementById('auto-status');
                if (statusEl && isAutoRefreshOn) {
                    statusEl.textContent = 'Next: ' + countdownSeconds + 's';
                    statusEl.style.color = '#32CD32';
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
    var countdownSeconds = 30;
    var scanIntervalSeconds = 30;
    var trackingStartTime = null;
    var trackingTimerInterval = null;
    var spikeDetectionEnabled = true;
    var isPaused = false;
    var pausedElapsedTime = 0;
    var dragListeners = [];

    var isResizing = false;
    var resizeStartX = 0;
    var resizeStartY = 0;
    var resizeStartWidth = 0;
    var resizeStartHeight = 0;
    var currentScale = 1.0;
    var BASE_WIDTH_MINI = 130;
    var BASE_WIDTH_FULL = 265;

    var spikeState = 'detecting';
    var currentSpike = null;
    var stabilizationWindow = [];
    var consecutiveStableScans = 0;
    var preSpikeBaseline = null;

    var roomTotalHighTime = null;
    var tierHighTimes = {};
    var withTokensHighTime = null;
    var totalHighTime = null;
    var anonHighTime = null;

    var sessionFemaleTransUsers = {};
    var femaleTransUsernames = [];
    var femaleTransHighTime = null;

    var history = {
        timestamps: [],
        'red': [], 'green': [], 'purple': [], 'pink': [], 'dark-blue': [], 'light-blue': [], 'gray': [], 'female-trans': [],
        'withTokens': [], 'total': [], 'anonymous': []
    };
    var MAX_HISTORY_LENGTH = 10000;

    var completedSpikes = [];
    var anonHistory = [];
    var SPIKE_THRESHOLD = 2.0;
    var MIN_ABSOLUTE_INCREASE = 100;
    var STABILIZATION_SCANS = 3;
    var STABILIZATION_PERCENT = 5;

    var TIERS = {
        'red': { name: '🔴 Red', desc: 'Mod', color: '#FF0000' },
        'green': { name: '🟢 Green', desc: 'Fan Club', color: '#32CD32' },
        'purple': { name: '🟣 Purple', desc: '1000+', color: '#8B00FF' },
        'pink': { name: '💗 Pink', desc: '250+', color: '#FF69B4' },
        'dark-blue': { name: '🔵 Dark Blue', desc: '50+', color: '#0000CD' },
        'light-blue': { name: '💙 Light Blue', desc: 'Tokens', color: '#4169E1' },
        'gray': { name: '⚪ Gray', desc: 'Guest', color: '#808080' },
        'female-trans': { name: '♀⚧', desc: '', color: '#FF1493' }
    };

    function log(msg) {
        console.log('[TierTracker] ' + msg);
    }

    // NEW: Parse model name from URL string (not current location)
    function getModelNameFromUrl(url) {
        if (!url) return 'unknown';
        var path = new URL(url).pathname;
        var bMatch = path.match(/\/b\/([^\/\?#]+)/);
        if (bMatch) return bMatch[1];
        
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

    // NEW: Persistence functions
    function getStorageKey(model) {
        return STORAGE_KEY_PREFIX + model.toLowerCase();
    }

    function saveSession(model) {
        if (!model || model === 'unknown') return;
        
        var saveData = {
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
            isPaused: isPaused,
            pausedElapsedTime: pausedElapsedTime,
            sessionFemaleTransUsers: sessionFemaleTransUsers,
            sessionUniqueUsers: sessionUniqueUsers,
            spikeState: spikeState,
            currentSpike: currentSpike,
            completedSpikes: completedSpikes,
            preSpikeBaseline: preSpikeBaseline,
            anonHistory: anonHistory,
            stabilizationWindow: stabilizationWindow,
            consecutiveStableScans: consecutiveStableScans,
            previousUserCount: previousUserCount,
            previousRoomTotal: previousRoomTotal
        };
        
        try {
            GM_setValue(getStorageKey(model), JSON.stringify(saveData));
            log('Session saved for ' + model);
        } catch (e) {
            log('Failed to save session: ' + e);
        }
    }

    function loadSession(model) {
        if (!model || model === 'unknown') return false;
        
        var key = getStorageKey(model);
        var saved = GM_getValue(key, null);
        if (!saved) return false;
        
        try {
            var data = JSON.parse(saved);
            var age = Date.now() - data.timestamp;
            
            if (age > STORAGE_MAX_AGE_MS) {
                log('Saved session expired (' + Math.round(age/60000) + ' min old), deleting');
                GM_deleteValue(key);
                return false;
            }
            
            // Restore all saved state
            history = data.history || { timestamps: [], 'red': [], 'green': [], 'purple': [], 'pink': [], 'dark-blue': [], 'light-blue': [], 'gray': [], 'female-trans': [], 'withTokens': [], 'total': [], 'anonymous': [] };
            tierHighTimes = data.tierHighTimes || {};
            withTokensHighTime = data.withTokensHighTime || null;
            totalHighTime = data.totalHighTime || null;
            anonHighTime = data.anonHighTime || null;
            femaleTransHighTime = data.femaleTransHighTime || null;
            roomTotalHigh = data.roomTotalHigh || 0;
            roomTotalHighTime = data.roomTotalHighTime || null;
            trackingStartTime = data.trackingStartTime || null;
            isPaused = data.isPaused || false;
            pausedElapsedTime = data.pausedElapsedTime || 0;
            sessionFemaleTransUsers = data.sessionFemaleTransUsers || {};
            sessionUniqueUsers = data.sessionUniqueUsers || {};
            spikeState = data.spikeState || 'detecting';
            currentSpike = data.currentSpike || null;
            completedSpikes = data.completedSpikes || [];
            preSpikeBaseline = data.preSpikeBaseline || null;
            anonHistory = data.anonHistory || [];
            stabilizationWindow = data.stabilizationWindow || [];
            consecutiveStableScans = data.consecutiveStableScans || 0;
            previousUserCount = data.previousUserCount || 0;
            previousRoomTotal = data.previousRoomTotal || 0;
            
            log('Session restored for ' + model + ' (' + Math.round(age/60000) + ' min old)');
            return true;
        } catch (e) {
            log('Failed to load session: ' + e);
            GM_deleteValue(key);
            return false;
        }
    }

    function deleteSession(model) {
        if (!model || model === 'unknown') return;
        GM_deleteValue(getStorageKey(model));
        log('Session deleted for ' + model);
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

    function formatTimeShort(timestamp) {
        var date = new Date(timestamp);
        return (date.getHours() < 10 ? '0' : '') + date.getHours() + ':' + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    }

    function formatDateTime(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    function formatDuration(ms) {
        var seconds = Math.floor(ms / 1000);
        if (seconds < 60) return seconds + 's';
        var minutes = Math.floor(seconds / 60);
        var remainingSecs = seconds % 60;
        return minutes + 'm ' + remainingSecs + 's';
    }

    function getModelName() {
        return getModelNameFromUrl(location.href);
    }

    function updateTrackingTimer() {
        var controlTimerEl = document.getElementById('control-tracking-timer');
        var displayTime = '00:00:00';
        var displayColor = '#888';
        
        if (isPaused) {
            displayTime = formatElapsedTime(pausedElapsedTime);
            displayColor = '#ff4444';
        } else if (trackingStartTime) {
            displayTime = formatElapsedTime(Date.now() - trackingStartTime);
            displayColor = '#ffd43b';
        }
        
        if (controlTimerEl) {
            controlTimerEl.textContent = displayTime;
            controlTimerEl.style.color = displayColor;
        }
    }

    function startTrackingTimer() {
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
        if (!trackingStartTime || isPaused) return;
        isPaused = true;
        pausedElapsedTime = Date.now() - trackingStartTime;
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
        pausedElapsedTime = 0;
        isPaused = false;
        
        roomTotalHighTime = null;
        tierHighTimes = {};
        withTokensHighTime = null;
        totalHighTime = null;
        anonHighTime = null;
        femaleTransHighTime = null;
        
        updateTrackingTimer();
    }

    function resetAllTracking() {
        if (!confirm('Reset all tracking data?\n\nThis will clear:\n- All session history\n- Spike records\n- Elapsed timer\n- Female/Trans user list\n- Unique user count\n\nA new scan will start immediately.')) {
            return;
        }
        
        var modelName = getModelName();
        log('Performing main reset...');
        
        deleteSession(modelName);
        
        scanEpoch++;
        isScanning = false;
        
        stopCountdown();
        stopTrackingTimer();
        
        users.clear();
        previousUserCount = 0;
        previousRoomTotal = 0;
        roomTotal = 0;
        roomTotalHigh = 0;
        
        sessionUniqueUsers = {};
        
        history = {
            timestamps: [],
            'red': [], 'green': [], 'purple': [], 'pink': [], 'dark-blue': [], 'light-blue': [], 'gray': [], 'female-trans': [],
            'withTokens': [], 'total': [], 'anonymous': []
        };
        
        completedSpikes.length = 0;
        anonHistory.length = 0;
        spikeState = 'detecting';
        currentSpike = null;
        stabilizationWindow = [];
        consecutiveStableScans = 0;
        preSpikeBaseline = null;
        
        sessionFemaleTransUsers = {};
        femaleTransUsernames = [];
        
        roomTotalHighTime = null;
        tierHighTimes = {};
        withTokensHighTime = null;
        totalHighTime = null;
        anonHighTime = null;
        femaleTransHighTime = null;
        
        countdownSeconds = scanIntervalSeconds;
        
        updateDisplay();
        updateSpikeDisplay();
        updateTrackingTimer();
        updateCountdownDisplay();
        
        drawAllSparklines();
        
        if (isAutoRefreshOn) {
            startTrackingTimer();
            startCountdown();
        }
        
        setTimeout(function() {
            performScanThenReturn(true);
        }, 500);
        
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
        var tracked = users.size;
        if (roomTotal > tracked) return roomTotal - tracked;
        return 0;
    }

    function getAnonRatio(anon, tracked) {
        if (tracked === 0) return anon === 0 ? '0:0' : anon + 'x';
        var ratio = anon / tracked;
        if (ratio >= 0.95 && ratio <= 1.05) return '1:1';
        if (ratio >= 10) return Math.round(ratio) + 'x';
        if (ratio >= 1) return (Math.round(ratio * 10) / 10) + 'x';
        if (ratio >= 0.1) return '0.' + Math.round(ratio * 10);
        return '<0.1';
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
            var tabAttr = btn.getAttribute('data-tab') || '';
            if (text.indexOf(tabName.toUpperCase()) !== -1) return btn;
        }

        return null;
    }

    function isReadingStable(current, previous) {
        if (!previous) return false;
        if (current === 0 && previous === 0) return true;
        var max = Math.max(current, previous);
        var min = Math.min(current, previous);
        if (max === 0) return false;
        var variance = ((max - min) / max) * 100;
        return variance <= STABILIZATION_PERCENT;
    }

    function isStabilized(readings) {
        if (readings.length < STABILIZATION_SCANS) return false;
        var recent = readings.slice(-STABILIZATION_SCANS);
        var max = Math.max.apply(null, recent);
        var min = Math.min.apply(null, recent);
        if (max === 0) return min === 0;
        var variance = ((max - min) / max) * 100;
        return variance <= STABILIZATION_PERCENT;
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
        var sessionStart = trackingStartTime ? formatDateTime(trackingStartTime) : 'Not started';
        var totalTime = trackingStartTime ? formatElapsedTime(isPaused ? pausedElapsedTime : (Date.now() - trackingStartTime)) : '00:00:00';
        var now = Date.now();
        
        var report = [
            '================================',
            'CHATURBATE TRACKING REPORT',
            '================================',
            '',
            'Model: ' + modelName,
            'Session Start: ' + sessionStart,
            'Report Generated: ' + formatDateTime(now),
            'Total Tracking Time: ' + totalTime,
            ''
        ];
        
        report.push('--- ALL-TIME HIGHS ---');
        report.push('');
        
        if (roomTotalHigh > 0 && roomTotalHighTime) {
            var elapsed = formatElapsedTime(roomTotalHighTime - trackingStartTime);
            report.push('Room Total High: ' + roomTotalHigh.toLocaleString() + ' users');
            report.push('  Recorded at: ' + formatDateTime(roomTotalHighTime) + ' (' + elapsed + ' into session)');
            report.push('');
        }
        
        Object.keys(TIERS).forEach(function(tier) {
            var highResult = getHighValue(history[tier], 0);
            var highVal = highResult.value;
            var highTime = tierHighTimes[tier];
            if (highVal > 0 && highTime) {
                var elapsed = formatElapsedTime(highTime - trackingStartTime);
                report.push(TIERS[tier].name + ' High: ' + highVal.toLocaleString());
                report.push('  Recorded at: ' + formatDateTime(highTime) + ' (' + elapsed + ' into session)');
                report.push('');
            }
        });
        
        var withTokensResult = getHighValue(history['withTokens'], 0);
        var withTokensHigh = withTokensResult.value;
        if (withTokensHigh > 0 && withTokensHighTime) {
            var elapsed = formatElapsedTime(withTokensHighTime - trackingStartTime);
            report.push('With Tokens High: ' + withTokensHigh.toLocaleString());
            report.push('  Recorded at: ' + formatDateTime(withTokensHighTime) + ' (' + elapsed + ' into session)');
            report.push('');
        }
        
        var totalResult = getHighValue(history['total'], 0);
        var totalHigh = totalResult.value;
        if (totalHigh > 0 && totalHighTime) {
            var elapsed = formatElapsedTime(totalHighTime - trackingStartTime);
            report.push('Registered Users High: ' + totalHigh.toLocaleString());
            report.push('  Recorded at: ' + formatDateTime(totalHighTime) + ' (' + elapsed + ' into session)');
            report.push('');
        }
        
        var anonResult = getHighValue(history['anonymous'], 0);
        var anonHigh = anonResult.value;
        if (anonHigh > 0 && anonHighTime) {
            var elapsed = formatElapsedTime(anonHighTime - trackingStartTime);
            report.push('Anonymous High: ' + anonHigh.toLocaleString());
            report.push('  Recorded at: ' + formatDateTime(anonHighTime) + ' (' + elapsed + ' into session)');
            report.push('');
        }
        
        report.push('Unique Registered This Session: ' + Object.keys(sessionUniqueUsers).length.toLocaleString());
        report.push('');
        
        report.push('--- CURRENT STATS ---');
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
        
        var totalHighCurrent = getHighValue(history['total'], total).value;
        var withTokensHighCurrent = getHighValue(history['withTokens'], withTokens).value;
        var anonHighCurrent = getHighValue(history['anonymous'], anonymousCount).value;
        var ftHighCurrent = getHighValue(history['female-trans'], counts['female-trans']).value;
        
        report.push('Current Room Total: ' + fullRoomTotal.toLocaleString() + ' (High: ' + roomTotalHigh.toLocaleString() + ')');
        report.push('Current Registered: ' + total.toLocaleString() + ' (High: ' + totalHighCurrent.toLocaleString() + ')');
        report.push('Current With Tokens: ' + withTokens.toLocaleString() + ' (High: ' + withTokensHighCurrent.toLocaleString() + ')');
        report.push('Current Anonymous: ' + anonymousCount.toLocaleString() + ' (High: ' + anonHighCurrent.toLocaleString() + ')');
        report.push('');
        
        report.push('--- TIER BREAKDOWN ---');
        report.push('');
        Object.keys(TIERS).forEach(function(tier) {
            var current = counts[tier] || 0;
            var high = getHighValue(history[tier], current).value;
            report.push(TIERS[tier].name + ' (' + (TIERS[tier].desc || 'Overlay') + '): ' + current.toLocaleString() + ' (High: ' + high.toLocaleString() + ')');
        });
        report.push('');
        
        report.push('--- SPIKE SUMMARY ---');
        report.push('');
        
        if (completedSpikes.length === 0 && !currentSpike) {
            report.push('No spikes detected during this session.');
        } else {
            report.push('Total Spikes Detected: ' + (completedSpikes.length + (currentSpike ? 1 : 0)));
            report.push('');
            
            if (currentSpike) {
                report.push('CURRENTLY TRACKING SPIKE:');
                report.push('  Started: ' + formatDateTime(currentSpike.startTime));
                report.push('  Baseline: ' + currentSpike.baselineCount);
                report.push('  Current Peak: ' + currentSpike.peakCount);
                report.push('  Duration so far: ' + formatDuration(now - currentSpike.startTime));
                
                report.push('');
                report.push('  --- TIER BREAKDOWN AT START ---');
                report.push('    🔴 Red: ' + currentSpike.startCounts.red + '  🟢 Green: ' + currentSpike.startCounts.green + '  🟣 Purple: ' + currentSpike.startCounts.purple);
                report.push('    💗 Pink: ' + currentSpike.startCounts.pink + '  🔵 Dark Blue: ' + currentSpike.startCounts['dark-blue']);
                report.push('    💙 Light Blue: ' + currentSpike.startCounts['light-blue'] + '  ⚪ Gray: ' + currentSpike.startCounts.gray);
                report.push('    ♀⚧ Overlay: ' + (currentSpike.startCounts['female-trans'] || 0));
                report.push('    Subtotals: 💎 With Tokens: ' + currentSpike.startWithTokens + '  📊 Total: ' + currentSpike.startTotal);
                
                report.push('');
                report.push('  --- TIER BREAKDOWN AT PEAK ---');
                report.push('    🔴 Red: ' + currentSpike.peakCounts.red + '  🟢 Green: ' + currentSpike.peakCounts.green + '  🟣 Purple: ' + currentSpike.peakCounts.purple);
                report.push('    💗 Pink: ' + currentSpike.peakCounts.pink + '  🔵 Dark Blue: ' + currentSpike.peakCounts['dark-blue']);
                report.push('    💙 Light Blue: ' + currentSpike.peakCounts['light-blue'] + '  ⚪ Gray: ' + currentSpike.peakCounts.gray);
                report.push('    ♀⚧ Overlay: ' + (currentSpike.peakCounts['female-trans'] || 0));
                report.push('    Subtotals: 💎 With Tokens: ' + currentSpike.peakWithTokens + '  📊 Total: ' + currentSpike.peakTotal);
                report.push('');
            }
            
            completedSpikes.forEach(function(spike, idx) {
                report.push('Spike #' + (completedSpikes.length - idx) + ':');
                report.push('  Start: ' + formatDateTime(spike.startTime));
                report.push('  Peak: ' + formatDateTime(spike.peakTime));
                report.push('  End: ' + formatDateTime(spike.endTime));
                report.push('  Duration: ' + formatDuration(spike.duration));
                report.push('  Baseline → Peak → Final: ' + spike.baselineCount + ' → ' + spike.peakCount + ' → ' + spike.finalCount);
                report.push('  Net Change: +' + (spike.peakCount - spike.baselineCount) + ' (peak), ' + (spike.finalCount - spike.baselineCount) + ' (settled)');
                
                report.push('');
                report.push('  --- TIER BREAKDOWN AT START ---');
                report.push('    🔴 Red: ' + spike.startCounts.red + '  🟢 Green: ' + spike.startCounts.green + '  🟣 Purple: ' + spike.startCounts.purple);
                report.push('    💗 Pink: ' + spike.startCounts.pink + '  🔵 Dark Blue: ' + spike.startCounts['dark-blue']);
                report.push('    💙 Light Blue: ' + spike.startCounts['light-blue'] + '  ⚪ Gray: ' + spike.startCounts.gray);
                report.push('    ♀⚧ Overlay: ' + (spike.startCounts['female-trans'] || 0));
                report.push('    Subtotals: 💎 With Tokens: ' + spike.startWithTokens + '  📊 Total Registered: ' + spike.startTotal + '  👻 Anonymous: ' + spike.baselineCount);
                
                report.push('');
                report.push('  --- TIER BREAKDOWN AT PEAK ---');
                report.push('    🔴 Red: ' + spike.peakCounts.red + '  🟢 Green: ' + spike.peakCounts.green + '  🟣 Purple: ' + spike.peakCounts.purple);
                report.push('    💗 Pink: ' + spike.peakCounts.pink + '  🔵 Dark Blue: ' + spike.peakCounts['dark-blue']);
                report.push('    💙 Light Blue: ' + spike.peakCounts['light-blue'] + '  ⚪ Gray: ' + spike.peakCounts.gray);
                report.push('    ♀⚧ Overlay: ' + (spike.peakCounts['female-trans'] || 0));
                report.push('    Subtotals: 💎 With Tokens: ' + spike.peakWithTokens + '  📊 Total Registered: ' + spike.peakTotal + '  👻 Anonymous: ' + spike.peakCount);
                
                report.push('');
                report.push('  --- TIER BREAKDOWN AT FINAL ---');
                report.push('    🔴 Red: ' + spike.finalCounts.red + '  🟢 Green: ' + spike.finalCounts.green + '  🟣 Purple: ' + spike.finalCounts.purple);
                report.push('    💗 Pink: ' + spike.finalCounts.pink + '  🔵 Dark Blue: ' + spike.finalCounts['dark-blue']);
                report.push('    💙 Light Blue: ' + spike.finalCounts['light-blue'] + '  ⚪ Gray: ' + spike.finalCounts.gray);
                report.push('    ♀⚧ Overlay: ' + (spike.finalCounts['female-trans'] || 0));
                report.push('    Subtotals: 💎 With Tokens: ' + spike.finalWithTokens + '  📊 Total Registered: ' + spike.finalTotal + '  👻 Anonymous: ' + spike.finalCount);
                report.push('');
            });
        }
        
        report.push('');
        report.push('--- ♀⚧ OVERLAY (SESSION) ---');
        report.push('');
        
        var sessionFemaleCount = 0;
        var sessionTransCount = 0;
        var femaleTransList = [];
        
        Object.keys(sessionFemaleTransUsers).forEach(function(username) {
            var gender = sessionFemaleTransUsers[username];
            var icon = gender === 'female' ? '♀' : '⚧';
            femaleTransList.push({ username: username, gender: gender, icon: icon });
            if (gender === 'female') sessionFemaleCount++;
            else if (gender === 'trans') sessionTransCount++;
        });
        
        femaleTransList.sort(function(a, b) {
            return a.username.localeCompare(b.username);
        });
        
        report.push('Total Unique Viewers: ' + femaleTransList.length + ' (♀ Female: ' + sessionFemaleCount + ', ⚧ Trans: ' + sessionTransCount + ')');
        report.push('');
        
        if (femaleTransList.length > 0) {
            report.push('Usernames:');
            femaleTransList.forEach(function(item) {
                report.push('  ' + item.icon + ' ' + item.username);
            });
        } else {
            report.push('No ♀⚧ viewers detected during this session.');
        }
        report.push('');
        
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

    function downloadSpikeReport(index) {
        var spike = completedSpikes[index];
        if (!spike) return;

        var report = [
            '================================',
            'CHATURBATE ANON SPIKE REPORT',
            '================================',
            '',
            'Spike #' + (completedSpikes.length - index),
            'Generated: ' + formatDateTime(Date.now()),
            '',
            '--- TIMING ---',
            'Start Time: ' + formatDateTime(spike.startTime),
            'Peak Time: ' + formatDateTime(spike.peakTime),
            'End Time: ' + formatDateTime(spike.endTime),
            'Duration: ' + formatDuration(spike.duration),
            '',
            '--- ANONYMOUS USERS ---',
            'Baseline (pre-spike): ' + spike.baselineCount,
            'Peak (during spike): ' + spike.peakCount,
            'Final (stabilized): ' + spike.finalCount,
            'Net Change: +' + (spike.peakCount - spike.baselineCount) + ' (peak)',
            'Settled At: ' + (spike.finalCount - spike.baselineCount >= 0 ? '+' : '') + (spike.finalCount - spike.baselineCount) + ' from baseline',
            '',
            '--- ROOM COMPOSITION AT START ---',
            'Total Registered Users: ' + spike.startTotal,
            'Users With Tokens: ' + spike.startWithTokens,
            'Anonymous: ' + spike.baselineCount,
            '',
            '--- TIER BREAKDOWN AT START ---',
            '🔴 Red (Mod): ' + spike.startCounts.red,
            '🟢 Green (Fan Club): ' + spike.startCounts.green,
            '🟣 Purple (1000+): ' + spike.startCounts.purple,
            '💗 Pink (250+): ' + spike.startCounts.pink,
            '🔵 Dark Blue (50+): ' + spike.startCounts['dark-blue'],
            '💙 Light Blue (Tokens): ' + spike.startCounts['light-blue'],
            '⚪ Gray (Guest): ' + spike.startCounts.gray,
            '',
            '--- ROOM COMPOSITION AT PEAK ---',
            'Total Registered Users: ' + spike.peakTotal,
            'Users With Tokens: ' + spike.peakWithTokens,
            'Anonymous: ' + spike.peakCount,
            '',
            '--- TIER BREAKDOWN AT PEAK ---',
            '🔴 Red (Mod): ' + spike.peakCounts.red,
            '🟢 Green (Fan Club): ' + spike.peakCounts.green,
            '🟣 Purple (1000+): ' + spike.peakCounts.purple,
            '💗 Pink (250+): ' + spike.peakCounts.pink,
            '🔵 Dark Blue (50+): ' + spike.peakCounts['dark-blue'],
            '💙 Light Blue (Tokens): ' + spike.peakCounts['light-blue'],
            '⚪ Gray (Guest): ' + spike.peakCounts.gray,
            '',
            '--- ROOM COMPOSITION AT FINAL ---',
            'Total Registered Users: ' + spike.finalTotal,
            'Users With Tokens: ' + spike.finalWithTokens,
            'Anonymous: ' + spike.finalCount,
            '',
            '--- TIER BREAKDOWN AT FINAL ---',
            '🔴 Red (Mod): ' + spike.finalCounts.red,
            '🟢 Green (Fan Club): ' + spike.finalCounts.green,
            '🟣 Purple (1000+): ' + spike.finalCounts.purple,
            '💗 Pink (250+): ' + spike.finalCounts.pink,
            '🔵 Dark Blue (50+): ' + spike.finalCounts['dark-blue'],
            '💙 Light Blue (Tokens): ' + spike.finalCounts['light-blue'],
            '⚪ Gray (Guest): ' + spike.finalCounts.gray,
            '',
            '--- RAW DATA ---',
            'All anon readings during spike: ' + spike.readings.join(', '),
            '',
            '================================',
            'End of Report',
            '================================'
        ].join('\n');

        var modelName = getModelName();
        var spikeNumber = completedSpikes.length - index;
        var date = new Date(spike.startTime);
        var dateStr = date.toISOString().slice(0, 10);
        var timeStr = date.getHours().toString().padStart(2, '0') + '-' + 
                     date.getMinutes().toString().padStart(2, '0') + '-' + 
                     date.getSeconds().toString().padStart(2, '0');
        
        var filename = modelName + '-spike-' + spikeNumber + '-' + dateStr + '-' + timeStr + '.txt';

        var blob = new Blob([report], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function toggleSpikeDetection() {
        spikeDetectionEnabled = !spikeDetectionEnabled;
        updateSpikeToggleButton();
        saveSession(getModelName());
    }

    function closeSpike(index) {
        completedSpikes.splice(index, 1);
        updateSpikeDisplay();
        saveSession(getModelName());
    }

    function clearAllSpikes() {
        completedSpikes.length = 0;
        if (spikeState === 'tracking') {
            spikeState = 'detecting';
            currentSpike = null;
            stabilizationWindow = [];
            consecutiveStableScans = 0;
            preSpikeBaseline = null;
        }
        updateSpikeDisplay();
        saveSession(getModelName());
    }

    function performScanThenReturn(returnToChat) {
        if (typeof returnToChat === 'undefined') returnToChat = true;
        if (isScanning) return;
        isScanning = true;

        var myScanEpoch = ++scanEpoch;
        var scanGeneration = initGuard;
        
        var statusEl = document.getElementById('auto-status');
        if (statusEl) {
            if (spikeState === 'tracking') {
                statusEl.textContent = 'Tracking spike...';
                statusEl.style.color = '#ff4444';
            } else {
                statusEl.textContent = 'Scanning...';
                statusEl.style.color = '#ffd43b';
            }
        }

        var usersTab = findTab('users');
        var chatTab = findTab('chat');

        if (!usersTab) {
            isScanning = false;
            resetCountdown();
            return;
        }

        try {
            usersTab.click();
        } catch (e) {
            log('Error clicking users tab: ' + e);
            isScanning = false;
            resetCountdown();
            return;
        }

        setTimeout(function() {
            if (scanGeneration !== initGuard || myScanEpoch !== scanEpoch) {
                log('Scan callback: generation/epoch changed, aborting');
                return;
            }
            
            var tempUsers = new Map(users);
            var tempPreviousCount = previousUserCount;
            var tempPreviousRoomTotal = previousRoomTotal;
            var tempRoomTotal = roomTotal;
            var scanRejected = false;
            
            try {
                users.clear();
                scanUsers();

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
                
                if (myScanEpoch !== scanEpoch) {
                    log('Scan data processing: epoch changed, aborting write');
                    users = tempUsers;
                    previousUserCount = tempPreviousCount;
                    previousRoomTotal = tempPreviousRoomTotal;
                    roomTotal = tempRoomTotal;
                    return;
                }
                
                if (!isScanValid(total, roomTotal)) {
                    users = tempUsers;
                    previousUserCount = tempPreviousCount;
                    previousRoomTotal = tempPreviousRoomTotal;
                    roomTotal = tempRoomTotal;
                    scanRejected = true;
                    log('Scan rejected - keeping previous data');
                    
                    if (statusEl) {
                        statusEl.textContent = 'Scan skipped (unreliable)';
                        statusEl.style.color = '#ff4444';
                    }
                } else {
                    previousUserCount = total;
                    previousRoomTotal = roomTotal;
                    
                    var currentRoomTotal = roomTotal > 0 ? roomTotal : (total + anonymousCount);
                    if (currentRoomTotal > roomTotalHigh) {
                        roomTotalHigh = currentRoomTotal;
                        roomTotalHighTime = Date.now();
                    }

                    if (spikeDetectionEnabled) {
                        if (spikeState === 'detecting') {
                            var baseline;
                            if (preSpikeBaseline !== null) {
                                baseline = preSpikeBaseline;
                            } else if (anonHistory.length >= 3) {
                                baseline = Math.min.apply(null, anonHistory);
                            } else {
                                baseline = anonymousCount;
                            }
                            
                            var increase = anonymousCount - baseline;

                            if (baseline > 0 && anonymousCount >= baseline * SPIKE_THRESHOLD && increase >= MIN_ABSOLUTE_INCREASE) {
                                spikeState = 'tracking';
                                currentSpike = {
                                    startTime: Date.now(),
                                    baselineCount: baseline,
                                    peakCount: anonymousCount,
                                    peakTime: Date.now(),
                                    readings: [anonymousCount],
                                    startCounts: Object.assign({}, counts),
                                    startWithTokens: withTokens,
                                    startTotal: total,
                                    peakCounts: Object.assign({}, counts),
                                    peakWithTokens: withTokens,
                                    peakTotal: total,
                                    stabilized: false
                                };
                                stabilizationWindow = [anonymousCount];
                                consecutiveStableScans = 0;
                                preSpikeBaseline = baseline;
                                log('SPIKE DETECTED - Baseline: ' + baseline + ', Initial: ' + anonymousCount);
                            } else {
                                if (anonHistory.length === 0 || anonymousCount < Math.min.apply(null, anonHistory)) {
                                    preSpikeBaseline = anonymousCount;
                                }
                            }
                        } else if (spikeState === 'tracking') {
                            currentSpike.readings.push(anonymousCount);
                            
                            var prevReading = currentSpike.readings[currentSpike.readings.length - 2];
                            if (isReadingStable(anonymousCount, prevReading)) {
                                consecutiveStableScans++;
                            } else {
                                consecutiveStableScans = 0;
                            }
                            
                            stabilizationWindow.push(anonymousCount);
                            if (stabilizationWindow.length > STABILIZATION_SCANS) {
                                stabilizationWindow.shift();
                            }

                            if (anonymousCount > currentSpike.peakCount) {
                                currentSpike.peakCount = anonymousCount;
                                currentSpike.peakTime = Date.now();
                                currentSpike.peakCounts = Object.assign({}, counts);
                                currentSpike.peakWithTokens = withTokens;
                                currentSpike.peakTotal = total;
                            }

                            if (isStabilized(stabilizationWindow)) {
                                currentSpike.endTime = Date.now();
                                currentSpike.finalCount = anonymousCount;
                                currentSpike.stabilized = true;
                                currentSpike.duration = currentSpike.endTime - currentSpike.startTime;
                                currentSpike.finalCounts = Object.assign({}, counts);
                                currentSpike.finalWithTokens = withTokens;
                                currentSpike.finalTotal = total;

                                completedSpikes.unshift(Object.assign({}, currentSpike));
                                if (completedSpikes.length > 5) completedSpikes.pop();

                                log('SPIKE STABILIZED - Duration: ' + formatDuration(currentSpike.duration));

                                spikeState = 'detecting';
                                currentSpike = null;
                                stabilizationWindow = [];
                                consecutiveStableScans = 0;
                                preSpikeBaseline = null;
                            }
                        }
                    }

                    anonHistory.push(anonymousCount);
                    if (anonHistory.length > 5) anonHistory.shift();
                    
                    updateDisplay();
                    updateSpikeDisplay();
                    saveToHistory();
                    
                    saveSession(getModelName());
                }
                
            } catch (err) {
                log('Error during scan: ' + err);
                users = tempUsers;
                previousUserCount = tempPreviousCount;
                previousRoomTotal = tempPreviousRoomTotal;
                roomTotal = tempRoomTotal;
            } finally {
                if (scanGeneration !== initGuard || myScanEpoch !== scanEpoch) {
                    log('Scan finally: generation/epoch changed, skipping cleanup');
                    return;
                }
                
                if (returnToChat && chatTab) {
                    chatTab.click();
                }
                isScanning = false;
                countdownSeconds = scanIntervalSeconds;
            }
        }, 800);
    }

    function updateSpikeToggleButton() {
        var btn = document.getElementById('btn-spike-toggle');
        var label = document.getElementById('spike-header-label');
        if (btn) {
            if (spikeDetectionEnabled) {
                btn.textContent = spikeState === 'tracking' ? 'TRACKING' : 'ON';
                btn.style.background = spikeState === 'tracking' ? '#ff4444' : '#32CD32';
                btn.style.color = '#fff';
                btn.title = spikeState === 'tracking' ? 'Currently tracking a spike' : 'Spike detection enabled - Click to disable';
            } else {
                btn.textContent = 'OFF';
                btn.style.background = '#ff4444';
                btn.style.color = '#fff';
                btn.title = 'Spike detection disabled - Click to enable';
            }
        }
        if (label) {
            label.style.color = spikeDetectionEnabled ? '#ff4444' : '#666';
            label.textContent = spikeState === 'tracking' ? '🚨 TRACKING SPIKE...' : '🚨 SPIKE DETECTOR';
        }
    }

    function setupSpikeContainerListeners() {
        var spikeContainer = document.getElementById('spike-container');
        if (!spikeContainer) return;
        
        spikeContainer.addEventListener('click', function(e) {
            var btn = e.target.closest('button');
            if (!btn) return;
            
            var action = btn.dataset.action;
            var index = btn.dataset.index;
            
            if (action === 'download' && index !== undefined) {
                downloadSpikeReport(parseInt(index));
            } else if (action === 'close' && index !== undefined) {
                closeSpike(parseInt(index));
            }
        });
    }

    function updateSpikeDisplay() {
        var spikeContainer = document.getElementById('spike-container');
        var clearAllBtn = document.getElementById('btn-clear-all-spikes');
        if (!spikeContainer) return;

        if (clearAllBtn) {
            clearAllBtn.style.display = (completedSpikes.length > 0 || spikeState === 'tracking') ? 'inline-block' : 'none';
        }
        updateSpikeToggleButton();

        if (spikeState === 'tracking' && currentSpike) {
            var currentReading = currentSpike.readings[currentSpike.readings.length - 1];
            var trackingDuration = Date.now() - currentSpike.startTime;

            var formatTiers = function(counts) {
                return 'R:' + counts.red + ' G:' + counts.green + ' P:' + counts.purple + ' PK:' + counts.pink + 
                       ' DB:' + counts['dark-blue'] + ' LB:' + counts['light-blue'] + ' GY:' + counts.gray + ' FT:' + (counts['female-trans'] || 0);
            };

            spikeContainer.innerHTML = 
                '<div style="margin-bottom:4px;padding:4px;background:rgba(255,68,68,0.2);border-radius:3px;border:2px solid #ff4444;">' +
                    '<div style="font-size:9px;color:#ff4444;font-weight:bold;text-align:center;margin-bottom:3px;">⚡ TRACKING SPIKE - ' + formatDuration(trackingDuration) + '</div>' +
                    '<div style="font-size:8px;color:#ffd43b;text-align:center;margin-bottom:2px;">Anon: ' + currentSpike.baselineCount + ' → ' + currentReading + ' → ' + currentSpike.peakCount + ' (peak)</div>' +
                    '<div style="border-top:1px solid #ff4444;margin-top:3px;padding-top:3px;">' +
                        '<div style="font-size:7px;color:#aaa;margin-bottom:1px;"><strong>START:</strong> 💎' + currentSpike.startWithTokens + ' 📊' + currentSpike.startTotal + ' 👻' + currentSpike.baselineCount + '</div>' +
                        '<div style="font-size:6px;color:#888;margin-bottom:3px;">' + formatTiers(currentSpike.startCounts) + '</div>' +
                        '<div style="font-size:7px;color:#ff69b4;margin-bottom:1px;"><strong>PEAK:</strong> 💎' + currentSpike.peakWithTokens + ' 📊' + currentSpike.peakTotal + ' 👻' + currentSpike.peakCount + '</div>' +
                        '<div style="font-size:6px;color:#888;">' + formatTiers(currentSpike.peakCounts) + '</div>' +
                    '</div>' +
                    '<div style="font-size:7px;color:#888;text-align:center;margin-top:3px;border-top:1px solid #ff4444;padding-top:3px;">Waiting for stabilization... (' + consecutiveStableScans + '/' + STABILIZATION_SCANS + ' consecutive stable)</div>' +
                '</div>';
            return;
        }

        if (completedSpikes.length === 0) {
            spikeContainer.innerHTML = '<div style="font-size:7px;color:#666;text-align:center;padding:3px;">No spikes detected yet</div>';
            return;
        }

        var html = '';
        for (var i = 0; i < completedSpikes.length; i++) {
            var spike = completedSpikes[i];
            var idx = i;
            html += 
                '<div style="margin-bottom:4px;padding:3px;background:rgba(255,0,0,0.1);border-radius:3px;border-left:2px solid #ff4444;position:relative;">' +
                    '<div style="position:absolute;top:2px;right:2px;display:flex;gap:2px;">' +
                        '<button data-action="download" data-index="' + idx + '" style="background:#4169E1;border:none;color:white;border-radius:3px;cursor:pointer;font-size:8px;padding:1px 4px;line-height:1;" title="Download report">💾</button>' +
                        '<button data-action="close" data-index="' + idx + '" style="background:#ff4444;border:none;color:white;border-radius:3px;cursor:pointer;font-size:8px;padding:1px 4px;line-height:1;" title="Remove">×</button>' +
                    '</div>' +
                    '<div style="font-size:8px;color:#ff4444;font-weight:bold;padding-right:40px;">🚨 SPIKE #' + (completedSpikes.length - idx) + ' at ' + formatTimeShort(spike.startTime) + '</div>' +
                    '<div style="font-size:7px;color:#ffd43b;margin-top:1px;">Duration: ' + formatDuration(spike.duration) + '</div>' +
                    '<div style="font-size:7px;color:#aaa;margin-top:2px;">' + spike.baselineCount + ' → ' + spike.peakCount + ' (+' + (spike.peakCount - spike.baselineCount) + ') → ' + spike.finalCount + ' (stable)</div>' +
                    '<div style="font-size:7px;color:#888;margin-top:2px;">Peak: R:' + spike.peakCounts.red + ' G:' + spike.peakCounts.green + ' P:' + spike.peakCounts.purple + ' PK:' + spike.peakCounts.pink + ' DB:' + spike.peakCounts['dark-blue'] + ' LB:' + spike.peakCounts['light-blue'] + ' GY:' + spike.peakCounts.gray + ' FT:' + (spike.peakCounts['female-trans'] || 0) + '</div>' +
                    '<div style="border-top:1px solid #555;margin-top:3px;padding-top:2px;">' +
                        '<div style="font-size:7px;color:#32CD32;margin-bottom:1px;"><strong>START:</strong> 💎' + spike.startWithTokens + ' 📊' + spike.startTotal + ' 👻' + spike.baselineCount + ' | R:' + spike.startCounts.red + ' G:' + spike.startCounts.green + ' P:' + spike.startCounts.purple + ' PK:' + spike.startCounts.pink + '</div>' +
                        '<div style="font-size:7px;color:#ff69b4;"><strong>FINAL:</strong> 💎' + spike.finalWithTokens + ' 📊' + spike.finalTotal + ' 👻' + spike.finalCount + ' | R:' + spike.finalCounts.red + ' G:' + spike.finalCounts.green + ' P:' + spike.finalCounts.purple + ' PK:' + spike.finalCounts.pink + '</div>' +
                    '</div>' +
                '</div>';
        }
        spikeContainer.innerHTML = html;
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

        Object.keys(counts).forEach(function(tier) {
            var highResult = getHighValue(history[tier], counts[tier], now);
            if (highResult.isNew && highResult.time) {
                tierHighTimes[tier] = highResult.time;
            }
        });

        var withTokensResult = getHighValue(history['withTokens'], withTokens, now);
        if (withTokensResult.isNew && withTokensResult.time) {
            withTokensHighTime = withTokensResult.time;
        }

        var totalResult = getHighValue(history['total'], total, now);
        if (totalResult.isNew && totalResult.time) {
            totalHighTime = totalResult.time;
        }

        var anonResult = getHighValue(history['anonymous'], anonymousCount, now);
        if (anonResult.isNew && anonResult.time) {
            anonHighTime = anonResult.time;
        }

        var ftResult = getHighValue(history['female-trans'], counts['female-trans'], now);
        if (ftResult.isNew && ftResult.time) {
            femaleTransHighTime = ftResult.time;
        }

        history.timestamps.push(now);
        Object.keys(counts).forEach(function(tier) {
            history[tier].push(counts[tier]);
        });
        history['withTokens'].push(withTokens);
        history['total'].push(total);
        history['anonymous'].push(anonymousCount);

        if (history.timestamps.length > MAX_HISTORY_LENGTH) {
            history.timestamps.shift();
            Object.keys(counts).forEach(function(tier) { history[tier].shift(); });
            history['withTokens'].shift();
            history['total'].shift();
            history['anonymous'].shift();
        }

        if (!isMinimized) {
            drawAllSparklines();
        }
    }

    function drawSparkline(canvasId, data, color, customHeight) {
        var canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        var ctx = canvas.getContext('2d');
        
        var scale = Math.max(1, currentScale || 1);
        var displayWidth = 105;
        var displayHeight = customHeight || 28;
        
        canvas.width = Math.floor(displayWidth * scale);
        canvas.height = Math.floor(displayHeight * scale);
        
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (data.length < 2) return;

        ctx.scale(scale, scale);
        
        var width = displayWidth;
        var height = displayHeight;
        var min = Math.min.apply(null, data);
        var max = Math.max.apply(null, data);
        var range = max - min || 1;

        var padding = 2;
        var drawHeight = height - (padding * 2);

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();

        for (var i = 0; i < data.length; i++) {
            var x = (i / (data.length - 1)) * width;
            var y = height - padding - ((data[i] - min) / range) * drawHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }

        ctx.stroke();
    }

    function drawAllSparklines() {
        Object.keys(TIERS).forEach(function(tier) {
            drawSparkline('spark-' + tier, history[tier], TIERS[tier].color);
        });
        drawSparkline('spark-withtokens', history['withTokens'], '#ff69b4');
        drawSparkline('spark-total', history['total'], '#ffffff');
        drawSparkline('spark-anon', history['anonymous'], '#888888', 50);
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
        updateCountdownDisplay();
    }

    function updateCountdownDisplay() {
        var statusEl = document.getElementById('auto-status');
        var timerDisplay = document.getElementById('timer-display');
        var expandedCountdown = document.getElementById('expanded-countdown');
        var controlNextScan = document.getElementById('control-next-scan');

        if (timerDisplay) {
            timerDisplay.textContent = scanIntervalSeconds + 's';
        }

        if (expandedCountdown) {
            if (isScanning) {
                if (spikeState === 'tracking') {
                    expandedCountdown.textContent = 'tracking...';
                    expandedCountdown.style.color = '#ff4444';
                } else {
                    expandedCountdown.textContent = 'scanning...';
                    expandedCountdown.style.color = '#ffd43b';
                }
            } else if (isAutoRefreshOn) {
                expandedCountdown.textContent = 'next: ' + countdownSeconds + 's';
                expandedCountdown.style.color = '#32CD32';
            } else {
                expandedCountdown.textContent = 'paused';
                expandedCountdown.style.color = '#ff4444';
            }
        }

        if (controlNextScan) {
            if (isScanning) {
                controlNextScan.textContent = spikeState === 'tracking' ? 'Tracking...' : 'Scanning...';
                controlNextScan.style.color = spikeState === 'tracking' ? '#ff4444' : '#ffd43b';
            } else if (isAutoRefreshOn) {
                controlNextScan.textContent = 'Next: ' + countdownSeconds + 's';
                controlNextScan.style.color = '#32CD32';
            } else {
                controlNextScan.textContent = 'Paused';
                controlNextScan.style.color = '#ff4444';
            }
        }

        if (!statusEl) return;

        if (spikeState === 'tracking') {
            statusEl.textContent = 'Tracking spike...';
            statusEl.style.color = '#ff4444';
        } else if (isScanning) {
            statusEl.textContent = 'Scanning...';
            statusEl.style.color = '#ffd43b';
        } else if (isAutoRefreshOn) {
            statusEl.textContent = 'Next: ' + countdownSeconds + 's';
            statusEl.style.color = '#32CD32';
        } else {
            statusEl.textContent = 'Auto: OFF';
            statusEl.style.color = '#ff4444';
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
        
        countdownInterval = setInterval(function() {
            if (!isAutoRefreshOn || isScanning) return;

            countdownSeconds--;
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
            var baseWidth = isMinimized ? BASE_WIDTH_MINI : BASE_WIDTH_FULL;
            var newScale = Math.max(0.5, Math.min(3.0, newWidth / baseWidth));
            
            applyScale(newScale);
        };
        
        var stopResize = function() {
            if (!isResizing) return;
            isResizing = false;
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

    // NEW: Keep panel visible on window resize
    function setupResizeHandler() {
        var resizeTimeout;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function() {
                var container = document.getElementById('tracker-container');
                if (!container) return;
                
                var scale = currentScale || 1;
                var rect = container.getBoundingClientRect();
                var viewportWidth = window.innerWidth;
                var viewportHeight = window.innerHeight;
                
                // Calculate current position
                var currentLeft = parseInt(container.style.left) || rect.left;
                var currentTop = parseInt(container.style.top) || rect.top;
                
                // Clamp to viewport bounds
                var maxX = viewportWidth - (rect.width * scale);
                var maxY = viewportHeight - (rect.height * scale);
                
                var newLeft = Math.max(0, Math.min(currentLeft, maxX));
                var newTop = Math.max(0, Math.min(currentTop, maxY));
                
                // Apply if changed
                if (newLeft !== currentLeft || newTop !== currentTop) {
                    container.style.left = newLeft + 'px';
                    container.style.top = newTop + 'px';
                    container.style.right = 'auto';
                }
            }, 100);
        });
    }

    function createPanel() {
        cleanupDragListeners();
        
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
                'position:fixed;top:70px;right:10px;background:rgba(20,20,30,0.95);color:white;padding:5px;' +
                'border-radius:6px;font-family:Arial,sans-serif;font-size:9px;z-index:999999;width:' + BASE_WIDTH_MINI + 'px;' +
                'border:1px solid #ff69b4;transition:width 0.3s ease;cursor:default;user-select:none;' +
            '">' +
                '<div id="drag-handle" style="' +
                    'display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;' +
                    'border-bottom:1px solid #ff69b4;padding-bottom:3px;cursor:move;' +
                '">' +
                    '<span id="header-text" style="font-weight:bold;color:#ff69b4;font-size:10px;">USERS: 0 (H:0)</span>' +
                    '<span id="header-unique" style="font-weight:bold;color:#32CD32;font-size:10px;display:none;">U:0</span>' +
                    '<button id="btn-toggle" style="background:#333;border:1px solid #555;color:#fff;border-radius:3px;cursor:pointer;font-size:9px;padding:1px 4px;flex-shrink:0;">+</button>' +
                '</div>' +
                
                '<div id="minimized-view" style="display:block;text-align:center;">' +
                    '<div style="font-size:9px;margin-bottom:3px;">' +
                        '<div>💎 <span id="mini-withtokens" style="color:#ff69b4;font-weight:bold;">0</span>' +
                        '(<span id="mini-withtokens-pct" style="color:#ff69b4;">0%</span>)</div>' +
                        '<div style="margin-top:2px;">📊 <span id="mini-total" style="color:#fff;font-weight:bold;">0</span>' +
                        '(<span id="mini-total-pct" style="color:#fff;">0%</span>)</div>' +
                    '</div>' +
                    
                    '<div style="display:flex;align-items:center;justify-content:center;gap:3px;margin:3px 0;padding:2px;background:rgba(255,255,255,0.05);border-radius:3px;">' +
                        '<button id="btn-timer-down" style="background:#444;border:none;color:#fff;border-radius:2px;cursor:pointer;font-size:9px;padding:1px 4px;font-weight:bold;">−</button>' +
                        '<span id="timer-display" style="font-size:9px;color:#ffd43b;font-weight:bold;min-width:24px;">30s</span>' +
                        '<button id="btn-timer-up" style="background:#444;border:none;color:#fff;border-radius:2px;cursor:pointer;font-size:9px;padding:1px 4px;font-weight:bold;">+</button>' +
                    '</div>' +
                    
                    '<div style="display:flex;gap:2px;justify-content:center;flex-wrap:wrap;">' +
                        '<button id="btn-expand" style="background:#444;border:none;color:white;border-radius:3px;cursor:pointer;font-size:8px;padding:2px 5px;">Expand</button>' +
                        '<button id="btn-auto" style="background:#32CD32;border:none;color:white;border-radius:3px;cursor:pointer;font-size:8px;padding:2px 4px;" title="Auto-Refresh ON">⏸</button>' +
                    '</div>' +
                    
                    '<div style="display:flex;gap:2px;justify-content:center;margin-top:3px;">' +
                        '<button class="timer-preset" data-time="30" style="background:#ff69b4;border:1px solid #ff69b4;color:#fff;border-radius:2px;cursor:pointer;font-size:7px;padding:1px 3px;">30s</button>' +
                        '<button class="timer-preset" data-time="60" style="background:#333;border:1px solid #555;color:#aaa;border-radius:2px;cursor:pointer;font-size:7px;padding:1px 3px;">60s</button>' +
                        '<button class="timer-preset" data-time="120" style="background:#333;border:1px solid #555;color:#aaa;border-radius:2px;cursor:pointer;font-size:7px;padding:1px 3px;">2m</button>' +
                        '<button class="timer-preset" data-time="300" style="background:#333;border:1px solid #555;color:#aaa;border-radius:2px;cursor:pointer;font-size:7px;padding:1px 3px;">5m</button>' +
                    '</div>' +
                    
                    '<div id="anon-rate-mini" style="margin-top:3px;font-size:8px;color:#aaa;display:none;">' +
                        '👻 Anon: <span id="anon-ratio-mini" style="color:#ff69b4;font-weight:bold;">--</span>' +
                    '</div>' +
                    '<div id="auto-status" style="margin-top:2px;font-size:7px;color:#32CD32;">Starting...</div>' +
                '</div>' +
                
                '<div id="full-view" style="display:none;">';
        
        Object.keys(TIERS).forEach(function(key) {
            var t = TIERS[key];
            var descHtml = t.desc ? '<div style="font-size:6px;color:#888;line-height:1.0;">' + t.desc + '</div>' : '';
            html += 
                '<div style="display:flex;align-items:center;padding:0px 2px;margin:0;background:rgba(255,255,255,0.05);border-radius:3px;border-left:2px solid ' + t.color + ';">' +
                    '<div style="width:68px;flex-shrink:0;">' +
                        '<div style="font-size:8px;line-height:1.0;">' + t.name + '</div>' +
                        descHtml +
                    '</div>' +
                    '<canvas id="spark-' + key + '" width="105" height="28" style="flex:1;margin:0 3px;"></canvas>' +
                    '<div style="text-align:right;width:40px;flex-shrink:0;">' +
                        '<span id="count-' + key + '" style="font-weight:bold;color:' + t.color + ';font-size:11px;">0</span>' +
                        '<div id="high-' + key + '" style="font-size:6px;color:#32CD32;margin-top:0;">H:0</div>' +
                    '</div>' +
                '</div>';
        });
        
        html += 
                '<div style="border-top:1px solid #555;margin-top:3px;padding-top:3px;">' +
                    '<div style="display:flex;align-items:center;padding:1px 2px;background:rgba(255,105,180,0.15);border-radius:3px;border:1px solid #ff69b4;margin-bottom:2px;">' +
                        '<div style="width:68px;flex-shrink:0;">' +
                            '<div style="font-size:8px;font-weight:bold;line-height:1.0;">💎 With Tokens</div>' +
                        '</div>' +
                        '<canvas id="spark-withtokens" width="105" height="28" style="flex:1;margin:0 3px;"></canvas>' +
                        '<div style="text-align:right;width:40px;flex-shrink:0;">' +
                            '<span id="count-withtokens" style="font-weight:bold;color:#ff69b4;font-size:11px;">0</span>' +
                            '<span id="pct-withtokens" style="font-size:6px;color:#ff69b4;margin-left:1px;">0%</span>' +
                            '<div id="high-withtokens" style="font-size:6px;color:#32CD32;margin-top:0;">H:0</div>' +
                        '</div>' +
                    '</div>' +
                    '<div style="display:flex;align-items:center;padding:1px 2px;background:rgba(255,255,255,0.1);border-radius:3px;">' +
                        '<div style="width:68px;flex-shrink:0;">' +
                            '<div style="font-size:8px;font-weight:bold;line-height:1.0;">📊 Total</div>' +
                        '</div>' +
                        '<canvas id="spark-total" width="105" height="28" style="flex:1;margin:0 3px;"></canvas>' +
                        '<div style="text-align:right;width:40px;flex-shrink:0;">' +
                            '<span id="count-total" style="font-weight:bold;color:#fff;font-size:11px;">0</span>' +
                            '<div id="high-total" style="font-size:6px;color:#32CD32;margin-top:0;">H:0</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                
                '<div id="anon-rate-full" style="margin-top:4px;padding:4px;background:rgba(136,136,136,0.15);border-radius:3px;border:1px solid #888;">' +
                    '<div style="display:flex;align-items:center;">' +
                        '<div style="width:68px;flex-shrink:0;">' +
                            '<div style="font-size:8px;font-weight:bold;color:#aaa;line-height:1.0;">👻 Anon</div>' +
                            '<div style="font-size:6px;color:#888;line-height:1.0;">Not logged in</div>' +
                        '</div>' +
                        '<canvas id="spark-anon" width="105" height="50" style="flex:1;margin:0 3px;"></canvas>' +
                        '<div style="text-align:right;width:40px;flex-shrink:0;">' +
                            '<span id="anon-ratio-full" style="font-size:11px;font-weight:bold;color:#ff69b4;">--</span>' +
                            '<div id="high-anon" style="font-size:6px;color:#32CD32;margin-top:0;">H:0</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                
                // COMPACTED CONTROL FIELD
                '<div id="control-field" style="margin-top:4px;padding:3px;background:rgba(65,105,225,0.15);border-radius:3px;border:1px solid #4169E1;">' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">' +
                        '<span style="font-size:8px;font-weight:bold;color:#4169E1;">🎛️ CONTROLS</span>' +
                        '<div style="display:flex;gap:6px;align-items:center;">' +
                            '<span style="font-size:8px;color:#ffd43b;font-family:monospace;" id="control-tracking-timer">00:00:00</span>' +
                            '<span style="font-size:7px;color:#32CD32;" id="control-next-scan">Next: 30s</span>' +
                        '</div>' +
                    '</div>' +
                    '<div style="display:flex;gap:3px;justify-content:center;">' +
                        '<button id="btn-download-report" style="background:#4169E1;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:8px;padding:2px 6px;display:flex;align-items:center;gap:2px;" title="Download tracking report">' +
                            '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                                '<line x1="12" y1="4" x2="12" y2="16"/>' +
                                '<polyline points="6 10 12 16 18 10"/>' +
                                '<line x1="4" y1="20" x2="20" y2="20"/>' +
                            '</svg>' +
                            'Report' +
                        '</button>' +
                        '<button id="btn-control-auto" style="background:#32CD32;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:8px;padding:2px 6px;min-width:24px;" title="Auto-Refresh ON">⏸</button>' +
                        '<button id="btn-main-reset" style="background:#ff4444;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:8px;padding:2px 6px;display:flex;align-items:center;gap:2px;" title="Reset all tracking data">' +
                            '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                                '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12"/>' +
                                '<path d="M3 3v9h9"/>' +
                            '</svg>' +
                            'Reset' +
                        '</button>' +
                    '</div>' +
                '</div>' +
                
                '<div style="border-top:1px solid #ff4444;margin-top:4px;padding-top:4px;">' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">' +
                        '<span id="spike-header-label" style="font-size:8px;color:#ff4444;font-weight:bold;">🚨 SPIKE DETECTOR</span>' +
                        '<div style="display:flex;gap:4px;">' +
                            '<button id="btn-clear-all-spikes" style="display:none;background:#444;border:1px solid #666;color:#ff4444;border-radius:3px;cursor:pointer;font-size:7px;padding:2px 6px;">Clear All</button>' +
                            '<button id="btn-spike-toggle" style="background:#32CD32;border:1px solid #444;color:#fff;border-radius:3px;cursor:pointer;font-size:7px;padding:2px 6px;font-weight:bold;" title="Spike detection enabled - Click to disable">ON</button>' +
                        '</div>' +
                    '</div>' +
                    '<div id="spike-container" style="max-height:180px;overflow-y:auto;">' +
                        '<div style="font-size:7px;color:#666;text-align:center;padding:3px;">No spikes detected yet</div>' +
                    '</div>' +
                '</div>' +
                
                '<div style="position:absolute;bottom:4px;right:6px;display:flex;align-items:center;gap:3px;opacity:0.6;transition:opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.6">' +
                    '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ff69b4" stroke-width="2" style="flex-shrink:0;">' +
                        '<circle cx="12" cy="12" r="10"/>' +
                        '<line x1="12" y1="2" x2="12" y2="22"/>' +
                        '<line x1="2" y1="12" x2="22" y2="12"/>' +
                    '</svg>' +
                    '<span style="font-size:7px;font-family:\'Courier New\',monospace;font-weight:bold;color:#ff69b4;letter-spacing:1px;">TIERSCOPE</span>' +
                '</div>' +
            '</div>';
        
        div.innerHTML = html;
        document.body.appendChild(div);

        var btnDownload = document.getElementById('btn-download-report');
        var btnMainReset = document.getElementById('btn-main-reset');
        var btnClearAll = document.getElementById('btn-clear-all-spikes');
        var btnSpikeToggle = document.getElementById('btn-spike-toggle');
        var btnControlAuto = document.getElementById('btn-control-auto');
        
        if (btnDownload) btnDownload.addEventListener('click', downloadTrackingReport);
        if (btnMainReset) btnMainReset.addEventListener('click', resetAllTracking);
        if (btnClearAll) btnClearAll.addEventListener('click', clearAllSpikes);
        if (btnSpikeToggle) btnSpikeToggle.addEventListener('click', toggleSpikeDetection);
        if (btnControlAuto) btnControlAuto.addEventListener('click', toggleAutoRefresh);
        
        setupSpikeContainerListeners();

        setupDraggable();
        setupResizable();
        setupResizeHandler(); // NEW: Add resize handler
        
        var btnToggle = document.getElementById('btn-toggle');
        var btnExpand = document.getElementById('btn-expand');
        var btnAuto = document.getElementById('btn-auto');
        var btnTimerDown = document.getElementById('btn-timer-down');
        var btnTimerUp = document.getElementById('btn-timer-up');
        
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
                    allPresets[j].style.background = '#333';
                    allPresets[j].style.color = '#aaa';
                    allPresets[j].style.borderColor = '#555';
                }
                this.style.background = '#ff69b4';
                this.style.color = '#fff';
                this.style.borderColor = '#ff69b4';
            };
        }
    }

    function toggleAutoRefresh() {
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
            if (isResizing) return;
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
        };

        dragHandle.addEventListener('mousedown', startDrag, false);
    }

    function toggleView() {
        isMinimized = !isMinimized;
        var fullView = document.getElementById('full-view');
        var miniView = document.getElementById('minimized-view');
        var toggleBtn = document.getElementById('btn-toggle');
        var container = document.getElementById('tracker-container');
        var headerText = document.getElementById('header-text');
        var headerUnique = document.getElementById('header-unique');
        var resizeHandle = document.getElementById('resize-handle');

        var anonymousCount = getAnonymousCount();

        if (isMinimized) {
            if (fullView) fullView.style.display = 'none';
            if (miniView) miniView.style.display = 'block';
            if (toggleBtn) toggleBtn.textContent = '+';
            if (container) {
                container.style.width = BASE_WIDTH_MINI + 'px';
            }
            if (resizeHandle) resizeHandle.style.display = 'none';
            if (isResizing) isResizing = false;
            
            if (headerUnique) headerUnique.style.display = 'none';
            
            var currentTotal = roomTotal > 0 ? roomTotal : (users.size + anonymousCount);
            if (headerText) headerText.textContent = currentTotal.toLocaleString() + ' (H:' + roomTotalHigh.toLocaleString() + ')';
        } else {
            if (fullView) fullView.style.display = 'block';
            if (miniView) miniView.style.display = 'none';
            if (toggleBtn) toggleBtn.textContent = '−';
            if (container) {
                container.style.width = BASE_WIDTH_FULL + 'px';
            }
            if (resizeHandle) resizeHandle.style.display = 'block';
            
            if (headerUnique) headerUnique.style.display = 'inline';
            
            var currentTotal = roomTotal > 0 ? roomTotal : (users.size + anonymousCount);
            if (headerText) headerText.textContent = 'USERS: ' + currentTotal.toLocaleString() + ' (H:' + roomTotalHigh.toLocaleString() + ')';
            setTimeout(function() {
                drawAllSparklines();
                updateSpikeDisplay();
            }, 100);
        }
        updateDisplay();
    }

    function scanUsers() {
        var userListTab = document.querySelector(DOM_SELECTORS.userListTab);
        if (!userListTab) return;

        roomTotal = getRoomTotal();
        femaleTransUsernames = [];
        var modelName = getModelName().toLowerCase();

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

            if (username && !users.has(username)) {
                var tier = getTierFromElement(el);
                var gender = getGenderFromElement(el);
                
                users.set(username, { tier: tier, gender: gender });
                
                if (username.toLowerCase() !== modelName) {
                    sessionUniqueUsers[username.toLowerCase()] = true;
                }
                
                if ((gender === 'female' || gender === 'trans') && username.toLowerCase() !== modelName) {
                    femaleTransUsernames.push(username);
                    sessionFemaleTransUsers[username] = gender;
                }
            }
        }
    }

    function updateDisplay() {
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

        var ratioText = getAnonRatio(anonymousCount, total);

        var withTokensPct = total > 0 ? Math.round((withTokens / total) * 100) + '%' : '0%';
        var registeredPct = fullRoomTotal > 0 ? Math.round((total / fullRoomTotal) * 100) + '%' : '0%';

        var headerText = document.getElementById('header-text');
        var headerUnique = document.getElementById('header-unique');
        
        if (headerText) {
            if (isMinimized) {
                headerText.textContent = fullRoomTotal.toLocaleString() + ' (H:' + roomTotalHigh.toLocaleString() + ')';
            } else {
                headerText.textContent = 'USERS: ' + fullRoomTotal.toLocaleString() + ' (H:' + roomTotalHigh.toLocaleString() + ')';
            }
        }
        
        if (headerUnique && !isMinimized) {
            headerUnique.textContent = 'U:' + Object.keys(sessionUniqueUsers).length.toLocaleString();
        }

        var miniWithTokens = document.getElementById('mini-withtokens');
        var miniWithTokensPct = document.getElementById('mini-withtokens-pct');
        var miniTotal = document.getElementById('mini-total');
        var miniTotalPct = document.getElementById('mini-total-pct');
        
        if (miniWithTokens) miniWithTokens.textContent = withTokens;
        if (miniWithTokensPct) miniWithTokensPct.textContent = withTokensPct;
        if (miniTotal) miniTotal.textContent = total;
        if (miniTotalPct) miniTotalPct.textContent = registeredPct;

        var miniAnon = document.getElementById('anon-rate-mini');
        var miniAnonText = document.getElementById('anon-ratio-mini');
        if (miniAnon && miniAnonText) {
            if (anonymousCount > 0) {
                miniAnon.style.display = 'block';
                miniAnonText.textContent = ratioText + ' (' + anonymousCount.toLocaleString() + ')';
            } else {
                miniAnon.style.display = 'none';
            }
        }

        if (!isMinimized) {
            Object.keys(counts).forEach(function(tier) {
                var countEl = document.getElementById('count-' + tier);
                var highEl = document.getElementById('high-' + tier);
                var currentVal = counts[tier];
                var highResult = getHighValue(history[tier], currentVal);
                var highVal = highResult.value;
                
                if (countEl) countEl.textContent = currentVal;
                if (highEl) highEl.textContent = 'H:' + highVal.toLocaleString();
            });

            var withTokensCountEl = document.getElementById('count-withtokens');
            var withTokensPctEl = document.getElementById('pct-withtokens');
            var withTokensHighEl = document.getElementById('high-withtokens');
            var totalEl = document.getElementById('count-total');
            var totalHighEl = document.getElementById('high-total');

            var withTokensResult = getHighValue(history['withTokens'], withTokens);
            var totalResult = getHighValue(history['total'], total);
            var anonResult = getHighValue(history['anonymous'], anonymousCount);

            if (withTokensCountEl) withTokensCountEl.textContent = withTokens;
            if (withTokensPctEl) withTokensPctEl.textContent = withTokensPct;
            if (withTokensHighEl) withTokensHighEl.textContent = 'H:' + withTokensResult.value.toLocaleString();
            if (totalEl) totalEl.textContent = total;
            if (totalHighEl) totalHighEl.textContent = 'H:' + totalResult.value.toLocaleString();

            var fullAnonText = document.getElementById('anon-ratio-full');
            var anonHighEl = document.getElementById('high-anon');
            if (fullAnonText) {
                if (anonymousCount > 0) {
                    fullAnonText.textContent = anonymousCount.toLocaleString() + ' (' + ratioText + ')';
                } else {
                    fullAnonText.textContent = '0 (0 anon)';
                }
            }
            if (anonHighEl) anonHighEl.textContent = 'H:' + anonResult.value.toLocaleString();
        }
    }

    function init() {
        var myGeneration = ++initGuard;
        
        log('Initializing... (generation ' + myGeneration + ')');
        
        if (healthCheckInterval) {
            clearInterval(healthCheckInterval);
            healthCheckInterval = null;
        }
        
        var isRoom = isBroadcastRoom();
        var modelName = getModelName();
        
        // NEW: Load session BEFORE setting defaults, so restored values survive
        var loaded = false;
        if (isRoom && modelName !== 'unknown') {
            loaded = loadSession(modelName);
            if (loaded) {
                log('Restored session for ' + modelName);
            }
        }
        
        // NEW: Respect restored pause state - don't auto-enable if paused
        if (!loaded) {
            isMinimized = !isRoom;
            isAutoRefreshOn = isRoom;
        } else {
            // If we loaded a session, keep its pause state
            isMinimized = false; // Show expanded since there's data
            // FIX: Sync isAutoRefreshOn with the restored pause state
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
            var headerUnique = document.getElementById('header-unique');
            
            if (fullView) fullView.style.display = 'block';
            if (miniView) miniView.style.display = 'none';
            if (toggleBtn) toggleBtn.textContent = '−';
            if (container) {
                container.style.width = BASE_WIDTH_FULL + 'px';
            }
            if (headerUnique) headerUnique.style.display = 'inline';
            
            // NEW: Draw sparklines for restored session
            drawAllSparklines();
            
            updateDisplay();
        }

        var attempts = 0;
        var maxAttempts = 30;
        
        var checkInterval = setInterval(function() {
            if (myGeneration !== initGuard) {
                clearInterval(checkInterval);
                log('Init ' + myGeneration + ' superseded by newer generation');
                return;
            }
            
            attempts++;
            
            if (document.querySelector(DOM_SELECTORS.userListTab) || attempts >= maxAttempts) {
                clearInterval(checkInterval);
                
                if (attempts >= maxAttempts && !document.querySelector(DOM_SELECTORS.userListTab)) {
                    log('UserListTab not found after 30s, giving up');
                    var statusEl = document.getElementById('auto-status');
                    if (statusEl) {
                        statusEl.textContent = 'No chat detected';
                        statusEl.style.color = '#ff4444';
                    }
                    return;
                }

                // FIX: Skip immediate scan if session was restored paused
                if (!isPaused) {
                    performScanThenReturn(true);
                }

                setTimeout(function() {
                    if (myGeneration !== initGuard) return;
                    
                    // NEW: Only start timer if not paused from restored session
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
                            statusEl.style.color = '#ff4444';
                        }
                        updateTrackingTimer();
                    }
                }, 2002);
            }
        }, 1000);

        healthCheckInterval = setInterval(function() {
            if (myGeneration === initGuard) {
                validateDOMHealth();
            }
        }, 30000);
    }

    var lastUrl = location.href;
    function checkUrlChange() {
        if (location.href !== lastUrl) {
            // FIXED: Parse model from lastUrl BEFORE updating it
            var oldModel = getModelNameFromUrl(lastUrl);
            lastUrl = location.href;
            
            // Save old room's session using the parsed old model name
            if (oldModel && oldModel !== 'unknown') {
                saveSession(oldModel);
            }
            
            stopCountdown();
            stopTrackingTimer();
            cleanupDragListeners();
            isScanning = false;
            
            if (healthCheckInterval) {
                clearInterval(healthCheckInterval);
                healthCheckInterval = null;
            }
            
            currentScale = 1.0;
            
            users.clear();
            previousUserCount = 0;
            previousRoomTotal = 0;
            Object.keys(history).forEach(function(k) { history[k] = []; });
            completedSpikes.length = 0;
            anonHistory.length = 0;
            spikeState = 'detecting';
            currentSpike = null;
            stabilizationWindow = [];
            consecutiveStableScans = 0;
            preSpikeBaseline = null;
            roomTotalHigh = 0;
            
            sessionUniqueUsers = {};
            
            roomTotalHighTime = null;
            tierHighTimes = {};
            withTokensHighTime = null;
            totalHighTime = null;
            anonHighTime = null;
            femaleTransHighTime = null;
            femaleTransUsernames = [];
            sessionFemaleTransUsers = {};
            
            initGuard++;
            
            setTimeout(init, 2002);
        }
    }
    
    urlCheckInterval = setInterval(checkUrlChange, 500);

    // beforeunload handler for refresh/close tab persistence
    window.addEventListener('beforeunload', function() {
        var modelName = getModelName();
        if (modelName && modelName !== 'unknown') {
            saveSession(modelName);
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 2000);
        });
    } else {
        setTimeout(init, 2000);
    }
    
    log('Script loaded and waiting for init');

    return {
        downloadTrackingReport: downloadTrackingReport,
        downloadSpikeReport: downloadSpikeReport,
        toggleSpikeDetection: toggleSpikeDetection,
        closeSpike: closeSpike,
        clearAllSpikes: clearAllSpikes,
        resetAllTracking: resetAllTracking,
        getHealth: function() { return domHealthStatus; }
    };
})();

if (typeof unsafeWindow !== 'undefined') {
    unsafeWindow.ViewerTracker = ViewerTracker;
} else {
    window.ViewerTracker = ViewerTracker;
}