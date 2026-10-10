# Connection recovery — 3.27.0

TierScope distinguishes browser-reported offline status, failed connections and server/response failures. Being online is only a browser hint; a validated API scan confirms recovery.

| Situation | Behavior |
| --- | --- |
| Browser reports offline | Show **No connection**, suspend API and DOM acquisition, and avoid increasing retry counters. |
| Fetch, response transfer or request timeout fails | Show **Connection**, retry after 15 seconds, then 30 seconds, then at most 60 seconds. These failures do not increase the server-error counter or click the Users tab. |
| Connection returns after offline | Show **Reconnecting** and schedule a local retry after 5–10 seconds, staggered between tabs. Server restrictions still take precedence. |
| HTTP 429, server `Retry-After`, or other response failure | Retain the existing server wait/backoff. HTTP 401/403 still require explicit Resume after access is resolved. |

Offline handling retains accepted samples and highs, and marks a recording gap. Tracking time continues while tracking is active; no audience values are invented. Statistics still exclude recorded gaps. Paused, stopped and non-broadcast pages do not start tracking when connectivity returns. A response from a scan invalidated by an offline transition cannot enter the recording.

Reconnection does not erase a shared restriction or claim that the API is reachable. Only a successful, validated scan clears the applicable failure record, and a newer restriction from another tab remains protected. A missing browser event is detected by the existing display tick. Repeated online notifications do not shorten a wait.

Older saved retry records did not distinguish connection errors from response errors. Their existing waits remain respected until they expire or a valid scan clears them. Refresh other room tabs after updating so all tabs run the updated retry rules.

## Behavior checks

1. Start tracking a room, then disconnect briefly. Check **No connection** and that the last counts/chart remain available.
2. Reconnect. Check the short recovery countdown and that a fresh sample returns, with a gap across the outage.
3. Try two room tabs: each resumes after a slightly different short delay. Repeat while one tab is manually paused or stopped; it should remain so.
4. A connected network without working internet may leave the browser's online hint true. Check **Connection** and retries capped at one minute in that case.
5. Review compact and expanded views in both themes. Genuine rate limits and access restrictions should retain their existing behavior.

Automated coverage includes native browser offline/online events, timeouts, interrupted response bodies, malformed API data, multiple tabs, failed storage writes, delayed responses, first-scan recovery, directory pages, recording gaps and preserved server restrictions.
