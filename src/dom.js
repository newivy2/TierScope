import { sessionAnonymousCount } from './live-session.js';
import { pauseAutoRefresh } from './lifecycle.js';
import { runtime } from './runtime.js';
import { log } from './utils.js';
import { diagnostic } from './diagnostics.js';

export function validateDOMHealth() {
    const now = Date.now();
    const container = document.getElementById('tracker-container');
    const userListTab = document.querySelector(runtime.DOM_SELECTORS.userListTab);
    const hasUserList = !!userListTab;
    let hasUsernameElements = false;
    for (let i = 0; i < runtime.DOM_SELECTORS.usernameElements.length; i++) {
        if (document.querySelector(runtime.DOM_SELECTORS.usernameElements[i])) {
            hasUsernameElements = true;
            break;
        }
    }
    const health = {
        timestamp: now,
        userListTab: hasUserList,
        usernameElements: hasUsernameElements,
        container: !!container,
        roomTotalSelectors: runtime.DOM_SELECTORS.roomTotal.some(sel => !!document.querySelector(sel))
    };
    const wasHealthy = runtime.domHealthStatus.isHealthy;
    runtime.domHealthStatus.isHealthy = health.userListTab && health.usernameElements;
    runtime.domHealthStatus.lastCheck = now;
    runtime.domHealthStatus.userListTabFound = hasUserList;
    if (!runtime.domHealthStatus.isHealthy) {
        runtime.domHealthStatus.consecutiveFailures++;
        if (runtime.domHealthStatus.consecutiveFailures === 1 || runtime.domHealthStatus.consecutiveFailures % 10 === 0) {
            diagnostic('warn', 'DOM health check failed:', health);
            if (container) {
                const statusEl = document.getElementById('auto-status');
                if (statusEl) {
                    statusEl.textContent = 'DOM mismatch - check console';
                    statusEl.style.color = 'var(--panel-negative)';
                }
            }
        }
        if (runtime.domHealthStatus.consecutiveFailures > 5 && runtime.isAutoRefreshOn) {
            diagnostic('warn', 'Auto-pausing due to DOM health issues');
            pauseAutoRefresh();
        }
    } else {
        if (!wasHealthy && runtime.domHealthStatus.consecutiveFailures > 0) {
            log('DOM health restored');
            const statusEl = document.getElementById('auto-status');
            if (statusEl && runtime.isAutoRefreshOn) {
                statusEl.textContent = 'Next: ' + runtime.countdownSeconds + 's';
                statusEl.style.color = 'var(--panel-positive)';
            }
        }
        runtime.domHealthStatus.consecutiveFailures = 0;
    }
    return health;
}

export function getTierFromClassList(classList) {
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

export function getTierFromElement(el) {
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

export function getGenderFromElement(el) {
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

export function getRoomTotal() {
    for (var i = 0; i < runtime.DOM_SELECTORS.roomTotal.length; i++) {
        var el = document.querySelector(runtime.DOM_SELECTORS.roomTotal[i]);
        if (el) {
            var text = el.textContent || '';
            var match = text.match(/USERS\s*\(?(\d[\d,]*)\)?/i);
            if (match) return parseInt(match[1].replace(/,/g, ''));
        }
    }
    return 0;
}

export function getAnonymousCount() {
    return sessionAnonymousCount();
}

export function extractUsername(text) {
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

export function findTab(tabName) {
    var selectors = runtime.DOM_SELECTORS.tabs[tabName.toLowerCase()] || [];
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

export function isScanValid(newUserCount, newRoomTotal) {
    if (runtime.previousRoomTotal === 0) return true;
    if (newRoomTotal === 0 && runtime.previousRoomTotal > 0) {
        log('Scan rejected: room total is 0 but previous was ' + runtime.previousRoomTotal);
        return false;
    }
    var roomTotalChange = Math.abs(newRoomTotal - runtime.previousRoomTotal) / runtime.previousRoomTotal;
    if (roomTotalChange > 0.10) return true;
    var userDrop = runtime.previousUserCount > 0 ? (runtime.previousUserCount - newUserCount) / runtime.previousUserCount : 0;
    if (userDrop > 0.50) {
        log('Scan rejected: user count dropped ' + Math.round(userDrop * 100) + '% (' +
            runtime.previousUserCount + ' -> ' + newUserCount + ') while room total stable (' +
            runtime.previousRoomTotal + ' -> ' + newRoomTotal + ')');
        return false;
    }
    return true;
}

export function scanUsers() {
    var userListTab = document.querySelector(runtime.DOM_SELECTORS.userListTab);
    if (!userListTab) throw new Error('UserListTab not found');
    var snapshotUsers = new Map();
    var snapshotRoomTotal = getRoomTotal();
    if (!snapshotRoomTotal) throw new Error('DOM room total missing or zero');
    var userElements = [];
    for (var i = 0; i < runtime.DOM_SELECTORS.usernameElements.length; i++) {
        var found = userListTab.querySelectorAll(runtime.DOM_SELECTORS.usernameElements[i]);
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
