# API pacing — 3.28.0 beta

TierScope checks a same-origin API cooldown before starting a scan and again while waiting for a request slot. **API cooldown** means requests are temporarily deferred. An existing TierScope HTTP 429 restriction continues to show **Rate limited**.

**Retry in** is the general API/response backoff and does not by itself establish rate limiting. Hover the retry countdown or footer status to see a stored HTTP error, when available. A successful HTTP response can still be rejected if its user-list format or audience sample is invalid. Viewer-list requests include the site's AJAX header.

The beta.2 parser accepts both the single numeric header and the optional second numeric metadata header. Metadata is never counted as a viewer. On upgrade, an old non-HTTP response backoff is recovered once so the corrected parser can scan again. Real HTTP restrictions, server-provided waits, access blocks, connection timing and ambiguous legacy waits remain protected. Refresh all room tabs so an older parser cannot keep reporting the same obsolete format error.

Server waits survive reloads and Reset. A successful older scan does not erase a newer deadline. Expired deadlines allow normal scanning to resume; connection failures retain the separate short recovery rules. A cancelled queued scan records no sample or retry failure and does not click the Users tab.

The timing adapter uses browser Web Locks and a three-second minimum request slot once origin pacing has been enabled. Pacing remains enabled through long cooldowns, including when background work is paused or closed. Normal TierScope scan intervals remain unchanged. Only versioned timing records are written to site-local storage; these records contain no room names, viewers, recordings, cookies or credentials. Browser profiles and origins have independent timing state. If site-local storage or Web Locks is unavailable, cross-tab coordination is best effort and TierScope retains its own retry protections. Timing records are visible to the website and are not a security boundary.

This reduces bursts and preserves cooldowns; it cannot establish or guarantee the website's unpublished request limits.
