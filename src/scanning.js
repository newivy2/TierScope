import { drawAllSparklines } from './charts.js';
import { updateMiniFreshness } from './compact.js';
import { findTab, getAnonymousCount, isScanValid, scanUsers } from './dom.js';
import { pulseAcceptedHighs, readAllTimeHighs, recordAcceptedAllTimeHighs } from './highs.js';
import { saveToHistory } from './history.js';
import { absencePauseDescription, checkAbsenceStop, isAbsencePaused, nextBroadcasterAbsence, pauseAutoRefresh, resetCountdown, startTrackingTimer, stopDescription, updateCountdownDisplay, updateStopControls } from './lifecycle.js';
import { updateDisplay } from './panel.js';
import { runtime } from './runtime.js';
import { isStorageTimestamp, makeStorageId, saveSession } from './storage.js';
import { updateTrendDisplay } from './trends.js';
import { formatSampleAge, getModelName, log } from './utils.js';

export function readRequestPolicy() {
    try {
        var raw = GM_getValue(runtime.REQUEST_POLICY_KEY, null);
        if (raw === null && !runtime.requestPolicyUnsaved) runtime.requestPolicyCache = { until: 0, failures: 0, blocked: 0, status: 0, revision: '' };
        else if (raw !== null) {
            var value = JSON.parse(raw);
            if (value && Number.isFinite(value.until) && value.until >= 0 && Number.isInteger(value.failures) &&
                value.failures >= 0 && (value.blocked === 0 || value.blocked === 401 || value.blocked === 403) &&
                Number.isInteger(value.status) && (!value.serverUntil || isStorageTimestamp(value.serverUntil)) && typeof value.revision === 'string') {
                if (runtime.requestPolicyUnsaved) {
                    value = Object.assign({}, value, {
                        until: Math.max(value.until, runtime.requestPolicyCache.until),
                        serverUntil: Math.max(value.serverUntil || 0, runtime.requestPolicyCache.serverUntil || 0),
                        failures: Math.max(value.failures, runtime.requestPolicyCache.failures),
                        blocked: runtime.requestPolicyCache.blocked || value.blocked,
                        status: runtime.requestPolicyCache.until >= value.until ? runtime.requestPolicyCache.status : value.status,
                        revision: runtime.requestPolicyCache.revision
                    });
                }
                runtime.requestPolicyCache = value;
            }
        }
    } catch (error) { /* Retain the in-memory restriction if storage cannot be read. */ }
    return runtime.requestPolicyCache;
}

export function writeRequestPolicy(policy) {
    policy.revision = makeStorageId(); runtime.requestPolicyCache = policy;
    runtime.requestPolicyUnsaved = true;
    try { GM_setValue(runtime.REQUEST_POLICY_KEY, JSON.stringify(policy)); runtime.requestPolicyUnsaved = false; }
    catch (error) { log('Request restriction is local to this tab: ' + error.message); }
}

export function retryAfterTime(value, now) {
    if (typeof value !== 'string' || !value.trim()) return 0;
    value = value.trim();
    if (/^\d+$/.test(value)) {
        var until = now + Number(value) * 1000;
        return Number.isSafeInteger(until) && until <= 8640000000000000 ? until : 0;
    }
    var parsed = Date.parse(value);
    return Number.isFinite(parsed) && parsed > now ? parsed : 0;
}

export function recordRequestFailure(error) {
    var old = readRequestPolicy();
    var failures = Math.min(20, old.failures + 1);
    var status = error.status || 0;
    var delay = Math.min(900000, Math.max(60000, runtime.scanIntervalSeconds * 1000) * Math.pow(2, failures - 1));
    var policy = { until: Math.max(old.until, Date.now() + delay, error.retryAt || 0), failures: failures,
        blocked: status === 401 || status === 403 ? status : old.blocked, status: status,
        serverUntil: Math.max(old.serverUntil || 0, error.retryAt || 0, status === 429 ? Date.now() + delay : 0), revision: '' };
    writeRequestPolicy(policy);
    return policy;
}

export function clearRequestFailures(revision) {
    var current = readRequestPolicy();
    // An older in-flight request must not undo a newer restriction from another tab.
    if (current.revision !== revision || current.blocked || !current.failures) return;
    runtime.requestPolicyCache = { until: 0, failures: 0, blocked: 0, status: 0, revision: '' };
    runtime.requestPolicyUnsaved = false;
    try { GM_deleteValue(runtime.REQUEST_POLICY_KEY); } catch (error) { /* Retrying later is safe. */ }
}

