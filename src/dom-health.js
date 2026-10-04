import { clearDOMFailures, noteDOMHealth } from './acquisition-state.js';
import { diagnostic } from './diagnostics.js';
import { pauseAutoRefresh } from './lifecycle.js';
import { runtime } from './runtime.js';
import { log } from './utils.js';
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
    noteDOMHealth(now, hasUserList, hasUsernameElements);
    if (!runtime.domHealthStatus.isHealthy) {
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
        clearDOMFailures();
    }
    return health;
}

