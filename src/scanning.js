import { isAcquisitionCurrent } from './acquisition-context.js';
import { beginAcquisition, clearDOMFailures, deferDOMFallback, finishAcquisition, noteAcquisitionSource } from './acquisition-state.js';
import { drawAllSparklines } from './charts.js';
import { diagnostic } from './diagnostics.js';
import { findTab, isScanValid, scanUsers } from './dom.js';
import { pulseAcceptedHighs } from './high-pulses.js';
import { readAllTimeHighs } from './highs-store.js';
import { recordAcceptedAllTimeHighs } from './highs.js';
import { getSessionSamplePolicy } from './history.js';
import { checkAbsenceStop, pauseForAccessRestriction, resetCountdown, startTrackingTimer, updateCountdownDisplay, updateStopControls } from './lifecycle.js';
import { abortAcceptedSample, beginAcceptedSample, commitAcceptedSample, markSessionGap, observeSessionPresence, resumeSessionForOwnerReturn } from './live-session.js';
import { updateAcquisitionStatus } from './presentation-status.js';
import { updateDisplay, updateTrendDisplay } from './presentation.js';
import { clearRequestFailures, getDOMFallbackWaitSeconds, readRequestPolicy, recordRequestFailure, retryAfterTime } from './request-policy.js';
import { runtime } from './runtime.js';
import { saveSession } from './session-persistence.js';
import { isAbsencePaused } from './session-selectors.js';
import { getModelName, log } from './utils.js';