export function requestPolicyMessage(policy) {
    if (policy.blocked) return 'Access denied (' + policy.blocked + ')';
    var seconds = Math.max(0, Math.ceil((policy.until - Date.now()) / 1000));
    if (!seconds) return '';
    return (policy.status === 429 ? 'Rate limited · ' : 'Retry in ') +
        (seconds >= 60 ? Math.ceil(seconds / 60) + 'm' : seconds + 's');
}

export function pauseForAccessRestriction() {
    pauseAutoRefresh();
}

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

export function isAcquisitionCurrent(context) {
    return context.epoch === runtime.scanEpoch && context.generation === runtime.initGuard &&
        context.url === location.href;
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
    runtime.lastAcquisitionAttemptSource = 'API';
    try {
        var snapshot = await acquireAPISnapshot(context);
        if (!isAcquisitionCurrent(context) || checkAbsenceStop() || !isAbsencePaused()) return null;
        if (readRequestPolicy().blocked) { pauseForAccessRestriction(); return null; }
        clearRequestFailures(context.policyRevision);
        if (!snapshot.users.some(function(user) { return user.isOwner === true; })) return null;
        runtime.broadcasterAbsence = { since: null, missing: 0 };
        runtime.absencePausedAt = null;
        runtime.absenceOverrideActive = false;
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

export function getDOMFallbackWaitSeconds(modelName) {
    var readyAt = runtime.domFallbackReadyAtByRoom.get(modelName.toLowerCase()) || 0;
    return Math.max(0, Math.ceil((readyAt - Date.now()) / 1000));
}

export async function acquireRoomSnapshot(context, returnToChat) {
    runtime.lastAcquisitionAttemptSource = 'API';
    try {
        var snapshot = await acquireAPISnapshot(context);
        if (!isAcquisitionCurrent(context)) return null;
        if (checkAbsenceStop() || !isAcquisitionCurrent(context)) return null;
        // Presence comes from a well-formed API response, independently of
        // whether its counts pass the chart's sudden-drop sanity checks.
        runtime.broadcasterAbsence = nextBroadcasterAbsence(snapshot);
        if (checkAbsenceStop() || !isAcquisitionCurrent(context)) return null;
        validateRoomSnapshot(snapshot);
        runtime.domHealthStatus.consecutiveFailures = 0;
        clearRequestFailures(context.policyRevision);
        return snapshot;
    } catch (err) {
        if (!isAcquisitionCurrent(context)) return null;
        console.warn('[TierScope ' + runtime.TIERSCOPE_VERSION + '] API failed: ' + err.message);
        var policy = recordRequestFailure(err);
        if (policy.blocked) { pauseForAccessRestriction(); return null; }
        // Do not switch acquisition routes around a rate limit or explicit server wait.
        if (err.status === 429 || err.retryAt > Date.now()) return null;
    }
    runtime.lastAcquisitionAttemptSource = 'DOM';
    var fallbackWait = getDOMFallbackWaitSeconds(context.room);
    if (fallbackWait > 0) {
        log('DOM fallback deferred for ' + fallbackWait + 's; retaining previous valid data (no history point)');
        return null;
    }
    var roomKey = context.room.toLowerCase();
    var fallbackIntervalMs = Math.max(runtime.DOM_FALLBACK_INTERVAL_SECONDS, runtime.scanIntervalSeconds) * 1000;
    runtime.domFallbackReadyAtByRoom.set(roomKey, Date.now() + fallbackIntervalMs);
    log('Attempting DOM fallback; room=' + context.room);
    try {
        var fallback = await acquireDOMSnapshot(context, returnToChat);
        if (!isAcquisitionCurrent(context)) return null;
        validateRoomSnapshot(fallback);
        log('DOM fallback succeeded; room=' + context.room + ' records=' + fallback.users.length);
        return fallback;
    } catch (err) {
        if (!isAcquisitionCurrent(context)) return null;
        console.warn('[TierScope ' + runtime.TIERSCOPE_VERSION + '] DOM fallback failed: ' + err.message +
            '; retaining previous valid data (no history point)');
        return null;
    } finally {
        runtime.domFallbackReadyAtByRoom.set(roomKey, Math.max(runtime.domFallbackReadyAtByRoom.get(roomKey) || 0,
            Date.now() + fallbackIntervalMs));
    }
}

export function acceptRoomSnapshot(snapshot, modelName) {
    runtime.restoredDisplayFrame = null;
    runtime.users = new Map(snapshot.users.map(function(user) { return [user.username, user]; }));
    runtime.roomTotal = snapshot.roomTotal;
    runtime.lastAcceptedAcquisition = { source: snapshot.source, timestamp: snapshot.timestamp, api: null };
    if (snapshot.source === 'API') {
        var owners = snapshot.users.filter(function(user) { return user.isOwner; });
        var tierSum = snapshot.users.filter(function(user) { return user.tier !== null; }).length;
        var unknownClasses = snapshot.diagnostics.unknownClasses;
        var unknownGenders = snapshot.diagnostics.unknownGenders;
        runtime.lastAcceptedAcquisition.api = { anonymousCount: snapshot.anonymousCount,
            registeredCount: snapshot.registeredCount, totalUsers: snapshot.totalUsers, ownerCount: owners.length };
        return {
            room: modelName, anonymousCount: snapshot.anonymousCount,
            registeredCount: snapshot.registeredCount, totalUsers: snapshot.totalUsers,
            ownerCount: owners.length,
            unknownClasses: Object.values(unknownClasses).reduce(function(a, b) { return a + b; }, 0),
            unknownGenders: Object.values(unknownGenders).reduce(function(a, b) { return a + b; }, 0),
            unknownClassCodes: unknownClasses, unknownGenderCodes: unknownGenders,
            viewerTierSum: tierSum, registeredMinusTierSum: runtime.users.size - tierSum,
            viewerTierGapExplanation: 'Owner and unknown-class records count toward Registered, outside the seven viewer tiers',
            timestamp: new Date(snapshot.timestamp).toISOString()
        };
    }
    return null;
}

export function updateAcquisitionStatus() {
    updateMiniFreshness();
    var el = document.getElementById('acquisition-status');
    if (!el) return;
    if (runtime.isStopped) {
        el.textContent = 'Stopped';
        el.title = stopDescription() + ' at ' + new Date(runtime.stoppedAt).toLocaleString() + '. History and elapsed time are frozen.';
        return;
    }
    if (runtime.sessionStorageNotice) {
        el.textContent = 'Local only • room reset';
        el.title = runtime.sessionStorageNotice;
        return;
    }
    var policyMessage = requestPolicyMessage(readRequestPolicy());
    if (policyMessage) {
        var sample = runtime.lastAcceptedAcquisition || runtime.restoredDisplayFrame;
        el.textContent = policyMessage;
        el.title = policyMessage + (sample ? '. Last sample: ' + new Date(sample.timestamp).toISOString() : '. No accepted sample.');
        return;
    }
    if (isAbsencePaused()) {
        el.textContent = 'Auto-paused • return checks';
        el.title = absencePauseDescription();
        return;
    }
    if (!runtime.lastAcceptedAcquisition) {
        if (runtime.restoredDisplayFrame) {
            el.textContent = 'Saved • ' + formatSampleAge(runtime.restoredDisplayFrame.timestamp);
            el.title = 'Saved sample recorded at: ' + new Date(runtime.restoredDisplayFrame.timestamp).toISOString() +
                '. Age is measured from the sample time, not the session save time.' +
                ' Waiting for the first fresh sample since restore.';
        } else {
            el.textContent = 'No sample';
            el.title = 'No accepted sample in this page session';
        }
        return;
    }
    el.textContent = runtime.lastAcceptedAcquisition.source + ' • ' + formatSampleAge(runtime.lastAcceptedAcquisition.timestamp);
    el.title = 'Last accepted sample: ' + new Date(runtime.lastAcceptedAcquisition.timestamp).toISOString() +
        '. TierScope and the USERS tab refresh independently.';
}

export async function performScanThenReturn(returnToChat) {
    if (typeof returnToChat === 'undefined') returnToChat = true;
    if (checkAbsenceStop()) return;
    if (runtime.isScanning || runtime.isStopped) return;
    var policy = readRequestPolicy();
    if (policy.blocked) { pauseForAccessRestriction(); updateCountdownDisplay(); return; }
    if (policy.until > Date.now()) { updateCountdownDisplay(); return; }
    runtime.isScanning = true;
    var context = { epoch: ++runtime.scanEpoch, generation: runtime.initGuard, url: location.href, room: getModelName(), policyRevision: policy.revision };
    var priorState = null;
    var sampleCommitted = false;
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
            runtime.pendingHistoryGap = true;
            if (statusEl) {
                statusEl.textContent = 'Scan skipped (unreliable)';
                statusEl.style.color = 'var(--panel-negative)';
            }
            return;
        }
        priorState = {
            users: runtime.users, roomTotal: runtime.roomTotal, previousUserCount: runtime.previousUserCount,
            previousRoomTotal: runtime.previousRoomTotal, previousCounts: runtime.previousCounts,
            hasTrendBaseline: runtime.hasTrendBaseline, lastAcceptedAcquisition: runtime.lastAcceptedAcquisition,
            restoredDisplayFrame: runtime.restoredDisplayFrame, pendingHistoryGap: runtime.pendingHistoryGap,
            trendHTML: (document.getElementById('trend-container') || {}).innerHTML,
            trendHeaderText: (document.getElementById('trend-header-label') || {}).textContent,
            history: Object.fromEntries(Object.keys(runtime.history).map(function(key) { return [key, runtime.history[key].slice()]; })),
            roomTotalHigh: runtime.roomTotalHigh, roomTotalHighTime: runtime.roomTotalHighTime,
            tierHighTimes: Object.fromEntries(Object.entries(runtime.tierHighTimes)),
            withTokensHighTime: runtime.withTokensHighTime, totalHighTime: runtime.totalHighTime,
            anonHighTime: runtime.anonHighTime, femaleTransHighTime: runtime.femaleTransHighTime,
            sessionStartedAt: runtime.sessionStartedAt,
            sessionHighs: Object.fromEntries(Object.entries(runtime.sessionHighs).map(function(entry) { return [entry[0], Object.assign({}, entry[1])]; })),
            allTimeHighs: readAllTimeHighs(context.room).highs,
            newHighTiers: Object.fromEntries(Object.entries(runtime.newHighTiers))
        };
        var diagnostics = acceptRoomSnapshot(snapshot, context.room);
        var counts = { 'red': 0, 'green': 0, 'purple': 0, 'pink': 0, 'dark-blue': 0, 'light-blue': 0, 'gray': 0, 'female-trans': 0 };
        runtime.users.forEach(function(data) {
            if (counts[data.tier] !== undefined) counts[data.tier]++;
            if (data.gender === 'female' || data.gender === 'trans') {
                counts['female-trans']++;
            }
        });
        var total = runtime.users.size;
        var withTokens = counts['red'] + counts['green'] + counts['purple'] + counts['pink'] + counts['dark-blue'] + counts['light-blue'];
        var anonymousCount = getAnonymousCount();
        runtime.previousUserCount = total;
        runtime.previousRoomTotal = runtime.roomTotal;
        var currentRoomTotal = runtime.roomTotal > 0 ? runtime.roomTotal : (total + anonymousCount);
        if (currentRoomTotal > runtime.roomTotalHigh) {
            runtime.roomTotalHigh = currentRoomTotal;
            runtime.roomTotalHighTime = Date.now();
        }
        saveToHistory();
        runtime.hasTrendBaseline = true;
        updateDisplay();
        updateTrendDisplay();
        runtime.previousCounts = {
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
        // Acquisition and rendering have succeeded. Nothing after this boundary
        // may roll memory back once the sample can have reached durable storage.
        sampleCommitted = true;
    } catch (err) {
        if (priorState) {
            runtime.users = priorState.users;
            runtime.roomTotal = priorState.roomTotal;
            runtime.previousUserCount = priorState.previousUserCount;
            runtime.previousRoomTotal = priorState.previousRoomTotal;
            runtime.previousCounts = priorState.previousCounts;
            runtime.hasTrendBaseline = priorState.hasTrendBaseline;
            runtime.lastAcceptedAcquisition = priorState.lastAcceptedAcquisition;
            runtime.restoredDisplayFrame = priorState.restoredDisplayFrame;
            runtime.history = priorState.history;
            runtime.pendingHistoryGap = priorState.pendingHistoryGap;
            runtime.roomTotalHigh = priorState.roomTotalHigh;
            runtime.roomTotalHighTime = priorState.roomTotalHighTime;
            runtime.tierHighTimes = priorState.tierHighTimes;
            runtime.withTokensHighTime = priorState.withTokensHighTime;
            runtime.totalHighTime = priorState.totalHighTime;
            runtime.anonHighTime = priorState.anonHighTime;
            runtime.femaleTransHighTime = priorState.femaleTransHighTime;
            runtime.sessionStartedAt = priorState.sessionStartedAt;
            runtime.sessionHighs = priorState.sessionHighs;
            runtime.newHighTiers = priorState.newHighTiers || {};
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
        runtime.pendingHistoryGap = true;
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
            try {
                if (diagnostics) console.log('[TierScope ' + runtime.TIERSCOPE_VERSION + '] API scan accepted', diagnostics);
            } catch (error) { /* Logging cannot invalidate an accepted sample. */ }
        }
        if (isAcquisitionCurrent(context)) {
            runtime.isScanning = false;
            resetCountdown();
            updateAcquisitionStatus();
            if (checkingReturn || (!priorState && priorAbsence !== runtime.broadcasterAbsence)) saveSession(context.room);
        }
    }
}