export function parseGetChatUserListResponse(text) {
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

export function validateRoomSnapshot(snapshot) {
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

export async function acquireAPISnapshot(context) {
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
                    reject(new Error('API request timed out after ' + runtime.API_TIMEOUT_MS + ' ms'));
                    controller.abort();
                }, runtime.API_TIMEOUT_MS);
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

export async function acquireDOMSnapshot(context, returnToChat) {
    var usersTab = findTab('users');
    var chatTab = findTab('chat');
    if (!usersTab) throw new Error('USERS tab not found');
    var tabGroup = usersTab.closest('[role="tablist"]') || usersTab.parentElement;
    var tabs = Array.from(tabGroup ? tabGroup.querySelectorAll('button, [role="tab"], [data-tab]') : []);
    [usersTab, chatTab].forEach(function(tab) { if (tab && tabs.indexOf(tab) === -1) tabs.push(tab); });
    function selectedTab() {
        var selected = tabs.filter(function(tab) {
            return tab.getAttribute('aria-selected') === 'true' || tab.getAttribute('data-state') === 'active' ||
                tab.classList.contains('active') || tab.classList.contains('selected');
        });
        return selected.length === 1 ? selected[0] : null;
    }
    var originalTab = selectedTab();
    // Do not guess which view the user was reading. An uncertain tab state is
    // a skipped fallback, not permission to leave a private chat or other view.
    if (!originalTab) throw new Error('Cannot safely identify the selected tab');
    if (originalTab === usersTab) return scanUsers();
    if (!returnToChat) throw new Error('DOM fallback skipped because tab restoration is disabled');
    var openedUsers = false;
    var userChangedTab = false;
    function onTabClick(event) {
        if (tabs.some(function(tab) { return tab === event.target || tab.contains(event.target); })) userChangedTab = true;
    }
    try {
        usersTab.click();
        openedUsers = true;
        if (tabGroup) tabGroup.addEventListener('click', onTabClick, true);
        await new Promise(function(resolve) { setTimeout(resolve, 800); });
        if (!isAcquisitionCurrent(context) || userChangedTab || selectedTab() !== usersTab) return null;
        return scanUsers();
    } finally {
        if (tabGroup) tabGroup.removeEventListener('click', onTabClick, true);
        if (openedUsers && !userChangedTab && isAcquisitionCurrent(context) &&
            selectedTab() === usersTab && originalTab.isConnected) {
            try { originalTab.click(); }
            catch (err) { log('DOM fallback could not restore the selected tab: ' + err.message); }
        }
    }
}

export async function checkBroadcasterReturn(context) {
    noteAcquisitionSource('API');
    try {
        var snapshot = await acquireAPISnapshot(context);
        if (!isAcquisitionCurrent(context) || checkAbsenceStop() || !isAbsencePaused()) return null;
        if (readRequestPolicy().blocked) { pauseForAccessRestriction(); return null; }
        clearRequestFailures(context.policyRevision);
        if (!snapshot.users.some(function(user) { return user.isOwner === true; })) return null;
        resumeSessionForOwnerReturn(Date.now());
        startTrackingTimer();
        updateStopControls();
        // A presence signal can resume scanning even if the counts fail the
        // usual sample checks. Only a validated sample enters the history.
        validateRoomSnapshot(snapshot);
        return snapshot;
    } catch (error) {
        if (!isAcquisitionCurrent(context)) return null;
        if (isAbsencePaused()) {
            var policy = recordRequestFailure(error);
            if (policy.blocked) pauseForAccessRestriction();
        }
        log('Return check did not record a sample: ' + error.message);
        return null;
    }
}

export async function acquireRoomSnapshot(context, returnToChat) {
    noteAcquisitionSource('API');
    try {
        var snapshot = await acquireAPISnapshot(context);
        if (!isAcquisitionCurrent(context)) return null;
        if (checkAbsenceStop() || !isAcquisitionCurrent(context)) return null;
        // Presence comes from a well-formed API response, independently of
        // whether its counts pass the chart's sudden-drop sanity checks.
        observeSessionPresence(snapshot, Date.now());
        if (checkAbsenceStop() || !isAcquisitionCurrent(context)) return null;
        validateRoomSnapshot(snapshot);
        clearDOMFailures();
        clearRequestFailures(context.policyRevision);
        return snapshot;
    } catch (err) {
        if (!isAcquisitionCurrent(context)) return null;
        diagnostic('warn', 'API failed: ' + err.message);
        var policy = recordRequestFailure(err);
        if (policy.blocked) { pauseForAccessRestriction(); return null; }
        // Do not switch acquisition routes around a rate limit or explicit server wait.
        if (err.status === 429 || err.retryAt > Date.now()) return null;
    }
    noteAcquisitionSource('DOM');
    var fallbackWait = getDOMFallbackWaitSeconds(context.room);
    if (fallbackWait > 0) {
        log('DOM fallback deferred for ' + fallbackWait + 's; retaining previous valid data (no history point)');
        return null;
    }
    var roomKey = context.room.toLowerCase();
    var fallbackIntervalMs = Math.max(runtime.DOM_FALLBACK_INTERVAL_SECONDS, runtime.scanIntervalSeconds) * 1000;
    deferDOMFallback(roomKey, Date.now() + fallbackIntervalMs);
    log('Attempting DOM fallback; room=' + context.room);
    try {
        var fallback = await acquireDOMSnapshot(context, returnToChat);
        if (!isAcquisitionCurrent(context)) return null;
        validateRoomSnapshot(fallback);
        log('DOM fallback succeeded; room=' + context.room + ' records=' + fallback.users.length);
        return fallback;
    } catch (err) {
        if (!isAcquisitionCurrent(context)) return null;
        diagnostic('warn', 'DOM fallback failed: ' + err.message +
            '; retaining previous valid data (no history point)');
        return null;
    } finally {
        deferDOMFallback(roomKey, Date.now() + fallbackIntervalMs);
    }
}

export function acceptRoomSnapshot(snapshot, modelName) {
    return beginAcceptedSample(snapshot, modelName, Date.now(), getSessionSamplePolicy());
}

export async function performScanThenReturn(returnToChat) {
    if (typeof returnToChat === 'undefined') returnToChat = true;
    if (checkAbsenceStop()) return;
    if (runtime.isScanning || runtime.isStopped) return;
    var policy = readRequestPolicy();
    if (policy.blocked) { pauseForAccessRestriction(); updateCountdownDisplay(); return; }
    if (policy.until > Date.now()) { updateCountdownDisplay(); return; }
    var context = beginAcquisition(location.href, getModelName(), policy, Date.now(), runtime.isStopped);
    if (!context) return;
    var priorState = null;
    var sampleCommitted = false;
    var sampleReceipt = null;
    var priorAbsence = runtime.broadcasterAbsence;
    var checkingReturn = isAbsencePaused();
    var statusEl = document.getElementById('auto-status');
    updateCountdownDisplay();
    try {
        var snapshot = checkingReturn ? await checkBroadcasterReturn(context) : await acquireRoomSnapshot(context, returnToChat);
        if (!isAcquisitionCurrent(context)) return;
        if (checkAbsenceStop()) return;
        if (checkingReturn && isAbsencePaused()) return;
        if (!snapshot) {
            markSessionGap();
            if (statusEl) {
                statusEl.textContent = 'Scan skipped (unreliable)';
                statusEl.style.color = 'var(--panel-negative)';
            }
            return;
        }
        sampleReceipt = acceptRoomSnapshot(snapshot, context.room);
        priorState = Object.assign({}, sampleReceipt.before, {
            trendHTML: (document.getElementById('trend-container') || {}).innerHTML,
            trendHeaderText: (document.getElementById('trend-header-label') || {}).textContent,
            allTimeHighs: readAllTimeHighs(context.room).highs
        });
        var diagnostics = sampleReceipt.diagnostics;
        if (!runtime.isMinimized) drawAllSparklines();
        updateDisplay();
        updateTrendDisplay();
        updateAcquisitionStatus();
        // Acquisition and rendering have succeeded. Nothing after this boundary
        // may roll memory back once the sample can have reached durable storage.
        sampleCommitted = isAcquisitionCurrent(context) && commitAcceptedSample(sampleReceipt);
        if (!sampleCommitted) abortAcceptedSample(sampleReceipt);
    } catch (err) {
        var rolledBack = sampleReceipt && abortAcceptedSample(sampleReceipt);
        if (rolledBack && priorState) {
            try {
                var trendEl = document.getElementById('trend-container');
                if (trendEl && typeof priorState.trendHTML === 'string') trendEl.innerHTML = priorState.trendHTML;
                var trendHeader = document.getElementById('trend-header-label');
                if (trendHeader && typeof priorState.trendHeaderText === 'string') trendHeader.textContent = priorState.trendHeaderText;
                updateDisplay();
                updateAcquisitionStatus();
                if (!runtime.isMinimized) drawAllSparklines();
            }
            catch (displayError) { log('Could not repaint previous data: ' + displayError.message); }
        }
        if (isAcquisitionCurrent(context)) markSessionGap();
        log('Error during scan; retaining previous valid data: ' + err.message);
    } finally {
        if (sampleCommitted) {
            // Persist only after acquisition and presentation accepted the
            // sample. Storage failure must not undo a valid live sample.
            try { saveSession(context.room); }
            catch (error) { log('Could not save accepted sample: ' + error.message); }
            try { recordAcceptedAllTimeHighs(context.room); updateDisplay(); }
            catch (error) { log('Could not update all-time highs: ' + error.message); }
            pulseAcceptedHighs(priorState);
            if (diagnostics) diagnostic('log', 'API scan accepted', diagnostics);
        }
        if (finishAcquisition(context, location.href)) {
            resetCountdown();
            updateAcquisitionStatus();
            if (checkingReturn || (!priorState && priorAbsence !== runtime.broadcasterAbsence)) saveSession(context.room);
        }
    }
}
